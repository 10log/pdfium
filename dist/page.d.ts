import type * as t from "./vendor/pdfium.js";
import { type PDFiumObject } from "./objects.js";
import type { PDFiumEnhancedTextExtraction, PDFiumPageLabel, PDFiumPageRender, PDFiumPageRenderParams, PDFiumProgressiveRenderOptions, PDFiumProgressiveRenderResult } from "./page.types.js";
import type { PDFiumRenderFunction, PDFiumRenderOptions } from "./types.js";
import { PDFiumProgressiveRenderer } from "./progressive.js";
export declare class PDFiumPage {
    private readonly module;
    private readonly pageIdx;
    private readonly documentIdx;
    number: number;
    constructor(options: {
        module: t.PDFium;
        pageIdx: number;
        documentIdx: number;
        pageIndex: number;
    });
    /**
     * Get the size of the page in points (1/72 inch)
     */
    getSize(precisely?: boolean): {
        width: number;
        height: number;
    };
    /**
     * Extract text from the page
     */
    getText(): string;
    /**
     * Extract enhanced text with position, font, and other properties
     */
    getEnhancedText(): PDFiumEnhancedTextExtraction;
    /**
     * Get the page label/title for this page
     */
    getLabel(): PDFiumPageLabel;
    /**
     * Get detailed information for a specific character
     */
    private getCharacterInfo;
    render(options?: PDFiumPageRenderParams): Promise<PDFiumPageRender>;
    convertBitmapToImage(options: {
        render: PDFiumRenderFunction;
    } & PDFiumRenderOptions): Promise<Uint8Array>;
    getObjectCount(): number;
    getObject(i: number): PDFiumObject;
    objects(): Generator<PDFiumObject>;
    /**
     * Get the number of OCGs (Optional Content Groups) on this page
     */
    getPageOCGCount(): number;
    /**
     * Get an OCG handle from this page by index
     */
    getPageOCG(index: number): number;
    /**
     * Render the page progressively with incremental updates
     * This is useful for large pages or when you need progress feedback
     */
    renderProgressive(options?: PDFiumProgressiveRenderOptions): Promise<PDFiumProgressiveRenderResult>;
    /**
     * Create a progressive renderer instance for this page
     * Allows for more control over the progressive rendering process
     */
    createProgressiveRenderer(): PDFiumProgressiveRenderer;
}
