#!/usr/bin/env node
/**
 * VYBE AFRICA — Bulk Image Upload to Supabase Storage + Database
 * =============================================================
 * Uploads all local project images into organised Supabase Storage buckets
 * and creates corresponding database records in the 'images' table.
 *
 * Configuration is loaded from .env file:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY (or SUPABASE_SERVICE_KEY for admin ops)
 * - STORAGE_BUCKET_NAME
 *
 * Bucket layout:
 *   vybe-images/
 *     outreach/       ← Community Outreach images
 *     workshops/      ← Youth Workshops images
 *     climate/        ← Climate Action images
 *     health/         ← Health Clinics images
 *     events/         ← Events images
 *     team/           ← Team & Staff images
 *     general/        ← General purpose images
 *
 * Usage: node scripts/upload_images_to_supabase.js
 * 
 * Prerequisites:
 * 1. Run the SQL migration in add_cms_tables.sql in Supabase SQL Editor
 * 2. Create storage bucket 'vybe-images' in Supabase Dashboard (Public: Yes)
 * 3. Set up RLS policies for authenticated uploads
 * 4. Copy .env.example to .env and fill in your values
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ─── Configuration from Environment ──────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || 'vybe-images';
const PROJECT_ROOT = path.resolve(__dirname, '..');
const IMAGES_ROOT = path.join(PROJECT_ROOT, 'assets', 'images');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌  Missing required environment variables:');
    console.error('   SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
    process.exit(1);
}

// Which extensions to treat as images (skip videos for now)
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']);

// MIME map
const MIME = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.svg':  'image/svg+xml',
    '.bmp':  'image/bmp',
};

// Category mapping based on folder names
const FOLDER_TO_CATEGORY = {
    'outreach': 'outreach',
    'workshops': 'workshops', 
    'climate': 'climate',
    'health': 'health',
    'events': 'events',
    'team': 'team',
    'gallery': 'outreach', // gallery images default to outreach
    'general': 'general'
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getContentType(filePath) {
    return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function formatFileSize(bytes) {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Walk a directory and collect all image file paths
function collectImages(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectImages(fullPath));
        } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (IMAGE_EXTS.has(ext)) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

// Map a local path to a storage path inside the bucket
function storagePath(localPath) {
    const rel = path.relative(IMAGES_ROOT, localPath);
    // Normalise Windows separators
    return rel.replace(/\\/g, '/');
}

// Determine category from path
function getCategoryFromPath(localPath) {
    const rel = path.relative(IMAGES_ROOT, localPath);
    const firstFolder = rel.split(path.sep)[0].toLowerCase();
    return FOLDER_TO_CATEGORY[firstFolder] || 'general';
}

// Generate clean title from filename
function generateTitle(fileName) {
    return fileName
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[_-]/g, ' ')    // Replace underscores and dashes with spaces
        .replace(/([A-Z])/g, ' $1') // Add space before capitals
        .replace(/\s+/g, ' ')     // Normalize spaces
        .trim()
        .replace(/\b\w/g, l => l.toUpperCase()); // Title case
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🚀  VYBE Africa — Supabase Storage + Database Bulk Upload');
    console.log('═'.repeat(60));
    console.log(`\n   Bucket : ${BUCKET_NAME}`);
    console.log(`   Target : ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/`);
    console.log('\n⚠️  IMPORTANT — Before running, make sure:');
    console.log(`   1. Run SQL migration (add_cms_tables.sql) in Supabase Dashboard`);
    console.log(`   2. Go to Supabase Dashboard → Storage`);
    console.log(`   3. Create bucket: "${BUCKET_NAME}"  (Public ✅)`);
    console.log(`   4. Set up RLS policies for authenticated uploads\n`);

    // Use service key if available (for admin ops), otherwise anon key
    const supabaseKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
    const supabase = createClient(SUPABASE_URL, supabaseKey, {
        auth: { persistSession: false }
    });

    // Probe the bucket
    console.log(`📦  Probing bucket "${BUCKET_NAME}"…`);
    const { data: probeData, error: probeError } = await supabase.storage
        .from(BUCKET_NAME)
        .list('', { limit: 1 });

    if (probeError) {
        if (probeError.message && probeError.message.toLowerCase().includes('not found')) {
            console.error(`\n❌  Bucket "${BUCKET_NAME}" does not exist yet.`);
            console.log(`\n👉  Please create it in Supabase Dashboard → Storage → New bucket`);
            console.log(`   Name: ${BUCKET_NAME}  |  Public: ✅`);
            console.log(`   Then re-run: node scripts/upload_images_to_supabase.js\n`);
            process.exit(1);
        }
        console.log(`   ⚠️  Probe returned error: ${probeError.message}`);
        console.log(`   Proceeding with uploads anyway…`);
    } else {
        console.log(`   ✅  Bucket "${BUCKET_NAME}" is accessible (${probeData.length} existing files peeked).`);
    }

    // 1. Fetch categories from database
    console.log('\n📋  Fetching categories from database…');
    const { data: categories, error: catError } = await supabase
        .from('image_categories')
        .select('id, slug, name')
        .eq('is_active', true);

    if (catError) {
        console.error('   ❌  Failed to fetch categories:', catError.message);
        console.log('   Make sure you have run the SQL migration (add_cms_tables.sql)');
        process.exit(1);
    }

    const categoryBySlug = {};
    categories.forEach(c => { categoryBySlug[c.slug] = c; });
    console.log(`   ✅  Found ${categories.length} categories: ${Object.keys(categoryBySlug).join(', ')}`);

    // 2. Collect all images
    console.log('\n🔍  Scanning assets/images for files to upload…');
    const allImages = collectImages(IMAGES_ROOT);
    console.log(`   Found ${allImages.length} image files.\n`);

    if (allImages.length === 0) {
        console.log('   Nothing to upload. Exiting.\n');
        return;
    }

    // 3. Upload each image
    const results = { success: [], skipped: [], failed: [] };

    for (let i = 0; i < allImages.length; i++) {
        const localPath  = allImages[i];
        const storage    = storagePath(localPath);
        const stat       = fs.statSync(localPath);
        const mime       = getContentType(localPath);
        const categorySlug = getCategoryFromPath(localPath);
        const category   = categoryBySlug[categorySlug];
        const num        = `[${String(i + 1).padStart(3, '0')}/${allImages.length}]`;

        process.stdout.write(`${num} Uploading ${storage} (${formatFileSize(stat.size)})… `);

        try {
            const fileBuffer = fs.readFileSync(localPath);

            // Upload to Supabase Storage
            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(storage, fileBuffer, {
                    contentType: mime,
                    upsert: true,           // overwrite if exists
                    cacheControl: '31536000', // 1 year cache
                });

            if (error) {
                // "The resource already exists" is safe to ignore when upsert=true
                if (error.message && error.message.includes('already exists')) {
                    console.log('⏭  Skipped (already exists)');
                    results.skipped.push(storage);
                } else {
                    console.log(`❌  FAILED — ${error.message}`);
                    results.failed.push({ path: storage, reason: error.message });
                }
            } else {
                const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storage}`;
                console.log(`✅  Done`);

                // Insert into database
                const { error: dbError } = await supabase
                    .from('images')
                    .insert([{
                        title: generateTitle(path.basename(localPath)),
                        description: '',
                        image_url: publicUrl,
                        storage_path: storage,
                        bucket_name: BUCKET_NAME,
                        category_id: category?.id || null,
                        alt_text: '',
                        tags: [],
                        file_size: stat.size,
                        mime_type: mime,
                        is_featured: false,
                        is_active: true
                    }]);

                if (dbError) {
                    console.log(`   ⚠️  DB insert failed: ${dbError.message}`);
                }

                results.success.push({ path: storage, url: publicUrl, category: categorySlug });
            }
        } catch (err) {
            console.log(`❌  ERROR — ${err.message}`);
            results.failed.push({ path: storage, reason: err.message });
        }
    }

    // 4. Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊  Upload Summary');
    console.log('═'.repeat(60));
    console.log(`   ✅  Uploaded:  ${results.success.length}`);
    console.log(`   ⏭   Skipped:   ${results.skipped.length}`);
    console.log(`   ❌  Failed:    ${results.failed.length}`);

    if (results.success.length > 0) {
        console.log('\n🌐  Public Base URL:');
        console.log(`   ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/`);

        console.log('\n📋  Uploaded File URLs (first 20):');
        results.success.slice(0, 20).forEach(r => {
            console.log(`   ${r.url}  [${r.category}]`);
        });
        if (results.success.length > 20) {
            console.log(`   … and ${results.success.length - 20} more.`);
        }
    }

    if (results.failed.length > 0) {
        console.log('\n⚠️   Failed uploads:');
        results.failed.forEach(f => console.log(`   ❌ ${f.path}: ${f.reason}`));
    }

    // 5. Write URL mapping to a JSON report file
    const report = {
        bucket: BUCKET_NAME,
        baseUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}`,
        uploaded: results.success,
        skipped: results.skipped,
        failed: results.failed,
        generatedAt: new Date().toISOString(),
    };

    const reportPath = path.join(PROJECT_ROOT, 'scripts', 'upload_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📝  Full report saved to: scripts/upload_report.json`);
    console.log('\n✅  Done!\n');
}

main().catch(err => {
    console.error('\n💥  Unexpected error:', err.message);
    process.exit(1);
});