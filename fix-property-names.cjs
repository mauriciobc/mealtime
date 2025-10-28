#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const fixes = [
  // photoUrl -> photo_url (em CatType)
  { file: 'components/cat/cat-list.tsx', from: /\.photoUrl\b/g, to: '.photo_url' },
  { file: 'components/events-list.tsx', from: /\.photoUrl\b/g, to: '.photo_url' },
  { file: 'components/schedule/schedule-item.tsx', from: /\.photoUrl\b/g, to: '.photo_url' },
  
  // feedingInterval -> feeding_interval
  { file: 'components/cat/cat-list.tsx', from: /\.feedingInterval\b/g, to: '.feeding_interval' },
  
  // household_id -> householdId (em alguns componentes que usam CatType)
  { file: 'components/feeding/feeding-drawer.tsx', from: /household_id:/g, to: 'householdId:' },
  
  // ownerId não existe em Household - usar owner?.id
  { file: 'app/households/[id]/members/invite/page.tsx', from: /\.ownerId\b/g, to: '.owner?.id' },
  
  // time -> times em Schedule
  { file: 'components/schedule/schedule-item.tsx', from: /schedule\.time\b/g, to: 'schedule.times' }
];

const rootDir = __dirname;

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

