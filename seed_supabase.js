require('dotenv').config();
const supabase = require('./config/supabase'); // Uses your existing config
const bcrypt = require('bcryptjs');

const users = [
    {
        name: 'Sharon Chepkite',
        email: 'sharon@vybe.org',
        password: 'password123',
        role: 'superadmin',
        designation: 'Executive Director'
    },
    {
        name: 'Moses Kibet',
        email: 'moses@vybe.org',
        password: 'password123',
        role: 'staff',
        designation: 'Programs Manager'
    },
    {
        name: 'Farex Nandwa',
        email: 'farex@vybe.org',
        password: 'password123',
        role: 'staff',
        designation: 'HR'
    },
    {
        name: 'Tony Barasa',
        email: 'tony@vybe.org',
        password: 'password123',
        role: 'staff',
        designation: 'M&E'
    },
    {
        name: 'Marcellina Cherubia',
        email: 'marcellina@vybe.org',
        password: 'password123',
        role: 'staff',
        designation: 'Communication Officer'
    }
];

const seedSupabase = async () => {
    console.log('🌱 Seeding Supabase...');

    for (const user of users) {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);

        const { data, error } = await supabase
            .from('users')
            .upsert({ 
                name: user.name, 
                email: user.email, 
                password: hashedPassword, // Storing hashed password
                role: user.role, 
                designation: user.designation 
            }, { onConflict: 'email' }) // Prevent duplicates
            .select();

        if (error) {
            console.error(`❌ Failed to add ${user.name}:`, error.message);
        } else {
            console.log(`✅ Added ${user.name}`);
        }
    }
    console.log('✨ Seeding Check Complete.');
};

seedSupabase();
