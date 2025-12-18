require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/'))); // Serve static files from root

// Database Connection (Supabase is handled in routes via config/supabase.js) - legacy
// MongoDB connection removed.

// Note: Routes here are for local Node.js testing, but production is static.
// We can keep them if you want a local hybrid environment, but for pure static hosting cleanup 
// they are not used. 
// However, 'package.json' still has 'express'. 
// If the user wants to REMOVE the backend entirely, we should remove 'express' too.
// The user asked to remove "Mongo DB".
// I will keep the basic express server for "npm start" to serve static files locally.
// But I will comment out the dynamic routes to avoid confusion.

// Serve Frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback for other routes (optional, mainly for SPA)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
