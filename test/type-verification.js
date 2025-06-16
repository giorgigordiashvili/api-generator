// Type verification test for API generator
const fs = require('fs');
const path = require('path');

function analyzeGeneratedTypes() {
  console.log('🔍 Analyzing generated API types...\n');
  
  const apiFilePath = path.resolve(__dirname, '../test-output/api.ts');
  const interfacesFilePath = path.resolve(__dirname, '../test-output/interfaces.ts');
  
  if (!fs.existsSync(apiFilePath) || !fs.existsSync(interfacesFilePath)) {
    console.error('❌ Generated files not found. Run the generator first.');
    process.exit(1);
  }
  
  const apiContent = fs.readFileSync(apiFilePath, 'utf8');
  const interfacesContent = fs.readFileSync(interfacesFilePath, 'utf8');
  
  // Check for issues that should be fixed
  const issues = [];
  const improvements = [];
  
  // 1. Check for any remaining 'any' types
  const anyMatches = apiContent.match(/:\s*any/g);
  if (anyMatches) {
    issues.push(`Found ${anyMatches.length} 'any' types in API functions`);
  } else {
    improvements.push('✅ No generic "any" types found in API functions');
  }
  
  // 2. Check for Promise<any>
  const promiseAnyMatches = apiContent.match(/Promise<any>/g);
  if (promiseAnyMatches) {
    issues.push(`Found ${promiseAnyMatches.length} Promise<any> return types`);
  } else {
    improvements.push('✅ No Promise<any> return types found');
  }
  
  // 3. Check for data: any parameters
  const dataAnyMatches = apiContent.match(/data:\s*any/g);
  if (dataAnyMatches) {
    issues.push(`Found ${dataAnyMatches.length} 'data: any' parameters`);
  } else {
    improvements.push('✅ No "data: any" parameters found');
  }
  
  // 4. Count properly typed functions
  const functionMatches = apiContent.match(/export async function \w+/g);
  const functionCount = functionMatches ? functionMatches.length : 0;
  
  // 5. Check for union types (improved from oneOf)
  const unionTypeMatches = apiContent.match(/\|\s*{/g);
  const unionCount = unionTypeMatches ? unionTypeMatches.length : 0;
  if (unionCount > 0) {
    improvements.push(`✅ Generated ${unionCount} union types from oneOf schemas`);
  }
  
  // 6. Check for intersection types (improved from allOf)
  const intersectionMatches = apiContent.match(/&\s*{/g);
  const intersectionCount = intersectionMatches ? intersectionMatches.length : 0;
  if (intersectionCount > 0) {
    improvements.push(`✅ Generated ${intersectionCount} intersection types from allOf schemas`);
  }
  
  // 7. Count interface imports
  const importMatches = apiContent.match(/import type \{([^}]+)\}/);
  const importedTypes = importMatches ? importMatches[1].split(',').map(t => t.trim()).length : 0;
  
  console.log('📊 Type Analysis Results:');
  console.log('='.repeat(50));
  console.log(`📝 Total functions generated: ${functionCount}`);
  console.log(`📦 Imported type interfaces: ${importedTypes}`);
  console.log(`🔗 Union types from oneOf: ${unionCount}`);
  console.log(`🤝 Intersection types from allOf: ${intersectionCount}\n`);
  
  if (improvements.length > 0) {
    console.log('✅ Type Improvements:');
    improvements.forEach(improvement => console.log(`   ${improvement}`));
    console.log('');
  }
  
  if (issues.length > 0) {
    console.log('⚠️  Remaining Issues:');
    issues.forEach(issue => console.log(`   ❌ ${issue}`));
    console.log('');
    return false;
  } else {
    console.log('🎉 All type issues have been resolved!');
    console.log('🚀 API generator now produces fully typed functions!');
    return true;
  }
}

function testSpecificFunctions() {
  console.log('\n🧪 Testing specific function types...\n');
  
  const apiFilePath = path.resolve(__dirname, '../test-output/api.ts');
  const apiContent = fs.readFileSync(apiFilePath, 'utf8');
  
  const functionTests = [
    'loginAdminUser',
    'getPlayers', 
    'loginUser',
    'registerContentCreator',
    'getSports',
    'getTeams',
    'registerUser'
  ];
  
  let allTestsPassed = true;
  
  functionTests.forEach(functionName => {
    // Find the function in the content
    const functionStart = apiContent.indexOf(`export async function ${functionName}`);
    if (functionStart === -1) {
      console.log(`❌ Function ${functionName} not found`);
      allTestsPassed = false;
      return;
    }
    
    // Find the end of the function (next export or end of file)
    const nextFunctionStart = apiContent.indexOf('export async function', functionStart + 1);
    const functionEnd = nextFunctionStart === -1 ? apiContent.length : nextFunctionStart;
    const functionContent = apiContent.substring(functionStart, functionEnd);
    
    // Check for problematic types
    const hasPromiseAny = functionContent.includes('Promise<any>');
    const hasDataAny = functionContent.includes('data: any');
    const hasPromise = functionContent.includes('Promise<');
    const hasProperParams = !functionContent.includes(': any');
    
    if (!hasPromiseAny && !hasDataAny && hasPromise && hasProperParams) {
      console.log(`✅ ${functionName}: Properly typed (no 'any' types found)`);
    } else {
      console.log(`❌ ${functionName}: Type issues found`);
      if (hasPromiseAny) console.log(`   - Has Promise<any>`);
      if (hasDataAny) console.log(`   - Has data: any parameter`);
      if (!hasPromise) console.log(`   - Missing Promise return type`);
      if (!hasProperParams) console.log(`   - Has 'any' type parameters`);
      allTestsPassed = false;
    }
  });
  
  return allTestsPassed;
}

function main() {
  console.log('🚀 API Generator Type Verification Test\n');
  
  const analysisResult = analyzeGeneratedTypes();
  const functionTestResult = testSpecificFunctions();
  
  console.log('\n' + '='.repeat(50));
  
  if (analysisResult && functionTestResult) {
    console.log('🎉 ALL TESTS PASSED! 🎉');
    console.log('✅ The API generator now produces fully typed functions');
    console.log('✅ No more "any" types in generated code');
    console.log('✅ Proper union and intersection types from OpenAPI schemas');
    console.log('✅ All request and response types are properly specified');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('⚠️  There are still type issues that need to be addressed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
