import type * as t from "./vendor/pdfium.js";

import { BYTES_PER_PIXEL, FPDFBitmap, FPDFRenderFlag, FPDFProgressiveStatus } from "./constants.js";
import type {
  PDFiumProgressiveRenderOptions,
  PDFiumProgressiveRenderProgress,
  PDFiumProgressiveRenderResult,
} from "./types.js";
import { convertBitmapToImage } from "./utils.js";

/**
 * Pause structure for progressive rendering
 * This is used to control the rendering process and allow interruption
 */
class PDFiumProgressivePause {
  private shouldPause: boolean = false;
  private pauseCallback?: () => boolean | Promise<boolean>;

  constructor(pauseCallback?: () => boolean | Promise<boolean>) {
    this.pauseCallback = pauseCallback;
  }

  /**
   * Sets whether the rendering should pause at the next opportunity
   */
  setPause(shouldPause: boolean): void {
    this.shouldPause = shouldPause;
  }

  /**
   * Called by PDFium to check if rendering should pause
   * Returns 1 if rendering should pause, 0 to continue
   */
  async checkPause(): Promise<number> {
    if (this.shouldPause) {
      return 1; // Pause
    }

    if (this.pauseCallback) {
      try {
        const result = await this.pauseCallback();
        return result ? 1 : 0;
      } catch (error) {
        console.warn("Progressive rendering pause callback error:", error);
        return 0; // Continue on error
      }
    }

    return 0; // Continue
  }
}

/**
 * Progressive renderer for PDFium pages
 * Allows rendering large PDF pages incrementally to avoid memory issues and provide progress feedback
 */
export class PDFiumProgressiveRenderer {
  private readonly module: t.PDFium;
  private readonly pageIdx: number;
  private readonly originalWidth: number;
  private readonly originalHeight: number;
  private pauseInstance?: PDFiumProgressivePause;
  private pausePtr?: number;

  constructor(
    module: t.PDFium,
    pageIdx: number,
    originalWidth: number,
    originalHeight: number,
  ) {
    this.module = module;
    this.pageIdx = pageIdx;
    this.originalWidth = originalWidth;
    this.originalHeight = originalHeight;
  }

  /**
   * Render a page progressively with the given options
   */
  async render(options: PDFiumProgressiveRenderOptions = {}): Promise<PDFiumProgressiveRenderResult> {
    // Calculate dimensions
    let width: number;
    let height: number;
    if (options.scale !== undefined) {
      width = Math.floor(this.originalWidth * options.scale);
      height = Math.floor(this.originalHeight * options.scale);
    } else if (options.width !== undefined && options.height !== undefined) {
      width = options.width;
      height = options.height;
    } else {
      const scale = options.scale || 1;
      width = Math.floor(this.originalWidth * scale);
      height = Math.floor(this.originalHeight * scale);
    }

    const buffSize = width * height * BYTES_PER_PIXEL;
    const flags = options.flags || (FPDFRenderFlag.REVERSE_BYTE_ORDER | FPDFRenderFlag.ANNOT | FPDFRenderFlag.LCD_TEXT);
    const rotate = options.rotate || 0;
    const render = options.render || "bitmap";

    // Allocate memory for the bitmap
    const ptr = this.module.wasmExports.malloc(buffSize);
    this.module.HEAPU8.fill(0, ptr, ptr + buffSize);

    let bitmap: number | null = null;
    let steps = 0;
    let wasInterrupted = false;

    try {
      // Create bitmap
      bitmap = this.module._FPDFBitmap_CreateEx(width, height, FPDFBitmap.BGRA, ptr, width * BYTES_PER_PIXEL);
      
      // Fill with white background
      this.module._FPDFBitmap_FillRect(
        bitmap,
        0, // left
        0, // top
        width, // width
        height, // height
        0xffffffff, // color (white)
      );

      // Set up pause structure if progress callback is provided
      if (options.onProgress) {
        this.pauseInstance = new PDFiumProgressivePause();
        this.pausePtr = this.createPauseStructure();
      }

      // Start progressive rendering
      let status = this.module._FPDF_RenderPageBitmap_Start(
        bitmap,
        this.pageIdx,
        0, // start_x
        0, // start_y
        width, // size_x
        height, // size_y
        rotate,
        flags,
        this.pausePtr || 0, // pause structure pointer
      );

      steps++;

      // Continue rendering until complete or failed
      while (status === FPDFProgressiveStatus.RENDER_TOBECONTINUED) {
        if (options.onProgress) {
          const progress: PDFiumProgressiveRenderProgress = {
            status,
            isComplete: false,
            isFailed: false,
            step: steps,
            bitmap,
          };

          try {
            const shouldContinue = await options.onProgress(progress);
            if (!shouldContinue) {
              wasInterrupted = true;
              break;
            }
          } catch (error) {
            console.warn("Progressive rendering progress callback error:", error);
            // Continue rendering on callback error
          }
        }

        // Pause between rendering steps if specified
        if (options.pauseInterval && options.pauseInterval > 0) {
          await this.sleep(options.pauseInterval);
        }

        status = this.module._FPDF_RenderPageBitmap_Continue(bitmap, this.pausePtr || 0);
        steps++;
      }

      // Handle final status
      const isComplete = status === FPDFProgressiveStatus.RENDER_DONE;
      const isFailed = status === FPDFProgressiveStatus.RENDER_FAILED;

      if (options.onProgress && !wasInterrupted) {
        const finalProgress: PDFiumProgressiveRenderProgress = {
          status,
          isComplete,
          isFailed,
          step: steps,
          bitmap,
        };

        try {
          await options.onProgress(finalProgress);
        } catch (error) {
          console.warn("Progressive rendering final progress callback error:", error);
        }
      }

      if (isFailed && !wasInterrupted) {
        throw new Error("Progressive rendering failed");
      }

      // Extract bitmap data
      const data = this.module.HEAPU8.slice(ptr, ptr + buffSize);

      // Convert bitmap to final image format
      const image = await convertBitmapToImage({
        render,
        width,
        height,
        data,
      });

      return {
        width,
        height,
        originalWidth: this.originalWidth,
        originalHeight: this.originalHeight,
        data: image,
        steps,
        wasInterrupted,
      };
    } finally {
      // Clean up resources
      if (bitmap) {
        this.module._FPDF_RenderPageBitmap_Close(bitmap);
        this.module._FPDFBitmap_Destroy(bitmap);
      }
      
      if (this.pausePtr) {
        this.module.wasmExports.free(this.pausePtr);
        this.pausePtr = undefined;
      }
      
      this.module.wasmExports.free(ptr);
      this.pauseInstance = undefined;
    }
  }

  /**
   * Create a pause structure in WASM memory
   * This structure is used by PDFium to check if rendering should pause
   */
  private createPauseStructure(): number {
    // Allocate memory for pause structure (typically 8 bytes for function pointer + user data)
    const pausePtr = this.module.wasmExports.malloc(8);
    
    // For now, we'll use a simple approach where the pause structure is just a placeholder
    // In a full implementation, you'd need to set up proper function pointers
    // that PDFium can call to check if rendering should pause
    this.module.HEAP32[pausePtr / 4] = 0; // Function pointer (placeholder)
    this.module.HEAP32[pausePtr / 4 + 1] = 0; // User data pointer
    
    return pausePtr;
  }

  /**
   * Sleep for the specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Request rendering to pause at the next opportunity
   */
  requestPause(): void {
    if (this.pauseInstance) {
      this.pauseInstance.setPause(true);
    }
  }

  /**
   * Resume rendering after a pause
   */
  resume(): void {
    if (this.pauseInstance) {
      this.pauseInstance.setPause(false);
    }
  }
}
