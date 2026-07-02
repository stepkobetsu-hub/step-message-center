STEP配信システム v20 修正版

今回の修正点
1. app.js の構文エラーを修正（これが原因で学年ボタンや更新などが動かなくなっていました）
2. テンプレート設定ページ右上に「送信画面へ戻る」ボタン
3. 送信履歴に「アーカイブへ移動」ボタン
4. 本文表示で、送信時点の差し込み後本文を優先表示
5. 生徒一覧は前回キャッシュを先に表示し、裏で更新

貼り替えるファイル
- api.js
- app.js
- template.html
- template.js

style_addition.css は既存 style.css の末尾に追加してください。
※ template.html には念のため最低限のCSSを内蔵しています。

注意
Apps Script 側が actualBody / actualBodies / noticeDateText / noticeTimeText を履歴保存していない場合でも、画面側で可能な範囲で差し込み後の本文を再現します。
完全に送信現物を履歴に残すには、Apps Script側の送信履歴保存処理でもこれらの項目を保存する必要があります。
