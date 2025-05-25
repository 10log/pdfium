import { promises as fs } from "node:fs";
import { PDFiumLibrary } from "../dist/index.esm.js";

/**
 * Demo script showing how to use OCG (Optional Content Groups) functionality
 * This demonstrates layer visibility control in PDF documents
 */
async function ocgDemo() {
  console.log("=== PDFium OCG (Layer) Demo ===\n");

  // Initialize the PDFium library
  const library = await PDFiumLibrary.init({
    wasmBinary: await fs.readFile("./src/vendor/pdfium.wasm"),
  });

  try {
    // Load a PDF document
    const pdfBuffer = await fs.readFile("./test/data/test_1.pdf");
    const document = library.loadDocument(pdfBuffer);

    console.log("1. Basic OCG Information:");
    console.log(`   Document has OCGs: ${document.hasOCGs()}`);
    
    const ocgManager = document.getOCGManager();
    const ocgCount = ocgManager.getOCGCount();
    console.log(`   Number of OCGs: ${ocgCount}`);

    if (ocgCount > 0) {
      console.log("\n2. OCG Details:");
      const allOCGs = ocgManager.getAllOCGs();
      
      allOCGs.forEach((ocg, index) => {
        console.log(`   OCG ${index + 1}:`);
        console.log(`     Name: "${ocg.name}"`);
        console.log(`     State: ${ocg.state} (${getOCGStateName(ocg.state)})`);
        console.log(`     Usage: ${ocg.usage} (${getOCGUsageName(ocg.usage)})`);
        console.log(`     Intent: [${ocg.intent.join(', ')}]`);
        console.log(`     In Default Config: ${ocg.isInDefaultConfig}`);
      });

      console.log("\n3. OCG Context Management:");
      
      // Create different contexts for different usage scenarios
      const viewContext = ocgManager.createContext(FPDF_OCG_USAGE_VIEW);
      const printContext = ocgManager.createContext(FPDF_OCG_USAGE_PRINT);
      
      console.log(`   View context created: ${viewContext.getContextPtr() > 0}`);
      console.log(`   Print context created: ${printContext.getContextPtr() > 0}`);

      console.log("\n4. Layer Visibility Control:");
      
      // Show all layers
      console.log("   Showing all layers...");
      ocgManager.showAllLayers();
      
      // Hide all layers
      console.log("   Hiding all layers...");
      ocgManager.hideAllLayers();
      
      // Reset to default states
      console.log("   Resetting to default states...");
      ocgManager.resetToDefaultStates();

      console.log("\n5. OCG Search:");
      
      // Search for OCGs by name
      const searchResults = ocgManager.findOCGsByName("layer");
      console.log(`   OCGs with 'layer' in name: ${searchResults.length}`);
      
      // Search by intent
      const viewOCGs = ocgManager.findOCGsByIntent("View");
      console.log(`   OCGs with 'View' intent: ${viewOCGs.length}`);

      console.log("\n6. Multiple State Management:");
      
      // Set multiple OCG states at once
      const stateMap = new Map();
      allOCGs.forEach((ocg, index) => {
        const ocgHandle = ocgManager.getOCG(index);
        if (ocgHandle) {
          // Alternate between on/off states
          stateMap.set(ocgHandle, index % 2 === 0 ? FPDF_OCG_STATE_ON : FPDF_OCG_STATE_OFF);
        }
      });
      
      ocgManager.setMultipleOCGStates(stateMap);
      console.log(`   Set alternating states for ${stateMap.size} OCGs`);

      // Clean up contexts
      viewContext.destroy();
      printContext.destroy();
      
    } else {
      console.log("\n   This PDF doesn't contain any OCGs (layers).");
      console.log("   OCG functionality is still available for PDFs that do contain layers.");
    }

    console.log("\n7. Page-Level OCG Information:");
    const page = document.getPage(0);
    console.log(`   Page 1 has OCGs: ${page.hasOCGs()}`);
    console.log(`   Number of OCGs on page 1: ${page.getPageOCGCount()}`);
    
    if (page.hasOCGs()) {
      const pageOCGs = page.getPageOCGs();
      console.log(`   OCG handles on page: [${pageOCGs.join(', ')}]`);
    }

    console.log("\n8. OCG Order and Grouping:");
    const ocgOrder = ocgManager.getOCGOrder();
    const radioGroups = ocgManager.getRadioButtonGroups();
    
    console.log(`   OCG order entries: ${ocgOrder.length}`);
    console.log(`   Radio button groups: ${radioGroups.length}`);

    // Clean up
    page.destroy();
    document.destroy();
    
  } catch (error) {
    console.error("Error during OCG demo:", error);
  } finally {
    library.destroy();
  }

  console.log("\n=== OCG Demo Complete ===");
}

// Import the necessary constants and functions
import { 
  FPDF_OCG_STATE_ON, 
  FPDF_OCG_STATE_OFF,
  FPDF_OCG_USAGE_VIEW,
  FPDF_OCG_USAGE_PRINT,
  getOCGStateName,
  getOCGUsageName
} from "../src/index.esm.js";

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  ocgDemo().catch(console.error);
}

export { ocgDemo };
