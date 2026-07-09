require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Hardcoded for local dev stability to bypass env issues
const supabaseUrl = 'https://uwfkqitmopqcbvwhkcgg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZmtxaXRtb3BxY2J2d2hrY2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTM2OTksImV4cCI6MjA5ODg4OTY5OX0.clHwO4AOcCB1yFbxGybydSUAlfR3uCaccnqt_mew3H8';

if (!supabaseUrl) throw new Error("supabaseUrl is required.");

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
