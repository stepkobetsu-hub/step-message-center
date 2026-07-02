STEP Message Center Ver.19

【今回の変更】
1. template.html の右上ボタンを「送信画面へ戻る」に変更
2. 送信履歴に「アーカイブへ移動」ボタンを追加
3. 「本文を表示」で、{{生徒名}} {{日付}} {{曜日}} {{時間帯}} {{電話番号}} を差し込んだ送信時の現物に近い本文を表示
4. app.js から送信時に actualBody / actualBodies も送るように変更

【GitHubで置き換えるファイル】
- api.js
- app.js
- template.html
- template.js

【style.css】
style_addition.css の中身を、現在の style.css の一番下に追加してください。

【注意】
アーカイブは、Apps Script側が archiveHistory に未対応でも、ブラウザ側では非表示になります。
完全に全端末でアーカイブ共有したい場合は、Code.gs側に archiveHistory 対応が必要です。
