export declare type PDFium = {
  _FPDF_InitLibraryWithConfig: (config: object) => void;
  _FPDF_LoadMemDocument: (documentPtr: number, documentSize: number, passwordPtr: number) => number;
  _FPDF_GetLastError: () => number;
  _FPDF_DestroyLibrary: () => void;
  _FPDF_GetPageCount: (documentIdx: number) => number;
  _FPDF_LoadPage: (documentIdx: number, pageIndex: number) => number;
  _FPDF_GetPageWidth: (page: number) => number;
  _FPDF_GetPageHeight: (page: number) => number;
  _FPDFPage_CountObjects: (page: number) => number;
  _FPDFPage_GetObject: (page: number, i: number) => number;
  _FPDFPageObj_GetType: (objectIdx: number) => number;
  _FPDFImageObj_GetBitmap: (objectIdx: number) => number;
  _FPDFImageObj_GetImageDataRaw: (objectIdx: number, buffer: number, lenght: number) => number;
  _FPDF_ClosePage: (page: number) => void;
  _FPDFImageObj_GetImagePixelSize: (objectIdx: number, width: number, height: number) => number;
  _FPDFImageObj_GetImageFilterCount(objectIdx: number): number;
  _FPDFImageObj_GetImageFilter(objectIdx: number, index: number, buffer: number, length: number): number;

  _FPDFText_LoadPage: (page: number) => number;
  _FPDFText_ClosePage: (textPage: number) => void;
  _FPDFText_CountChars: (textPage: number) => number;
  _FPDFText_GetText: (textPage: number, startIndex: number, count: number, buffer: number) => number;
  _FPDFText_GetUnicode: (textPage: number, index: number) => number;
  _FPDFText_GetFontSize: (textPage: number, index: number) => number;
  _FPDFText_GetFontInfo: (textPage: number, index: number, buffer: number, buflen: number, flags: number) => number;
  _FPDFText_GetFontWeight: (textPage: number, index: number) => number;
  _FPDFText_GetFillColor: (textPage: number, index: number, R: number, G: number, B: number, A: number) => number;
  _FPDFText_GetStrokeColor: (textPage: number, index: number, R: number, G: number, B: number, A: number) => number;
  _FPDFText_GetCharAngle: (textPage: number, index: number) => number;
  _FPDFText_GetCharBox: (textPage: number, index: number, left: number, right: number, bottom: number, top: number) => number;
  _FPDFText_GetCharOrigin: (textPage: number, index: number, x: number, y: number) => number;
  _FPDFText_IsGenerated: (textPage: number, index: number) => number;
  _FPDFText_IsHyphen: (textPage: number, index: number) => number;

  // Page label extraction API
  _FPDF_GetPageLabel: (document: number, page_index: number, buffer: number, buflen: number) => number;

  // Document metadata extraction API
  _FPDF_GetMetaText: (document: number, tag: number, buffer: number, buflen: number) => number;

  _FPDFBitmap_CreateEx: (width: number, height: number, format: number, ptr: number, stride: number) => number;
  _FPDFBitmap_FillRect: (
    bitmap: number,
    left: number,
    top: number,
    width: number,
    height: number,
    color: number,
  ) => void;
  _FPDF_RenderPageBitmap: (
    bitmap: number,
    page: number,
    start_x: number,
    start_y: number,
    size_x: number,
    size_y: number,
    rotate: number,
    flags: number,
  ) => void;
  _FPDFBitmap_Destroy: (bitmap: number) => void;
  _FPDFBitmap_GetBuffer: (bitmap: number) => number;
  _FPDFImageObj_GetRenderedBitmap: (document: number, page: number, object: number) => number;
  _FPDFBitmap_GetWidth: (bitmap: number) => number;
  _FPDFBitmap_GetHeight: (bitmap: number) => number;
  _FPDFBitmap_GetStride: (bitmap: number) => number;
  _FPDFBitmap_GetFormat: (bitmap: number) => number;
  _FPDF_CloseDocument(document: number): void;

  // Path/Vector extraction APIs
  _FPDFPath_CountSegments: (path: number) => number;
  _FPDFPath_GetPathSegment: (path: number, index: number) => number;
  _FPDFPathSegment_GetPoint: (segment: number, x: number, y: number) => number;
  _FPDFPathSegment_GetType: (segment: number) => number;
  _FPDFPathSegment_GetClose: (segment: number) => number;

  wasmExports: {
    malloc: (size: number) => number;
    free: (ptr: number) => void;
  };
  HEAPU8: Uint8Array;
  HEAPF64: Float64Array;
  HEAP32: Int32Array;
  HEAPU32: Uint32Array;
};

export declare type LoadPdfiumOptions = {
  wasmBinary?: ArrayBuffer;
  locateFile?: (path: string) => string;
  instantiateWasm?: (
    imports: WebAssembly.Imports,
    successCallback: (module: WebAssembly.Module) => void,
  ) => WebAssembly.Exports;
};

export declare function loadPdfium(options: LoadPdfiumOptions): Promise<PDFium>;

export default loadPdfium;
