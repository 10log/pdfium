/**
 * Document metadata information extracted from a PDF document.
 */
export interface PDFiumDocumentMetadata {
  /** Document title */
  title?: string;
  /** Document author */
  author?: string;
  /** Document subject */
  subject?: string;
  /** Document keywords */
  keywords?: string;
  /** Application that created the document */
  creator?: string;
  /** Application that produced the PDF */
  producer?: string;
  /** Document creation date */
  creationDate?: string;
  /** Document modification date */
  modifiedDate?: string;
}

/**
 * Type representing valid PDF metadata tag names.
 */
export type PDFiumMetadataTagName =
  | "Title"
  | "Author"
  | "Subject"
  | "Keywords"
  | "Creator"
  | "Producer"
  | "CreationDate"
  | "ModDate";
