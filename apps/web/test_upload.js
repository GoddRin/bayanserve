const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vojfhcytuenqrezanqbh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvamZoY3l0dWVucXJlemFucWJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI4MjkyMSwiZXhwIjoyMDk0ODU4OTIxfQ.sJMvOUqEZNP_-MxdaygQYlMj-1dGwG2kEU-9o2xFGKA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const rawFilename = 'med cert 1.jpg';
    
    // Clean filename as done in route.ts
    const cleanFilename = rawFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `cmpe8l7ar0000j7m0l1zx4sun/TEST-TRACKING/${cleanFilename}`;
    
    console.log('Original filename:', rawFilename);
    console.log('Cleaned filename:', cleanFilename);
    console.log('File path:', filePath);

    // Get public URL using the Supabase client
    const { data: publicUrlData } = supabase.storage
      .from('application-documents')
      .getPublicUrl(filePath);

    console.log('Generated Public URL:', publicUrlData.publicUrl);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
