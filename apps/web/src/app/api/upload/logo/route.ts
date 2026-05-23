import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@bayanserve/db';
import { auth } from '@/auth';

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
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Walang pahintulot (Unauthorized)' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const lguId = formData.get('lguId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Walang file na ipinadala (No file provided)' }, { status: 400 });
    }

    if (!lguId) {
      return NextResponse.json({ error: 'Kulang ang LGU ID (Missing LGU ID)' }, { status: 400 });
    }

    // Size limit: 2MB (2 * 1024 * 1024 bytes)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ang file ay dapat 2MB o mas mababa (File must be 2MB or less)' }, { status: 400 });
    }

    // Accept: PNG, JPG, JPEG, SVG only
    const acceptedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!acceptedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: 'PNG, JPG, o SVG lamang ang tinatanggap na format (Only PNG, JPG, or SVG are accepted)' }, { status: 400 });
    }

    // Resolve extension
    let ext = 'png';
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') ext = 'jpg';
    else if (file.type === 'image/svg+xml') ext = 'svg';

    const filePath = `${lguId}/logo.${ext}`;

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase storage configuration is missing on the server.' }, { status: 500 });
    }

    // Ensure lgu-assets bucket exists in Supabase
    try {
      await supabase.storage.createBucket('lgu-assets', {
        public: true,
        fileSizeLimit: MAX_SIZE,
      });
    } catch (e) {
      // Ignore bucket already exists error
    }

    // Convert file to Node.js Buffer for uploading to prevent fetch failed errors with raw ArrayBuffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('lgu-assets')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage logo upload error:', uploadError);
      return NextResponse.json({ error: `Failed to upload logo: ${uploadError.message}` }, { status: 500 });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('lgu-assets')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Update in Database
    try {
      await prisma.lgu.update({
        where: { id: lguId },
        data: { logoUrl: publicUrl },
      });
    } catch (dbErr) {
      console.error('Database LGU logo url update error:', dbErr);
      return NextResponse.json({ error: 'Hindi ma-access ang database. Makipag-ugnayan sa inyong IT administrator.' }, { status: 500 });
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Logo upload endpoint error:', error);
    return NextResponse.json({ error: 'Hindi ma-access ang database. Makipag-ugnayan sa inyong IT administrator.' }, { status: 500 });
  }
}
