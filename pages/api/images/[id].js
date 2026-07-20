const supabase = require('../../../config/supabase');
const verifyAuth = require('../../../middleware/authHelper');
const formidable = require('formidable');
const fs = require('fs');

module.exports.config = {
  api: {
    bodyParser: false, // Turn off body parser to support formidable file uploads
  },
};

const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || 'vybe-images';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uwfkqitmopqcbvwhkcgg.supabase.co';

function generateStoragePath(originalName, categorySlug = 'general') {
  const ext = originalName.split('.').pop().toLowerCase();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${categorySlug}/${timestamp}_${random}.${ext}`;
}

function getPublicUrl(storagePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
}

// Helper to parse JSON body when Next.js body parser is disabled
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

module.exports = async function handler(req, res) {
  const { id, replace } = req.query;

  const userSession = verifyAuth(req, res);
  if (!userSession) return; // verifyAuth handles 401 response

  if (req.method === 'PUT') {
    // Check if we are doing a file replacement (replace query parameter is set)
    if (replace === 'true') {
      // ── Replace Image File ──
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
        const getFieldVal = (val) => Array.isArray(val) ? val[0] : val;
        
        try {
          // Get existing image to delete its file from storage
          const { data: existing, error: fetchError } = await supabase
            .from('images')
            .select('*')
            .eq('id', id)
            .single();

          if (fetchError) throw fetchError;
          if (!existing) return res.status(404).json({ error: 'Image not found' });

          // Delete old file from storage
          await supabase.storage
            .from(BUCKET_NAME)
            .remove([existing.storage_path]);

          // Determine category for storage path
          let categorySlug = 'general';
          const categoryId = getFieldVal(fields.category_id) || existing.category_id;
          if (categoryId) {
            const { data: cat } = await supabase
              .from('image_categories')
              .select('slug')
              .eq('id', categoryId)
              .single();
            if (cat) categorySlug = cat.slug;
          }

          // Upload new file
          const storagePath = generateStoragePath(fileObj.originalFilename || 'unnamed.jpg', categorySlug);
          const publicUrl = getPublicUrl(storagePath);
          const fileBuffer = fs.readFileSync(fileObj.filepath);

          const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, fileBuffer, {
              contentType: fileObj.mimetype || 'image/jpeg',
              upsert: false,
              cacheControl: '31536000'
            });

          if (uploadError) throw uploadError;

          // Update database
          const title = getFieldVal(fields.title);
          const description = getFieldVal(fields.description);
          const alt_text = getFieldVal(fields.alt_text);
          const tags = getFieldVal(fields.tags);
          const is_featured = getFieldVal(fields.is_featured);

          const { data, error } = await supabase
            .from('images')
            .update({
              image_url: publicUrl,
              storage_path: storagePath,
              bucket_name: BUCKET_NAME,
              category_id: categoryId || null,
              file_size: fileObj.size,
              mime_type: fileObj.mimetype,
              title: title || existing.title,
              description: description || existing.description,
              alt_text: alt_text || existing.alt_text,
              tags: tags ? JSON.parse(tags) : existing.tags,
              is_featured: is_featured === 'true'
            })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return res.status(200).json(data);
        } catch (replaceErr) {
          console.error('Error replacing image:', replaceErr);
          return res.status(500).json({ error: replaceErr.message || 'Failed to replace image' });
        }
      });
    } else {
      // ── Update Image Metadata ──
      try {
        const body = await parseJsonBody(req);
        const { title, description, category_id, alt_text, tags, is_featured, is_active } = body;

        const { data, error } = await supabase
          .from('images')
          .update({ 
            title, 
            description, 
            category_id: category_id || null,
            alt_text, 
            tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
            is_featured: is_featured === true || is_featured === 'true',
            is_active: is_active === true || is_active === 'true'
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Image not found' });
        
        return res.status(200).json(data);
      } catch (updateErr) {
        console.error('Error updating image metadata:', updateErr);
        return res.status(500).json({ error: 'Failed to update image metadata' });
      }
    }

  } else if (req.method === 'DELETE') {
    // ── Delete Image ──
    try {
      const { data: image, error: fetchError } = await supabase
        .from('images')
        .select('storage_path, bucket_name')
        .eq('id', id)
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
        .eq('id', id);

      if (error) throw error;
      
      return res.status(200).json({ message: 'Image deleted successfully' });
    } catch (deleteErr) {
      console.error('Error deleting image:', deleteErr);
      return res.status(500).json({ error: 'Failed to delete image' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
