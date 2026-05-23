const https = require('https');

const urls = [
  'https://vojfhcytuenqrezanqbh.supabase.co/storage/v1/object/public/application-documents/cmpe8l7ar0000j7m0l1zx4sun/TUG-2026-794884/bank_statement.jpg',
  'https://vojfhcytuenqrezanqbh.supabase.co/storage/v1/object/public/application-documents/cmpe8l7ar0000j7m0l1zx4sun/TUG-2026-794884/med_cert_1.jpg',
  'https://vojfhcytuenqrezanqbh.supabase.co/storage/v1/object/public/application-documents/cmpe8l7ar0000j7m0l1zx4sun/TUG-2026-794884/MOA_2.jpg'
];

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      console.log(`URL: ${url}`);
      console.log(`  Status Code: ${res.statusCode}`);
      console.log(`  Content-Type: ${res.headers['content-type']}`);
      console.log(`  Content-Length: ${res.headers['content-length']}`);
      resolve();
    }).on('error', (e) => {
      console.error(`Error fetching ${url}:`, e);
      resolve();
    });
  });
}

async function run() {
  for (const url of urls) {
    await checkUrl(url);
  }
}

run();
