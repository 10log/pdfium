import type { PDFiumRenderFunction, PDFiumRenderOptions } from "./types.js";

export type PDFiumPageRenderFunction = PDFiumRenderFunction;
export type PDFiumPageRenderOptions = PDFiumRenderOptions;

export type PDFiumPageRenderCallback = (options: PDFiumPageRenderOptions) => Promise<Uint8Array>;
export type PDFiumPageRenderParams = {
  render: PDFiumPageRenderFunction;
} & (
  | {
      scale: number;
    }
  | {
      width: number;
      height: number;
    }
);

export type PDFiumPageSize = {
  width: number;
  height: number;
};

export type PDFiumPageRender = {
  width: number;
  height: number;
  originalHeight: number;
  originalWidth: number;
  data: Uint8Array;
};

// Enhanced text extraction types
export type PDFiumTextCharacterBounds = {
  left: number;
  right: number;
  bottom: number;
  top: number;
};

export type PDFiumTextCharacterOrigin = {
  x: number;
  y: number;
};

export type PDFiumTextCharacterColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type PDFiumTextCharacterFont = {
  name: string;
  size: number;
  weight: number;
  flags: number;
};

export type PDFiumTextCharacter = {
  char: string;
  unicode: number;
  index: number;
  bounds: PDFiumTextCharacterBounds;
  origin: PDFiumTextCharacterOrigin;
  font: PDFiumTextCharacterFont;
  fillColor: PDFiumTextCharacterColor;
  strokeColor: PDFiumTextCharacterColor;
  angle: number;
  isGenerated: boolean;
  isHyphen: boolean;
};

export type PDFiumEnhancedTextExtraction = {
  text: string;
  characters: PDFiumTextCharacter[];
  charCount: number;
};

// Page label types
export type PDFiumPageLabel = {
  label: string;
  hasLabel: boolean;
};
