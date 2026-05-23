const fs = require('fs');
const path = require('path');

const srcDir = 'd:/Projects/bayanserve/apps/web/src';

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Look for require(variable) or import(variable)
      const requireMatches = content.match(/require\s*\([^'"`]*?\)/g);
      const importMatches = content.match(/import\s*\([^'"`]*?\)/g);
      
      if (requireMatches) {
        console.log(`Potential dynamic require in ${fullPath}:`);
        requireMatches.forEach(m => console.log(`  - ${m}`));
      }
      if (importMatches) {
        console.log(`Potential dynamic import in ${fullPath}:`);
        importMatches.forEach(m => console.log(`  - ${m}`));
      }
    }
  }
}

console.log('Searching for dynamic require/import in src...');
searchDir(srcDir);
