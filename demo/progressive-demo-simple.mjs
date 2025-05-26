import { PDFiumLibrary } from "@hyzyla/pdfium";
import { promises as fs } from 'fs';

/**
 * Simple demo showing basic progressive rendering usage
 */
async function simpleProgressiveDemo() {
  console.log('Starting simple progressive rendering demo...');
  
  // Initialize library and load document
  const library = await PDFiumLibrary.init();
  const buffer = await fs.readFile('sample.pdf');
  const document = await library.loadDocument(buffer);
  const page = document.getPage(0);
  
  console.log('Document loaded, starting progressive render...');
  
  // Progressive rendering with progress tracking
  let step = 0;
  const result = await page.renderProgressive({
    scale: 2,
    onProgress: async (progress) => {
      step++;
      console.log(`Step ${step}: ${progress.isComplete ? 'Complete!' : 'In progress...'}`);
      return true; // Continue rendering
    },
  });
  
  console.log(`Rendering completed in ${result.steps} steps`);
  console.log(`Final image: ${result.width}x${result.height} pixels`);
  console.log(`Data size: ${result.data.length} bytes`);
  
  // Cleanup
  document.destroy();
  library.destroy();
  console.log('Demo completed!');
}

simpleProgressiveDemo().catch(console.error);
