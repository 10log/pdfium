import type * as t from "./vendor/pdfium.js";
import type { PDFiumImageObjectRaw, PDFiumImageObjectRender, PDFiumImageObjectRenderParams, PDFiumObjectType, PDFiumPathData, PDFiumPathSegment } from "./objects.types.js";
export declare abstract class PDFiumObjectBase {
    abstract readonly type: PDFiumObjectType;
    protected readonly module: t.PDFium;
    protected readonly documentIdx: number;
    protected readonly pageIdx: number;
    protected readonly objectIdx: number;
    constructor(options: {
        module: t.PDFium;
        objectIdx: number;
        documentIdx: number;
        pageIdx: number;
    });
    static create(options: {
        module: t.PDFium;
        objectIdx: number;
        documentIdx: number;
        pageIdx: number;
    }): PDFiumObject;
}
export declare class PDFiumTextObject extends PDFiumObjectBase {
    type: "text";
}
export declare class PDFiumPathObject extends PDFiumObjectBase {
    type: "path";
    /**
     * Convert numeric segment type to string representation
     */
    private segmentTypeToString;
    /**
     * Get the number of segments in this path object
     */
    getSegmentCount(): number;
    /**
     * Get a specific path segment by index
     */
    getSegment(index: number): PDFiumPathSegment | null;
    /**
     * Get all path segments for this path object
     */
    getPathData(): PDFiumPathData;
}
export declare class PDFiumImageObject extends PDFiumObjectBase {
    type: "image";
    private static formatToBPP;
    /**
     * Return the raw uncompressed image data.
     */
    getImageDataRaw(): Promise<PDFiumImageObjectRaw>;
    /**
     * Render the image object to a buffer with the specified render function.
     */
    render(options?: PDFiumImageObjectRenderParams): Promise<PDFiumImageObjectRender>;
}
export declare class PDFiumShadingObject extends PDFiumObjectBase {
    type: "shading";
}
export declare class PDFiumFormObject extends PDFiumObjectBase {
    type: "form";
}
export type PDFiumObject = PDFiumTextObject | PDFiumPathObject | PDFiumImageObject | PDFiumShadingObject | PDFiumFormObject;
