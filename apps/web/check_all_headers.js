const https = require('https');

const url = 'https://vojfhcytuenqrezanqbh.supabase.co/storage/v1/object/public/application-documents/cmpe8l7ar0000j7m0l1zx4sun/TUG-2026-794884/med_cert_1.jpg';

https.get(url, (res) => {
  console.log(`URL: ${url}`);
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:');
  console.log(JSON.stringify(res.headers, null, 2));
}).on('error', (e) => {
  console.error(e);
});
