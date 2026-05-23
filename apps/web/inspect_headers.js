const https = require('https');

const urls = {
  bank: 'https://vojfhcytuenqrezanqbh.supabase.co/storage/v1/object/public/application-documents/cmpe8l7ar0000j7m0l1zx4sun/TUG-2026-794884/bank_statement.jpg',
  med: 'https://vojfhcytuenqrezanqbh.supabase.co/storage/v1/object/public/application-documents/cmpe8l7ar0000j7m0l1zx4sun/TUG-2026-794884/med_cert_1.jpg',
  moa: 'https://vojfhcytuenqrezanqbh.supabase.co/storage/v1/object/public/application-documents/cmpe8l7ar0000j7m0l1zx4sun/TUG-2026-794884/MOA_2.jpg'
};

function checkHeader(name, url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
        if (Buffer.concat(chunks).length >= 100) {
          res.destroy();
        }
      });
      res.on('close', () => {
        const buf = Buffer.concat(chunks);
        console.log(`${name} headers:`, buf.slice(0, 20).toString('hex'));
        resolve();
      });
      res.on('error', (e) => {
        console.error(e);
        resolve();
      });
    });
  });
}

async function run() {
  for (const [name, url] of Object.entries(urls)) {
    await checkHeader(name, url);
  }
}

run();
