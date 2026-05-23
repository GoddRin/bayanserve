const { generateDocument } = require('./src/services/pdfGenerator.compiled.js');

const docData = {
  "applicantName": "Salva Harrold",
  "age": 21,
  "civilStatus": "SINGLE",
  "address": "Consuelo Heights, Leonarda",
  "purpose": "Local Employment",
  "dateIssued": "2026-05-23T02:43:56.615Z",
  "feePaid": 0,
  "controlNumber": "MOP-CLR-2026-PNB-2026-926939",
  "qrToken": "415f5e4a-794c-40f9-a62f-cc83e8b8a8c8",
  "signatoryName": "LGU Administrator",
  "signatoryPosition": "Punong Barangay"
};

const lguData = {
  "id": "cmpe817ar0000j7m0l1zx4sun",
  "name": "Municipality of Peñablanca",
  "municipality": "Peñablanca",
  "province": "Cagayan",
  "logoUrl": "https://vojfhcytuenqrezanqbh.supabase.co/storage/v1/object/public/lgu-assets/cmpe8l7ar0000j7m0l1zx4sun/logo.png"
};

async function run() {
  try {
    const buf = await generateDocument('CLEARANCE', docData, lguData, false);
    console.log('SUCCESS! Buffer length:', buf.length);
  } catch (err) {
    console.error('CRASHED:', err.stack || err.message);
  }
}

run();
