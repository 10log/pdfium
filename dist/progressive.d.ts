import type * as t from "./vendor/pdfium.js";
import type { PDFiumProgressiveRenderOptions, PDFiumProgressiveRenderResult } from "./types.js";
/**
 * Progressive renderer for PDFium pages
 * Allows rendering large PDF pages incrementally to avoid memory issues and provide progress feedback
 */
export declare class PDFiumProgressiveRenderer {
    private readonly module;
    private readonly pageIdx;
    private readonly originalWidth;
    private readonly originalHeight;
    private pauseInstance?;
    private pausePtr?;
    constructor(module: t.PDFium, pageIdx: number, originalWidth: number, originalHeight: number);
    /**
     * Render a page progressively with the given options
     */
    render(options?: PDFiumProgressiveRenderOptions): Promise<PDFiumProgressiveRenderResult>;
    /**
     * Create a pause structure in WASM memory
     * This structure is used by PDFium to check if rendering should pause
     */
    private createPauseStructure;
    /**
     * Sleep for the specified number of milliseconds
     */
    private sleep;
    /**
     * Request rendering to pause at the next opportunity
     */
    requestPause(): void;
    /**
     * Resume rendering after a pause
     */
    resume(): void;
}
