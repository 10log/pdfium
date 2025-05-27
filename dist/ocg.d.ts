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
export declare class OCGContext {
    private lib;
    private contextPtr;
    private documentPtr;
    constructor(lib: t.PDFium, documentPtr: number, usage?: number);
    /**
     * Set the state of an OCG in this context
     */
    setOCGState(ocg: number, state: number): void;
    /**
     * Get the state of an OCG in this context
     */
    getOCGState(ocg: number): number;
    /**
     * Check if a page object is visible in this OCG context
     */
    isPageObjectVisible(pageObject: number): boolean;
    /**
     * Get the raw context pointer (for internal use)
     */
    getContextPtr(): number;
    /**
     * Destroy the OCG context and free resources
     */
    destroy(): void;
}
export declare class OCGManager {
    private lib;
    private documentPtr;
    constructor(lib: t.PDFium, documentPtr: number);
    /**
     * Get the total number of OCGs in the document
     */
    getOCGCount(): number;
    /**
     * Get an OCG handle by index
     */
    getOCG(index: number): number;
    /**
     * Get the name of an OCG
     */
    getOCGName(ocg: number): string;
    /**
     * Get the usage type of an OCG
     */
    getOCGUsage(ocg: number): number;
    /**
     * Set the global state of an OCG in the document
     */
    setOCGState(ocg: number, state: number): boolean;
    /**
     * Get the global state of an OCG in the document
     */
    getOCGState(ocg: number): number;
    /**
     * Check if an OCG is in the default configuration
     */
    isOCGInDefaultConfig(ocg: number): boolean;
    /**
     * Get the intent of an OCG
     */
    getOCGIntent(ocg: number): string[];
    /**
     * Get comprehensive information about an OCG
     */
    getOCGInfo(index: number): OCGInfo | null;
    /**
     * Get all OCGs in the document
     */
    getAllOCGs(): OCGInfo[];
    /**
     * Get OCG order structure (for UI hierarchy)
     */
    getOCGOrder(): OCGOrder[];
    /**
     * Get radio button groups (mutually exclusive OCG groups)
     */
    getRadioButtonGroups(): OCGRadioButtonGroup[];
    /**
     * Create an OCG context for specific usage
     */
    createContext(usage?: number): OCGContext;
    /**
     * Set multiple OCG states at once
     */
    setMultipleOCGStates(states: Map<number, number>): void;
    /**
     * Turn on all OCGs
     */
    showAllLayers(): void;
    /**
     * Turn off all OCGs
     */
    hideAllLayers(): void;
    /**
     * Reset all OCGs to their default states
     */
    resetToDefaultStates(): void;
    /**
     * Find OCGs by name (partial match)
     */
    findOCGsByName(namePattern: string): OCGInfo[];
    /**
     * Find OCGs by intent
     */
    findOCGsByIntent(intent: string): OCGInfo[];
    private parseOCGOrderData;
    private parseRadioButtonGroupData;
}
/**
 * Utility function to get OCG usage type name
 */
export declare function getOCGUsageName(usage: number): string;
/**
 * Utility function to get OCG state name
 */
export declare function getOCGStateName(state: number): string;
