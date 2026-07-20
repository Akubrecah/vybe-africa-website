#!/usr/bin/env node
/**
 * VYBE AFRICA — Sync Existing Supabase Bucket → Database
 * =======================================================
 * Reads all files already in the "vybe-images" bucket and
 * upserts matching records into the public.images table.
 *
 * No local files needed — works purely from what's in Storage.
 *
 * Usage: node scripts/sync_bucket_to_db.js
 */

const { createClient } = require('@supabase/supabase-js');

// ─── Credentials ─────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://uwfkqitmopqcbvwhkcgg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZmtxaXRtb3BxY2J2d2hrY2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTM2OTksImV4cCI6MjA5ODg4OTY5OX0.clHwO4AOcCB1yFbxGybydSUAlfR3uCaccnqt_mew3H8';
// Paste your service_role key here if you have it — needed for full listing
const SUPABASE_SERVICE_KEY = '';

// ─── Config ──────────────────────────────────────────────────────────────────
const BUCKET_NAME = 'vybe-images';

// Maps bucket folder prefixes → category slugs in image_categories table
const FOLDER_CATEGORY_MAP = {
  outreach:  'outreach',
  workshops: 'workshops',
  climate:   'climate',
  health:    'health',
  events:    'outreach',   // events → outreach
  team:      'general',    // team photos → general
  gallery:   'outreach',   // legacy gallery → outreach
  general:   'general',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function categorySlugFromPath(storagePath) {
  const firstFolder = storagePath.split('/')[0].toLowerCase();
  return FOLDER_CATEGORY_MAP[firstFolder] || 'general';
}

function titleFromPath(storagePath) {
  const filename = storagePath.split('/').pop();
  const noExt    = filename.replace(/\.[^.]+$/, '');
  return noExt.replace(/[-_]/g, ' ');
}

/**
 * Recursively list all files in a bucket folder using pagination.
 */
async function listAllFiles(supabase, prefix = '') {
  const files = [];
  let offset  = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) throw new Error(`list("${prefix}") failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.id === null) {
        // It's a folder — recurse
        const nested = await listAllFiles(supabase, fullPath);
        files.push(...nested);
      } else {
        // It's a file
        files.push({ path: fullPath, metadata: item.metadata || {} });
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return files;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔄  VYBE Africa — Bucket → Database Sync');
  console.log('═'.repeat(55));
  console.log(`\n   Bucket : ${BUCKET_NAME}`);
  console.log(`   Target : ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/\n`);

  const supabaseKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  const supabase    = createClient(SUPABASE_URL, supabaseKey, {
    auth: { persistSession: false },
  });

  // 1. Fetch categories from DB
  console.log('📋  Loading categories from database…');
  const { data: categories, error: catError } = await supabase
    .from('image_categories')
    .select('id, slug, name');

  if (catError) {
    console.error('   ❌  Failed:', catError.message);
    console.log('   → Run add_cms_tables.sql in Supabase SQL Editor first.');
    process.exit(1);
  }

  const categoryBySlug = Object.fromEntries(categories.map(c => [c.slug, c]));
  console.log(`   ✅  ${categories.length} categories: ${categories.map(c => c.slug).join(', ')}\n`);

  // 2. Fetch existing storage_paths already in DB (avoid duplicates)
  console.log('🗄️   Loading already-registered paths from images table…');
  const { data: existing, error: existErr } = await supabase
    .from('images')
    .select('storage_path');

  if (existErr) {
    console.error('   ❌  Failed:', existErr.message);
    process.exit(1);
  }

  const registeredPaths = new Set((existing || []).map(r => r.storage_path));
  console.log(`   ✅  ${registeredPaths.size} already registered.\n`);

  // 3. List all files in bucket
  console.log('📦  Scanning bucket for all files…');
  let bucketFiles;
  try {
    bucketFiles = await listAllFiles(supabase);
  } catch (err) {
    console.error('   ❌  Bucket scan failed:', err.message);
    process.exit(1);
  }

  const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif']);
  const imageFiles = bucketFiles.filter(f => {
    const ext = '.' + f.path.split('.').pop().toLowerCase();
    return IMAGE_EXTS.has(ext);
  });

  console.log(`   ✅  Found ${imageFiles.length} image files in bucket.\n`);

  if (imageFiles.length === 0) {
    console.log('   Nothing to sync. Exiting.\n');
    return;
  }

  // 4. Upsert new records
  console.log('💾  Syncing to database…\n');
  const results = { inserted: [], skipped: [], failed: [] };

  for (let i = 0; i < imageFiles.length; i++) {
    const { path: storagePath, metadata } = imageFiles[i];
    const num = `[${String(i + 1).padStart(3, '0')}/${imageFiles.length}]`;

    if (registeredPaths.has(storagePath)) {
      console.log(`${num} ⏭  Already registered — ${storagePath}`);
      results.skipped.push(storagePath);
      continue;
    }

    const slug        = categorySlugFromPath(storagePath);
    const category    = categoryBySlug[slug];
    const publicUrl   = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
    const title       = titleFromPath(storagePath);
    const ext         = storagePath.split('.').pop().toLowerCase();
    const mimeMap     = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif',  webp: 'image/webp', svg: 'image/svg+xml',
      bmp: 'image/bmp',  avif: 'image/avif',
    };

    process.stdout.write(`${num} Inserting ${storagePath}… `);

    const { error: dbError } = await supabase
      .from('images')
      .insert([{
        title,
        description:  '',
        image_url:    publicUrl,
        storage_path: storagePath,
        bucket_name:  BUCKET_NAME,
        category_id:  category?.id || null,
        alt_text:     title,
        tags:         [],
        file_size:    metadata?.size || null,
        mime_type:    mimeMap[ext] || 'application/octet-stream',
        is_featured:  false,
      }]);

    if (dbError) {
      console.log(`❌  FAILED — ${dbError.message}`);
      results.failed.push({ path: storagePath, reason: dbError.message });
    } else {
      console.log(`✅  Done  [${slug}]`);
      results.inserted.push({ path: storagePath, url: publicUrl, category: slug });
    }
  }

  // 5. Summary
  console.log('\n' + '═'.repeat(55));
  console.log('📊  Sync Summary');
  console.log('═'.repeat(55));
  console.log(`   ✅  Inserted : ${results.inserted.length}`);
  console.log(`   ⏭   Skipped  : ${results.skipped.length}  (already in DB)`);
  console.log(`   ❌  Failed   : ${results.failed.length}`);

  if (results.inserted.length > 0) {
    console.log('\n🌐  Sample URLs inserted:');
    results.inserted.slice(0, 10).forEach(r => console.log(`   ${r.url}`));
    if (results.inserted.length > 10)
      console.log(`   … and ${results.inserted.length - 10} more.`);
  }

  if (results.failed.length > 0) {
    console.log('\n⚠️   Failed:');
    results.failed.forEach(f => console.log(`   ❌ ${f.path}: ${f.reason}`));
  }

  console.log('\n✅  Sync complete!\n');
}

main().catch(err => {
  console.error('\n💥  Unexpected error:', err.message);
  process.exit(1);
});
