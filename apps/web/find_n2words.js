const fs = require('fs');
const file = 'd:/Projects/bayanserve/apps/web/src/services/pdfGenerator.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('n2wordsPath')) {
    console.log(`Line ${idx + 1}: ${line}`);
    // Print 5 lines before and after
    const start = Math.max(0, idx - 5);
    const end = Math.min(lines.length - 1, idx + 5);
    for (let i = start; i <= end; i++) {
      console.log(`  [${i + 1}] ${lines[i]}`);
    }
    console.log('---');
  }
});
