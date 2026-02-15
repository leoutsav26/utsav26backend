require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const eventsRoutes = require('./routes/eventsRoutes');
const participationsRoutes = require('./routes/participationsRoutes');
const paymentsRoutes = require('./routes/paymentsRoutes');
const coordinatorsRoutes = require('./routes/coordinatorsRoutes');
const usersRoutes = require('./routes/usersRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

/* ----------------------------
   MIDDLEWARE
-----------------------------*/
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

/* ----------------------------
   ROOT ROUTE
-----------------------------*/
app.get('/', (req, res) => {
  res.json({ message: 'LEO Club Event Portal Backend Running 🚀' });
});

/* ----------------------------
   HEALTH CHECK
-----------------------------*/
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

/* ----------------------------
   DATABASE TEST ROUTE
-----------------------------*/
app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      success: true,
      databaseTime: result.rows[0]
    });
  } catch (err) {
    console.error('DB TEST ERROR:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* ----------------------------
   DATABASE INFO
-----------------------------*/
app.get('/db-info', async (req, res) => {
  try {
    const result = await pool.query('SELECT current_database()');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ----------------------------
   API ROUTES
-----------------------------*/
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/participations', participationsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/event-coordinators', coordinatorsRoutes);
app.use('/api/users', usersRoutes);

/* ----------------------------
   404 HANDLER
-----------------------------*/
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

/* ----------------------------
   GLOBAL ERROR HANDLER
-----------------------------*/
app.use((err, req, res, next) => {
  console.error('🔥 GLOBAL ERROR:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

/* ----------------------------
   START SERVER
-----------------------------*/
app.listen(PORT, async () => {
  console.log(`🚀 LEO Club Event Portal API listening on port ${PORT}`);

  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
});
