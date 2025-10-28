#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const rootDir = __dirname;

const fixes = {
  'components/ui/chart.tsx': (content) => {
    // Add any types to implicit parameters
    content = content.replace(/\(item\) =>/g, '(item: any) =>');
    content = content.replace(/\(item, index\) =>/g, '(item: any, index: any) =>');
    // Add optional chaining to props
    content = content.replace(/if \(!props\.payload/g, 'if (!(props as any).payload');
    content = content.replace(/const \{ payload \} = props;/g, 'const { payload } = props as any;');
    content = content.replace(/const \{ label \} = props;/g, 'const { label } = props as any;');
    content = content.replace(/payload\.map/g, '(payload as any[])?.map');
    content = content.replace(/payload\.length/g, '(payload as any[])?.length || 0');
    return content;
  },
  
  'components/ui/input-otp.tsx': (content) => {
    content = content.replace(/slots\[index\]\.char/g, 'slots[index]?.char');
    content = content.replace(/slots\[index\]\.hasFakeCaret/g, 'slots[index]?.hasFakeCaret');
    content = content.replace(/slots\[index\]\.isActive/g, 'slots[index]?.isActive');
    return content;
  },
  
  'components/ui/onboarding-tour.tsx': (content) => {
    content = content.replace(/steps\[currentStep\]\.target/g, 'steps[currentStep]?.target');
    content = content.replace(/steps\[currentStep\]\.title/g, 'steps[currentStep]?.title');
    content = content.replace(/steps\[currentStep\]\.content/g, 'steps[currentStep]?.content');
    content = content.replace(/steps\[currentStep\]\.spotlightPadding/g, 'steps[currentStep]?.spotlightPadding');
    content = content.replace(/steps\[currentStep - 1\]/g, 'steps[currentStep - 1]!');
    return content;
  },
  
  'components/weight/onboarding-tour.tsx': (content) => {
    content = content.replace(/steps\[currentStep\]\.target/g, 'steps[currentStep]?.target');
    content = content.replace(/steps\[currentStep\]\.title/g, 'steps[currentStep]?.title');
    content = content.replace(/steps\[currentStep\]\.content/g, 'steps[currentStep]?.content');
    content = content.replace(/steps\[currentStep\]\.spotlightPadding/g, 'steps[currentStep]?.spotlightPadding');
    return content;
  },
  
  'components/ui/datetime-picker.tsx': (content) => {
    content = content.replace(/displayFormat\[0\]/g, 'displayFormat[0]!');
    content = content.replace(/displayFormat\[1\]/g, 'displayFormat[1]!');
    content = content.replace(/toDate\(value\)/g, 'toDate(value ?? new Date())');
    return content;
  },
  
  'components/ui/simple-time-picker.tsx': (content) => {
    // Add missing parameter to parse
    content = content.replace(/date = parse\(dateStr, formatStr\);/g, 'date = parse(dateStr, formatStr, new Date());');
    return content;
  },
  
  'components/weight/goal-form-sheet.tsx': (content) => {
    content = content.replace(/value: goalData\.target_weight/g, 'value: goalData?.target_weight ?? \'\'');
    content = content.replace(/value: goalData\.target_date/g, 'value: goalData?.target_date ?? \'\'');
    return content;
  },
  
  'components/weight/milestone-progress.tsx': (content) => {
    content = content.replace(/setActiveMilestone\(milestones\.find/g, 'setActiveMilestone(milestones?.find');
    content = content.replace(/parsedTargetWeight\.value/g, 'parsedTargetWeight?.value');
    content = content.replace(/parsedTargetWeight\.unit/g, 'parsedTargetWeight?.unit');
    content = content.replace(/parsedCurrentWeight\.value/g, 'parsedCurrentWeight?.value');
    content = content.replace(/parsedCurrentWeight\.unit/g, 'parsedCurrentWeight?.unit');
    return content;
  },
  
  'app/test-notifications/page.tsx': (content) => {
    content = content.replace(/errorMsg/g, '_errorMsg');
    return content;
  },
  
  'app/weight/page.tsx': (content) => {
    content = content.replace(/weightData\[0\]\.weight/g, 'weightData[0]!.weight');
    content = content.replace(/value: goal\.target_weight,/g, 'value: goal.target_weight ?? \'\',');
    content = content.replace(/value: goal\.target_date,/g, 'value: goal.target_date ?? null,');
    return content;
  },
  
  'components/cat/details.tsx': (content) => {
    content = content.replace(/birthdayData\[0\]/g, 'birthdayData[0]!');
    return content;
  },
  
  'components/ui/calendar.tsx': (content) => {
    // Remove IconRight too
    content = content.replace(/components=\{\{[^}]*IconRight:[^}]*\}\},/g, '');
    return content;
  },
  
  'components/ui/datetime-picker-new.tsx': (content) => {
    // Remove IconRight too
    content = content.replace(/components=\{\{[^}]*IconRight:[^}]*\}\},/g, '');
    return content;
  },
};

Object.entries(fixes).forEach(([file, fixFunction]) => {
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

