require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Hardcoded for local dev stability to bypass env issues
const supabaseUrl = 'https://mdjokagpejujfjfobdcs.supabase.co';
const supabaseKey = 'sb_publishable_Y9Wv-aZdMFVv55-CYgj2AA_6l3Iz31G';

if (!supabaseUrl) throw new Error("supabaseUrl is required.");

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
