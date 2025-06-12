// Simple test to verify the API generator works
const { ApiGenerator } = require('../dist/index');
const path = require('path');
const fs = require('fs');

async function test() {
  console.log('🧪 Testing API Generator...');
  
  try {
    const generator = new ApiGenerator({
      apiUrl: 'https://api.sprtverse.com',
      swaggerPath: '/docs?api-docs.json',
      outputDir: path.resolve(__dirname, '../test-output'),
      namespace: 'TestApi',
    });

    await generator.generate();
    
    // Check if files were created
    const outputDir = path.resolve(__dirname, '../test-output');
    const files = ['api.ts', 'interfaces.ts', 'index.ts'];
    
    for (const file of files) {
      const filePath = path.join(outputDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} created successfully`);
      } else {
        console.log(`❌ ${file} not found`);
      }
    }
    
    console.log('🎉 Test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  test();
}
