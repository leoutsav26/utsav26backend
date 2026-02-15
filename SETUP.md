# LEO Club Event Portal – Backend setup

## Prerequisites

- Node.js 18+
- PostgreSQL (local or hosted; e.g. Railway)

## 1. Database

Create tables by running the schema once:

```bash
psql "$DATABASE_URL" -f schema.sql
```

If you don’t have `psql` in PATH, use the connection string in your DB client and run the contents of `schema.sql`.

## 2. Environment

```bash
cp .env.example .env
```

Edit `.env` and set:

- `DATABASE_URL` – PostgreSQL connection string (with SSL for hosted DBs).
- `JWT_SECRET` – Secret for signing JWTs (use a strong value in production).
- `PORT` – Server port (default 5000).

Example (do not commit real credentials):

```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret
PORT=5000
```

## 3. Install and run

```bash
npm install
npm start
```

For development with auto-reload:

```bash
npm run dev
```

API base URL: `http://localhost:5000` (or your `PORT`). Frontend should set `VITE_API_URL` to this (e.g. `http://localhost:5000`). All API paths are relative to that base; send the JWT in the header: `Authorization: Bearer <token>`.

## 4. Health check

- `GET /health` → `{ "ok": true }`

## Notes

- Do not commit `.env`; keep real credentials and secrets out of the repo.
- For production, use a strong `JWT_SECRET` and ensure the DB uses SSL (the app enables SSL with `rejectUnauthorized: false` when not localhost).
