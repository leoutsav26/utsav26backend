const pool = require('../config/db');
const { handleDbError } = require('../utils/dbErrors');

/** Record a visit (no auth). Called once per session from frontend. */
async function recordVisit(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    await pool.query(
      `INSERT INTO site_visits (visit_date, count) VALUES ($1, 1)
       ON CONFLICT (visit_date) DO UPDATE SET count = site_visits.count + 1`,
      [today]
    );
    res.status(204).end();
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ message: 'Site visits table not created. Run: CREATE TABLE IF NOT EXISTS site_visits (visit_date DATE PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);' });
    }
    if (handleDbError(err, res, 'analytics recordVisit')) return;
    console.error('analytics recordVisit', err.message);
    res.status(500).json({ message: err.message || 'Failed to record visit' });
  }
}

/** Get total and daily visit counts (admin only). */
async function getVisits(req, res) {
  try {
    const r = await pool.query(
      'SELECT visit_date, count FROM site_visits ORDER BY visit_date DESC LIMIT 365'
    );
    const byDate = r.rows.map((row) => ({
      date: row.visit_date,
      count: Number(row.count) || 0,
    }));
    const total = byDate.reduce((sum, d) => sum + d.count, 0);
    res.json({ total, byDate });
  } catch (err) {
    if (err.code === '42P01') {
      return res.json({ total: 0, byDate: [] });
    }
    if (handleDbError(err, res, 'analytics getVisits')) return;
    console.error('analytics getVisits', err.message);
    res.status(500).json({ message: err.message || 'Failed to fetch visits' });
  }
}

module.exports = { recordVisit, getVisits };
