export declare const BYTES_PER_PIXEL = 4;
export declare const FPDFErrorCode: {
    SUCCESS: number;
    UNKNOWN: number;
    FILE: number;
    FORMAT: number;
    PASSWORD: number;
    SECURITY: number;
    PAGE: number;
};
export declare const FPDFBitmap: {
    Unknown: number;
    Gray: number;
    BGR: number;
    BGRx: number;
    BGRA: number;
};
export declare const FPDFRenderFlag: {
    ANNOT: number;
    LCD_TEXT: number;
    NO_NATIVETEXT: number;
    GRAYSCALE: number;
    DEBUG_INFO: number;
    NO_CATCH: number;
    RENDER_LIMITEDIMAGECACHE: number;
    RENDER_FORCEHALFTONE: number;
    PRINTING: number;
    RENDER_NO_SMOOTHTEXT: number;
    RENDER_NO_SMOOTHIMAGE: number;
    RENDER_NO_SMOOTHPATH: number;
    REVERSE_BYTE_ORDER: number;
    CONVERT_FILL_TO_STROKE: number;
};
export declare const FPDFPageObjectType: {
    TEXT: number;
    PATH: number;
    IMAGE: number;
    SHADING: number;
    FORM: number;
};
export declare const FPDFPathSegmentType: {
    UNKNOWN: number;
    LINETO: number;
    BEZIERTO: number;
    MOVETO: number;
};
export declare const FPDFMetadataTag: {
    readonly TITLE: "Title";
    readonly AUTHOR: "Author";
    readonly SUBJECT: "Subject";
    readonly KEYWORDS: "Keywords";
    readonly CREATOR: "Creator";
    readonly PRODUCER: "Producer";
    readonly CREATION_DATE: "CreationDate";
    readonly MODIFIED_DATE: "ModDate";
};
export declare const FPDF_COLORSCHEME_COUNT = 2;
export declare const FPDF_OCG_STATE_ON = 1;
export declare const FPDF_OCG_STATE_OFF = 0;
export declare const FPDF_OCG_STATE_UNCHANGED = -1;
export declare const FPDF_OCG_USAGE_VIEW = 0;
export declare const FPDF_OCG_USAGE_DESIGN = 1;
export declare const FPDF_OCG_USAGE_PRINT = 2;
export declare const FPDF_OCG_USAGE_EXPORT = 3;
export declare const FPDF_OCG_INTENT_VIEW = "View";
export declare const FPDF_OCG_INTENT_DESIGN = "Design";
export declare const FPDF_OCG_INTENT_ALL = "All";
export declare const FPDFProgressiveStatus: {
    RENDER_TOBECONTINUED: number;
    RENDER_DONE: number;
    RENDER_FAILED: number;
};
