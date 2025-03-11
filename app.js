const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');

const app = express();
const port = 3000;

// ダッシュボードルートをインポート
const dashboardRoutes = require('./routes/dashboard');

// ミドルウェア設定
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', [
  path.join(__dirname, 'views'),
  path.join(__dirname, 'layouts'), // layouts フォルダもビューの検索対象にする
]);
app.use(express.static(path.join(__dirname, 'public')));

// アプリ起動時に「likes」カラムを確認（ない場合は追加）
db.get('PRAGMA table_info(machines)', [], (err, result) => {
  if (err) {
    console.error('テーブル情報取得エラー:', err.message);
    return;
  }

  // likesカラムが存在するか確認し、なければ追加
  const hasLikesColumn =
    result && result.some((column) => column.name === 'likes');
  if (!hasLikesColumn) {
    db.run(
      'ALTER TABLE machines ADD COLUMN likes INTEGER DEFAULT 0',
      [],
      (err) => {
        if (err) {
          console.error('カラム追加エラー:', err.message);
        } else {
          console.log('「likes」カラムを追加しました');
        }
      }
    );
  }
});

// トップページ - 機械一覧表示
app.get('/', (req, res) => {
  db.all('SELECT * FROM machines', [], (err, machines) => {
    if (err) {
      console.error('クエリエラー:', err.message);
      return res.status(500).send('データベースエラー');
    }
    res.render('index', { machines });
  });
});

// レンタル申込フォーム表示
app.get('/rental/:id', (req, res) => {
  const machineId = req.params.id;

  db.get('SELECT * FROM machines WHERE id = ?', [machineId], (err, machine) => {
    if (err) {
      console.error('クエリエラー:', err.message);
      return res.status(500).send('データベースエラー');
    }
    if (!machine) {
      return res.status(404).send('機械が見つかりません');
    }
    res.render('rental_form', { machine });
  });
});

// 課題５：レンタル申込処理
app.post('/rental/:id', (req, res) => {
  const machineId = req.params.id;
  const { user_name, user_phone, rental_date, return_date } = req.body;

  const query =
    'INSERT INTO rentals (machine_id, user_name, user_phone, rental_date, return_date) VALUES (?, ?, ?, ?, ?)';
  db.run(
    query,
    [machineId, user_name, user_phone, rental_date, return_date],
    function (err) {
      if (err) {
        console.error('予約エラー:', err.message);
        return res.status(500).send('予約処理中にエラーが発生しました');
      }

      // 予約IDを取得
      const rentalId = this.lastID;

      // 予約確認ページへリダイレクト
      res.redirect(`/confirmation/${rentalId}`);
    }
  );
});

// 予約確認ページ
app.get('/confirmation/:id', (req, res) => {
  const rentalId = req.params.id;

  const query = `
    SELECT rentals.*, machines.name, machines.daily_fee
    FROM rentals
    JOIN machines ON rentals.machine_id = machines.id
    WHERE rentals.id = ?
  `;

  db.get(query, [rentalId], (err, rental) => {
    if (err) {
      console.error('クエリエラー:', err.message);
      return res.status(500).send('データベースエラー');
    }
    if (!rental) {
      return res.status(404).send('予約が見つかりません');
    }

    // 日数計算 (簡易版)
    const rentalDate = new Date(rental.rental_date);
    const returnDate = new Date(rental.return_date);
    const days =
      Math.round((returnDate - rentalDate) / (1000 * 60 * 60 * 24)) + 1;

    // 料金計算
    const totalFee = days * rental.daily_fee;

    res.render('confirmation', {
      rental,
      days,
      totalFee,
    });
  });
});

// 課題1: 機械を料金の安い順に表示
app.get('/machines/cheap', (req, res) => {
  db.all(
    'SELECT * FROM machines ORDER BY daily_fee ASC',
    [],
    (err, machines) => {
      if (err) {
        return res.status(500).send('エラーが発生しました');
      }
      res.render('cheap_machines', { machines: machines });
    }
  );
});

// 課題2: 機械名で検索する
app.get('/search', (req, res) => {
  const keyword = req.query.keyword || '';

  if (keyword === '') {
    return res.render('search', { machines: [], keyword: '' });
  }

  db.all(
    'SELECT * FROM machines WHERE name LIKE ?',
    ['%' + keyword + '%'],
    (err, machines) => {
      if (err) {
        return res.status(500).send('エラーが発生しました');
      }
      res.render('search', { machines: machines, keyword: keyword });
    }
  );
});

// 課題3: 「いいね」ボタンの処理
app.post('/machines/:id/like', (req, res) => {
  const machineId = req.params.id;

  // likesカラムを+1する
  db.run(
    'UPDATE machines SET likes = likes + 1 WHERE id = ?',
    [machineId],
    (err) => {
      if (err) {
        console.error('いいね更新エラー:', err.message);
        return res.status(500).send('エラーが発生しました');
      }

      res.redirect('/');
    }
  );
});

// 課題4: 人気順（いいねの多い順）に機械を表示
app.get('/machines/popular', (req, res) => {
  db.all('SELECT * FROM machines ORDER BY likes DESC', [], (err, machines) => {
    if (err) {
      return res.status(500).send('エラーが発生しました');
    }
    res.render('popular_machines', { machines: machines });
  });
});

// お問い合わせフォーム表示
app.get('/contact', (req, res) => {
  res.render('contact');
});

// お問い合わせ送信処理
app.post('/contact', (req, res) => {
  // データベースに保存
  // 完了ページへリダイレクト
  // hint: thank_you.ejsが完了ページのレイアウトファイル
});

// お問い合わせ完了ページ
app.get('/thank-you', (req, res) => {
  res.render('thank_you');
});

// お問い合わせ一覧ページ
app.get('/admin/contacts', (req, res) => {
  // データベースからお問合せの全データ取得
  // admin/contacts.ejsに取得したデータを渡して表示
});

// ダッシュボードルートの使用
app.use('/dashboard', dashboardRoutes);

// SQLクエリ実行のルートも移行
app.use('/execute-sql', dashboardRoutes);

// サーバー起動
app.listen(port, () => {
  console.log(`サーバーが http://localhost:${port} で起動しました`);
});
