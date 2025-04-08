// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = 3000;

const db = new sqlite3.Database('./music.db');

app.use(cors());
app.use(bodyParser.json());

// Initialize tables
const initDb = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS playlist_songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id INTEGER,
      song_id TEXT,
      song_name TEXT,
      album_name TEXT,
      artist_name TEXT,
      image_url TEXT,
      download_url TEXT,
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS downloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id TEXT UNIQUE,
      song_name TEXT,
      album_name TEXT,
      artist_name TEXT,
      image_url TEXT,
      file_path TEXT,
      downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
};

initDb();

// API Routes

// Create new playlist
app.post('/api/playlist', (req, res) => {
  const { name } = req.body;
  db.run('INSERT OR IGNORE INTO playlists(name) VALUES (?)', [name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name });
  });
});

// Add song to playlist
app.post('/api/playlist/song', (req, res) => {
  const { playlist_id, song } = req.body;
  const stmt = `INSERT INTO playlist_songs (playlist_id, song_id, song_name, album_name, artist_name, image_url, download_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.run(stmt, [playlist_id, song.id, song.name, song.album, song.artist, song.image, song.downloadUrl], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.sendStatus(200);
  });
});

// Store downloaded song
app.post('/api/download', (req, res) => {
  const { song_id, song_name, album_name, artist_name, image_url, file_path } = req.body;
  db.run(`INSERT OR IGNORE INTO downloads (song_id, song_name, album_name, artist_name, image_url, file_path) 
          VALUES (?, ?, ?, ?, ?, ?)`,
    [song_id, song_name, album_name, artist_name, image_url, file_path], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.sendStatus(200);
    });
});

// Get all playlists
app.get('/api/playlists', (req, res) => {
  db.all('SELECT * FROM playlists', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get all songs in a playlist
app.get('/api/playlist/:id/songs', (req, res) => {
  db.all('SELECT * FROM playlist_songs WHERE playlist_id = ?', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get all downloaded songs
app.get('/api/downloads', (req, res) => {
  db.all('SELECT * FROM downloads ORDER BY downloaded_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
