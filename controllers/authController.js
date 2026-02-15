const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { generateLeoId } = require('../utils/generateLeoId');

function toUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name ?? undefined,
    leoId: row.leo_id ?? undefined,
    rollNo: row.roll_no ?? undefined,
    phone: row.phone ?? undefined,
    status: row.status ?? undefined,
    createdAt: row.created_at,
  };
}

async function login(req, res) {
  try {
    const { role, email, password, profile } = req.body || {};
    const em = (email || '').trim().toLowerCase();
    if (!em) return res.status(400).json({ message: 'Email required' });

    if (role === 'student') {
      const r = await pool.query(
        'SELECT id, email, password_hash, role, name, leo_id, roll_no, phone, status, created_at FROM users WHERE LOWER(email) = $1 AND role = $2',
        [em, 'student']
      );
      const user = r.rows[0];
      if (!user) {
        return res.json({ needsProfile: true });
      }
      const u = toUserRow(user);
      const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: u });
    }

    if (role === 'coordinator' || role === 'admin') {
      const r = await pool.query(
        'SELECT id, email, password_hash, role, name, leo_id, roll_no, phone, status, created_at FROM users WHERE LOWER(email) = $1 AND role = $2',
        [em, role]
      );
      const user = r.rows[0];
      if (!user) {
        return res.status(404).json({ message: role === 'coordinator' ? 'No coordinator found with this email.' : 'No admin found with this email.' });
      }
      if (!password) return res.status(400).json({ message: 'Password required' });
      const valid = await bcrypt.compare(password, user.password_hash || '');
      if (!valid) return res.status(401).json({ message: 'Wrong password.' });
      if (role === 'coordinator' && user.status !== 'approved') {
        return res.status(403).json({ message: 'Your account is not approved yet.' });
      }
      const u = toUserRow(user);
      const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: u });
    }

    return res.status(400).json({ message: 'Invalid role' });
  } catch (err) {
    console.error('auth login', err);
    res.status(500).json({ message: err.message || 'Login failed' });
  }
}

async function register(req, res) {
  try {
    const { email, name, rollNo, phone } = req.body || {};
    const em = (email || '').trim().toLowerCase();
    if (!em || !name || rollNo === undefined || rollNo === null || !phone) {
      return res.status(400).json({ message: 'email, name, rollNo, phone required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1 AND role = $2', [em, 'student']);
    if (existing.rows.length > 0) {
      const user = toUserRow((await pool.query('SELECT id, email, role, name, leo_id, roll_no, phone, status, created_at FROM users WHERE id = $1', [existing.rows[0].id])).rows[0]);
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user });
    }

    let leoId = generateLeoId();
    let exists = await pool.query('SELECT id FROM users WHERE leo_id = $1', [leoId]);
    while (exists.rows.length > 0) {
      leoId = generateLeoId();
      exists = await pool.query('SELECT id FROM users WHERE leo_id = $1', [leoId]);
    }

    const ins = await pool.query(
      `INSERT INTO users (email, role, name, leo_id, roll_no, phone, status) VALUES ($1, 'student', $2, $3, $4, $5, 'approved') RETURNING id, email, role, name, leo_id, roll_no, phone, status, created_at`,
      [em, (name || '').trim(), leoId, String(rollNo).trim(), String(phone).trim()]
    );
    const user = toUserRow(ins.rows[0]);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('auth register', err);
    res.status(500).json({ message: err.message || 'Registration failed' });
  }
}

async function me(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Authorization required' });
    const r = await pool.query(
      'SELECT id, email, role, name, leo_id, roll_no, phone, status, created_at FROM users WHERE id = $1',
      [userId]
    );
    const user = r.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: toUserRow(user) });
  } catch (err) {
    console.error('auth me', err);
    res.status(500).json({ message: err.message || 'Failed to get user' });
  }
}

module.exports = { login, register, me, toUserRow };
