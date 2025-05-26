# Progressive Rendering

Progressive rendering allows you to render large PDF pages incrementally, which is especially useful for:

- **Memory-efficient rendering**: Large pages can be rendered without allocating the full bitmap memory upfront
- **Responsive user interfaces**: You can provide progress feedback and allow users to cancel long-running renders
- **Better user experience**: Show rendering progress and allow interruption for very large documents

## Basic Usage

### Simple Progressive Rendering

The simplest way to use progressive rendering is through the `renderProgressive` method:

```typescript
import { PDFiumLibrary } from "@hyzyla/pdfium";

const library = await PDFiumLibrary.init();
const document = await library.loadDocument(pdfBuffer);
const page = document.getPage(0);

// Basic progressive rendering
const result = await page.renderProgressive({
  scale: 2,
  render: 'bitmap',
});

console.log(`Rendered in ${result.steps} steps`);
console.log(`Was interrupted: ${result.wasInterrupted}`);
```

### With Progress Tracking

You can track rendering progress and provide user feedback:

```typescript
let currentStep = 0;

const result = await page.renderProgressive({
  scale: 3,
  render: 'bitmap',
  onProgress: async (progress) => {
    currentStep = progress.step;
    
    if (progress.isComplete) {
      console.log('Rendering completed!');
    } else if (progress.isFailed) {
      console.log('Rendering failed!');
      return false; // Stop rendering
    } else {
      console.log(`Rendering step ${progress.step}...`);
      
      // Update UI with progress
      updateProgressBar(progress.step);
    }
    
    return true; // Continue rendering
  },
});
```

### With User Cancellation

Allow users to cancel long-running renders:

```typescript
let shouldCancel = false;

// Set up cancel button
document.getElementById('cancelButton').onclick = () => {
  shouldCancel = true;
};

const result = await page.renderProgressive({
  scale: 4,
  render: 'bitmap',
  onProgress: async (progress) => {
    // Check if user wants to cancel
    if (shouldCancel) {
      console.log('Rendering cancelled by user');
      return false; // Stop rendering
    }
    
    return true; // Continue rendering
  },
});

if (result.wasInterrupted) {
  console.log('Rendering was cancelled');
} else {
  console.log('Rendering completed successfully');
}
```

## Advanced Usage

### Using Progressive Renderer Directly

For more control, you can create a `PDFiumProgressiveRenderer` instance:

```typescript
const renderer = page.createProgressiveRenderer();

// Render with different options using the same renderer
const lowRes = await renderer.render({ scale: 1 });
const highRes = await renderer.render({ scale: 3 });

// The renderer can be reused for multiple renders
```

### Custom Render Functions

Progressive rendering works with custom render functions:

```typescript
import sharp from 'sharp';

const result = await page.renderProgressive({
  scale: 2,
  render: async (options) => {
    // Convert to PNG with sharp
    return await sharp(options.data, {
      raw: {
        width: options.width,
        height: options.height,
        channels: 4,
      },
    })
      .png()
      .toBuffer();
  },
  onProgress: async (progress) => {
    console.log(`Step ${progress.step}: ${progress.isComplete ? 'Done' : 'In progress'}`);
    return true;
  },
});
```

### Pausing Between Rendering Steps

You can add delays between rendering steps to keep the UI responsive:

```typescript
const result = await page.renderProgressive({
  scale: 3,
  pauseInterval: 50, // Pause 50ms between steps
  onProgress: async (progress) => {
    // Update UI during pauses
    await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI thread
    return true;
  },
});
```

## API Reference

### PDFiumPage Methods

#### `renderProgressive(options?: PDFiumProgressiveRenderOptions): Promise<PDFiumProgressiveRenderResult>`

Renders the page progressively with the given options.

**Parameters:**
- `options` (optional): Progressive rendering options

**Returns:** Promise that resolves to a `PDFiumProgressiveRenderResult`

#### `createProgressiveRenderer(): PDFiumProgressiveRenderer`

Creates a new progressive renderer instance for this page.

**Returns:** A `PDFiumProgressiveRenderer` instance

### Types

#### `PDFiumProgressiveRenderOptions`

```typescript
type PDFiumProgressiveRenderOptions = {
  width?: number;                    // Target width (alternative to scale)
  height?: number;                   // Target height (alternative to scale)  
  scale?: number;                    // Scale factor (default: 1)
  render?: PDFiumRenderFunction;     // Render function (default: "bitmap")
  flags?: number;                    // Rendering flags
  rotate?: number;                   // Rotation angle (default: 0)
  onProgress?: (progress: PDFiumProgressiveRenderProgress) => boolean | Promise<boolean>;
  pauseInterval?: number;            // Pause between steps in milliseconds
};
```

#### `PDFiumProgressiveRenderProgress`

```typescript
type PDFiumProgressiveRenderProgress = {
  status: number;        // FPDFProgressiveStatus value
  isComplete: boolean;   // True when rendering is complete
  isFailed: boolean;     // True when rendering has failed
  step: number;          // Current rendering step
  bitmap: number;        // Bitmap handle for advanced use
};
```

#### `PDFiumProgressiveRenderResult`

```typescript
type PDFiumProgressiveRenderResult = {
  width: number;          // Rendered image width
  height: number;         // Rendered image height
  originalWidth: number;  // Original page width in points
  originalHeight: number; // Original page height in points
  data: Uint8Array;      // Rendered image data
  steps: number;         // Total number of rendering steps
  wasInterrupted: boolean; // Whether rendering was interrupted
};
```

### Constants

#### `FPDFProgressiveStatus`

```typescript
const FPDFProgressiveStatus = {
  RENDER_TOBECONTINUED: 0,  // Rendering is in progress
  RENDER_DONE: 1,           // Rendering completed successfully
  RENDER_FAILED: 2,         // Rendering failed due to error
};
```

## Best Practices

### 1. Progress Callback Performance

Keep progress callbacks lightweight to avoid slowing down the rendering:

```typescript
// Good: Quick progress update
onProgress: async (progress) => {
  progressElement.textContent = `Step ${progress.step}`;
  return true;
}

// Avoid: Heavy operations in progress callback
onProgress: async (progress) => {
  await heavyOperation(); // This will slow down rendering
  return true;
}
```

### 2. Error Handling

Always handle potential errors in progress callbacks:

```typescript
onProgress: async (progress) => {
  try {
    updateUI(progress);
    return !userCancelled;
  } catch (error) {
    console.error('Progress callback error:', error);
    return true; // Continue rendering despite error
  }
}
```

### 3. Memory Management

Progressive rendering automatically manages memory, but be aware of scale factors for very large pages:

```typescript
// For very large pages, consider lower scales
const pageSize = page.getSize();
const scale = (pageSize.width > 2000 || pageSize.height > 2000) ? 1 : 2;

const result = await page.renderProgressive({ scale });
```

### 4. Responsive UI

Use `pauseInterval` to keep the UI responsive during long renders:

```typescript
const result = await page.renderProgressive({
  scale: 3,
  pauseInterval: 16, // ~60 FPS for smooth UI updates
  onProgress: async (progress) => {
    // UI updates happen during pauses
    return true;
  },
});
```

## Comparison with Regular Rendering

| Feature | Regular Rendering | Progressive Rendering |
|---------|------------------|----------------------|
| Memory Usage | Full bitmap allocated upfront | Incremental allocation |
| Progress Feedback | None | Real-time progress updates |
| Cancellation | Not supported | User can cancel anytime |
| Performance | Faster for small pages | Better for large pages |
| UI Responsiveness | Blocks until complete | Can yield to UI thread |

## When to Use Progressive Rendering

**Use progressive rendering when:**
- Rendering large pages (>2000x2000 pixels)
- You need progress feedback
- Users should be able to cancel rendering
- Memory usage is a concern
- UI responsiveness is important

**Use regular rendering when:**
- Rendering small to medium pages
- Speed is the primary concern
- You don't need progress feedback
- The rendering is guaranteed to be fast
