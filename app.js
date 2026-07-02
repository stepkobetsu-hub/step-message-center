const templates = {
  mada: {
    id: 'mada',
    name: 'まだお見えになっておりません',
    subject: '本日の授業について',
    body: `お世話になります。
★本日は　{{時間帯}}で授業です。★
まだお見えになっておりません。

ご確認のほどよろしくお願いいたします。
※ご連絡いただいてる方、行き違いなどご容赦ください。

また、ご欠席・遅刻される場合は、こちらよりご連絡いただけますと助かります。
https://x.gd/WfTJM

※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。`
  },
  tokkun: {
    id: 'tokkun',
    name: '特訓部屋のお知らせ',
    subject: '特訓部屋のお知らせ',
    body: `★{{日付}}（{{曜日}}）{{時間帯}}　★
いつもお世話になっております。
本日の確認テストの結果が不合格でした（2問以上間違えると不合格になります）。
確認テストは前回指導内容の理解度の目安です。
このため別日程（上記日時）で特訓部屋に参加して、勉強内容の確認をさせていただきます。

※ご都合が悪い場合、お手数ですが早めに教室までお電話をいただけると幸いです。
個別指導ステップ {{電話番号}}

※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。`
  }
};

const el = id => document.getElementById(id);
let selectedSchool = '神領校';

function init() {
  const select = el('templateSelect');
  Object.values(templates).forEach(t => {
    const option = document.createElement('option');
    option.value = t.id;
    option.textContent = t.name;
    select.appendChild(option);
  });

  el('dateInput').valueAsDate = new Date();
  select.value = 'mada';
  applyTemplate();
  updatePreview();

  select.addEventListener('change', () => { applyTemplate(); updatePreview(); });
  ['dateInput', 'timeSelect', 'customTimeInput', 'subjectInput', 'bodyInput', 'gradeSelect'].forEach(id => {
    el(id).addEventListener('input', updatePreview);
    el(id).addEventListener('change', updatePreview);
  });

  el('timeSelect').addEventListener('change', () => {
    el('customTimeArea').classList.toggle('hidden', el('timeSelect').value !== 'その他');
  });

  document.querySelectorAll('.choice').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.choice').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSchool = btn.dataset.school;
      updatePreview();
    });
  });

  el('sendButton').addEventListener('click', sendMail);
}

function applyTemplate() {
  const t = templates[el('templateSelect').value];
  el('subjectInput').value = t.subject;
  el('bodyInput').value = t.body;
}

function getTimeText() {
  return el('timeSelect').value === 'その他'
    ? el('customTimeInput').value.trim()
    : el('timeSelect').value;
}

function getDateParts() {
  const value = el('dateInput').value;
  if (!value) return { dateText: '', weekday: '' };
  const d = new Date(value + 'T00:00:00');
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return { dateText: `${d.getMonth() + 1}月${d.getDate()}日`, weekday: w };
}

function buildBody() {
  const { dateText, weekday } = getDateParts();
  const phone = selectedSchool === '大手町校' ? '0568-27-9581' : '0568-41-8937';
  return el('bodyInput').value
    .replaceAll('{{日付}}', dateText)
    .replaceAll('{{曜日}}', weekday)
    .replaceAll('{{時間帯}}', getTimeText())
    .replaceAll('{{電話番号}}', phone)
    .replaceAll('{{生徒名}}', '山田太郎');
}

function updatePreview() {
  el('preview').textContent = buildBody();
}

async function sendMail() {
  if (!confirm('この内容で配信します。よろしいですか？')) return;

  const btn = el('sendButton');
  btn.disabled = true;
  el('statusMessage').textContent = '送信中です…';

  const { dateText, weekday } = getDateParts();
  const payload = {
    templateId: el('templateSelect').value,
    subject: el('subjectInput').value,
    body: el('bodyInput').value,
    school: selectedSchool,
    grade: el('gradeSelect').value,
    dateText,
    weekday,
    timeText: getTimeText()
  };

  try {
    await sendMailRequest(payload);
    el('statusMessage').textContent = '送信処理を受け付けました。配信履歴を確認してください。';
  } catch (e) {
    el('statusMessage').textContent = '送信に失敗しました：' + e.message;
  } finally {
    btn.disabled = false;
  }
}

init();
