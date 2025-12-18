const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');

// @route   GET api/posts
// @desc    Get all posts (Public)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find().sort({ date: -1 });
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
        const user = await User.findById(req.user.id).select('-password');
        
        const newPost = new Post({
            title: req.body.title,
            content: req.body.content,
            category: req.body.category,
            author: req.user.id,
            authorName: user.name
        });

        const post = await newPost.save();
        res.json(post);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
