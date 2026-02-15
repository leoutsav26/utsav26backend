const pool= require('../config/db');

function toParticipationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    studentId: row.user_id,
    name: row.name ?? undefined,
    leoId: row.leo_id ?? undefined,
    rollNo: row.roll_no ?? undefined,
    paymentType: row.payment_type ?? undefined,
    paymentStatus: row.payment_status ?? undefined,
    arrived: row.arrived ?? false,
    screenshot: row.screenshot ?? undefined,
    transactionId: row.transaction_id ?? undefined,
    registeredAt: row.registered_at ?? undefined,
  };
}

async function getByEvent(req, res) {
  try {
    const { eventId } = req.params;
    const r = await pool.query(
      `SELECT id, event_id, user_id, name, leo_id, roll_no, payment_type, payment_status, arrived, screenshot, transaction_id, registered_at
       FROM participations WHERE event_id = $1 ORDER BY registered_at ASC`,
      [eventId]
    );
    res.json(r.rows.map(toParticipationRow));
  } catch (err) {
    console.error('participations getByEvent', err);
    res.status(500).json({ message: err.message || 'Failed to fetch participations' });
  }
}

async function getAll(req, res) {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;
    if (role === 'admin') {
      const r = await pool.query(
        `SELECT id, event_id, user_id, name, leo_id, roll_no, payment_type, payment_status, arrived, screenshot, transaction_id, registered_at
         FROM participations ORDER BY registered_at DESC`
      );
      return res.json(r.rows.map(toParticipationRow));
    }
    const r = await pool.query(
      `SELECT id, event_id, user_id, name, leo_id, roll_no, payment_type, payment_status, arrived, screenshot, transaction_id, registered_at
       FROM participations WHERE user_id = $1 ORDER BY registered_at DESC`,
      [userId]
    );
    res.json(r.rows.map(toParticipationRow));
  } catch (err) {
    console.error('participations getAll', err);
    res.status(500).json({ message: err.message || 'Failed to fetch participations' });
  }
}

async function create(req, res) {
  try {
    const { eventId, userId, paymentType, transactionId, screenshot } = req.body || {};
    const uid = userId || req.user?.id;
    if (!eventId || !uid) return res.status(400).json({ message: 'eventId and userId required' });

    const userRow = await pool.query('SELECT id, name, leo_id, roll_no FROM users WHERE id = $1', [uid]);
    const user = userRow.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const eventRow = await pool.query('SELECT id FROM events WHERE id = $1', [eventId]);
    if (!eventRow.rows[0]) return res.status(404).json({ message: 'Event not found' });

    const existing = await pool.query('SELECT id FROM participations WHERE event_id = $1 AND user_id = $2', [eventId, uid]);
    if (existing.rows.length > 0) return res.status(409).json({ message: 'Already registered for this event' });

    const r = await pool.query(
      `INSERT INTO participations (event_id, user_id, name, leo_id, roll_no, payment_type, payment_status, screenshot, transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, event_id, user_id, name, leo_id, roll_no, payment_type, payment_status, arrived, screenshot, transaction_id, registered_at`,
      [
        eventId,
        uid,
        user.name ?? null,
        user.leo_id ?? null,
        user.roll_no ?? null,
        paymentType ?? 'pay_at_arrival',
        paymentType === 'pay_now' ? 'pending' : null,
        screenshot ?? null,
        transactionId ?? null,
      ]
    );
    res.status(201).json(toParticipationRow(r.rows[0]));
  } catch (err) {
    console.error('participations create', err);
    res.status(500).json({ message: err.message || 'Failed to create participation' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;
    const part = await pool.query('SELECT id, user_id FROM participations WHERE id = $1', [id]);
    if (!part.rows[0]) return res.status(404).json({ message: 'Participation not found' });
    if (role !== 'admin' && role !== 'coordinator' && part.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'You can only remove your own participation' });
    }
    await pool.query('DELETE FROM participations WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('participations remove', err);
    res.status(500).json({ message: err.message || 'Failed to delete participation' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { arrived, paymentStatus } = req.body || {};
    const userId = req.user?.id;
    const role = req.user?.role;
    const part = await pool.query('SELECT id, user_id FROM participations WHERE id = $1', [id]);
    if (!part.rows[0]) return res.status(404).json({ message: 'Participation not found' });
    if (role !== 'admin' && role !== 'coordinator' && part.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'You can only update your own participation' });
    }
    const updates = [];
    const values = [];
    let v = 1;
    if (arrived !== undefined) {
      updates.push(`arrived = $${v++}`);
      values.push(!!arrived);
    }
    if (paymentStatus !== undefined) {
      updates.push(`payment_status = $${v++}`);
      values.push(paymentStatus);
    }
    if (updates.length === 0) return res.status(400).json({ message: 'arrived or paymentStatus required' });
    values.push(id);
    const r = await pool.query(
      `UPDATE participations SET ${updates.join(', ')} WHERE id = $${v} RETURNING id, event_id, user_id, name, leo_id, roll_no, payment_type, payment_status, arrived, screenshot, transaction_id, registered_at`,
      values
    );
    const row = r.rows[0];
    if (!row) return res.status(404).json({ message: 'Participation not found' });
    res.json(toParticipationRow(row));
  } catch (err) {
    console.error('participations update', err);
    res.status(500).json({ message: err.message || 'Failed to update participation' });
  }
}

module.exports = { getByEvent, getAll, create, remove, update, toParticipationRow };
