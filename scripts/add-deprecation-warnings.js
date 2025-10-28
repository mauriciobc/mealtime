#!/usr/bin/env node

/**
 * Script para adicionar warnings de deprecation em todas as rotas v1
 */

const fs = require('fs');
const path = require('path');

const ROUTES_TO_UPDATE = [
  'app/api/feedings/route.ts',
  'app/api/feedings/[id]/route.ts',
  'app/api/feedings/stats/route.ts',
  'app/api/cats/[catId]/next-feeding/route.ts',
  'app/api/weight-logs/route.ts',
  'app/api/goals/route.ts',
  'app/api/schedules/route.ts',
  'app/api/schedules/[id]/route.ts',
  'app/api/households/[id]/cats/route.ts',
  'app/api/households/[id]/invite/route.ts',
  'app/api/households/[id]/invite-code/route.ts',
];

const IMPORT_STATEMENT = "import { addDeprecatedWarning } from '@/lib/middleware/deprecated-warning';";

function addWarningToFile(filePath) {
  console.log(`\n📝 Processing: ${filePath}`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if import already exists
    if (content.includes('addDeprecatedWarning')) {
      console.log(`  ⏭️  Skip: Already has deprecation warning`);
      return;
    }
    
    // Add import after the last import statement
    const lastImportIndex = content.lastIndexOf('\nimport ');
    if (lastImportIndex === -1) {
      console.log(`  ⚠️  Warning: No import statements found`);
      return;
    }
    
    const nextLineAfterLastImport = content.indexOf('\n', lastImportIndex + 1);
    content = content.slice(0, nextLineAfterLastImport + 1) + IMPORT_STATEMENT + '\n' + content.slice(nextLineAfterLastImport + 1);
    
    // Add warning to all NextResponse.json() returns
    // This is a simplified approach - manual review recommended
    console.log(`  ℹ️  Import added. Manual wrapping of responses recommended.`);
    console.log(`  ℹ️  Add this before each return:`);
    console.log(`     const response = NextResponse.json(data);`);
    console.log(`     return addDeprecatedWarning(response);`);
    
    // Write back
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ Import added to ${filePath}`);
    
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error.message);
  }
}

console.log('🚀 Adding deprecation warnings to v1 routes...\n');
console.log(`Total routes to update: ${ROUTES_TO_UPDATE.length}`);
console.log('='.repeat(60));

ROUTES_TO_UPDATE.forEach(addWarningToFile);

console.log('\n' + '='.repeat(60));
console.log('✅ Import statements added!');
console.log('\n⚠️  NEXT STEPS (MANUAL):');
console.log('For each file, wrap NextResponse.json() returns with addDeprecatedWarning():');
console.log('\n  BEFORE:');
console.log('    return NextResponse.json(data);');
console.log('\n  AFTER:');
console.log('    const response = NextResponse.json(data);');
console.log('    return addDeprecatedWarning(response);');
console.log('');

