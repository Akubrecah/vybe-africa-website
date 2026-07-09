require('dotenv').config();
const supabase = require('./config/supabase'); // Uses your existing config
const bcrypt = require('bcryptjs');

const users = [
    {
        name: 'Sharon Chepkite',
        email: 'sharon@vybeafrica.org',
        password: 'Vybe2024',
        role: 'superadmin',
        designation: 'Executive Director',
        avatar_url: 'assets/images/IMG-20251211-WA0053.jpg'
    },
    {
        name: 'Moses Kibet',
        email: 'moses@vybeafrica.org',
        password: 'Vybe2024',
        role: 'programs',
        designation: 'Programs Manager',
        avatar_url: 'assets/images/IMG-20251211-WA0024.jpg'
    },
    {
        name: 'Farex Nandwa',
        email: 'farex@vybeafrica.org',
        password: 'Vybe2024',
        role: 'hr',
        designation: 'HR Manager',
        avatar_url: 'assets/images/IMG-20251211-WA0030.jpg'
    },
    {
        name: 'Tony Barasa',
        email: 'tony@vybeafrica.org',
        password: 'Vybe2024',
        role: 'staff',
        designation: 'M&E Lead',
        avatar_url: 'assets/images/team/Tony Barasa.jpg'
    },
    {
        name: 'Marcellina Cherubia',
        email: 'marcellina@vybeafrica.org',
        password: 'Vybe2024',
        role: 'staff',
        designation: 'Communication Officer',
        avatar_url: 'assets/images/team/Marcellina Cherubia.jpg'
    },
    {
        name: 'Joe Junior',
        email: 'joe@vybeafrica.org',
        password: 'Vybe2024',
        role: 'finance',
        designation: 'Finance Manager',
        avatar_url: 'assets/images/team/Joe Junior.jpg'
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
                designation: user.designation,
                avatar_url: user.avatar_url
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
