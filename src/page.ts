import type * as t from "./vendor/pdfium.js";

import { BYTES_PER_PIXEL, FPDFBitmap, FPDFRenderFlag } from "./constants.js";
import { type PDFiumObject, PDFiumObjectBase } from "./objects.js";
import type { PDFiumPageRender, PDFiumPageRenderParams, PDFiumEnhancedTextExtraction, PDFiumTextCharacter, PDFiumPageLabel } from "./page.types.js";
import type { PDFiumRenderFunction, PDFiumRenderOptions } from "./types.js";
import { convertBitmapToImage } from "./utils.js";

export class PDFiumPage {
  private readonly module: t.PDFium;
  private readonly pageIdx: number;
  private readonly documentIdx: number;
  number: number; // 0-based index of the page

  constructor(options: {
    module: t.PDFium;
    pageIdx: number;
    documentIdx: number;
    pageIndex: number;
  }) {
    this.module = options.module;
    this.pageIdx = options.pageIdx;
    this.documentIdx = options.documentIdx;
    this.number = options.pageIndex;
  }

  /**
   * Get the size of the page in points (1/72 inch)
   */
  getSize(precisely = false) {
    const width = this.module._FPDF_GetPageWidth(this.pageIdx);
    const height = this.module._FPDF_GetPageHeight(this.pageIdx);
    if (precisely) {
      return {
        width: width,
        height: height,
      };
    }
    return {
      width: Math.floor(width),
      height: Math.floor(height),
    };
  }

  /**
   * Extract text from the page
   */
  getText(): string {
    const textPage = this.module._FPDFText_LoadPage(this.pageIdx);
    if (!textPage) {
      throw new Error("Failed to load text page");
    }

    try {
      const charCount = this.module._FPDFText_CountChars(textPage);

      if (charCount <= 0) {
        return "";
      }

      const bufferSize = (charCount + 1) * 2;
      const textPtr = this.module.wasmExports.malloc(bufferSize);

      try {
        const length = this.module._FPDFText_GetText(textPage, 0, charCount, textPtr);

        if (length <= 0) {
          return "";
        }

        // Convert the UTF-16LE buffer to a JavaScript string
        // Subtract 1 from length to remove the null terminator
        const buffer = new Uint8Array(this.module.HEAPU8.buffer, textPtr, (length - 1) * 2);
        const text = new TextDecoder("utf-16le").decode(buffer);

        return text;
      } finally {
        this.module.wasmExports.free(textPtr);
      }
    } finally {
      this.module._FPDFText_ClosePage(textPage);
    }
  }

  /**
   * Extract enhanced text with position, font, and other properties
   */
  getEnhancedText(): PDFiumEnhancedTextExtraction {
    const textPage = this.module._FPDFText_LoadPage(this.pageIdx);
    if (!textPage) {
      throw new Error("Failed to load text page");
    }

    try {
      const charCount = this.module._FPDFText_CountChars(textPage);

      if (charCount <= 0) {
        return {
          text: "",
          characters: [],
          charCount: 0,
        };
      }

      const characters: PDFiumTextCharacter[] = [];
      let fullText = "";

      for (let i = 0; i < charCount; i++) {
        const character = this.getCharacterInfo(textPage, i);
        characters.push(character);
        fullText += character.char;
      }

      return {
        text: fullText,
        characters,
        charCount,
      };
    } finally {
      this.module._FPDFText_ClosePage(textPage);
    }
  }

  /**
   * Get the page label/title for this page
   */
  getLabel(): PDFiumPageLabel {
    // First call to get the required buffer size
    const requiredSize = this.module._FPDF_GetPageLabel(this.documentIdx, this.number, 0, 0);
    
    if (requiredSize <= 0) {
      return {
        label: "",
        hasLabel: false,
      };
    }

    // Allocate buffer for the label (size includes null terminator)
    const bufferPtr = this.module.wasmExports.malloc(requiredSize);
    
    try {
      const actualSize = this.module._FPDF_GetPageLabel(this.documentIdx, this.number, bufferPtr, requiredSize);
      
      if (actualSize <= 0) {
        return {
          label: "",
          hasLabel: false,
        };
      }

      // Page labels are returned in UTF-16LE format
      // Subtract 2 from actualSize to exclude null terminator (2 bytes for UTF-16LE)
      const buffer = new Uint8Array(this.module.HEAPU8.buffer, bufferPtr, (actualSize - 2));
      const label = new TextDecoder("utf-16le").decode(buffer);

      return {
        label: label,
        hasLabel: true,
      };
    } finally {
      this.module.wasmExports.free(bufferPtr);
    }
  }

  /**
   * Get detailed information for a specific character
   */
  private getCharacterInfo(textPage: number, index: number): PDFiumTextCharacter {
    // Get Unicode character
    const unicode = this.module._FPDFText_GetUnicode(textPage, index);
    const char = String.fromCharCode(unicode);

    // Get bounding box
    const leftPtr = this.module.wasmExports.malloc(8);
    const rightPtr = this.module.wasmExports.malloc(8);
    const bottomPtr = this.module.wasmExports.malloc(8);
    const topPtr = this.module.wasmExports.malloc(8);

    let bounds = { left: 0, right: 0, bottom: 0, top: 0 };
    try {
      const boundsSuccess = this.module._FPDFText_GetCharBox(textPage, index, leftPtr, rightPtr, bottomPtr, topPtr);
      if (boundsSuccess) {
        bounds = {
          left: this.module.HEAPF64[leftPtr >> 3],
          right: this.module.HEAPF64[rightPtr >> 3],
          bottom: this.module.HEAPF64[bottomPtr >> 3],
          top: this.module.HEAPF64[topPtr >> 3],
        };
      }
    } finally {
      this.module.wasmExports.free(leftPtr);
      this.module.wasmExports.free(rightPtr);
      this.module.wasmExports.free(bottomPtr);
      this.module.wasmExports.free(topPtr);
    }

    // Get origin
    const xPtr = this.module.wasmExports.malloc(8);
    const yPtr = this.module.wasmExports.malloc(8);

    let origin = { x: 0, y: 0 };
    try {
      const originSuccess = this.module._FPDFText_GetCharOrigin(textPage, index, xPtr, yPtr);
      if (originSuccess) {
        origin = {
          x: this.module.HEAPF64[xPtr >> 3],
          y: this.module.HEAPF64[yPtr >> 3],
        };
      }
    } finally {
      this.module.wasmExports.free(xPtr);
      this.module.wasmExports.free(yPtr);
    }

    // Get font information
    const fontSize = this.module._FPDFText_GetFontSize(textPage, index);
    const fontWeight = this.module._FPDFText_GetFontWeight(textPage, index);
    
    // Get font name
    const flagsPtr = this.module.wasmExports.malloc(4);
    let fontName = "";
    let fontFlags = 0;
    
    try {
      // First call to get the required buffer size
      const nameLength = this.module._FPDFText_GetFontInfo(textPage, index, 0, 0, flagsPtr);
      
      if (nameLength > 0) {
        const namePtr = this.module.wasmExports.malloc(nameLength);
        try {
          const actualLength = this.module._FPDFText_GetFontInfo(textPage, index, namePtr, nameLength, flagsPtr);
          if (actualLength > 0) {
            // Font name is returned in UTF-8
            const nameBuffer = new Uint8Array(this.module.HEAPU8.buffer, namePtr, actualLength - 1); // -1 to exclude null terminator
            fontName = new TextDecoder("utf-8").decode(nameBuffer);
            fontFlags = this.module.HEAP32[flagsPtr >> 2];
          }
        } finally {
          this.module.wasmExports.free(namePtr);
        }
      }
    } finally {
      this.module.wasmExports.free(flagsPtr);
    }

    // Get colors
    const rPtr = this.module.wasmExports.malloc(4);
    const gPtr = this.module.wasmExports.malloc(4);
    const bPtr = this.module.wasmExports.malloc(4);
    const aPtr = this.module.wasmExports.malloc(4);

    let fillColor = { r: 0, g: 0, b: 0, a: 255 };
    let strokeColor = { r: 0, g: 0, b: 0, a: 255 };

    try {
      const fillSuccess = this.module._FPDFText_GetFillColor(textPage, index, rPtr, gPtr, bPtr, aPtr);
      if (fillSuccess) {
        fillColor = {
          r: this.module.HEAPU32[rPtr >> 2],
          g: this.module.HEAPU32[gPtr >> 2],
          b: this.module.HEAPU32[bPtr >> 2],
          a: this.module.HEAPU32[aPtr >> 2],
        };
      }

      const strokeSuccess = this.module._FPDFText_GetStrokeColor(textPage, index, rPtr, gPtr, bPtr, aPtr);
      if (strokeSuccess) {
        strokeColor = {
          r: this.module.HEAPU32[rPtr >> 2],
          g: this.module.HEAPU32[gPtr >> 2],
          b: this.module.HEAPU32[bPtr >> 2],
          a: this.module.HEAPU32[aPtr >> 2],
        };
      }
    } finally {
      this.module.wasmExports.free(rPtr);
      this.module.wasmExports.free(gPtr);
      this.module.wasmExports.free(bPtr);
      this.module.wasmExports.free(aPtr);
    }

    // Get other properties
    const angle = this.module._FPDFText_GetCharAngle(textPage, index);
    const isGenerated = this.module._FPDFText_IsGenerated(textPage, index) === 1;
    const isHyphen = this.module._FPDFText_IsHyphen(textPage, index) === 1;

    return {
      char,
      unicode,
      index,
      bounds,
      origin,
      font: {
        name: fontName,
        size: fontSize,
        weight: fontWeight,
        flags: fontFlags,
      },
      fillColor,
      strokeColor,
      angle,
      isGenerated,
      isHyphen,
    };
  }

  async render(
    options: PDFiumPageRenderParams = {
      scale: 1,
      render: "bitmap",
    },
  ): Promise<PDFiumPageRender> {
    const { width: originalWidth, height: originalHeight } = this.getSize();

    // You can specify either the scale or the width and height.
    let width: number;
    let height: number;
    if ("scale" in options) {
      width = Math.floor(originalWidth * options.scale);
      height = Math.floor(originalHeight * options.scale);
    } else {
      width = options.width;
      height = options.height;
    }

    const buffSize = width * height * BYTES_PER_PIXEL;

    // Allocate a block of memory for the bitmap and fill it with zeros.
    const ptr = this.module.wasmExports.malloc(buffSize);
    this.module.HEAPU8.fill(0, ptr, ptr + buffSize);

    const bitmap = this.module._FPDFBitmap_CreateEx(width, height, FPDFBitmap.BGRA, ptr, width * BYTES_PER_PIXEL);
    this.module._FPDFBitmap_FillRect(
      bitmap,
      0, // left
      0, // top
      width, // width
      height, // height
      0xffffffff, // color (white)
    );
    this.module._FPDF_RenderPageBitmap(
      bitmap,
      this.pageIdx,
      0, // start_x
      0, // start_y
      width, // size_x
      height, // size_y
      0, // rotate (0, normal)
      FPDFRenderFlag.REVERSE_BYTE_ORDER | FPDFRenderFlag.ANNOT | FPDFRenderFlag.LCD_TEXT, // flags
    );
    this.module._FPDFBitmap_Destroy(bitmap);
    this.module._FPDF_ClosePage(this.pageIdx);

    const data = this.module.HEAPU8.slice(ptr, ptr + buffSize);
    this.module.wasmExports.free(ptr);

    const image = await this.convertBitmapToImage({
      render: options.render,
      width: width,
      height: height,
      data: data,
    });

    return {
      width: width,
      height: height,
      originalHeight: originalHeight,
      originalWidth: originalWidth,
      data: image,
    };
  }

  async convertBitmapToImage(
    options: {
      render: PDFiumRenderFunction;
    } & PDFiumRenderOptions,
  ): Promise<Uint8Array> {
    return await convertBitmapToImage(options);
  }

  getObjectCount(): number {
    return this.module._FPDFPage_CountObjects(this.pageIdx);
  }

  getObject(i: number): PDFiumObject {
    const object = this.module._FPDFPage_GetObject(this.pageIdx, i);
    return PDFiumObjectBase.create({
      module: this.module,
      objectIdx: object,
      documentIdx: this.documentIdx,
      pageIdx: this.pageIdx,
    });
  }

  *objects(): Generator<PDFiumObject> {
    const objectsCount = this.getObjectCount();
    for (let i = 0; i < objectsCount; i++) {
      yield this.getObject(i);
    }
  }
}
