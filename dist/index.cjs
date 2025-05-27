'use strict';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

const BYTES_PER_PIXEL = 4;
const FPDFErrorCode = {
    SUCCESS: 0, // No error.
    UNKNOWN: 1, // Unknown error.
    FILE: 2, // File not found or could not be opened.
    FORMAT: 3, // File not in PDF format or corrupted.
    PASSWORD: 4, // Password required or incorrect password.
    SECURITY: 5, // Unsupported security scheme.
    PAGE: 6, // Page not found or content error.
};
const FPDFBitmap = {
    Unknown: 0,
    Gray: 1, // Gray scale bitmap, one byte per pixel.
    BGR: 2, // 3 bytes per pixel, byte order: blue, green, red.
    BGRx: 3, // 4 bytes per pixel, byte order: blue, green, red, unused.
    BGRA: 4, // 4 bytes per pixel, byte order: blue, green, red, alpha.
};
// Page rendering flags. They can be combined with bit-wise OR.
const FPDFRenderFlag = {
    // Set if annotations are to be rendered.
    ANNOT: 0x01,
    // Set if using text rendering optimized for LCD display. This flag will only
    // take effect if anti-aliasing is enabled for text.
    LCD_TEXT: 0x02,
    // Don't use the native text output available on some platforms
    NO_NATIVETEXT: 0x04,
    // Grayscale output.
    GRAYSCALE: 0x08,
    // Obsolete, has no effect, retained for compatibility.
    DEBUG_INFO: 0x80,
    // Obsolete, has no effect, retained for compatibility.
    NO_CATCH: 0x100,
    // Limit image cache size.
    RENDER_LIMITEDIMAGECACHE: 0x200,
    // Always use halftone for image stretching.
    RENDER_FORCEHALFTONE: 0x400,
    // Render for printing.
    PRINTING: 0x800,
    // Set to disable anti-aliasing on text. This flag will also disable LCD
    // optimization for text rendering.
    RENDER_NO_SMOOTHTEXT: 0x1000,
    // Set to disable anti-aliasing on images.
    RENDER_NO_SMOOTHIMAGE: 0x2000,
    // Set to disable anti-aliasing on paths.
    RENDER_NO_SMOOTHPATH: 0x4000,
    // Set whether to render in a reverse Byte order, this flag is only used when
    // rendering to a bitmap.
    REVERSE_BYTE_ORDER: 0x10,
    // Set whether fill paths need to be stroked. This flag is only used when
    // FPDF_COLORSCHEME is passed in, since with a single fill color for paths the
    // boundaries of adjacent fill paths are less visible.
    CONVERT_FILL_TO_STROKE: 0x20,
};
const FPDFPageObjectType = {
    TEXT: 1,
    PATH: 2,
    IMAGE: 3,
    SHADING: 4,
    FORM: 5,
};
const FPDFPathSegmentType = {
    UNKNOWN: -1,
    LINETO: 0,
    BEZIERTO: 1,
    MOVETO: 2,
};
const FPDFMetadataTag = {
    TITLE: "Title",
    AUTHOR: "Author",
    SUBJECT: "Subject",
    KEYWORDS: "Keywords",
    CREATOR: "Creator",
    PRODUCER: "Producer",
    CREATION_DATE: "CreationDate",
    MODIFIED_DATE: "ModDate",
};
// OCG (Optional Content Groups) constants
const FPDF_OCG_STATE_ON = 1;
const FPDF_OCG_STATE_OFF = 0;
const FPDF_OCG_STATE_UNCHANGED = -1;
// OCG Usage types
const FPDF_OCG_USAGE_VIEW = 0;
const FPDF_OCG_USAGE_DESIGN = 1;
const FPDF_OCG_USAGE_PRINT = 2;
const FPDF_OCG_USAGE_EXPORT = 3;
// OCG Intent types
const FPDF_OCG_INTENT_VIEW = "View";
const FPDF_OCG_INTENT_DESIGN = "Design";
const FPDF_OCG_INTENT_ALL = "All";
// Progressive rendering status constants
const FPDFProgressiveStatus = {
    // Rendering is in progress
    RENDER_TOBECONTINUED: 0,
    // Rendering completed successfully
    RENDER_DONE: 1,
    // Rendering failed due to error
    RENDER_FAILED: 2,
};

class OCGContext {
    constructor(lib, documentPtr, usage = FPDF_OCG_USAGE_VIEW) {
        this.lib = lib;
        this.documentPtr = documentPtr;
        try {
            this.contextPtr = this.lib._FPDF_CreateOCGContext ? this.lib._FPDF_CreateOCGContext(documentPtr, usage) : 0;
            if (!this.contextPtr) {
                console.warn("OCG context creation failed - OCG APIs may not be available");
            }
        }
        catch (error) {
            console.warn("OCG API not available in this PDFium build:", error);
            this.contextPtr = 0;
        }
    }
    /**
     * Set the state of an OCG in this context
     */
    setOCGState(ocg, state) {
        this.lib._FPDF_SetOCGContextState(this.contextPtr, ocg, state);
    }
    /**
     * Get the state of an OCG in this context
     */
    getOCGState(ocg) {
        return this.lib._FPDF_GetOCGContextState(this.contextPtr, ocg);
    }
    /**
     * Check if a page object is visible in this OCG context
     */
    isPageObjectVisible(pageObject) {
        return this.lib._FPDF_CheckPageObjectVisible(this.contextPtr, pageObject) === 1;
    }
    /**
     * Get the raw context pointer (for internal use)
     */
    getContextPtr() {
        return this.contextPtr;
    }
    /**
     * Destroy the OCG context and free resources
     */
    destroy() {
        if (this.contextPtr) {
            this.lib._FPDF_DestroyOCGContext(this.contextPtr);
            this.contextPtr = 0;
        }
    }
}
class OCGManager {
    constructor(lib, documentPtr) {
        this.lib = lib;
        this.documentPtr = documentPtr;
    }
    /**
     * Get the total number of OCGs in the document
     */
    getOCGCount() {
        try {
            return this.lib._FPDF_GetOCGCount ? this.lib._FPDF_GetOCGCount(this.documentPtr) : 0;
        }
        catch (error) {
            console.warn("OCG API not available in this PDFium build:", error);
            return 0;
        }
    }
    /**
     * Get an OCG handle by index
     */
    getOCG(index) {
        try {
            return this.lib._FPDF_GetOCG ? this.lib._FPDF_GetOCG(this.documentPtr, index) : 0;
        }
        catch (error) {
            console.warn("OCG API not available in this PDFium build:", error);
            return 0;
        }
    }
    /**
     * Get the name of an OCG
     */
    getOCGName(ocg) {
        try {
            if (!this.lib._FPDF_GetOCGName) {
                return "";
            }
            // First call to get the required buffer size
            const bufferSize = this.lib._FPDF_GetOCGName(ocg, 0, 0);
            if (bufferSize <= 0) {
                return "";
            }
            // Allocate buffer and get the name
            const buffer = this.lib.wasmExports.malloc(bufferSize);
            try {
                this.lib._FPDF_GetOCGName(ocg, buffer, bufferSize);
                const nameBuffer = new Uint8Array(this.lib.HEAPU8.buffer, buffer, bufferSize);
                return new TextDecoder("utf-16le").decode(nameBuffer);
            }
            finally {
                this.lib.wasmExports.free(buffer);
            }
        }
        catch (error) {
            console.warn("OCG name API not available in this PDFium build:", error);
            return "";
        }
    }
    /**
     * Get the usage type of an OCG
     */
    getOCGUsage(ocg) {
        return this.lib._FPDF_GetOCGUsage(ocg);
    }
    /**
     * Set the global state of an OCG in the document
     */
    setOCGState(ocg, state) {
        return this.lib._FPDF_SetOCGState(this.documentPtr, ocg, state) === 1;
    }
    /**
     * Get the global state of an OCG in the document
     */
    getOCGState(ocg) {
        return this.lib._FPDF_GetOCGState(this.documentPtr, ocg);
    }
    /**
     * Check if an OCG is in the default configuration
     */
    isOCGInDefaultConfig(ocg) {
        return this.lib._FPDF_IsOCGInDefaultConfig(this.documentPtr, ocg) === 1;
    }
    /**
     * Get the intent of an OCG
     */
    getOCGIntent(ocg) {
        try {
            if (!this.lib._FPDF_GetOCGIntent) {
                return [];
            }
            // First call to get the required buffer size
            const bufferSize = this.lib._FPDF_GetOCGIntent(ocg, 0, 0);
            if (bufferSize <= 0) {
                return [];
            }
            // Allocate buffer and get the intent
            const buffer = this.lib.wasmExports.malloc(bufferSize);
            try {
                this.lib._FPDF_GetOCGIntent(ocg, buffer, bufferSize);
                const intentBuffer = new Uint8Array(this.lib.HEAPU8.buffer, buffer, bufferSize);
                const intentString = new TextDecoder("utf-16le").decode(intentBuffer);
                // Split by whitespace and filter empty strings
                return intentString.split(/\s+/).filter((intent) => intent.length > 0);
            }
            finally {
                this.lib.wasmExports.free(buffer);
            }
        }
        catch (error) {
            console.warn("OCG intent API not available in this PDFium build:", error);
            return [];
        }
    }
    /**
     * Get comprehensive information about an OCG
     */
    getOCGInfo(index) {
        const ocg = this.getOCG(index);
        if (!ocg) {
            return null;
        }
        return {
            index,
            name: this.getOCGName(ocg),
            state: this.getOCGState(ocg),
            usage: this.getOCGUsage(ocg),
            intent: this.getOCGIntent(ocg),
            isInDefaultConfig: this.isOCGInDefaultConfig(ocg),
        };
    }
    /**
     * Get all OCGs in the document
     */
    getAllOCGs() {
        const count = this.getOCGCount();
        const ocgs = [];
        for (let i = 0; i < count; i++) {
            const ocgInfo = this.getOCGInfo(i);
            if (ocgInfo) {
                ocgs.push(ocgInfo);
            }
        }
        return ocgs;
    }
    /**
     * Get OCG order structure (for UI hierarchy)
     */
    getOCGOrder() {
        try {
            if (!this.lib._FPDF_GetOCGOrder) {
                return [];
            }
            // First call to get the required buffer size
            const bufferSize = this.lib._FPDF_GetOCGOrder(this.documentPtr, 0, 0);
            if (bufferSize <= 0) {
                return [];
            }
            // Allocate buffer and get the order data
            const buffer = this.lib.wasmExports.malloc(bufferSize);
            try {
                this.lib._FPDF_GetOCGOrder(this.documentPtr, buffer, bufferSize);
                // Parse the order data (this would need custom parsing logic based on PDFium's format)
                return this.parseOCGOrderData(buffer, bufferSize);
            }
            finally {
                this.lib.wasmExports.free(buffer);
            }
        }
        catch (error) {
            console.warn("OCG order API not available in this PDFium build:", error);
            return [];
        }
    }
    /**
     * Get radio button groups (mutually exclusive OCG groups)
     */
    getRadioButtonGroups() {
        try {
            if (!this.lib._FPDF_GetOCGRadioButtonGroups) {
                return [];
            }
            // First call to get the required buffer size
            const bufferSize = this.lib._FPDF_GetOCGRadioButtonGroups(this.documentPtr, 0, 0);
            if (bufferSize <= 0) {
                return [];
            }
            // Allocate buffer and get the radio button group data
            const buffer = this.lib.wasmExports.malloc(bufferSize);
            try {
                this.lib._FPDF_GetOCGRadioButtonGroups(this.documentPtr, buffer, bufferSize);
                // Parse the radio button group data
                return this.parseRadioButtonGroupData(buffer, bufferSize);
            }
            finally {
                this.lib.wasmExports.free(buffer);
            }
        }
        catch (error) {
            console.warn("OCG radio button groups API not available in this PDFium build:", error);
            return [];
        }
    }
    /**
     * Create an OCG context for specific usage
     */
    createContext(usage = FPDF_OCG_USAGE_VIEW) {
        return new OCGContext(this.lib, this.documentPtr, usage);
    }
    /**
     * Set multiple OCG states at once
     */
    setMultipleOCGStates(states) {
        for (const [ocg, state] of states) {
            this.setOCGState(ocg, state);
        }
    }
    /**
     * Turn on all OCGs
     */
    showAllLayers() {
        const count = this.getOCGCount();
        for (let i = 0; i < count; i++) {
            const ocg = this.getOCG(i);
            if (ocg) {
                this.setOCGState(ocg, FPDF_OCG_STATE_ON);
            }
        }
    }
    /**
     * Turn off all OCGs
     */
    hideAllLayers() {
        const count = this.getOCGCount();
        for (let i = 0; i < count; i++) {
            const ocg = this.getOCG(i);
            if (ocg) {
                this.setOCGState(ocg, FPDF_OCG_STATE_OFF);
            }
        }
    }
    /**
     * Reset all OCGs to their default states
     */
    resetToDefaultStates() {
        const count = this.getOCGCount();
        for (let i = 0; i < count; i++) {
            const ocg = this.getOCG(i);
            if (ocg) {
                const defaultState = this.isOCGInDefaultConfig(ocg) ? FPDF_OCG_STATE_ON : FPDF_OCG_STATE_OFF;
                this.setOCGState(ocg, defaultState);
            }
        }
    }
    /**
     * Find OCGs by name (partial match)
     */
    findOCGsByName(namePattern) {
        const allOCGs = this.getAllOCGs();
        const pattern = namePattern.toLowerCase();
        return allOCGs.filter((ocg) => ocg.name.toLowerCase().includes(pattern));
    }
    /**
     * Find OCGs by intent
     */
    findOCGsByIntent(intent) {
        const allOCGs = this.getAllOCGs();
        return allOCGs.filter((ocg) => ocg.intent.includes(intent));
    }
    parseOCGOrderData(buffer, bufferSize) {
        // This is a simplified parser - the actual implementation would need to
        // parse the specific format returned by PDFium for OCG order data
        // For now, return an empty array as this would require detailed knowledge
        // of PDFium's internal data format
        return [];
    }
    parseRadioButtonGroupData(buffer, bufferSize) {
        // This is a simplified parser - the actual implementation would need to
        // parse the specific format returned by PDFium for radio button group data
        // For now, return an empty array as this would require detailed knowledge
        // of PDFium's internal data format
        return [];
    }
}
/**
 * Utility function to get OCG usage type name
 */
function getOCGUsageName(usage) {
    switch (usage) {
        case FPDF_OCG_USAGE_VIEW:
            return "View";
        case FPDF_OCG_USAGE_DESIGN:
            return "Design";
        case FPDF_OCG_USAGE_PRINT:
            return "Print";
        case FPDF_OCG_USAGE_EXPORT:
            return "Export";
        default:
            return "Unknown";
    }
}
/**
 * Utility function to get OCG state name
 */
function getOCGStateName(state) {
    switch (state) {
        case FPDF_OCG_STATE_ON:
            return "On";
        case FPDF_OCG_STATE_OFF:
            return "Off";
        case FPDF_OCG_STATE_UNCHANGED:
            return "Unchanged";
        default:
            return "Unknown";
    }
}

function convertBitmapToImage(options) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (options.render) {
            case "bitmap":
                return options.data;
            default:
                return yield options.render(options);
        }
    });
}
function readUInt16LE(buffer, offset = 0) {
    return buffer[offset] | (buffer[offset + 1] << 8);
}

class PDFiumObjectBase {
    constructor(options) {
        this.module = options.module;
        this.objectIdx = options.objectIdx;
        this.documentIdx = options.documentIdx;
        this.pageIdx = options.pageIdx;
    }
    static create(options) {
        const type = options.module._FPDFPageObj_GetType(options.objectIdx);
        switch (type) {
            case FPDFPageObjectType.TEXT:
                return new PDFiumTextObject(options);
            case FPDFPageObjectType.PATH:
                return new PDFiumPathObject(options);
            case FPDFPageObjectType.IMAGE:
                return new PDFiumImageObject(options);
            case FPDFPageObjectType.SHADING:
                return new PDFiumShadingObject(options);
            case FPDFPageObjectType.FORM:
                return new PDFiumFormObject(options);
            default:
                throw new Error(`Unknown object type: ${type}`);
        }
    }
}
class PDFiumTextObject extends PDFiumObjectBase {
    constructor() {
        super(...arguments);
        this.type = "text";
    }
}
class PDFiumPathObject extends PDFiumObjectBase {
    constructor() {
        super(...arguments);
        this.type = "path";
    }
    /**
     * Convert numeric segment type to string representation
     */
    segmentTypeToString(type) {
        switch (type) {
            case FPDFPathSegmentType.LINETO:
                return "lineto";
            case FPDFPathSegmentType.BEZIERTO:
                return "bezierto";
            case FPDFPathSegmentType.MOVETO:
                return "moveto";
            default:
                return "unknown";
        }
    }
    /**
     * Get the number of segments in this path object
     */
    getSegmentCount() {
        return this.module._FPDFPath_CountSegments(this.objectIdx);
    }
    /**
     * Get a specific path segment by index
     */
    getSegment(index) {
        const segmentCount = this.getSegmentCount();
        if (index < 0 || index >= segmentCount) {
            return null;
        }
        const segmentIdx = this.module._FPDFPath_GetPathSegment(this.objectIdx, index);
        if (!segmentIdx) {
            return null;
        }
        // Allocate memory for x and y coordinates (2 floats = 8 bytes)
        const coordPtr = this.module.wasmExports.malloc(8);
        const xPtr = coordPtr;
        const yPtr = coordPtr + 4;
        // Get the point coordinates
        const success = this.module._FPDFPathSegment_GetPoint(segmentIdx, xPtr, yPtr);
        if (!success) {
            this.module.wasmExports.free(coordPtr);
            return null;
        }
        // Read the float values from memory
        const xBuffer = this.module.HEAPU8.slice(xPtr, xPtr + 4);
        const yBuffer = this.module.HEAPU8.slice(yPtr, yPtr + 4);
        this.module.wasmExports.free(coordPtr);
        // Convert bytes to float32
        const x = new Float32Array(xBuffer.buffer.slice(xBuffer.byteOffset, xBuffer.byteOffset + 4))[0];
        const y = new Float32Array(yBuffer.buffer.slice(yBuffer.byteOffset, yBuffer.byteOffset + 4))[0];
        // Get segment type
        const type = this.module._FPDFPathSegment_GetType(segmentIdx);
        // Check if segment closes the subpath
        const close = this.module._FPDFPathSegment_GetClose(segmentIdx) !== 0;
        return {
            type: this.segmentTypeToString(type),
            x,
            y,
            close,
        };
    }
    /**
     * Get all path segments for this path object
     */
    getPathData() {
        const segmentCount = this.getSegmentCount();
        const segments = [];
        for (let i = 0; i < segmentCount; i++) {
            const segment = this.getSegment(i);
            if (segment) {
                segments.push(segment);
            }
        }
        return { segments };
    }
}
class PDFiumImageObject extends PDFiumObjectBase {
    constructor() {
        super(...arguments);
        this.type = "image";
    }
    static formatToBPP(format) {
        switch (format) {
            case FPDFBitmap.Gray:
                return 1;
            case FPDFBitmap.BGR:
                return 3;
            case FPDFBitmap.BGRx:
            case FPDFBitmap.BGRA:
                return 4;
            default:
                throw new Error(`Unsupported bitmap format: ${format}`);
        }
    }
    /**
     * Return the raw uncompressed image data.
     */
    getImageDataRaw() {
        return __awaiter(this, void 0, void 0, function* () {
            const bufferSize = this.module._FPDFImageObj_GetImageDataRaw(this.objectIdx, 0, 0);
            if (!bufferSize) {
                throw new Error("Failed to get bitmap from image object.");
            }
            const bufferPtr = this.module.wasmExports.malloc(bufferSize);
            if (!this.module._FPDFImageObj_GetImageDataRaw(this.objectIdx, bufferPtr, bufferSize)) {
                throw new Error("Failed to get bitmap buffer.");
            }
            const oData = this.module.HEAPU8.slice(bufferPtr, bufferPtr + bufferSize);
            this.module.wasmExports.free(bufferPtr);
            // Width and height of the image in pixels will be written to these pointers as 16-bit integers (2 bytes each):
            // [ ... width (2 bytes) ... | ... height (2 bytes) ... ]
            const sizePtr = this.module.wasmExports.malloc(2 + 2);
            const widthPtr = sizePtr;
            const heightPtr = sizePtr + 2;
            if (!this.module._FPDFImageObj_GetImagePixelSize(this.objectIdx, widthPtr, heightPtr)) {
                throw new Error("Failed to get image size.");
            }
            const widthBuffer = this.module.HEAPU8.slice(widthPtr, widthPtr + 2);
            const heightBuffer = this.module.HEAPU8.slice(heightPtr, heightPtr + 2);
            this.module.wasmExports.free(sizePtr);
            const width = readUInt16LE(widthBuffer);
            const height = readUInt16LE(heightBuffer);
            const filtersCount = this.module._FPDFImageObj_GetImageFilterCount(this.objectIdx);
            const filters = [];
            for (let i = 0; i < filtersCount; i++) {
                const filterSize = this.module._FPDFImageObj_GetImageFilter(this.objectIdx, i, 0, 0);
                const filterPtr = this.module.wasmExports.malloc(filterSize);
                if (!this.module._FPDFImageObj_GetImageFilter(this.objectIdx, i, filterPtr, filterSize)) {
                    throw new Error("Failed to get image filter.");
                }
                const filterBuffer = this.module.HEAPU8.slice(filterPtr, filterPtr + filterSize - 1);
                const filter = new TextDecoder().decode(filterBuffer).trim();
                this.module.wasmExports.free(filterPtr);
                filters.push(filter);
            }
            return {
                width: width,
                height: height,
                data: oData,
                filters: filters,
            };
        });
    }
    /**
     * Render the image object to a buffer with the specified render function.
     */
    render() {
        return __awaiter(this, arguments, void 0, function* (options = {
            render: "bitmap",
        }) {
            const bitmapIdx = this.module._FPDFImageObj_GetBitmap(this.objectIdx);
            if (!bitmapIdx) {
                throw new Error("Failed to get bitmap from image object.");
            }
            const bufferPtr = this.module._FPDFBitmap_GetBuffer(bitmapIdx);
            if (!bufferPtr) {
                throw new Error("Failed to get bitmap buffer.");
            }
            // Stride is the number of bytes per row, it might be larger than width * bytesPerPixel
            // and is used for alignment in the bitmap buffer (e.g. 4-byte alignment)
            const stride = this.module._FPDFBitmap_GetStride(bitmapIdx);
            // Width and height of the image in pixels
            const width = this.module._FPDFBitmap_GetWidth(bitmapIdx);
            const height = this.module._FPDFBitmap_GetHeight(bitmapIdx);
            // Format of the image: 1 - Gray, 2 - BGR, 3 - BGRx, 4 - BGRA
            const format = this.module._FPDFBitmap_GetFormat(bitmapIdx);
            // Here is BBP (bytes per pixel) for the original image
            const oBPP = PDFiumImageObject.formatToBPP(format);
            // Calculate the buffer size of the original image, stored in the WASM heap
            const bufferSize = height * stride;
            // Get the buffer from the WASM heap to a JS Uint8Array
            const oData = this.module.HEAPU8.slice(bufferPtr, bufferPtr + bufferSize);
            this.module.wasmExports.free(bufferPtr);
            // Currently we only support converting to RGBA (4 bytes per pixel)
            const tBPP = BYTES_PER_PIXEL;
            // Create a new buffer for the target image and fill it with white color
            const tData = new Uint8Array(width * height * tBPP);
            // Fill the buffer with transparent white color
            tData.fill(255);
            // Iterate over the rows of the original and target images
            for (let rowIndex = 0; rowIndex < height; rowIndex++) {
                const tRowStart = rowIndex * tBPP * width;
                const oRowStart = rowIndex * stride;
                // Iterate over the columns of the original and target images
                for (let columnIndex = 0; columnIndex < width; columnIndex++) {
                    const tPixelStart = tRowStart + columnIndex * tBPP;
                    const oPixelStart = oRowStart + columnIndex * oBPP;
                    // conver from original format to RGBA
                    // =================
                    switch (format) {
                        case FPDFBitmap.Gray: {
                            // Grayscale: Copy the gray value to R, G, B, and set A to 255
                            const gray = oData[oPixelStart];
                            tData[tPixelStart + 0] = gray; // R
                            tData[tPixelStart + 1] = gray; // G
                            tData[tPixelStart + 2] = gray; // B
                            // A is already set to 255 by Buffer.alloc
                            break;
                        }
                        case FPDFBitmap.BGR: {
                            // BGR: Copy the values to RGB and set A to 255
                            tData[tPixelStart + 0] = oData[oPixelStart + 2]; // R
                            tData[tPixelStart + 1] = oData[oPixelStart + 1]; // G
                            tData[tPixelStart + 2] = oData[oPixelStart + 0]; // B
                            // A is already set to 255 by Buffer.alloc
                            break;
                        }
                        case FPDFBitmap.BGRx: {
                            // BGRx: Copy the values to RGB and set A to 255
                            tData[tPixelStart + 0] = oData[oPixelStart + 2]; // R
                            tData[tPixelStart + 1] = oData[oPixelStart + 1]; // G
                            tData[tPixelStart + 2] = oData[oPixelStart + 0]; // B
                            // A is already set to 255 by Buffer.alloc
                            break;
                        }
                        case FPDFBitmap.BGRA: {
                            // BGRA: Copy directly
                            tData[tPixelStart + 0] = oData[oPixelStart + 2]; // R
                            tData[tPixelStart + 1] = oData[oPixelStart + 1]; // G
                            tData[tPixelStart + 2] = oData[oPixelStart + 0]; // B
                            tData[tPixelStart + 3] = oData[oPixelStart + 3]; // A
                            break;
                        }
                        default:
                            throw new Error(`Unsupported bitmap format: ${format}`);
                    }
                    // switch case end
                    // =================
                }
            }
            const image = yield convertBitmapToImage({
                render: options.render,
                width: width,
                height: height,
                data: tData,
            });
            return {
                width: width,
                height: height,
                data: image,
            };
        });
    }
}
class PDFiumShadingObject extends PDFiumObjectBase {
    constructor() {
        super(...arguments);
        this.type = "shading";
    }
}
class PDFiumFormObject extends PDFiumObjectBase {
    constructor() {
        super(...arguments);
        this.type = "form";
    }
}

/**
 * Pause structure for progressive rendering
 * This is used to control the rendering process and allow interruption
 */
class PDFiumProgressivePause {
    constructor(pauseCallback) {
        this.shouldPause = false;
        this.pauseCallback = pauseCallback;
    }
    /**
     * Sets whether the rendering should pause at the next opportunity
     */
    setPause(shouldPause) {
        this.shouldPause = shouldPause;
    }
    /**
     * Called by PDFium to check if rendering should pause
     * Returns 1 if rendering should pause, 0 to continue
     */
    checkPause() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.shouldPause) {
                return 1; // Pause
            }
            if (this.pauseCallback) {
                try {
                    const result = yield this.pauseCallback();
                    return result ? 1 : 0;
                }
                catch (error) {
                    console.warn("Progressive rendering pause callback error:", error);
                    return 0; // Continue on error
                }
            }
            return 0; // Continue
        });
    }
}
/**
 * Progressive renderer for PDFium pages
 * Allows rendering large PDF pages incrementally to avoid memory issues and provide progress feedback
 */
class PDFiumProgressiveRenderer {
    constructor(module, pageIdx, originalWidth, originalHeight) {
        this.module = module;
        this.pageIdx = pageIdx;
        this.originalWidth = originalWidth;
        this.originalHeight = originalHeight;
    }
    /**
     * Render a page progressively with the given options
     */
    render() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            // Calculate dimensions
            let width;
            let height;
            if (options.scale !== undefined) {
                width = Math.floor(this.originalWidth * options.scale);
                height = Math.floor(this.originalHeight * options.scale);
            }
            else if (options.width !== undefined && options.height !== undefined) {
                width = options.width;
                height = options.height;
            }
            else {
                const scale = options.scale || 1;
                width = Math.floor(this.originalWidth * scale);
                height = Math.floor(this.originalHeight * scale);
            }
            const buffSize = width * height * BYTES_PER_PIXEL;
            const flags = options.flags || (FPDFRenderFlag.REVERSE_BYTE_ORDER | FPDFRenderFlag.ANNOT | FPDFRenderFlag.LCD_TEXT);
            const rotate = options.rotate || 0;
            const render = options.render || "bitmap";
            // Allocate memory for the bitmap
            const ptr = this.module.wasmExports.malloc(buffSize);
            this.module.HEAPU8.fill(0, ptr, ptr + buffSize);
            let bitmap = null;
            let steps = 0;
            let wasInterrupted = false;
            try {
                // Create bitmap
                bitmap = this.module._FPDFBitmap_CreateEx(width, height, FPDFBitmap.BGRA, ptr, width * BYTES_PER_PIXEL);
                // Fill with white background
                this.module._FPDFBitmap_FillRect(bitmap, 0, // left
                0, // top
                width, // width
                height, // height
                0xffffffff);
                // Set up pause structure if progress callback is provided
                if (options.onProgress) {
                    this.pauseInstance = new PDFiumProgressivePause();
                    this.pausePtr = this.createPauseStructure();
                }
                // Start progressive rendering
                let status = this.module._FPDF_RenderPageBitmap_Start(bitmap, this.pageIdx, 0, // start_x
                0, // start_y
                width, // size_x
                height, // size_y
                rotate, flags, this.pausePtr || 0);
                steps++;
                // Continue rendering until complete or failed
                while (status === FPDFProgressiveStatus.RENDER_TOBECONTINUED) {
                    if (options.onProgress) {
                        const progress = {
                            status,
                            isComplete: false,
                            isFailed: false,
                            step: steps,
                            bitmap,
                        };
                        try {
                            const shouldContinue = yield options.onProgress(progress);
                            if (!shouldContinue) {
                                wasInterrupted = true;
                                break;
                            }
                        }
                        catch (error) {
                            console.warn("Progressive rendering progress callback error:", error);
                            // Continue rendering on callback error
                        }
                    }
                    // Pause between rendering steps if specified
                    if (options.pauseInterval && options.pauseInterval > 0) {
                        yield this.sleep(options.pauseInterval);
                    }
                    status = this.module._FPDF_RenderPageBitmap_Continue(bitmap, this.pausePtr || 0);
                    steps++;
                }
                // Handle final status
                const isComplete = status === FPDFProgressiveStatus.RENDER_DONE;
                const isFailed = status === FPDFProgressiveStatus.RENDER_FAILED;
                if (options.onProgress && !wasInterrupted) {
                    const finalProgress = {
                        status,
                        isComplete,
                        isFailed,
                        step: steps,
                        bitmap,
                    };
                    try {
                        yield options.onProgress(finalProgress);
                    }
                    catch (error) {
                        console.warn("Progressive rendering final progress callback error:", error);
                    }
                }
                if (isFailed && !wasInterrupted) {
                    throw new Error("Progressive rendering failed");
                }
                // Extract bitmap data
                const data = this.module.HEAPU8.slice(ptr, ptr + buffSize);
                // Convert bitmap to final image format
                const image = yield convertBitmapToImage({
                    render,
                    width,
                    height,
                    data,
                });
                return {
                    width,
                    height,
                    originalWidth: this.originalWidth,
                    originalHeight: this.originalHeight,
                    data: image,
                    steps,
                    wasInterrupted,
                };
            }
            finally {
                // Clean up resources
                if (bitmap) {
                    this.module._FPDF_RenderPageBitmap_Close(bitmap);
                    this.module._FPDFBitmap_Destroy(bitmap);
                }
                if (this.pausePtr) {
                    this.module.wasmExports.free(this.pausePtr);
                    this.pausePtr = undefined;
                }
                this.module.wasmExports.free(ptr);
                this.pauseInstance = undefined;
            }
        });
    }
    /**
     * Create a pause structure in WASM memory
     * This structure is used by PDFium to check if rendering should pause
     */
    createPauseStructure() {
        // Allocate memory for pause structure (typically 8 bytes for function pointer + user data)
        const pausePtr = this.module.wasmExports.malloc(8);
        // For now, we'll use a simple approach where the pause structure is just a placeholder
        // In a full implementation, you'd need to set up proper function pointers
        // that PDFium can call to check if rendering should pause
        this.module.HEAP32[pausePtr / 4] = 0; // Function pointer (placeholder)
        this.module.HEAP32[pausePtr / 4 + 1] = 0; // User data pointer
        return pausePtr;
    }
    /**
     * Sleep for the specified number of milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Request rendering to pause at the next opportunity
     */
    requestPause() {
        if (this.pauseInstance) {
            this.pauseInstance.setPause(true);
        }
    }
    /**
     * Resume rendering after a pause
     */
    resume() {
        if (this.pauseInstance) {
            this.pauseInstance.setPause(false);
        }
    }
}

class PDFiumPage {
    constructor(options) {
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
    getText() {
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
            }
            finally {
                this.module.wasmExports.free(textPtr);
            }
        }
        finally {
            this.module._FPDFText_ClosePage(textPage);
        }
    }
    /**
     * Extract enhanced text with position, font, and other properties
     */
    getEnhancedText() {
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
            const characters = [];
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
        }
        finally {
            this.module._FPDFText_ClosePage(textPage);
        }
    }
    /**
     * Get the page label/title for this page
     */
    getLabel() {
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
            const buffer = new Uint8Array(this.module.HEAPU8.buffer, bufferPtr, actualSize - 2);
            const label = new TextDecoder("utf-16le").decode(buffer);
            return {
                label: label,
                hasLabel: true,
            };
        }
        finally {
            this.module.wasmExports.free(bufferPtr);
        }
    }
    /**
     * Get detailed information for a specific character
     */
    getCharacterInfo(textPage, index) {
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
        }
        finally {
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
        }
        finally {
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
                }
                finally {
                    this.module.wasmExports.free(namePtr);
                }
            }
        }
        finally {
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
        }
        finally {
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
    render() {
        return __awaiter(this, arguments, void 0, function* (options = {
            scale: 1,
            render: "bitmap",
        }) {
            const { width: originalWidth, height: originalHeight } = this.getSize();
            // You can specify either the scale or the width and height.
            let width;
            let height;
            if ("scale" in options) {
                width = Math.floor(originalWidth * options.scale);
                height = Math.floor(originalHeight * options.scale);
            }
            else {
                width = options.width;
                height = options.height;
            }
            const buffSize = width * height * BYTES_PER_PIXEL;
            // Allocate a block of memory for the bitmap and fill it with zeros.
            const ptr = this.module.wasmExports.malloc(buffSize);
            this.module.HEAPU8.fill(0, ptr, ptr + buffSize);
            const bitmap = this.module._FPDFBitmap_CreateEx(width, height, FPDFBitmap.BGRA, ptr, width * BYTES_PER_PIXEL);
            this.module._FPDFBitmap_FillRect(bitmap, 0, // left
            0, // top
            width, // width
            height, // height
            0xffffffff);
            this.module._FPDF_RenderPageBitmap(bitmap, this.pageIdx, 0, // start_x
            0, // start_y
            width, // size_x
            height, // size_y
            0, // rotate (0, normal)
            FPDFRenderFlag.REVERSE_BYTE_ORDER | FPDFRenderFlag.ANNOT | FPDFRenderFlag.LCD_TEXT);
            this.module._FPDFBitmap_Destroy(bitmap);
            this.module._FPDF_ClosePage(this.pageIdx);
            const data = this.module.HEAPU8.slice(ptr, ptr + buffSize);
            this.module.wasmExports.free(ptr);
            const image = yield this.convertBitmapToImage({
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
        });
    }
    convertBitmapToImage(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield convertBitmapToImage(options);
        });
    }
    getObjectCount() {
        return this.module._FPDFPage_CountObjects(this.pageIdx);
    }
    getObject(i) {
        const object = this.module._FPDFPage_GetObject(this.pageIdx, i);
        return PDFiumObjectBase.create({
            module: this.module,
            objectIdx: object,
            documentIdx: this.documentIdx,
            pageIdx: this.pageIdx,
        });
    }
    *objects() {
        const objectsCount = this.getObjectCount();
        for (let i = 0; i < objectsCount; i++) {
            yield this.getObject(i);
        }
    }
    /**
     * Get the number of OCGs (Optional Content Groups) on this page
     */
    getPageOCGCount() {
        try {
            return this.module._FPDF_GetPageOCGCount ? this.module._FPDF_GetPageOCGCount(this.pageIdx) : 0;
        }
        catch (error) {
            console.warn("Page OCG API not available in this PDFium build:", error);
            return 0;
        }
    }
    /**
     * Get an OCG handle from this page by index
     */
    getPageOCG(index) {
        return this.module._FPDF_GetPageOCG(this.pageIdx, index);
    }
    /**
     * Render the page progressively with incremental updates
     * This is useful for large pages or when you need progress feedback
     */
    renderProgressive() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            const { width: originalWidth, height: originalHeight } = this.getSize();
            const renderer = new PDFiumProgressiveRenderer(this.module, this.pageIdx, originalWidth, originalHeight);
            return yield renderer.render(options);
        });
    }
    /**
     * Create a progressive renderer instance for this page
     * Allows for more control over the progressive rendering process
     */
    createProgressiveRenderer() {
        const { width: originalWidth, height: originalHeight } = this.getSize();
        return new PDFiumProgressiveRenderer(this.module, this.pageIdx, originalWidth, originalHeight);
    }
}

class PDFiumDocument {
    constructor(options) {
        this.module = options.module;
        this.documentPtr = options.documentPtr;
        this.documentIdx = options.documentIdx;
    }
    /**
     * Get a page from the document by its index. The index is zero-based.
     */
    getPage(pageIndex) {
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
    *pages() {
        const pageCount = this.getPageCount();
        for (let i = 0; i < pageCount; i++) {
            yield this.getPage(i);
        }
    }
    /**
     * Get the number of pages in the document.
     */
    getPageCount() {
        return this.module._FPDF_GetPageCount(this.documentIdx);
    }
    /**
     * Get the OCG (Optional Content Groups) manager for this document.
     * OCGs allow you to control the visibility of layers in PDF documents.
     */
    getOCGManager() {
        if (!this._ocgManager) {
            this._ocgManager = new OCGManager(this.module, this.documentIdx);
        }
        return this._ocgManager;
    }
    /**
     * Check if the document has any OCGs (layers)
     */
    hasOCGs() {
        return this.getOCGManager().getOCGCount() > 0;
    }
    /**
     * Get metadata for a specific tag from the document.
     * @param tag The metadata tag name to retrieve
     * @returns The metadata value as a string, or undefined if not found
     */
    getMetadataTag(tag) {
        // Convert the tag string to a C string pointer
        const tagCString = this.stringToCString(tag);
        try {
            // First call to get the required buffer length
            const requiredLength = this.module._FPDF_GetMetaText(this.documentIdx, tagCString, 0, // null buffer to get length
            0);
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
            }
            finally {
                this.module.wasmExports.free(bufferPtr);
            }
        }
        finally {
            this.module.wasmExports.free(tagCString);
        }
    }
    /**
     * Get all available metadata from the document.
     * @returns An object containing all available metadata fields
     */
    getMetadata() {
        const metadata = {};
        // Extract each metadata field
        const title = this.getMetadataTag(FPDFMetadataTag.TITLE);
        if (title)
            metadata.title = title;
        const author = this.getMetadataTag(FPDFMetadataTag.AUTHOR);
        if (author)
            metadata.author = author;
        const subject = this.getMetadataTag(FPDFMetadataTag.SUBJECT);
        if (subject)
            metadata.subject = subject;
        const keywords = this.getMetadataTag(FPDFMetadataTag.KEYWORDS);
        if (keywords)
            metadata.keywords = keywords;
        const creator = this.getMetadataTag(FPDFMetadataTag.CREATOR);
        if (creator)
            metadata.creator = creator;
        const producer = this.getMetadataTag(FPDFMetadataTag.PRODUCER);
        if (producer)
            metadata.producer = producer;
        const creationDate = this.getMetadataTag(FPDFMetadataTag.CREATION_DATE);
        if (creationDate)
            metadata.creationDate = creationDate;
        const modifiedDate = this.getMetadataTag(FPDFMetadataTag.MODIFIED_DATE);
        if (modifiedDate)
            metadata.modifiedDate = modifiedDate;
        return metadata;
    }
    /**
     * Helper method to convert a JavaScript string to a C string pointer.
     * @param str The string to convert
     * @returns Pointer to the C string in WASM memory
     */
    stringToCString(str) {
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
    destroy() {
        this.module._FPDF_CloseDocument(this.documentIdx);
        this.module.wasmExports.free(this.documentPtr);
    }
}

/**
 * From Emscripten project
 */
/**
 * Returns the number of bytes the given Javascript string takes if encoded as a
 * UTF8 byte array, EXCLUDING the null terminator byte.
 *
 * @param {string} str - JavaScript string to operator on
 * @return {number} Length, in bytes, of the UTF8 encoded string.
 */
function lengthBytesUTF8(str) {
    let len = 0;
    for (let i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        const c = str.charCodeAt(i); // possibly a lead surrogate
        if (c <= 0x7f) {
            len++;
        }
        else if (c <= 0x7ff) {
            len += 2;
        }
        else if (c >= 0xd800 && c <= 0xdfff) {
            len += 4;
            ++i;
        }
        else {
            len += 3;
        }
    }
    return len;
}
/**
 * Copies the given Javascript String object 'str' to the given byte array at
 * address 'outIdx', encoded in UTF8 form and null-terminated. The copy will
 * require at most str.length*4+1 bytes of space in the HEAP.  Use the function
 * lengthBytesUTF8 to compute the exact number of bytes (excluding null
 * terminator) that this function will write.
 *
 * @param {string} str - The Javascript string to copy.
 * @param {ArrayBufferView|Array<number>} heap - The array to copy to. Each
 *                                               index in this array is assumed
 *                                               to be one 8-byte element.
 * @param {number} outIdx - The starting offset in the array to begin the copying.
 * @param {number} maxBytesToWrite - The maximum number of bytes this function
 *                                   can write to the array.  This count should
 *                                   include the null terminator, i.e. if
 *                                   maxBytesToWrite=1, only the null terminator
 *                                   will be written and nothing else.
 *                                   maxBytesToWrite=0 does not write any bytes
 *                                   to the output, not even the null
 *                                   terminator.
 * @return {number} The number of bytes written, EXCLUDING the null terminator.
 */
function stringToUTF8(str, heap, outIdx, maxBytesToWrite) {
    outIdx >>>= 0;
    // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
    // undefined and false each don't write out any bytes.
    if (!(maxBytesToWrite > 0))
        return 0;
    const startIdx = outIdx;
    const endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
    for (let i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
        // and https://www.ietf.org/rfc/rfc2279.txt
        // and https://tools.ietf.org/html/rfc3629
        let u = str.charCodeAt(i); // possibly a lead surrogate
        if (u >= 0xd800 && u <= 0xdfff) {
            const u1 = str.charCodeAt(++i);
            u = (0x10000 + ((u & 0x3ff) << 10)) | (u1 & 0x3ff);
        }
        if (u <= 0x7f) {
            if (outIdx >= endIdx)
                break;
            heap[outIdx++] = u;
        }
        else if (u <= 0x7ff) {
            if (outIdx + 1 >= endIdx)
                break;
            heap[outIdx++] = 0xc0 | (u >> 6);
            heap[outIdx++] = 0x80 | (u & 63);
        }
        else if (u <= 0xffff) {
            if (outIdx + 2 >= endIdx)
                break;
            heap[outIdx++] = 0xe0 | (u >> 12);
            heap[outIdx++] = 0x80 | ((u >> 6) & 63);
            heap[outIdx++] = 0x80 | (u & 63);
        }
        else {
            if (outIdx + 3 >= endIdx)
                break;
            heap[outIdx++] = 0xf0 | (u >> 18);
            heap[outIdx++] = 0x80 | ((u >> 12) & 63);
            heap[outIdx++] = 0x80 | ((u >> 6) & 63);
            heap[outIdx++] = 0x80 | (u & 63);
        }
    }
    // Null-terminate the pointer to the buffer.
    heap[outIdx] = 0;
    return outIdx - startIdx;
}

const NO_OPTION_WARNING = "@hyzyla/pdfium: wasmUrl, wasmBinary is required for browser environment. \n\n" +
    "Please provide the wasm binary or URL to the init method. You can also use '@hyzyla/pdfium/browser/cdn'" +
    "or '@hyzyla/pdfium/browser/base64' for quick setup, but it's not recommended for production use.";
/**
 * Converts a JavaScript string to a null-terminated C string and returns
 * a pointer to the allocated memory.
 *
 * Remeber to free the allocated memory using the `free` function after
 * you're done with the string.
 */
function stringToCString(module, str) {
    // Get the length of the UTF-8 string including the null terminator
    const length = lengthBytesUTF8(str) + 1;
    // Allocate memory for the string
    const passwordPtr = module.wasmExports.malloc(length);
    // Copy the string to the allocated memory
    stringToUTF8(str, module.HEAPU8, passwordPtr, length);
    return passwordPtr;
}
let PDFiumLibrary$1 = class PDFiumLibrary {
    static initBase(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { wasmUrl, wasmBinary, instantiateWasm } = options || {};
            const loadOptions = {};
            if (wasmUrl) {
                loadOptions.locateFile = (path) => wasmUrl;
            }
            else if (wasmBinary) {
                loadOptions.wasmBinary = wasmBinary;
            }
            else if (instantiateWasm) {
                loadOptions.instantiateWasm = instantiateWasm;
            }
            else {
                // Node.js will use wasm binary from node_modules, but for browser environment,
                // user must provide the wasm binary or URL
                if (typeof window !== "undefined") {
                    console.error(NO_OPTION_WARNING);
                    throw new Error(NO_OPTION_WARNING);
                }
            }
            const module = yield options.vendor(loadOptions);
            module._FPDF_InitLibraryWithConfig({
                version: 2,
                m_pIsolate: null,
                m_pUserFontPaths: null,
                m_v8EmbedderSlot: 0,
                m_pPlatform: null,
            });
            return new PDFiumLibrary(module);
        });
    }
    constructor(module) {
        this.module = module;
    }
    loadDocument(buff_1) {
        return __awaiter(this, arguments, void 0, function* (buff, password = "") {
            const size = buff.length;
            // This line allocates a block of memory of size bytes and returns a pointer to the first byte of the block.
            //  The malloc function is a standard C library function for memory allocation, and here it's exposed via
            // this.module.asm, which likely represents the compiled WebAssembly module. The returned pointer (ptr) is
            // an integer value representing the memory location within the WebAssembly module's memory space.
            const documentPtr = this.module.wasmExports.malloc(size);
            // This line copies the content of buff into the WebAssembly module's memory starting at the address specified by ptr.
            // Here HEAPU8 is a typed array that serves as a view into the WebAssembly memory, allowing JavaScript code to read
            // and write bytes directly. The set method is used to copy the contents of an array (buff in this case) into HEAPU8
            // starting at the index ptr.
            this.module.HEAPU8.set(buff, documentPtr);
            // This line converts the password string to a null-terminated C string and returns a pointer
            // to the allocated memory. Don't forget to free the allocated memory using the free function after you're
            // done with the string.
            let passwordPtr = 0;
            if (password) {
                passwordPtr = stringToCString(this.module, password);
            }
            // This line reads the PDF document from the memory block starting at documentPtr and of size bytes.
            // If the document is password-protected, the password should be provided as a null-terminated C string.
            // The function returns a document index (handle) that can be used to interact with the document.
            const documentIdx = this.module._FPDF_LoadMemDocument(documentPtr, size, passwordPtr);
            // Handle error if the document could not be loaded
            if (!documentIdx) {
                const lastError = this.module._FPDF_GetLastError();
                // Free the allocated memory for the document and password before throwing
                this.module.wasmExports.free(documentPtr);
                if (passwordPtr !== 0) {
                    this.module.wasmExports.free(passwordPtr);
                }
                switch (lastError) {
                    case FPDFErrorCode.UNKNOWN:
                        throw new Error("Unknown error");
                    case FPDFErrorCode.FILE:
                        throw new Error("File not found or could not be opened");
                    case FPDFErrorCode.FORMAT:
                        throw new Error("File not in PDF format or corrupted");
                    case FPDFErrorCode.PASSWORD:
                        throw new Error("Password required or incorrect password");
                    case FPDFErrorCode.SECURITY:
                        throw new Error("Unsupported security scheme");
                    case FPDFErrorCode.PAGE:
                        throw new Error("Page not found or content error");
                    default:
                        throw new Error(`PDF Loading = ${lastError}`);
                }
            }
            const document = new PDFiumDocument({
                module: this.module,
                documentPtr: documentPtr,
                documentIdx: documentIdx,
            });
            // Free the allocated memory for the password string
            if (passwordPtr !== null) {
                this.module.wasmExports.free(passwordPtr);
            }
            return document;
        });
    }
    destroy() {
        this.module._FPDF_DestroyLibrary();
    }
};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function commonjsRequire(path) {
	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

var pdfium = {exports: {}};

var hasRequiredPdfium;

function requirePdfium () {
	if (hasRequiredPdfium) return pdfium.exports;
	hasRequiredPdfium = 1;
	(function (module, exports) {
		var PDFiumModule = (() => {
		  var _scriptName = typeof document != "undefined" ? document.currentScript?.src : undefined;
		  if (typeof __filename != "undefined") _scriptName ||= __filename;
		  return function (moduleArg = {}) {
		    var moduleRtn;

		    var Module = moduleArg;
		    var readyPromiseResolve, readyPromiseReject;
		    var readyPromise = new Promise((resolve, reject) => {
		      readyPromiseResolve = resolve;
		      readyPromiseReject = reject;
		    });
		    [
		      "_FPDFAnnot_IsSupportedSubtype",
		      "_FPDFPage_CreateAnnot",
		      "_FPDFPage_GetAnnotCount",
		      "_FPDFPage_GetAnnot",
		      "_FPDFPage_GetAnnotIndex",
		      "_FPDFPage_CloseAnnot",
		      "_FPDFPage_RemoveAnnot",
		      "_FPDFAnnot_GetSubtype",
		      "_FPDFAnnot_IsObjectSupportedSubtype",
		      "_FPDFAnnot_UpdateObject",
		      "_FPDFAnnot_AddInkStroke",
		      "_FPDFAnnot_RemoveInkList",
		      "_FPDFAnnot_AppendObject",
		      "_FPDFAnnot_GetObjectCount",
		      "_FPDFAnnot_GetObject",
		      "_FPDFAnnot_RemoveObject",
		      "_FPDFAnnot_SetColor",
		      "_FPDFAnnot_GetColor",
		      "_FPDFAnnot_HasAttachmentPoints",
		      "_FPDFAnnot_SetAttachmentPoints",
		      "_FPDFAnnot_AppendAttachmentPoints",
		      "_FPDFAnnot_CountAttachmentPoints",
		      "_FPDFAnnot_GetAttachmentPoints",
		      "_FPDFAnnot_SetRect",
		      "_FPDFAnnot_GetRect",
		      "_FPDFAnnot_GetVertices",
		      "_FPDFAnnot_GetInkListCount",
		      "_FPDFAnnot_GetInkListPath",
		      "_FPDFAnnot_GetLine",
		      "_FPDFAnnot_SetBorder",
		      "_FPDFAnnot_GetBorder",
		      "_FPDFAnnot_GetFormAdditionalActionJavaScript",
		      "_FPDFAnnot_HasKey",
		      "_FPDFAnnot_GetValueType",
		      "_FPDFAnnot_SetStringValue",
		      "_FPDFAnnot_GetStringValue",
		      "_FPDFAnnot_GetNumberValue",
		      "_FPDFAnnot_SetAP",
		      "_FPDFAnnot_GetAP",
		      "_FPDFAnnot_GetLinkedAnnot",
		      "_FPDFAnnot_GetFlags",
		      "_FPDFAnnot_SetFlags",
		      "_FPDFAnnot_GetFormFieldFlags",
		      "_FPDFAnnot_GetFormFieldAtPoint",
		      "_FPDFAnnot_GetFormFieldName",
		      "_FPDFAnnot_GetFormFieldAlternateName",
		      "_FPDFAnnot_GetFormFieldType",
		      "_FPDFAnnot_GetFormFieldValue",
		      "_FPDFAnnot_GetOptionCount",
		      "_FPDFAnnot_GetOptionLabel",
		      "_FPDFAnnot_IsOptionSelected",
		      "_FPDFAnnot_GetFontSize",
		      "_FPDFAnnot_GetFontColor",
		      "_FPDFAnnot_IsChecked",
		      "_FPDFAnnot_SetFocusableSubtypes",
		      "_FPDFAnnot_GetFocusableSubtypesCount",
		      "_FPDFAnnot_GetFocusableSubtypes",
		      "_FPDFAnnot_GetLink",
		      "_FPDFAnnot_GetFormControlCount",
		      "_FPDFAnnot_GetFormControlIndex",
		      "_FPDFAnnot_GetFormFieldExportValue",
		      "_FPDFAnnot_SetURI",
		      "_FPDFAnnot_GetFileAttachment",
		      "_FPDFAnnot_AddFileAttachment",
		      "_FPDFDoc_GetAttachmentCount",
		      "_FPDFDoc_AddAttachment",
		      "_FPDFDoc_GetAttachment",
		      "_FPDFDoc_DeleteAttachment",
		      "_FPDFAttachment_GetName",
		      "_FPDFAttachment_HasKey",
		      "_FPDFAttachment_GetValueType",
		      "_FPDFAttachment_SetStringValue",
		      "_FPDFAttachment_GetStringValue",
		      "_FPDFAttachment_SetFile",
		      "_FPDFAttachment_GetFile",
		      "_FPDFCatalog_IsTagged",
		      "_FPDFCatalog_SetLanguage",
		      "_FPDFAvail_Create",
		      "_FPDFAvail_Destroy",
		      "_FPDFAvail_IsDocAvail",
		      "_FPDFAvail_GetDocument",
		      "_FPDFAvail_GetFirstPageNum",
		      "_FPDFAvail_IsPageAvail",
		      "_FPDFAvail_IsFormAvail",
		      "_FPDFAvail_IsLinearized",
		      "_FPDFBookmark_GetFirstChild",
		      "_FPDFBookmark_GetNextSibling",
		      "_FPDFBookmark_GetTitle",
		      "_FPDFBookmark_GetCount",
		      "_FPDFBookmark_Find",
		      "_FPDFBookmark_GetDest",
		      "_FPDFBookmark_GetAction",
		      "_FPDFAction_GetType",
		      "_FPDFAction_GetDest",
		      "_FPDFAction_GetFilePath",
		      "_FPDFAction_GetURIPath",
		      "_FPDFDest_GetDestPageIndex",
		      "_FPDFDest_GetView",
		      "_FPDFDest_GetLocationInPage",
		      "_FPDFLink_GetLinkAtPoint",
		      "_FPDFLink_GetLinkZOrderAtPoint",
		      "_FPDFLink_GetDest",
		      "_FPDFLink_GetAction",
		      "_FPDFLink_Enumerate",
		      "_FPDFLink_GetAnnot",
		      "_FPDFLink_GetAnnotRect",
		      "_FPDFLink_CountQuadPoints",
		      "_FPDFLink_GetQuadPoints",
		      "_FPDF_GetPageAAction",
		      "_FPDF_GetFileIdentifier",
		      "_FPDF_GetMetaText",
		      "_FPDF_GetPageLabel",
		      "_FPDF_CreateNewDocument",
		      "_FPDFPage_New",
		      "_FPDFPage_Delete",
		      "_FPDF_MovePages",
		      "_FPDFPage_GetRotation",
		      "_FPDFPage_SetRotation",
		      "_FPDFPage_InsertObject",
		      "_FPDFPage_RemoveObject",
		      "_FPDFPage_CountObjects",
		      "_FPDFPage_GetObject",
		      "_FPDFPage_HasTransparency",
		      "_FPDFPage_GenerateContent",
		      "_FPDFPageObj_Destroy",
		      "_FPDFPageObj_HasTransparency",
		      "_FPDFPageObj_GetType",
		      "_FPDFPageObj_Transform",
		      "_FPDFPageObj_TransformF",
		      "_FPDFPageObj_GetMatrix",
		      "_FPDFPageObj_SetMatrix",
		      "_FPDFPage_TransformAnnots",
		      "_FPDFPageObj_NewImageObj",
		      "_FPDFPageObj_GetMarkedContentID",
		      "_FPDFPageObj_CountMarks",
		      "_FPDFPageObj_GetMark",
		      "_FPDFPageObj_AddMark",
		      "_FPDFPageObj_RemoveMark",
		      "_FPDFPageObjMark_GetName",
		      "_FPDFPageObjMark_CountParams",
		      "_FPDFPageObjMark_GetParamKey",
		      "_FPDFPageObjMark_GetParamValueType",
		      "_FPDFPageObjMark_GetParamIntValue",
		      "_FPDFPageObjMark_GetParamStringValue",
		      "_FPDFPageObjMark_GetParamBlobValue",
		      "_FPDFPageObjMark_SetIntParam",
		      "_FPDFPageObjMark_SetStringParam",
		      "_FPDFPageObjMark_SetBlobParam",
		      "_FPDFPageObjMark_RemoveParam",
		      "_FPDFImageObj_LoadJpegFile",
		      "_FPDFImageObj_LoadJpegFileInline",
		      "_FPDFImageObj_SetMatrix",
		      "_FPDFImageObj_SetBitmap",
		      "_FPDFImageObj_GetBitmap",
		      "_FPDFImageObj_GetRenderedBitmap",
		      "_FPDFImageObj_GetImageDataDecoded",
		      "_FPDFImageObj_GetImageDataRaw",
		      "_FPDFImageObj_GetImageFilterCount",
		      "_FPDFImageObj_GetImageFilter",
		      "_FPDFImageObj_GetImageMetadata",
		      "_FPDFImageObj_GetImagePixelSize",
		      "_FPDFPageObj_CreateNewPath",
		      "_FPDFPageObj_CreateNewRect",
		      "_FPDFPageObj_GetBounds",
		      "_FPDFPageObj_GetRotatedBounds",
		      "_FPDFPageObj_SetBlendMode",
		      "_FPDFPageObj_SetStrokeColor",
		      "_FPDFPageObj_GetStrokeColor",
		      "_FPDFPageObj_SetStrokeWidth",
		      "_FPDFPageObj_GetStrokeWidth",
		      "_FPDFPageObj_GetLineJoin",
		      "_FPDFPageObj_SetLineJoin",
		      "_FPDFPageObj_GetLineCap",
		      "_FPDFPageObj_SetLineCap",
		      "_FPDFPageObj_SetFillColor",
		      "_FPDFPageObj_GetFillColor",
		      "_FPDFPageObj_GetDashPhase",
		      "_FPDFPageObj_SetDashPhase",
		      "_FPDFPageObj_GetDashCount",
		      "_FPDFPageObj_GetDashArray",
		      "_FPDFPageObj_SetDashArray",
		      "_FPDFPath_CountSegments",
		      "_FPDFPath_GetPathSegment",
		      "_FPDFPathSegment_GetPoint",
		      "_FPDFPathSegment_GetType",
		      "_FPDFPathSegment_GetClose",
		      "_FPDFPath_MoveTo",
		      "_FPDFPath_LineTo",
		      "_FPDFPath_BezierTo",
		      "_FPDFPath_Close",
		      "_FPDFPath_SetDrawMode",
		      "_FPDFPath_GetDrawMode",
		      "_FPDFPageObj_NewTextObj",
		      "_FPDFText_SetText",
		      "_FPDFText_SetCharcodes",
		      "_FPDFText_LoadFont",
		      "_FPDFText_LoadStandardFont",
		      "_FPDFText_LoadCidType2Font",
		      "_FPDFTextObj_GetFontSize",
		      "_FPDFFont_Close",
		      "_FPDFPageObj_CreateTextObj",
		      "_FPDFTextObj_GetTextRenderMode",
		      "_FPDFTextObj_SetTextRenderMode",
		      "_FPDFTextObj_GetText",
		      "_FPDFTextObj_GetRenderedBitmap",
		      "_FPDFTextObj_GetFont",
		      "_FPDFFont_GetBaseFontName",
		      "_FPDFFont_GetFamilyName",
		      "_FPDFFont_GetFontData",
		      "_FPDFFont_GetIsEmbedded",
		      "_FPDFFont_GetFlags",
		      "_FPDFFont_GetWeight",
		      "_FPDFFont_GetItalicAngle",
		      "_FPDFFont_GetAscent",
		      "_FPDFFont_GetDescent",
		      "_FPDFFont_GetGlyphWidth",
		      "_FPDFFont_GetGlyphPath",
		      "_FPDFGlyphPath_CountGlyphSegments",
		      "_FPDFGlyphPath_GetGlyphPathSegment",
		      "_FPDFFormObj_CountObjects",
		      "_FPDFFormObj_GetObject",
		      "_FSDK_SetUnSpObjProcessHandler",
		      "_FSDK_SetTimeFunction",
		      "_FSDK_SetLocaltimeFunction",
		      "_FPDFDoc_GetPageMode",
		      "_FPDFPage_Flatten",
		      "_FPDFDOC_InitFormFillEnvironment",
		      "_FPDFDOC_ExitFormFillEnvironment",
		      "_FORM_OnAfterLoadPage",
		      "_FORM_OnBeforeClosePage",
		      "_FORM_DoDocumentJSAction",
		      "_FORM_DoDocumentOpenAction",
		      "_FORM_DoDocumentAAction",
		      "_FORM_DoPageAAction",
		      "_FORM_OnMouseMove",
		      "_FORM_OnMouseWheel",
		      "_FORM_OnFocus",
		      "_FORM_OnLButtonDown",
		      "_FORM_OnRButtonDown",
		      "_FORM_OnLButtonUp",
		      "_FORM_OnRButtonUp",
		      "_FORM_OnLButtonDoubleClick",
		      "_FORM_OnKeyDown",
		      "_FORM_OnKeyUp",
		      "_FORM_OnChar",
		      "_FORM_GetFocusedText",
		      "_FORM_GetSelectedText",
		      "_FORM_ReplaceAndKeepSelection",
		      "_FORM_ReplaceSelection",
		      "_FORM_SelectAllText",
		      "_FORM_CanUndo",
		      "_FORM_CanRedo",
		      "_FORM_Undo",
		      "_FORM_Redo",
		      "_FORM_ForceToKillFocus",
		      "_FORM_GetFocusedAnnot",
		      "_FORM_SetFocusedAnnot",
		      "_FPDFPage_HasFormFieldAtPoint",
		      "_FPDFPage_FormFieldZOrderAtPoint",
		      "_FPDF_SetFormFieldHighlightColor",
		      "_FPDF_SetFormFieldHighlightAlpha",
		      "_FPDF_RemoveFormFieldHighlight",
		      "_FPDF_FFLDraw",
		      "_FPDF_GetFormType",
		      "_FORM_SetIndexSelected",
		      "_FORM_IsIndexSelected",
		      "_FPDF_LoadXFA",
		      "_FPDFDoc_GetJavaScriptActionCount",
		      "_FPDFDoc_GetJavaScriptAction",
		      "_FPDFDoc_CloseJavaScriptAction",
		      "_FPDFJavaScriptAction_GetName",
		      "_FPDFJavaScriptAction_GetScript",
		      "_FPDF_ImportPagesByIndex",
		      "_FPDF_ImportPages",
		      "_FPDF_ImportNPagesToOne",
		      "_FPDF_NewXObjectFromPage",
		      "_FPDF_CloseXObject",
		      "_FPDF_NewFormObjectFromXObject",
		      "_FPDF_CopyViewerPreferences",
		      "_FPDF_RenderPageBitmapWithColorScheme_Start",
		      "_FPDF_RenderPageBitmap_Start",
		      "_FPDF_RenderPage_Continue",
		      "_FPDF_RenderPage_Close",
		      "_FPDF_SaveAsCopy",
		      "_FPDF_SaveWithVersion",
		      "_FPDFText_GetCharIndexFromTextIndex",
		      "_FPDFText_GetTextIndexFromCharIndex",
		      "_FPDF_GetSignatureCount",
		      "_FPDF_GetSignatureObject",
		      "_FPDFSignatureObj_GetContents",
		      "_FPDFSignatureObj_GetByteRange",
		      "_FPDFSignatureObj_GetSubFilter",
		      "_FPDFSignatureObj_GetReason",
		      "_FPDFSignatureObj_GetTime",
		      "_FPDFSignatureObj_GetDocMDPPermission",
		      "_FPDF_StructTree_GetForPage",
		      "_FPDF_StructTree_Close",
		      "_FPDF_StructTree_CountChildren",
		      "_FPDF_StructTree_GetChildAtIndex",
		      "_FPDF_StructElement_GetAltText",
		      "_FPDF_StructElement_GetActualText",
		      "_FPDF_StructElement_GetID",
		      "_FPDF_StructElement_GetLang",
		      "_FPDF_StructElement_GetStringAttribute",
		      "_FPDF_StructElement_GetMarkedContentID",
		      "_FPDF_StructElement_GetType",
		      "_FPDF_StructElement_GetObjType",
		      "_FPDF_StructElement_GetTitle",
		      "_FPDF_StructElement_CountChildren",
		      "_FPDF_StructElement_GetChildAtIndex",
		      "_FPDF_StructElement_GetChildMarkedContentID",
		      "_FPDF_StructElement_GetParent",
		      "_FPDF_StructElement_GetAttributeCount",
		      "_FPDF_StructElement_GetAttributeAtIndex",
		      "_FPDF_StructElement_Attr_GetCount",
		      "_FPDF_StructElement_Attr_GetName",
		      "_FPDF_StructElement_Attr_GetValue",
		      "_FPDF_StructElement_Attr_GetType",
		      "_FPDF_StructElement_Attr_GetBooleanValue",
		      "_FPDF_StructElement_Attr_GetNumberValue",
		      "_FPDF_StructElement_Attr_GetStringValue",
		      "_FPDF_StructElement_Attr_GetBlobValue",
		      "_FPDF_StructElement_Attr_CountChildren",
		      "_FPDF_StructElement_Attr_GetChildAtIndex",
		      "_FPDF_StructElement_GetMarkedContentIdCount",
		      "_FPDF_StructElement_GetMarkedContentIdAtIndex",
		      "_FPDF_GetDefaultTTFMap",
		      "_FPDF_GetDefaultTTFMapCount",
		      "_FPDF_GetDefaultTTFMapEntry",
		      "_FPDF_AddInstalledFont",
		      "_FPDF_SetSystemFontInfo",
		      "_FPDF_GetDefaultSystemFontInfo",
		      "_FPDF_FreeDefaultSystemFontInfo",
		      "_FPDFText_LoadPage",
		      "_FPDFText_ClosePage",
		      "_FPDFText_CountChars",
		      "_FPDFText_GetUnicode",
		      "_FPDFText_GetTextObject",
		      "_FPDFText_IsGenerated",
		      "_FPDFText_IsHyphen",
		      "_FPDFText_HasUnicodeMapError",
		      "_FPDFText_GetFontSize",
		      "_FPDFText_GetFontInfo",
		      "_FPDFText_GetFontWeight",
		      "_FPDFText_GetFillColor",
		      "_FPDFText_GetStrokeColor",
		      "_FPDFText_GetCharAngle",
		      "_FPDFText_GetCharBox",
		      "_FPDFText_GetLooseCharBox",
		      "_FPDFText_GetMatrix",
		      "_FPDFText_GetCharOrigin",
		      "_FPDFText_GetCharIndexAtPos",
		      "_FPDFText_GetText",
		      "_FPDFText_CountRects",
		      "_FPDFText_GetRect",
		      "_FPDFText_GetBoundedText",
		      "_FPDFText_FindStart",
		      "_FPDFText_FindNext",
		      "_FPDFText_FindPrev",
		      "_FPDFText_GetSchResultIndex",
		      "_FPDFText_GetSchCount",
		      "_FPDFText_FindClose",
		      "_FPDFLink_LoadWebLinks",
		      "_FPDFLink_CountWebLinks",
		      "_FPDFLink_GetURL",
		      "_FPDFLink_CountRects",
		      "_FPDFLink_GetRect",
		      "_FPDFLink_GetTextRange",
		      "_FPDFLink_CloseWebLinks",
		      "_FPDFPage_GetDecodedThumbnailData",
		      "_FPDFPage_GetRawThumbnailData",
		      "_FPDFPage_GetThumbnailAsBitmap",
		      "_FPDFPage_SetMediaBox",
		      "_FPDFPage_SetCropBox",
		      "_FPDFPage_SetBleedBox",
		      "_FPDFPage_SetTrimBox",
		      "_FPDFPage_SetArtBox",
		      "_FPDFPage_GetMediaBox",
		      "_FPDFPage_GetCropBox",
		      "_FPDFPage_GetBleedBox",
		      "_FPDFPage_GetTrimBox",
		      "_FPDFPage_GetArtBox",
		      "_FPDFPage_TransFormWithClip",
		      "_FPDFPageObj_TransformClipPath",
		      "_FPDFPageObj_GetClipPath",
		      "_FPDFClipPath_CountPaths",
		      "_FPDFClipPath_CountPathSegments",
		      "_FPDFClipPath_GetPathSegment",
		      "_FPDF_CreateClipPath",
		      "_FPDF_DestroyClipPath",
		      "_FPDFPage_InsertClipPath",
		      "_FPDF_InitLibraryWithConfig",
		      "_FPDF_InitLibrary",
		      "_FPDF_DestroyLibrary",
		      "_FPDF_SetSandBoxPolicy",
		      "_FPDF_LoadDocument",
		      "_FPDF_LoadMemDocument",
		      "_FPDF_LoadMemDocument64",
		      "_FPDF_LoadCustomDocument",
		      "_FPDF_GetFileVersion",
		      "_FPDF_GetLastError",
		      "_FPDF_DocumentHasValidCrossReferenceTable",
		      "_FPDF_GetTrailerEnds",
		      "_FPDF_GetDocPermissions",
		      "_FPDF_GetDocUserPermissions",
		      "_FPDF_GetSecurityHandlerRevision",
		      "_FPDF_GetPageCount",
		      "_FPDF_LoadPage",
		      "_FPDF_GetPageWidthF",
		      "_FPDF_GetPageWidth",
		      "_FPDF_GetPageHeightF",
		      "_FPDF_GetPageHeight",
		      "_FPDF_GetPageBoundingBox",
		      "_FPDF_GetPageSizeByIndexF",
		      "_FPDF_GetPageSizeByIndex",
		      "_FPDF_RenderPageBitmap",
		      "_FPDF_RenderPageBitmapWithMatrix",
		      "_FPDF_ClosePage",
		      "_FPDF_CloseDocument",
		      "_FPDF_DeviceToPage",
		      "_FPDF_PageToDevice",
		      "_FPDFBitmap_Create",
		      "_FPDFBitmap_CreateEx",
		      "_FPDFBitmap_GetFormat",
		      "_FPDFBitmap_FillRect",
		      "_FPDFBitmap_GetBuffer",
		      "_FPDFBitmap_GetWidth",
		      "_FPDFBitmap_GetHeight",
		      "_FPDFBitmap_GetStride",
		      "_FPDFBitmap_Destroy",
		      "_FPDF_VIEWERREF_GetPrintScaling",
		      "_FPDF_VIEWERREF_GetNumCopies",
		      "_FPDF_VIEWERREF_GetPrintPageRange",
		      "_FPDF_VIEWERREF_GetPrintPageRangeCount",
		      "_FPDF_VIEWERREF_GetPrintPageRangeElement",
		      "_FPDF_VIEWERREF_GetDuplex",
		      "_FPDF_VIEWERREF_GetName",
		      "_FPDF_CountNamedDests",
		      "_FPDF_GetNamedDestByName",
		      "_FPDF_GetNamedDest",
		      "_FPDF_GetXFAPacketCount",
		      "_FPDF_GetXFAPacketName",
		      "_FPDF_GetXFAPacketContent",
		      "_malloc",
		      "_free",
		      "_memory",
		      "_PDFium_Init",
		      "___indirect_function_table",
		      "onRuntimeInitialized",
		    ].forEach((prop) => {
		      if (!Object.getOwnPropertyDescriptor(readyPromise, prop)) {
		        Object.defineProperty(readyPromise, prop, {
		          get: () =>
		            abort(
		              "You are getting " +
		                prop +
		                " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js",
		            ),
		          set: () =>
		            abort(
		              "You are setting " +
		                prop +
		                " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js",
		            ),
		        });
		      }
		    });
		    var ENVIRONMENT_IS_WEB = typeof window == "object";
		    var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
		    var ENVIRONMENT_IS_NODE =
		      typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";
		    var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
		    if (Module["ENVIRONMENT"]) {
		      throw new Error(
		        "Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)",
		      );
		    }
		    var moduleOverrides = Object.assign({}, Module);
		    var thisProgram = "./this.program";
		    var scriptDirectory = "";
		    function locateFile(path) {
		      if (Module["locateFile"]) {
		        return Module["locateFile"](path, scriptDirectory);
		      }
		      return scriptDirectory + path;
		    }
		    var readAsync, readBinary;
		    if (ENVIRONMENT_IS_NODE) {
		      if (typeof process == "undefined" || !process.release || process.release.name !== "node")
		        throw new Error(
		          "not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)",
		        );
		      var nodeVersion = process.versions.node;
		      var numericVersion = nodeVersion.split(".").slice(0, 3);
		      numericVersion = numericVersion[0] * 1e4 + numericVersion[1] * 100 + numericVersion[2].split("-")[0] * 1;
		      if (numericVersion < 16e4) {
		        throw new Error("This emscripten-generated code requires node v16.0.0 (detected v" + nodeVersion + ")");
		      }
		      var fs = require("fs");
		      var nodePath = require("path");
		      scriptDirectory = __dirname + "/";
		      readBinary = (filename) => {
		        filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
		        var ret = fs.readFileSync(filename);
		        assert(ret.buffer);
		        return ret;
		      };
		      readAsync = (filename, binary = true) => {
		        filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
		        return new Promise((resolve, reject) => {
		          fs.readFile(filename, binary ? undefined : "utf8", (err, data) => {
		            if (err) reject(err);
		            else resolve(binary ? data.buffer : data);
		          });
		        });
		      };
		      if (!Module["thisProgram"] && process.argv.length > 1) {
		        thisProgram = process.argv[1].replace(/\\/g, "/");
		      }
		      process.argv.slice(2);
		    } else if (ENVIRONMENT_IS_SHELL) {
		      if (
		        (typeof process == "object" && typeof commonjsRequire === "function") ||
		        typeof window == "object" ||
		        typeof importScripts == "function"
		      )
		        throw new Error(
		          "not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)",
		        );
		    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
		      if (ENVIRONMENT_IS_WORKER) {
		        scriptDirectory = self.location.href;
		      } else if (typeof document != "undefined" && document.currentScript) {
		        scriptDirectory = document.currentScript.src;
		      }
		      if (_scriptName) {
		        scriptDirectory = _scriptName;
		      }
		      if (scriptDirectory.startsWith("blob:")) {
		        scriptDirectory = "";
		      } else {
		        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
		      }
		      if (!(typeof window == "object" || typeof importScripts == "function"))
		        throw new Error(
		          "not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)",
		        );
		      {
		        if (ENVIRONMENT_IS_WORKER) {
		          readBinary = (url) => {
		            var xhr = new XMLHttpRequest();
		            xhr.open("GET", url, false);
		            xhr.responseType = "arraybuffer";
		            xhr.send(null);
		            return new Uint8Array(xhr.response);
		          };
		        }
		        readAsync = (url) => {
		          if (isFileURI(url)) {
		            return new Promise((reject, resolve) => {
		              var xhr = new XMLHttpRequest();
		              xhr.open("GET", url, true);
		              xhr.responseType = "arraybuffer";
		              xhr.onload = () => {
		                if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
		                  resolve(xhr.response);
		                }
		                reject(xhr.status);
		              };
		              xhr.onerror = reject;
		              xhr.send(null);
		            });
		          }
		          return fetch(url, { credentials: "same-origin" }).then((response) => {
		            if (response.ok) {
		              return response.arrayBuffer();
		            }
		            return Promise.reject(new Error(response.status + " : " + response.url));
		          });
		        };
		      }
		    } else {
		      throw new Error("environment detection error");
		    }
		    var out = Module["print"] || console.log.bind(console);
		    var err = Module["printErr"] || console.error.bind(console);
		    Object.assign(Module, moduleOverrides);
		    moduleOverrides = null;
		    checkIncomingModuleAPI();
		    if (Module["arguments"]) Module["arguments"];
		    legacyModuleProp("arguments", "arguments_");
		    if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
		    legacyModuleProp("thisProgram", "thisProgram");
		    if (Module["quit"]) Module["quit"];
		    legacyModuleProp("quit", "quit_");
		    assert(
		      typeof Module["memoryInitializerPrefixURL"] == "undefined",
		      "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead",
		    );
		    assert(
		      typeof Module["pthreadMainPrefixURL"] == "undefined",
		      "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead",
		    );
		    assert(
		      typeof Module["cdInitializerPrefixURL"] == "undefined",
		      "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead",
		    );
		    assert(
		      typeof Module["filePackagePrefixURL"] == "undefined",
		      "Module.filePackagePrefixURL option was removed, use Module.locateFile instead",
		    );
		    assert(typeof Module["read"] == "undefined", "Module.read option was removed");
		    assert(typeof Module["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");
		    assert(
		      typeof Module["readBinary"] == "undefined",
		      "Module.readBinary option was removed (modify readBinary in JS)",
		    );
		    assert(
		      typeof Module["setWindowTitle"] == "undefined",
		      "Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)",
		    );
		    assert(typeof Module["TOTAL_MEMORY"] == "undefined", "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");
		    legacyModuleProp("asm", "wasmExports");
		    legacyModuleProp("readAsync", "readAsync");
		    legacyModuleProp("readBinary", "readBinary");
		    legacyModuleProp("setWindowTitle", "setWindowTitle");
		    assert(
		      !ENVIRONMENT_IS_SHELL,
		      "shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable.",
		    );
		    var wasmBinary;
		    if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
		    legacyModuleProp("wasmBinary", "wasmBinary");
		    if (typeof WebAssembly != "object") {
		      err("no native wasm support detected");
		    }
		    var wasmMemory;
		    var ABORT = false;
		    function assert(condition, text) {
		      if (!condition) {
		        abort("Assertion failed" + (text ? ": " + text : ""));
		      }
		    }
		    var HEAP8, HEAPU8, HEAP16, HEAP32, HEAPU32;
		    function updateMemoryViews() {
		      var b = wasmMemory.buffer;
		      Module["HEAP8"] = HEAP8 = new Int8Array(b);
		      Module["HEAP16"] = HEAP16 = new Int16Array(b);
		      Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
		      Module["HEAPU16"] = new Uint16Array(b);
		      Module["HEAP32"] = HEAP32 = new Int32Array(b);
		      Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
		      Module["HEAPF32"] = new Float32Array(b);
		      Module["HEAPF64"] = new Float64Array(b);
		    }
		    assert(!Module["STACK_SIZE"], "STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time");
		    assert(
		      typeof Int32Array != "undefined" &&
		        typeof Float64Array !== "undefined" &&
		        Int32Array.prototype.subarray != undefined &&
		        Int32Array.prototype.set != undefined,
		      "JS engine does not provide full typed array support",
		    );
		    assert(
		      !Module["wasmMemory"],
		      "Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally",
		    );
		    assert(
		      !Module["INITIAL_MEMORY"],
		      "Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically",
		    );
		    function writeStackCookie() {
		      var max = _emscripten_stack_get_end();
		      assert((max & 3) == 0);
		      if (max == 0) {
		        max += 4;
		      }
		      HEAPU32[max >> 2] = 34821223;
		      HEAPU32[(max + 4) >> 2] = 2310721022;
		      HEAPU32[0 >> 2] = 1668509029;
		    }
		    function checkStackCookie() {
		      if (ABORT) return;
		      var max = _emscripten_stack_get_end();
		      if (max == 0) {
		        max += 4;
		      }
		      var cookie1 = HEAPU32[max >> 2];
		      var cookie2 = HEAPU32[(max + 4) >> 2];
		      if (cookie1 != 34821223 || cookie2 != 2310721022) {
		        abort(
		          `Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`,
		        );
		      }
		      if (HEAPU32[0 >> 2] != 1668509029) {
		        abort("Runtime error: The application has corrupted its heap memory area (address zero)!");
		      }
		    }
		    (function () {
		      var h16 = new Int16Array(1);
		      var h8 = new Int8Array(h16.buffer);
		      h16[0] = 25459;
		      if (h8[0] !== 115 || h8[1] !== 99)
		        throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";
		    })();
		    var __ATPRERUN__ = [];
		    var __ATINIT__ = [];
		    var __ATPOSTRUN__ = [];
		    var runtimeInitialized = false;
		    function preRun() {
		      if (Module["preRun"]) {
		        if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
		        while (Module["preRun"].length) {
		          addOnPreRun(Module["preRun"].shift());
		        }
		      }
		      callRuntimeCallbacks(__ATPRERUN__);
		    }
		    function initRuntime() {
		      assert(!runtimeInitialized);
		      runtimeInitialized = true;
		      checkStackCookie();
		      if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
		      FS.ignorePermissions = false;
		      callRuntimeCallbacks(__ATINIT__);
		    }
		    function postRun() {
		      checkStackCookie();
		      if (Module["postRun"]) {
		        if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
		        while (Module["postRun"].length) {
		          addOnPostRun(Module["postRun"].shift());
		        }
		      }
		      callRuntimeCallbacks(__ATPOSTRUN__);
		    }
		    function addOnPreRun(cb) {
		      __ATPRERUN__.unshift(cb);
		    }
		    function addOnInit(cb) {
		      __ATINIT__.unshift(cb);
		    }
		    function addOnPostRun(cb) {
		      __ATPOSTRUN__.unshift(cb);
		    }
		    assert(
		      Math.imul,
		      "This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill",
		    );
		    assert(
		      Math.fround,
		      "This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill",
		    );
		    assert(
		      Math.clz32,
		      "This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill",
		    );
		    assert(
		      Math.trunc,
		      "This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill",
		    );
		    var runDependencies = 0;
		    var runDependencyWatcher = null;
		    var dependenciesFulfilled = null;
		    var runDependencyTracking = {};
		    function getUniqueRunDependency(id) {
		      var orig = id;
		      while (1) {
		        if (!runDependencyTracking[id]) return id;
		        id = orig + Math.random();
		      }
		    }
		    function addRunDependency(id) {
		      runDependencies++;
		      Module["monitorRunDependencies"]?.(runDependencies);
		      if (id) {
		        assert(!runDependencyTracking[id]);
		        runDependencyTracking[id] = 1;
		        if (runDependencyWatcher === null && typeof setInterval != "undefined") {
		          runDependencyWatcher = setInterval(() => {
		            if (ABORT) {
		              clearInterval(runDependencyWatcher);
		              runDependencyWatcher = null;
		              return;
		            }
		            var shown = false;
		            for (var dep in runDependencyTracking) {
		              if (!shown) {
		                shown = true;
		                err("still waiting on run dependencies:");
		              }
		              err(`dependency: ${dep}`);
		            }
		            if (shown) {
		              err("(end of list)");
		            }
		          }, 1e4);
		        }
		      } else {
		        err("warning: run dependency added without ID");
		      }
		    }
		    function removeRunDependency(id) {
		      runDependencies--;
		      Module["monitorRunDependencies"]?.(runDependencies);
		      if (id) {
		        assert(runDependencyTracking[id]);
		        delete runDependencyTracking[id];
		      } else {
		        err("warning: run dependency removed without ID");
		      }
		      if (runDependencies == 0) {
		        if (runDependencyWatcher !== null) {
		          clearInterval(runDependencyWatcher);
		          runDependencyWatcher = null;
		        }
		        if (dependenciesFulfilled) {
		          var callback = dependenciesFulfilled;
		          dependenciesFulfilled = null;
		          callback();
		        }
		      }
		    }
		    function abort(what) {
		      Module["onAbort"]?.(what);
		      what = "Aborted(" + what + ")";
		      err(what);
		      ABORT = true;
		      var e = new WebAssembly.RuntimeError(what);
		      readyPromiseReject(e);
		      throw e;
		    }
		    var dataURIPrefix = "data:application/octet-stream;base64,";
		    var isDataURI = (filename) => filename.startsWith(dataURIPrefix);
		    var isFileURI = (filename) => filename.startsWith("file://");
		    function createExportWrapper(name, nargs) {
		      return (...args) => {
		        assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
		        var f = wasmExports[name];
		        assert(f, `exported native function \`${name}\` not found`);
		        assert(
		          args.length <= nargs,
		          `native function \`${name}\` called with ${args.length} args but expects ${nargs}`,
		        );
		        return f(...args);
		      };
		    }
		    function findWasmBinary() {
		      var f = "pdfium.wasm";
		      if (!isDataURI(f)) {
		        return locateFile(f);
		      }
		      return f;
		    }
		    var wasmBinaryFile;
		    function getBinarySync(file) {
		      if (file == wasmBinaryFile && wasmBinary) {
		        return new Uint8Array(wasmBinary);
		      }
		      if (readBinary) {
		        return readBinary(file);
		      }
		      throw "both async and sync fetching of the wasm failed";
		    }
		    function getBinaryPromise(binaryFile) {
		      if (!wasmBinary) {
		        return readAsync(binaryFile).then(
		          (response) => new Uint8Array(response),
		          () => getBinarySync(binaryFile),
		        );
		      }
		      return Promise.resolve().then(() => getBinarySync(binaryFile));
		    }
		    function instantiateArrayBuffer(binaryFile, imports, receiver) {
		      return getBinaryPromise(binaryFile)
		        .then((binary) => WebAssembly.instantiate(binary, imports))
		        .then(receiver, (reason) => {
		          err(`failed to asynchronously prepare wasm: ${reason}`);
		          if (isFileURI(wasmBinaryFile)) {
		            err(
		              `warning: Loading from a file URI (${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`,
		            );
		          }
		          abort(reason);
		        });
		    }
		    function instantiateAsync(binary, binaryFile, imports, callback) {
		      if (
		        !binary &&
		        typeof WebAssembly.instantiateStreaming == "function" &&
		        !isDataURI(binaryFile) &&
		        !isFileURI(binaryFile) &&
		        !ENVIRONMENT_IS_NODE &&
		        typeof fetch == "function"
		      ) {
		        return fetch(binaryFile, { credentials: "same-origin" }).then((response) => {
		          var result = WebAssembly.instantiateStreaming(response, imports);
		          return result.then(callback, function (reason) {
		            err(`wasm streaming compile failed: ${reason}`);
		            err("falling back to ArrayBuffer instantiation");
		            return instantiateArrayBuffer(binaryFile, imports, callback);
		          });
		        });
		      }
		      return instantiateArrayBuffer(binaryFile, imports, callback);
		    }
		    function getWasmImports() {
		      return { env: wasmImports, wasi_snapshot_preview1: wasmImports };
		    }
		    function createWasm() {
		      var info = getWasmImports();
		      function receiveInstance(instance, module) {
		        wasmExports = instance.exports;
		        Module["wasmExports"] = wasmExports;
		        wasmMemory = wasmExports["memory"];
		        assert(wasmMemory, "memory not found in wasm exports");
		        updateMemoryViews();
		        wasmTable = wasmExports["__indirect_function_table"];
		        assert(wasmTable, "table not found in wasm exports");
		        addOnInit(wasmExports["__wasm_call_ctors"]);
		        removeRunDependency("wasm-instantiate");
		        return wasmExports;
		      }
		      addRunDependency("wasm-instantiate");
		      var trueModule = Module;
		      function receiveInstantiationResult(result) {
		        assert(
		          Module === trueModule,
		          "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?",
		        );
		        trueModule = null;
		        receiveInstance(result["instance"]);
		      }
		      if (Module["instantiateWasm"]) {
		        try {
		          return Module["instantiateWasm"](info, receiveInstance);
		        } catch (e) {
		          err(`Module.instantiateWasm callback failed with error: ${e}`);
		          readyPromiseReject(e);
		        }
		      }
		      if (!wasmBinaryFile) wasmBinaryFile = findWasmBinary();
		      instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
		      return {};
		    }
		    var tempDouble;
		    var tempI64;
		    function legacyModuleProp(prop, newName, incoming = true) {
		      if (!Object.getOwnPropertyDescriptor(Module, prop)) {
		        Object.defineProperty(Module, prop, {
		          configurable: true,
		          get() {
		            let extra = incoming
		              ? " (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)"
		              : "";
		            abort(`\`Module.${prop}\` has been replaced by \`${newName}\`` + extra);
		          },
		        });
		      }
		    }
		    function ignoredModuleProp(prop) {
		      if (Object.getOwnPropertyDescriptor(Module, prop)) {
		        abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
		      }
		    }
		    function isExportedByForceFilesystem(name) {
		      return (
		        name === "FS_createPath" ||
		        name === "FS_createDataFile" ||
		        name === "FS_createPreloadedFile" ||
		        name === "FS_unlink" ||
		        name === "addRunDependency" ||
		        name === "FS_createLazyFile" ||
		        name === "FS_createDevice" ||
		        name === "removeRunDependency"
		      );
		    }
		    function missingGlobal(sym, msg) {
		      if (typeof globalThis != "undefined") {
		        Object.defineProperty(globalThis, sym, {
		          configurable: true,
		          get() {
		            warnOnce(`\`${sym}\` is not longer defined by emscripten. ${msg}`);
		            return undefined;
		          },
		        });
		      }
		    }
		    missingGlobal("buffer", "Please use HEAP8.buffer or wasmMemory.buffer");
		    missingGlobal("asm", "Please use wasmExports instead");
		    function missingLibrarySymbol(sym) {
		      if (typeof globalThis != "undefined" && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
		        Object.defineProperty(globalThis, sym, {
		          configurable: true,
		          get() {
		            var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
		            var librarySymbol = sym;
		            if (!librarySymbol.startsWith("_")) {
		              librarySymbol = "$" + sym;
		            }
		            msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
		            if (isExportedByForceFilesystem(sym)) {
		              msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
		            }
		            warnOnce(msg);
		            return undefined;
		          },
		        });
		      }
		      unexportedRuntimeSymbol(sym);
		    }
		    function unexportedRuntimeSymbol(sym) {
		      if (!Object.getOwnPropertyDescriptor(Module, sym)) {
		        Object.defineProperty(Module, sym, {
		          configurable: true,
		          get() {
		            var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
		            if (isExportedByForceFilesystem(sym)) {
		              msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
		            }
		            abort(msg);
		          },
		        });
		      }
		    }
		    var callRuntimeCallbacks = (callbacks) => {
		      while (callbacks.length > 0) {
		        callbacks.shift()(Module);
		      }
		    };
		    var stackSave = () => _emscripten_stack_get_current();
		    var stackRestore = (val) => __emscripten_stack_restore(val);
		    var lengthBytesUTF8 = (str) => {
		      var len = 0;
		      for (var i = 0; i < str.length; ++i) {
		        var c = str.charCodeAt(i);
		        if (c <= 127) {
		          len++;
		        } else if (c <= 2047) {
		          len += 2;
		        } else if (c >= 55296 && c <= 57343) {
		          len += 4;
		          ++i;
		        } else {
		          len += 3;
		        }
		      }
		      return len;
		    };
		    var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
		      assert(typeof str === "string", `stringToUTF8Array expects a string (got ${typeof str})`);
		      if (!(maxBytesToWrite > 0)) return 0;
		      var startIdx = outIdx;
		      var endIdx = outIdx + maxBytesToWrite - 1;
		      for (var i = 0; i < str.length; ++i) {
		        var u = str.charCodeAt(i);
		        if (u >= 55296 && u <= 57343) {
		          var u1 = str.charCodeAt(++i);
		          u = (65536 + ((u & 1023) << 10)) | (u1 & 1023);
		        }
		        if (u <= 127) {
		          if (outIdx >= endIdx) break;
		          heap[outIdx++] = u;
		        } else if (u <= 2047) {
		          if (outIdx + 1 >= endIdx) break;
		          heap[outIdx++] = 192 | (u >> 6);
		          heap[outIdx++] = 128 | (u & 63);
		        } else if (u <= 65535) {
		          if (outIdx + 2 >= endIdx) break;
		          heap[outIdx++] = 224 | (u >> 12);
		          heap[outIdx++] = 128 | ((u >> 6) & 63);
		          heap[outIdx++] = 128 | (u & 63);
		        } else {
		          if (outIdx + 3 >= endIdx) break;
		          if (u > 1114111)
		            warnOnce(
		              "Invalid Unicode code point " +
		                ptrToString(u) +
		                " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).",
		            );
		          heap[outIdx++] = 240 | (u >> 18);
		          heap[outIdx++] = 128 | ((u >> 12) & 63);
		          heap[outIdx++] = 128 | ((u >> 6) & 63);
		          heap[outIdx++] = 128 | (u & 63);
		        }
		      }
		      heap[outIdx] = 0;
		      return outIdx - startIdx;
		    };
		    var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
		      assert(
		        typeof maxBytesToWrite == "number",
		        "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!",
		      );
		      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
		    };
		    var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
		    var stringToUTF8OnStack = (str) => {
		      var size = lengthBytesUTF8(str) + 1;
		      var ret = stackAlloc(size);
		      stringToUTF8(str, ret, size);
		      return ret;
		    };
		    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : undefined;
		    var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
		      var endIdx = idx + maxBytesToRead;
		      var endPtr = idx;
		      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
		      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
		        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
		      }
		      var str = "";
		      while (idx < endPtr) {
		        var u0 = heapOrArray[idx++];
		        if (!(u0 & 128)) {
		          str += String.fromCharCode(u0);
		          continue;
		        }
		        var u1 = heapOrArray[idx++] & 63;
		        if ((u0 & 224) == 192) {
		          str += String.fromCharCode(((u0 & 31) << 6) | u1);
		          continue;
		        }
		        var u2 = heapOrArray[idx++] & 63;
		        if ((u0 & 240) == 224) {
		          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
		        } else {
		          if ((u0 & 248) != 240)
		            warnOnce(
		              "Invalid UTF-8 leading byte " +
		                ptrToString(u0) +
		                " encountered when deserializing a UTF-8 string in wasm memory to a JS string!",
		            );
		          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
		        }
		        if (u0 < 65536) {
		          str += String.fromCharCode(u0);
		        } else {
		          var ch = u0 - 65536;
		          str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
		        }
		      }
		      return str;
		    };
		    var UTF8ToString = (ptr, maxBytesToRead) => {
		      assert(typeof ptr == "number", `UTF8ToString expects a number (got ${typeof ptr})`);
		      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
		    };
		    Module["noExitRuntime"] || true;
		    var ptrToString = (ptr) => {
		      assert(typeof ptr === "number");
		      ptr >>>= 0;
		      return "0x" + ptr.toString(16).padStart(8, "0");
		    };
		    var warnOnce = (text) => {
		      warnOnce.shown ||= {};
		      if (!warnOnce.shown[text]) {
		        warnOnce.shown[text] = 1;
		        if (ENVIRONMENT_IS_NODE) text = "warning: " + text;
		        err(text);
		      }
		    };
		    var ___assert_fail = (condition, filename, line, func) => {
		      abort(
		        `Assertion failed: ${UTF8ToString(condition)}, at: ` +
		          [
		            filename ? UTF8ToString(filename) : "unknown filename",
		            line,
		            func ? UTF8ToString(func) : "unknown function",
		          ],
		      );
		    };
		    function syscallGetVarargI() {
		      assert(SYSCALLS.varargs != undefined);
		      var ret = HEAP32[+SYSCALLS.varargs >> 2];
		      SYSCALLS.varargs += 4;
		      return ret;
		    }
		    var syscallGetVarargP = syscallGetVarargI;
		    var PATH = {
		      isAbs: (path) => path.charAt(0) === "/",
		      splitPath: (filename) => {
		        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
		        return splitPathRe.exec(filename).slice(1);
		      },
		      normalizeArray: (parts, allowAboveRoot) => {
		        var up = 0;
		        for (var i = parts.length - 1; i >= 0; i--) {
		          var last = parts[i];
		          if (last === ".") {
		            parts.splice(i, 1);
		          } else if (last === "..") {
		            parts.splice(i, 1);
		            up++;
		          } else if (up) {
		            parts.splice(i, 1);
		            up--;
		          }
		        }
		        if (allowAboveRoot) {
		          for (; up; up--) {
		            parts.unshift("..");
		          }
		        }
		        return parts;
		      },
		      normalize: (path) => {
		        var isAbsolute = PATH.isAbs(path),
		          trailingSlash = path.substr(-1) === "/";
		        path = PATH.normalizeArray(
		          path.split("/").filter((p) => !!p),
		          !isAbsolute,
		        ).join("/");
		        if (!path && !isAbsolute) {
		          path = ".";
		        }
		        if (path && trailingSlash) {
		          path += "/";
		        }
		        return (isAbsolute ? "/" : "") + path;
		      },
		      dirname: (path) => {
		        var result = PATH.splitPath(path),
		          root = result[0],
		          dir = result[1];
		        if (!root && !dir) {
		          return ".";
		        }
		        if (dir) {
		          dir = dir.substr(0, dir.length - 1);
		        }
		        return root + dir;
		      },
		      basename: (path) => {
		        if (path === "/") return "/";
		        path = PATH.normalize(path);
		        path = path.replace(/\/$/, "");
		        var lastSlash = path.lastIndexOf("/");
		        if (lastSlash === -1) return path;
		        return path.substr(lastSlash + 1);
		      },
		      join: (...paths) => PATH.normalize(paths.join("/")),
		      join2: (l, r) => PATH.normalize(l + "/" + r),
		    };
		    var initRandomFill = () => {
		      if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
		        return (view) => crypto.getRandomValues(view);
		      } else if (ENVIRONMENT_IS_NODE) {
		        try {
		          var crypto_module = require("crypto");
		          var randomFillSync = crypto_module["randomFillSync"];
		          if (randomFillSync) {
		            return (view) => crypto_module["randomFillSync"](view);
		          }
		          var randomBytes = crypto_module["randomBytes"];
		          return (view) => (view.set(randomBytes(view.byteLength)), view);
		        } catch (e) {}
		      }
		      abort(
		        "no cryptographic support found for randomDevice. consider polyfilling it if you want to use something insecure like Math.random(), e.g. put this in a --pre-js: var crypto = { getRandomValues: (array) => { for (var i = 0; i < array.length; i++) array[i] = (Math.random()*256)|0 } };",
		      );
		    };
		    var randomFill = (view) => (randomFill = initRandomFill())(view);
		    var PATH_FS = {
		      resolve: (...args) => {
		        var resolvedPath = "",
		          resolvedAbsolute = false;
		        for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
		          var path = i >= 0 ? args[i] : FS.cwd();
		          if (typeof path != "string") {
		            throw new TypeError("Arguments to path.resolve must be strings");
		          } else if (!path) {
		            return "";
		          }
		          resolvedPath = path + "/" + resolvedPath;
		          resolvedAbsolute = PATH.isAbs(path);
		        }
		        resolvedPath = PATH.normalizeArray(
		          resolvedPath.split("/").filter((p) => !!p),
		          !resolvedAbsolute,
		        ).join("/");
		        return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
		      },
		      relative: (from, to) => {
		        from = PATH_FS.resolve(from).substr(1);
		        to = PATH_FS.resolve(to).substr(1);
		        function trim(arr) {
		          var start = 0;
		          for (; start < arr.length; start++) {
		            if (arr[start] !== "") break;
		          }
		          var end = arr.length - 1;
		          for (; end >= 0; end--) {
		            if (arr[end] !== "") break;
		          }
		          if (start > end) return [];
		          return arr.slice(start, end - start + 1);
		        }
		        var fromParts = trim(from.split("/"));
		        var toParts = trim(to.split("/"));
		        var length = Math.min(fromParts.length, toParts.length);
		        var samePartsLength = length;
		        for (var i = 0; i < length; i++) {
		          if (fromParts[i] !== toParts[i]) {
		            samePartsLength = i;
		            break;
		          }
		        }
		        var outputParts = [];
		        for (var i = samePartsLength; i < fromParts.length; i++) {
		          outputParts.push("..");
		        }
		        outputParts = outputParts.concat(toParts.slice(samePartsLength));
		        return outputParts.join("/");
		      },
		    };
		    var FS_stdin_getChar_buffer = [];
		    function intArrayFromString(stringy, dontAddNull, length) {
		      var len = lengthBytesUTF8(stringy) + 1;
		      var u8array = new Array(len);
		      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
		      u8array.length = numBytesWritten;
		      return u8array;
		    }
		    var FS_stdin_getChar = () => {
		      if (!FS_stdin_getChar_buffer.length) {
		        var result = null;
		        if (ENVIRONMENT_IS_NODE) {
		          var BUFSIZE = 256;
		          var buf = Buffer.alloc(BUFSIZE);
		          var bytesRead = 0;
		          var fd = process.stdin.fd;
		          try {
		            bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
		          } catch (e) {
		            if (e.toString().includes("EOF")) bytesRead = 0;
		            else throw e;
		          }
		          if (bytesRead > 0) {
		            result = buf.slice(0, bytesRead).toString("utf-8");
		          }
		        } else if (typeof window != "undefined" && typeof window.prompt == "function") {
		          result = window.prompt("Input: ");
		          if (result !== null) {
		            result += "\n";
		          }
		        } else ;
		        if (!result) {
		          return null;
		        }
		        FS_stdin_getChar_buffer = intArrayFromString(result);
		      }
		      return FS_stdin_getChar_buffer.shift();
		    };
		    var TTY = {
		      ttys: [],
		      init() {},
		      shutdown() {},
		      register(dev, ops) {
		        TTY.ttys[dev] = { input: [], output: [], ops: ops };
		        FS.registerDevice(dev, TTY.stream_ops);
		      },
		      stream_ops: {
		        open(stream) {
		          var tty = TTY.ttys[stream.node.rdev];
		          if (!tty) {
		            throw new FS.ErrnoError(43);
		          }
		          stream.tty = tty;
		          stream.seekable = false;
		        },
		        close(stream) {
		          stream.tty.ops.fsync(stream.tty);
		        },
		        fsync(stream) {
		          stream.tty.ops.fsync(stream.tty);
		        },
		        read(stream, buffer, offset, length, pos) {
		          if (!stream.tty || !stream.tty.ops.get_char) {
		            throw new FS.ErrnoError(60);
		          }
		          var bytesRead = 0;
		          for (var i = 0; i < length; i++) {
		            var result;
		            try {
		              result = stream.tty.ops.get_char(stream.tty);
		            } catch (e) {
		              throw new FS.ErrnoError(29);
		            }
		            if (result === undefined && bytesRead === 0) {
		              throw new FS.ErrnoError(6);
		            }
		            if (result === null || result === undefined) break;
		            bytesRead++;
		            buffer[offset + i] = result;
		          }
		          if (bytesRead) {
		            stream.node.timestamp = Date.now();
		          }
		          return bytesRead;
		        },
		        write(stream, buffer, offset, length, pos) {
		          if (!stream.tty || !stream.tty.ops.put_char) {
		            throw new FS.ErrnoError(60);
		          }
		          try {
		            for (var i = 0; i < length; i++) {
		              stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
		            }
		          } catch (e) {
		            throw new FS.ErrnoError(29);
		          }
		          if (length) {
		            stream.node.timestamp = Date.now();
		          }
		          return i;
		        },
		      },
		      default_tty_ops: {
		        get_char(tty) {
		          return FS_stdin_getChar();
		        },
		        put_char(tty, val) {
		          if (val === null || val === 10) {
		            out(UTF8ArrayToString(tty.output, 0));
		            tty.output = [];
		          } else {
		            if (val != 0) tty.output.push(val);
		          }
		        },
		        fsync(tty) {
		          if (tty.output && tty.output.length > 0) {
		            out(UTF8ArrayToString(tty.output, 0));
		            tty.output = [];
		          }
		        },
		        ioctl_tcgets(tty) {
		          return {
		            c_iflag: 25856,
		            c_oflag: 5,
		            c_cflag: 191,
		            c_lflag: 35387,
		            c_cc: [
		              3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
		            ],
		          };
		        },
		        ioctl_tcsets(tty, optional_actions, data) {
		          return 0;
		        },
		        ioctl_tiocgwinsz(tty) {
		          return [24, 80];
		        },
		      },
		      default_tty1_ops: {
		        put_char(tty, val) {
		          if (val === null || val === 10) {
		            err(UTF8ArrayToString(tty.output, 0));
		            tty.output = [];
		          } else {
		            if (val != 0) tty.output.push(val);
		          }
		        },
		        fsync(tty) {
		          if (tty.output && tty.output.length > 0) {
		            err(UTF8ArrayToString(tty.output, 0));
		            tty.output = [];
		          }
		        },
		      },
		    };
		    var mmapAlloc = (size) => {
		      abort("internal error: mmapAlloc called but `emscripten_builtin_memalign` native symbol not exported");
		    };
		    var MEMFS = {
		      ops_table: null,
		      mount(mount) {
		        return MEMFS.createNode(null, "/", 16384 | 511, 0);
		      },
		      createNode(parent, name, mode, dev) {
		        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
		          throw new FS.ErrnoError(63);
		        }
		        MEMFS.ops_table ||= {
		          dir: {
		            node: {
		              getattr: MEMFS.node_ops.getattr,
		              setattr: MEMFS.node_ops.setattr,
		              lookup: MEMFS.node_ops.lookup,
		              mknod: MEMFS.node_ops.mknod,
		              rename: MEMFS.node_ops.rename,
		              unlink: MEMFS.node_ops.unlink,
		              rmdir: MEMFS.node_ops.rmdir,
		              readdir: MEMFS.node_ops.readdir,
		              symlink: MEMFS.node_ops.symlink,
		            },
		            stream: { llseek: MEMFS.stream_ops.llseek },
		          },
		          file: {
		            node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr },
		            stream: {
		              llseek: MEMFS.stream_ops.llseek,
		              read: MEMFS.stream_ops.read,
		              write: MEMFS.stream_ops.write,
		              allocate: MEMFS.stream_ops.allocate,
		              mmap: MEMFS.stream_ops.mmap,
		              msync: MEMFS.stream_ops.msync,
		            },
		          },
		          link: {
		            node: {
		              getattr: MEMFS.node_ops.getattr,
		              setattr: MEMFS.node_ops.setattr,
		              readlink: MEMFS.node_ops.readlink,
		            },
		            stream: {},
		          },
		          chrdev: {
		            node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr },
		            stream: FS.chrdev_stream_ops,
		          },
		        };
		        var node = FS.createNode(parent, name, mode, dev);
		        if (FS.isDir(node.mode)) {
		          node.node_ops = MEMFS.ops_table.dir.node;
		          node.stream_ops = MEMFS.ops_table.dir.stream;
		          node.contents = {};
		        } else if (FS.isFile(node.mode)) {
		          node.node_ops = MEMFS.ops_table.file.node;
		          node.stream_ops = MEMFS.ops_table.file.stream;
		          node.usedBytes = 0;
		          node.contents = null;
		        } else if (FS.isLink(node.mode)) {
		          node.node_ops = MEMFS.ops_table.link.node;
		          node.stream_ops = MEMFS.ops_table.link.stream;
		        } else if (FS.isChrdev(node.mode)) {
		          node.node_ops = MEMFS.ops_table.chrdev.node;
		          node.stream_ops = MEMFS.ops_table.chrdev.stream;
		        }
		        node.timestamp = Date.now();
		        if (parent) {
		          parent.contents[name] = node;
		          parent.timestamp = node.timestamp;
		        }
		        return node;
		      },
		      getFileDataAsTypedArray(node) {
		        if (!node.contents) return new Uint8Array(0);
		        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
		        return new Uint8Array(node.contents);
		      },
		      expandFileStorage(node, newCapacity) {
		        var prevCapacity = node.contents ? node.contents.length : 0;
		        if (prevCapacity >= newCapacity) return;
		        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
		        newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125)) >>> 0);
		        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
		        var oldContents = node.contents;
		        node.contents = new Uint8Array(newCapacity);
		        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
		      },
		      resizeFileStorage(node, newSize) {
		        if (node.usedBytes == newSize) return;
		        if (newSize == 0) {
		          node.contents = null;
		          node.usedBytes = 0;
		        } else {
		          var oldContents = node.contents;
		          node.contents = new Uint8Array(newSize);
		          if (oldContents) {
		            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
		          }
		          node.usedBytes = newSize;
		        }
		      },
		      node_ops: {
		        getattr(node) {
		          var attr = {};
		          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
		          attr.ino = node.id;
		          attr.mode = node.mode;
		          attr.nlink = 1;
		          attr.uid = 0;
		          attr.gid = 0;
		          attr.rdev = node.rdev;
		          if (FS.isDir(node.mode)) {
		            attr.size = 4096;
		          } else if (FS.isFile(node.mode)) {
		            attr.size = node.usedBytes;
		          } else if (FS.isLink(node.mode)) {
		            attr.size = node.link.length;
		          } else {
		            attr.size = 0;
		          }
		          attr.atime = new Date(node.timestamp);
		          attr.mtime = new Date(node.timestamp);
		          attr.ctime = new Date(node.timestamp);
		          attr.blksize = 4096;
		          attr.blocks = Math.ceil(attr.size / attr.blksize);
		          return attr;
		        },
		        setattr(node, attr) {
		          if (attr.mode !== undefined) {
		            node.mode = attr.mode;
		          }
		          if (attr.timestamp !== undefined) {
		            node.timestamp = attr.timestamp;
		          }
		          if (attr.size !== undefined) {
		            MEMFS.resizeFileStorage(node, attr.size);
		          }
		        },
		        lookup(parent, name) {
		          throw FS.genericErrors[44];
		        },
		        mknod(parent, name, mode, dev) {
		          return MEMFS.createNode(parent, name, mode, dev);
		        },
		        rename(old_node, new_dir, new_name) {
		          if (FS.isDir(old_node.mode)) {
		            var new_node;
		            try {
		              new_node = FS.lookupNode(new_dir, new_name);
		            } catch (e) {}
		            if (new_node) {
		              for (var i in new_node.contents) {
		                throw new FS.ErrnoError(55);
		              }
		            }
		          }
		          delete old_node.parent.contents[old_node.name];
		          old_node.parent.timestamp = Date.now();
		          old_node.name = new_name;
		          new_dir.contents[new_name] = old_node;
		          new_dir.timestamp = old_node.parent.timestamp;
		        },
		        unlink(parent, name) {
		          delete parent.contents[name];
		          parent.timestamp = Date.now();
		        },
		        rmdir(parent, name) {
		          var node = FS.lookupNode(parent, name);
		          for (var i in node.contents) {
		            throw new FS.ErrnoError(55);
		          }
		          delete parent.contents[name];
		          parent.timestamp = Date.now();
		        },
		        readdir(node) {
		          var entries = [".", ".."];
		          for (var key of Object.keys(node.contents)) {
		            entries.push(key);
		          }
		          return entries;
		        },
		        symlink(parent, newname, oldpath) {
		          var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
		          node.link = oldpath;
		          return node;
		        },
		        readlink(node) {
		          if (!FS.isLink(node.mode)) {
		            throw new FS.ErrnoError(28);
		          }
		          return node.link;
		        },
		      },
		      stream_ops: {
		        read(stream, buffer, offset, length, position) {
		          var contents = stream.node.contents;
		          if (position >= stream.node.usedBytes) return 0;
		          var size = Math.min(stream.node.usedBytes - position, length);
		          assert(size >= 0);
		          if (size > 8 && contents.subarray) {
		            buffer.set(contents.subarray(position, position + size), offset);
		          } else {
		            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
		          }
		          return size;
		        },
		        write(stream, buffer, offset, length, position, canOwn) {
		          assert(!(buffer instanceof ArrayBuffer));
		          if (buffer.buffer === HEAP8.buffer) {
		            canOwn = false;
		          }
		          if (!length) return 0;
		          var node = stream.node;
		          node.timestamp = Date.now();
		          if (buffer.subarray && (!node.contents || node.contents.subarray)) {
		            if (canOwn) {
		              assert(position === 0, "canOwn must imply no weird position inside the file");
		              node.contents = buffer.subarray(offset, offset + length);
		              node.usedBytes = length;
		              return length;
		            } else if (node.usedBytes === 0 && position === 0) {
		              node.contents = buffer.slice(offset, offset + length);
		              node.usedBytes = length;
		              return length;
		            } else if (position + length <= node.usedBytes) {
		              node.contents.set(buffer.subarray(offset, offset + length), position);
		              return length;
		            }
		          }
		          MEMFS.expandFileStorage(node, position + length);
		          if (node.contents.subarray && buffer.subarray) {
		            node.contents.set(buffer.subarray(offset, offset + length), position);
		          } else {
		            for (var i = 0; i < length; i++) {
		              node.contents[position + i] = buffer[offset + i];
		            }
		          }
		          node.usedBytes = Math.max(node.usedBytes, position + length);
		          return length;
		        },
		        llseek(stream, offset, whence) {
		          var position = offset;
		          if (whence === 1) {
		            position += stream.position;
		          } else if (whence === 2) {
		            if (FS.isFile(stream.node.mode)) {
		              position += stream.node.usedBytes;
		            }
		          }
		          if (position < 0) {
		            throw new FS.ErrnoError(28);
		          }
		          return position;
		        },
		        allocate(stream, offset, length) {
		          MEMFS.expandFileStorage(stream.node, offset + length);
		          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
		        },
		        mmap(stream, length, position, prot, flags) {
		          if (!FS.isFile(stream.node.mode)) {
		            throw new FS.ErrnoError(43);
		          }
		          var ptr;
		          var allocated;
		          var contents = stream.node.contents;
		          if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
		            allocated = false;
		            ptr = contents.byteOffset;
		          } else {
		            if (position > 0 || position + length < contents.length) {
		              if (contents.subarray) {
		                contents = contents.subarray(position, position + length);
		              } else {
		                contents = Array.prototype.slice.call(contents, position, position + length);
		              }
		            }
		            allocated = true;
		            ptr = mmapAlloc();
		            if (!ptr) {
		              throw new FS.ErrnoError(48);
		            }
		            HEAP8.set(contents, ptr);
		          }
		          return { ptr: ptr, allocated: allocated };
		        },
		        msync(stream, buffer, offset, length, mmapFlags) {
		          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
		          return 0;
		        },
		      },
		    };
		    var asyncLoad = (url, onload, onerror, noRunDep) => {
		      var dep = getUniqueRunDependency(`al ${url}`) ;
		      readAsync(url).then(
		        (arrayBuffer) => {
		          assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
		          onload(new Uint8Array(arrayBuffer));
		          if (dep) removeRunDependency(dep);
		        },
		        (err) => {
		          if (onerror) {
		            onerror();
		          } else {
		            throw `Loading data file "${url}" failed.`;
		          }
		        },
		      );
		      if (dep) addRunDependency(dep);
		    };
		    var FS_createDataFile = (parent, name, fileData, canRead, canWrite, canOwn) => {
		      FS.createDataFile(parent, name, fileData, canRead, canWrite, canOwn);
		    };
		    var preloadPlugins = Module["preloadPlugins"] || [];
		    var FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
		      if (typeof Browser != "undefined") Browser.init();
		      var handled = false;
		      preloadPlugins.forEach((plugin) => {
		        if (handled) return;
		        if (plugin["canHandle"](fullname)) {
		          plugin["handle"](byteArray, fullname, finish, onerror);
		          handled = true;
		        }
		      });
		      return handled;
		    };
		    var FS_createPreloadedFile = (
		      parent,
		      name,
		      url,
		      canRead,
		      canWrite,
		      onload,
		      onerror,
		      dontCreateFile,
		      canOwn,
		      preFinish,
		    ) => {
		      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
		      var dep = getUniqueRunDependency(`cp ${fullname}`);
		      function processData(byteArray) {
		        function finish(byteArray) {
		          preFinish?.();
		          if (!dontCreateFile) {
		            FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
		          }
		          onload?.();
		          removeRunDependency(dep);
		        }
		        if (
		          FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
		            onerror?.();
		            removeRunDependency(dep);
		          })
		        ) {
		          return;
		        }
		        finish(byteArray);
		      }
		      addRunDependency(dep);
		      if (typeof url == "string") {
		        asyncLoad(url, processData, onerror);
		      } else {
		        processData(url);
		      }
		    };
		    var FS_modeStringToFlags = (str) => {
		      var flagModes = { r: 0, "r+": 2, w: 512 | 64 | 1, "w+": 512 | 64 | 2, a: 1024 | 64 | 1, "a+": 1024 | 64 | 2 };
		      var flags = flagModes[str];
		      if (typeof flags == "undefined") {
		        throw new Error(`Unknown file open mode: ${str}`);
		      }
		      return flags;
		    };
		    var FS_getMode = (canRead, canWrite) => {
		      var mode = 0;
		      if (canRead) mode |= 292 | 73;
		      if (canWrite) mode |= 146;
		      return mode;
		    };
		    var strError = (errno) => UTF8ToString(_strerror(errno));
		    var ERRNO_CODES = {
		      EPERM: 63,
		      ENOENT: 44,
		      ESRCH: 71,
		      EINTR: 27,
		      EIO: 29,
		      ENXIO: 60,
		      E2BIG: 1,
		      ENOEXEC: 45,
		      EBADF: 8,
		      ECHILD: 12,
		      EAGAIN: 6,
		      EWOULDBLOCK: 6,
		      ENOMEM: 48,
		      EACCES: 2,
		      EFAULT: 21,
		      ENOTBLK: 105,
		      EBUSY: 10,
		      EEXIST: 20,
		      EXDEV: 75,
		      ENODEV: 43,
		      ENOTDIR: 54,
		      EISDIR: 31,
		      EINVAL: 28,
		      ENFILE: 41,
		      EMFILE: 33,
		      ENOTTY: 59,
		      ETXTBSY: 74,
		      EFBIG: 22,
		      ENOSPC: 51,
		      ESPIPE: 70,
		      EROFS: 69,
		      EMLINK: 34,
		      EPIPE: 64,
		      EDOM: 18,
		      ERANGE: 68,
		      ENOMSG: 49,
		      EIDRM: 24,
		      ECHRNG: 106,
		      EL2NSYNC: 156,
		      EL3HLT: 107,
		      EL3RST: 108,
		      ELNRNG: 109,
		      EUNATCH: 110,
		      ENOCSI: 111,
		      EL2HLT: 112,
		      EDEADLK: 16,
		      ENOLCK: 46,
		      EBADE: 113,
		      EBADR: 114,
		      EXFULL: 115,
		      ENOANO: 104,
		      EBADRQC: 103,
		      EBADSLT: 102,
		      EDEADLOCK: 16,
		      EBFONT: 101,
		      ENOSTR: 100,
		      ENODATA: 116,
		      ETIME: 117,
		      ENOSR: 118,
		      ENONET: 119,
		      ENOPKG: 120,
		      EREMOTE: 121,
		      ENOLINK: 47,
		      EADV: 122,
		      ESRMNT: 123,
		      ECOMM: 124,
		      EPROTO: 65,
		      EMULTIHOP: 36,
		      EDOTDOT: 125,
		      EBADMSG: 9,
		      ENOTUNIQ: 126,
		      EBADFD: 127,
		      EREMCHG: 128,
		      ELIBACC: 129,
		      ELIBBAD: 130,
		      ELIBSCN: 131,
		      ELIBMAX: 132,
		      ELIBEXEC: 133,
		      ENOSYS: 52,
		      ENOTEMPTY: 55,
		      ENAMETOOLONG: 37,
		      ELOOP: 32,
		      EOPNOTSUPP: 138,
		      EPFNOSUPPORT: 139,
		      ECONNRESET: 15,
		      ENOBUFS: 42,
		      EAFNOSUPPORT: 5,
		      EPROTOTYPE: 67,
		      ENOTSOCK: 57,
		      ENOPROTOOPT: 50,
		      ESHUTDOWN: 140,
		      ECONNREFUSED: 14,
		      EADDRINUSE: 3,
		      ECONNABORTED: 13,
		      ENETUNREACH: 40,
		      ENETDOWN: 38,
		      ETIMEDOUT: 73,
		      EHOSTDOWN: 142,
		      EHOSTUNREACH: 23,
		      EINPROGRESS: 26,
		      EALREADY: 7,
		      EDESTADDRREQ: 17,
		      EMSGSIZE: 35,
		      EPROTONOSUPPORT: 66,
		      ESOCKTNOSUPPORT: 137,
		      EADDRNOTAVAIL: 4,
		      ENETRESET: 39,
		      EISCONN: 30,
		      ENOTCONN: 53,
		      ETOOMANYREFS: 141,
		      EUSERS: 136,
		      EDQUOT: 19,
		      ESTALE: 72,
		      ENOTSUP: 138,
		      ENOMEDIUM: 148,
		      EILSEQ: 25,
		      EOVERFLOW: 61,
		      ECANCELED: 11,
		      ENOTRECOVERABLE: 56,
		      EOWNERDEAD: 62,
		      ESTRPIPE: 135,
		    };
		    var FS = {
		      root: null,
		      mounts: [],
		      devices: {},
		      streams: [],
		      nextInode: 1,
		      nameTable: null,
		      currentPath: "/",
		      initialized: false,
		      ignorePermissions: true,
		      ErrnoError: class extends Error {
		        constructor(errno) {
		          super(runtimeInitialized ? strError(errno) : "");
		          this.name = "ErrnoError";
		          this.errno = errno;
		          for (var key in ERRNO_CODES) {
		            if (ERRNO_CODES[key] === errno) {
		              this.code = key;
		              break;
		            }
		          }
		        }
		      },
		      genericErrors: {},
		      filesystems: null,
		      syncFSRequests: 0,
		      FSStream: class {
		        constructor() {
		          this.shared = {};
		        }
		        get object() {
		          return this.node;
		        }
		        set object(val) {
		          this.node = val;
		        }
		        get isRead() {
		          return (this.flags & 2097155) !== 1;
		        }
		        get isWrite() {
		          return (this.flags & 2097155) !== 0;
		        }
		        get isAppend() {
		          return this.flags & 1024;
		        }
		        get flags() {
		          return this.shared.flags;
		        }
		        set flags(val) {
		          this.shared.flags = val;
		        }
		        get position() {
		          return this.shared.position;
		        }
		        set position(val) {
		          this.shared.position = val;
		        }
		      },
		      FSNode: class {
		        constructor(parent, name, mode, rdev) {
		          if (!parent) {
		            parent = this;
		          }
		          this.parent = parent;
		          this.mount = parent.mount;
		          this.mounted = null;
		          this.id = FS.nextInode++;
		          this.name = name;
		          this.mode = mode;
		          this.node_ops = {};
		          this.stream_ops = {};
		          this.rdev = rdev;
		          this.readMode = 292 | 73;
		          this.writeMode = 146;
		        }
		        get read() {
		          return (this.mode & this.readMode) === this.readMode;
		        }
		        set read(val) {
		          val ? (this.mode |= this.readMode) : (this.mode &= ~this.readMode);
		        }
		        get write() {
		          return (this.mode & this.writeMode) === this.writeMode;
		        }
		        set write(val) {
		          val ? (this.mode |= this.writeMode) : (this.mode &= ~this.writeMode);
		        }
		        get isFolder() {
		          return FS.isDir(this.mode);
		        }
		        get isDevice() {
		          return FS.isChrdev(this.mode);
		        }
		      },
		      lookupPath(path, opts = {}) {
		        path = PATH_FS.resolve(path);
		        if (!path) return { path: "", node: null };
		        var defaults = { follow_mount: true, recurse_count: 0 };
		        opts = Object.assign(defaults, opts);
		        if (opts.recurse_count > 8) {
		          throw new FS.ErrnoError(32);
		        }
		        var parts = path.split("/").filter((p) => !!p);
		        var current = FS.root;
		        var current_path = "/";
		        for (var i = 0; i < parts.length; i++) {
		          var islast = i === parts.length - 1;
		          if (islast && opts.parent) {
		            break;
		          }
		          current = FS.lookupNode(current, parts[i]);
		          current_path = PATH.join2(current_path, parts[i]);
		          if (FS.isMountpoint(current)) {
		            if (!islast || (islast && opts.follow_mount)) {
		              current = current.mounted.root;
		            }
		          }
		          if (!islast || opts.follow) {
		            var count = 0;
		            while (FS.isLink(current.mode)) {
		              var link = FS.readlink(current_path);
		              current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
		              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count + 1 });
		              current = lookup.node;
		              if (count++ > 40) {
		                throw new FS.ErrnoError(32);
		              }
		            }
		          }
		        }
		        return { path: current_path, node: current };
		      },
		      getPath(node) {
		        var path;
		        while (true) {
		          if (FS.isRoot(node)) {
		            var mount = node.mount.mountpoint;
		            if (!path) return mount;
		            return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
		          }
		          path = path ? `${node.name}/${path}` : node.name;
		          node = node.parent;
		        }
		      },
		      hashName(parentid, name) {
		        var hash = 0;
		        for (var i = 0; i < name.length; i++) {
		          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
		        }
		        return ((parentid + hash) >>> 0) % FS.nameTable.length;
		      },
		      hashAddNode(node) {
		        var hash = FS.hashName(node.parent.id, node.name);
		        node.name_next = FS.nameTable[hash];
		        FS.nameTable[hash] = node;
		      },
		      hashRemoveNode(node) {
		        var hash = FS.hashName(node.parent.id, node.name);
		        if (FS.nameTable[hash] === node) {
		          FS.nameTable[hash] = node.name_next;
		        } else {
		          var current = FS.nameTable[hash];
		          while (current) {
		            if (current.name_next === node) {
		              current.name_next = node.name_next;
		              break;
		            }
		            current = current.name_next;
		          }
		        }
		      },
		      lookupNode(parent, name) {
		        var errCode = FS.mayLookup(parent);
		        if (errCode) {
		          throw new FS.ErrnoError(errCode);
		        }
		        var hash = FS.hashName(parent.id, name);
		        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
		          var nodeName = node.name;
		          if (node.parent.id === parent.id && nodeName === name) {
		            return node;
		          }
		        }
		        return FS.lookup(parent, name);
		      },
		      createNode(parent, name, mode, rdev) {
		        assert(typeof parent == "object");
		        var node = new FS.FSNode(parent, name, mode, rdev);
		        FS.hashAddNode(node);
		        return node;
		      },
		      destroyNode(node) {
		        FS.hashRemoveNode(node);
		      },
		      isRoot(node) {
		        return node === node.parent;
		      },
		      isMountpoint(node) {
		        return !!node.mounted;
		      },
		      isFile(mode) {
		        return (mode & 61440) === 32768;
		      },
		      isDir(mode) {
		        return (mode & 61440) === 16384;
		      },
		      isLink(mode) {
		        return (mode & 61440) === 40960;
		      },
		      isChrdev(mode) {
		        return (mode & 61440) === 8192;
		      },
		      isBlkdev(mode) {
		        return (mode & 61440) === 24576;
		      },
		      isFIFO(mode) {
		        return (mode & 61440) === 4096;
		      },
		      isSocket(mode) {
		        return (mode & 49152) === 49152;
		      },
		      flagsToPermissionString(flag) {
		        var perms = ["r", "w", "rw"][flag & 3];
		        if (flag & 512) {
		          perms += "w";
		        }
		        return perms;
		      },
		      nodePermissions(node, perms) {
		        if (FS.ignorePermissions) {
		          return 0;
		        }
		        if (perms.includes("r") && !(node.mode & 292)) {
		          return 2;
		        } else if (perms.includes("w") && !(node.mode & 146)) {
		          return 2;
		        } else if (perms.includes("x") && !(node.mode & 73)) {
		          return 2;
		        }
		        return 0;
		      },
		      mayLookup(dir) {
		        if (!FS.isDir(dir.mode)) return 54;
		        var errCode = FS.nodePermissions(dir, "x");
		        if (errCode) return errCode;
		        if (!dir.node_ops.lookup) return 2;
		        return 0;
		      },
		      mayCreate(dir, name) {
		        try {
		          var node = FS.lookupNode(dir, name);
		          return 20;
		        } catch (e) {}
		        return FS.nodePermissions(dir, "wx");
		      },
		      mayDelete(dir, name, isdir) {
		        var node;
		        try {
		          node = FS.lookupNode(dir, name);
		        } catch (e) {
		          return e.errno;
		        }
		        var errCode = FS.nodePermissions(dir, "wx");
		        if (errCode) {
		          return errCode;
		        }
		        if (isdir) {
		          if (!FS.isDir(node.mode)) {
		            return 54;
		          }
		          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
		            return 10;
		          }
		        } else {
		          if (FS.isDir(node.mode)) {
		            return 31;
		          }
		        }
		        return 0;
		      },
		      mayOpen(node, flags) {
		        if (!node) {
		          return 44;
		        }
		        if (FS.isLink(node.mode)) {
		          return 32;
		        } else if (FS.isDir(node.mode)) {
		          if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
		            return 31;
		          }
		        }
		        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
		      },
		      MAX_OPEN_FDS: 4096,
		      nextfd() {
		        for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
		          if (!FS.streams[fd]) {
		            return fd;
		          }
		        }
		        throw new FS.ErrnoError(33);
		      },
		      getStreamChecked(fd) {
		        var stream = FS.getStream(fd);
		        if (!stream) {
		          throw new FS.ErrnoError(8);
		        }
		        return stream;
		      },
		      getStream: (fd) => FS.streams[fd],
		      createStream(stream, fd = -1) {
		        assert(fd >= -1);
		        stream = Object.assign(new FS.FSStream(), stream);
		        if (fd == -1) {
		          fd = FS.nextfd();
		        }
		        stream.fd = fd;
		        FS.streams[fd] = stream;
		        return stream;
		      },
		      closeStream(fd) {
		        FS.streams[fd] = null;
		      },
		      dupStream(origStream, fd = -1) {
		        var stream = FS.createStream(origStream, fd);
		        stream.stream_ops?.dup?.(stream);
		        return stream;
		      },
		      chrdev_stream_ops: {
		        open(stream) {
		          var device = FS.getDevice(stream.node.rdev);
		          stream.stream_ops = device.stream_ops;
		          stream.stream_ops.open?.(stream);
		        },
		        llseek() {
		          throw new FS.ErrnoError(70);
		        },
		      },
		      major: (dev) => dev >> 8,
		      minor: (dev) => dev & 255,
		      makedev: (ma, mi) => (ma << 8) | mi,
		      registerDevice(dev, ops) {
		        FS.devices[dev] = { stream_ops: ops };
		      },
		      getDevice: (dev) => FS.devices[dev],
		      getMounts(mount) {
		        var mounts = [];
		        var check = [mount];
		        while (check.length) {
		          var m = check.pop();
		          mounts.push(m);
		          check.push(...m.mounts);
		        }
		        return mounts;
		      },
		      syncfs(populate, callback) {
		        if (typeof populate == "function") {
		          callback = populate;
		          populate = false;
		        }
		        FS.syncFSRequests++;
		        if (FS.syncFSRequests > 1) {
		          err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
		        }
		        var mounts = FS.getMounts(FS.root.mount);
		        var completed = 0;
		        function doCallback(errCode) {
		          assert(FS.syncFSRequests > 0);
		          FS.syncFSRequests--;
		          return callback(errCode);
		        }
		        function done(errCode) {
		          if (errCode) {
		            if (!done.errored) {
		              done.errored = true;
		              return doCallback(errCode);
		            }
		            return;
		          }
		          if (++completed >= mounts.length) {
		            doCallback(null);
		          }
		        }
		        mounts.forEach((mount) => {
		          if (!mount.type.syncfs) {
		            return done(null);
		          }
		          mount.type.syncfs(mount, populate, done);
		        });
		      },
		      mount(type, opts, mountpoint) {
		        if (typeof type == "string") {
		          throw type;
		        }
		        var root = mountpoint === "/";
		        var pseudo = !mountpoint;
		        var node;
		        if (root && FS.root) {
		          throw new FS.ErrnoError(10);
		        } else if (!root && !pseudo) {
		          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
		          mountpoint = lookup.path;
		          node = lookup.node;
		          if (FS.isMountpoint(node)) {
		            throw new FS.ErrnoError(10);
		          }
		          if (!FS.isDir(node.mode)) {
		            throw new FS.ErrnoError(54);
		          }
		        }
		        var mount = { type: type, opts: opts, mountpoint: mountpoint, mounts: [] };
		        var mountRoot = type.mount(mount);
		        mountRoot.mount = mount;
		        mount.root = mountRoot;
		        if (root) {
		          FS.root = mountRoot;
		        } else if (node) {
		          node.mounted = mount;
		          if (node.mount) {
		            node.mount.mounts.push(mount);
		          }
		        }
		        return mountRoot;
		      },
		      unmount(mountpoint) {
		        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
		        if (!FS.isMountpoint(lookup.node)) {
		          throw new FS.ErrnoError(28);
		        }
		        var node = lookup.node;
		        var mount = node.mounted;
		        var mounts = FS.getMounts(mount);
		        Object.keys(FS.nameTable).forEach((hash) => {
		          var current = FS.nameTable[hash];
		          while (current) {
		            var next = current.name_next;
		            if (mounts.includes(current.mount)) {
		              FS.destroyNode(current);
		            }
		            current = next;
		          }
		        });
		        node.mounted = null;
		        var idx = node.mount.mounts.indexOf(mount);
		        assert(idx !== -1);
		        node.mount.mounts.splice(idx, 1);
		      },
		      lookup(parent, name) {
		        return parent.node_ops.lookup(parent, name);
		      },
		      mknod(path, mode, dev) {
		        var lookup = FS.lookupPath(path, { parent: true });
		        var parent = lookup.node;
		        var name = PATH.basename(path);
		        if (!name || name === "." || name === "..") {
		          throw new FS.ErrnoError(28);
		        }
		        var errCode = FS.mayCreate(parent, name);
		        if (errCode) {
		          throw new FS.ErrnoError(errCode);
		        }
		        if (!parent.node_ops.mknod) {
		          throw new FS.ErrnoError(63);
		        }
		        return parent.node_ops.mknod(parent, name, mode, dev);
		      },
		      create(path, mode) {
		        mode = mode !== undefined ? mode : 438;
		        mode &= 4095;
		        mode |= 32768;
		        return FS.mknod(path, mode, 0);
		      },
		      mkdir(path, mode) {
		        mode = mode !== undefined ? mode : 511;
		        mode &= 511 | 512;
		        mode |= 16384;
		        return FS.mknod(path, mode, 0);
		      },
		      mkdirTree(path, mode) {
		        var dirs = path.split("/");
		        var d = "";
		        for (var i = 0; i < dirs.length; ++i) {
		          if (!dirs[i]) continue;
		          d += "/" + dirs[i];
		          try {
		            FS.mkdir(d, mode);
		          } catch (e) {
		            if (e.errno != 20) throw e;
		          }
		        }
		      },
		      mkdev(path, mode, dev) {
		        if (typeof dev == "undefined") {
		          dev = mode;
		          mode = 438;
		        }
		        mode |= 8192;
		        return FS.mknod(path, mode, dev);
		      },
		      symlink(oldpath, newpath) {
		        if (!PATH_FS.resolve(oldpath)) {
		          throw new FS.ErrnoError(44);
		        }
		        var lookup = FS.lookupPath(newpath, { parent: true });
		        var parent = lookup.node;
		        if (!parent) {
		          throw new FS.ErrnoError(44);
		        }
		        var newname = PATH.basename(newpath);
		        var errCode = FS.mayCreate(parent, newname);
		        if (errCode) {
		          throw new FS.ErrnoError(errCode);
		        }
		        if (!parent.node_ops.symlink) {
		          throw new FS.ErrnoError(63);
		        }
		        return parent.node_ops.symlink(parent, newname, oldpath);
		      },
		      rename(old_path, new_path) {
		        var old_dirname = PATH.dirname(old_path);
		        var new_dirname = PATH.dirname(new_path);
		        var old_name = PATH.basename(old_path);
		        var new_name = PATH.basename(new_path);
		        var lookup, old_dir, new_dir;
		        lookup = FS.lookupPath(old_path, { parent: true });
		        old_dir = lookup.node;
		        lookup = FS.lookupPath(new_path, { parent: true });
		        new_dir = lookup.node;
		        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
		        if (old_dir.mount !== new_dir.mount) {
		          throw new FS.ErrnoError(75);
		        }
		        var old_node = FS.lookupNode(old_dir, old_name);
		        var relative = PATH_FS.relative(old_path, new_dirname);
		        if (relative.charAt(0) !== ".") {
		          throw new FS.ErrnoError(28);
		        }
		        relative = PATH_FS.relative(new_path, old_dirname);
		        if (relative.charAt(0) !== ".") {
		          throw new FS.ErrnoError(55);
		        }
		        var new_node;
		        try {
		          new_node = FS.lookupNode(new_dir, new_name);
		        } catch (e) {}
		        if (old_node === new_node) {
		          return;
		        }
		        var isdir = FS.isDir(old_node.mode);
		        var errCode = FS.mayDelete(old_dir, old_name, isdir);
		        if (errCode) {
		          throw new FS.ErrnoError(errCode);
		        }
		        errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
		        if (errCode) {
		          throw new FS.ErrnoError(errCode);
		        }
		        if (!old_dir.node_ops.rename) {
		          throw new FS.ErrnoError(63);
		        }
		        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
		          throw new FS.ErrnoError(10);
		        }
		        if (new_dir !== old_dir) {
		          errCode = FS.nodePermissions(old_dir, "w");
		          if (errCode) {
		            throw new FS.ErrnoError(errCode);
		          }
		        }
		        FS.hashRemoveNode(old_node);
		        try {
		          old_dir.node_ops.rename(old_node, new_dir, new_name);
		          old_node.parent = new_dir;
		        } catch (e) {
		          throw e;
		        } finally {
		          FS.hashAddNode(old_node);
		        }
		      },
		      rmdir(path) {
		        var lookup = FS.lookupPath(path, { parent: true });
		        var parent = lookup.node;
		        var name = PATH.basename(path);
		        var node = FS.lookupNode(parent, name);
		        var errCode = FS.mayDelete(parent, name, true);
		        if (errCode) {
		          throw new FS.ErrnoError(errCode);
		        }
		        if (!parent.node_ops.rmdir) {
		          throw new FS.ErrnoError(63);
		        }
		        if (FS.isMountpoint(node)) {
		          throw new FS.ErrnoError(10);
		        }
		        parent.node_ops.rmdir(parent, name);
		        FS.destroyNode(node);
		      },
		      readdir(path) {
		        var lookup = FS.lookupPath(path, { follow: true });
		        var node = lookup.node;
		        if (!node.node_ops.readdir) {
		          throw new FS.ErrnoError(54);
		        }
		        return node.node_ops.readdir(node);
		      },
		      unlink(path) {
		        var lookup = FS.lookupPath(path, { parent: true });
		        var parent = lookup.node;
		        if (!parent) {
		          throw new FS.ErrnoError(44);
		        }
		        var name = PATH.basename(path);
		        var node = FS.lookupNode(parent, name);
		        var errCode = FS.mayDelete(parent, name, false);
		        if (errCode) {
		          throw new FS.ErrnoError(errCode);
		        }
		        if (!parent.node_ops.unlink) {
		          throw new FS.ErrnoError(63);
		        }
		        if (FS.isMountpoint(node)) {
		          throw new FS.ErrnoError(10);
		        }
		        parent.node_ops.unlink(parent, name);
		        FS.destroyNode(node);
		      },
		      readlink(path) {
		        var lookup = FS.lookupPath(path);
		        var link = lookup.node;
		        if (!link) {
		          throw new FS.ErrnoError(44);
		        }
		        if (!link.node_ops.readlink) {
		          throw new FS.ErrnoError(28);
		        }
		        return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
		      },
		      stat(path, dontFollow) {
		        var lookup = FS.lookupPath(path, { follow: !dontFollow });
		        var node = lookup.node;
		        if (!node) {
		          throw new FS.ErrnoError(44);
		        }
		        if (!node.node_ops.getattr) {
		          throw new FS.ErrnoError(63);
		        }
		        return node.node_ops.getattr(node);
		      },
		      lstat(path) {
		        return FS.stat(path, true);
		      },
		      chmod(path, mode, dontFollow) {
		        var node;
		        if (typeof path == "string") {
		          var lookup = FS.lookupPath(path, { follow: !dontFollow });
		          node = lookup.node;
		        } else {
		          node = path;
		        }
		        if (!node.node_ops.setattr) {
		          throw new FS.ErrnoError(63);
		        }
		        node.node_ops.setattr(node, { mode: (mode & 4095) | (node.mode & ~4095), timestamp: Date.now() });
		      },
		      lchmod(path, mode) {
		        FS.chmod(path, mode, true);
		      },
		      fchmod(fd, mode) {
		        var stream = FS.getStreamChecked(fd);
		        FS.chmod(stream.node, mode);
		      },
		      chown(path, uid, gid, dontFollow) {
		        var node;
		        if (typeof path == "string") {
		          var lookup = FS.lookupPath(path, { follow: !dontFollow });
		          node = lookup.node;
		        } else {
		          node = path;
		        }
		        if (!node.node_ops.setattr) {
		          throw new FS.ErrnoError(63);
		        }
		        node.node_ops.setattr(node, { timestamp: Date.now() });
		      },
		      lchown(path, uid, gid) {
		        FS.chown(path, uid, gid, true);
		      },
		      fchown(fd, uid, gid) {
		        var stream = FS.getStreamChecked(fd);
		        FS.chown(stream.node, uid, gid);
		      },
		      truncate(path, len) {
		        if (len < 0) {
		          throw new FS.ErrnoError(28);
		        }
		        var node;
		        if (typeof path == "string") {
		          var lookup = FS.lookupPath(path, { follow: true });
		          node = lookup.node;
		        } else {
		          node = path;
		        }
		        if (!node.node_ops.setattr) {
		          throw new FS.ErrnoError(63);
		        }
		        if (FS.isDir(node.mode)) {
		          throw new FS.ErrnoError(31);
		        }
		        if (!FS.isFile(node.mode)) {
		          throw new FS.ErrnoError(28);
		        }
		        var errCode = FS.nodePermissions(node, "w");
		        if (errCode) {
		          throw new FS.ErrnoError(errCode);
		        }
		        node.node_ops.setattr(node, { size: len, timestamp: Date.now() });
		      },
		      ftruncate(fd, len) {
		        var stream = FS.getStreamChecked(fd);
		        if ((stream.flags & 2097155) === 0) {
		          throw new FS.ErrnoError(28);
		        }
		        FS.truncate(stream.node, len);
		      },
		      utime(path, atime, mtime) {
		        var lookup = FS.lookupPath(path, { follow: true });
		        var node = lookup.node;
		        node.node_ops.setattr(node, { timestamp: Math.max(atime, mtime) });
		      },
		      open(path, flags, mode) {
		        if (path === "") {
		          throw new FS.ErrnoError(44);
		        }
		        flags = typeof flags == "string" ? FS_modeStringToFlags(flags) : flags;
		        if (flags & 64) {
		          mode = typeof mode == "undefined" ? 438 : mode;
		          mode = (mode & 4095) | 32768;
		        } else {
		          mode = 0;
		        }
		        var node;
		        if (typeof path == "object") {
		          node = path;
		        } else {
		          path = PATH.normalize(path);
		          try {
		            var lookup = FS.lookupPath(path, { follow: !(flags & 131072) });
		            node = lookup.node;
		          } catch (e) {}
		        }
		        var created = false;
		        if (flags & 64) {
		          if (node) {
		            if (flags & 128) {
		              throw new FS.ErrnoError(20);
		            }
		          } else {
		            node = FS.mknod(path, mode, 0);
		            created = true;
		          }
		        }
		        if (!node) {
		          throw new FS.ErrnoError(44);
		        }
		        if (FS.isChrdev(node.mode)) {
		          flags &= ~512;
		        }
		        if (flags & 65536 && !FS.isDir(node.mode)) {
		          throw new FS.ErrnoError(54);
		        }
		        if (!created) {
		          var errCode = FS.mayOpen(node, flags);
		          if (errCode) {
		            throw new FS.ErrnoError(errCode);
		          }
		        }
		        if (flags & 512 && !created) {
		          FS.truncate(node, 0);
		        }
		        flags &= ~(128 | 512 | 131072);
		        var stream = FS.createStream({
		          node: node,
		          path: FS.getPath(node),
		          flags: flags,
		          seekable: true,
		          position: 0,
		          stream_ops: node.stream_ops,
		          ungotten: [],
		          error: false,
		        });
		        if (stream.stream_ops.open) {
		          stream.stream_ops.open(stream);
		        }
		        if (Module["logReadFiles"] && !(flags & 1)) {
		          if (!FS.readFiles) FS.readFiles = {};
		          if (!(path in FS.readFiles)) {
		            FS.readFiles[path] = 1;
		          }
		        }
		        return stream;
		      },
		      close(stream) {
		        if (FS.isClosed(stream)) {
		          throw new FS.ErrnoError(8);
		        }
		        if (stream.getdents) stream.getdents = null;
		        try {
		          if (stream.stream_ops.close) {
		            stream.stream_ops.close(stream);
		          }
		        } catch (e) {
		          throw e;
		        } finally {
		          FS.closeStream(stream.fd);
		        }
		        stream.fd = null;
		      },
		      isClosed(stream) {
		        return stream.fd === null;
		      },
		      llseek(stream, offset, whence) {
		        if (FS.isClosed(stream)) {
		          throw new FS.ErrnoError(8);
		        }
		        if (!stream.seekable || !stream.stream_ops.llseek) {
		          throw new FS.ErrnoError(70);
		        }
		        if (whence != 0 && whence != 1 && whence != 2) {
		          throw new FS.ErrnoError(28);
		        }
		        stream.position = stream.stream_ops.llseek(stream, offset, whence);
		        stream.ungotten = [];
		        return stream.position;
		      },
		      read(stream, buffer, offset, length, position) {
		        assert(offset >= 0);
		        if (length < 0 || position < 0) {
		          throw new FS.ErrnoError(28);
		        }
		        if (FS.isClosed(stream)) {
		          throw new FS.ErrnoError(8);
		        }
		        if ((stream.flags & 2097155) === 1) {
		          throw new FS.ErrnoError(8);
		        }
		        if (FS.isDir(stream.node.mode)) {
		          throw new FS.ErrnoError(31);
		        }
		        if (!stream.stream_ops.read) {
		          throw new FS.ErrnoError(28);
		        }
		        var seeking = typeof position != "undefined";
		        if (!seeking) {
		          position = stream.position;
		        } else if (!stream.seekable) {
		          throw new FS.ErrnoError(70);
		        }
		        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
		        if (!seeking) stream.position += bytesRead;
		        return bytesRead;
		      },
		      write(stream, buffer, offset, length, position, canOwn) {
		        assert(offset >= 0);
		        if (length < 0 || position < 0) {
		          throw new FS.ErrnoError(28);
		        }
		        if (FS.isClosed(stream)) {
		          throw new FS.ErrnoError(8);
		        }
		        if ((stream.flags & 2097155) === 0) {
		          throw new FS.ErrnoError(8);
		        }
		        if (FS.isDir(stream.node.mode)) {
		          throw new FS.ErrnoError(31);
		        }
		        if (!stream.stream_ops.write) {
		          throw new FS.ErrnoError(28);
		        }
		        if (stream.seekable && stream.flags & 1024) {
		          FS.llseek(stream, 0, 2);
		        }
		        var seeking = typeof position != "undefined";
		        if (!seeking) {
		          position = stream.position;
		        } else if (!stream.seekable) {
		          throw new FS.ErrnoError(70);
		        }
		        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
		        if (!seeking) stream.position += bytesWritten;
		        return bytesWritten;
		      },
		      allocate(stream, offset, length) {
		        if (FS.isClosed(stream)) {
		          throw new FS.ErrnoError(8);
		        }
		        if (offset < 0 || length <= 0) {
		          throw new FS.ErrnoError(28);
		        }
		        if ((stream.flags & 2097155) === 0) {
		          throw new FS.ErrnoError(8);
		        }
		        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
		          throw new FS.ErrnoError(43);
		        }
		        if (!stream.stream_ops.allocate) {
		          throw new FS.ErrnoError(138);
		        }
		        stream.stream_ops.allocate(stream, offset, length);
		      },
		      mmap(stream, length, position, prot, flags) {
		        if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
		          throw new FS.ErrnoError(2);
		        }
		        if ((stream.flags & 2097155) === 1) {
		          throw new FS.ErrnoError(2);
		        }
		        if (!stream.stream_ops.mmap) {
		          throw new FS.ErrnoError(43);
		        }
		        return stream.stream_ops.mmap(stream, length, position, prot, flags);
		      },
		      msync(stream, buffer, offset, length, mmapFlags) {
		        assert(offset >= 0);
		        if (!stream.stream_ops.msync) {
		          return 0;
		        }
		        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
		      },
		      ioctl(stream, cmd, arg) {
		        if (!stream.stream_ops.ioctl) {
		          throw new FS.ErrnoError(59);
		        }
		        return stream.stream_ops.ioctl(stream, cmd, arg);
		      },
		      readFile(path, opts = {}) {
		        opts.flags = opts.flags || 0;
		        opts.encoding = opts.encoding || "binary";
		        if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
		          throw new Error(`Invalid encoding type "${opts.encoding}"`);
		        }
		        var ret;
		        var stream = FS.open(path, opts.flags);
		        var stat = FS.stat(path);
		        var length = stat.size;
		        var buf = new Uint8Array(length);
		        FS.read(stream, buf, 0, length, 0);
		        if (opts.encoding === "utf8") {
		          ret = UTF8ArrayToString(buf, 0);
		        } else if (opts.encoding === "binary") {
		          ret = buf;
		        }
		        FS.close(stream);
		        return ret;
		      },
		      writeFile(path, data, opts = {}) {
		        opts.flags = opts.flags || 577;
		        var stream = FS.open(path, opts.flags, opts.mode);
		        if (typeof data == "string") {
		          var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
		          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
		          FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
		        } else if (ArrayBuffer.isView(data)) {
		          FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
		        } else {
		          throw new Error("Unsupported data type");
		        }
		        FS.close(stream);
		      },
		      cwd: () => FS.currentPath,
		      chdir(path) {
		        var lookup = FS.lookupPath(path, { follow: true });
		        if (lookup.node === null) {
		          throw new FS.ErrnoError(44);
		        }
		        if (!FS.isDir(lookup.node.mode)) {
		          throw new FS.ErrnoError(54);
		        }
		        var errCode = FS.nodePermissions(lookup.node, "x");
		        if (errCode) {
		          throw new FS.ErrnoError(errCode);
		        }
		        FS.currentPath = lookup.path;
		      },
		      createDefaultDirectories() {
		        FS.mkdir("/tmp");
		        FS.mkdir("/home");
		        FS.mkdir("/home/web_user");
		      },
		      createDefaultDevices() {
		        FS.mkdir("/dev");
		        FS.registerDevice(FS.makedev(1, 3), { read: () => 0, write: (stream, buffer, offset, length, pos) => length });
		        FS.mkdev("/dev/null", FS.makedev(1, 3));
		        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
		        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
		        FS.mkdev("/dev/tty", FS.makedev(5, 0));
		        FS.mkdev("/dev/tty1", FS.makedev(6, 0));
		        var randomBuffer = new Uint8Array(1024),
		          randomLeft = 0;
		        var randomByte = () => {
		          if (randomLeft === 0) {
		            randomLeft = randomFill(randomBuffer).byteLength;
		          }
		          return randomBuffer[--randomLeft];
		        };
		        FS.createDevice("/dev", "random", randomByte);
		        FS.createDevice("/dev", "urandom", randomByte);
		        FS.mkdir("/dev/shm");
		        FS.mkdir("/dev/shm/tmp");
		      },
		      createSpecialDirectories() {
		        FS.mkdir("/proc");
		        var proc_self = FS.mkdir("/proc/self");
		        FS.mkdir("/proc/self/fd");
		        FS.mount(
		          {
		            mount() {
		              var node = FS.createNode(proc_self, "fd", 16384 | 511, 73);
		              node.node_ops = {
		                lookup(parent, name) {
		                  var fd = +name;
		                  var stream = FS.getStreamChecked(fd);
		                  var ret = { parent: null, mount: { mountpoint: "fake" }, node_ops: { readlink: () => stream.path } };
		                  ret.parent = ret;
		                  return ret;
		                },
		              };
		              return node;
		            },
		          },
		          {},
		          "/proc/self/fd",
		        );
		      },
		      createStandardStreams() {
		        if (Module["stdin"]) {
		          FS.createDevice("/dev", "stdin", Module["stdin"]);
		        } else {
		          FS.symlink("/dev/tty", "/dev/stdin");
		        }
		        if (Module["stdout"]) {
		          FS.createDevice("/dev", "stdout", null, Module["stdout"]);
		        } else {
		          FS.symlink("/dev/tty", "/dev/stdout");
		        }
		        if (Module["stderr"]) {
		          FS.createDevice("/dev", "stderr", null, Module["stderr"]);
		        } else {
		          FS.symlink("/dev/tty1", "/dev/stderr");
		        }
		        var stdin = FS.open("/dev/stdin", 0);
		        var stdout = FS.open("/dev/stdout", 1);
		        var stderr = FS.open("/dev/stderr", 1);
		        assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
		        assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
		        assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
		      },
		      staticInit() {
		        [44].forEach((code) => {
		          FS.genericErrors[code] = new FS.ErrnoError(code);
		          FS.genericErrors[code].stack = "<generic error, no stack>";
		        });
		        FS.nameTable = new Array(4096);
		        FS.mount(MEMFS, {}, "/");
		        FS.createDefaultDirectories();
		        FS.createDefaultDevices();
		        FS.createSpecialDirectories();
		        FS.filesystems = { MEMFS: MEMFS };
		      },
		      init(input, output, error) {
		        assert(
		          !FS.init.initialized,
		          "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)",
		        );
		        FS.init.initialized = true;
		        Module["stdin"] = input || Module["stdin"];
		        Module["stdout"] = output || Module["stdout"];
		        Module["stderr"] = error || Module["stderr"];
		        FS.createStandardStreams();
		      },
		      quit() {
		        FS.init.initialized = false;
		        _fflush(0);
		        for (var i = 0; i < FS.streams.length; i++) {
		          var stream = FS.streams[i];
		          if (!stream) {
		            continue;
		          }
		          FS.close(stream);
		        }
		      },
		      findObject(path, dontResolveLastLink) {
		        var ret = FS.analyzePath(path, dontResolveLastLink);
		        if (!ret.exists) {
		          return null;
		        }
		        return ret.object;
		      },
		      analyzePath(path, dontResolveLastLink) {
		        try {
		          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
		          path = lookup.path;
		        } catch (e) {}
		        var ret = {
		          isRoot: false,
		          exists: false,
		          error: 0,
		          name: null,
		          path: null,
		          object: null,
		          parentExists: false,
		          parentPath: null,
		          parentObject: null,
		        };
		        try {
		          var lookup = FS.lookupPath(path, { parent: true });
		          ret.parentExists = true;
		          ret.parentPath = lookup.path;
		          ret.parentObject = lookup.node;
		          ret.name = PATH.basename(path);
		          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
		          ret.exists = true;
		          ret.path = lookup.path;
		          ret.object = lookup.node;
		          ret.name = lookup.node.name;
		          ret.isRoot = lookup.path === "/";
		        } catch (e) {
		          ret.error = e.errno;
		        }
		        return ret;
		      },
		      createPath(parent, path, canRead, canWrite) {
		        parent = typeof parent == "string" ? parent : FS.getPath(parent);
		        var parts = path.split("/").reverse();
		        while (parts.length) {
		          var part = parts.pop();
		          if (!part) continue;
		          var current = PATH.join2(parent, part);
		          try {
		            FS.mkdir(current);
		          } catch (e) {}
		          parent = current;
		        }
		        return current;
		      },
		      createFile(parent, name, properties, canRead, canWrite) {
		        var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
		        var mode = FS_getMode(canRead, canWrite);
		        return FS.create(path, mode);
		      },
		      createDataFile(parent, name, data, canRead, canWrite, canOwn) {
		        var path = name;
		        if (parent) {
		          parent = typeof parent == "string" ? parent : FS.getPath(parent);
		          path = name ? PATH.join2(parent, name) : parent;
		        }
		        var mode = FS_getMode(canRead, canWrite);
		        var node = FS.create(path, mode);
		        if (data) {
		          if (typeof data == "string") {
		            var arr = new Array(data.length);
		            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
		            data = arr;
		          }
		          FS.chmod(node, mode | 146);
		          var stream = FS.open(node, 577);
		          FS.write(stream, data, 0, data.length, 0, canOwn);
		          FS.close(stream);
		          FS.chmod(node, mode);
		        }
		      },
		      createDevice(parent, name, input, output) {
		        var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
		        var mode = FS_getMode(!!input, !!output);
		        if (!FS.createDevice.major) FS.createDevice.major = 64;
		        var dev = FS.makedev(FS.createDevice.major++, 0);
		        FS.registerDevice(dev, {
		          open(stream) {
		            stream.seekable = false;
		          },
		          close(stream) {
		            if (output?.buffer?.length) {
		              output(10);
		            }
		          },
		          read(stream, buffer, offset, length, pos) {
		            var bytesRead = 0;
		            for (var i = 0; i < length; i++) {
		              var result;
		              try {
		                result = input();
		              } catch (e) {
		                throw new FS.ErrnoError(29);
		              }
		              if (result === undefined && bytesRead === 0) {
		                throw new FS.ErrnoError(6);
		              }
		              if (result === null || result === undefined) break;
		              bytesRead++;
		              buffer[offset + i] = result;
		            }
		            if (bytesRead) {
		              stream.node.timestamp = Date.now();
		            }
		            return bytesRead;
		          },
		          write(stream, buffer, offset, length, pos) {
		            for (var i = 0; i < length; i++) {
		              try {
		                output(buffer[offset + i]);
		              } catch (e) {
		                throw new FS.ErrnoError(29);
		              }
		            }
		            if (length) {
		              stream.node.timestamp = Date.now();
		            }
		            return i;
		          },
		        });
		        return FS.mkdev(path, mode, dev);
		      },
		      forceLoadFile(obj) {
		        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
		        if (typeof XMLHttpRequest != "undefined") {
		          throw new Error(
		            "Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.",
		          );
		        } else {
		          try {
		            obj.contents = readBinary(obj.url);
		            obj.usedBytes = obj.contents.length;
		          } catch (e) {
		            throw new FS.ErrnoError(29);
		          }
		        }
		      },
		      createLazyFile(parent, name, url, canRead, canWrite) {
		        class LazyUint8Array {
		          constructor() {
		            this.lengthKnown = false;
		            this.chunks = [];
		          }
		          get(idx) {
		            if (idx > this.length - 1 || idx < 0) {
		              return undefined;
		            }
		            var chunkOffset = idx % this.chunkSize;
		            var chunkNum = (idx / this.chunkSize) | 0;
		            return this.getter(chunkNum)[chunkOffset];
		          }
		          setDataGetter(getter) {
		            this.getter = getter;
		          }
		          cacheLength() {
		            var xhr = new XMLHttpRequest();
		            xhr.open("HEAD", url, false);
		            xhr.send(null);
		            if (!((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304))
		              throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
		            var datalength = Number(xhr.getResponseHeader("Content-length"));
		            var header;
		            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
		            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
		            var chunkSize = 1024 * 1024;
		            if (!hasByteServing) chunkSize = datalength;
		            var doXHR = (from, to) => {
		              if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
		              if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
		              var xhr = new XMLHttpRequest();
		              xhr.open("GET", url, false);
		              if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
		              xhr.responseType = "arraybuffer";
		              if (xhr.overrideMimeType) {
		                xhr.overrideMimeType("text/plain; charset=x-user-defined");
		              }
		              xhr.send(null);
		              if (!((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304))
		                throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
		              if (xhr.response !== undefined) {
		                return new Uint8Array(xhr.response || []);
		              }
		              return intArrayFromString(xhr.responseText || "");
		            };
		            var lazyArray = this;
		            lazyArray.setDataGetter((chunkNum) => {
		              var start = chunkNum * chunkSize;
		              var end = (chunkNum + 1) * chunkSize - 1;
		              end = Math.min(end, datalength - 1);
		              if (typeof lazyArray.chunks[chunkNum] == "undefined") {
		                lazyArray.chunks[chunkNum] = doXHR(start, end);
		              }
		              if (typeof lazyArray.chunks[chunkNum] == "undefined") throw new Error("doXHR failed!");
		              return lazyArray.chunks[chunkNum];
		            });
		            if (usesGzip || !datalength) {
		              chunkSize = datalength = 1;
		              datalength = this.getter(0).length;
		              chunkSize = datalength;
		              out("LazyFiles on gzip forces download of the whole file when length is accessed");
		            }
		            this._length = datalength;
		            this._chunkSize = chunkSize;
		            this.lengthKnown = true;
		          }
		          get length() {
		            if (!this.lengthKnown) {
		              this.cacheLength();
		            }
		            return this._length;
		          }
		          get chunkSize() {
		            if (!this.lengthKnown) {
		              this.cacheLength();
		            }
		            return this._chunkSize;
		          }
		        }
		        if (typeof XMLHttpRequest != "undefined") {
		          if (!ENVIRONMENT_IS_WORKER)
		            throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
		          var lazyArray = new LazyUint8Array();
		          var properties = { isDevice: false, contents: lazyArray };
		        } else {
		          var properties = { isDevice: false, url: url };
		        }
		        var node = FS.createFile(parent, name, properties, canRead, canWrite);
		        if (properties.contents) {
		          node.contents = properties.contents;
		        } else if (properties.url) {
		          node.contents = null;
		          node.url = properties.url;
		        }
		        Object.defineProperties(node, {
		          usedBytes: {
		            get: function () {
		              return this.contents.length;
		            },
		          },
		        });
		        var stream_ops = {};
		        var keys = Object.keys(node.stream_ops);
		        keys.forEach((key) => {
		          var fn = node.stream_ops[key];
		          stream_ops[key] = (...args) => {
		            FS.forceLoadFile(node);
		            return fn(...args);
		          };
		        });
		        function writeChunks(stream, buffer, offset, length, position) {
		          var contents = stream.node.contents;
		          if (position >= contents.length) return 0;
		          var size = Math.min(contents.length - position, length);
		          assert(size >= 0);
		          if (contents.slice) {
		            for (var i = 0; i < size; i++) {
		              buffer[offset + i] = contents[position + i];
		            }
		          } else {
		            for (var i = 0; i < size; i++) {
		              buffer[offset + i] = contents.get(position + i);
		            }
		          }
		          return size;
		        }
		        stream_ops.read = (stream, buffer, offset, length, position) => {
		          FS.forceLoadFile(node);
		          return writeChunks(stream, buffer, offset, length, position);
		        };
		        stream_ops.mmap = (stream, length, position, prot, flags) => {
		          FS.forceLoadFile(node);
		          var ptr = mmapAlloc();
		          if (!ptr) {
		            throw new FS.ErrnoError(48);
		          }
		          writeChunks(stream, HEAP8, ptr, length, position);
		          return { ptr: ptr, allocated: true };
		        };
		        node.stream_ops = stream_ops;
		        return node;
		      },
		      absolutePath() {
		        abort("FS.absolutePath has been removed; use PATH_FS.resolve instead");
		      },
		      createFolder() {
		        abort("FS.createFolder has been removed; use FS.mkdir instead");
		      },
		      createLink() {
		        abort("FS.createLink has been removed; use FS.symlink instead");
		      },
		      joinPath() {
		        abort("FS.joinPath has been removed; use PATH.join instead");
		      },
		      mmapAlloc() {
		        abort("FS.mmapAlloc has been replaced by the top level function mmapAlloc");
		      },
		      standardizePath() {
		        abort("FS.standardizePath has been removed; use PATH.normalize instead");
		      },
		    };
		    var SYSCALLS = {
		      DEFAULT_POLLMASK: 5,
		      calculateAt(dirfd, path, allowEmpty) {
		        if (PATH.isAbs(path)) {
		          return path;
		        }
		        var dir;
		        if (dirfd === -100) {
		          dir = FS.cwd();
		        } else {
		          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
		          dir = dirstream.path;
		        }
		        if (path.length == 0) {
		          if (!allowEmpty) {
		            throw new FS.ErrnoError(44);
		          }
		          return dir;
		        }
		        return PATH.join2(dir, path);
		      },
		      doStat(func, path, buf) {
		        var stat = func(path);
		        HEAP32[buf >> 2] = stat.dev;
		        HEAP32[(buf + 4) >> 2] = stat.mode;
		        HEAPU32[(buf + 8) >> 2] = stat.nlink;
		        HEAP32[(buf + 12) >> 2] = stat.uid;
		        HEAP32[(buf + 16) >> 2] = stat.gid;
		        HEAP32[(buf + 20) >> 2] = stat.rdev;
		        (tempI64 = [
		          stat.size >>> 0,
		          ((tempDouble = stat.size),
		          +Math.abs(tempDouble) >= 1
		            ? tempDouble > 0
		              ? +Math.floor(tempDouble / 4294967296) >>> 0
		              : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
		            : 0),
		        ]),
		          (HEAP32[(buf + 24) >> 2] = tempI64[0]),
		          (HEAP32[(buf + 28) >> 2] = tempI64[1]);
		        HEAP32[(buf + 32) >> 2] = 4096;
		        HEAP32[(buf + 36) >> 2] = stat.blocks;
		        var atime = stat.atime.getTime();
		        var mtime = stat.mtime.getTime();
		        var ctime = stat.ctime.getTime();
		        (tempI64 = [
		          Math.floor(atime / 1e3) >>> 0,
		          ((tempDouble = Math.floor(atime / 1e3)),
		          +Math.abs(tempDouble) >= 1
		            ? tempDouble > 0
		              ? +Math.floor(tempDouble / 4294967296) >>> 0
		              : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
		            : 0),
		        ]),
		          (HEAP32[(buf + 40) >> 2] = tempI64[0]),
		          (HEAP32[(buf + 44) >> 2] = tempI64[1]);
		        HEAPU32[(buf + 48) >> 2] = (atime % 1e3) * 1e3;
		        (tempI64 = [
		          Math.floor(mtime / 1e3) >>> 0,
		          ((tempDouble = Math.floor(mtime / 1e3)),
		          +Math.abs(tempDouble) >= 1
		            ? tempDouble > 0
		              ? +Math.floor(tempDouble / 4294967296) >>> 0
		              : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
		            : 0),
		        ]),
		          (HEAP32[(buf + 56) >> 2] = tempI64[0]),
		          (HEAP32[(buf + 60) >> 2] = tempI64[1]);
		        HEAPU32[(buf + 64) >> 2] = (mtime % 1e3) * 1e3;
		        (tempI64 = [
		          Math.floor(ctime / 1e3) >>> 0,
		          ((tempDouble = Math.floor(ctime / 1e3)),
		          +Math.abs(tempDouble) >= 1
		            ? tempDouble > 0
		              ? +Math.floor(tempDouble / 4294967296) >>> 0
		              : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
		            : 0),
		        ]),
		          (HEAP32[(buf + 72) >> 2] = tempI64[0]),
		          (HEAP32[(buf + 76) >> 2] = tempI64[1]);
		        HEAPU32[(buf + 80) >> 2] = (ctime % 1e3) * 1e3;
		        (tempI64 = [
		          stat.ino >>> 0,
		          ((tempDouble = stat.ino),
		          +Math.abs(tempDouble) >= 1
		            ? tempDouble > 0
		              ? +Math.floor(tempDouble / 4294967296) >>> 0
		              : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
		            : 0),
		        ]),
		          (HEAP32[(buf + 88) >> 2] = tempI64[0]),
		          (HEAP32[(buf + 92) >> 2] = tempI64[1]);
		        return 0;
		      },
		      doMsync(addr, stream, len, flags, offset) {
		        if (!FS.isFile(stream.node.mode)) {
		          throw new FS.ErrnoError(43);
		        }
		        if (flags & 2) {
		          return 0;
		        }
		        var buffer = HEAPU8.slice(addr, addr + len);
		        FS.msync(stream, buffer, offset, len, flags);
		      },
		      getStreamFromFD(fd) {
		        var stream = FS.getStreamChecked(fd);
		        return stream;
		      },
		      varargs: undefined,
		      getStr(ptr) {
		        var ret = UTF8ToString(ptr);
		        return ret;
		      },
		    };
		    function ___syscall_fcntl64(fd, cmd, varargs) {
		      SYSCALLS.varargs = varargs;
		      try {
		        var stream = SYSCALLS.getStreamFromFD(fd);
		        switch (cmd) {
		          case 0: {
		            var arg = syscallGetVarargI();
		            if (arg < 0) {
		              return -28;
		            }
		            while (FS.streams[arg]) {
		              arg++;
		            }
		            var newStream;
		            newStream = FS.dupStream(stream, arg);
		            return newStream.fd;
		          }
		          case 1:
		          case 2:
		            return 0;
		          case 3:
		            return stream.flags;
		          case 4: {
		            var arg = syscallGetVarargI();
		            stream.flags |= arg;
		            return 0;
		          }
		          case 12: {
		            var arg = syscallGetVarargP();
		            var offset = 0;
		            HEAP16[(arg + offset) >> 1] = 2;
		            return 0;
		          }
		          case 13:
		          case 14:
		            return 0;
		        }
		        return -28;
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return -e.errno;
		      }
		    }
		    function ___syscall_fstat64(fd, buf) {
		      try {
		        var stream = SYSCALLS.getStreamFromFD(fd);
		        return SYSCALLS.doStat(FS.stat, stream.path, buf);
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return -e.errno;
		      }
		    }
		    var convertI32PairToI53Checked = (lo, hi) => {
		      assert(lo == lo >>> 0 || lo == (lo | 0));
		      assert(hi === (hi | 0));
		      return (hi + 2097152) >>> 0 < 4194305 - !!lo ? (lo >>> 0) + hi * 4294967296 : NaN;
		    };
		    function ___syscall_ftruncate64(fd, length_low, length_high) {
		      var length = convertI32PairToI53Checked(length_low, length_high);
		      try {
		        if (isNaN(length)) return 61;
		        FS.ftruncate(fd, length);
		        return 0;
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return -e.errno;
		      }
		    }
		    function ___syscall_getdents64(fd, dirp, count) {
		      try {
		        var stream = SYSCALLS.getStreamFromFD(fd);
		        stream.getdents ||= FS.readdir(stream.path);
		        var struct_size = 280;
		        var pos = 0;
		        var off = FS.llseek(stream, 0, 1);
		        var idx = Math.floor(off / struct_size);
		        while (idx < stream.getdents.length && pos + struct_size <= count) {
		          var id;
		          var type;
		          var name = stream.getdents[idx];
		          if (name === ".") {
		            id = stream.node.id;
		            type = 4;
		          } else if (name === "..") {
		            var lookup = FS.lookupPath(stream.path, { parent: true });
		            id = lookup.node.id;
		            type = 4;
		          } else {
		            var child = FS.lookupNode(stream.node, name);
		            id = child.id;
		            type = FS.isChrdev(child.mode) ? 2 : FS.isDir(child.mode) ? 4 : FS.isLink(child.mode) ? 10 : 8;
		          }
		          assert(id);
		          (tempI64 = [
		            id >>> 0,
		            ((tempDouble = id),
		            +Math.abs(tempDouble) >= 1
		              ? tempDouble > 0
		                ? +Math.floor(tempDouble / 4294967296) >>> 0
		                : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
		              : 0),
		          ]),
		            (HEAP32[(dirp + pos) >> 2] = tempI64[0]),
		            (HEAP32[(dirp + pos + 4) >> 2] = tempI64[1]);
		          (tempI64 = [
		            ((idx + 1) * struct_size) >>> 0,
		            ((tempDouble = (idx + 1) * struct_size),
		            +Math.abs(tempDouble) >= 1
		              ? tempDouble > 0
		                ? +Math.floor(tempDouble / 4294967296) >>> 0
		                : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
		              : 0),
		          ]),
		            (HEAP32[(dirp + pos + 8) >> 2] = tempI64[0]),
		            (HEAP32[(dirp + pos + 12) >> 2] = tempI64[1]);
		          HEAP16[(dirp + pos + 16) >> 1] = 280;
		          HEAP8[dirp + pos + 18] = type;
		          stringToUTF8(name, dirp + pos + 19, 256);
		          pos += struct_size;
		          idx += 1;
		        }
		        FS.llseek(stream, idx * struct_size, 0);
		        return pos;
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return -e.errno;
		      }
		    }
		    function ___syscall_ioctl(fd, op, varargs) {
		      SYSCALLS.varargs = varargs;
		      try {
		        var stream = SYSCALLS.getStreamFromFD(fd);
		        switch (op) {
		          case 21509: {
		            if (!stream.tty) return -59;
		            return 0;
		          }
		          case 21505: {
		            if (!stream.tty) return -59;
		            if (stream.tty.ops.ioctl_tcgets) {
		              var termios = stream.tty.ops.ioctl_tcgets(stream);
		              var argp = syscallGetVarargP();
		              HEAP32[argp >> 2] = termios.c_iflag || 0;
		              HEAP32[(argp + 4) >> 2] = termios.c_oflag || 0;
		              HEAP32[(argp + 8) >> 2] = termios.c_cflag || 0;
		              HEAP32[(argp + 12) >> 2] = termios.c_lflag || 0;
		              for (var i = 0; i < 32; i++) {
		                HEAP8[argp + i + 17] = termios.c_cc[i] || 0;
		              }
		              return 0;
		            }
		            return 0;
		          }
		          case 21510:
		          case 21511:
		          case 21512: {
		            if (!stream.tty) return -59;
		            return 0;
		          }
		          case 21506:
		          case 21507:
		          case 21508: {
		            if (!stream.tty) return -59;
		            if (stream.tty.ops.ioctl_tcsets) {
		              var argp = syscallGetVarargP();
		              var c_iflag = HEAP32[argp >> 2];
		              var c_oflag = HEAP32[(argp + 4) >> 2];
		              var c_cflag = HEAP32[(argp + 8) >> 2];
		              var c_lflag = HEAP32[(argp + 12) >> 2];
		              var c_cc = [];
		              for (var i = 0; i < 32; i++) {
		                c_cc.push(HEAP8[argp + i + 17]);
		              }
		              return stream.tty.ops.ioctl_tcsets(stream.tty, op, {
		                c_iflag: c_iflag,
		                c_oflag: c_oflag,
		                c_cflag: c_cflag,
		                c_lflag: c_lflag,
		                c_cc: c_cc,
		              });
		            }
		            return 0;
		          }
		          case 21519: {
		            if (!stream.tty) return -59;
		            var argp = syscallGetVarargP();
		            HEAP32[argp >> 2] = 0;
		            return 0;
		          }
		          case 21520: {
		            if (!stream.tty) return -59;
		            return -28;
		          }
		          case 21531: {
		            var argp = syscallGetVarargP();
		            return FS.ioctl(stream, op, argp);
		          }
		          case 21523: {
		            if (!stream.tty) return -59;
		            if (stream.tty.ops.ioctl_tiocgwinsz) {
		              var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
		              var argp = syscallGetVarargP();
		              HEAP16[argp >> 1] = winsize[0];
		              HEAP16[(argp + 2) >> 1] = winsize[1];
		            }
		            return 0;
		          }
		          case 21524: {
		            if (!stream.tty) return -59;
		            return 0;
		          }
		          case 21515: {
		            if (!stream.tty) return -59;
		            return 0;
		          }
		          default:
		            return -28;
		        }
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return -e.errno;
		      }
		    }
		    function ___syscall_lstat64(path, buf) {
		      try {
		        path = SYSCALLS.getStr(path);
		        return SYSCALLS.doStat(FS.lstat, path, buf);
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return -e.errno;
		      }
		    }
		    function ___syscall_newfstatat(dirfd, path, buf, flags) {
		      try {
		        path = SYSCALLS.getStr(path);
		        var nofollow = flags & 256;
		        var allowEmpty = flags & 4096;
		        flags = flags & ~6400;
		        assert(!flags, `unknown flags in __syscall_newfstatat: ${flags}`);
		        path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
		        return SYSCALLS.doStat(nofollow ? FS.lstat : FS.stat, path, buf);
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return -e.errno;
		      }
		    }
		    function ___syscall_openat(dirfd, path, flags, varargs) {
		      SYSCALLS.varargs = varargs;
		      try {
		        path = SYSCALLS.getStr(path);
		        path = SYSCALLS.calculateAt(dirfd, path);
		        var mode = varargs ? syscallGetVarargI() : 0;
		        return FS.open(path, flags, mode).fd;
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return -e.errno;
		      }
		    }
		    function ___syscall_rmdir(path) {
		      try {
		        path = SYSCALLS.getStr(path);
		        FS.rmdir(path);
		        return 0;
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return -e.errno;
		      }
		    }
		    function ___syscall_stat64(path, buf) {
		      try {
		        path = SYSCALLS.getStr(path);
		        return SYSCALLS.doStat(FS.stat, path, buf);
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return -e.errno;
		      }
		    }
		    function ___syscall_unlinkat(dirfd, path, flags) {
		      try {
		        path = SYSCALLS.getStr(path);
		        path = SYSCALLS.calculateAt(dirfd, path);
		        if (flags === 0) {
		          FS.unlink(path);
		        } else if (flags === 512) {
		          FS.rmdir(path);
		        } else {
		          abort("Invalid flags passed to unlinkat");
		        }
		        return 0;
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return -e.errno;
		      }
		    }
		    var __abort_js = () => {
		      abort("native code called abort()");
		    };
		    var __emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num);
		    var __emscripten_throw_longjmp = () => {
		      throw Infinity;
		    };
		    function __gmtime_js(time_low, time_high, tmPtr) {
		      var time = convertI32PairToI53Checked(time_low, time_high);
		      var date = new Date(time * 1e3);
		      HEAP32[tmPtr >> 2] = date.getUTCSeconds();
		      HEAP32[(tmPtr + 4) >> 2] = date.getUTCMinutes();
		      HEAP32[(tmPtr + 8) >> 2] = date.getUTCHours();
		      HEAP32[(tmPtr + 12) >> 2] = date.getUTCDate();
		      HEAP32[(tmPtr + 16) >> 2] = date.getUTCMonth();
		      HEAP32[(tmPtr + 20) >> 2] = date.getUTCFullYear() - 1900;
		      HEAP32[(tmPtr + 24) >> 2] = date.getUTCDay();
		      var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
		      var yday = ((date.getTime() - start) / (1e3 * 60 * 60 * 24)) | 0;
		      HEAP32[(tmPtr + 28) >> 2] = yday;
		    }
		    var isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
		    var MONTH_DAYS_LEAP_CUMULATIVE = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
		    var MONTH_DAYS_REGULAR_CUMULATIVE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
		    var ydayFromDate = (date) => {
		      var leap = isLeapYear(date.getFullYear());
		      var monthDaysCumulative = leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE;
		      var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
		      return yday;
		    };
		    function __localtime_js(time_low, time_high, tmPtr) {
		      var time = convertI32PairToI53Checked(time_low, time_high);
		      var date = new Date(time * 1e3);
		      HEAP32[tmPtr >> 2] = date.getSeconds();
		      HEAP32[(tmPtr + 4) >> 2] = date.getMinutes();
		      HEAP32[(tmPtr + 8) >> 2] = date.getHours();
		      HEAP32[(tmPtr + 12) >> 2] = date.getDate();
		      HEAP32[(tmPtr + 16) >> 2] = date.getMonth();
		      HEAP32[(tmPtr + 20) >> 2] = date.getFullYear() - 1900;
		      HEAP32[(tmPtr + 24) >> 2] = date.getDay();
		      var yday = ydayFromDate(date) | 0;
		      HEAP32[(tmPtr + 28) >> 2] = yday;
		      HEAP32[(tmPtr + 36) >> 2] = -(date.getTimezoneOffset() * 60);
		      var start = new Date(date.getFullYear(), 0, 1);
		      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
		      var winterOffset = start.getTimezoneOffset();
		      var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
		      HEAP32[(tmPtr + 32) >> 2] = dst;
		    }
		    var __tzset_js = (timezone, daylight, std_name, dst_name) => {
		      var currentYear = new Date().getFullYear();
		      var winter = new Date(currentYear, 0, 1);
		      var summer = new Date(currentYear, 6, 1);
		      var winterOffset = winter.getTimezoneOffset();
		      var summerOffset = summer.getTimezoneOffset();
		      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
		      HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
		      HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
		      var extractZone = (timezoneOffset) => {
		        var sign = timezoneOffset >= 0 ? "-" : "+";
		        var absOffset = Math.abs(timezoneOffset);
		        var hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
		        var minutes = String(absOffset % 60).padStart(2, "0");
		        return `UTC${sign}${hours}${minutes}`;
		      };
		      var winterName = extractZone(winterOffset);
		      var summerName = extractZone(summerOffset);
		      assert(winterName);
		      assert(summerName);
		      assert(lengthBytesUTF8(winterName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${winterName})`);
		      assert(lengthBytesUTF8(summerName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${summerName})`);
		      if (summerOffset < winterOffset) {
		        stringToUTF8(winterName, std_name, 17);
		        stringToUTF8(summerName, dst_name, 17);
		      } else {
		        stringToUTF8(winterName, dst_name, 17);
		        stringToUTF8(summerName, std_name, 17);
		      }
		    };
		    var _emscripten_date_now = () => Date.now();
		    var _emscripten_err = (str) => err(UTF8ToString(str));
		    var _emscripten_errn = (str, len) => err(UTF8ToString(str, len));
		    var getHeapMax = () => 2147483648;
		    var growMemory = (size) => {
		      var b = wasmMemory.buffer;
		      var pages = (size - b.byteLength + 65535) / 65536;
		      try {
		        wasmMemory.grow(pages);
		        updateMemoryViews();
		        return 1;
		      } catch (e) {
		        err(`growMemory: Attempted to grow heap from ${b.byteLength} bytes to ${size} bytes, but got error: ${e}`);
		      }
		    };
		    var _emscripten_resize_heap = (requestedSize) => {
		      var oldSize = HEAPU8.length;
		      requestedSize >>>= 0;
		      assert(requestedSize > oldSize);
		      var maxHeapSize = getHeapMax();
		      if (requestedSize > maxHeapSize) {
		        err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`);
		        return false;
		      }
		      var alignUp = (x, multiple) => x + ((multiple - (x % multiple)) % multiple);
		      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
		        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
		        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
		        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
		        var replacement = growMemory(newSize);
		        if (replacement) {
		          return true;
		        }
		      }
		      err(`Failed to grow the heap from ${oldSize} bytes to ${newSize} bytes, not enough memory!`);
		      return false;
		    };
		    var ENV = {};
		    var getExecutableName = () => thisProgram || "./this.program";
		    var getEnvStrings = () => {
		      if (!getEnvStrings.strings) {
		        var lang =
		          ((typeof navigator == "object" && navigator.languages && navigator.languages[0]) || "C").replace("-", "_") +
		          ".UTF-8";
		        var env = {
		          USER: "web_user",
		          LOGNAME: "web_user",
		          PATH: "/",
		          PWD: "/",
		          HOME: "/home/web_user",
		          LANG: lang,
		          _: getExecutableName(),
		        };
		        for (var x in ENV) {
		          if (ENV[x] === undefined) delete env[x];
		          else env[x] = ENV[x];
		        }
		        var strings = [];
		        for (var x in env) {
		          strings.push(`${x}=${env[x]}`);
		        }
		        getEnvStrings.strings = strings;
		      }
		      return getEnvStrings.strings;
		    };
		    var stringToAscii = (str, buffer) => {
		      for (var i = 0; i < str.length; ++i) {
		        assert(str.charCodeAt(i) === (str.charCodeAt(i) & 255));
		        HEAP8[buffer++] = str.charCodeAt(i);
		      }
		      HEAP8[buffer] = 0;
		    };
		    var _environ_get = (__environ, environ_buf) => {
		      var bufSize = 0;
		      getEnvStrings().forEach((string, i) => {
		        var ptr = environ_buf + bufSize;
		        HEAPU32[(__environ + i * 4) >> 2] = ptr;
		        stringToAscii(string, ptr);
		        bufSize += string.length + 1;
		      });
		      return 0;
		    };
		    var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
		      var strings = getEnvStrings();
		      HEAPU32[penviron_count >> 2] = strings.length;
		      var bufSize = 0;
		      strings.forEach((string) => (bufSize += string.length + 1));
		      HEAPU32[penviron_buf_size >> 2] = bufSize;
		      return 0;
		    };
		    function _fd_close(fd) {
		      try {
		        var stream = SYSCALLS.getStreamFromFD(fd);
		        FS.close(stream);
		        return 0;
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return e.errno;
		      }
		    }
		    var doReadv = (stream, iov, iovcnt, offset) => {
		      var ret = 0;
		      for (var i = 0; i < iovcnt; i++) {
		        var ptr = HEAPU32[iov >> 2];
		        var len = HEAPU32[(iov + 4) >> 2];
		        iov += 8;
		        var curr = FS.read(stream, HEAP8, ptr, len, offset);
		        if (curr < 0) return -1;
		        ret += curr;
		        if (curr < len) break;
		      }
		      return ret;
		    };
		    function _fd_read(fd, iov, iovcnt, pnum) {
		      try {
		        var stream = SYSCALLS.getStreamFromFD(fd);
		        var num = doReadv(stream, iov, iovcnt);
		        HEAPU32[pnum >> 2] = num;
		        return 0;
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return e.errno;
		      }
		    }
		    function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
		      var offset = convertI32PairToI53Checked(offset_low, offset_high);
		      try {
		        if (isNaN(offset)) return 61;
		        var stream = SYSCALLS.getStreamFromFD(fd);
		        FS.llseek(stream, offset, whence);
		        (tempI64 = [
		          stream.position >>> 0,
		          ((tempDouble = stream.position),
		          +Math.abs(tempDouble) >= 1
		            ? tempDouble > 0
		              ? +Math.floor(tempDouble / 4294967296) >>> 0
		              : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
		            : 0),
		        ]),
		          (HEAP32[newOffset >> 2] = tempI64[0]),
		          (HEAP32[(newOffset + 4) >> 2] = tempI64[1]);
		        if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
		        return 0;
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return e.errno;
		      }
		    }
		    function _fd_sync(fd) {
		      try {
		        var stream = SYSCALLS.getStreamFromFD(fd);
		        if (stream.stream_ops?.fsync) {
		          return stream.stream_ops.fsync(stream);
		        }
		        return 0;
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return e.errno;
		      }
		    }
		    var doWritev = (stream, iov, iovcnt, offset) => {
		      var ret = 0;
		      for (var i = 0; i < iovcnt; i++) {
		        var ptr = HEAPU32[iov >> 2];
		        var len = HEAPU32[(iov + 4) >> 2];
		        iov += 8;
		        var curr = FS.write(stream, HEAP8, ptr, len, offset);
		        if (curr < 0) return -1;
		        ret += curr;
		      }
		      return ret;
		    };
		    function _fd_write(fd, iov, iovcnt, pnum) {
		      try {
		        var stream = SYSCALLS.getStreamFromFD(fd);
		        var num = doWritev(stream, iov, iovcnt);
		        HEAPU32[pnum >> 2] = num;
		        return 0;
		      } catch (e) {
		        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
		        return e.errno;
		      }
		    }
		    var wasmTableMirror = [];
		    var wasmTable;
		    var getWasmTableEntry = (funcPtr) => {
		      var func = wasmTableMirror[funcPtr];
		      if (!func) {
		        if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
		        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
		      }
		      assert(wasmTable.get(funcPtr) == func, "JavaScript-side Wasm function table mirror is out of date!");
		      return func;
		    };
		    var getCFunc = (ident) => {
		      var func = Module["_" + ident];
		      assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
		      return func;
		    };
		    var writeArrayToMemory = (array, buffer) => {
		      assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
		      HEAP8.set(array, buffer);
		    };
		    var ccall = (ident, returnType, argTypes, args, opts) => {
		      var toC = {
		        string: (str) => {
		          var ret = 0;
		          if (str !== null && str !== undefined && str !== 0) {
		            ret = stringToUTF8OnStack(str);
		          }
		          return ret;
		        },
		        array: (arr) => {
		          var ret = stackAlloc(arr.length);
		          writeArrayToMemory(arr, ret);
		          return ret;
		        },
		      };
		      function convertReturnValue(ret) {
		        if (returnType === "string") {
		          return UTF8ToString(ret);
		        }
		        if (returnType === "boolean") return Boolean(ret);
		        return ret;
		      }
		      var func = getCFunc(ident);
		      var cArgs = [];
		      var stack = 0;
		      assert(returnType !== "array", 'Return type should not be "array".');
		      if (args) {
		        for (var i = 0; i < args.length; i++) {
		          var converter = toC[argTypes[i]];
		          if (converter) {
		            if (stack === 0) stack = stackSave();
		            cArgs[i] = converter(args[i]);
		          } else {
		            cArgs[i] = args[i];
		          }
		        }
		      }
		      var ret = func(...cArgs);
		      function onDone(ret) {
		        if (stack !== 0) stackRestore(stack);
		        return convertReturnValue(ret);
		      }
		      ret = onDone(ret);
		      return ret;
		    };
		    var cwrap =
		      (ident, returnType, argTypes, opts) =>
		      (...args) =>
		        ccall(ident, returnType, argTypes, args);
		    FS.createPreloadedFile = FS_createPreloadedFile;
		    FS.staticInit();
		    function checkIncomingModuleAPI() {
		      ignoredModuleProp("fetchSettings");
		    }
		    var wasmImports = {
		      __assert_fail: ___assert_fail,
		      __syscall_fcntl64: ___syscall_fcntl64,
		      __syscall_fstat64: ___syscall_fstat64,
		      __syscall_ftruncate64: ___syscall_ftruncate64,
		      __syscall_getdents64: ___syscall_getdents64,
		      __syscall_ioctl: ___syscall_ioctl,
		      __syscall_lstat64: ___syscall_lstat64,
		      __syscall_newfstatat: ___syscall_newfstatat,
		      __syscall_openat: ___syscall_openat,
		      __syscall_rmdir: ___syscall_rmdir,
		      __syscall_stat64: ___syscall_stat64,
		      __syscall_unlinkat: ___syscall_unlinkat,
		      _abort_js: __abort_js,
		      _emscripten_memcpy_js: __emscripten_memcpy_js,
		      _emscripten_throw_longjmp: __emscripten_throw_longjmp,
		      _gmtime_js: __gmtime_js,
		      _localtime_js: __localtime_js,
		      _tzset_js: __tzset_js,
		      emscripten_date_now: _emscripten_date_now,
		      emscripten_err: _emscripten_err,
		      emscripten_errn: _emscripten_errn,
		      emscripten_resize_heap: _emscripten_resize_heap,
		      environ_get: _environ_get,
		      environ_sizes_get: _environ_sizes_get,
		      fd_close: _fd_close,
		      fd_read: _fd_read,
		      fd_seek: _fd_seek,
		      fd_sync: _fd_sync,
		      fd_write: _fd_write,
		      invoke_ii: invoke_ii,
		      invoke_iii: invoke_iii,
		      invoke_iiii: invoke_iiii,
		      invoke_iiiii: invoke_iiiii,
		      invoke_v: invoke_v,
		      invoke_vi: invoke_vi,
		      invoke_viii: invoke_viii,
		      invoke_viiii: invoke_viiii,
		    };
		    var wasmExports = createWasm();
		    (Module["_PDFium_Init"] = createExportWrapper("PDFium_Init", 0));
		    (Module["_FPDF_InitLibraryWithConfig"] = createExportWrapper(
		      "FPDF_InitLibraryWithConfig",
		      1,
		    ));
		    (Module["_FPDFAnnot_IsSupportedSubtype"] = createExportWrapper(
		      "FPDFAnnot_IsSupportedSubtype",
		      1,
		    ));
		    (Module["_FPDFPage_CreateAnnot"] = createExportWrapper("FPDFPage_CreateAnnot", 2));
		    (Module["_FPDFPage_GetAnnotCount"] = createExportWrapper(
		      "FPDFPage_GetAnnotCount",
		      1,
		    ));
		    (Module["_FPDFPage_GetAnnot"] = createExportWrapper("FPDFPage_GetAnnot", 2));
		    (Module["_FPDFPage_GetAnnotIndex"] = createExportWrapper(
		      "FPDFPage_GetAnnotIndex",
		      2,
		    ));
		    (Module["_FPDFPage_CloseAnnot"] = createExportWrapper("FPDFPage_CloseAnnot", 1));
		    (Module["_FPDFPage_RemoveAnnot"] = createExportWrapper("FPDFPage_RemoveAnnot", 2));
		    (Module["_FPDFAnnot_GetSubtype"] = createExportWrapper("FPDFAnnot_GetSubtype", 1));
		    (Module["_FPDFAnnot_IsObjectSupportedSubtype"] = createExportWrapper(
		      "FPDFAnnot_IsObjectSupportedSubtype",
		      1,
		    ));
		    (Module["_FPDFAnnot_UpdateObject"] = createExportWrapper(
		      "FPDFAnnot_UpdateObject",
		      2,
		    ));
		    (Module["_FPDFAnnot_AddInkStroke"] = createExportWrapper(
		      "FPDFAnnot_AddInkStroke",
		      3,
		    ));
		    (Module["_FPDFAnnot_RemoveInkList"] = createExportWrapper(
		      "FPDFAnnot_RemoveInkList",
		      1,
		    ));
		    (Module["_FPDFAnnot_AppendObject"] = createExportWrapper(
		      "FPDFAnnot_AppendObject",
		      2,
		    ));
		    (Module["_FPDFAnnot_GetObjectCount"] = createExportWrapper(
		      "FPDFAnnot_GetObjectCount",
		      1,
		    ));
		    (Module["_FPDFAnnot_GetObject"] = createExportWrapper("FPDFAnnot_GetObject", 2));
		    (Module["_FPDFAnnot_RemoveObject"] = createExportWrapper(
		      "FPDFAnnot_RemoveObject",
		      2,
		    ));
		    (Module["_FPDFAnnot_SetColor"] = createExportWrapper("FPDFAnnot_SetColor", 6));
		    (Module["_FPDFAnnot_GetColor"] = createExportWrapper("FPDFAnnot_GetColor", 6));
		    (Module["_FPDFAnnot_HasAttachmentPoints"] = createExportWrapper(
		      "FPDFAnnot_HasAttachmentPoints",
		      1,
		    ));
		    (Module["_FPDFAnnot_SetAttachmentPoints"] = createExportWrapper(
		      "FPDFAnnot_SetAttachmentPoints",
		      3,
		    ));
		    (Module["_FPDFAnnot_AppendAttachmentPoints"] = createExportWrapper(
		      "FPDFAnnot_AppendAttachmentPoints",
		      2,
		    ));
		    (Module["_FPDFAnnot_CountAttachmentPoints"] = createExportWrapper(
		      "FPDFAnnot_CountAttachmentPoints",
		      1,
		    ));
		    (Module["_FPDFAnnot_GetAttachmentPoints"] = createExportWrapper(
		      "FPDFAnnot_GetAttachmentPoints",
		      3,
		    ));
		    (Module["_FPDFAnnot_SetRect"] = createExportWrapper("FPDFAnnot_SetRect", 2));
		    (Module["_FPDFAnnot_GetRect"] = createExportWrapper("FPDFAnnot_GetRect", 2));
		    (Module["_FPDFAnnot_GetVertices"] = createExportWrapper("FPDFAnnot_GetVertices", 3));
		    (Module["_FPDFAnnot_GetInkListCount"] = createExportWrapper(
		      "FPDFAnnot_GetInkListCount",
		      1,
		    ));
		    (Module["_FPDFAnnot_GetInkListPath"] = createExportWrapper(
		      "FPDFAnnot_GetInkListPath",
		      4,
		    ));
		    (Module["_FPDFAnnot_GetLine"] = createExportWrapper("FPDFAnnot_GetLine", 3));
		    (Module["_FPDFAnnot_SetBorder"] = createExportWrapper("FPDFAnnot_SetBorder", 4));
		    (Module["_FPDFAnnot_GetBorder"] = createExportWrapper("FPDFAnnot_GetBorder", 4));
		    (Module["_FPDFAnnot_HasKey"] = createExportWrapper("FPDFAnnot_HasKey", 2));
		    (Module["_FPDFAnnot_GetValueType"] = createExportWrapper(
		      "FPDFAnnot_GetValueType",
		      2,
		    ));
		    (Module["_FPDFAnnot_SetStringValue"] = createExportWrapper(
		      "FPDFAnnot_SetStringValue",
		      3,
		    ));
		    (Module["_FPDFAnnot_GetStringValue"] = createExportWrapper(
		      "FPDFAnnot_GetStringValue",
		      4,
		    ));
		    (Module["_FPDFAnnot_GetNumberValue"] = createExportWrapper(
		      "FPDFAnnot_GetNumberValue",
		      3,
		    ));
		    (Module["_FPDFAnnot_SetAP"] = createExportWrapper("FPDFAnnot_SetAP", 3));
		    (Module["_FPDFAnnot_GetAP"] = createExportWrapper("FPDFAnnot_GetAP", 4));
		    (Module["_FPDFAnnot_GetLinkedAnnot"] = createExportWrapper(
		      "FPDFAnnot_GetLinkedAnnot",
		      2,
		    ));
		    (Module["_FPDFAnnot_GetFlags"] = createExportWrapper("FPDFAnnot_GetFlags", 1));
		    (Module["_FPDFAnnot_SetFlags"] = createExportWrapper("FPDFAnnot_SetFlags", 2));
		    (Module["_FPDFAnnot_GetFormFieldFlags"] = createExportWrapper(
		      "FPDFAnnot_GetFormFieldFlags",
		      2,
		    ));
		    (Module["_FPDFAnnot_GetFormFieldAtPoint"] = createExportWrapper(
		      "FPDFAnnot_GetFormFieldAtPoint",
		      3,
		    ));
		    (Module["_FPDFAnnot_GetFormFieldName"] = createExportWrapper(
		      "FPDFAnnot_GetFormFieldName",
		      4,
		    ));
		    (Module["_FPDFAnnot_GetFormFieldType"] = createExportWrapper(
		      "FPDFAnnot_GetFormFieldType",
		      2,
		    ));
		    (Module["_FPDFAnnot_GetFormAdditionalActionJavaScript"] =
		      createExportWrapper("FPDFAnnot_GetFormAdditionalActionJavaScript", 5));
		    (Module["_FPDFAnnot_GetFormFieldAlternateName"] = createExportWrapper(
		      "FPDFAnnot_GetFormFieldAlternateName",
		      4,
		    ));
		    (Module["_FPDFAnnot_GetFormFieldValue"] = createExportWrapper(
		      "FPDFAnnot_GetFormFieldValue",
		      4,
		    ));
		    (Module["_FPDFAnnot_GetOptionCount"] = createExportWrapper(
		      "FPDFAnnot_GetOptionCount",
		      2,
		    ));
		    (Module["_FPDFAnnot_GetOptionLabel"] = createExportWrapper(
		      "FPDFAnnot_GetOptionLabel",
		      5,
		    ));
		    (Module["_FPDFAnnot_IsOptionSelected"] = createExportWrapper(
		      "FPDFAnnot_IsOptionSelected",
		      3,
		    ));
		    (Module["_FPDFAnnot_GetFontSize"] = createExportWrapper("FPDFAnnot_GetFontSize", 3));
		    (Module["_FPDFAnnot_GetFontColor"] = createExportWrapper(
		      "FPDFAnnot_GetFontColor",
		      5,
		    ));
		    (Module["_FPDFAnnot_IsChecked"] = createExportWrapper("FPDFAnnot_IsChecked", 2));
		    (Module["_FPDFAnnot_SetFocusableSubtypes"] = createExportWrapper(
		      "FPDFAnnot_SetFocusableSubtypes",
		      3,
		    ));
		    (Module["_FPDFAnnot_GetFocusableSubtypesCount"] = createExportWrapper(
		      "FPDFAnnot_GetFocusableSubtypesCount",
		      1,
		    ));
		    (Module["_FPDFAnnot_GetFocusableSubtypes"] = createExportWrapper(
		      "FPDFAnnot_GetFocusableSubtypes",
		      3,
		    ));
		    (Module["_FPDFAnnot_GetLink"] = createExportWrapper("FPDFAnnot_GetLink", 1));
		    (Module["_FPDFAnnot_GetFormControlCount"] = createExportWrapper(
		      "FPDFAnnot_GetFormControlCount",
		      2,
		    ));
		    (Module["_FPDFAnnot_GetFormControlIndex"] = createExportWrapper(
		      "FPDFAnnot_GetFormControlIndex",
		      2,
		    ));
		    (Module["_FPDFAnnot_GetFormFieldExportValue"] = createExportWrapper(
		      "FPDFAnnot_GetFormFieldExportValue",
		      4,
		    ));
		    (Module["_FPDFAnnot_SetURI"] = createExportWrapper("FPDFAnnot_SetURI", 2));
		    (Module["_FPDFAnnot_GetFileAttachment"] = createExportWrapper(
		      "FPDFAnnot_GetFileAttachment",
		      1,
		    ));
		    (Module["_FPDFAnnot_AddFileAttachment"] = createExportWrapper(
		      "FPDFAnnot_AddFileAttachment",
		      2,
		    ));
		    (Module["_FPDFDoc_GetAttachmentCount"] = createExportWrapper(
		      "FPDFDoc_GetAttachmentCount",
		      1,
		    ));
		    (Module["_FPDFDoc_AddAttachment"] = createExportWrapper("FPDFDoc_AddAttachment", 2));
		    (Module["_FPDFDoc_GetAttachment"] = createExportWrapper("FPDFDoc_GetAttachment", 2));
		    (Module["_FPDFDoc_DeleteAttachment"] = createExportWrapper(
		      "FPDFDoc_DeleteAttachment",
		      2,
		    ));
		    (Module["_FPDFAttachment_GetName"] = createExportWrapper(
		      "FPDFAttachment_GetName",
		      3,
		    ));
		    (Module["_FPDFAttachment_HasKey"] = createExportWrapper("FPDFAttachment_HasKey", 2));
		    (Module["_FPDFAttachment_GetValueType"] = createExportWrapper(
		      "FPDFAttachment_GetValueType",
		      2,
		    ));
		    (Module["_FPDFAttachment_SetStringValue"] = createExportWrapper(
		      "FPDFAttachment_SetStringValue",
		      3,
		    ));
		    (Module["_FPDFAttachment_GetStringValue"] = createExportWrapper(
		      "FPDFAttachment_GetStringValue",
		      4,
		    ));
		    (Module["_FPDFAttachment_SetFile"] = createExportWrapper(
		      "FPDFAttachment_SetFile",
		      4,
		    ));
		    (Module["_FPDFAttachment_GetFile"] = createExportWrapper(
		      "FPDFAttachment_GetFile",
		      4,
		    ));
		    (Module["_FPDFCatalog_IsTagged"] = createExportWrapper("FPDFCatalog_IsTagged", 1));
		    (Module["_FPDFCatalog_SetLanguage"] = createExportWrapper(
		      "FPDFCatalog_SetLanguage",
		      2,
		    ));
		    (Module["_FPDFAvail_Create"] = createExportWrapper("FPDFAvail_Create", 2));
		    (Module["_FPDFAvail_Destroy"] = createExportWrapper("FPDFAvail_Destroy", 1));
		    (Module["_FPDFAvail_IsDocAvail"] = createExportWrapper("FPDFAvail_IsDocAvail", 2));
		    (Module["_FPDFAvail_GetDocument"] = createExportWrapper("FPDFAvail_GetDocument", 2));
		    (Module["_FPDFAvail_GetFirstPageNum"] = createExportWrapper(
		      "FPDFAvail_GetFirstPageNum",
		      1,
		    ));
		    (Module["_FPDFAvail_IsPageAvail"] = createExportWrapper("FPDFAvail_IsPageAvail", 3));
		    (Module["_FPDFAvail_IsFormAvail"] = createExportWrapper("FPDFAvail_IsFormAvail", 2));
		    (Module["_FPDFAvail_IsLinearized"] = createExportWrapper(
		      "FPDFAvail_IsLinearized",
		      1,
		    ));
		    (Module["_FPDFBookmark_GetFirstChild"] = createExportWrapper(
		      "FPDFBookmark_GetFirstChild",
		      2,
		    ));
		    (Module["_FPDFBookmark_GetNextSibling"] = createExportWrapper(
		      "FPDFBookmark_GetNextSibling",
		      2,
		    ));
		    (Module["_FPDFBookmark_GetTitle"] = createExportWrapper("FPDFBookmark_GetTitle", 3));
		    (Module["_FPDFBookmark_GetCount"] = createExportWrapper("FPDFBookmark_GetCount", 1));
		    (Module["_FPDFBookmark_Find"] = createExportWrapper("FPDFBookmark_Find", 2));
		    (Module["_FPDFBookmark_GetDest"] = createExportWrapper("FPDFBookmark_GetDest", 2));
		    (Module["_FPDFBookmark_GetAction"] = createExportWrapper(
		      "FPDFBookmark_GetAction",
		      1,
		    ));
		    (Module["_FPDFAction_GetType"] = createExportWrapper("FPDFAction_GetType", 1));
		    (Module["_FPDFAction_GetDest"] = createExportWrapper("FPDFAction_GetDest", 2));
		    (Module["_FPDFAction_GetFilePath"] = createExportWrapper(
		      "FPDFAction_GetFilePath",
		      3,
		    ));
		    (Module["_FPDFAction_GetURIPath"] = createExportWrapper("FPDFAction_GetURIPath", 4));
		    (Module["_FPDFDest_GetDestPageIndex"] = createExportWrapper(
		      "FPDFDest_GetDestPageIndex",
		      2,
		    ));
		    (Module["_FPDFDest_GetView"] = createExportWrapper("FPDFDest_GetView", 3));
		    (Module["_FPDFDest_GetLocationInPage"] = createExportWrapper(
		      "FPDFDest_GetLocationInPage",
		      7,
		    ));
		    (Module["_FPDFLink_GetLinkAtPoint"] = createExportWrapper(
		      "FPDFLink_GetLinkAtPoint",
		      3,
		    ));
		    (Module["_FPDFLink_GetLinkZOrderAtPoint"] = createExportWrapper(
		      "FPDFLink_GetLinkZOrderAtPoint",
		      3,
		    ));
		    (Module["_FPDFLink_GetDest"] = createExportWrapper("FPDFLink_GetDest", 2));
		    (Module["_FPDFLink_GetAction"] = createExportWrapper("FPDFLink_GetAction", 1));
		    (Module["_FPDFLink_Enumerate"] = createExportWrapper("FPDFLink_Enumerate", 3));
		    (Module["_FPDFLink_GetAnnot"] = createExportWrapper("FPDFLink_GetAnnot", 2));
		    (Module["_FPDFLink_GetAnnotRect"] = createExportWrapper("FPDFLink_GetAnnotRect", 2));
		    (Module["_FPDFLink_CountQuadPoints"] = createExportWrapper(
		      "FPDFLink_CountQuadPoints",
		      1,
		    ));
		    (Module["_FPDFLink_GetQuadPoints"] = createExportWrapper(
		      "FPDFLink_GetQuadPoints",
		      3,
		    ));
		    (Module["_FPDF_GetPageAAction"] = createExportWrapper("FPDF_GetPageAAction", 2));
		    (Module["_FPDF_GetFileIdentifier"] = createExportWrapper(
		      "FPDF_GetFileIdentifier",
		      4,
		    ));
		    (Module["_FPDF_GetMetaText"] = createExportWrapper("FPDF_GetMetaText", 4));
		    (Module["_FPDF_GetPageLabel"] = createExportWrapper("FPDF_GetPageLabel", 4));
		    (Module["_FPDFPageObj_NewImageObj"] = createExportWrapper(
		      "FPDFPageObj_NewImageObj",
		      1,
		    ));
		    (Module["_FPDFImageObj_LoadJpegFile"] = createExportWrapper(
		      "FPDFImageObj_LoadJpegFile",
		      4,
		    ));
		    (Module["_FPDFImageObj_LoadJpegFileInline"] = createExportWrapper(
		      "FPDFImageObj_LoadJpegFileInline",
		      4,
		    ));
		    (Module["_FPDFImageObj_SetMatrix"] = createExportWrapper(
		      "FPDFImageObj_SetMatrix",
		      7,
		    ));
		    (Module["_FPDFImageObj_SetBitmap"] = createExportWrapper(
		      "FPDFImageObj_SetBitmap",
		      4,
		    ));
		    (Module["_FPDFImageObj_GetBitmap"] = createExportWrapper(
		      "FPDFImageObj_GetBitmap",
		      1,
		    ));
		    (Module["_FPDFImageObj_GetRenderedBitmap"] = createExportWrapper(
		      "FPDFImageObj_GetRenderedBitmap",
		      3,
		    ));
		    (Module["_FPDFImageObj_GetImageDataDecoded"] = createExportWrapper(
		      "FPDFImageObj_GetImageDataDecoded",
		      3,
		    ));
		    (Module["_FPDFImageObj_GetImageDataRaw"] = createExportWrapper(
		      "FPDFImageObj_GetImageDataRaw",
		      3,
		    ));
		    (Module["_FPDFImageObj_GetImageFilterCount"] = createExportWrapper(
		      "FPDFImageObj_GetImageFilterCount",
		      1,
		    ));
		    (Module["_FPDFImageObj_GetImageFilter"] = createExportWrapper(
		      "FPDFImageObj_GetImageFilter",
		      4,
		    ));
		    (Module["_FPDFImageObj_GetImageMetadata"] = createExportWrapper(
		      "FPDFImageObj_GetImageMetadata",
		      3,
		    ));
		    (Module["_FPDFImageObj_GetImagePixelSize"] = createExportWrapper(
		      "FPDFImageObj_GetImagePixelSize",
		      3,
		    ));
		    (Module["_FPDF_CreateNewDocument"] = createExportWrapper(
		      "FPDF_CreateNewDocument",
		      0,
		    ));
		    (Module["_FPDFPage_Delete"] = createExportWrapper("FPDFPage_Delete", 2));
		    (Module["_FPDF_MovePages"] = createExportWrapper("FPDF_MovePages", 4));
		    (Module["_FPDFPage_New"] = createExportWrapper("FPDFPage_New", 4));
		    (Module["_FPDFPage_GetRotation"] = createExportWrapper("FPDFPage_GetRotation", 1));
		    (Module["_FPDFPage_InsertObject"] = createExportWrapper("FPDFPage_InsertObject", 2));
		    (Module["_FPDFPage_RemoveObject"] = createExportWrapper("FPDFPage_RemoveObject", 2));
		    (Module["_FPDFPage_CountObjects"] = createExportWrapper("FPDFPage_CountObjects", 1));
		    (Module["_FPDFPage_GetObject"] = createExportWrapper("FPDFPage_GetObject", 2));
		    (Module["_FPDFPage_HasTransparency"] = createExportWrapper(
		      "FPDFPage_HasTransparency",
		      1,
		    ));
		    (Module["_FPDFPageObj_Destroy"] = createExportWrapper("FPDFPageObj_Destroy", 1));
		    (Module["_FPDFPageObj_GetMarkedContentID"] = createExportWrapper(
		      "FPDFPageObj_GetMarkedContentID",
		      1,
		    ));
		    (Module["_FPDFPageObj_CountMarks"] = createExportWrapper(
		      "FPDFPageObj_CountMarks",
		      1,
		    ));
		    (Module["_FPDFPageObj_GetMark"] = createExportWrapper("FPDFPageObj_GetMark", 2));
		    (Module["_FPDFPageObj_AddMark"] = createExportWrapper("FPDFPageObj_AddMark", 2));
		    (Module["_FPDFPageObj_RemoveMark"] = createExportWrapper(
		      "FPDFPageObj_RemoveMark",
		      2,
		    ));
		    (Module["_FPDFPageObjMark_GetName"] = createExportWrapper(
		      "FPDFPageObjMark_GetName",
		      4,
		    ));
		    (Module["_FPDFPageObjMark_CountParams"] = createExportWrapper(
		      "FPDFPageObjMark_CountParams",
		      1,
		    ));
		    (Module["_FPDFPageObjMark_GetParamKey"] = createExportWrapper(
		      "FPDFPageObjMark_GetParamKey",
		      5,
		    ));
		    (Module["_FPDFPageObjMark_GetParamValueType"] = createExportWrapper(
		      "FPDFPageObjMark_GetParamValueType",
		      2,
		    ));
		    (Module["_FPDFPageObjMark_GetParamIntValue"] = createExportWrapper(
		      "FPDFPageObjMark_GetParamIntValue",
		      3,
		    ));
		    (Module["_FPDFPageObjMark_GetParamStringValue"] = createExportWrapper(
		      "FPDFPageObjMark_GetParamStringValue",
		      5,
		    ));
		    (Module["_FPDFPageObjMark_GetParamBlobValue"] = createExportWrapper(
		      "FPDFPageObjMark_GetParamBlobValue",
		      5,
		    ));
		    (Module["_FPDFPageObj_HasTransparency"] = createExportWrapper(
		      "FPDFPageObj_HasTransparency",
		      1,
		    ));
		    (Module["_FPDFPageObjMark_SetIntParam"] = createExportWrapper(
		      "FPDFPageObjMark_SetIntParam",
		      5,
		    ));
		    (Module["_FPDFPageObjMark_SetStringParam"] = createExportWrapper(
		      "FPDFPageObjMark_SetStringParam",
		      5,
		    ));
		    (Module["_FPDFPageObjMark_SetBlobParam"] = createExportWrapper(
		      "FPDFPageObjMark_SetBlobParam",
		      6,
		    ));
		    (Module["_FPDFPageObjMark_RemoveParam"] = createExportWrapper(
		      "FPDFPageObjMark_RemoveParam",
		      3,
		    ));
		    (Module["_FPDFPageObj_GetType"] = createExportWrapper("FPDFPageObj_GetType", 1));
		    (Module["_FPDFPage_GenerateContent"] = createExportWrapper(
		      "FPDFPage_GenerateContent",
		      1,
		    ));
		    (Module["_FPDFPageObj_Transform"] = createExportWrapper("FPDFPageObj_Transform", 7));
		    (Module["_FPDFPageObj_TransformF"] = createExportWrapper(
		      "FPDFPageObj_TransformF",
		      2,
		    ));
		    (Module["_FPDFPageObj_GetMatrix"] = createExportWrapper("FPDFPageObj_GetMatrix", 2));
		    (Module["_FPDFPageObj_SetMatrix"] = createExportWrapper("FPDFPageObj_SetMatrix", 2));
		    (Module["_FPDFPageObj_SetBlendMode"] = createExportWrapper(
		      "FPDFPageObj_SetBlendMode",
		      2,
		    ));
		    (Module["_FPDFPage_TransformAnnots"] = createExportWrapper(
		      "FPDFPage_TransformAnnots",
		      7,
		    ));
		    (Module["_FPDFPage_SetRotation"] = createExportWrapper("FPDFPage_SetRotation", 2));
		    (Module["_FPDFPageObj_SetFillColor"] = createExportWrapper(
		      "FPDFPageObj_SetFillColor",
		      5,
		    ));
		    (Module["_FPDFPageObj_GetFillColor"] = createExportWrapper(
		      "FPDFPageObj_GetFillColor",
		      5,
		    ));
		    (Module["_FPDFPageObj_GetBounds"] = createExportWrapper("FPDFPageObj_GetBounds", 5));
		    (Module["_FPDFPageObj_GetRotatedBounds"] = createExportWrapper(
		      "FPDFPageObj_GetRotatedBounds",
		      2,
		    ));
		    (Module["_FPDFPageObj_SetStrokeColor"] = createExportWrapper(
		      "FPDFPageObj_SetStrokeColor",
		      5,
		    ));
		    (Module["_FPDFPageObj_GetStrokeColor"] = createExportWrapper(
		      "FPDFPageObj_GetStrokeColor",
		      5,
		    ));
		    (Module["_FPDFPageObj_SetStrokeWidth"] = createExportWrapper(
		      "FPDFPageObj_SetStrokeWidth",
		      2,
		    ));
		    (Module["_FPDFPageObj_GetStrokeWidth"] = createExportWrapper(
		      "FPDFPageObj_GetStrokeWidth",
		      2,
		    ));
		    (Module["_FPDFPageObj_GetLineJoin"] = createExportWrapper(
		      "FPDFPageObj_GetLineJoin",
		      1,
		    ));
		    (Module["_FPDFPageObj_SetLineJoin"] = createExportWrapper(
		      "FPDFPageObj_SetLineJoin",
		      2,
		    ));
		    (Module["_FPDFPageObj_GetLineCap"] = createExportWrapper(
		      "FPDFPageObj_GetLineCap",
		      1,
		    ));
		    (Module["_FPDFPageObj_SetLineCap"] = createExportWrapper(
		      "FPDFPageObj_SetLineCap",
		      2,
		    ));
		    (Module["_FPDFPageObj_GetDashPhase"] = createExportWrapper(
		      "FPDFPageObj_GetDashPhase",
		      2,
		    ));
		    (Module["_FPDFPageObj_SetDashPhase"] = createExportWrapper(
		      "FPDFPageObj_SetDashPhase",
		      2,
		    ));
		    (Module["_FPDFPageObj_GetDashCount"] = createExportWrapper(
		      "FPDFPageObj_GetDashCount",
		      1,
		    ));
		    (Module["_FPDFPageObj_GetDashArray"] = createExportWrapper(
		      "FPDFPageObj_GetDashArray",
		      3,
		    ));
		    (Module["_FPDFPageObj_SetDashArray"] = createExportWrapper(
		      "FPDFPageObj_SetDashArray",
		      4,
		    ));
		    (Module["_FPDFFormObj_CountObjects"] = createExportWrapper(
		      "FPDFFormObj_CountObjects",
		      1,
		    ));
		    (Module["_FPDFFormObj_GetObject"] = createExportWrapper("FPDFFormObj_GetObject", 2));
		    (Module["_FPDFPageObj_CreateNewPath"] = createExportWrapper(
		      "FPDFPageObj_CreateNewPath",
		      2,
		    ));
		    (Module["_FPDFPageObj_CreateNewRect"] = createExportWrapper(
		      "FPDFPageObj_CreateNewRect",
		      4,
		    ));
		    (Module["_FPDFPath_CountSegments"] = createExportWrapper(
		      "FPDFPath_CountSegments",
		      1,
		    ));
		    (Module["_FPDFPath_GetPathSegment"] = createExportWrapper(
		      "FPDFPath_GetPathSegment",
		      2,
		    ));
		    (Module["_FPDFPath_MoveTo"] = createExportWrapper("FPDFPath_MoveTo", 3));
		    (Module["_FPDFPath_LineTo"] = createExportWrapper("FPDFPath_LineTo", 3));
		    (Module["_FPDFPath_BezierTo"] = createExportWrapper("FPDFPath_BezierTo", 7));
		    (Module["_FPDFPath_Close"] = createExportWrapper("FPDFPath_Close", 1));
		    (Module["_FPDFPath_SetDrawMode"] = createExportWrapper("FPDFPath_SetDrawMode", 3));
		    (Module["_FPDFPath_GetDrawMode"] = createExportWrapper("FPDFPath_GetDrawMode", 3));
		    (Module["_FPDFPathSegment_GetPoint"] = createExportWrapper(
		      "FPDFPathSegment_GetPoint",
		      3,
		    ));
		    (Module["_FPDFPathSegment_GetType"] = createExportWrapper(
		      "FPDFPathSegment_GetType",
		      1,
		    ));
		    (Module["_FPDFPathSegment_GetClose"] = createExportWrapper(
		      "FPDFPathSegment_GetClose",
		      1,
		    ));
		    (Module["_FPDFPageObj_NewTextObj"] = createExportWrapper(
		      "FPDFPageObj_NewTextObj",
		      3,
		    ));
		    (Module["_FPDFText_SetText"] = createExportWrapper("FPDFText_SetText", 2));
		    (Module["_FPDFText_SetCharcodes"] = createExportWrapper("FPDFText_SetCharcodes", 3));
		    (Module["_FPDFText_LoadFont"] = createExportWrapper("FPDFText_LoadFont", 5));
		    (Module["_FPDFText_LoadStandardFont"] = createExportWrapper(
		      "FPDFText_LoadStandardFont",
		      2,
		    ));
		    (Module["_FPDFText_LoadCidType2Font"] = createExportWrapper(
		      "FPDFText_LoadCidType2Font",
		      6,
		    ));
		    (Module["_FPDFTextObj_GetFontSize"] = createExportWrapper(
		      "FPDFTextObj_GetFontSize",
		      2,
		    ));
		    (Module["_FPDFTextObj_GetText"] = createExportWrapper("FPDFTextObj_GetText", 4));
		    (Module["_FPDFTextObj_GetRenderedBitmap"] = createExportWrapper(
		      "FPDFTextObj_GetRenderedBitmap",
		      4,
		    ));
		    (Module["_FPDFFont_Close"] = createExportWrapper("FPDFFont_Close", 1));
		    (Module["_FPDFPageObj_CreateTextObj"] = createExportWrapper(
		      "FPDFPageObj_CreateTextObj",
		      3,
		    ));
		    (Module["_FPDFTextObj_GetTextRenderMode"] = createExportWrapper(
		      "FPDFTextObj_GetTextRenderMode",
		      1,
		    ));
		    (Module["_FPDFTextObj_SetTextRenderMode"] = createExportWrapper(
		      "FPDFTextObj_SetTextRenderMode",
		      2,
		    ));
		    (Module["_FPDFTextObj_GetFont"] = createExportWrapper("FPDFTextObj_GetFont", 1));
		    (Module["_FPDFFont_GetBaseFontName"] = createExportWrapper(
		      "FPDFFont_GetBaseFontName",
		      3,
		    ));
		    (Module["_FPDFFont_GetFamilyName"] = createExportWrapper(
		      "FPDFFont_GetFamilyName",
		      3,
		    ));
		    (Module["_FPDFFont_GetFontData"] = createExportWrapper("FPDFFont_GetFontData", 4));
		    (Module["_FPDFFont_GetIsEmbedded"] = createExportWrapper(
		      "FPDFFont_GetIsEmbedded",
		      1,
		    ));
		    (Module["_FPDFFont_GetFlags"] = createExportWrapper("FPDFFont_GetFlags", 1));
		    (Module["_FPDFFont_GetWeight"] = createExportWrapper("FPDFFont_GetWeight", 1));
		    (Module["_FPDFFont_GetItalicAngle"] = createExportWrapper(
		      "FPDFFont_GetItalicAngle",
		      2,
		    ));
		    (Module["_FPDFFont_GetAscent"] = createExportWrapper("FPDFFont_GetAscent", 3));
		    (Module["_FPDFFont_GetDescent"] = createExportWrapper("FPDFFont_GetDescent", 3));
		    (Module["_FPDFFont_GetGlyphWidth"] = createExportWrapper(
		      "FPDFFont_GetGlyphWidth",
		      4,
		    ));
		    (Module["_FPDFFont_GetGlyphPath"] = createExportWrapper("FPDFFont_GetGlyphPath", 3));
		    (Module["_FPDFGlyphPath_CountGlyphSegments"] = createExportWrapper(
		      "FPDFGlyphPath_CountGlyphSegments",
		      1,
		    ));
		    (Module["_FPDFGlyphPath_GetGlyphPathSegment"] = createExportWrapper(
		      "FPDFGlyphPath_GetGlyphPathSegment",
		      2,
		    ));
		    (Module["_FSDK_SetUnSpObjProcessHandler"] = createExportWrapper(
		      "FSDK_SetUnSpObjProcessHandler",
		      1,
		    ));
		    (Module["_FSDK_SetTimeFunction"] = createExportWrapper("FSDK_SetTimeFunction", 1));
		    (Module["_FSDK_SetLocaltimeFunction"] = createExportWrapper(
		      "FSDK_SetLocaltimeFunction",
		      1,
		    ));
		    (Module["_FPDFDoc_GetPageMode"] = createExportWrapper("FPDFDoc_GetPageMode", 1));
		    (Module["_FPDFPage_Flatten"] = createExportWrapper("FPDFPage_Flatten", 2));
		    (Module["_FPDFPage_HasFormFieldAtPoint"] = createExportWrapper(
		      "FPDFPage_HasFormFieldAtPoint",
		      4,
		    ));
		    (Module["_FPDFPage_FormFieldZOrderAtPoint"] = createExportWrapper(
		      "FPDFPage_FormFieldZOrderAtPoint",
		      4,
		    ));
		    (Module["_FPDFDOC_InitFormFillEnvironment"] = createExportWrapper(
		      "FPDFDOC_InitFormFillEnvironment",
		      2,
		    ));
		    (Module["_FPDFDOC_ExitFormFillEnvironment"] = createExportWrapper(
		      "FPDFDOC_ExitFormFillEnvironment",
		      1,
		    ));
		    (Module["_FORM_OnMouseMove"] = createExportWrapper("FORM_OnMouseMove", 5));
		    (Module["_FORM_OnMouseWheel"] = createExportWrapper("FORM_OnMouseWheel", 6));
		    (Module["_FORM_OnFocus"] = createExportWrapper("FORM_OnFocus", 5));
		    (Module["_FORM_OnLButtonDown"] = createExportWrapper("FORM_OnLButtonDown", 5));
		    (Module["_FORM_OnLButtonUp"] = createExportWrapper("FORM_OnLButtonUp", 5));
		    (Module["_FORM_OnLButtonDoubleClick"] = createExportWrapper(
		      "FORM_OnLButtonDoubleClick",
		      5,
		    ));
		    (Module["_FORM_OnRButtonDown"] = createExportWrapper("FORM_OnRButtonDown", 5));
		    (Module["_FORM_OnRButtonUp"] = createExportWrapper("FORM_OnRButtonUp", 5));
		    (Module["_FORM_OnKeyDown"] = createExportWrapper("FORM_OnKeyDown", 4));
		    (Module["_FORM_OnKeyUp"] = createExportWrapper("FORM_OnKeyUp", 4));
		    (Module["_FORM_OnChar"] = createExportWrapper("FORM_OnChar", 4));
		    (Module["_FORM_GetFocusedText"] = createExportWrapper("FORM_GetFocusedText", 4));
		    (Module["_FORM_GetSelectedText"] = createExportWrapper("FORM_GetSelectedText", 4));
		    (Module["_FORM_ReplaceAndKeepSelection"] = createExportWrapper(
		      "FORM_ReplaceAndKeepSelection",
		      3,
		    ));
		    (Module["_FORM_ReplaceSelection"] = createExportWrapper("FORM_ReplaceSelection", 3));
		    (Module["_FORM_SelectAllText"] = createExportWrapper("FORM_SelectAllText", 2));
		    (Module["_FORM_CanUndo"] = createExportWrapper("FORM_CanUndo", 2));
		    (Module["_FORM_CanRedo"] = createExportWrapper("FORM_CanRedo", 2));
		    (Module["_FORM_Undo"] = createExportWrapper("FORM_Undo", 2));
		    (Module["_FORM_Redo"] = createExportWrapper("FORM_Redo", 2));
		    (Module["_FORM_ForceToKillFocus"] = createExportWrapper("FORM_ForceToKillFocus", 1));
		    (Module["_FORM_GetFocusedAnnot"] = createExportWrapper("FORM_GetFocusedAnnot", 3));
		    (Module["_FORM_SetFocusedAnnot"] = createExportWrapper("FORM_SetFocusedAnnot", 2));
		    (Module["_FPDF_FFLDraw"] = createExportWrapper("FPDF_FFLDraw", 9));
		    (Module["_FPDF_SetFormFieldHighlightColor"] = createExportWrapper(
		      "FPDF_SetFormFieldHighlightColor",
		      3,
		    ));
		    (Module["_FPDF_SetFormFieldHighlightAlpha"] = createExportWrapper(
		      "FPDF_SetFormFieldHighlightAlpha",
		      2,
		    ));
		    (Module["_FPDF_RemoveFormFieldHighlight"] = createExportWrapper(
		      "FPDF_RemoveFormFieldHighlight",
		      1,
		    ));
		    (Module["_FORM_OnAfterLoadPage"] = createExportWrapper("FORM_OnAfterLoadPage", 2));
		    (Module["_FORM_OnBeforeClosePage"] = createExportWrapper(
		      "FORM_OnBeforeClosePage",
		      2,
		    ));
		    (Module["_FORM_DoDocumentJSAction"] = createExportWrapper(
		      "FORM_DoDocumentJSAction",
		      1,
		    ));
		    (Module["_FORM_DoDocumentOpenAction"] = createExportWrapper(
		      "FORM_DoDocumentOpenAction",
		      1,
		    ));
		    (Module["_FORM_DoDocumentAAction"] = createExportWrapper(
		      "FORM_DoDocumentAAction",
		      2,
		    ));
		    (Module["_FORM_DoPageAAction"] = createExportWrapper("FORM_DoPageAAction", 3));
		    (Module["_FORM_SetIndexSelected"] = createExportWrapper("FORM_SetIndexSelected", 4));
		    (Module["_FORM_IsIndexSelected"] = createExportWrapper("FORM_IsIndexSelected", 3));
		    (Module["_FPDFDoc_GetJavaScriptActionCount"] = createExportWrapper(
		      "FPDFDoc_GetJavaScriptActionCount",
		      1,
		    ));
		    (Module["_FPDFDoc_GetJavaScriptAction"] = createExportWrapper(
		      "FPDFDoc_GetJavaScriptAction",
		      2,
		    ));
		    (Module["_FPDFDoc_CloseJavaScriptAction"] = createExportWrapper(
		      "FPDFDoc_CloseJavaScriptAction",
		      1,
		    ));
		    (Module["_FPDFJavaScriptAction_GetName"] = createExportWrapper(
		      "FPDFJavaScriptAction_GetName",
		      3,
		    ));
		    (Module["_FPDFJavaScriptAction_GetScript"] = createExportWrapper(
		      "FPDFJavaScriptAction_GetScript",
		      3,
		    ));
		    (Module["_FPDF_ImportPagesByIndex"] = createExportWrapper(
		      "FPDF_ImportPagesByIndex",
		      5,
		    ));
		    (Module["_FPDF_ImportPages"] = createExportWrapper("FPDF_ImportPages", 4));
		    (Module["_FPDF_ImportNPagesToOne"] = createExportWrapper(
		      "FPDF_ImportNPagesToOne",
		      5,
		    ));
		    (Module["_FPDF_NewXObjectFromPage"] = createExportWrapper(
		      "FPDF_NewXObjectFromPage",
		      3,
		    ));
		    (Module["_FPDF_CloseXObject"] = createExportWrapper("FPDF_CloseXObject", 1));
		    (Module["_FPDF_NewFormObjectFromXObject"] = createExportWrapper(
		      "FPDF_NewFormObjectFromXObject",
		      1,
		    ));
		    (Module["_FPDF_CopyViewerPreferences"] = createExportWrapper(
		      "FPDF_CopyViewerPreferences",
		      2,
		    ));
		    (Module["_FPDF_RenderPageBitmapWithColorScheme_Start"] =
		      createExportWrapper("FPDF_RenderPageBitmapWithColorScheme_Start", 10));
		    (Module["_FPDF_RenderPageBitmap_Start"] = createExportWrapper(
		      "FPDF_RenderPageBitmap_Start",
		      9,
		    ));
		    (Module["_FPDF_RenderPage_Continue"] = createExportWrapper(
		      "FPDF_RenderPage_Continue",
		      2,
		    ));
		    (Module["_FPDF_RenderPage_Close"] = createExportWrapper("FPDF_RenderPage_Close", 1));
		    (Module["_FPDF_SaveAsCopy"] = createExportWrapper("FPDF_SaveAsCopy", 3));
		    (Module["_FPDF_SaveWithVersion"] = createExportWrapper("FPDF_SaveWithVersion", 4));
		    (Module["_FPDFText_GetCharIndexFromTextIndex"] = createExportWrapper(
		      "FPDFText_GetCharIndexFromTextIndex",
		      2,
		    ));
		    (Module["_FPDFText_GetTextIndexFromCharIndex"] = createExportWrapper(
		      "FPDFText_GetTextIndexFromCharIndex",
		      2,
		    ));
		    (Module["_FPDF_GetSignatureCount"] = createExportWrapper(
		      "FPDF_GetSignatureCount",
		      1,
		    ));
		    (Module["_FPDF_GetSignatureObject"] = createExportWrapper(
		      "FPDF_GetSignatureObject",
		      2,
		    ));
		    (Module["_FPDFSignatureObj_GetContents"] = createExportWrapper(
		      "FPDFSignatureObj_GetContents",
		      3,
		    ));
		    (Module["_FPDFSignatureObj_GetByteRange"] = createExportWrapper(
		      "FPDFSignatureObj_GetByteRange",
		      3,
		    ));
		    (Module["_FPDFSignatureObj_GetSubFilter"] = createExportWrapper(
		      "FPDFSignatureObj_GetSubFilter",
		      3,
		    ));
		    (Module["_FPDFSignatureObj_GetReason"] = createExportWrapper(
		      "FPDFSignatureObj_GetReason",
		      3,
		    ));
		    (Module["_FPDFSignatureObj_GetTime"] = createExportWrapper(
		      "FPDFSignatureObj_GetTime",
		      3,
		    ));
		    (Module["_FPDFSignatureObj_GetDocMDPPermission"] = createExportWrapper(
		      "FPDFSignatureObj_GetDocMDPPermission",
		      1,
		    ));
		    (Module["_FPDF_StructTree_GetForPage"] = createExportWrapper(
		      "FPDF_StructTree_GetForPage",
		      1,
		    ));
		    (Module["_FPDF_StructTree_Close"] = createExportWrapper("FPDF_StructTree_Close", 1));
		    (Module["_FPDF_StructTree_CountChildren"] = createExportWrapper(
		      "FPDF_StructTree_CountChildren",
		      1,
		    ));
		    (Module["_FPDF_StructTree_GetChildAtIndex"] = createExportWrapper(
		      "FPDF_StructTree_GetChildAtIndex",
		      2,
		    ));
		    (Module["_FPDF_StructElement_GetAltText"] = createExportWrapper(
		      "FPDF_StructElement_GetAltText",
		      3,
		    ));
		    (Module["_FPDF_StructElement_GetActualText"] = createExportWrapper(
		      "FPDF_StructElement_GetActualText",
		      3,
		    ));
		    (Module["_FPDF_StructElement_GetID"] = createExportWrapper(
		      "FPDF_StructElement_GetID",
		      3,
		    ));
		    (Module["_FPDF_StructElement_GetLang"] = createExportWrapper(
		      "FPDF_StructElement_GetLang",
		      3,
		    ));
		    (Module["_FPDF_StructElement_GetAttributeCount"] = createExportWrapper(
		      "FPDF_StructElement_GetAttributeCount",
		      1,
		    ));
		    (Module["_FPDF_StructElement_GetAttributeAtIndex"] =
		      createExportWrapper("FPDF_StructElement_GetAttributeAtIndex", 2));
		    (Module["_FPDF_StructElement_GetStringAttribute"] =
		      createExportWrapper("FPDF_StructElement_GetStringAttribute", 4));
		    (Module["_FPDF_StructElement_GetMarkedContentID"] =
		      createExportWrapper("FPDF_StructElement_GetMarkedContentID", 1));
		    (Module["_FPDF_StructElement_GetType"] = createExportWrapper(
		      "FPDF_StructElement_GetType",
		      3,
		    ));
		    (Module["_FPDF_StructElement_GetObjType"] = createExportWrapper(
		      "FPDF_StructElement_GetObjType",
		      3,
		    ));
		    (Module["_FPDF_StructElement_GetTitle"] = createExportWrapper(
		      "FPDF_StructElement_GetTitle",
		      3,
		    ));
		    (Module["_FPDF_StructElement_CountChildren"] = createExportWrapper(
		      "FPDF_StructElement_CountChildren",
		      1,
		    ));
		    (Module["_FPDF_StructElement_GetChildAtIndex"] = createExportWrapper(
		      "FPDF_StructElement_GetChildAtIndex",
		      2,
		    ));
		    (Module["_FPDF_StructElement_GetChildMarkedContentID"] =
		      createExportWrapper("FPDF_StructElement_GetChildMarkedContentID", 2));
		    (Module["_FPDF_StructElement_GetParent"] = createExportWrapper(
		      "FPDF_StructElement_GetParent",
		      1,
		    ));
		    (Module["_FPDF_StructElement_Attr_GetCount"] = createExportWrapper(
		      "FPDF_StructElement_Attr_GetCount",
		      1,
		    ));
		    (Module["_FPDF_StructElement_Attr_GetName"] = createExportWrapper(
		      "FPDF_StructElement_Attr_GetName",
		      5,
		    ));
		    (Module["_FPDF_StructElement_Attr_GetValue"] = createExportWrapper(
		      "FPDF_StructElement_Attr_GetValue",
		      2,
		    ));
		    (Module["_FPDF_StructElement_Attr_GetType"] = createExportWrapper(
		      "FPDF_StructElement_Attr_GetType",
		      1,
		    ));
		    (Module["_FPDF_StructElement_Attr_GetBooleanValue"] =
		      createExportWrapper("FPDF_StructElement_Attr_GetBooleanValue", 2));
		    (Module["_FPDF_StructElement_Attr_GetNumberValue"] =
		      createExportWrapper("FPDF_StructElement_Attr_GetNumberValue", 2));
		    (Module["_FPDF_StructElement_Attr_GetStringValue"] =
		      createExportWrapper("FPDF_StructElement_Attr_GetStringValue", 4));
		    (Module["_FPDF_StructElement_Attr_GetBlobValue"] = createExportWrapper(
		      "FPDF_StructElement_Attr_GetBlobValue",
		      4,
		    ));
		    (Module["_FPDF_StructElement_Attr_CountChildren"] =
		      createExportWrapper("FPDF_StructElement_Attr_CountChildren", 1));
		    (Module["_FPDF_StructElement_Attr_GetChildAtIndex"] =
		      createExportWrapper("FPDF_StructElement_Attr_GetChildAtIndex", 2));
		    (Module["_FPDF_StructElement_GetMarkedContentIdCount"] =
		      createExportWrapper("FPDF_StructElement_GetMarkedContentIdCount", 1));
		    (Module["_FPDF_StructElement_GetMarkedContentIdAtIndex"] =
		      createExportWrapper("FPDF_StructElement_GetMarkedContentIdAtIndex", 2));
		    (Module["_FPDF_AddInstalledFont"] = createExportWrapper("FPDF_AddInstalledFont", 3));
		    (Module["_FPDF_SetSystemFontInfo"] = createExportWrapper(
		      "FPDF_SetSystemFontInfo",
		      1,
		    ));
		    (Module["_FPDF_GetDefaultTTFMap"] = createExportWrapper("FPDF_GetDefaultTTFMap", 0));
		    (Module["_FPDF_GetDefaultTTFMapCount"] = createExportWrapper(
		      "FPDF_GetDefaultTTFMapCount",
		      0,
		    ));
		    (Module["_FPDF_GetDefaultTTFMapEntry"] = createExportWrapper(
		      "FPDF_GetDefaultTTFMapEntry",
		      1,
		    ));
		    (Module["_FPDF_GetDefaultSystemFontInfo"] = createExportWrapper(
		      "FPDF_GetDefaultSystemFontInfo",
		      0,
		    ));
		    (Module["_FPDF_FreeDefaultSystemFontInfo"] = createExportWrapper(
		      "FPDF_FreeDefaultSystemFontInfo",
		      1,
		    ));
		    (Module["_FPDFText_LoadPage"] = createExportWrapper("FPDFText_LoadPage", 1));
		    (Module["_FPDFText_ClosePage"] = createExportWrapper("FPDFText_ClosePage", 1));
		    (Module["_FPDFText_CountChars"] = createExportWrapper("FPDFText_CountChars", 1));
		    (Module["_FPDFText_GetUnicode"] = createExportWrapper("FPDFText_GetUnicode", 2));
		    (Module["_FPDFText_GetTextObject"] = createExportWrapper(
		      "FPDFText_GetTextObject",
		      2,
		    ));
		    (Module["_FPDFText_IsGenerated"] = createExportWrapper("FPDFText_IsGenerated", 2));
		    (Module["_FPDFText_IsHyphen"] = createExportWrapper("FPDFText_IsHyphen", 2));
		    (Module["_FPDFText_HasUnicodeMapError"] = createExportWrapper(
		      "FPDFText_HasUnicodeMapError",
		      2,
		    ));
		    (Module["_FPDFText_GetFontSize"] = createExportWrapper("FPDFText_GetFontSize", 2));
		    (Module["_FPDFText_GetFontInfo"] = createExportWrapper("FPDFText_GetFontInfo", 5));
		    (Module["_FPDFText_GetFontWeight"] = createExportWrapper(
		      "FPDFText_GetFontWeight",
		      2,
		    ));
		    (Module["_FPDFText_GetFillColor"] = createExportWrapper("FPDFText_GetFillColor", 6));
		    (Module["_FPDFText_GetStrokeColor"] = createExportWrapper(
		      "FPDFText_GetStrokeColor",
		      6,
		    ));
		    (Module["_FPDFText_GetCharAngle"] = createExportWrapper("FPDFText_GetCharAngle", 2));
		    (Module["_FPDFText_GetCharBox"] = createExportWrapper("FPDFText_GetCharBox", 6));
		    (Module["_FPDFText_GetLooseCharBox"] = createExportWrapper(
		      "FPDFText_GetLooseCharBox",
		      3,
		    ));
		    (Module["_FPDFText_GetMatrix"] = createExportWrapper("FPDFText_GetMatrix", 3));
		    (Module["_FPDFText_GetCharOrigin"] = createExportWrapper(
		      "FPDFText_GetCharOrigin",
		      4,
		    ));
		    (Module["_FPDFText_GetCharIndexAtPos"] = createExportWrapper(
		      "FPDFText_GetCharIndexAtPos",
		      5,
		    ));
		    (Module["_FPDFText_GetText"] = createExportWrapper("FPDFText_GetText", 4));
		    (Module["_FPDFText_CountRects"] = createExportWrapper("FPDFText_CountRects", 3));
		    (Module["_FPDFText_GetRect"] = createExportWrapper("FPDFText_GetRect", 6));
		    (Module["_FPDFText_GetBoundedText"] = createExportWrapper(
		      "FPDFText_GetBoundedText",
		      7,
		    ));
		    (Module["_FPDFText_FindStart"] = createExportWrapper("FPDFText_FindStart", 4));
		    (Module["_FPDFText_FindNext"] = createExportWrapper("FPDFText_FindNext", 1));
		    (Module["_FPDFText_FindPrev"] = createExportWrapper("FPDFText_FindPrev", 1));
		    (Module["_FPDFText_GetSchResultIndex"] = createExportWrapper(
		      "FPDFText_GetSchResultIndex",
		      1,
		    ));
		    (Module["_FPDFText_GetSchCount"] = createExportWrapper("FPDFText_GetSchCount", 1));
		    (Module["_FPDFText_FindClose"] = createExportWrapper("FPDFText_FindClose", 1));
		    (Module["_FPDFLink_LoadWebLinks"] = createExportWrapper("FPDFLink_LoadWebLinks", 1));
		    (Module["_FPDFLink_CountWebLinks"] = createExportWrapper(
		      "FPDFLink_CountWebLinks",
		      1,
		    ));
		    (Module["_FPDFLink_GetURL"] = createExportWrapper("FPDFLink_GetURL", 4));
		    (Module["_FPDFLink_CountRects"] = createExportWrapper("FPDFLink_CountRects", 2));
		    (Module["_FPDFLink_GetRect"] = createExportWrapper("FPDFLink_GetRect", 7));
		    (Module["_FPDFLink_GetTextRange"] = createExportWrapper("FPDFLink_GetTextRange", 4));
		    (Module["_FPDFLink_CloseWebLinks"] = createExportWrapper(
		      "FPDFLink_CloseWebLinks",
		      1,
		    ));
		    (Module["_FPDFPage_GetDecodedThumbnailData"] = createExportWrapper(
		      "FPDFPage_GetDecodedThumbnailData",
		      3,
		    ));
		    (Module["_FPDFPage_GetRawThumbnailData"] = createExportWrapper(
		      "FPDFPage_GetRawThumbnailData",
		      3,
		    ));
		    (Module["_FPDFPage_GetThumbnailAsBitmap"] = createExportWrapper(
		      "FPDFPage_GetThumbnailAsBitmap",
		      1,
		    ));
		    (Module["_FPDFPage_SetMediaBox"] = createExportWrapper("FPDFPage_SetMediaBox", 5));
		    (Module["_FPDFPage_SetCropBox"] = createExportWrapper("FPDFPage_SetCropBox", 5));
		    (Module["_FPDFPage_SetBleedBox"] = createExportWrapper("FPDFPage_SetBleedBox", 5));
		    (Module["_FPDFPage_SetTrimBox"] = createExportWrapper("FPDFPage_SetTrimBox", 5));
		    (Module["_FPDFPage_SetArtBox"] = createExportWrapper("FPDFPage_SetArtBox", 5));
		    (Module["_FPDFPage_GetMediaBox"] = createExportWrapper("FPDFPage_GetMediaBox", 5));
		    (Module["_FPDFPage_GetCropBox"] = createExportWrapper("FPDFPage_GetCropBox", 5));
		    (Module["_FPDFPage_GetBleedBox"] = createExportWrapper("FPDFPage_GetBleedBox", 5));
		    (Module["_FPDFPage_GetTrimBox"] = createExportWrapper("FPDFPage_GetTrimBox", 5));
		    (Module["_FPDFPage_GetArtBox"] = createExportWrapper("FPDFPage_GetArtBox", 5));
		    (Module["_FPDFPage_TransFormWithClip"] = createExportWrapper(
		      "FPDFPage_TransFormWithClip",
		      3,
		    ));
		    (Module["_FPDFPageObj_TransformClipPath"] = createExportWrapper(
		      "FPDFPageObj_TransformClipPath",
		      7,
		    ));
		    (Module["_FPDFPageObj_GetClipPath"] = createExportWrapper(
		      "FPDFPageObj_GetClipPath",
		      1,
		    ));
		    (Module["_FPDFClipPath_CountPaths"] = createExportWrapper(
		      "FPDFClipPath_CountPaths",
		      1,
		    ));
		    (Module["_FPDFClipPath_CountPathSegments"] = createExportWrapper(
		      "FPDFClipPath_CountPathSegments",
		      2,
		    ));
		    (Module["_FPDFClipPath_GetPathSegment"] = createExportWrapper(
		      "FPDFClipPath_GetPathSegment",
		      3,
		    ));
		    (Module["_FPDF_CreateClipPath"] = createExportWrapper("FPDF_CreateClipPath", 4));
		    (Module["_FPDF_DestroyClipPath"] = createExportWrapper("FPDF_DestroyClipPath", 1));
		    (Module["_FPDFPage_InsertClipPath"] = createExportWrapper(
		      "FPDFPage_InsertClipPath",
		      2,
		    ));
		    (Module["_FPDF_InitLibrary"] = createExportWrapper("FPDF_InitLibrary", 0));
		    (Module["_malloc"] = createExportWrapper("malloc", 1));
		    (Module["_free"] = createExportWrapper("free", 1));
		    (Module["_FPDF_DestroyLibrary"] = createExportWrapper("FPDF_DestroyLibrary", 0));
		    (Module["_FPDF_SetSandBoxPolicy"] = createExportWrapper("FPDF_SetSandBoxPolicy", 2));
		    (Module["_FPDF_LoadDocument"] = createExportWrapper("FPDF_LoadDocument", 2));
		    (Module["_FPDF_GetFormType"] = createExportWrapper("FPDF_GetFormType", 1));
		    (Module["_FPDF_LoadXFA"] = createExportWrapper("FPDF_LoadXFA", 1));
		    (Module["_FPDF_LoadMemDocument"] = createExportWrapper("FPDF_LoadMemDocument", 3));
		    (Module["_FPDF_LoadMemDocument64"] = createExportWrapper(
		      "FPDF_LoadMemDocument64",
		      3,
		    ));
		    (Module["_FPDF_LoadCustomDocument"] = createExportWrapper(
		      "FPDF_LoadCustomDocument",
		      2,
		    ));
		    (Module["_FPDF_GetFileVersion"] = createExportWrapper("FPDF_GetFileVersion", 2));
		    (Module["_FPDF_DocumentHasValidCrossReferenceTable"] =
		      createExportWrapper("FPDF_DocumentHasValidCrossReferenceTable", 1));
		    (Module["_FPDF_GetDocPermissions"] = createExportWrapper(
		      "FPDF_GetDocPermissions",
		      1,
		    ));
		    (Module["_FPDF_GetDocUserPermissions"] = createExportWrapper(
		      "FPDF_GetDocUserPermissions",
		      1,
		    ));
		    (Module["_FPDF_GetSecurityHandlerRevision"] = createExportWrapper(
		      "FPDF_GetSecurityHandlerRevision",
		      1,
		    ));
		    (Module["_FPDF_GetPageCount"] = createExportWrapper("FPDF_GetPageCount", 1));
		    (Module["_FPDF_LoadPage"] = createExportWrapper("FPDF_LoadPage", 2));
		    (Module["_FPDF_GetPageWidthF"] = createExportWrapper("FPDF_GetPageWidthF", 1));
		    (Module["_FPDF_GetPageWidth"] = createExportWrapper("FPDF_GetPageWidth", 1));
		    (Module["_FPDF_GetPageHeightF"] = createExportWrapper("FPDF_GetPageHeightF", 1));
		    (Module["_FPDF_GetPageHeight"] = createExportWrapper("FPDF_GetPageHeight", 1));
		    (Module["_FPDF_GetPageBoundingBox"] = createExportWrapper(
		      "FPDF_GetPageBoundingBox",
		      2,
		    ));
		    (Module["_FPDF_RenderPageBitmap"] = createExportWrapper("FPDF_RenderPageBitmap", 8));
		    (Module["_FPDF_RenderPageBitmapWithMatrix"] = createExportWrapper(
		      "FPDF_RenderPageBitmapWithMatrix",
		      5,
		    ));
		    (Module["_FPDF_ClosePage"] = createExportWrapper("FPDF_ClosePage", 1));
		    (Module["_FPDF_CloseDocument"] = createExportWrapper("FPDF_CloseDocument", 1));
		    (Module["_FPDF_GetLastError"] = createExportWrapper("FPDF_GetLastError", 0));
		    (Module["_FPDF_DeviceToPage"] = createExportWrapper("FPDF_DeviceToPage", 10));
		    (Module["_FPDF_PageToDevice"] = createExportWrapper("FPDF_PageToDevice", 10));
		    (Module["_FPDFBitmap_Create"] = createExportWrapper("FPDFBitmap_Create", 3));
		    (Module["_FPDFBitmap_CreateEx"] = createExportWrapper("FPDFBitmap_CreateEx", 5));
		    (Module["_FPDFBitmap_GetFormat"] = createExportWrapper("FPDFBitmap_GetFormat", 1));
		    (Module["_FPDFBitmap_FillRect"] = createExportWrapper("FPDFBitmap_FillRect", 6));
		    (Module["_FPDFBitmap_GetBuffer"] = createExportWrapper("FPDFBitmap_GetBuffer", 1));
		    (Module["_FPDFBitmap_GetWidth"] = createExportWrapper("FPDFBitmap_GetWidth", 1));
		    (Module["_FPDFBitmap_GetHeight"] = createExportWrapper("FPDFBitmap_GetHeight", 1));
		    (Module["_FPDFBitmap_GetStride"] = createExportWrapper("FPDFBitmap_GetStride", 1));
		    (Module["_FPDFBitmap_Destroy"] = createExportWrapper("FPDFBitmap_Destroy", 1));
		    (Module["_FPDF_GetPageSizeByIndexF"] = createExportWrapper(
		      "FPDF_GetPageSizeByIndexF",
		      3,
		    ));
		    (Module["_FPDF_GetPageSizeByIndex"] = createExportWrapper(
		      "FPDF_GetPageSizeByIndex",
		      4,
		    ));
		    (Module["_FPDF_VIEWERREF_GetPrintScaling"] = createExportWrapper(
		      "FPDF_VIEWERREF_GetPrintScaling",
		      1,
		    ));
		    (Module["_FPDF_VIEWERREF_GetNumCopies"] = createExportWrapper(
		      "FPDF_VIEWERREF_GetNumCopies",
		      1,
		    ));
		    (Module["_FPDF_VIEWERREF_GetPrintPageRange"] = createExportWrapper(
		      "FPDF_VIEWERREF_GetPrintPageRange",
		      1,
		    ));
		    (Module["_FPDF_VIEWERREF_GetPrintPageRangeCount"] =
		      createExportWrapper("FPDF_VIEWERREF_GetPrintPageRangeCount", 1));
		    (Module["_FPDF_VIEWERREF_GetPrintPageRangeElement"] =
		      createExportWrapper("FPDF_VIEWERREF_GetPrintPageRangeElement", 2));
		    (Module["_FPDF_VIEWERREF_GetDuplex"] = createExportWrapper(
		      "FPDF_VIEWERREF_GetDuplex",
		      1,
		    ));
		    (Module["_FPDF_VIEWERREF_GetName"] = createExportWrapper(
		      "FPDF_VIEWERREF_GetName",
		      4,
		    ));
		    (Module["_FPDF_CountNamedDests"] = createExportWrapper("FPDF_CountNamedDests", 1));
		    (Module["_FPDF_GetNamedDestByName"] = createExportWrapper(
		      "FPDF_GetNamedDestByName",
		      2,
		    ));
		    (Module["_FPDF_GetNamedDest"] = createExportWrapper("FPDF_GetNamedDest", 4));
		    (Module["_FPDF_GetXFAPacketCount"] = createExportWrapper(
		      "FPDF_GetXFAPacketCount",
		      1,
		    ));
		    (Module["_FPDF_GetXFAPacketName"] = createExportWrapper("FPDF_GetXFAPacketName", 4));
		    (Module["_FPDF_GetXFAPacketContent"] = createExportWrapper(
		      "FPDF_GetXFAPacketContent",
		      5,
		    ));
		    (Module["_FPDF_GetTrailerEnds"] = createExportWrapper("FPDF_GetTrailerEnds", 3));
		    var _fflush = createExportWrapper("fflush", 1);
		    var _strerror = createExportWrapper("strerror", 1);
		    var _setThrew = createExportWrapper("setThrew", 2);
		    var _emscripten_stack_init = () => (_emscripten_stack_init = wasmExports["emscripten_stack_init"])();
		    var _emscripten_stack_get_end = () => (_emscripten_stack_get_end = wasmExports["emscripten_stack_get_end"])();
		    var __emscripten_stack_restore = (a0) =>
		      (__emscripten_stack_restore = wasmExports["_emscripten_stack_restore"])(a0);
		    var __emscripten_stack_alloc = (a0) => (__emscripten_stack_alloc = wasmExports["_emscripten_stack_alloc"])(a0);
		    var _emscripten_stack_get_current = () =>
		      (_emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"])();
		    (Module["dynCall_ji"] = createExportWrapper("dynCall_ji", 2));
		    (Module["dynCall_jij"] = createExportWrapper("dynCall_jij", 4));
		    (Module["dynCall_iiij"] = createExportWrapper("dynCall_iiij", 5));
		    (Module["dynCall_iij"] = createExportWrapper("dynCall_iij", 4));
		    (Module["dynCall_j"] = createExportWrapper("dynCall_j", 1));
		    (Module["dynCall_jji"] = createExportWrapper("dynCall_jji", 4));
		    (Module["dynCall_iji"] = createExportWrapper("dynCall_iji", 4));
		    (Module["dynCall_viijii"] = createExportWrapper("dynCall_viijii", 7));
		    (Module["dynCall_iiji"] = createExportWrapper("dynCall_iiji", 5));
		    (Module["dynCall_jiji"] = createExportWrapper("dynCall_jiji", 5));
		    (Module["dynCall_iiiiij"] = createExportWrapper("dynCall_iiiiij", 7));
		    (Module["dynCall_iiiiijj"] = createExportWrapper("dynCall_iiiiijj", 9));
		    (Module["dynCall_iiiiiijj"] = createExportWrapper("dynCall_iiiiiijj", 10));
		    (Module["dynCall_viji"] = createExportWrapper("dynCall_viji", 5));
		    function invoke_viii(index, a1, a2, a3) {
		      var sp = stackSave();
		      try {
		        getWasmTableEntry(index)(a1, a2, a3);
		      } catch (e) {
		        stackRestore(sp);
		        if (e !== e + 0) throw e;
		        _setThrew(1, 0);
		      }
		    }
		    function invoke_iii(index, a1, a2) {
		      var sp = stackSave();
		      try {
		        return getWasmTableEntry(index)(a1, a2);
		      } catch (e) {
		        stackRestore(sp);
		        if (e !== e + 0) throw e;
		        _setThrew(1, 0);
		      }
		    }
		    function invoke_vi(index, a1) {
		      var sp = stackSave();
		      try {
		        getWasmTableEntry(index)(a1);
		      } catch (e) {
		        stackRestore(sp);
		        if (e !== e + 0) throw e;
		        _setThrew(1, 0);
		      }
		    }
		    function invoke_ii(index, a1) {
		      var sp = stackSave();
		      try {
		        return getWasmTableEntry(index)(a1);
		      } catch (e) {
		        stackRestore(sp);
		        if (e !== e + 0) throw e;
		        _setThrew(1, 0);
		      }
		    }
		    function invoke_iiii(index, a1, a2, a3) {
		      var sp = stackSave();
		      try {
		        return getWasmTableEntry(index)(a1, a2, a3);
		      } catch (e) {
		        stackRestore(sp);
		        if (e !== e + 0) throw e;
		        _setThrew(1, 0);
		      }
		    }
		    function invoke_viiii(index, a1, a2, a3, a4) {
		      var sp = stackSave();
		      try {
		        getWasmTableEntry(index)(a1, a2, a3, a4);
		      } catch (e) {
		        stackRestore(sp);
		        if (e !== e + 0) throw e;
		        _setThrew(1, 0);
		      }
		    }
		    function invoke_iiiii(index, a1, a2, a3, a4) {
		      var sp = stackSave();
		      try {
		        return getWasmTableEntry(index)(a1, a2, a3, a4);
		      } catch (e) {
		        stackRestore(sp);
		        if (e !== e + 0) throw e;
		        _setThrew(1, 0);
		      }
		    }
		    function invoke_v(index) {
		      var sp = stackSave();
		      try {
		        getWasmTableEntry(index)();
		      } catch (e) {
		        stackRestore(sp);
		        if (e !== e + 0) throw e;
		        _setThrew(1, 0);
		      }
		    }
		    Module["wasmExports"] = wasmExports;
		    Module["ccall"] = ccall;
		    Module["cwrap"] = cwrap;
		    var missingLibrarySymbols = [
		      "writeI53ToI64",
		      "writeI53ToI64Clamped",
		      "writeI53ToI64Signaling",
		      "writeI53ToU64Clamped",
		      "writeI53ToU64Signaling",
		      "readI53FromI64",
		      "readI53FromU64",
		      "convertI32PairToI53",
		      "convertU32PairToI53",
		      "getTempRet0",
		      "setTempRet0",
		      "exitJS",
		      "arraySum",
		      "addDays",
		      "inetPton4",
		      "inetNtop4",
		      "inetPton6",
		      "inetNtop6",
		      "readSockaddr",
		      "writeSockaddr",
		      "emscriptenLog",
		      "readEmAsmArgs",
		      "jstoi_q",
		      "listenOnce",
		      "autoResumeAudioContext",
		      "dynCallLegacy",
		      "getDynCaller",
		      "dynCall",
		      "handleException",
		      "keepRuntimeAlive",
		      "runtimeKeepalivePush",
		      "runtimeKeepalivePop",
		      "callUserCallback",
		      "maybeExit",
		      "asmjsMangle",
		      "HandleAllocator",
		      "getNativeTypeSize",
		      "STACK_SIZE",
		      "STACK_ALIGN",
		      "POINTER_SIZE",
		      "ASSERTIONS",
		      "uleb128Encode",
		      "sigToWasmTypes",
		      "generateFuncType",
		      "convertJsFunctionToWasm",
		      "getEmptyTableSlot",
		      "updateTableMap",
		      "getFunctionAddress",
		      "addFunction",
		      "removeFunction",
		      "reallyNegative",
		      "unSign",
		      "strLen",
		      "reSign",
		      "formatString",
		      "intArrayToString",
		      "AsciiToString",
		      "UTF16ToString",
		      "stringToUTF16",
		      "lengthBytesUTF16",
		      "UTF32ToString",
		      "stringToUTF32",
		      "lengthBytesUTF32",
		      "stringToNewUTF8",
		      "registerKeyEventCallback",
		      "maybeCStringToJsString",
		      "findEventTarget",
		      "getBoundingClientRect",
		      "fillMouseEventData",
		      "registerMouseEventCallback",
		      "registerWheelEventCallback",
		      "registerUiEventCallback",
		      "registerFocusEventCallback",
		      "fillDeviceOrientationEventData",
		      "registerDeviceOrientationEventCallback",
		      "fillDeviceMotionEventData",
		      "registerDeviceMotionEventCallback",
		      "screenOrientation",
		      "fillOrientationChangeEventData",
		      "registerOrientationChangeEventCallback",
		      "fillFullscreenChangeEventData",
		      "registerFullscreenChangeEventCallback",
		      "JSEvents_requestFullscreen",
		      "JSEvents_resizeCanvasForFullscreen",
		      "registerRestoreOldStyle",
		      "hideEverythingExceptGivenElement",
		      "restoreHiddenElements",
		      "setLetterbox",
		      "softFullscreenResizeWebGLRenderTarget",
		      "doRequestFullscreen",
		      "fillPointerlockChangeEventData",
		      "registerPointerlockChangeEventCallback",
		      "registerPointerlockErrorEventCallback",
		      "requestPointerLock",
		      "fillVisibilityChangeEventData",
		      "registerVisibilityChangeEventCallback",
		      "registerTouchEventCallback",
		      "fillGamepadEventData",
		      "registerGamepadEventCallback",
		      "registerBeforeUnloadEventCallback",
		      "fillBatteryEventData",
		      "battery",
		      "registerBatteryEventCallback",
		      "setCanvasElementSize",
		      "getCanvasElementSize",
		      "getCallstack",
		      "convertPCtoSourceLocation",
		      "checkWasiClock",
		      "wasiRightsToMuslOFlags",
		      "wasiOFlagsToMuslOFlags",
		      "createDyncallWrapper",
		      "safeSetTimeout",
		      "setImmediateWrapped",
		      "clearImmediateWrapped",
		      "polyfillSetImmediate",
		      "getPromise",
		      "makePromise",
		      "idsToPromises",
		      "makePromiseCallback",
		      "ExceptionInfo",
		      "findMatchingCatch",
		      "Browser_asyncPrepareDataCounter",
		      "setMainLoop",
		      "getSocketFromFD",
		      "getSocketAddress",
		      "FS_unlink",
		      "FS_mkdirTree",
		      "_setNetworkCallback",
		      "heapObjectForWebGLType",
		      "toTypedArrayIndex",
		      "webgl_enable_ANGLE_instanced_arrays",
		      "webgl_enable_OES_vertex_array_object",
		      "webgl_enable_WEBGL_draw_buffers",
		      "webgl_enable_WEBGL_multi_draw",
		      "emscriptenWebGLGet",
		      "computeUnpackAlignedImageSize",
		      "colorChannelsInGlTextureFormat",
		      "emscriptenWebGLGetTexPixelData",
		      "emscriptenWebGLGetUniform",
		      "webglGetUniformLocation",
		      "webglPrepareUniformLocationsBeforeFirstUse",
		      "webglGetLeftBracePos",
		      "emscriptenWebGLGetVertexAttrib",
		      "__glGetActiveAttribOrUniform",
		      "writeGLArray",
		      "registerWebGlEventCallback",
		      "runAndAbortIfError",
		      "ALLOC_NORMAL",
		      "ALLOC_STACK",
		      "allocate",
		      "writeStringToMemory",
		      "writeAsciiToMemory",
		      "setErrNo",
		    ];
		    missingLibrarySymbols.forEach(missingLibrarySymbol);
		    var unexportedSymbols = [
		      "run",
		      "addOnPreRun",
		      "addOnInit",
		      "addOnPreMain",
		      "addOnExit",
		      "addOnPostRun",
		      "addRunDependency",
		      "removeRunDependency",
		      "out",
		      "err",
		      "callMain",
		      "abort",
		      "wasmMemory",
		      "writeStackCookie",
		      "checkStackCookie",
		      "convertI32PairToI53Checked",
		      "stackSave",
		      "stackRestore",
		      "stackAlloc",
		      "ptrToString",
		      "zeroMemory",
		      "getHeapMax",
		      "growMemory",
		      "ENV",
		      "MONTH_DAYS_REGULAR",
		      "MONTH_DAYS_LEAP",
		      "MONTH_DAYS_REGULAR_CUMULATIVE",
		      "MONTH_DAYS_LEAP_CUMULATIVE",
		      "isLeapYear",
		      "ydayFromDate",
		      "ERRNO_CODES",
		      "strError",
		      "DNS",
		      "Protocols",
		      "Sockets",
		      "initRandomFill",
		      "randomFill",
		      "timers",
		      "warnOnce",
		      "readEmAsmArgsArray",
		      "jstoi_s",
		      "getExecutableName",
		      "asyncLoad",
		      "alignMemory",
		      "mmapAlloc",
		      "wasmTable",
		      "noExitRuntime",
		      "getCFunc",
		      "freeTableIndexes",
		      "functionsInTableMap",
		      "setValue",
		      "getValue",
		      "PATH",
		      "PATH_FS",
		      "UTF8Decoder",
		      "UTF8ArrayToString",
		      "UTF8ToString",
		      "stringToUTF8Array",
		      "stringToUTF8",
		      "lengthBytesUTF8",
		      "intArrayFromString",
		      "stringToAscii",
		      "UTF16Decoder",
		      "stringToUTF8OnStack",
		      "writeArrayToMemory",
		      "JSEvents",
		      "specialHTMLTargets",
		      "findCanvasEventTarget",
		      "currentFullscreenStrategy",
		      "restoreOldWindowedStyle",
		      "jsStackTrace",
		      "UNWIND_CACHE",
		      "ExitStatus",
		      "getEnvStrings",
		      "doReadv",
		      "doWritev",
		      "promiseMap",
		      "uncaughtExceptionCount",
		      "exceptionLast",
		      "exceptionCaught",
		      "Browser",
		      "getPreloadedImageData__data",
		      "wget",
		      "SYSCALLS",
		      "preloadPlugins",
		      "FS_createPreloadedFile",
		      "FS_modeStringToFlags",
		      "FS_getMode",
		      "FS_stdin_getChar_buffer",
		      "FS_stdin_getChar",
		      "FS_createPath",
		      "FS_createDevice",
		      "FS_readFile",
		      "FS",
		      "FS_createDataFile",
		      "FS_createLazyFile",
		      "MEMFS",
		      "TTY",
		      "PIPEFS",
		      "SOCKFS",
		      "tempFixedLengthArray",
		      "miniTempWebGLFloatBuffers",
		      "miniTempWebGLIntBuffers",
		      "GL",
		      "AL",
		      "GLUT",
		      "EGL",
		      "GLEW",
		      "IDBStore",
		      "SDL",
		      "SDL_gfx",
		      "allocateUTF8",
		      "allocateUTF8OnStack",
		      "demangle",
		      "stackTrace",
		      "print",
		      "printErr",
		    ];
		    unexportedSymbols.forEach(unexportedRuntimeSymbol);
		    var calledRun;
		    dependenciesFulfilled = function runCaller() {
		      if (!calledRun) run();
		      if (!calledRun) dependenciesFulfilled = runCaller;
		    };
		    function stackCheckInit() {
		      _emscripten_stack_init();
		      writeStackCookie();
		    }
		    function run() {
		      if (runDependencies > 0) {
		        return;
		      }
		      stackCheckInit();
		      preRun();
		      if (runDependencies > 0) {
		        return;
		      }
		      function doRun() {
		        if (calledRun) return;
		        calledRun = true;
		        Module["calledRun"] = true;
		        if (ABORT) return;
		        initRuntime();
		        readyPromiseResolve(Module);
		        Module["onRuntimeInitialized"]?.();
		        assert(
		          !Module["_main"],
		          'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]',
		        );
		        postRun();
		      }
		      if (Module["setStatus"]) {
		        Module["setStatus"]("Running...");
		        setTimeout(function () {
		          setTimeout(function () {
		            Module["setStatus"]("");
		          }, 1);
		          doRun();
		        }, 1);
		      } else {
		        doRun();
		      }
		      checkStackCookie();
		    }
		    if (Module["preInit"]) {
		      if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
		      while (Module["preInit"].length > 0) {
		        Module["preInit"].pop()();
		      }
		    }
		    run();
		    moduleRtn = readyPromise;
		    for (const prop of Object.keys(Module)) {
		      if (!(prop in moduleArg)) {
		        Object.defineProperty(moduleArg, prop, {
		          configurable: true,
		          get() {
		            abort(
		              `Access to module property ('${prop}') is no longer possible via the module constructor argument; Instead, use the result of the module constructor.`,
		            );
		          },
		        });
		      }
		    }

		    return moduleRtn;
		  };
		})();
		module.exports = PDFiumModule; 
	} (pdfium));
	return pdfium.exports;
}

var pdfiumExports = requirePdfium();
var PDFiumModule = /*@__PURE__*/getDefaultExportFromCjs(pdfiumExports);

class PDFiumLibrary extends PDFiumLibrary$1 {
    static init(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield PDFiumLibrary$1.initBase({
                vendor: PDFiumModule,
                wasmBinary: options === null || options === void 0 ? void 0 : options.wasmBinary,
                wasmUrl: options === null || options === void 0 ? void 0 : options.wasmUrl,
                instantiateWasm: options === null || options === void 0 ? void 0 : options.instantiateWasm,
            });
        });
    }
}

exports.FPDFMetadataTag = FPDFMetadataTag;
exports.FPDFPathSegmentType = FPDFPathSegmentType;
exports.FPDFProgressiveStatus = FPDFProgressiveStatus;
exports.FPDF_OCG_INTENT_ALL = FPDF_OCG_INTENT_ALL;
exports.FPDF_OCG_INTENT_DESIGN = FPDF_OCG_INTENT_DESIGN;
exports.FPDF_OCG_INTENT_VIEW = FPDF_OCG_INTENT_VIEW;
exports.FPDF_OCG_STATE_OFF = FPDF_OCG_STATE_OFF;
exports.FPDF_OCG_STATE_ON = FPDF_OCG_STATE_ON;
exports.FPDF_OCG_STATE_UNCHANGED = FPDF_OCG_STATE_UNCHANGED;
exports.FPDF_OCG_USAGE_DESIGN = FPDF_OCG_USAGE_DESIGN;
exports.FPDF_OCG_USAGE_EXPORT = FPDF_OCG_USAGE_EXPORT;
exports.FPDF_OCG_USAGE_PRINT = FPDF_OCG_USAGE_PRINT;
exports.FPDF_OCG_USAGE_VIEW = FPDF_OCG_USAGE_VIEW;
exports.OCGContext = OCGContext;
exports.OCGManager = OCGManager;
exports.PDFiumDocument = PDFiumDocument;
exports.PDFiumFormObject = PDFiumFormObject;
exports.PDFiumImageObject = PDFiumImageObject;
exports.PDFiumLibrary = PDFiumLibrary;
exports.PDFiumModule = PDFiumModule;
exports.PDFiumPage = PDFiumPage;
exports.PDFiumPathObject = PDFiumPathObject;
exports.PDFiumProgressiveRenderer = PDFiumProgressiveRenderer;
exports.PDFiumShadingObject = PDFiumShadingObject;
exports.PDFiumTextObject = PDFiumTextObject;
exports.getOCGStateName = getOCGStateName;
exports.getOCGUsageName = getOCGUsageName;
