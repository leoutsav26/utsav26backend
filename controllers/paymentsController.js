const pool = require('../config/db');

async function create(req, res) {
  try {
    const { participationId, transactionId, screenshot } = req.body || {};
    if (!participationId) return res.status(400).json({ message: 'participationId required' });

    const part = await pool.query('SELECT id, event_id FROM participations WHERE id = $1', [participationId]);
    if (!part.rows[0]) return res.status(404).json({ message: 'Participation not found' });

    const eventRow = await pool.query('SELECT cost FROM events WHERE id = $1', [part.rows[0].event_id]);
    const amount = eventRow.rows[0]?.cost ?? 0;

    await pool.query(
      'INSERT INTO payments (participation_id, transaction_id, screenshot, amount) VALUES ($1, $2, $3, $4)',
      [participationId, transactionId ?? null, screenshot ?? null, amount]
    );
    await pool.query("UPDATE participations SET payment_status = 'paid' WHERE id = $1", [participationId]);

    res.status(201).json({ message: 'Payment recorded' });
  } catch (err) {
    console.error('payments create', err);
    res.status(500).json({ message: err.message || 'Failed to create payment' });
  }
}

async function getSummary(req, res) {
  try {
    const r = await pool.query(
      `SELECT p.event_id, e.title, e.cost, COUNT(p.id) AS cnt
       FROM participations p
       JOIN events e ON e.id = p.event_id
       GROUP BY p.event_id, e.title, e.cost`
    );
    let total = 0;
    const byEvent = {};
    for (const row of r.rows) {
      const amount = (row.cnt || 0) * (row.cost ?? 0);
      total += amount;
      byEvent[row.event_id] = { count: Number(row.cnt), amount, title: row.title };
    }
    res.json({ total, byEvent });
  } catch (err) {
    console.error('payments getSummary', err);
    res.status(500).json({ message: err.message || 'Failed to fetch summary' });
  }
}

module.exports = { create, getSummary };
