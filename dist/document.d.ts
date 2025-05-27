import type { PDFiumDocumentMetadata, PDFiumMetadataTagName } from "./document.types.js";
import { OCGManager } from "./ocg.js";
import type * as t from "./vendor/pdfium.js";
import { PDFiumPage } from "./page.js";
export declare class PDFiumDocument {
    private readonly module;
    private readonly documentIdx;
    private readonly documentPtr;
    private _ocgManager?;
    constructor(options: {
        module: t.PDFium;
        documentIdx: number;
        documentPtr: number;
    });
    /**
     * Get a page from the document by its index. The index is zero-based.
     */
    getPage(pageIndex: number): PDFiumPage;
    /**
     * User-friendly iterator to iterate over all pages in the document.
     */
    pages(): Generator<PDFiumPage>;
    /**
     * Get the number of pages in the document.
     */
    getPageCount(): number;
    /**
     * Get the OCG (Optional Content Groups) manager for this document.
     * OCGs allow you to control the visibility of layers in PDF documents.
     */
    getOCGManager(): OCGManager;
    /**
     * Check if the document has any OCGs (layers)
     */
    hasOCGs(): boolean;
    /**
     * Get metadata for a specific tag from the document.
     * @param tag The metadata tag name to retrieve
     * @returns The metadata value as a string, or undefined if not found
     */
    getMetadataTag(tag: PDFiumMetadataTagName): string | undefined;
    /**
     * Get all available metadata from the document.
     * @returns An object containing all available metadata fields
     */
    getMetadata(): PDFiumDocumentMetadata;
    /**
     * Helper method to convert a JavaScript string to a C string pointer.
     * @param str The string to convert
     * @returns Pointer to the C string in WASM memory
     */
    private stringToCString;
    /**
     * After you're done with the document, you should destroy it to free the memory.
     *
     * Otherwise, you'll be fired from your job for causing a memory leak. 😱
     */
    destroy(): void;
}
