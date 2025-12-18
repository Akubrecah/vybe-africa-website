const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');

// @route   GET api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, role, designation')
            .eq('id', req.user.id)
            .single();

        if (error) throw error;
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/users
// @desc    Get all users
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, email, role, designation');

        if (error) throw error;
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
        const { data: reqUser } = await supabase
            .from('users')
            .select('role, designation')
            .eq('id', req.user.id)
            .single();

        if (reqUser.role !== 'superadmin' && !reqUser.designation.toLowerCase().includes('executive')) {
            return res.status(403).json({ msg: 'Access Denied: Admins only' });
        }

        const { name, email, password, role, designation } = req.body;
        
        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert User
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([{ 
                name, 
                email, 
                password: hashedPassword, 
                role, 
                designation 
            }])
            .select();

        if (error) throw error;
        res.json({ msg: 'User created successfully', user: newUser[0] });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: ' + err.message);
    }
});

// @route   DELETE api/users/:id
// @desc    Delete user
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ msg: 'User removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
