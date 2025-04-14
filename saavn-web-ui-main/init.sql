CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER,
    song_id TEXT,
    song_name TEXT,
    album_name TEXT,
    artist_name TEXT,
    image_url TEXT,
    download_url TEXT,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id TEXT UNIQUE,
    song_name TEXT,
    album_name TEXT,
    artist_name TEXT,
    image_url TEXT,
    file_path TEXT,
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
