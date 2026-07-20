const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register a user (Use for seeding initially)
// @access  Public
// @route   POST api/auth/register
// @desc    Register a user (DISABLED: Admin only via /api/users)
// @access  Public
router.post('/register', async (req, res) => {
    return res.status(403).json({ msg: 'Public registration is disabled. Contact Admin.' });
    /* 
    // Legacy Code kept for reference if needed later
    const { name, email, password, role, designation } = req.body;
    ...
    */
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Supabase Query
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, role: user.role, name: user.name, designation: user.designation });
        });

    } catch (err) {
        console.error('LOGIN ERROR:', err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, role, designation, phone, bio')
            .eq('id', req.user.id)
            .single();

        if (error || !user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('GET ME ERROR:', err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
