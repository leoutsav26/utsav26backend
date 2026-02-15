const pool = require('../config/db');
const { toUserRow } = require('./authController');

function toCoordAssignmentRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    name: row.name ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
  };
}

async function getCoordinatorsByEvent(req, res) {
  try {
    const { eventId } = req.params;
    const r = await pool.query(
      `SELECT ec.id, ec.event_id, ec.user_id, u.name, u.phone, u.email
       FROM event_coordinators ec
       JOIN users u ON u.id = ec.user_id
       WHERE ec.event_id = $1`,
      [eventId]
    );
    res.json(r.rows.map(toCoordAssignmentRow));
  } catch (err) {
    console.error('coordinators getByEvent', err);
    res.status(500).json({ message: err.message || 'Failed to fetch coordinators' });
  }
}

async function getMyEventIds(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Authorization required' });
    const r = await pool.query('SELECT event_id FROM event_coordinators WHERE user_id = $1', [userId]);
    const eventIds = r.rows.map((row) => row.event_id);
    res.json({ eventIds });
  } catch (err) {
    console.error('coordinators getMyEventIds', err);
    res.status(500).json({ message: err.message || 'Failed to fetch my events' });
  }
}

async function join(req, res) {
  try {
    const { eventId } = req.body || {};
    const userId = req.user?.id;
    if (!eventId || !userId) return res.status(400).json({ message: 'eventId required' });

    const count = await pool.query('SELECT COUNT(*) AS c FROM event_coordinators WHERE user_id = $1', [userId]);
    if (Number(count.rows[0]?.c || 0) >= 2) {
      return res.status(400).json({ message: 'You cannot coordinate more than 2 events. Please exit one event first to join another.' });
    }

    const eventRow = await pool.query('SELECT id FROM events WHERE id = $1', [eventId]);
    if (!eventRow.rows[0]) return res.status(404).json({ message: 'Event not found' });

    await pool.query('INSERT INTO event_coordinators (event_id, user_id) VALUES ($1, $2) ON CONFLICT (event_id, user_id) DO NOTHING', [eventId, userId]);
    const r = await pool.query('SELECT id, event_id, user_id FROM event_coordinators WHERE event_id = $1 AND user_id = $2', [eventId, userId]);
    const row = r.rows[0];
    if (!row) return res.status(201).json({ eventId, userId });
    res.status(201).json({ id: row.id, eventId: row.event_id, userId: row.user_id });
  } catch (err) {
    console.error('coordinators join', err);
    res.status(500).json({ message: err.message || 'Failed to join event' });
  }
}

async function leaveById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const r = await pool.query('DELETE FROM event_coordinators WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (r.rowCount === 0) return res.status(404).json({ message: 'Assignment not found' });
    res.status(204).send();
  } catch (err) {
    console.error('coordinators leaveById', err);
    res.status(500).json({ message: err.message || 'Failed to leave event' });
  }
}

async function leaveByEventId(req, res) {
  try {
    const { eventId } = req.query;
    const userId = req.user?.id;
    if (!eventId) return res.status(400).json({ message: 'eventId required' });
    const r = await pool.query('DELETE FROM event_coordinators WHERE event_id = $1 AND user_id = $2 RETURNING id', [eventId, userId]);
    if (r.rowCount === 0) return res.status(404).json({ message: 'Assignment not found' });
    res.status(204).send();
  } catch (err) {
    console.error('coordinators leaveByEventId', err);
    res.status(500).json({ message: err.message || 'Failed to leave event' });
  }
}

async function listCoordinators(req, res) {
  try {
    const r = await pool.query(
      "SELECT id, email, role, name, leo_id, roll_no, phone, status, created_at FROM users WHERE role = 'coordinator' ORDER BY created_at DESC"
    );
    res.json(r.rows.map(toUserRow));
  } catch (err) {
    console.error('coordinators list', err);
    res.status(500).json({ message: err.message || 'Failed to fetch coordinators' });
  }
}

async function updateCoordinatorStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'status must be approved or rejected' });
    const r = await pool.query(
      "UPDATE users SET status = $1 WHERE id = $2 AND role = 'coordinator' RETURNING id, email, role, name, leo_id, roll_no, phone, status, created_at",
      [status, id]
    );
    const row = r.rows[0];
    if (!row) return res.status(404).json({ message: 'Coordinator not found' });
    res.json(toUserRow(row));
  } catch (err) {
    console.error('coordinators updateStatus', err);
    res.status(500).json({ message: err.message || 'Failed to update status' });
  }
}

module.exports = {
  getCoordinatorsByEvent,
  getMyEventIds,
  join,
  leaveById,
  leaveByEventId,
  listCoordinators,
  updateCoordinatorStatus,
};
