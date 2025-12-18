require('dotenv').config();
const supabase = require('./config/supabase');

async function testConnection() {
    console.log('Testing Supabase Connection...');
    try {
        // Try to fetch data from a table (even if empty, it tests auth)
        // Adjust 'users' to a table you know exists or just check system time if possible, 
        // but Supabase client simple check:
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('❌ Connection Failed:', error.message);
            // Common error: Table doesn't exist yet
            if(error.code === '42P01') console.log('💡 Note: The connection works, but the "users" table does not exist yet.');
        } else {
            console.log('✅ Connection Successful!');
        }
    } catch (err) {
        console.error('❌ Unexpected Error:', err);
    }
}

testConnection();
