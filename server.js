const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');  // CORSを有効にする

const app = express();

// CORS設定
app.use(cors());

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));

// Multerの設定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');  // アップロードしたファイルの保存先
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));  // ファイル名を一意にする
  }
});

const upload = multer({ storage: storage });

// ルートエンドポイント
app.get('/', (req, res) => {
  res.send('Welcome to DKswing Manager!');
});

// ファイルアップロードのエンドポイント
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.status(200).send({
    message: 'File uploaded successfully!',
    file: req.file
  });
});

// サーバーの起動
const PORT = process.env.PORT || 10000;  // Renderの環境に合わせてPORTを動的に設定
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
