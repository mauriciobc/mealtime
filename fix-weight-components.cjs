#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const rootDir = __dirname;

const files = {
  'components/weight/goal-form-sheet.tsx': (content) => {
    // Add ?? '' to undefined strings
    content = content.replace(/value: goalData\./g, 'value: (goalData?.');
    content = content.replace(/goalData\?\.target_weight\)/g, 'goalData?.target_weight ?? \'\')');
    content = content.replace(/goalData\?\.target_date\)/g, 'goalData?.target_date ?? \'\')');
    return content;
  },
  
  'components/weight/milestone-progress.tsx': (content) => {
    // Fix setActiveMilestone
    content = content.replace(/setActiveMilestone\(milestones\?\.find/g, 'setActiveMilestone((milestones?.find');
    content = content.replace(/\) \?\? null\)/g, ') ?? null) ?? null)');
    // Add non-null assertions
    content = content.replace(/parsedTargetWeight!\.value/g, 'parsedTargetWeight?.value ?? 0');
    content = content.replace(/parsedTargetWeight!\.unit/g, 'parsedTargetWeight?.unit ?? \'kg\'');
    content = content.replace(/parsedCurrentWeight!\.value/g, 'parsedCurrentWeight?.value ?? 0');
    content = content.replace(/parsedCurrentWeight!\.unit/g, 'parsedCurrentWeight?.unit ?? \'kg\'');
    return content;
  },
  
  'components/weight/onboarding-tour.tsx': (content) => {
    // Add optional chaining
    content = content.replace(/steps\[currentStep\]\?\.target/g, '(steps[currentStep]?.target ?? \'\')');
    content = content.replace(/steps\[currentStep\]\?\.title/g, '(steps[currentStep]?.title ?? \'\')');
    content = content.replace(/steps\[currentStep\]\?\.content/g, '(steps[currentStep]?.content ?? \'\')');
    content = content.replace(/steps\[currentStep\]\?\.spotlightPadding/g, '(steps[currentStep]?.spotlightPadding)');
    return content;
  },
  
  'components/weight/weight-trend-chart.tsx': (content) => {
    // Add non-null assertions for array access
    content = content.replace(/weightData\[0\]\./g, 'weightData[0]!.');
    content = content.replace(/weightData\[weightData\.length - 1\]\./g, 'weightData[weightData.length - 1]!.');
    // Fix string | undefined to string
    content = content.replace(/format\(([^,]+), ([^,]+), \{ locale: ptBR \}\)/g, 'format($1!, $2!, { locale: ptBR })');
    // Fix activeDot type
    content = content.replace(/activeDot=\{renderActiveDot\}/g, 'activeDot={renderActiveDot as any}');
    return content;
  },
  
  'components/weight/quick-log-panel.tsx': (content) => {
    // Add as any to resolver
    content = content.replace(/resolver: zodResolver\(weightLogSchema\),/g, 'resolver: zodResolver(weightLogSchema) as any,');
    return content;
  },
};

Object.entries(files).forEach(([file, fixFunction]) => {
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

