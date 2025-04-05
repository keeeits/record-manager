const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Basic認証設定
const auth = { login: 'yourID', password: 'yourPassword' };
app.use((req, res, next) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
  if (login === auth.login && password === auth.password) return next();
  res.set('WWW-Authenticate', 'Basic realm="Record Manager"');
  res.status(401).send('認証が必要です');
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// データベース初期化
const db = new sqlite3.Database('./database.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist TEXT NOT NULL,
    album TEXT NOT NULL
  )`);
});

// APIエンドポイント
app.post('/add', (req, res) => {
  const { artist, album } = req.body;
  db.run("INSERT INTO records (artist, album) VALUES (?, ?)", [artist, album], err => {
    if (err) return res.status(500).send("エラー");
    res.send("登録完了");
  });
});

app.get('/list', (req, res) => {
  db.all("SELECT * FROM records", [], (err, rows) => {
    if (err) return res.status(500).send("エラー");
    res.json(rows);
  });
});

app.delete('/delete/:id', (req, res) => {
  db.run("DELETE FROM records WHERE id = ?", [req.params.id], err => {
    if (err) return res.status(500).send("削除失敗");
    res.send("削除成功");
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
