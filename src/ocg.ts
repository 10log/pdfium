import {
  FPDF_OCG_INTENT_ALL,
  FPDF_OCG_INTENT_DESIGN,
  FPDF_OCG_INTENT_VIEW,
  FPDF_OCG_STATE_OFF,
  FPDF_OCG_STATE_ON,
  FPDF_OCG_STATE_UNCHANGED,
  FPDF_OCG_USAGE_DESIGN,
  FPDF_OCG_USAGE_EXPORT,
  FPDF_OCG_USAGE_PRINT,
  FPDF_OCG_USAGE_VIEW,
} from "./constants.js";
import type * as t from "./vendor/pdfium.js";

export interface OCGInfo {
  index: number;
  name: string;
  state: number;
  usage: number;
  intent: string[];
  isInDefaultConfig: boolean;
}

export interface OCGRadioButtonGroup {
  ocgs: number[];
}

export interface OCGOrder {
  type: "group" | "ocg";
  name?: string;
  ocg?: number;
  children?: OCGOrder[];
}

export class OCGContext {
  private lib: t.PDFium;
  private contextPtr: number;
  private documentPtr: number;

  constructor(lib: t.PDFium, documentPtr: number, usage: number = FPDF_OCG_USAGE_VIEW) {
    this.lib = lib;
    this.documentPtr = documentPtr;
    try {
      this.contextPtr = this.lib._FPDF_CreateOCGContext ? this.lib._FPDF_CreateOCGContext(documentPtr, usage) : 0;
      if (!this.contextPtr) {
        console.warn("OCG context creation failed - OCG APIs may not be available");
      }
    } catch (error) {
      console.warn("OCG API not available in this PDFium build:", error);
      this.contextPtr = 0;
    }
  }

  /**
   * Set the state of an OCG in this context
   */
  setOCGState(ocg: number, state: number): void {
    this.lib._FPDF_SetOCGContextState(this.contextPtr, ocg, state);
  }

  /**
   * Get the state of an OCG in this context
   */
  getOCGState(ocg: number): number {
    return this.lib._FPDF_GetOCGContextState(this.contextPtr, ocg);
  }

  /**
   * Check if a page object is visible in this OCG context
   */
  isPageObjectVisible(pageObject: number): boolean {
    return this.lib._FPDF_CheckPageObjectVisible(this.contextPtr, pageObject) === 1;
  }

  /**
   * Get the raw context pointer (for internal use)
   */
  getContextPtr(): number {
    return this.contextPtr;
  }

  /**
   * Destroy the OCG context and free resources
   */
  destroy(): void {
    if (this.contextPtr) {
      this.lib._FPDF_DestroyOCGContext(this.contextPtr);
      this.contextPtr = 0;
    }
  }
}

export class OCGManager {
  private lib: t.PDFium;
  private documentPtr: number;

  constructor(lib: t.PDFium, documentPtr: number) {
    this.lib = lib;
    this.documentPtr = documentPtr;
  }

  /**
   * Get the total number of OCGs in the document
   */
  getOCGCount(): number {
    try {
      return this.lib._FPDF_GetOCGCount ? this.lib._FPDF_GetOCGCount(this.documentPtr) : 0;
    } catch (error) {
      console.warn("OCG API not available in this PDFium build:", error);
      return 0;
    }
  }

  /**
   * Get an OCG handle by index
   */
  getOCG(index: number): number {
    try {
      return this.lib._FPDF_GetOCG ? this.lib._FPDF_GetOCG(this.documentPtr, index) : 0;
    } catch (error) {
      console.warn("OCG API not available in this PDFium build:", error);
      return 0;
    }
  }

  /**
   * Get the name of an OCG
   */
  getOCGName(ocg: number): string {
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
      } finally {
        this.lib.wasmExports.free(buffer);
      }
    } catch (error) {
      console.warn("OCG name API not available in this PDFium build:", error);
      return "";
    }
  }

  /**
   * Get the usage type of an OCG
   */
  getOCGUsage(ocg: number): number {
    return this.lib._FPDF_GetOCGUsage(ocg);
  }

  /**
   * Set the global state of an OCG in the document
   */
  setOCGState(ocg: number, state: number): boolean {
    return this.lib._FPDF_SetOCGState(this.documentPtr, ocg, state) === 1;
  }

  /**
   * Get the global state of an OCG in the document
   */
  getOCGState(ocg: number): number {
    return this.lib._FPDF_GetOCGState(this.documentPtr, ocg);
  }

  /**
   * Check if an OCG is in the default configuration
   */
  isOCGInDefaultConfig(ocg: number): boolean {
    return this.lib._FPDF_IsOCGInDefaultConfig(this.documentPtr, ocg) === 1;
  }

  /**
   * Get the intent of an OCG
   */
  getOCGIntent(ocg: number): string[] {
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
        return intentString.split(/\s+/).filter((intent: string) => intent.length > 0);
      } finally {
        this.lib.wasmExports.free(buffer);
      }
    } catch (error) {
      console.warn("OCG intent API not available in this PDFium build:", error);
      return [];
    }
  }

  /**
   * Get comprehensive information about an OCG
   */
  getOCGInfo(index: number): OCGInfo | null {
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
  getAllOCGs(): OCGInfo[] {
    const count = this.getOCGCount();
    const ocgs: OCGInfo[] = [];

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
  getOCGOrder(): OCGOrder[] {
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
      } finally {
        this.lib.wasmExports.free(buffer);
      }
    } catch (error) {
      console.warn("OCG order API not available in this PDFium build:", error);
      return [];
    }
  }

  /**
   * Get radio button groups (mutually exclusive OCG groups)
   */
  getRadioButtonGroups(): OCGRadioButtonGroup[] {
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
      } finally {
        this.lib.wasmExports.free(buffer);
      }
    } catch (error) {
      console.warn("OCG radio button groups API not available in this PDFium build:", error);
      return [];
    }
  }

  /**
   * Create an OCG context for specific usage
   */
  createContext(usage: number = FPDF_OCG_USAGE_VIEW): OCGContext {
    return new OCGContext(this.lib, this.documentPtr, usage);
  }

  /**
   * Set multiple OCG states at once
   */
  setMultipleOCGStates(states: Map<number, number>): void {
    for (const [ocg, state] of states) {
      this.setOCGState(ocg, state);
    }
  }

  /**
   * Turn on all OCGs
   */
  showAllLayers(): void {
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
  hideAllLayers(): void {
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
  resetToDefaultStates(): void {
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
  findOCGsByName(namePattern: string): OCGInfo[] {
    const allOCGs = this.getAllOCGs();
    const pattern = namePattern.toLowerCase();
    return allOCGs.filter((ocg) => ocg.name.toLowerCase().includes(pattern));
  }

  /**
   * Find OCGs by intent
   */
  findOCGsByIntent(intent: string): OCGInfo[] {
    const allOCGs = this.getAllOCGs();
    return allOCGs.filter((ocg) => ocg.intent.includes(intent));
  }

  private parseOCGOrderData(buffer: number, bufferSize: number): OCGOrder[] {
    // This is a simplified parser - the actual implementation would need to
    // parse the specific format returned by PDFium for OCG order data
    // For now, return an empty array as this would require detailed knowledge
    // of PDFium's internal data format
    return [];
  }

  private parseRadioButtonGroupData(buffer: number, bufferSize: number): OCGRadioButtonGroup[] {
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
export function getOCGUsageName(usage: number): string {
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
export function getOCGStateName(state: number): string {
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
