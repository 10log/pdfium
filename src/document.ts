import { FPDFMetadataTag } from "./constants.js";
import type { PDFiumDocumentMetadata, PDFiumMetadataTagName } from "./document.types.js";
import { OCGManager } from "./ocg.js";
import type * as t from "./vendor/pdfium.js";

import { PDFiumPage } from "./page.js";

export class PDFiumDocument {
  private readonly module: t.PDFium;

  // ID to interact with the document in the PDFium library
  private readonly documentIdx: number;

  // Pointer to the document in the WASM memory to free it later
  private readonly documentPtr: number;

  // OCG manager instance
  private _ocgManager?: OCGManager;

  constructor(options: {
    module: t.PDFium;
    documentIdx: number;
    documentPtr: number;
  }) {
    this.module = options.module;
    this.documentPtr = options.documentPtr;
    this.documentIdx = options.documentIdx;
  }

  /**
   * Get a page from the document by its index. The index is zero-based.
   */
  getPage(pageIndex: number): PDFiumPage {
    const page = this.module._FPDF_LoadPage(this.documentIdx, pageIndex);
    return new PDFiumPage({
      module: this.module,
      pageIdx: page,
      documentIdx: this.documentIdx,
      pageIndex: pageIndex,
    });
  }

  /**
   * User-friendly iterator to iterate over all pages in the document.
   */
  *pages(): Generator<PDFiumPage> {
    const pageCount = this.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      yield this.getPage(i);
    }
  }

  /**
   * Get the number of pages in the document.
   */
  getPageCount(): number {
    return this.module._FPDF_GetPageCount(this.documentIdx);
  }

  /**
   * Get the OCG (Optional Content Groups) manager for this document.
   * OCGs allow you to control the visibility of layers in PDF documents.
   */
  getOCGManager(): OCGManager {
    if (!this._ocgManager) {
      this._ocgManager = new OCGManager(this.module, this.documentIdx);
    }
    return this._ocgManager;
  }

  /**
   * Check if the document has any OCGs (layers)
   */
  hasOCGs(): boolean {
    return this.getOCGManager().getOCGCount() > 0;
  }

  /**
   * Get metadata for a specific tag from the document.
   * @param tag The metadata tag name to retrieve
   * @returns The metadata value as a string, or undefined if not found
   */
  getMetadataTag(tag: PDFiumMetadataTagName): string | undefined {
    // Convert the tag string to a C string pointer
    const tagCString = this.stringToCString(tag);

    try {
      // First call to get the required buffer length
      const requiredLength = this.module._FPDF_GetMetaText(
        this.documentIdx,
        tagCString,
        0, // null buffer to get length
        0, // buffer length 0
      );

      if (requiredLength <= 2) {
        // No data available (PDFium returns 2 for empty string with null terminator)
        return undefined;
      }

      // Allocate buffer for the metadata text
      const bufferPtr = this.module.wasmExports.malloc(requiredLength);

      try {
        // Second call to get the actual metadata
        const actualLength = this.module._FPDF_GetMetaText(this.documentIdx, tagCString, bufferPtr, requiredLength);

        if (actualLength > 2) {
          // Convert the UTF-16LE buffer to JavaScript string
          const buffer = new Uint8Array(this.module.HEAPU8.buffer, bufferPtr, actualLength);

          // PDFium returns UTF-16LE encoded strings
          const decoder = new TextDecoder("utf-16le");
          const text = decoder.decode(buffer);

          // Remove null terminator and return
          return text.replace(/\0/g, "").trim();
        }

        return undefined;
      } finally {
        this.module.wasmExports.free(bufferPtr);
      }
    } finally {
      this.module.wasmExports.free(tagCString);
    }
  }

  /**
   * Get all available metadata from the document.
   * @returns An object containing all available metadata fields
   */
  getMetadata(): PDFiumDocumentMetadata {
    const metadata: PDFiumDocumentMetadata = {};

    // Extract each metadata field
    const title = this.getMetadataTag(FPDFMetadataTag.TITLE);
    if (title) metadata.title = title;

    const author = this.getMetadataTag(FPDFMetadataTag.AUTHOR);
    if (author) metadata.author = author;

    const subject = this.getMetadataTag(FPDFMetadataTag.SUBJECT);
    if (subject) metadata.subject = subject;

    const keywords = this.getMetadataTag(FPDFMetadataTag.KEYWORDS);
    if (keywords) metadata.keywords = keywords;

    const creator = this.getMetadataTag(FPDFMetadataTag.CREATOR);
    if (creator) metadata.creator = creator;

    const producer = this.getMetadataTag(FPDFMetadataTag.PRODUCER);
    if (producer) metadata.producer = producer;

    const creationDate = this.getMetadataTag(FPDFMetadataTag.CREATION_DATE);
    if (creationDate) metadata.creationDate = creationDate;

    const modifiedDate = this.getMetadataTag(FPDFMetadataTag.MODIFIED_DATE);
    if (modifiedDate) metadata.modifiedDate = modifiedDate;

    return metadata;
  }

  /**
   * Helper method to convert a JavaScript string to a C string pointer.
   * @param str The string to convert
   * @returns Pointer to the C string in WASM memory
   */
  private stringToCString(str: string): number {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(`${str}\0`); // Add null terminator
    const ptr = this.module.wasmExports.malloc(bytes.length);
    const memory = new Uint8Array(this.module.HEAPU8.buffer, ptr, bytes.length);
    memory.set(bytes);
    return ptr;
  }

  /**
   * After you're done with the document, you should destroy it to free the memory.
   *
   * Otherwise, you'll be fired from your job for causing a memory leak. 😱
   */
  destroy(): void {
    this.module._FPDF_CloseDocument(this.documentIdx);
    this.module.wasmExports.free(this.documentPtr);
  }
}
