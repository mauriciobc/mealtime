#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Arquivos a serem corrigidos
const files = [
  'lib/context/WeightContext.tsx',
  'lib/services/feeding-service.ts',
  'lib/services/notification-service.ts',
  'lib/services/apiService.ts',
  'lib/services/statistics-service.ts',
  'lib/services/api-feeding-service.ts',
  'lib/data.ts',
  'lib/prisma/safe-access.ts',
  'lib/selectors/statisticsSelectors.ts',
  'lib/hooks/use-notification-sync.ts',
  'lib/data/server.ts',
  'lib/utils/dateUtils.ts',
  'lib/utils/indexeddb-manager.ts',
  'app/history/page.tsx',
  'app/households/[id]/page.tsx',
  'app/test-notifications/page.tsx',
  'app/join/page.tsx',
  'app/signup/page.tsx',
  'app/login/page.tsx',
  'app/notifications/page.tsx',
  'lib/middleware/mobile-auth.ts',
  'lib/utils/auth-errors.ts',
  'utils/supabase/middleware.ts',
  'src/lib/image-cache.ts',
  'lib/image-cache.ts',
  'prisma/clean-db.ts',
  'app/profile/edit/page.tsx'
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
  
  // Padrão 1: catch (_error) seguido de uso de 'error' sem underscore
  // Substituir 'error' por '_error' dentro de blocos catch
  
  // Split by catch blocks and fix each one
  const catchBlocks = [];
  let inCatch = false;
  let braceCount = 0;
  let catchStart = -1;
  let catchContent = '';
  
  // Padrão mais simples: replace direto em contextos comuns
  // Substituir patterns comuns após } catch (_error)
  
  // Pattern 1: console.error com 'error' após catch (_error)
  content = content.replace(
    /(catch \(_error\)[^{]*\{[^}]*?)(?<!_)error(?!_)/g,
    '$1_error'
  );
  
  // Pattern 2: Procurar por blocos catch e substituir todas as referências
  const lines = content.split('\n');
  let inCatchBlock = false;
  let braceLevel = 0;
  let catchIndentLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detectar início de catch (_error)
    if (line.match(/catch\s*\(\s*_error\s*\)/)) {
      inCatchBlock = true;
      catchIndentLevel = line.search(/\S/);
      braceLevel = 0;
      continue;
    }
    
    if (inCatchBlock) {
      // Contar chaves
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      braceLevel += openBraces - closeBraces;
      
      // Substituir 'error' por '_error' nesta linha (evitando '_error')
      // Mas só se não for parte de uma palavra maior
      lines[i] = line.replace(/\berror\b(?!_)/g, '_error');
      
      // Se fechamos todas as chaves, saímos do bloco catch
      if (braceLevel < 0) {
        inCatchBlock = false;
      }
    }
  }
  
  content = lines.join('\n');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`⏭️  No changes: ${file}`);
  }
});

console.log('\n✨ Done!');

