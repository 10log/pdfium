import { PDFiumLibrary } from "@hyzyla/pdfium";
import { promises as fs } from 'fs';

/**
 * Demo showing progressive rendering with progress tracking
 */
async function progressiveRenderingDemo() {
  console.log('🚀 Starting Progressive Rendering Demo');
  
  try {
    // Initialize the library
    const library = await PDFiumLibrary.init();
    console.log('✅ PDFium library initialized');

    // Load a PDF document
    const buffer = await fs.readFile('sample.pdf');
    const document = await library.loadDocument(buffer);
    console.log('✅ PDF document loaded');

    // Get the first page
    const page = document.getPage(0);
    const pageSize = page.getSize();
    console.log(`📄 Page size: ${pageSize.width} x ${pageSize.height} points`);

    // Demo 1: Basic progressive rendering
    console.log('\n📊 Demo 1: Basic Progressive Rendering');
    const startTime = Date.now();
    
    const result1 = await page.renderProgressive({
      scale: 2,
      render: 'bitmap',
    });
    
    const endTime = Date.now();
    console.log(`✅ Rendered ${result1.width}x${result1.height} image in ${result1.steps} steps`);
    console.log(`⏱️  Total time: ${endTime - startTime}ms`);
    console.log(`📊 Data size: ${result1.data.length} bytes`);

    // Demo 2: Progressive rendering with progress tracking
    console.log('\n📈 Demo 2: Progressive Rendering with Progress Tracking');
    let progressSteps = [];
    
    const result2 = await page.renderProgressive({
      scale: 3,
      render: 'bitmap',
      pauseInterval: 100, // 100ms pause between steps
      onProgress: async (progress) => {
        progressSteps.push(progress.step);
        
        if (progress.isComplete) {
          console.log(`✅ Rendering completed at step ${progress.step}`);
        } else if (progress.isFailed) {
          console.log(`❌ Rendering failed at step ${progress.step}`);
          return false;
        } else {
          console.log(`🔄 Progress: Step ${progress.step} (Status: ${progress.status})`);
        }
        
        return true; // Continue rendering
      },
    });
    
    console.log(`📊 Progress tracked through ${progressSteps.length} steps: [${progressSteps.join(', ')}]`);
    console.log(`📏 Final image: ${result2.width}x${result2.height}`);

    // Demo 3: Progressive rendering with cancellation
    console.log('\n🛑 Demo 3: Progressive Rendering with Cancellation');
    let cancelled = false;
    
    // Simulate user cancelling after 3 steps
    setTimeout(() => {
      cancelled = true;
      console.log('🛑 User requested cancellation');
    }, 300);
    
    const result3 = await page.renderProgressive({
      scale: 2,
      render: 'bitmap',
      pauseInterval: 150, // Longer pause to allow cancellation
      onProgress: async (progress) => {
        if (cancelled && progress.step > 2) {
          console.log(`🛑 Cancelling at step ${progress.step}`);
          return false; // Cancel rendering
        }
        
        console.log(`🔄 Step ${progress.step} (cancellation ${cancelled ? 'requested' : 'not requested'})`);
        return true;
      },
    });
    
    console.log(`📊 Result: wasInterrupted = ${result3.wasInterrupted}, steps = ${result3.steps}`);

    // Demo 4: Using progressive renderer directly
    console.log('\n🔧 Demo 4: Using Progressive Renderer Directly');
    const renderer = page.createProgressiveRenderer();
    
    // Render at different scales with the same renderer
    const lowRes = await renderer.render({ scale: 1 });
    const highRes = await renderer.render({ scale: 2 });
    
    console.log(`📊 Low res: ${lowRes.width}x${lowRes.height} (${lowRes.steps} steps)`);
    console.log(`📊 High res: ${highRes.width}x${highRes.height} (${highRes.steps} steps)`);

    // Demo 5: Memory usage comparison
    console.log('\n💾 Demo 5: Memory Usage Comparison');
    
    // Regular rendering
    const regularStart = process.memoryUsage().heapUsed;
    const regularResult = await page.render({
      scale: 2,
      render: 'bitmap',
    });
    const regularEnd = process.memoryUsage().heapUsed;
    const regularMemory = regularEnd - regularStart;
    
    // Progressive rendering
    const progressiveStart = process.memoryUsage().heapUsed;
    const progressiveResult = await page.renderProgressive({
      scale: 2,
      render: 'bitmap',
    });
    const progressiveEnd = process.memoryUsage().heapUsed;
    const progressiveMemory = progressiveEnd - progressiveStart;
    
    console.log(`📊 Regular rendering memory delta: ${regularMemory} bytes`);
    console.log(`📊 Progressive rendering memory delta: ${progressiveMemory} bytes`);
    console.log(`📊 Results match: ${regularResult.width === progressiveResult.width && regularResult.height === progressiveResult.height}`);

    // Save results if possible
    try {
      await fs.writeFile('progressive-demo-result.raw', result1.data);
      console.log('💾 Saved progressive rendering result to progressive-demo-result.raw');
    } catch (error) {
      console.log('⚠️  Could not save result file (this is normal)');
    }

    // Cleanup
    document.destroy();
    library.destroy();
    console.log('🧹 Cleanup completed');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
progressiveRenderingDemo()
  .then(() => {
    console.log('\n🎉 Progressive Rendering Demo completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Demo crashed:', error);
    process.exit(1);
  });
