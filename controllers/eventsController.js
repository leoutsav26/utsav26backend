const pool = require('../config/db');   // ✅ FIXED (no curly braces)

function toEventRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    date: row.date,
    time: row.time,
    venue: row.venue,
    category: row.category,
    status: row.status,
    cost: row.cost ?? 0,
    rules: row.rules ?? undefined,
    teamSize: row.team_size ?? undefined,
    createdAt: row.created_at,
  };
}

async function getAll(req, res) {
  try {
    const r = await pool.query(
      'SELECT id, title, description, date, time, venue, category, status, cost, rules, team_size, created_at FROM events ORDER BY created_at DESC'
    );
    res.json(r.rows.map(toEventRow));
  } catch (err) {
    console.error('events getAll', err);
    res.status(500).json({ message: err.message || 'Failed to fetch events' });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const r = await pool.query(
      'SELECT id, title, description, date, time, venue, category, status, cost, rules, team_size, created_at FROM events WHERE id = $1',
      [id]
    );
    const row = r.rows[0];
    if (!row) return res.status(404).json({ message: 'Event not found' });
    res.json(toEventRow(row));
  } catch (err) {
    console.error('events getById', err);
    res.status(500).json({ message: err.message || 'Failed to fetch event' });
  }
}

async function create(req, res) {
  try {
    const { title, description, date, time, venue, category, status, cost, rules, teamSize } = req.body || {};
    if (!title) return res.status(400).json({ message: 'title required' });

    const r = await pool.query(
      `INSERT INTO events (title, description, date, time, venue, category, status, cost, rules, team_size)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, title, description, date, time, venue, category, status, cost, rules, team_size, created_at`,
      [
        title,
        description ?? null,
        date ?? null,
        time ?? null,
        venue ?? null,
        category ?? null,
        status ?? 'open',
        Number(cost) || 0,
        rules ?? null,
        teamSize ?? null
      ]
    );

    res.status(201).json(toEventRow(r.rows[0]));
  } catch (err) {
    console.error('events create', err);
    res.status(500).json({ message: err.message || 'Failed to create event' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { title, description, date, time, venue, category, status, cost, rules, teamSize } = req.body || {};
    if (!title) return res.status(400).json({ message: 'title required' });

    const r = await pool.query(
      `UPDATE events
       SET title=$1, description=$2, date=$3, time=$4, venue=$5,
           category=$6, status=$7, cost=$8, rules=$9, team_size=$10
       WHERE id=$11
       RETURNING id, title, description, date, time, venue,
                 category, status, cost, rules, team_size, created_at`,
      [
        title,
        description ?? null,
        date ?? null,
        time ?? null,
        venue ?? null,
        category ?? null,
        status ?? 'open',
        Number(cost) || 0,
        rules ?? null,
        teamSize ?? null,
        id
      ]
    );

    const row = r.rows[0];
    if (!row) return res.status(404).json({ message: 'Event not found' });

    res.json(toEventRow(row));
  } catch (err) {
    console.error('events update', err);
    res.status(500).json({ message: err.message || 'Failed to update event' });
  }
}

async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const allowed = ['open', 'ongoing', 'closed', 'completed'];
    if (!allowed.includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const r = await pool.query(
      'UPDATE events SET status=$1 WHERE id=$2 RETURNING *',
      [status, id]
    );

    const row = r.rows[0];
    if (!row) return res.status(404).json({ message: 'Event not found' });

    res.json(toEventRow(row));
  } catch (err) {
    console.error('events updateStatus', err);
    res.status(500).json({ message: err.message || 'Failed to update status' });
  }
}

async function getPasses(req, res) {
  try {
    const { eventId } = req.params;
    const eventRow = await pool.query('SELECT id FROM events WHERE id=$1', [eventId]);

    if (!eventRow.rows[0])
      return res.status(404).json({ message: 'Event not found' });

    res.json([]);
  } catch (err) {
    console.error('events getPasses', err);
    res.status(500).json({ message: err.message || 'Failed to fetch passes' });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  updateStatus,
  getPasses
};
