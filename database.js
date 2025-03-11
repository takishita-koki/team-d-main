const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// データベースファイルのパス
const dbPath = path.resolve(__dirname, 'rental.sqlite');

// データベース接続を作成
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('データベース接続エラー:', err.message);
    return;
  }
  console.log('SQLiteデータベースに接続しました');

  // 機械テーブルの作成
  db.run(
    `
    CREATE TABLE IF NOT EXISTS machines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      daily_fee INTEGER NOT NULL,
      likes INTEGER DEFAULT 0
    )
  `,
    (err) => {
      if (err) {
        console.error('テーブル作成エラー:', err.message);
        return;
      }

      // サンプルデータ投入
      db.get('SELECT COUNT(*) as count FROM machines', (err, row) => {
        if (err) {
          console.error('クエリエラー:', err.message);
          return;
        }

        // サンプルデータ投入
        if (row.count === 0) {
          const sampleData = [
            [
              'トラクター A',
              '耕運機',
              '小型耕運機。1〜2反用',
              '/images/tractor.jpg',
              3000,
            ],
            [
              '田植え機 B',
              '田植え機',
              '4条植え。中規模向け',
              '/images/rice-planter.jpg',
              5000,
            ],
            [
              'コンバイン C',
              '収穫機',
              '小型汎用コンバイン',
              '/images/combine.jpg',
              7000,
            ],
            [
              '動力噴霧器',
              '防除機',
              '背負い式、20Lタンク',
              '/images/sprayer.jpg',
              1500,
            ],
            [
              '草刈り機',
              '除草機',
              'エンジン式、肩掛けタイプ',
              '/images/mower.jpg',
              1000,
            ],
          ];

          const stmt = db.prepare(
            'INSERT INTO machines (name, type, description, image_url, daily_fee) VALUES (?, ?, ?, ?, ?)'
          );
          sampleData.forEach((data) => {
            stmt.run(data, (err) => {
              if (err) console.error('サンプルデータ挿入エラー:', err.message);
            });
          });
          stmt.finalize();

          console.log('機械のサンプルデータを挿入しました');
        }
      });
    }
  );
  db.run(
    `
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  subject TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,
    (err) => {
      if (err) {
        console.error('お問い合わせテーブル作成エラー:', err.message);
      } else {
        console.log('お問い合わせテーブルが準備されました');
      }
    }
  );
});

// データベースオブジェクトをエクスポート
module.exports = db;
