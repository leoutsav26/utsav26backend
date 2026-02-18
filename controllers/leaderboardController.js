const pool = require('../config/db');
const { handleDbError } = require('../utils/dbErrors');

/* ================= FORMAT RESPONSE ================= */

function toLeaderboardRow(row) {
  if (!row) return null;

  return {
    participantId: row.participant_id,
    name: row.name ?? undefined,
    leoId: row.leo_id ?? undefined,
    rollNo: row.roll_no ?? undefined,
    teamNo: row.team_no ?? undefined,
    score: Number(row.score) ?? 0,
  };
}

/* ================= GET LEADERBOARD ================= */

async function getLeaderboard(req, res) {
  try {
    const { eventId } = req.params;

    const r = await pool.query(
      `SELECT l.participant_id,
              l.score,
              l.team_no,
              u.name,
              u.leo_id,
              u.roll_no
       FROM leaderboard l
       JOIN users u ON u.id = l.participant_id
       WHERE l.event_id = $1
       ORDER BY l.score DESC`,
      [eventId]
    );

    res.json(r.rows.map(toLeaderboardRow));

  } catch (err) {
    if (handleDbError(err, res, 'leaderboard get')) return;
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
}

/* ================= UPSERT SCORE WITH TEAM NO ================= */

async function upsertScore(req, res) {
  try {
    const { eventId } = req.params;
    const { participantId, score, teamNo } = req.body || {};
    const enteredBy = req.user?.id || null;

    if (!participantId || score === undefined) {
      return res.status(400).json({
        message: 'participantId and score required'
      });
    }

    const numScore = Number(score);
    if (isNaN(numScore)) {
      return res.status(400).json({
        message: 'score must be a number'
      });
    }

    /* ---------- UPSERT INTO leaderboard ---------- */

    await pool.query(
      `INSERT INTO leaderboard
         (event_id, participant_id, score, team_no, entered_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_id, participant_id)
       DO UPDATE SET
         score = EXCLUDED.score,
         team_no = EXCLUDED.team_no,
         entered_by = EXCLUDED.entered_by`,
      [
        eventId,
        participantId,
        numScore,
        teamNo ?? null,
        enteredBy
      ]
    );

    /* ---------- RETURN UPDATED LEADERBOARD ---------- */

    const r = await pool.query(
      `SELECT l.participant_id,
              l.score,
              l.team_no,
              u.name,
              u.leo_id,
              u.roll_no
       FROM leaderboard l
       JOIN users u ON u.id = l.participant_id
       WHERE l.event_id = $1
       ORDER BY l.score DESC`,
      [eventId]
    );

    res.json(r.rows.map(toLeaderboardRow));

  } catch (err) {
    if (handleDbError(err, res, 'leaderboard upsert')) return;
    console.error(err);
    res.status(500).json({ message: 'Failed to update leaderboard' });
  }
}

/* ================= GET WINNERS ================= */

async function getWinners(req, res) {
  try {
    const { eventId } = req.params;

    const r = await pool.query(
      `SELECT participant_id
       FROM winners
       WHERE event_id = $1
       ORDER BY rank ASC`,
      [eventId]
    );

    res.json(r.rows.map(row => row.participant_id));

  } catch (err) {
    if (handleDbError(err, res, 'leaderboard getWinners')) return;
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch winners' });
  }
}

/* ================= COMPLETE EVENT ================= */

async function completeEvent(req, res) {
  try {
    const { eventId } = req.params;
    const { winnerParticipantIds } = req.body || {};
    const ids = Array.isArray(winnerParticipantIds)
      ? winnerParticipantIds
      : [];

    /* Mark event completed */
    await pool.query(
      `UPDATE events SET status = 'completed' WHERE id = $1`,
      [eventId]
    );

    /* Replace winners */
    await pool.query(
      `DELETE FROM winners WHERE event_id = $1`,
      [eventId]
    );

    for (let i = 0; i < ids.length; i++) {
      await pool.query(
        `INSERT INTO winners (event_id, participant_id, rank)
         VALUES ($1, $2, $3)`,
        [eventId, ids[i], i + 1]
      );
    }

    res.json({ message: 'Event completed successfully' });

  } catch (err) {
    if (handleDbError(err, res, 'leaderboard completeEvent')) return;
    console.error(err);
    res.status(500).json({ message: 'Failed to complete event' });
  }
}

/* ================= SCORE ENTERED BY ================= */

async function getScoreEnteredBy(req, res) {
  try {
    const { eventId } = req.params;

    const r = await pool.query(
      `SELECT DISTINCT u.id, u.name
       FROM leaderboard l
       JOIN users u ON u.id = l.entered_by
       WHERE l.event_id = $1
         AND l.entered_by IS NOT NULL
       ORDER BY u.name`,
      [eventId]
    );

    res.json(
      r.rows.map(row => ({
        id: row.id,
        name: row.name || 'Unknown'
      }))
    );

  } catch (err) {
    if (handleDbError(err, res, 'leaderboard getScoreEnteredBy')) return;
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch score entered by' });
  }
}

module.exports = {
  getLeaderboard,
  upsertScore,
  getWinners,
  completeEvent,
  getScoreEnteredBy,
};
