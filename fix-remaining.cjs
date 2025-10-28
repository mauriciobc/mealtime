#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const rootDir = __dirname;

// Fixes organized by file
const filesFixes = {
  'components/feeding/feeding-schedule.tsx': (content) => {
    // Remove ID import and define locally
    content = content.replace(/import \{ CatType, FeedingLog, Schedule, ID \} from "@\/lib\/types";/, 
                              'import { CatType, FeedingLog, Schedule } from "@/lib/types";\ntype ID = string;');
    return content;
  },
  
  'components/image-upload.tsx': (content) => {
    // Fix throw error type
    content = content.replace(/throw error;/g, 'throw error as Error;');
    return content;
  },
  
  'components/notifications/notification-list.tsx': (content) => {
    // Add undefined parameter
    content = content.replace(/getUserTimezone\(\)/g, 'getUserTimezone(undefined)');
    return content;
  },
  
  'components/ui/calendar.tsx': (content) => {
    // Remove IconLeft from components object
    content = content.replace(/IconLeft: \(\{ className, \.\.\.props \}: any\) => \(\s*<ChevronLeft[^>]*\/>\s*\),\s*/g, '');
    return content;
  },
  
  'components/ui/datetime-picker-new.tsx': (content) => {
    // Remove IconLeft from components object  
    content = content.replace(/IconLeft: \(\{ \.\.\.props \}: any\) => <ChevronLeft[^>]*\/>,\s*/g, '');
    return content;
  },
  
  'components/ui/input-otp.tsx': (content) => {
    // Add optional chaining
    content = content.replace(/slots\[index\]\.char/g, 'slots[index]?.char');
    content = content.replace(/slots\[index\]\.hasFakeCaret/g, 'slots[index]?.hasFakeCaret');
    content = content.replace(/slots\[index\]\.isActive/g, 'slots[index]?.isActive');
    return content;
  },
  
  'app/weight/page.tsx': (content) => {
    // Add non-null assertions
    content = content.replace(/weightData\[0\]\.weight/g, 'weightData[0]!.weight');
    content = content.replace(/value: goal\.target_weight/g, 'value: goal.target_weight ?? \'\'');
    content = content.replace(/value: goal\.target_date/g, 'value: goal.target_date ?? null');
    return content;
  },
};

Object.entries(filesFixes).forEach(([file, fixFunction]) => {
  const filePath = path.join(rootDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  content = fixFunction(content);
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`⏭️  No changes: ${file}`);
  }
});

console.log('\n✨ Done!');

