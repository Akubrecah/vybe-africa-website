const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const supabase = require('../config/supabase');

// @route   GET api/posts
// @desc    Get all posts (Public)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .order('date', { ascending: false }); // Sort by date desc

        if (error) throw error;
        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/posts
// @desc    Create a post (Staff Only)
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        // Get Author Name
        const { data: user } = await supabase
            .from('users')
            .select('name')
            .eq('id', req.user.id)
            .single();
        
        const { title, content, category } = req.body;

        const { data: post, error } = await supabase
            .from('posts')
            .insert([{
                title,
                content,
                category,
                author: req.user.id,
                author_name: user ? user.name : 'Unknown'
            }])
            .select();

        if (error) throw error;
        res.json(post[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
