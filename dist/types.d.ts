export type PDFiumRenderOptions = {
    width: number;
    height: number;
    data: Uint8Array;
};
export type PDFiumRenderCallback = (options: PDFiumRenderOptions) => Promise<Uint8Array>;
export type PDFiumRenderFunction = "bitmap" | PDFiumRenderCallback;
export type PDFiumProgressiveRenderOptions = {
    width?: number;
    height?: number;
    scale?: number;
    render?: PDFiumRenderFunction;
    flags?: number;
    rotate?: number;
    onProgress?: (progress: PDFiumProgressiveRenderProgress) => boolean | Promise<boolean>;
    pauseInterval?: number;
};
export type PDFiumProgressiveRenderProgress = {
    status: number;
    isComplete: boolean;
    isFailed: boolean;
    step: number;
    bitmap: number;
};
export type PDFiumProgressiveRenderResult = {
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
    data: Uint8Array;
    steps: number;
    wasInterrupted: boolean;
};
