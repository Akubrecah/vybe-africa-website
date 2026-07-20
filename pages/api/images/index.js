const supabase = require('../../../config/supabase');
const verifyAuth = require('../../../middleware/authHelper');
const formidable = require('formidable');
const fs = require('fs');

module.exports.config = {
  api: {
    bodyParser: false, // Disables standard body parsing so formidable can parse multipart uploads
  },
};

const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || 'vybe-images';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uwfkqitmopqcbvwhkcgg.supabase.co';

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

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    // ── 1. GET /api/images: Retrieve list of images (or single image if id is passed) ──
    const { id, category, featured, active, limit, offset, page, search } = req.query;

    if (id) {
      try {
        const { data, error } = await supabase
          .from('images')
          .select(`
            *,
            category:image_categories(id, name, slug)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Image not found' });
        return res.status(200).json(data);
      } catch (err) {
        console.error('Error fetching single image:', err);
        return res.status(500).json({ error: 'Failed to fetch image' });
      }
    }

    try {
      let query = supabase
        .from('images')
        .select(`
          *,
          category:image_categories(id, name, slug)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      const isActive = active !== 'false';
      let queryWithActive = query.eq('is_active', isActive);

      if (category) {
        queryWithActive = queryWithActive.eq('category_id', category);
      }
      if (featured === 'true') {
        queryWithActive = queryWithActive.eq('is_featured', true);
      }
      if (search) {
        queryWithActive = queryWithActive.or(`title.ilike.%${search}%,description.ilike.%${search}%,alt_text.ilike.%${search}%`);
      }

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const offsetNum = parseInt(offset, 10) || (pageNum - 1) * limitNum;
      
      queryWithActive = queryWithActive.range(offsetNum, offsetNum + limitNum - 1);

      let { data, error, count } = await queryWithActive;

      // Handle is_active column missing fallback
      if (error && error.code === '42703' && error.message.includes('is_active')) {
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
      return res.status(200).json({ data: data || [], count: count || 0, page: pageNum, limit: limitNum });
    } catch (err) {
      console.error('Error fetching images:', err);
      return res.status(500).json({ error: 'Failed to fetch images' });
    }

  } else if (req.method === 'POST') {
    // ── 2. POST /api/images: Upload image (staff) ──
    const userSession = verifyAuth(req, res);
    if (!userSession) return; // verifyAuth handles 401 response

    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parse error:', err);
        return res.status(400).json({ error: 'Failed to parse upload data.' });
      }

      const file = files.image;
      if (!file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const fileObj = Array.isArray(file) ? file[0] : file;
      
      // Extract fields (formidable puts them in fields objects, sometimes as arrays depending on version)
      const getFieldVal = (val) => Array.isArray(val) ? val[0] : val;
      const title = getFieldVal(fields.title);
      const description = getFieldVal(fields.description);
      const category_id = getFieldVal(fields.category_id);
      const alt_text = getFieldVal(fields.alt_text);
      const tags = getFieldVal(fields.tags);
      const is_featured = getFieldVal(fields.is_featured);

      try {
        let categorySlug = 'general';
        if (category_id) {
          const { data: cat } = await supabase
            .from('image_categories')
            .select('slug')
            .eq('id', category_id)
            .single();
          if (cat) categorySlug = cat.slug;
        }

        const storagePath = generateStoragePath(fileObj.originalFilename || 'unnamed_image.jpg', categorySlug);
        const publicUrl = getPublicUrl(storagePath);
        const fileBuffer = fs.readFileSync(fileObj.filepath);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, fileBuffer, {
            contentType: fileObj.mimetype || 'image/jpeg',
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
            file_size: fileObj.size,
            mime_type: fileObj.mimetype,
            is_featured: is_featured === 'true',
            uploaded_by: userSession.id
          }])
          .select()
          .single();

        if (error) throw error;
        
        return res.status(201).json(data);
      } catch (uploadErr) {
        console.error('Error uploading image:', uploadErr);
        return res.status(500).json({ error: uploadErr.message || 'Failed to upload image' });
      }
    });

  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
