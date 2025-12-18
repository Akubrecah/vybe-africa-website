const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

const bcrypt = require('bcryptjs');

// @route   GET api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/users
// @desc    Get all users (Super Admin only check inside)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Optional: Check if admin
        // if(req.user.role !== 'superadmin') return res.status(403).json({msg:'Access denied'});
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/users
// @desc    Create a new user (Super Admin Only)
// @access  Private - Admin
router.post('/', auth, async (req, res) => {
    try {
        // Verify Admin
        const reqUser = await User.findById(req.user.id);
        if(reqUser.role !== 'superadmin' && !reqUser.designation.toLowerCase().includes('executive')) {
            return res.status(403).json({ msg: 'Access Denied: Admins only' });
        }

        const { name, email, password, role, designation } = req.body;
        
        // Check exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            name,
            email,
            password,
            role,
            designation
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        res.json({ msg: 'User created successfully', user: { name, email, role, designation } });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/users/:id
// @desc    Delete user
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: 'User removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
