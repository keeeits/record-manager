const express = require('express');
const Database = require('better-sqlite3');  // sqlite3からbetter-sqlite3に変更
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

// データベース初期化（better-sqlite3を使用）
const db = new Database('./database.db');  // sqlite3からbetter-sqlite3に変更
db.prepare(`CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artist TEXT NOT NULL,
  album TEXT NOT NULL
)`).run();

// APIエンドポイント
app.post('/add', (req, res) => {
  const { artist, album } = req.body;
  try {
    const stmt = db.prepare("INSERT INTO records (artist, album) VALUES (?, ?)");
    stmt.run(artist, album);
    res.send("登録完了");
  } catch (err) {
    res.status(500).send("エラー");
  }
});

app.get('/list', (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM records").all();
    res.json(rows);
  } catch (err) {
    res.status(500).send("エラー");
  }
});

app.delete('/delete/:id', (req, res) => {
  try {
    const stmt = db.prepare("DELETE FROM records WHERE id = ?");
    stmt.run(req.params.id);
    res.send("削除成功");
  } catch (err) {
    res.status(500).send("削除失敗");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
