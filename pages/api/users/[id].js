const supabase = require('../../../config/supabase');
const verifyAuth = require('../../../middleware/authHelper');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    const userSession = verifyAuth(req, res);
    if (!userSession) return; // verifyAuth handles writing 401 response

    try {
      // Verify Super Admin / Executive permissions
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

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ msg: 'User removed' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
