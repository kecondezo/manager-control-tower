import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || './database.sqlite';

app.use(cors());
app.use(express.json());

let db;

async function initDb() {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT,
      color TEXT,
      active INTEGER
    );

    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT,
      avatar TEXT,
      teamIds TEXT
    );

    CREATE TABLE IF NOT EXISTS initiatives (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      teamId TEXT,
      ownerId TEXT,
      priority TEXT,
      status TEXT,
      progress INTEGER,
      startDate TEXT,
      endDate TEXT,
      tags TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      archived INTEGER
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      initiativeId TEXT,
      title TEXT,
      description TEXT,
      ownerId TEXT,
      priority TEXT,
      status TEXT,
      startDate TEXT,
      endDate TEXT,
      archived INTEGER,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      activityId TEXT,
      createdAt TEXT,
      authorId TEXT,
      message TEXT
    );

    CREATE TABLE IF NOT EXISTS platforms (
      id TEXT PRIMARY KEY,
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS capacity_assignments (
      id TEXT PRIMARY KEY,
      personId TEXT,
      initiativeId TEXT,
      year INTEGER,
      month INTEGER,
      percentage INTEGER,
      updatedAt TEXT
    );
  `);

  // Migration: Add teamIds to people table if it doesn't exist
  const tableInfo = await db.all("PRAGMA table_info(people)");
  const hasTeamIds = tableInfo.some(column => column.name === 'teamIds');
  if (!hasTeamIds) {
    await db.exec('ALTER TABLE people ADD COLUMN teamIds TEXT');
    console.log('Migration: Added teamIds column to people table');
  }

  // Migration: Add platformId to initiatives table if it doesn't exist
  const initTableInfo = await db.all("PRAGMA table_info(initiatives)");
  const hasPlatformId = initTableInfo.some(column => column.name === 'platformId');
  if (!hasPlatformId) {
    await db.exec('ALTER TABLE initiatives ADD COLUMN platformId TEXT');
    console.log('Migration: Added platformId column to initiatives table');
  }

  // Seed initial data if empty (optional, based on previous INITIAL_DB)
  const teamCount = await db.get('SELECT count(*) as count FROM teams');
  if (teamCount.count === 0) {
    await db.exec(`
      INSERT INTO teams (id, name, color, active) VALUES
      ('team_ops', 'Ops', '#2563EB', 1),
      ('team_tech', 'Technology', '#7C3AED', 1),
      ('team_personal', 'Personal', '#10B981', 1);

      INSERT INTO people (id, name) VALUES
      ('me', 'Manager'),
      ('alice', 'Alice'),
      ('bob', 'Bob');
    `);
  }
}

initDb().then(() => {
  console.log(`Database connected at ${DB_PATH}`);
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database', err);
});

// --- Routes ---

// Teams
app.get('/api/teams', async (req, res) => {
  const teams = await db.all('SELECT * FROM teams');
  res.json(teams.map(t => ({ ...t, active: !!t.active })));
});

app.post('/api/teams', async (req, res) => {
  const { id, name, color, active } = req.body;
  await db.run(
    'INSERT OR REPLACE INTO teams (id, name, color, active) VALUES (?, ?, ?, ?)',
    [id, name, color, active ? 1 : 0]
  );
  res.json({ success: true });
});

// People
app.get('/api/people', async (req, res) => {
  const people = await db.all('SELECT * FROM people');
  res.json(people.map(p => ({
    ...p,
    teamIds: JSON.parse(p.teamIds || '[]')
  })));
});

app.post('/api/people', async (req, res) => {
  const { id, name, avatar, teamIds } = req.body;
  await db.run(
    'INSERT OR REPLACE INTO people (id, name, avatar, teamIds) VALUES (?, ?, ?, ?)',
    [id, name, avatar, JSON.stringify(teamIds || [])]
  );
  res.json({ success: true });
});

app.delete('/api/people/:id', async (req, res) => {
  await db.run('DELETE FROM people WHERE id = ?', req.params.id);
  res.json({ success: true });
});

// Platforms
app.get('/api/platforms', async (req, res) => {
  const platforms = await db.all('SELECT * FROM platforms');
  res.json(platforms);
});

app.post('/api/platforms', async (req, res) => {
  const { id, name } = req.body;
  await db.run(
    'INSERT OR REPLACE INTO platforms (id, name) VALUES (?, ?)',
    [id, name]
  );
  res.json({ success: true });
});

app.delete('/api/platforms/:id', async (req, res) => {
  await db.run('DELETE FROM platforms WHERE id = ?', req.params.id);
  res.json({ success: true });
});

// Initiatives
app.get('/api/initiatives', async (req, res) => {
  const initiatives = await db.all('SELECT * FROM initiatives');
  res.json(initiatives.map(i => ({
    ...i,
    tags: JSON.parse(i.tags || '[]'),
    archived: !!i.archived
  })));
});

app.get('/api/initiatives/:id', async (req, res) => {
  const initiative = await db.get('SELECT * FROM initiatives WHERE id = ?', req.params.id);
  if (initiative) {
    initiative.tags = JSON.parse(initiative.tags || '[]');
    initiative.archived = !!initiative.archived;
    res.json(initiative);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.post('/api/initiatives', async (req, res) => {
  const i = req.body;
  await db.run(
    `INSERT OR REPLACE INTO initiatives 
    (id, title, description, teamId, ownerId, platformId, priority, status, progress, startDate, endDate, tags, createdAt, updatedAt, archived)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [i.id, i.title, i.description, i.teamId, i.ownerId, i.platformId, i.priority, i.status, i.progress, i.startDate, i.endDate, JSON.stringify(i.tags), i.createdAt, i.updatedAt, i.archived ? 1 : 0]
  );
  res.json({ success: true });
});

app.patch('/api/initiatives/:id/archive', async (req, res) => {
  const updatedAt = new Date().toISOString();
  await db.run('UPDATE initiatives SET archived = 1, updatedAt = ? WHERE id = ?', [updatedAt, req.params.id]);
  res.json({ success: true });
});

// Activities
app.get('/api/activities', async (req, res) => {
  const { initiativeId } = req.query;
  let query = 'SELECT * FROM activities';
  const params = [];
  if (initiativeId) {
    query += ' WHERE initiativeId = ?';
    params.push(initiativeId);
  }
  const activities = await db.all(query, params);
  res.json(activities.map(a => ({ ...a, archived: !!a.archived })));
});

app.post('/api/activities', async (req, res) => {
  const a = req.body;
  await db.run(
    `INSERT OR REPLACE INTO activities 
    (id, initiativeId, title, description, ownerId, priority, status, startDate, endDate, archived, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [a.id, a.initiativeId, a.title, a.description, a.ownerId, a.priority, a.status, a.startDate, a.endDate, a.archived ? 1 : 0, a.createdAt, a.updatedAt]
  );
  
  // Update initiative updatedAt
  if (a.initiativeId) {
      await db.run('UPDATE initiatives SET updatedAt = ? WHERE id = ?', [new Date().toISOString(), a.initiativeId]);
  }

  res.json({ success: true });
});

app.patch('/api/activities/:id/archive', async (req, res) => {
  const updatedAt = new Date().toISOString();
  await db.run('UPDATE activities SET archived = 1, updatedAt = ? WHERE id = ?', [updatedAt, req.params.id]);
  res.json({ success: true });
});

// Logs
app.get('/api/logs', async (req, res) => {
  const { activityId } = req.query;
  const logs = await db.all('SELECT * FROM activity_logs WHERE activityId = ? ORDER BY createdAt DESC', [activityId]);
  res.json(logs);
});

app.post('/api/logs', async (req, res) => {
  const l = req.body;
  await db.run(
    'INSERT INTO activity_logs (id, activityId, createdAt, authorId, message) VALUES (?, ?, ?, ?, ?)',
    [l.id, l.activityId, l.createdAt, l.authorId, l.message]
  );
  res.json({ success: true });
});

// Capacity Assignments
app.get('/api/capacity', async (req, res) => {
  const { year } = req.query;
  let query = 'SELECT * FROM capacity_assignments';
  const params = [];
  if (year) {
    query += ' WHERE year = ?';
    params.push(year);
  }
  const assignments = await db.all(query, params);
  res.json(assignments);
});

app.post('/api/capacity', async (req, res) => {
  const a = req.body;
  await db.run(
    `INSERT OR REPLACE INTO capacity_assignments 
    (id, personId, initiativeId, year, month, percentage, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [a.id, a.personId, a.initiativeId, a.year, a.month, a.percentage, a.updatedAt]
  );
  res.json({ success: true });
});

app.delete('/api/capacity/:id', async (req, res) => {
  await db.run('DELETE FROM capacity_assignments WHERE id = ?', req.params.id);
  res.json({ success: true });
});
