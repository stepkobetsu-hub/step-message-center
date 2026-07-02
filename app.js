const templates = {
  mada: {
    subject: '本日の授業について',
    body: `お世話になります。\n★本日は　{{時間帯}}で授業です。★\nまだお見えになっておりません。\n\nご確認のほどよろしくお願いいたします。\n※ご連絡いただいてる方、行き違いなどご容赦ください。\n\nまた、ご欠席・遅刻される場合は、こちらよりご連絡いただけますと助かります。\nhttps://x.gd/WfTJM\n\n※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。`
  },
  tokkun: {
    subject: '特訓部屋のお知らせ',
    body: `★{{日付}}（{{曜日}}）{{時間帯}}　★\nいつもお世話になっております。\n本日の確認テストの結果が不合格でした（2問以上間違えると不合格になります）。\n確認テストは前回指導内容の理解度の目安です。\nこのため別日程（上記日時）で特訓部屋に参加して、勉強内容の確認をさせていただきます。\n\n※ご都合が悪い場合、お手数ですが早めに教室までお電話をいただけると幸いです。\n個別指導ステップ {{電話番号}}\n\n※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。`
  },
  free: {
    subject: '',
    body: ''
  }
};

let students = [];
let histories = [];
const selectedIds = new Set();

const $ = id => document.getElementById(id);

function init() {
  setToday();
  applyTemplate();
  bindEvents();
  loadStudents();
  loadHistory();
  updatePreview();
}

function bindEvents() {
  $('templateSelect').addEventListener('change', () => { applyTemplate(); updatePreview(); });
  $('dateInput').addEventListener('change', updatePreview);
  $('timeSelect').addEventListener('change', () => { toggleCustomTime(); updatePreview(); });
  $('customTimeInput').addEventListener('input', updatePreview);
  $('subjectInput').addEventListener('input', updatePreview);
  $('bodyInput').addEventListener('input', updatePreview);
  $('linkInput').addEventListener('input', updatePreview);

  ['schoolFilter', 'gradeFilter'].forEach(id => $(id).addEventListener('change', renderStudents));
  $('nameSearch').addEventListener('input', renderStudents);
  $('reloadButton').addEventListener('click', loadStudents);
  $('selectVisibleButton').addEventListener('click', selectVisibleStudents);
  $('clearSelectedButton').addEventListener('click', () => { selectedIds.clear(); renderStudents(); });
  $('sendButton').addEventListener('click', sendMail);
  $('historyReloadButton').addEventListener('click', loadHistory);
  $('historySearch').addEventListener('input', renderHistory);
}

function setToday() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  $('dateInput').value = `${yyyy}-${mm}-${dd}`;
}

function applyTemplate() {
  const t = templates[$('templateSelect').value];
  $('subjectInput').value = t.subject;
  $('bodyInput').value = t.body;
}

function toggleCustomTime() {
  $('customTimeArea').classList.toggle('hidden', $('timeSelect').value !== 'その他');
}

async function loadStudents() {
  $('studentCountText').textContent = '読み込み中...';
  $('studentList').innerHTML = '';
  try {
    students = await getStudentsRequest();
    if (!Array.isArray(students)) throw new Error(students.message || '生徒一覧を取得できませんでした。');
    renderStudents();
  } catch (e) {
    $('studentCountText').textContent = '取得失敗';
    $('studentList').innerHTML = `<div class="status error">${escapeHtml(e.message)}</div>`;
  }
}

function getFilteredStudents() {
  const school = $('schoolFilter').value;
  const grade = $('gradeFilter').value;
  const keyword = normalizeText($('nameSearch').value);
  return students.filter(s => {
    if (school !== '全校舎' && s.school !== school) return false;
    if (grade !== '全学年' && normalizeGrade(s.grade) !== grade) return false;
    if (keyword && !normalizeText(s.name).includes(keyword)) return false;
    return true;
  });
}

function renderStudents() {
  const list = getFilteredStudents();
  $('studentCountText').textContent = `${list.length}人表示 / ${students.length}人取得`;
  $('selectedCountText').textContent = `選択 ${selectedIds.size}人`;
  if (list.length === 0) {
    $('studentList').innerHTML = '<div class="student-item">該当する生徒がいません。</div>';
    return;
  }
  $('studentList').innerHTML = list.map(s => `
    <label class="student-item">
      <input type="checkbox" data-id="${escapeHtml(s.id)}" ${selectedIds.has(s.id) ? 'checked' : ''}>
      <span class="student-name">${escapeHtml(s.name)}</span>
      <span class="student-meta">${escapeHtml(s.school)} / ${escapeHtml(s.grade)}</span>
    </label>
  `).join('');
  document.querySelectorAll('#studentList input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', e => {
      if (e.target.checked) selectedIds.add(e.target.dataset.id);
      else selectedIds.delete(e.target.dataset.id);
      $('selectedCountText').textContent = `選択 ${selectedIds.size}人`;
    });
  });
}

function selectVisibleStudents() {
  getFilteredStudents().forEach(s => selectedIds.add(s.id));
  renderStudents();
}

function getDateText() {
  if (!$('dateInput').value) return '';
  const d = new Date($('dateInput').value + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function getWeekday() {
  if (!$('dateInput').value) return '';
  const d = new Date($('dateInput').value + 'T00:00:00');
  return ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
}

function getTimeText() {
  return $('timeSelect').value === 'その他' ? $('customTimeInput').value : $('timeSelect').value;
}

function buildBody() {
  const links = $('linkInput').value.trim();
  let body = $('bodyInput').value;
  if (links) body += `\n\n【添付・リンク】\n${links}`;
  return body;
}

function buildPreviewBody() {
  return buildBody()
    .replaceAll('{{日付}}', getDateText())
    .replaceAll('{{曜日}}', getWeekday())
    .replaceAll('{{時間帯}}', getTimeText())
    .replaceAll('{{電話番号}}', '0568-41-8937');
}

function updatePreview() {
  $('preview').textContent = buildPreviewBody();
}

async function sendMail() {
  const ids = [...selectedIds];
  if (ids.length === 0) return showStatus('送信対象の生徒を選択してください。', 'error');
  if (!$('subjectInput').value.trim()) return showStatus('件名を入力してください。', 'error');
  if (!buildBody().trim()) return showStatus('本文を入力してください。', 'error');

  const selectedNames = students.filter(s => selectedIds.has(s.id)).map(s => s.name).join('、');
  const ok = confirm(`以下の生徒に送信します。\n\n${selectedNames}\n\n件名：${$('subjectInput').value}\n\n送信してよろしいですか？`);
  if (!ok) return;

  $('sendButton').disabled = true;
  showStatus('送信中です...', '');
  try {
    const result = await sendSelectedMail({
      templateId: $('templateSelect').value,
      studentIds: ids,
      subject: $('subjectInput').value,
      body: buildBody(),
      dateText: getDateText(),
      weekday: getWeekday(),
      timeText: getTimeText()
    });
    showStatus(`${result.sentCount}件送信しました。`, 'ok');
    await loadHistory();
  } catch (e) {
    showStatus(e.message, 'error');
  } finally {
    $('sendButton').disabled = false;
  }
}

async function loadHistory() {
  $('historyList').textContent = '読み込み中...';
  try {
    histories = await getHistoryRequest();
    if (!Array.isArray(histories)) throw new Error(histories.message || '履歴を取得できませんでした。');
    renderHistory();
  } catch (e) {
    $('historyList').innerHTML = `<div class="status error">${escapeHtml(e.message)}</div>`;
  }
}

function renderHistory() {
  const keyword = normalizeText($('historySearch').value);
  const list = histories.filter(h => !keyword || normalizeText(`${h.target} ${h.subject} ${h.body}`).includes(keyword));
  if (list.length === 0) {
    $('historyList').textContent = '履歴がありません。';
    return;
  }
  $('historyList').innerHTML = list.map(h => `
    <div class="history-item">
      <div class="history-date">${escapeHtml(h.date)}</div>
      <div class="history-title">${escapeHtml(h.subject)}</div>
      <div class="history-target">${escapeHtml(h.target)} / ${escapeHtml(String(h.count))}件</div>
      <div class="history-body">${escapeHtml((h.body || '').slice(0, 90))}</div>
    </div>
  `).join('');
}

function showStatus(message, type) {
  $('statusMessage').textContent = message;
  $('statusMessage').className = `status ${type || ''}`;
}

function normalizeGrade(v) {
  return String(v || '').replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/\s/g, '');
}
function normalizeText(v) {
  return String(v || '').toLowerCase().replace(/[ァ-ン]/g, s => String.fromCharCode(s.charCodeAt(0) - 0x60)).replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/\s/g, '');
}
function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

document.addEventListener('DOMContentLoaded', init);
