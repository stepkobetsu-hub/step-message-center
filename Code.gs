// ==================================================
// STEP配信システム Code.gs Ver.4 完全版
// 個別送信・自由記述・添付リンク・履歴表示対応
// ==================================================

const SHEET_SETTING = '設定';
const SHEET_TEMPLATE = 'テンプレート';
const SHEET_HISTORY = '配信履歴';
const SHEET_RESERVATION = '予約送信';
const MASTER_SHEET_NAME = '☆マスタ';

function setupStepMailSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  createSettingSheet_(ss);
  createTemplateSheet_(ss);
  createHistorySheet_(ss);
  createReservationSheet_(ss);
  SpreadsheetApp.getUi().alert('STEP配信システム Ver.4 の初期設定が完了しました。');
}

function createSettingSheet_(ss) {
  let sheet = ss.getSheetByName(SHEET_SETTING);
  if (!sheet) sheet = ss.insertSheet(SHEET_SETTING);

  const current = sheet.getDataRange().getValues();
  const existing = {};
  for (let i = 1; i < current.length; i++) existing[current[i][0]] = current[i][1];

  sheet.clear();
  sheet.appendRow(['設定名', '値']);
  sheet.appendRow(['生徒マスタID', existing['生徒マスタID'] || '1CIJkTlYUcUkbb8jBdFc6L8D5ubTGsxwNxFv01ten-Zk']);
  sheet.appendRow(['神領校電話', existing['神領校電話'] || '0568-41-8937']);
  sheet.appendRow(['大手町校電話', existing['大手町校電話'] || '0568-27-9581']);
  sheet.appendRow(['送信者名', existing['送信者名'] || '個別指導STEP']);
  sheet.setFrozenRows(1);
}

function createTemplateSheet_(ss) {
  let sheet = ss.getSheetByName(SHEET_TEMPLATE);
  if (!sheet) sheet = ss.insertSheet(SHEET_TEMPLATE);

  sheet.clear();
  sheet.appendRow(['テンプレートID', 'テンプレート名', '件名', '本文', '使用']);

  sheet.appendRow([
    'mada',
    'まだお見えになっておりません',
    '本日の授業について',
`お世話になります。
★本日は　{{時間帯}}で授業です。★
まだお見えになっておりません。

ご確認のほどよろしくお願いいたします。
※ご連絡いただいてる方、行き違いなどご容赦ください。

また、ご欠席・遅刻される場合は、こちらよりご連絡いただけますと助かります。
https://x.gd/WfTJM

※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。`,
    true
  ]);

  sheet.appendRow([
    'tokkun',
    '特訓部屋のお知らせ',
    '特訓部屋のお知らせ',
`★{{日付}}（{{曜日}}）{{時間帯}}　★
いつもお世話になっております。
本日の確認テストの結果が不合格でした（2問以上間違えると不合格になります）。
確認テストは前回指導内容の理解度の目安です。
このため別日程（上記日時）で特訓部屋に参加して、勉強内容の確認をさせていただきます。

※ご都合が悪い場合、お手数ですが早めに教室までお電話をいただけると幸いです。
個別指導ステップ {{電話番号}}

※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。`,
    true
  ]);

  sheet.appendRow([
    'free',
    '自由記述',
    '',
    '',
    true
  ]);

  sheet.setFrozenRows(1);
}

function createHistorySheet_(ss) {
  let sheet = ss.getSheetByName(SHEET_HISTORY);
  if (!sheet) sheet = ss.insertSheet(SHEET_HISTORY);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['送信日時', 'テンプレートID', '件名', '本文', '対象', '送信件数', '結果']);
  } else {
    const header = sheet.getRange(1, 1, 1, Math.max(7, sheet.getLastColumn())).getValues()[0];
    if (header[0] !== '送信日時') {
      sheet.clear();
      sheet.appendRow(['送信日時', 'テンプレートID', '件名', '本文', '対象', '送信件数', '結果']);
    }
  }
  sheet.setFrozenRows(1);
}

function createReservationSheet_(ss) {
  let sheet = ss.getSheetByName(SHEET_RESERVATION);
  if (!sheet) sheet = ss.insertSheet(SHEET_RESERVATION);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['予約日時', 'テンプレートID', '件名', '本文', '対象', '送信状態', '送信日時']);
  }
  sheet.setFrozenRows(1);
}

function getSettings_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SETTING);
  if (!sheet) throw new Error('設定シートがありません。setupStepMailSystemを実行してください。');

  const values = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < values.length; i++) settings[values[i][0]] = values[i][1];
  return settings;
}

function getStudentList() {
  const settings = getSettings_();
  const masterId = settings['生徒マスタID'];
  if (!masterId) throw new Error('設定シートの「生徒マスタID」が未入力です。');

  const masterSS = SpreadsheetApp.openById(masterId);
  const masterSheet = masterSS.getSheetByName(MASTER_SHEET_NAME);
  if (!masterSheet) throw new Error('生徒マスタに「☆マスタ」シートがありません。');

  const values = masterSheet.getDataRange().getValues();
  const header = values[0];
  const col = {
    active: 1,
    id: header.indexOf('生徒番号'),
    name: header.indexOf('生徒氏名'),
    school: header.indexOf('校舎'),
    grade: header.indexOf('学年'),
    mail1: header.indexOf('メールアドレス（保護者）'),
    mail2: header.indexOf('メールアドレス２')
  };

  const students = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const activeFlag = row[col.active];
    if (activeFlag !== 1 && activeFlag !== 0 && activeFlag !== '1' && activeFlag !== '0') continue;

    const id = row[col.id];
    const name = row[col.name];
    const schoolRaw = row[col.school];
    const gradeRaw = row[col.grade];
    const mail1 = row[col.mail1];
    const mail2 = row[col.mail2];

    if (!id || !name) continue;
    if (!mail1 && !mail2) continue;

    let school = schoolRaw;
    if (schoolRaw === '神領') school = '神領校';
    if (schoolRaw === '大手') school = '大手町校';

    students.push({
      id: String(id),
      name: String(name),
      school: String(school || ''),
      grade: normalizeGrade_(gradeRaw),
      hasMail: true
    });
  }
  return students;
}

function sendStepMailToSelected(data) {
  const settings = getSettings_();
  const masterId = settings['生徒マスタID'];
  if (!data.studentIds || data.studentIds.length === 0) throw new Error('送信対象の生徒が選択されていません。');

  const masterSS = SpreadsheetApp.openById(masterId);
  const masterSheet = masterSS.getSheetByName(MASTER_SHEET_NAME);
  const values = masterSheet.getDataRange().getValues();
  const header = values[0];
  const col = {
    id: header.indexOf('生徒番号'),
    name: header.indexOf('生徒氏名'),
    school: header.indexOf('校舎'),
    mail1: header.indexOf('メールアドレス（保護者）'),
    mail2: header.indexOf('メールアドレス２')
  };

  const targetIds = data.studentIds.map(String);
  let sentCount = 0;
  const errors = [];
  const sentNames = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const studentId = String(row[col.id]);
    if (!targetIds.includes(studentId)) continue;

    const studentName = row[col.name];
    const school = row[col.school];
    const mail1 = row[col.mail1];
    const mail2 = row[col.mail2];

    const recipients = [];
    if (mail1) recipients.push(mail1);
    if (mail2) recipients.push(mail2);
    if (recipients.length === 0) {
      errors.push(studentName + '：メールアドレスなし');
      continue;
    }

    const phone = getSchoolPhone_(school, settings);
    const body = String(data.body || '')
      .replaceAll('{{生徒名}}', studentName)
      .replaceAll('{{日付}}', data.dateText || '')
      .replaceAll('{{曜日}}', data.weekday || '')
      .replaceAll('{{時間帯}}', data.timeText || '')
      .replaceAll('{{電話番号}}', phone);

    try {
      MailApp.sendEmail({
        to: recipients.join(','),
        subject: data.subject || '',
        body: body,
        name: settings['送信者名'] || '個別指導STEP'
      });
      sentCount++;
      sentNames.push(studentName);
    } catch (e) {
      errors.push(studentName + '：' + e.message);
    }
  }

  saveHistory_(data.templateId || '', data.subject || '', data.body || '', sentNames.join('、'), sentCount, errors);
  return { ok: true, sentCount: sentCount, sentNames: sentNames, errors: errors };
}

function getHistoryList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_HISTORY);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const lastRow = sheet.getLastRow();
  const startRow = Math.max(2, lastRow - 49);
  const numRows = lastRow - startRow + 1;
  const values = sheet.getRange(startRow, 1, numRows, 7).getValues().reverse();

  return values.map(row => ({
    date: row[0] ? Utilities.formatDate(new Date(row[0]), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') : '',
    templateId: String(row[1] || ''),
    subject: String(row[2] || ''),
    body: String(row[3] || ''),
    target: String(row[4] || ''),
    count: row[5] || 0,
    result: String(row[6] || '')
  }));
}

function getSchoolPhone_(school, settings) {
  if (school === '神領' || school === '神領校') return settings['神領校電話'];
  if (school === '大手' || school === '大手町校') return settings['大手町校電話'];
  return '';
}

function normalizeGrade_(grade) {
  if (!grade) return '';
  return String(grade)
    .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replaceAll('　', '')
    .replaceAll(' ', '')
    .trim();
}

function saveHistory_(templateId, subject, body, target, sentCount, errors) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_HISTORY);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_HISTORY);
    sheet.appendRow(['送信日時', 'テンプレートID', '件名', '本文', '対象', '送信件数', '結果']);
  }
  sheet.appendRow([new Date(), templateId, subject, body, target, sentCount, errors.length ? errors.join('\n') : 'OK']);
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    const callback = e.parameter.callback || 'callback';
    let result;

    if (e.parameter.action === 'getStudents') {
      result = getStudentList();
    } else if (e.parameter.action === 'getHistory') {
      result = getHistoryList();
    } else {
      result = { error: true, message: '不明なactionです。' };
    }

    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(result) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput('STEP配信システム Apps Script Ver.4 is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  let result;

  if (data.action === 'sendSelected') {
    result = sendStepMailToSelected(data);
  } else {
    result = { error: true, message: '不明なactionです。' };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
