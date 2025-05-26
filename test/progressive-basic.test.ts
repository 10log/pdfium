import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { PDFiumLibrary } from "../src/index.esm.js";
import type { PDFiumDocument, PDFiumPage } from "../src/index.esm.js";
import { FPDFProgressiveStatus } from "../src/constants.js";

describe("Progressive Rendering - Basic", () => {
  let library: PDFiumLibrary;
  let document: PDFiumDocument;
  let page: PDFiumPage;

  beforeAll(async () => {
    library = await PDFiumLibrary.init();
    const buffer = readFileSync(join(process.cwd(), "test", "data", "test_1.pdf"));
    document = await library.loadDocument(buffer);
    page = document.getPage(0);
  });

  afterAll(() => {
    if (document) {
      document.destroy();
    }
    if (library) {
      library.destroy();
    }
  });

  it("should have progressive rendering methods", () => {
    expect(typeof page.renderProgressive).toBe("function");
    expect(typeof page.createProgressiveRenderer).toBe("function");
  });

  it("should have progressive status constants", () => {
    expect(FPDFProgressiveStatus.RENDER_TOBECONTINUED).toBe(0);
    expect(FPDFProgressiveStatus.RENDER_DONE).toBe(1);
    expect(FPDFProgressiveStatus.RENDER_FAILED).toBe(2);
  });

  it("should create a progressive renderer", () => {
    const renderer = page.createProgressiveRenderer();
    expect(renderer).toBeDefined();
    expect(typeof renderer.render).toBe("function");
  });

  it("should render progressively with minimal options", async () => {
    const result = await page.renderProgressive({
      scale: 0.5, // Small scale for faster testing
    });

    expect(result).toBeDefined();
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.data).toBeInstanceOf(Uint8Array);
    expect(result.steps).toBeGreaterThan(0);
    expect(typeof result.wasInterrupted).toBe("boolean");
  });
});
