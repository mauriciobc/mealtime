#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

// Fix api-feeding-service.ts - replace data with _data in specific contexts
const apiServicePath = path.join(rootDir, 'lib/services/api-feeding-service.ts');
if (fs.existsSync(apiServicePath)) {
  let content = fs.readFileSync(apiServicePath, 'utf8');
  
  // Pattern: dentro de blocos que usam const _data, substituir data por _data
  const lines = content.split('\n');
  let inDataBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const _data =')) {
      inDataBlock = true;
    }
    if (inDataBlock && lines[i].includes('return') && !lines[i].includes('const')) {
      // Substituir data por _data nesta seção
      lines[i] = lines[i].replace(/\bdata\b(?!_)/g, '_data');
    }
    if (inDataBlock && (lines[i].includes('} catch') || lines[i].includes('}'))) {
      inDataBlock = false;
    }
  }
  
  content = lines.join('\n');
  fs.writeFileSync(apiServicePath, content, 'utf8');
  console.log('✅ Fixed api-feeding-service.ts');
}

// Fix src/lib/image-cache.ts
const imageCachePath = path.join(rootDir, 'src/lib/image-cache.ts');
if (fs.existsSync(imageCachePath)) {
  let content = fs.readFileSync(imageCachePath, 'utf8');
  content = content.replace(/return \{ data \}/g, 'return { data: _data }');
  content = content.replace(/if \(data\) \{/g, 'if (_data) {');
  fs.writeFileSync(imageCachePath, content, 'utf8');
  console.log('✅ Fixed src/lib/image-cache.ts');
}

// Fix test-notifications remaining _error issues
const testNotifPath = path.join(rootDir, 'app/test-notifications/page.tsx');
if (fs.existsSync(testNotifPath)) {
  let content = fs.readFileSync(testNotifPath, 'utf8');
  // Procurar linhas específicas com _error fora de contexto
  content = content.replace(/toast\.error\(_error instanceof Error \? _error\.message : String\(_error\)\)/g, 
                            'toast.error(errorMsg)');
  fs.writeFileSync(testNotifPath, content, 'utf8');
  console.log('✅ Fixed test-notifications.tsx');
}

console.log('\n✨ Done!');

