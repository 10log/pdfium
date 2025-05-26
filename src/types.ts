export type PDFiumRenderOptions = {
  width: number;
  height: number;
  data: Uint8Array;
};

export type PDFiumRenderCallback = (options: PDFiumRenderOptions) => Promise<Uint8Array>;

export type PDFiumRenderFunction = "bitmap" | PDFiumRenderCallback;

// Progressive rendering types
export type PDFiumProgressiveRenderOptions = {
  width?: number;
  height?: number;
  scale?: number;
  render?: PDFiumRenderFunction;
  flags?: number;
  rotate?: number;
  onProgress?: (progress: PDFiumProgressiveRenderProgress) => boolean | Promise<boolean>;
  pauseInterval?: number; // Time in milliseconds to pause between rendering steps
};

export type PDFiumProgressiveRenderProgress = {
  status: number; // FPDFProgressiveStatus value
  isComplete: boolean;
  isFailed: boolean;
  step: number; // Current rendering step
  bitmap: number; // Bitmap handle
};

export type PDFiumProgressiveRenderResult = {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  data: Uint8Array;
  steps: number; // Total number of rendering steps
  wasInterrupted: boolean; // Whether rendering was interrupted by user
};
