const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite = require('better-sqlite3'); // 変更: sqlite3 -> better-sqlite3
const app = express();
const PORT = process.env.PORT || 3000;

// Basic認証設定（ユーザー名とパスワード）
const auth = { login: 'keito', password: '0301' };
app.use((req, res, next) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
  if (login === auth.login && password === auth.password) return next();
  res.set('WWW-Authenticate', 'Basic realm="Record Manager"');
  res.status(401).send('認証が必要です');
});

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// SQLiteデータベースの接続（同期的に接続）
const db = new sqlite('./database.db');

// データベースの初期化
db.prepare(`CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artist TEXT NOT NULL,
  album TEXT NOT NULL,
  image TEXT,
  created_at TEXT NOT NULL
)`).run();

// 画像のアップロード設定
const upload = multer({
  dest: 'uploads/', // アップロードされた画像を保存するディレクトリ
  limits: { fileSize: 10 * 1024 * 1024 }, // 最大10MBまでの画像を許可
  fileFilter: (req, file, cb) => {
    // 画像がJPGまたはPNG形式であるかをチェック
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('画像形式はJPGまたはPNGのみです'), false);
    }
    cb(null, true);
  }
});

// アルバムの登録（画像付き）
app.post('/add', upload.single('image'), (req, res) => {
  const { artist, album } = req.body;

  // バリデーション（アーティスト名とアルバム名が空でないか）
  if (!artist || !album) {
    return res.status(400).send('アーティスト名とアルバム名は必須です');
  }

  const image = req.file ? req.file.filename : null;
  const createdAt = new Date().toISOString();  // 現在の日時を取得

  try {
    db.prepare(
      'INSERT INTO records (artist, album, image, created_at) VALUES (?, ?, ?, ?)'
    ).run(artist, album, image, createdAt);
    res.send("登録完了");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("アルバム登録に失敗しました");
  }
});

// 画像付きアルバムのリストを取得（検索機能付き）
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
    res.json(rows.map(row => {
      // 画像のURLを生成
      row.imageUrl = row.image ? `/uploads/${row.image}` : null;
      // 日付のフォーマット（西暦と日付）
      row.created_at = new Date(row.created_at).toLocaleDateString();
      return row;
    }));
  } catch (err) {
    console.error(err.message);
    res.status(500).send("データ取得に失敗しました");
  }
});

// 画像の削除
app.delete('/delete/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT image FROM records WHERE id = ?').get(req.params.id);

    if (!row) {
      return res.status(500).send("レコードが見つかりません");
    }

    // 画像ファイルの削除
    const filePath = path.join(__dirname, 'uploads', row.image);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send("画像削除に失敗しました");
      }

      // レコードの削除
      db.prepare('DELETE FROM records WHERE id = ?').run(req.params.id);
      res.send("削除成功");
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("レコード削除に失敗しました");
  }
});

// レコードの編集
app.put('/edit/:id', upload.single('image'), (req, res) => {
  const { artist, album } = req.body;
  const image = req.file ? req.file.filename : null;

  // バリデーション（アーティスト名とアルバム名が空でないか）
  if (!artist || !album) {
    return res.status(400).send('アーティスト名とアルバム名は必須です');
  }

  try {
    db.prepare(
      'UPDATE records SET artist = ?, album = ?, image = ? WHERE id = ?'
    ).run(artist, album, image, req.params.id);
    res.send("更新完了");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("更新エラー");
  }
});

// サーバーの起動
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
