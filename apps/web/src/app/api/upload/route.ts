import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const lguId = formData.get('lguId') as string | null;
    const trackingNumber = formData.get('trackingNumber') as string | null;

    // ─── 1. Validation ────────────────────────────────────────────────────────

    if (!file) {
      return NextResponse.json({ error: 'Walang file na ipinadala (No file provided)' }, { status: 400 });
    }

    if (!lguId || !trackingNumber) {
      return NextResponse.json({ error: 'Kululang ang LGU ID o Tracking Number (Missing LGU ID or tracking number)' }, { status: 400 });
    }

    // Size validation: max 5MB (5 * 1024 * 1024 bytes)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ang file ay dapat 5MB o mas mababa (File must be 5MB or less)' }, { status: 400 });
    }

    // Type validation: PDF, JPG, PNG only
    const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!acceptedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'PDF, JPG, o PNG lamang ang tinatanggap na format (Only PDF, JPG, or PNG are accepted)' }, { status: 400 });
    }

    // Clean filename to remove special characters
    const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${lguId}/${trackingNumber}/${cleanFilename}`;

    // ─── 2. Supabase Upload ───────────────────────────────────────────────────

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase credentials are not configured on the server. Mock mode disabled.' }, { status: 500 });
    }

    // Try to ensure the bucket exists
    // Supabase will return an error if it exists or we can just proceed with upload
    try {
      await supabase.storage.createBucket('application-documents', {
        public: true,
        fileSizeLimit: MAX_SIZE,
      });
    } catch (e) {
      // Ignore bucket already exists error
    }

    // Convert file to Node.js Buffer for uploading to prevent fetch failed errors with raw ArrayBuffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from('application-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return NextResponse.json({ error: `Hindi ma-upload ang dokumento (Failed to upload document): ${error.message}` }, { status: 500 });
    }

    // Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from('application-documents')
      .getPublicUrl(filePath);

    return NextResponse.json({
      url: publicUrlData.publicUrl,
      name: file.name,
      path: data.path,
    });
  } catch (error) {
    console.error('File upload server error:', error);
    return NextResponse.json({ error: 'Server error during file upload' }, { status: 500 });
  }
}
