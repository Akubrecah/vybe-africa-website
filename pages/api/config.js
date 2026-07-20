module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL,
    storageBucket: process.env.STORAGE_BUCKET_NAME || 'vybe-images',
    maxFileSize: parseInt(process.env.STORAGE_MAX_FILE_SIZE || '52428800', 10),
    allowedMimeTypes: (process.env.STORAGE_ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml').split(',')
  });
}
