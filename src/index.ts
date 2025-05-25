/**
 * All the exports from the PDFium module, never use it directly, re-export them in platform-specific index files
 */
export { PDFiumDocument } from "./document.js";
export { PDFiumPage } from "./page.js";
export type {
  PDFiumPageRenderFunction,
  PDFiumPageRenderOptions,
  PDFiumPageSize,
  PDFiumPageRender,
  PDFiumEnhancedTextExtraction,
  PDFiumTextCharacter,
  PDFiumTextCharacterBounds,
  PDFiumTextCharacterOrigin,
  PDFiumTextCharacterColor,
  PDFiumTextCharacterFont,
  PDFiumPageLabel,
} from "./page.types.js";
export type {
  PDFiumDocumentMetadata,
  PDFiumMetadataTagName,
} from "./document.types.js";
export {
  PDFiumObjectType,
  PDFiumImageObjectRenderParams,
  PDFiumImageObjectRender,
  PDFiumPathData,
  PDFiumPathSegment,
  PDFiumPathSegmentType,
} from "./objects.types.js";
export {
  PDFiumTextObject,
  PDFiumPathObject,
  PDFiumImageObject,
  PDFiumShadingObject,
  PDFiumFormObject,
  PDFiumObject,
} from "./objects.js";
export { FPDFPathSegmentType, FPDFMetadataTag } from "./constants.js";

// OCG (Optional Content Groups) exports
export {
  OCGManager,
  OCGContext,
  getOCGUsageName,
  getOCGStateName,
  type OCGInfo,
  type OCGRadioButtonGroup,
  type OCGOrder,
} from "./ocg.js";

// OCG constants
export {
  FPDF_OCG_STATE_ON,
  FPDF_OCG_STATE_OFF,
  FPDF_OCG_STATE_UNCHANGED,
  FPDF_OCG_USAGE_VIEW,
  FPDF_OCG_USAGE_DESIGN,
  FPDF_OCG_USAGE_PRINT,
  FPDF_OCG_USAGE_EXPORT,
  FPDF_OCG_INTENT_VIEW,
  FPDF_OCG_INTENT_DESIGN,
  FPDF_OCG_INTENT_ALL,
} from "./constants.js";
