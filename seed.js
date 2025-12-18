const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

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

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        // Clear existing users
        await User.deleteMany({});
        console.log('Existing users cleared.');

        // Hash passwords and save users
        for (const user of users) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
            await new User(user).save();
        }

        console.log('Database Seeded Successfully!');
        console.log('-----------------------------------');
        console.log('Super Admin: sharon@vybe.org / password123');
        console.log('HR Staff:    farex@vybe.org  / password123');
        console.log('Programs:    moses@vybe.org  / password123');
        console.log('-----------------------------------');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDB();
