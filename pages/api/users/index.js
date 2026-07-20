const supabase = require('../../../config/supabase');
const verifyAuth = require('../../../middleware/authHelper');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  const userSession = verifyAuth(req, res);
  if (!userSession) return; // verifyAuth handles writing 401 response

  if (req.method === 'GET') {
    // ── 1. GET /api/users: Get all users ──
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, email, role, designation');

      if (error) throw error;
      res.status(200).json(users);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  } else if (req.method === 'POST') {
    // ── 2. POST /api/users: Create a new user (Super Admin / Executive Only) ──
    try {
      // Verify Admin permissions
      const { data: reqUser, error: reqUserErr } = await supabase
        .from('users')
        .select('role, designation')
        .eq('id', userSession.id)
        .single();

      if (reqUserErr || !reqUser) {
        return res.status(404).json({ msg: 'Requesting user profile not found' });
      }

      if (reqUser.role !== 'superadmin' && !reqUser.designation.toLowerCase().includes('executive')) {
        return res.status(403).json({ msg: 'Access Denied: Admins only' });
      }

      const { name, email, password, role, designation } = req.body;

      if (!name || !email || !password || !role) {
        return res.status(400).json({ msg: 'Please provide all required fields (name, email, password, role)' });
      }

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
      res.status(201).json({ msg: 'User created successfully', user: newUser[0] });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error: ' + err.message);
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
