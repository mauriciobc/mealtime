#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const fixes = [
  {
    file: 'components/add-event-dialog.tsx',
    from: 'import type { TimelineEventData, EventType } from "@/components/cat-timeline"',
    to: 'import type { TimelineEventData, EventType } from "@/components/cat/cat-timeline"'
  },
  {
    file: 'components/timeline-event.tsx',
    from: 'import type { TimelineEventData, EventType } from "@/components/cat-timeline"',
    to: 'import type { TimelineEventData, EventType } from "@/components/cat/cat-timeline"'
  },
  {
    file: 'components/ui/sidebar.tsx',
    from: 'import { useIsMobile } from "@/components/hooks/use-mobile"',
    to: 'import { useIsMobile } from "@/hooks/use-mobile"'
  },
  {
    file: 'components/ui/sidebar.tsx',
    from: 'import { cn } from "@/components/lib/utils"',
    to: 'import { cn } from "@/lib/utils"'
  },
  {
    file: 'scripts/cron-runner.ts',
    from: 'import cron from \'../lib/services/cron-service.ts\'',
    to: 'import cron from \'../lib/services/cron-service\''
  },
  {
    file: 'src/pages.tsx',
    from: 'import { CatTimeline } from "@/components/cat-timeline"',
    to: 'import { CatTimeline } from "@/components/cat/cat-timeline"'
  }
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

