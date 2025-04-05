const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();

// アプリケーションの初期化
const app = express();
const port = 3000;

// SQLite データベースの設定
const db = new sqlite3.Database('./users.db');

// サーバーコードの初期化処理（必要に応じてサーバー起動コードも記述）
db.serialize(() => {
  // users テーブルを作成（もし存在しない場合）
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL)');
  
  // albums テーブルを作成（もし存在しない場合）
  db.run('CREATE TABLE IF NOT EXISTS albums (id INTEGER PRIMARY KEY AUTOINCREMENT, artist_name TEXT NOT NULL, album_name TEXT NOT NULL, image_url TEXT, user_id INTEGER, created_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id))');
});

// セッション設定
app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: true,
}));

// パスワードのハッシュ化関数
const hashPassword = async (password) => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

// パスワードの確認関数
const checkPassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

// ミドルウェア設定
app.use(bodyParser.urlencoded({ extended: true }));

// ユーザー登録のルート
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await hashPassword(password);

  const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
  stmt.run(username, hashedPassword, (err) => {
    if (err) {
      return res.status(500).send('Error in registration');
    }
    res.redirect('/login');
  });
});

// ログインページ表示
app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard'); // すでにログインしている場合はダッシュボードにリダイレクト
  }
  res.send(`
    <form method="POST" action="/login">
      <input type="text" name="username" placeholder="Username" required>
      <input type="password" name="password" placeholder="Password" required>
      <button type="submit">Login</button>
    </form>
  `);
});

// ログイン処理
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => {
    if (err || !row) {
      return res.status(400).send('Invalid credentials');
    }

    const validPassword = await checkPassword(password, row.password);
    if (!validPassword) {
      return res.status(400).send('Invalid credentials');
    }

    req.session.userId = row.id; // セッションにユーザーIDを保存
    req.session.username = row.username; // セッションにユーザー名を保存
    res.redirect('/dashboard'); // ダッシュボードにリダイレクト
  });
});

// ログイン後のダッシュボード
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login'); // 未ログインの場合はログインページへ
  }
  
  res.send(`
    <h1>Welcome, ${req.session.username}!</h1>
    <p>Here is your album management dashboard.</p>
    <a href="/logout">Logout</a>
  `);
});

// ログアウト処理
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Could not log out');
    }
    res.redirect('/login');
  });
});

// サーバーの起動
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
