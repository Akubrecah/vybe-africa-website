const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../../../config/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  try {
    // Query profile metadata from public.users
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

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '360000', 10) },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          role: user.role,
          name: user.name,
          designation: user.designation
        });
      }
    );
  } catch (err) {
    console.error('LOGIN API ERROR:', err);
    res.status(500).send('Server error');
  }
}
