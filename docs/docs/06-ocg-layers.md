# OCG (Optional Content Groups) Documentation

OCG (Optional Content Groups) support in PDFium allows you to control the visibility of layers in PDF documents. This is commonly used for CAD drawings, maps, and other technical documents where different information layers can be shown or hidden.

## Overview

The OCG implementation provides:

- **OCGManager**: Main class for managing document-level OCG operations
- **OCGContext**: Context-specific OCG state management for different usage scenarios
- **Page-level OCG support**: Access to OCGs that are present on specific pages
- **Comprehensive search and filtering**: Find OCGs by name, intent, or other criteria

## Basic Usage

### Getting Started

```typescript
import { PDFiumLibrary } from '@pdfium/pdfium';

// Initialize library and load document
const library = await PDFiumLibrary.init({ /* ... */ });
const document = library.loadDocument(pdfBuffer);

// Check if document has OCGs
if (document.hasOCGs()) {
  const ocgManager = document.getOCGManager();
  console.log(`Document has ${ocgManager.getOCGCount()} layers`);
}
```

### Basic Layer Control

```typescript
const ocgManager = document.getOCGManager();

// Show all layers
ocgManager.showAllLayers();

// Hide all layers
ocgManager.hideAllLayers();

// Reset to default states
ocgManager.resetToDefaultStates();
```

## OCG Information

### Getting OCG Details

```typescript
const allOCGs = ocgManager.getAllOCGs();

allOCGs.forEach((ocg, index) => {
  console.log(`Layer ${index + 1}: "${ocg.name}"`);
  console.log(`  State: ${getOCGStateName(ocg.state)}`);
  console.log(`  Usage: ${getOCGUsageName(ocg.usage)}`);
  console.log(`  Intent: [${ocg.intent.join(', ')}]`);
  console.log(`  Default: ${ocg.isInDefaultConfig}`);
});
```

### OCG Properties

Each OCG provides the following information:

- **name**: Human-readable layer name
- **state**: Current visibility state (On/Off/Unchanged)
- **usage**: How the OCG is intended to be used (View/Print/Design/Export)
- **intent**: Array of intent strings indicating the OCG's purpose
- **isInDefaultConfig**: Whether the OCG is included in the default configuration

## Individual Layer Control

### Setting Single Layer States

```typescript
// Get a specific OCG handle
const ocg = ocgManager.getOCG(0); // First OCG

// Set individual states
ocgManager.setOCGState(ocg, FPDF_OCG_STATE_ON);   // Show layer
ocgManager.setOCGState(ocg, FPDF_OCG_STATE_OFF);  // Hide layer

// Check current state
const currentState = ocgManager.getOCGState(ocg);
```

### Bulk State Management

```typescript
// Set multiple states at once
const stateMap = new Map([
  [ocg1, FPDF_OCG_STATE_ON],
  [ocg2, FPDF_OCG_STATE_OFF],
  [ocg3, FPDF_OCG_STATE_ON]
]);

ocgManager.setMultipleOCGStates(stateMap);
```

## OCG Contexts

OCG contexts allow you to maintain different layer visibility states for different usage scenarios.

### Creating Contexts

```typescript
import { 
  FPDF_OCG_USAGE_VIEW,
  FPDF_OCG_USAGE_PRINT,
  FPDF_OCG_USAGE_DESIGN 
} from '@pdfium/pdfium';

// Create contexts for different scenarios
const viewContext = ocgManager.createContext(FPDF_OCG_USAGE_VIEW);
const printContext = ocgManager.createContext(FPDF_OCG_USAGE_PRINT);
const designContext = ocgManager.createContext(FPDF_OCG_USAGE_DESIGN);
```

### Using Contexts

```typescript
// Set different states in different contexts
viewContext.setOCGState(ocg, FPDF_OCG_STATE_ON);   // Visible in view
printContext.setOCGState(ocg, FPDF_OCG_STATE_OFF); // Hidden in print

// Check object visibility in specific contexts
const isVisibleInView = viewContext.isPageObjectVisible(pageObject);

// Always destroy contexts when done
viewContext.destroy();
printContext.destroy();
designContext.destroy();
```

## Search and Filtering

### Finding OCGs by Name

```typescript
// Find layers containing specific text
const searchResults = ocgManager.findOCGsByName("electrical");
console.log(`Found ${searchResults.length} electrical layers`);

// Case-insensitive partial matching
const wireframeLayers = ocgManager.findOCGsByName("wireframe");
```

### Finding OCGs by Intent

```typescript
// Find layers intended for specific purposes
const viewLayers = ocgManager.findOCGsByIntent("View");
const designLayers = ocgManager.findOCGsByIntent("Design");
```

## Page-Level OCG Support

### Checking Page OCGs

```typescript
const page = document.getPage(0);

if (page.hasOCGs()) {
  console.log(`Page has ${page.getPageOCGCount()} OCG references`);
  
  // Get all OCG handles referenced on this page
  const pageOCGs = page.getPageOCGs();
  console.log(`OCG handles: [${pageOCGs.join(', ')}]`);
}

page.destroy();
```

## Advanced Features

### OCG Hierarchy and Ordering

```typescript
// Get the hierarchical structure of OCGs (for UI display)
const ocgOrder = ocgManager.getOCGOrder();

// Each order entry can be either a group or individual OCG
ocgOrder.forEach(entry => {
  if (entry.type === 'group') {
    console.log(`Group: ${entry.name}`);
    entry.children?.forEach(child => {
      console.log(`  - ${child.name || 'OCG'}`);
    });
  }
});
```

### Radio Button Groups

Some OCGs are mutually exclusive (radio button behavior):

```typescript
// Get groups where only one OCG can be active at a time
const radioGroups = ocgManager.getRadioButtonGroups();

radioGroups.forEach((group, index) => {
  console.log(`Radio group ${index + 1}:`);
  group.ocgs.forEach(ocg => {
    const info = ocgManager.getOCGInfo(ocg);
    console.log(`  - ${info?.name}`);
  });
});
```

## Constants Reference

### OCG States

```typescript
FPDF_OCG_STATE_ON        // Layer is visible
FPDF_OCG_STATE_OFF       // Layer is hidden  
FPDF_OCG_STATE_UNCHANGED // Layer state unchanged
```

### Usage Types

```typescript
FPDF_OCG_USAGE_VIEW      // For screen viewing
FPDF_OCG_USAGE_DESIGN    // For design/editing
FPDF_OCG_USAGE_PRINT     // For printing
FPDF_OCG_USAGE_EXPORT    // For export operations
```

### Intent Types

```typescript
FPDF_OCG_INTENT_VIEW     // "View" intent
FPDF_OCG_INTENT_DESIGN   // "Design" intent
FPDF_OCG_INTENT_ALL      // "All" intent
```

## Utility Functions

```typescript
import { getOCGStateName, getOCGUsageName } from '@pdfium/pdfium';

// Convert numeric values to readable names
const stateName = getOCGStateName(FPDF_OCG_STATE_ON);    // "On"
const usageName = getOCGUsageName(FPDF_OCG_USAGE_VIEW);  // "View"
```

## Error Handling

The OCG implementation is designed to be robust:

```typescript
// OCG APIs may not be available in all PDFium builds
try {
  const ocgCount = ocgManager.getOCGCount();
  if (ocgCount === 0) {
    console.log("No OCGs found in document");
  }
} catch (error) {
  console.warn("OCG functionality not available:", error);
}
```

## Performance Considerations

- **Context Management**: Always destroy OCG contexts when finished to free memory
- **Bulk Operations**: Use `setMultipleOCGStates()` for changing many layers at once
- **Caching**: OCG information is retrieved fresh each time - cache results if needed

## Common Use Cases

### CAD Drawing Layer Control

```typescript
// Show only electrical layers
const electricalLayers = ocgManager.findOCGsByName("electrical");
ocgManager.hideAllLayers();
electricalLayers.forEach(layer => {
  const ocg = ocgManager.getOCG(layer.index);
  ocgManager.setOCGState(ocg, FPDF_OCG_STATE_ON);
});
```

### Print vs. View Configuration

```typescript
// Different visibility for print vs. screen
const printContext = ocgManager.createContext(FPDF_OCG_USAGE_PRINT);
const viewContext = ocgManager.createContext(FPDF_OCG_USAGE_VIEW);

// Hide watermarks when printing
const watermarkLayers = ocgManager.findOCGsByName("watermark");
watermarkLayers.forEach(layer => {
  const ocg = ocgManager.getOCG(layer.index);
  viewContext.setOCGState(ocg, FPDF_OCG_STATE_ON);
  printContext.setOCGState(ocg, FPDF_OCG_STATE_OFF);
});
```

### Interactive Layer Panel

```typescript
// Build a UI layer control panel
function buildLayerPanel() {
  const layers = ocgManager.getAllOCGs();
  
  return layers.map(layer => ({
    id: layer.index,
    name: layer.name,
    visible: layer.state === FPDF_OCG_STATE_ON,
    intent: layer.intent,
    usage: getOCGUsageName(layer.usage)
  }));
}

// Toggle layer visibility
function toggleLayer(layerIndex: number) {
  const ocg = ocgManager.getOCG(layerIndex);
  const currentState = ocgManager.getOCGState(ocg);
  const newState = currentState === FPDF_OCG_STATE_ON 
    ? FPDF_OCG_STATE_OFF 
    : FPDF_OCG_STATE_ON;
  
  ocgManager.setOCGState(ocg, newState);
}
```

This comprehensive OCG implementation provides full control over PDF layer visibility, making it suitable for technical drawings, maps, architectural plans, and any other layered PDF content.
