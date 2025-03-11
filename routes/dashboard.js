const express = require('express');
const router = express.Router();
const db = require('../database');

// ダッシュボード用のデータ取得関数
function getDbData(callback) {
  // 機械データの取得
  db.all('SELECT * FROM machines', [], (err, machines) => {
    if (err) {
      console.error('機械データ取得エラー:', err.message);
      return callback({ machines: [], rentals: [], contacts: [] });
    }

    // 予約データの取得
    db.all(
      `
      SELECT rentals.*, machines.name as machine_name 
      FROM rentals
      JOIN machines ON rentals.machine_id = machines.id
      ORDER BY rentals.created_at DESC
    `,
      [],
      (err, rentals) => {
        if (err) {
          console.error('予約データ取得エラー:', err.message);
          return callback({ machines, rentals: [], contacts: [] });
        }

        db.all(
          'SELECT * FROM contacts ORDER BY created_at DESC',
          [],
          (err, contacts) => {
            if (err) {
              console.error('お問合せデータ取得エラー:', err.message);
              return callback({ machines: [], rentals: [], contacts: [] });
            }
            callback({ machines, rentals, contacts });
          }
        );
      }
    );
  });
}

// ダッシュボード表示
router.get('/', (req, res) => {
  const error = req.query.error;

  getDbData((dbData) => {
    res.render('dashboard', {
      ...dbData,
      error,
      sqlQuery: null,
      sqlResults: null,
      sqlMessage: null,
      sqlSuccess: false,
    });
  });
});

// SQLクエリ実行
router.post('/execute-sql', (req, res) => {
  const { sql } = req.body;

  if (!sql) {
    return res.redirect('/dashboard?error=SQL文を入力してください');
  }

  // SQLコマンドが安全かチェック（簡易版）
  const lowerSql = sql.toLowerCase();
  if (
    lowerSql.includes('drop table') ||
    lowerSql.includes('delete from') ||
    lowerSql.includes('truncate') ||
    lowerSql.includes('alter table')
  ) {
    return res.redirect(
      '/dashboard?error=安全上の理由により、このSQLは実行できません'
    );
  }

  // SQLの種類を判断
  let isSelect = lowerSql.trim().startsWith('select');

  if (isSelect) {
    // SELECT文の場合は結果を取得
    db.all(sql, [], (err, results) => {
      if (err) {
        console.error('SQL実行エラー:', err.message);
        return res.redirect(
          `/dashboard?error=${encodeURIComponent(err.message)}`
        );
      }

      // データベースの通常のデータを取得
      getDbData((dbData) => {
        res.render('dashboard', {
          ...dbData,
          sqlQuery: sql,
          sqlResults: results,
          sqlSuccess: true,
        });
      });
    });
  } else {
    // その他のSQL (INSERT, UPDATE など)
    db.run(sql, function (err) {
      if (err) {
        console.error('SQL実行エラー:', err.message);
        return res.redirect(
          `/dashboard?error=${encodeURIComponent(err.message)}`
        );
      }

      // 変更された行数など
      const message = `クエリが正常に実行されました。変更された行: ${this.changes}`;

      // データベースの通常のデータを再取得
      getDbData((dbData) => {
        res.render('dashboard', {
          ...dbData,
          sqlQuery: sql,
          sqlMessage: message,
          sqlSuccess: true,
        });
      });
    });
  }
});

module.exports = router;
