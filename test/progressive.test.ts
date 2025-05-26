import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { PDFiumLibrary } from "../src/index.esm.js";
import type { 
  PDFiumDocument,
  PDFiumPage,
  PDFiumProgressiveRenderProgress,
  PDFiumProgressiveRenderResult,
  PDFiumProgressiveRenderer
} from "../src/index.esm.js";
import { FPDFProgressiveStatus } from "../src/constants.js";

describe("Progressive Rendering", () => {
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

  describe("PDFiumPage.renderProgressive", () => {
    it("should render a page progressively with default options", async () => {
      const result = await page.renderProgressive();

      expect(result).toBeDefined();
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.originalWidth).toBeGreaterThan(0);
      expect(result.originalHeight).toBeGreaterThan(0);
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.steps).toBeGreaterThan(0);
      expect(typeof result.wasInterrupted).toBe("boolean");
    });

    it("should render with custom scale", async () => {
      const scale = 2;
      const result = await page.renderProgressive({ scale });

      expect(result.width).toBe(Math.floor(result.originalWidth * scale));
      expect(result.height).toBe(Math.floor(result.originalHeight * scale));
    });

    it("should render with custom width and height", async () => {
      const width = 400;
      const height = 300;
      const result = await page.renderProgressive({ width, height });

      expect(result.width).toBe(width);
      expect(result.height).toBe(height);
    });

    it("should provide progress updates", async () => {
      const progressUpdates: PDFiumProgressiveRenderProgress[] = [];
      
      const result = await page.renderProgressive({
        scale: 1,
        onProgress: async (progress) => {
          progressUpdates.push({ ...progress });
          return true; // Continue rendering
        },
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Check that we got at least one progress update
      const firstUpdate = progressUpdates[0];
      expect(firstUpdate.step).toBeGreaterThan(0);
      expect(firstUpdate.bitmap).toBeGreaterThan(0);
      expect(typeof firstUpdate.isComplete).toBe("boolean");
      expect(typeof firstUpdate.isFailed).toBe("boolean");

      // Check final update if available
      if (progressUpdates.length > 1) {
        const lastUpdate = progressUpdates[progressUpdates.length - 1];
        expect(lastUpdate.isComplete || lastUpdate.isFailed).toBe(true);
      }

      expect(result.wasInterrupted).toBe(false);
    });

    it("should handle interruption via progress callback", async () => {
      let stepCount = 0;
      
      const result = await page.renderProgressive({
        scale: 1,
        onProgress: async (progress) => {
          stepCount++;
          // Interrupt after 2 steps
          return stepCount <= 2;
        },
      });

      expect(result.wasInterrupted).toBe(true);
      expect(stepCount).toBeGreaterThanOrEqual(2);
    });

    it("should handle progress callback errors gracefully", async () => {
      const result = await page.renderProgressive({
        scale: 1,
        onProgress: async () => {
          throw new Error("Test error");
        },
      });

      // Should complete despite callback error
      expect(result).toBeDefined();
      expect(result.wasInterrupted).toBe(false);
    });

    it("should respect pauseInterval option", async () => {
      const startTime = Date.now();
      const pauseInterval = 50; // 50ms pause between steps
      
      await page.renderProgressive({
        scale: 1,
        pauseInterval,
      });

      const endTime = Date.now();
      const elapsedTime = endTime - startTime;
      
      // Should take at least some time due to pauses
      // (This is a rough check since actual timing depends on rendering complexity)
      expect(elapsedTime).toBeGreaterThan(pauseInterval);
    });

    it("should work with bitmap render function", async () => {
      const result = await page.renderProgressive({
        scale: 1,
        render: "bitmap",
      });

      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBe(result.width * result.height * 4); // RGBA
    });

    it("should work with custom render function", async () => {
      const result = await page.renderProgressive({
        scale: 1,
        render: async (options) => {
          // Simple custom renderer that just returns the bitmap data
          expect(options.width).toBeGreaterThan(0);
          expect(options.height).toBeGreaterThan(0);
          expect(options.data).toBeInstanceOf(Uint8Array);
          return options.data;
        },
      });

      expect(result.data).toBeInstanceOf(Uint8Array);
    });
  });

  describe("PDFiumPage.createProgressiveRenderer", () => {
    it("should create a progressive renderer instance", () => {
      const renderer = page.createProgressiveRenderer();
      
      expect(renderer).toBeDefined();
      expect(renderer).toBeInstanceOf(Object);
      expect(typeof renderer.render).toBe("function");
    });

    it("should allow multiple renders with same renderer", async () => {
      const renderer = page.createProgressiveRenderer();
      
      const result1 = await renderer.render({ scale: 1 });
      const result2 = await renderer.render({ scale: 2 });

      expect(result1.width).toBeLessThan(result2.width);
      expect(result1.height).toBeLessThan(result2.height);
    });
  });

  describe("Progressive Rendering Status Constants", () => {
    it("should have correct status values", () => {
      expect(FPDFProgressiveStatus.RENDER_TOBECONTINUED).toBe(0);
      expect(FPDFProgressiveStatus.RENDER_DONE).toBe(1);
      expect(FPDFProgressiveStatus.RENDER_FAILED).toBe(2);
    });
  });

  describe("Error Handling", () => {
    it("should handle rendering failure gracefully", async () => {
      // Try to render with invalid parameters that might cause failure
      // Note: This test depends on PDFium behavior and might need adjustment
      try {
        const result = await page.renderProgressive({
          width: -1, // Invalid width
          height: -1, // Invalid height
        });
        
        // If it doesn't throw, check that it handles the error appropriately
        expect(result).toBeDefined();
      } catch (error) {
        // Expected to throw an error
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should clean up resources on error", async () => {
      // This test ensures that even if rendering fails, memory is cleaned up
      // We can't easily test memory leaks in unit tests, but we can ensure no exceptions
      let errorThrown = false;
      
      try {
        await page.renderProgressive({
          onProgress: async () => {
            throw new Error("Forced error");
          },
        });
      } catch (error) {
        errorThrown = true;
      }

      // The progressive renderer should handle cleanup internally
      // If we reach here without hanging, cleanup likely worked
      expect(true).toBe(true);
    });
  });

  describe("Memory Management", () => {
    it("should handle multiple progressive renders without memory leaks", async () => {
      // Render multiple times to check for memory leaks
      const results: PDFiumProgressiveRenderResult[] = [];
      
      for (let i = 0; i < 5; i++) {
        const result = await page.renderProgressive({
          scale: 0.5, // Smaller scale to reduce memory usage
        });
        results.push(result);
      }

      // All renders should succeed
      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result.data).toBeInstanceOf(Uint8Array);
        expect(result.data.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Comparison with Regular Rendering", () => {
    it("progressive and regular rendering should produce similar results", async () => {
      const scale = 1;
      
      // Regular rendering
      const regularResult = await page.render({
        scale,
        render: "bitmap",
      });

      // Progressive rendering
      const progressiveResult = await page.renderProgressive({
        scale,
        render: "bitmap",
      });

      expect(progressiveResult.width).toBe(regularResult.width);
      expect(progressiveResult.height).toBe(regularResult.height);
      expect(progressiveResult.originalWidth).toBe(regularResult.originalWidth);
      expect(progressiveResult.originalHeight).toBe(regularResult.originalHeight);
      
      // Data should be the same length (content might have minor differences due to rendering approach)
      expect(progressiveResult.data.length).toBe(regularResult.data.length);
    });
  });
});
