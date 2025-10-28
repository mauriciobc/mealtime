#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const files = [
  'app/join/page.tsx',
  'app/loading-skeleton.tsx',
  'app/login/page.tsx',
  'app/notifications/page.tsx',
  'app/page.tsx',
  'app/weight/page.tsx',
  'app/signup/page.tsx'
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
  
  // Verificar se já tem o import
  if (content.includes('from "@/components/ui/global-loading"') || 
      content.includes('from "@/components/ui/loading"')) {
    console.log(`⏭️  Already has import: ${file}`);
    return;
  }
  
  // Verificar se usa GlobalLoading
  if (!content.includes('GlobalLoading')) {
    console.log(`⏭️  Doesn't use GlobalLoading: ${file}`);
    return;
  }
  
  // Encontrar a última linha de import
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
    // Parar ao encontrar código que não é import
    if (lines[i].trim() && !lines[i].trim().startsWith('import ') && 
        !lines[i].trim().startsWith('"use') && 
        !lines[i].trim().startsWith("'use") &&
        !lines[i].trim().startsWith('//') &&
        lastImportIndex > 0) {
      break;
    }
  }
  
  if (lastImportIndex >= 0) {
    // Adicionar o import após o último import
    lines.splice(lastImportIndex + 1, 0, 'import { GlobalLoading } from "@/components/ui/global-loading";');
    content = lines.join('\n');
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Added import: ${file}`);
  } else {
    console.log(`⏭️  No changes: ${file}`);
  }
});

console.log('\n✨ Done!');

