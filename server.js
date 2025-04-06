const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic認証設定
const auth = { login: 'keito', password: '0301' };
app.use((req, res, next) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
  if (login === auth.login && password === auth.password) return next();
  res.set('WWW-Authenticate', 'Basic realm="Record Manager"');
  res.status(401).send('認証が必要です');
});

// 静的ファイルとJSONボディの処理
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

// SQLiteデータベース接続（環境変数でデータベースのパスを管理）
const dbPath = process.env.DATABASE_PATH || './database.db';  // Renderで環境変数を使ってパス管理
const db = new sqlite(dbPath);

// データベース初期化（テーブル作成）
db.prepare(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist TEXT NOT NULL,
    album TEXT NOT NULL,
    image TEXT,
    created_at TEXT NOT NULL
  )
`).run();

// Multer設定（画像アップロード）
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('画像形式はJPGまたはPNGのみです'), false);
    }
    cb(null, true);
  }
});

// アルバム登録
app.post('/add', upload.single('image'), (req, res) => {
  const { artist, album } = req.body;
  const image = req.file ? req.file.filename : null;
  const createdAt = new Date().toISOString();

  if (!artist || !album) {
    return res.status(400).send('アーティスト名とアルバム名は必須です');
  }

  try {
    db.prepare('INSERT INTO records (artist, album, image, created_at) VALUES (?, ?, ?, ?)')
      .run(artist, album, image, createdAt);
    res.send("登録完了");
  } catch (err) {
    console.error(err);
    res.status(500).send("アルバム登録に失敗しました");
  }
});

// アルバムリスト取得（検索付き）
app.get('/list', (req, res) => {
  const { artist, album } = req.query;
  let query = 'SELECT * FROM records WHERE 1=1';
  const params = [];

  if (artist) {
    query += ' AND artist LIKE ?';
    params.push(`%${artist}%`);
  }
  if (album) {
    query += ' AND album LIKE ?';
    params.push(`%${album}%`);
  }

  try {
    const rows = db.prepare(query).all(...params);
    const formatted = rows.map(row => ({
      ...row,
      imageUrl: row.image ? `/uploads/${row.image}` : null,
      created_at: new Date(row.created_at).toLocaleDateString()
    }));
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).send("データ取得に失敗しました");
  }
});

// レコード削除
app.delete('/delete/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT image FROM records WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).send("レコードが見つかりません");

    // ファイル削除
    if (row.image) {
      const filePath = path.join(__dirname, 'uploads', row.image);
      fs.unlink(filePath, err => {
        if (err) console.warn("画像が見つかりませんでした");
      });
    }

    db.prepare('DELETE FROM records WHERE id = ?').run(req.params.id);
    res.send("削除完了");
  } catch (err) {
    console.error(err);
    res.status(500).send("レコード削除に失敗しました");
  }
});

// レコード編集
app.put('/edit/:id', upload.single('image'), (req, res) => {
  const { artist, album } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!artist || !album) {
    return res.status(400).send('アーティスト名とアルバム名は必須です');
  }

  try {
    if (image) {
      // 新しい画像がある場合は更新
      db.prepare('UPDATE records SET artist = ?, album = ?, image = ? WHERE id = ?')
        .run(artist, album, image, req.params.id);
    } else {
      // 画像がない場合はそのまま
      db.prepare('UPDATE records SET artist = ?, album = ? WHERE id = ?')
        .run(artist, album, req.params.id);
    }
    res.send("更新完了");
  } catch (err) {
    console.error(err);
    res.status(500).send("更新に失敗しました");
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🎵 Record Manager running at http://localhost:${PORT}`);
});
