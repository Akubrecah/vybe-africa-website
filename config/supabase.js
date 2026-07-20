require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) throw new Error('SUPABASE_URL is required. Set it in .env file.');
if (!supabaseKey) throw new Error('SUPABASE_ANON_KEY is required. Set it in .env file.');

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;