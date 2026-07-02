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
let students = [];
let selectedIds = new Set();

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

  select.addEventListener('change', () => { applyTemplate(); updatePreview(); });
  ['dateInput', 'timeSelect', 'customTimeInput', 'subjectInput', 'bodyInput'].forEach(id => {
    el(id).addEventListener('input', updatePreview);
    el(id).addEventListener('change', updatePreview);
  });

  ['schoolFilter', 'gradeFilter', 'studentSearch'].forEach(id => {
    el(id).addEventListener('input', renderStudentList);
    el(id).addEventListener('change', renderStudentList);
  });

  el('timeSelect').addEventListener('change', () => {
    el('customTimeArea').classList.toggle('hidden', el('timeSelect').value !== 'その他');
  });

  el('reloadStudentsButton').addEventListener('click', loadStudents);
  el('sendButton').addEventListener('click', sendMail);

  updatePreview();
  loadStudents();
}

function applyTemplate() {
  const t = templates[el('templateSelect').value];
  el('subjectInput').value = t.subject;
  el('bodyInput').value = t.body;
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '');
}

async function loadStudents() {
  el('studentCount').textContent = '読み込み中…';
  el('studentList').innerHTML = '<div class="empty">生徒一覧を読み込んでいます。</div>';

  try {
    students = await getStudentsRequest();
    selectedIds = new Set([...selectedIds].filter(id => students.some(s => s.id === id)));
    renderStudentList();
  } catch (e) {
    el('studentCount').textContent = '取得失敗';
    el('studentList').innerHTML = `<div class="empty error">${e.message}</div>`;
  }
}

function getFilteredStudents() {
  const school = el('schoolFilter').value;
  const grade = el('gradeFilter').value;
  const q = normalizeText(el('studentSearch').value);

  return students.filter(s => {
    if (school !== '全校舎' && s.school !== school) return false;
    if (grade !== '全学年' && s.grade !== grade) return false;
    if (q && !normalizeText(s.name).includes(q)) return false;
    return true;
  });
}

function renderStudentList() {
  const list = getFilteredStudents();
  el('studentCount').textContent = `表示 ${list.length}人 / 全${students.length}人`;
  el('selectedCount').textContent = `選択 ${selectedIds.size}人`;

  if (list.length === 0) {
    el('studentList').innerHTML = '<div class="empty">該当する生徒がいません。</div>';
    updatePreview();
    return;
  }

  el('studentList').innerHTML = list.map(s => `
    <label class="student-row">
      <input type="checkbox" value="${escapeHtml(s.id)}" ${selectedIds.has(s.id) ? 'checked' : ''}>
      <span class="student-name">${escapeHtml(s.name)}</span>
      <span class="student-meta">${escapeHtml(s.grade)}・${escapeHtml(s.school)}</span>
    </label>
  `).join('');

  el('studentList').querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      if (input.checked) selectedIds.add(input.value);
      else selectedIds.delete(input.value);
      el('selectedCount').textContent = `選択 ${selectedIds.size}人`;
      updatePreview();
    });
  });

  updatePreview();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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

function getPreviewStudent() {
  const firstSelected = students.find(s => selectedIds.has(s.id));
  return firstSelected || { name: '山田太郎', school: el('schoolFilter').value === '大手町校' ? '大手町校' : '神領校' };
}

function buildBody() {
  const { dateText, weekday } = getDateParts();
  const previewStudent = getPreviewStudent();
  const phone = previewStudent.school === '大手町校' ? '0568-27-9581' : '0568-41-8937';

  return el('bodyInput').value
    .replaceAll('{{日付}}', dateText)
    .replaceAll('{{曜日}}', weekday)
    .replaceAll('{{時間帯}}', getTimeText())
    .replaceAll('{{電話番号}}', phone)
    .replaceAll('{{生徒名}}', previewStudent.name);
}

function updatePreview() {
  el('preview').textContent = buildBody();
}

async function sendMail() {
  if (selectedIds.size === 0) {
    alert('送信対象の生徒を選択してください。');
    return;
  }

  const selectedNames = students
    .filter(s => selectedIds.has(s.id))
    .map(s => s.name)
    .join('、');

  const message = `次の${selectedIds.size}人に配信します。\n\n${selectedNames}\n\nよろしいですか？`;
  if (!confirm(message)) return;

  const btn = el('sendButton');
  btn.disabled = true;
  el('statusMessage').textContent = '送信中です…';

  const { dateText, weekday } = getDateParts();
  const payload = {
    templateId: el('templateSelect').value,
    subject: el('subjectInput').value,
    body: el('bodyInput').value,
    studentIds: Array.from(selectedIds),
    dateText,
    weekday,
    timeText: getTimeText()
  };

  try {
    await sendSelectedMailRequest(payload);
    el('statusMessage').textContent = '送信処理を受け付けました。配信履歴を確認してください。';
  } catch (e) {
    el('statusMessage').textContent = '送信に失敗しました：' + e.message;
  } finally {
    btn.disabled = false;
  }
}

init();
