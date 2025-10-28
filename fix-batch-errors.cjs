#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const rootDir = __dirname;

const fixes = {
  'components/feeding/feeding-drawer.tsx': [
    { from: /avatarUrl/g, to: 'avatar' },
  ],
  'app/households/[id]/page.tsx': [
    { from: /\(m\) =>/g, to: '(m: any) =>' },
  ],
  'components/cats/CatsList.tsx': [
    { from: /\(cat\) =>/g, to: '(cat: any) =>' },
  ],
  'components/feeding/feeding-schedule.tsx': [
    { from: /useSchedules/g, to: 'useScheduleContext' },
    { from: /, ID } from "@\/lib\/types"/g, to: ' } from "@/lib/types"' },
  ],
  'components/feeding/upcoming-feedings.tsx': [
    { from: /useSchedules/g, to: 'useScheduleContext' },
    { from: 'import FeedingProgress from "@/components/ui/feeding-progress"', to: '// import FeedingProgress from "@/components/ui/feeding-progress" // TODO: Component not found' },
  ],
  'components/layout/client-layout.tsx': [
    { from: /"fullscreen"/g, to: '"overlay"' },
  ],
  'components/ui/calendar.tsx': [
    { from: /IconLeft:/g, to: '// IconLeft:' },
  ],
  'components/ui/datetime-picker-new.tsx': [
    { from: /IconLeft:/g, to: '// IconLeft:' },
  ],
  'app/test-notifications/page.tsx': [
    { from: /errorMsg/g, to: '_errorMsg' },
  ],
};

Object.entries(fixes).forEach(([file, replacements]) => {
  const filePath = path.join(rootDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  replacements.forEach(({ from, to }) => {
    content = content.replace(from, to);
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`⏭️  No changes: ${file}`);
  }
});

console.log('\n✨ Done!');

