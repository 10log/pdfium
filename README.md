# @hyzyla/pdfium

📃 [Documentation](https://pdfium.js.org/docs/intro)

TypeScript/JavaScript wrapper for the PDFium library:

- ⬇️ [pdfium](https://pdfium.googlesource.com/pdfium/) - source code of the PDFium library, developed by Google and used in Chrome.
- ⬇️ [pdfium-lib](https://github.com/paulocoutinhox/pdfium-lib) - project to compile PDFium library to multiple platforms, including WebAssembly.
- 📍 [@hyzyla/pdfium](https://github.com/hyzyla/pdfium) - (you are here)
 TypeScript/JavaScript wrapper for the WebAssembly build of PDFium library.

# Features
-  📦 Zero dependencies - PDFium library is compiled to WebAssembly and bundled with the package.
- 🚀 Fast - PDFium can be faster than PDF.js, because it's originally written in C++ and compiled to WebAssembly, while PDF.js is entirely written in JavaScript.
- 🔒 Type-safe - TypeScript definitions are included.
- 🗼 Works in browser and Node.js
- 📄 Text extraction with detailed character information (position, font, color)
- 🖼️ Image extraction from PDF pages
- 🎨 Vector graphics extraction (paths, shapes)
- 📊 Document metadata extraction
- 🔍 Enhanced text search capabilities
- 🎯 **NEW: OCG (Optional Content Groups) support** - Control PDF layer visibility

## Installation

```sh
# yarn add @hyzyla/pdfium
# pnpm install @hyzyla/pdfium
npm install @hyzyla/pdfium
```

## Usage

```ts
import { PDFiumLibrary } from "@hyzyla/pdfium";
import { promises as fs } from 'fs';
import sharp from 'sharp';


/**
 * For this and the following examples, we will use "sharp" library to convert
 * the raw bitmap data to PNG images. You can use any other library or write
 * your own function to convert the raw bitmap data to PNG images.
 */
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


async function main() {
  const buff = await fs.readFile('test2.pdf');

  // Initialize the library, you can do this once for the whole application
  // and reuse the library instance.
  const library = await PDFiumLibrary.init();

  // Load the document from the buffer
  // You can also pass "password" as the second argument if the document is encrypted.
  const document = await library.loadDocument(buff);

  // Iterate over the pages, render them to PNG images and
  // save to the output folder
  for (const page of document.pages()) {
    console.log(`${page.number} - rendering...`);

    // Render PDF page to PNG image
    const image = await page.render({
      scale: 3, // 3x scale (72 DPI is the default)
      render: renderFunction,  // sharp function to convert raw bitmap data to PNG
    });

    // Save the PNG image to the output folder
    await fs.writeFile(`output/${page.number}.png`, Buffer.from(image.data));
  }

  // Do not forget to destroy the document and the library
  // when you are done.
  document.destroy();
  library.destroy();
}

main();
```

## OCG (Optional Content Groups) - Layer Control

PDFium now supports OCG (Optional Content Groups), allowing you to control the visibility of layers in PDF documents. This is particularly useful for CAD drawings, maps, and technical documents.

```ts
import { PDFiumLibrary, FPDF_OCG_STATE_ON, FPDF_OCG_STATE_OFF } from "@hyzyla/pdfium";

async function layerExample() {
  const library = await PDFiumLibrary.init();
  const document = library.loadDocument(pdfBuffer);

  // Check if document has layers
  if (document.hasOCGs()) {
    const ocgManager = document.getOCGManager();
    
    // Get all layers
    const layers = ocgManager.getAllOCGs();
    console.log(`Found ${layers.length} layers`);
    
    // Control layer visibility
    layers.forEach((layer, index) => {
      console.log(`Layer: ${layer.name}, State: ${layer.state}`);
      
      // Toggle layer visibility
      const ocg = ocgManager.getOCG(index);
      ocgManager.setOCGState(ocg, layer.state === FPDF_OCG_STATE_ON ? FPDF_OCG_STATE_OFF : FPDF_OCG_STATE_ON);
    });
    
    // Show/hide all layers
    ocgManager.showAllLayers();  // Show all
    ocgManager.hideAllLayers();  // Hide all
    ocgManager.resetToDefaultStates();  // Reset to PDF defaults
    
    // Search for specific layers
    const electricalLayers = ocgManager.findOCGsByName("electrical");
    const viewLayers = ocgManager.findOCGsByIntent("View");
    
    // Create context for different usage scenarios
    const printContext = ocgManager.createContext(FPDF_OCG_USAGE_PRINT);
    // ... configure different visibility for printing
    printContext.destroy();
  }

  document.destroy();
  library.destroy();
}
```

### Key OCG Features

- **Layer Discovery**: Find and enumerate all layers in a PDF
- **Visibility Control**: Show/hide individual layers or groups
- **Context Management**: Different layer states for viewing, printing, design
- **Search & Filter**: Find layers by name or intent
- **Bulk Operations**: Control multiple layers simultaneously
- **Page-level OCG**: Check which layers affect specific pages

See the [OCG Documentation](https://pdfium.js.org/docs/ocg-layers) for detailed usage examples.


## Release

1. Bump version in `package.json`: `npm version patch`
2. Create a new release in GitHub
3. Check status of the [GitHub Actions](https://github.com/hyzyla/pdfium/actions)
