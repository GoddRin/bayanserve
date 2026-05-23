const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vojfhcytuenqrezanqbh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvamZoY3l0dWVucXJlemFucWJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI4MjkyMSwiZXhwIjoyMDk0ODU4OTIxfQ.sJMvOUqEZNP_-MxdaygQYlMj-1dGwG2kEU-9o2xFGKA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) throw bucketError;
    console.log('Buckets:', buckets.map(b => b.name));

    // List all files in the application-documents bucket
    const { data: files, error: filesError } = await supabase.storage.from('application-documents').list('', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' }
    });
    if (filesError) throw filesError;
    console.log('Files in root:', files);

    // Let's search inside the folders
    for (const f of files) {
      if (!f.id) { // It's a folder
        console.log(`\nFolder: ${f.name}`);
        const { data: subFiles1, error: subError1 } = await supabase.storage.from('application-documents').list(f.name);
        if (subError1) {
          console.error(subError1);
          continue;
        }
        for (const sf1 of subFiles1) {
          if (!sf1.id) {
            console.log(`  Subfolder: ${f.name}/${sf1.name}`);
            const { data: subFiles2, error: subError2 } = await supabase.storage.from('application-documents').list(`${f.name}/${sf1.name}`);
            if (subError2) {
              console.error(subError2);
              continue;
            }
            console.log(`    Files:`, subFiles2.map(x => ({ name: x.name, metadata: x.metadata })));
          } else {
            console.log(`  File:`, sf1.name);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
