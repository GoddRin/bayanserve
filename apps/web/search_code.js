const fs = require('fs');
const path = require('path');

const srcDir = 'd:/Projects/bayanserve';

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === '.next' || file === 'dist' || file === '.turbo') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, query);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.prisma'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        console.log(`Found in: ${fullPath}`);
      }
    }
  }
}

console.log('Searching for "Proof of Residency"...');
searchDir(srcDir, 'Proof of Residency');

console.log('\nSearching for "med cert"...');
searchDir(srcDir, 'med cert');

console.log('\nSearching for "med_cert"...');
searchDir(srcDir, 'med_cert');
