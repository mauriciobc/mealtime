#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const rootDir = __dirname;

// Simple regex-based fixes for common errors
const fixes = [
  // Add missing await to params
  { file: 'app/settings/[id]/page.tsx', from: /const \{ id \} = params;/g, to: 'const { id } = await params;' },
  
  // Fix test-notifications _errorMsg
  { file: 'app/test-notifications/page.tsx', from: /_errorMsg/g, to: 'errorMsg' },
  
  // Fix CatsList.tsx - use cats instead of data
  { file: 'components/cats/CatsList.tsx', from: /const \{ data: cats/g, to: 'const { cats' },
  
  // Fix notification-list - add timezone parameter
  { file: 'components/notifications/notification-list.tsx', from: /getUserTimezone\(\)/g, to: 'getUserTimezone(undefined)' },
];

fixes.forEach(({ file, from, to }) => {
  const filePath = path.join(rootDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  content = content.replace(from, to);
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`⏭️  No changes: ${file}`);
  }
});

console.log('\n✨ Done!');

