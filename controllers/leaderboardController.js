const pool = require('../config/db');

function toLeaderboardRow(row) {
  if (!row) return null;
  return {
    participantId: row.participant_id,
    name: row.name ?? undefined,
    leoId: row.leo_id ?? undefined,
    rollNo: row.roll_no ?? undefined,
    score: Number(row.score) ?? 0,
  };
}

async function getLeaderboard(req, res) {
  try {
    const { eventId } = req.params;
    const r = await pool.query(
      `SELECT l.participant_id, l.score, u.name, u.leo_id, u.roll_no
       FROM leaderboard l
       JOIN users u ON u.id = l.participant_id
       WHERE l.event_id = $1
       ORDER BY l.score DESC`,
      [eventId]
    );
    res.json(r.rows.map(toLeaderboardRow));
  } catch (err) {
    console.error('leaderboard get', err);
    res.status(500).json({ message: err.message || 'Failed to fetch leaderboard' });
  }
}

async function upsertScore(req, res) {
  try {
    const { eventId } = req.params;
    const { participantId, score } = req.body || {};
    if (!participantId || score === undefined) return res.status(400).json({ message: 'participantId and score required' });
    const numScore = Number(score);
    if (isNaN(numScore)) return res.status(400).json({ message: 'score must be a number' });

    await pool.query(
      `INSERT INTO leaderboard (event_id, participant_id, score) VALUES ($1, $2, $3)
       ON CONFLICT (event_id, participant_id) DO UPDATE SET score = $3`,
      [eventId, participantId, numScore]
    );
    const r = await pool.query(
      `SELECT l.participant_id, l.score, u.name, u.leo_id, u.roll_no FROM leaderboard l JOIN users u ON u.id = l.participant_id WHERE l.event_id = $1 ORDER BY l.score DESC`,
      [eventId]
    );
    res.json(r.rows.map(toLeaderboardRow));
  } catch (err) {
    console.error('leaderboard upsert', err);
    res.status(500).json({ message: err.message || 'Failed to update leaderboard' });
  }
}

async function getWinners(req, res) {
  try {
    const { eventId } = req.params;
    const r = await pool.query(
      'SELECT participant_id FROM winners WHERE event_id = $1 ORDER BY rank ASC',
      [eventId]
    );
    res.json(r.rows.map((row) => row.participant_id));
  } catch (err) {
    console.error('leaderboard getWinners', err);
    res.status(500).json({ message: err.message || 'Failed to fetch winners' });
  }
}

async function completeEvent(req, res) {
  try {
    const { eventId } = req.params;
    const { winnerParticipantIds } = req.body || {};
    const ids = Array.isArray(winnerParticipantIds) ? winnerParticipantIds : [];

    await pool.query('UPDATE events SET status = $1 WHERE id = $2', ['completed', eventId]);
    await pool.query('DELETE FROM winners WHERE event_id = $1', [eventId]);
    for (let i = 0; i < ids.length; i++) {
      await pool.query('INSERT INTO winners (event_id, participant_id, rank) VALUES ($1, $2, $3)', [eventId, ids[i], i + 1]);
    }
    const r = await pool.query(
      'SELECT id, title, description, date, time, venue, category, status, cost, rules, team_size, created_at FROM events WHERE id = $1',
      [eventId]
    );
    const row = r.rows[0];
    if (!row) return res.status(404).json({ message: 'Event not found' });
    res.json({
      id: row.id,
      title: row.title,
      description: row.description,
      date: row.date,
      time: row.time,
      venue: row.venue,
      category: row.category,
      status: row.status,
      cost: row.cost,
      rules: row.rules,
      teamSize: row.team_size,
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error('leaderboard completeEvent', err);
    res.status(500).json({ message: err.message || 'Failed to complete event' });
  }
}

module.exports = { getLeaderboard, upsertScore, getWinners, completeEvent };
