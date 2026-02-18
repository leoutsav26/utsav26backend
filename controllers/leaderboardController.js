const pool = require('../config/db');
const { handleDbError } = require('../utils/dbErrors');

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
    if (handleDbError(err, res, 'leaderboard get')) return;
    console.error('leaderboard get', err.message);
    res.status(500).json({ message: err.message || 'Failed to fetch leaderboard' });
  }
}

async function upsertScore(req, res) {
  try {
    const { eventId } = req.params;
    const { participantId, score } = req.body || {};
    const enteredBy = req.user?.id || null;
    if (!participantId || score === undefined) return res.status(400).json({ message: 'participantId and score required' });
    const numScore = Number(score);
    if (isNaN(numScore)) return res.status(400).json({ message: 'score must be a number' });

    try {
      await pool.query(
        `INSERT INTO leaderboard (event_id, participant_id, score, entered_by) VALUES ($1, $2, $3, $4)
         ON CONFLICT (event_id, participant_id) DO UPDATE SET score = $3, entered_by = $4`,
        [eventId, participantId, numScore, enteredBy]
      );
    } catch (e) {
      if (e.code === '42703') {
        await pool.query(
          `INSERT INTO leaderboard (event_id, participant_id, score) VALUES ($1, $2, $3)
           ON CONFLICT (event_id, participant_id) DO UPDATE SET score = $3`,
          [eventId, participantId, numScore]
        );
      } else throw e;
    }
    const r = await pool.query(
      `SELECT l.participant_id, l.score, u.name, u.leo_id, u.roll_no FROM leaderboard l JOIN users u ON u.id = l.participant_id WHERE l.event_id = $1 ORDER BY l.score DESC`,
      [eventId]
    );
    res.json(r.rows.map(toLeaderboardRow));
  } catch (err) {
    if (handleDbError(err, res, 'leaderboard upsert')) return;
    console.error('leaderboard upsert', err.message);
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
    if (handleDbError(err, res, 'leaderboard getWinners')) return;
    console.error('leaderboard getWinners', err.message);
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
    if (handleDbError(err, res, 'leaderboard completeEvent')) return;
    console.error('leaderboard completeEvent', err.message);
    res.status(500).json({ message: err.message || 'Failed to complete event' });
  }
}

async function getScoreEnteredBy(req, res) {
  try {
    const { eventId } = req.params;
    let r;
    try {
      r = await pool.query(
        `SELECT DISTINCT u.id, u.name FROM leaderboard l
         JOIN users u ON u.id = l.entered_by
         WHERE l.event_id = $1 AND l.entered_by IS NOT NULL
         ORDER BY u.name`,
        [eventId]
      );
    } catch (e) {
      if (e.code === '42703') {
        console.log('Column entered_by does not exist yet. Run: ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS entered_by UUID REFERENCES users(id) ON DELETE SET NULL;');
        return res.json([]);
      }
      throw e;
    }
    console.log(`Found ${r.rows.length} coordinators who entered scores for event ${eventId}`);
    res.json(r.rows.map((row) => ({ id: row.id, name: row.name || 'Unknown' })));
  } catch (err) {
    if (handleDbError(err, res, 'leaderboard getScoreEnteredBy')) return;
    console.error('leaderboard getScoreEnteredBy', err.message);
    res.status(500).json({ message: err.message || 'Failed to fetch score entered by' });
  }
}

module.exports = { getLeaderboard, upsertScore, getWinners, completeEvent, getScoreEnteredBy }; this is the leaderboard controller and my coordinator dashboard is import React, { useMemo, useState, useEffect } from "react";
