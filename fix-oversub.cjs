#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const files = [
  'app/history/page.tsx',
  'app/households/[id]/page.tsx',
  'app/test-notifications/page.tsx',
  'lib/context/WeightContext.tsx',
  'lib/data/server.ts',
  'lib/data.ts',
  'lib/hooks/use-notification-sync.ts',
  'lib/selectors/statisticsSelectors.ts',
  'lib/services/api-feeding-service.ts',
  'lib/services/apiService.ts',
  'lib/services/feeding-service.ts',
  'lib/services/statistics-service.ts',
  'lib/utils/dateUtils.ts',
  'lib/utils/indexeddb-manager.ts',
];

const rootDir = __dirname;

files.forEach(file => {
  const filePath = path.join(rootDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Reverter console._error para console.error
  content = content.replace(/console\._error/g, 'console.error');
  
  // Reverter toast._error para toast.error
  content = content.replace(/toast\._error/g, 'toast.error');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`⏭️  No changes: ${file}`);
  }
});

console.log('\n✨ Done!');

