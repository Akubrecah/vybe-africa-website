require('dotenv').config();
const supabase = require('../config/supabase');

async function countDocs() {
  try {
    const { data, error } = await supabase
      .from('bonga_documents')
      .select('source_name, title, count()')
      .select('source_name, title, pillar');

    if (error) {
      console.error('❌ Query Error:', error.message);
      return;
    }

    console.log(`Total rows returned: ${data.length}`);
    const summary = {};
    data.forEach(r => {
      const key = r.title || r.source_name || 'unknown';
      summary[key] = (summary[key] || 0) + 1;
    });
    console.log('Unique documents in bonga_documents table:', summary);
  } catch (err) {
    console.error('❌ Unexpected Error:', err);
  }
}

countDocs();
