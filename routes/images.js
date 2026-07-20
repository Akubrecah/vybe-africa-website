const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

// Configuration from environment variables
const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || 'vybe-images';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uwfkqitmopqcbvwhkcgg.supabase.co';
const MAX_FILE_SIZE = parseInt(process.env.STORAGE_MAX_FILE_SIZE || '52428800', 10);
const ALLOWED_MIME_TYPES = (process.env.STORAGE_ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml').split(',');

// Multer config for memory storage (files go to Supabase Storage)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`));
        }
    }
});

// Helper: Generate unique storage path
function generateStoragePath(originalName, categorySlug = 'general') {
    const ext = originalName.split('.').pop().toLowerCase();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${categorySlug}/${timestamp}_${random}.${ext}`;
}

// Helper: Get public URL
function getPublicUrl(storagePath) {
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
}

// ============================================
// IMAGE CATEGORIES ROUTES
// ============================================

// GET /api/images/categories - Get all categories (public)
router.get('/categories', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('image_categories')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// POST /api/images/categories - Create category (staff)
router.post('/categories', auth, async (req, res) => {
    try {
        const { name, slug, display_name, icon, description, display_order } = req.body;
        
        if (!name || !slug) {
            return res.status(400).json({ error: 'Name and slug are required' });
        }

        const { data, error } = await supabase
            .from('image_categories')
            .insert([{ name, slug, display_name, icon, description, display_order }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('Error creating category:', err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Category name or slug already exists' });
        }
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// PUT /api/images/categories/:id - Update category (staff)
router.put('/categories/:id', auth, async (req, res) => {
    try {
        const { name, slug, display_name, icon, description, display_order, is_active } = req.body;
        
        const { data, error } = await supabase
            .from('image_categories')
            .update({ name, slug, display_name, icon, description, display_order, is_active })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Category not found' });
        
        res.json(data);
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// DELETE /api/images/categories/:id - Delete category (staff)
router.delete('/categories/:id', auth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('image_categories')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Category deleted' });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// ============================================
// IMAGES ROUTES
// ============================================

// GET /api/images - Get all images (public, with optional category filter)
router.get('/', async (req, res) => {
    try {
        const { category, featured, active, limit, offset, page, search } = req.query;
        
        let query = supabase
            .from('images')
            .select(`
                *,
                category:image_categories(id, name, slug)
            `, { count: 'exact' })
            .order('created_at', { ascending: false });

        // Filter by active status (default true for public) - only if column exists
        // We'll check by trying to filter; if it fails with column not found, retry without
        const isActive = active !== 'false';
        
        // Try with is_active filter first
        let queryWithActive = query.eq('is_active', isActive);

        // Optional filters
        if (category) {
            queryWithActive = queryWithActive.eq('category_id', category);
        }
        if (featured === 'true') {
            queryWithActive = queryWithActive.eq('is_featured', true);
        }
        if (search) {
            queryWithActive = queryWithActive.or(`title.ilike.%${search}%,description.ilike.%${search}%,alt_text.ilike.%${search}%`);
        }

        // Pagination
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;
        const offsetNum = parseInt(offset) || (pageNum - 1) * limitNum;
        
        queryWithActive = queryWithActive.range(offsetNum, offsetNum + limitNum - 1);

        let { data, error, count } = await queryWithActive;

        // If column doesn't exist, retry without the is_active filter
        if (error && error.code === '42703' && error.message.includes('is_active')) {
            console.warn('is_active column not found, retrying without filter');
            
            let queryWithoutActive = supabase
                .from('images')
                .select(`
                    *,
                    category:image_categories(id, name, slug)
                `, { count: 'exact' })
                .order('created_at', { ascending: false });

            if (category) {
                queryWithoutActive = queryWithoutActive.eq('category_id', category);
            }
            if (featured === 'true') {
                queryWithoutActive = queryWithoutActive.eq('is_featured', true);
            }
            if (search) {
                queryWithoutActive = queryWithoutActive.or(`title.ilike.%${search}%,description.ilike.%${search}%,alt_text.ilike.%${search}%`);
            }
            
            queryWithoutActive = queryWithoutActive.range(offsetNum, offsetNum + limitNum - 1);
            
            const result = await queryWithoutActive;
            data = result.data;
            error = result.error;
            count = result.count;
        }

        if (error) throw error;
        res.json({ data: data || [], count: count || 0, page: pageNum, limit: limitNum });
    } catch (err) {
        console.error('Error fetching images:', err);
        res.status(500).json({ error: 'Failed to fetch images' });
    }
});

// GET /api/images/:id - Get single image
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('images')
            .select(`
                *,
                category:image_categories(id, name, slug)
            `)
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Image not found' });
        
        res.json(data);
    } catch (err) {
        console.error('Error fetching image:', err);
        res.status(500).json({ error: 'Failed to fetch image' });
    }
});

// POST /api/images - Upload image (staff)
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const { title, description, category_id, alt_text, tags, is_featured } = req.body;
        
        // Determine category for storage path
        let categorySlug = 'general';
        if (category_id) {
            const { data: cat } = await supabase
                .from('image_categories')
                .select('slug')
                .eq('id', category_id)
                .single();
            if (cat) categorySlug = cat.slug;
        }

        // Generate storage path
        const storagePath = generateStoragePath(req.file.originalname, categorySlug);
        const publicUrl = getPublicUrl(storagePath);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false,
                cacheControl: '31536000'
            });

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { data, error } = await supabase
            .from('images')
            .insert([{
                title,
                description,
                image_url: publicUrl,
                storage_path: storagePath,
                bucket_name: BUCKET_NAME,
                category_id: category_id || null,
                alt_text,
                tags: tags ? JSON.parse(tags) : [],
                file_size: req.file.size,
                mime_type: req.file.mimetype,
                is_featured: is_featured === 'true',
                uploaded_by: req.user.id
            }])
            .select()
            .single();

        if (error) throw error;
        
        res.status(201).json(data);
    } catch (err) {
        console.error('Error uploading image:', err);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// PUT /api/images/:id - Update image metadata (staff)
router.put('/:id', auth, async (req, res) => {
    try {
        const { title, description, category_id, alt_text, tags, is_featured, is_active } = req.body;
        
        const { data, error } = await supabase
            .from('images')
            .update({ 
                title, 
                description, 
                category_id: category_id || null,
                alt_text, 
                tags: tags ? JSON.parse(tags) : [],
                is_featured: is_featured === 'true',
                is_active: is_active === 'true'
            })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Image not found' });
        
        res.json(data);
    } catch (err) {
        console.error('Error updating image:', err);
        res.status(500).json({ error: 'Failed to update image' });
    }
});

// PUT /api/images/:id/replace - Replace image file (staff)
router.put('/:id/replace', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Get existing image
        const { data: existing, error: fetchError } = await supabase
            .from('images')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (fetchError) throw fetchError;
        if (!existing) return res.status(404).json({ error: 'Image not found' });

        // Delete old file from storage
        await supabase.storage
            .from(BUCKET_NAME)
            .remove([existing.storage_path]);

        // Determine category for new storage path
        let categorySlug = 'general';
        const categoryId = req.body.category_id || existing.category_id;
        if (categoryId) {
            const { data: cat } = await supabase
                .from('image_categories')
                .select('slug')
                .eq('id', categoryId)
                .single();
            if (cat) categorySlug = cat.slug;
        }

        // Upload new file
        const storagePath = generateStoragePath(req.file.originalname, categorySlug);
        const publicUrl = getPublicUrl(storagePath);

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false,
                cacheControl: '31536000'
            });

        if (uploadError) throw uploadError;

        // Update database
        const { data, error } = await supabase
            .from('images')
            .update({
                image_url: publicUrl,
                storage_path: storagePath,
                bucket_name: BUCKET_NAME,
                category_id: categoryId || null,
                file_size: req.file.size,
                mime_type: req.file.mimetype,
                title: req.body.title || existing.title,
                description: req.body.description || existing.description,
                alt_text: req.body.alt_text || existing.alt_text,
                tags: req.body.tags ? JSON.parse(req.body.tags) : existing.tags,
                is_featured: req.body.is_featured === 'true'
            })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error replacing image:', err);
        res.status(500).json({ error: 'Failed to replace image' });
    }
});

// DELETE /api/images/:id - Delete image (staff)
router.delete('/:id', auth, async (req, res) => {
    try {
        // Get image to delete storage file
        const { data: image, error: fetchError } = await supabase
            .from('images')
            .select('storage_path, bucket_name')
            .eq('id', req.params.id)
            .single();

        if (fetchError) throw fetchError;
        if (!image) return res.status(404).json({ error: 'Image not found' });

        // Delete from storage
        await supabase.storage
            .from(image.bucket_name)
            .remove([image.storage_path]);

        // Delete from database
        const { error } = await supabase
            .from('images')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        
        res.json({ message: 'Image deleted successfully' });
    } catch (err) {
        console.error('Error deleting image:', err);
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

// POST /api/images/bulk-upload - Bulk upload multiple images (staff)
router.post('/bulk-upload', auth, upload.array('images', 20), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No images provided' });
        }

        const { category_id, default_title, default_description, tags } = req.body;
        
        // Determine category slug
        let categorySlug = 'general';
        if (category_id) {
            const { data: cat } = await supabase
                .from('image_categories')
                .select('slug')
                .eq('id', category_id)
                .single();
            if (cat) categorySlug = cat.slug;
        }

        const results = { success: [], failed: [] };

        for (const file of req.files) {
            try {
                const storagePath = generateStoragePath(file.originalname, categorySlug);
                const publicUrl = getPublicUrl(storagePath);

                // Upload to storage
                const { error: uploadError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(storagePath, file.buffer, {
                        contentType: file.mimetype,
                        upsert: false,
                        cacheControl: '31536000'
                    });

                if (uploadError) throw uploadError;

                // Save metadata
                const { data, error } = await supabase
                    .from('images')
                    .insert([{
                        title: default_title || file.originalname.replace(/\.[^/.]+$/, ''),
                        description: default_description || '',
                        image_url: publicUrl,
                        storage_path: storagePath,
                        bucket_name: BUCKET_NAME,
                        category_id: category_id || null,
                        alt_text: '',
                        tags: tags ? JSON.parse(tags) : [],
                        file_size: file.size,
                        mime_type: file.mimetype,
                        uploaded_by: req.user.id
                    }])
                    .select()
                    .single();

                if (error) throw error;
                results.success.push(data);
            } catch (err) {
                results.failed.push({ file: file.originalname, error: err.message });
            }
        }

        res.json(results);
    } catch (err) {
        console.error('Error bulk uploading:', err);
        res.status(500).json({ error: 'Failed to bulk upload images' });
    }
});

module.exports = router;