require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Hardcoded for local dev stability to bypass env issues
const supabaseUrl = 'https://lkqkhpgrjhynqynaiciu.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl) throw new Error("supabaseUrl is required.");

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
