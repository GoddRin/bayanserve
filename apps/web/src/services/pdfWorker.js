const { generateDocument } = require('./pdfGenerator.compiled.js');

let inputData = '';

process.stdin.on('data', chunk => {
  inputData += chunk;
});

process.stdin.on('end', async () => {
  try {
    const { type, data, lgu, isDraft } = JSON.parse(inputData);
    const buf = await generateDocument(type, data, lgu, isDraft);
    // Write the buffer to stdout as raw binary
    process.stdout.write(buf);
  } catch (error) {
    console.error('PDF_GENERATION_ERROR:', error);
    process.exit(1);
  }
});
