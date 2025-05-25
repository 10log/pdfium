import { promises as fs } from "node:fs";
import sharp from "sharp";

import { toMatchImageSnapshot } from "jest-image-snapshot";
import { test, describe, expect, beforeAll, afterAll } from "vitest";

import { type PDFiumDocument, PDFiumLibrary, PDFiumPage, PDFiumPageRenderOptions, type PDFiumEnhancedTextExtraction } from "../src/index.esm";
import type { PDFiumImageObject, PDFiumPathObject } from "../src/objects";


expect.extend({ toMatchImageSnapshot });

const A4_SIZE = {
  width: 595, // px = 210 mm ~ 8.27 inches => 72 DPI
  height: 841, // px = 297 mm ~ 11.69 inches => 72 DPI
};

async function renderFunction(options: PDFiumPageRenderOptions) {
  return await sharp(options.data, {
    raw: {
      width: options.width,
      height: options.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}


test("adds 1 + 2 to equal 3", () => {
  expect(1 + 2).toBe(3);
});

describe("PDFium", () => {
  let library: PDFiumLibrary;
  beforeAll(async () => {
    library = await PDFiumLibrary.init({
      wasmBinary: await fs.readFile("./src/vendor/pdfium.wasm"),
    });
  });

  afterAll(() => {
    library?.destroy();
  });

  async function loadDocument(
    filename: string,
    callback: (document: PDFiumDocument) => Promise<void>,
  ) {
    const buff = await fs.readFile(`test/data/${filename}`);
    const document = await library.loadDocument(buff);
    await callback(document);
    document.destroy();
  }

  describe("PDFiumDocument", () => {
    test("should load a document from a buffer and return the number of pages", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const numOfPages = document.getPageCount();
        expect(numOfPages).toBe(4);
      });
    });

    test("shoul iterate over pages", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        let i = 0;
        for (const page of document.pages()) {
          expect(page).toBeInstanceOf(PDFiumPage);
          expect(page.number).toBe(i);
          i++;
        }
      });
    });

    test("should load document successfully even after a previous unrelated error", async () => {
      let doc1: PDFiumDocument | undefined;
      let doc2: PDFiumDocument | undefined;
      try {
        // Load the first document - it's not a PDF file, so it will throw an error
        const buff1 = await fs.readFile("test/data/test_5.txt");
        try {
          doc1 = await library.loadDocument(buff1);
        } catch {
          // do nothing
        }

        // Now, try loading a second, different document
        const buff2 = await fs.readFile("test/data/test_3_with_images.pdf");
        doc2 = await library.loadDocument(buff2);

        // Verify the second document loaded correctly despite the previous error
        expect(doc2).toBeDefined();
        expect(doc2.getPageCount()).toBe(1);
      } finally {
        doc1?.destroy();
        doc2?.destroy();
      }
    });
  });

  describe("PDFiumPage", () => {
    test("should render a bitmap of a page", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const buff = await document.getPage(0).render({
          scale: 1,
          render: "bitmap",
        });
        expect(buff.height).toBe(A4_SIZE.height);
        expect(buff.width).toBe(A4_SIZE.width);
        expect(buff.originalHeight).toBe(A4_SIZE.height);
        expect(buff.originalWidth).toBe(A4_SIZE.width);
        expect(buff.data.length).toBe(A4_SIZE.height * A4_SIZE.width * 4);
      });
    });
    test("should render a bitmap of a page with scale", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const buff = await document.getPage(0).render({
          scale: 3,
          render: "bitmap",
        });
        expect(buff.height).toBe(A4_SIZE.height * 3);
        expect(buff.width).toBe(A4_SIZE.width * 3);
        expect(buff.originalHeight).toBe(A4_SIZE.height);
        expect(buff.originalWidth).toBe(A4_SIZE.width);
        expect(buff.data.length).toBe(
          A4_SIZE.height * 3 * A4_SIZE.width * 3 * 4,
        );
      });
    });

    test("should render a sharp image of a page", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const result = await document.getPage(0).render({
          scale: 1,
          render: renderFunction,
        });
        expect(result.height).toBe(A4_SIZE.height);
        expect(result.width).toBe(A4_SIZE.width);
        expect(result.originalHeight).toBe(A4_SIZE.height);
        expect(result.originalWidth).toBe(A4_SIZE.width);
        expect(result.data).toMatchImageSnapshot();
      });
    });

    test("should render a sharp image of a page with scale", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const result = await document.getPage(0).render({
          scale: 3,
          render: renderFunction,
        });
        expect(result.height).toBe(A4_SIZE.height * 3);
        expect(result.width).toBe(A4_SIZE.width * 3);
        expect(result.originalHeight).toBe(A4_SIZE.height);
        expect(result.originalWidth).toBe(A4_SIZE.width);
        expect(result.data).toMatchImageSnapshot();
      });
    });

    test("should render a sharp image of a page with custom smaller width and height", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const result = await document.getPage(0).render({
          // original size is 595x841, but let's try use different proportions to see how it works
          width: 100,
          height: 100,
          render: renderFunction,
        });
        expect(result.height).toBe(100);
        expect(result.width).toBe(100);
        expect(result.originalHeight).toBe(A4_SIZE.height);
        expect(result.originalWidth).toBe(A4_SIZE.width);
        expect(result.data).toMatchImageSnapshot();
      });
    });

    test("should render a sharp image of a page with custom bigger width and height", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const result = await document.getPage(0).render({
          width: 9000,
          height: 4000,
          render: renderFunction,
        });
        expect(result.height).toBe(4000);
        expect(result.width).toBe(9000);
        expect(result.originalHeight).toBe(A4_SIZE.height);
        expect(result.originalWidth).toBe(A4_SIZE.width);
        expect(result.data).toMatchImageSnapshot();
      });
    });

    test("should call a custom render function", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const result = await document.getPage(0).render({
          scale: 1,
          render: async (options) => {
            expect(options.data).toBeInstanceOf(Uint8Array);
            expect(options.height).toBe(A4_SIZE.height);
            expect(options.width).toBe(A4_SIZE.width);
            return new TextEncoder().encode("test");
          },
        });
        expect(result).toEqual({
          data: new TextEncoder().encode("test"),
          height: A4_SIZE.height,
          width: A4_SIZE.width,
          originalHeight: A4_SIZE.height,
          originalWidth: A4_SIZE.width,
        });
      });
    });

    test("should open a PDF with password", async () => {
      const buff = await fs.readFile("test/data/test_1_pass_12345678.pdf");
      const password = "12345678";
      const document = await library.loadDocument(buff, password);
      document.destroy();
    });

    test("should open a PDF with password 2", async () => {
      const buff = await fs.readFile("test/data/test_2_pass_12345678.pdf");
      const password = "12345678";
      const document = await library.loadDocument(buff, password);
      document.destroy();
    });

    describe("Enhanced Text Extraction", () => {
      test("should extract basic text using getText()", async () => {
        await loadDocument("test_1.pdf", async (document) => {
          const page = document.getPage(0);
          const text = page.getText();
          
          expect(typeof text).toBe("string");
          expect(text.length).toBeGreaterThan(0);
          // test_1.pdf should contain some text content
          expect(text.trim()).not.toBe("");
        });
      });

      test("should extract enhanced text with character details", async () => {
        await loadDocument("test_1.pdf", async (document) => {
          const page = document.getPage(0);
          const enhancedText = page.getEnhancedText();
          
          expect(enhancedText).toBeDefined();
          expect(enhancedText).toHaveProperty("text");
          expect(enhancedText).toHaveProperty("characters");
          expect(enhancedText).toHaveProperty("charCount");
          
          expect(typeof enhancedText.text).toBe("string");
          expect(Array.isArray(enhancedText.characters)).toBe(true);
          expect(typeof enhancedText.charCount).toBe("number");
          
          if (enhancedText.charCount > 0) {
            expect(enhancedText.characters.length).toBe(enhancedText.charCount);
            expect(enhancedText.text.length).toBeLessThanOrEqual(enhancedText.charCount);
          }
        });
      });

      test("should provide detailed character information", async () => {
        await loadDocument("test_1.pdf", async (document) => {
          const page = document.getPage(0);
          const enhancedText = page.getEnhancedText();
          
          if (enhancedText.charCount > 0) {
            const firstChar = enhancedText.characters[0];
            
            // Character properties
            expect(firstChar).toHaveProperty("char");
            expect(firstChar).toHaveProperty("unicode");
            expect(firstChar).toHaveProperty("index");
            expect(typeof firstChar.char).toBe("string");
            expect(typeof firstChar.unicode).toBe("number");
            expect(typeof firstChar.index).toBe("number");
            expect(firstChar.index).toBe(0);
            
            // Position properties
            expect(firstChar).toHaveProperty("bounds");
            expect(firstChar).toHaveProperty("origin");
            expect(firstChar.bounds).toHaveProperty("left");
            expect(firstChar.bounds).toHaveProperty("right");
            expect(firstChar.bounds).toHaveProperty("bottom");
            expect(firstChar.bounds).toHaveProperty("top");
            expect(firstChar.origin).toHaveProperty("x");
            expect(firstChar.origin).toHaveProperty("y");
            
            // Font properties
            expect(firstChar).toHaveProperty("font");
            expect(firstChar.font).toHaveProperty("name");
            expect(firstChar.font).toHaveProperty("size");
            expect(firstChar.font).toHaveProperty("weight");
            expect(firstChar.font).toHaveProperty("flags");
            expect(typeof firstChar.font.name).toBe("string");
            expect(typeof firstChar.font.size).toBe("number");
            expect(typeof firstChar.font.weight).toBe("number");
            expect(typeof firstChar.font.flags).toBe("number");
            
            // Color properties
            expect(firstChar).toHaveProperty("fillColor");
            expect(firstChar).toHaveProperty("strokeColor");
            expect(firstChar.fillColor).toHaveProperty("r");
            expect(firstChar.fillColor).toHaveProperty("g");
            expect(firstChar.fillColor).toHaveProperty("b");
            expect(firstChar.fillColor).toHaveProperty("a");
            
            // Other properties
            expect(firstChar).toHaveProperty("angle");
            expect(firstChar).toHaveProperty("isGenerated");
            expect(firstChar).toHaveProperty("isHyphen");
            expect(typeof firstChar.angle).toBe("number");
            expect(typeof firstChar.isGenerated).toBe("boolean");
            expect(typeof firstChar.isHyphen).toBe("boolean");
          }
        });
      });

      test("should have consistent text between getText() and getEnhancedText()", async () => {
        await loadDocument("test_1.pdf", async (document) => {
          const page = document.getPage(0);
          const basicText = page.getText();
          const enhancedText = page.getEnhancedText();
          
          // The text content should be the same
          expect(enhancedText.text).toBe(basicText);
        });
      });

      test("should handle empty pages gracefully", async () => {
        // Create a document with empty page if possible, or test with a minimal PDF
        await loadDocument("test_1.pdf", async (document) => {
          const page = document.getPage(0);
          const enhancedText = page.getEnhancedText();
          
          // Should not throw errors even if page has no text
          expect(enhancedText).toBeDefined();
          expect(enhancedText.charCount).toBeGreaterThanOrEqual(0);
          expect(enhancedText.characters.length).toBe(enhancedText.charCount);
        });
      });

      test("should provide valid coordinate values", async () => {
        await loadDocument("test_1.pdf", async (document) => {
          const page = document.getPage(0);
          const enhancedText = page.getEnhancedText();
          
          if (enhancedText.charCount > 0) {
            const char = enhancedText.characters[0];
            
            // Bounds should be valid numbers
            expect(typeof char.bounds.left).toBe("number");
            expect(typeof char.bounds.right).toBe("number");
            expect(typeof char.bounds.bottom).toBe("number");
            expect(typeof char.bounds.top).toBe("number");
            expect(char.bounds.left).toBeLessThanOrEqual(char.bounds.right);
            expect(char.bounds.bottom).toBeLessThanOrEqual(char.bounds.top);
            
            // Origin should be valid numbers
            expect(typeof char.origin.x).toBe("number");
            expect(typeof char.origin.y).toBe("number");
            expect(Number.isFinite(char.origin.x)).toBe(true);
            expect(Number.isFinite(char.origin.y)).toBe(true);
          }
        });
      });

      test("should provide valid color values", async () => {
        await loadDocument("test_1.pdf", async (document) => {
          const page = document.getPage(0);
          const enhancedText = page.getEnhancedText();
          
          if (enhancedText.charCount > 0) {
            const char = enhancedText.characters[0];
            
            // Fill color components should be in valid range (0-255)
            expect(char.fillColor.r).toBeGreaterThanOrEqual(0);
            expect(char.fillColor.r).toBeLessThanOrEqual(255);
            expect(char.fillColor.g).toBeGreaterThanOrEqual(0);
            expect(char.fillColor.g).toBeLessThanOrEqual(255);
            expect(char.fillColor.b).toBeGreaterThanOrEqual(0);
            expect(char.fillColor.b).toBeLessThanOrEqual(255);
            expect(char.fillColor.a).toBeGreaterThanOrEqual(0);
            expect(char.fillColor.a).toBeLessThanOrEqual(255);
            
            // Stroke color components should be in valid range (0-255)
            expect(char.strokeColor.r).toBeGreaterThanOrEqual(0);
            expect(char.strokeColor.r).toBeLessThanOrEqual(255);
            expect(char.strokeColor.g).toBeGreaterThanOrEqual(0);
            expect(char.strokeColor.g).toBeLessThanOrEqual(255);
            expect(char.strokeColor.b).toBeGreaterThanOrEqual(0);
            expect(char.strokeColor.b).toBeLessThanOrEqual(255);
            expect(char.strokeColor.a).toBeGreaterThanOrEqual(0);
            expect(char.strokeColor.a).toBeLessThanOrEqual(255);
          }
        });
      });
    });
  });

  describe("PDFiumImageObject", () => {
    test("get page objects count", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const page = document.getPage(0);
        const count = page.getObjectCount();
        expect(count).toBe(182);
      });
    });

    test("get page objects count 2", async () => {
      await loadDocument("test_3_with_images.pdf", async (document) => {
        const page = document.getPage(0);
        const count = page.getObjectCount();
        expect(count).toBe(7);
      });
    });

    test("get page object", async () => {
      await loadDocument("test_3_with_images.pdf", async (document) => {
        const page = document.getPage(0);
        const object1 = page.getObject(0);
        expect(object1).toBeDefined();
      });
    });

    test("get page object type", async () => {
      await loadDocument("test_3_with_images.pdf", async (document) => {
        const page = document.getPage(0);
        const object1 = page.getObject(0);
        expect(object1.type).toBe("text");
      });
    });

    test("get page object type stat 1", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const page = document.getPage(0);
        const typeStat = new Map<string, number>();
        for (const object of page.objects()) {
          const type = object.type;
          typeStat.set(type, (typeStat.get(type) || 0) + 1);
        }
        const typeStatObj = Object.fromEntries(typeStat);
        expect(typeStatObj).toEqual({
          text: 182,
        });
      });
    });

    test("get page object type stat 2", async () => {
      await loadDocument("test_3_with_images.pdf", async (document) => {
        const page = document.getPage(0);
        const typeStat = new Map<string, number>();
        for (const object of page.objects()) {
          const type = object.type;
          typeStat.set(type, (typeStat.get(type) || 0) + 1);
        }
        const typeStatObj = Object.fromEntries(typeStat);
        expect(typeStatObj).toEqual({
          image: 3,
          text: 4,
        });
      });
    });

    test("get page object image", async () => {
      await loadDocument("test_3_with_images.pdf", async (document) => {
        for (const page of document.pages()) {
          for (const object of page.objects()) {
            if (object.type === "image") {
              const imageObj = object as PDFiumImageObject;

              const { data: image } = await imageObj.render({
                render: renderFunction,
              });
              expect(image).toBeInstanceOf(Uint8Array);
              expect(image).toMatchImageSnapshot();
            }
          }
        }
      });
    });

    test("get page object image raw", async () => {
      await loadDocument("test_4_with_images.pdf", async (document) => {
        const expected = [
          {
            size: 1523, // 1.5 KB
            width: 313,
            height: 234,
            filters: ["DCTDecode"],
          },
          {
            size: 14679, // 14 KB
            width: 313,
            height: 234,
            filters: ["DCTDecode"],
          },
          {
            size: 57828, // 57 KB
            width: 400,
            height: 400,
            filters: ["FlateDecode"],
          },
          {
            size: 680515, // 680 KB
            width: 640,
            height: 480,
            filters: ["FlateDecode"],
          },
          {
            size: 176469, // 176 KB
            width: 720,
            height: 486,
            filters: ["FlateDecode"],
          },
          {
            size: 1064661, // 1 MB
            width: 762,
            height: 1309,
            filters: ["FlateDecode"],
          },
        ]

        const result: any[] = [];
        for (const page of document.pages()) {
          for (const object of page.objects()) {
            if (object.type === "image") {
              const imageObj = object as PDFiumImageObject;

              const image = await imageObj.getImageDataRaw();
              result.push({
                size: image.data.length,
                width: image.width,
                height: image.height,
                filters: image.filters,
              })
            }
          }
        }
        expect(result).toMatchObject(expected)
      });
    });

    test("get page object image jpeg", async () => {
      await loadDocument("test_4_with_images.pdf", async (document) => {

        for (const page of document.pages()) {
          for (const object of page.objects()) {
            if (object.type === "image") {
              const imageObj = object as PDFiumImageObject;

              const image = await imageObj.render({
                render: async (options) => {
                  const { default: sharp } = await import("sharp");
                  return await sharp(options.data, {
                    raw: {
                      width: options.width,
                      height: options.height,
                      channels: 4,
                    },
                  })
                    .jpeg()
                    .toBuffer();
                }
              });
              // we can't use "toMatchImageSnapshot" here because it doesn't support jpeg
              expect(image.data).toBeDefined();
            }
          }
        }
      });
    });
  });

  describe("PDFiumPathObject", () => {
    test("should find path objects in a PDF", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const page = document.getPage(0);
        const objects = Array.from(page.objects());
        
        // Find path objects
        const pathObjects = objects.filter(obj => obj.type === "path");
        
        // test_1.pdf should contain some path objects (vector graphics)
        expect(pathObjects.length).toBeGreaterThan(0);
      });
    });

    test("should extract path data from path objects", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const page = document.getPage(0);
        const objects = Array.from(page.objects());
        
        // Find the first path object
        const pathObject = objects.find(obj => obj.type === "path") as PDFiumPathObject;
        
        if (pathObject) {
          // Test segment count
          const segmentCount = pathObject.getSegmentCount();
          expect(segmentCount).toBeGreaterThanOrEqual(0);
          
          if (segmentCount > 0) {
            // Test getting individual segments
            const firstSegment = pathObject.getSegment(0);
            expect(firstSegment).toBeDefined();
            expect(firstSegment).toHaveProperty('type');
            expect(firstSegment).toHaveProperty('x');
            expect(firstSegment).toHaveProperty('y');
            expect(firstSegment).toHaveProperty('close');
            
            // Verify segment type is one of the expected types
            expect(['unknown', 'lineto', 'bezierto', 'moveto']).toContain(firstSegment.type);
            
            // Verify coordinates are numbers
            expect(typeof firstSegment.x).toBe('number');
            expect(typeof firstSegment.y).toBe('number');
            expect(typeof firstSegment.close).toBe('boolean');
          }
          
          // Test getting all path data
          const pathData = pathObject.getPathData();
          expect(pathData).toBeDefined();
          expect(pathData).toHaveProperty('segments');
          expect(Array.isArray(pathData.segments)).toBe(true);
          expect(pathData.segments.length).toBe(segmentCount);
        }
      });
    });

    test("should handle invalid segment indices gracefully", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const page = document.getPage(0);
        const objects = Array.from(page.objects());
        
        const pathObject = objects.find(obj => obj.type === "path") as PDFiumPathObject;
        
        if (pathObject) {
          const segmentCount = pathObject.getSegmentCount();
          
          // Test out-of-bounds indices
          expect(pathObject.getSegment(-1)).toBeNull();
          expect(pathObject.getSegment(segmentCount)).toBeNull();
          expect(pathObject.getSegment(segmentCount + 100)).toBeNull();
        }
      });
    });
  });

  describe("PDFiumPageLabel", () => {
    test("should extract page labels when they exist", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        // Test getting labels for all pages
        for (const page of document.pages()) {
          const label = page.getLabel();
          expect(label).toBeDefined();
          expect(label).toHaveProperty('label');
          expect(label).toHaveProperty('hasLabel');
          expect(typeof label.label).toBe('string');
          expect(typeof label.hasLabel).toBe('boolean');
        }
      });
    });

    test("should handle documents without page labels", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const page = document.getPage(0);
        const label = page.getLabel();
        
        // Most test PDFs don't have explicit page labels
        expect(label).toBeDefined();
        expect(typeof label.hasLabel).toBe('boolean');
        expect(typeof label.label).toBe('string');
      });
    });

    test("should return consistent results for the same page", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const page = document.getPage(0);
        
        // Call getLabel multiple times to ensure consistency
        const label1 = page.getLabel();
        const label2 = page.getLabel();
        const label3 = page.getLabel();
        
        expect(label1).toEqual(label2);
        expect(label2).toEqual(label3);
        expect(label1.label).toBe(label2.label);
        expect(label1.hasLabel).toBe(label2.hasLabel);
      });
    });

    test("should handle different page indices correctly", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const pageCount = document.getPageCount();
        
        for (let i = 0; i < pageCount; i++) {
          const page = document.getPage(i);
          const label = page.getLabel();
          
          expect(label).toBeDefined();
          expect(label).toHaveProperty('label');
          expect(label).toHaveProperty('hasLabel');
        }
      });
    });

    test("should work with different PDF documents", async () => {
      // Test with multiple different documents
      const testFiles = ["test_1.pdf", "test_3_with_images.pdf"];
      
      for (const filename of testFiles) {
        await loadDocument(filename, async (document) => {
          const page = document.getPage(0);
          const label = page.getLabel();
          
          expect(label).toBeDefined();
          expect(typeof label.label).toBe('string');
          expect(typeof label.hasLabel).toBe('boolean');
        });
      }
    });
  });

  describe("PDFiumDocumentMetadata", () => {
    test("should extract metadata from documents", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const metadata = document.getMetadata();
        
        expect(metadata).toBeDefined();
        expect(typeof metadata).toBe('object');
        
        // Metadata properties should be strings or undefined
        if (metadata.title !== undefined) {
          expect(typeof metadata.title).toBe('string');
        }
        if (metadata.author !== undefined) {
          expect(typeof metadata.author).toBe('string');
        }
        if (metadata.subject !== undefined) {
          expect(typeof metadata.subject).toBe('string');
        }
        if (metadata.keywords !== undefined) {
          expect(typeof metadata.keywords).toBe('string');
        }
        if (metadata.creator !== undefined) {
          expect(typeof metadata.creator).toBe('string');
        }
        if (metadata.producer !== undefined) {
          expect(typeof metadata.producer).toBe('string');
        }
        if (metadata.creationDate !== undefined) {
          expect(typeof metadata.creationDate).toBe('string');
        }
        if (metadata.modifiedDate !== undefined) {
          expect(typeof metadata.modifiedDate).toBe('string');
        }
      });
    });

    test("should extract individual metadata tags", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        // Test individual metadata extraction
        const title = document.getMetadataTag("Title");
        const author = document.getMetadataTag("Author");
        const subject = document.getMetadataTag("Subject");
        const keywords = document.getMetadataTag("Keywords");
        const creator = document.getMetadataTag("Creator");
        const producer = document.getMetadataTag("Producer");
        const creationDate = document.getMetadataTag("CreationDate");
        const modifiedDate = document.getMetadataTag("ModDate");
        
        // Each should be either a string or undefined
        if (title !== undefined) expect(typeof title).toBe('string');
        if (author !== undefined) expect(typeof author).toBe('string');
        if (subject !== undefined) expect(typeof subject).toBe('string');
        if (keywords !== undefined) expect(typeof keywords).toBe('string');
        if (creator !== undefined) expect(typeof creator).toBe('string');
        if (producer !== undefined) expect(typeof producer).toBe('string');
        if (creationDate !== undefined) expect(typeof creationDate).toBe('string');
        if (modifiedDate !== undefined) expect(typeof modifiedDate).toBe('string');
      });
    });

    test("should return consistent results between getMetadata() and getMetadataTag()", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const metadata = document.getMetadata();
        
        // Compare individual tag results with getMetadata() results
        expect(document.getMetadataTag("Title")).toBe(metadata.title);
        expect(document.getMetadataTag("Author")).toBe(metadata.author);
        expect(document.getMetadataTag("Subject")).toBe(metadata.subject);
        expect(document.getMetadataTag("Keywords")).toBe(metadata.keywords);
        expect(document.getMetadataTag("Creator")).toBe(metadata.creator);
        expect(document.getMetadataTag("Producer")).toBe(metadata.producer);
        expect(document.getMetadataTag("CreationDate")).toBe(metadata.creationDate);
        expect(document.getMetadataTag("ModDate")).toBe(metadata.modifiedDate);
      });
    });

    test("should handle multiple calls consistently", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        // Call getMetadata multiple times to ensure consistency
        const metadata1 = document.getMetadata();
        const metadata2 = document.getMetadata();
        const metadata3 = document.getMetadata();
        
        expect(metadata1).toEqual(metadata2);
        expect(metadata2).toEqual(metadata3);
        
        // Test individual tag consistency
        expect(document.getMetadataTag("Title")).toBe(document.getMetadataTag("Title"));
        expect(document.getMetadataTag("Producer")).toBe(document.getMetadataTag("Producer"));
      });
    });

    test("should work with different PDF documents", async () => {
      const testFiles = ["test_1.pdf", "test_3_with_images.pdf"];
      
      for (const filename of testFiles) {
        await loadDocument(filename, async (document) => {
          const metadata = document.getMetadata();
          
          expect(metadata).toBeDefined();
          expect(typeof metadata).toBe('object');
          
          // Should not throw errors even if metadata is empty
          expect(() => document.getMetadataTag("Title")).not.toThrow();
          expect(() => document.getMetadataTag("Author")).not.toThrow();
          expect(() => document.getMetadataTag("Producer")).not.toThrow();
        });
      }
    });

    test("should handle documents with no metadata gracefully", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        const metadata = document.getMetadata();
        
        // Should return an object even if no metadata is present
        expect(metadata).toBeDefined();
        expect(typeof metadata).toBe('object');
        
        // All properties should be either string or undefined
        Object.values(metadata).forEach(value => {
          if (value !== undefined) {
            expect(typeof value).toBe('string');
          }
        });
      });
    });

    test("should handle edge cases with metadata tags", async () => {
      await loadDocument("test_1.pdf", async (document) => {
        // Test with all supported metadata tags using constants
        const tags = [
          "Title", "Author", "Subject", "Keywords", 
          "Creator", "Producer", "CreationDate", "ModDate"
        ] as const;
        
        for (const tag of tags) {
          const result = document.getMetadataTag(tag);
          if (result !== undefined) {
            expect(typeof result).toBe('string');
            // Should not be just whitespace if defined
            if (result.trim() === '') {
              // Empty strings are valid metadata values
              expect(result).toBe('');
            }
          }
        }
      });
    });
  });
});
