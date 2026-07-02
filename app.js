const templates = {
  mada: {
    subject: 'まだお見えになっておりません',
    body: `{{生徒名}}さん\n\nお世話になります。\n★本日は　{{時間帯}}で授業です。★\nまだお見えになっておりません。\n\nご確認のほどよろしくお願いいたします。\n※ご連絡いただいてる方、行き違いなどご容赦ください。\n\nまた、ご欠席・遅刻される場合は、こちらよりご連絡いただけますと助かります。\nhttps://x.gd/WfTJM\n\n※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。\n\n個別指導ステップ`
  },
  tokkun: {
    subject: '特訓部屋のお知らせ',
    body: `{{生徒名}}さん\n\n★{{日付}}（{{曜日}}）{{時間帯}}　★\nいつもお世話になっております。\n本日の確認テストの結果が不合格でした（2問以上間違えると不合格になります）。\n確認テストは前回指導内容の理解度の目安です。\nこのため別日程（上記日時）で特訓部屋に参加して、勉強内容の確認をさせていただきます。\n\n※ご都合が悪い場合、お手数ですが早めに教室まで「お電話」または「公式LINE」にてご連絡をいただけると幸いです。\n個別指導ステップ {{電話番号}}\n\n※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。`
  },
  free: {
    subject: '',
    body: ''
  }
};

let students = [];
let histories = [];
const selectedStudents = new Map();

const $ = id => document.getElementById(id);

function init() {
  setToday();
  updateDateDisplay();
  applyTemplate();
  bindEvents();
  loadStudents();
  loadHistory();
  updatePreview();
}

function bindEvents() {
  $('templateSelect').addEventListener('change', () => { applyTemplate(); updatePreview(); });
  $('dateInput').addEventListener('change', () => { updateDateDisplay(); updatePreview(); });
  $('timeSelect').addEventListener('change', () => { toggleCustomTime(); updatePreview(); });
  $('customTimeInput').addEventListener('input', updatePreview);
  $('subjectInput').addEventListener('input', updatePreview);
  $('bodyInput').addEventListener('input', updatePreview);
  $('linkInput').addEventListener('input', updatePreview);

  ['schoolFilter', 'gradeFilter'].forEach(id => $(id).addEventListener('change', renderStudents));
  $('nameSearch').addEventListener('input', renderStudents);
  $('reloadButton').addEventListener('click', loadStudents);
  $('selectVisibleButton').addEventListener('click', selectVisibleStudents);
  $('clearSelectedButton').addEventListener('click', () => { selectedStudents.clear(); renderStudents(); updatePreview(); });
  $('sendButton').addEventListener('click', sendMail);
  $('historyReloadButton').addEventListener('click', loadHistory);
  $('historySearch').addEventListener('input', renderHistory);
  $('historyFromDate').addEventListener('change', renderHistory);
  $('historyToDate').addEventListener('change', renderHistory);
  $('historyClearButton').addEventListener('click', () => { $('historySearch').value = ''; $('historyFromDate').value = ''; $('historyToDate').value = ''; renderHistory(); });
}

function setToday() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  $('dateInput').value = `${yyyy}-${mm}-${dd}`;
}


function getFullDateDisplay() {
  if (!$('dateInput').value) return '日付未選択';
  const d = new Date($('dateInput').value + 'T00:00:00');
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${yyyy}/${mm}/${dd}（${w}）`;
}

function updateDateDisplay() {
  const el = $('dateDisplay');
  if (el) el.textContent = getFullDateDisplay();
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
    // 再読込後も、選択済みの生徒情報を最新データで補正する
    students.forEach(s => {
      if (selectedStudents.has(s.id)) selectedStudents.set(s.id, s);
    });
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
  updateSelectedView();

  if (list.length === 0) {
    $('studentList').innerHTML = '<div class="student-item">該当する生徒がいません。</div>';
    return;
  }

  $('studentList').innerHTML = list.map(s => `
    <label class="student-item ${selectedStudents.has(s.id) ? 'checked-row' : ''}">
      <input type="checkbox" data-id="${escapeHtml(s.id)}" ${selectedStudents.has(s.id) ? 'checked' : ''}>
      <span class="student-name">${escapeHtml(s.name)}</span>
      <span class="student-meta">${escapeHtml(s.grade)} / ${escapeHtml(s.school)}</span>
    </label>
  `).join('');

  document.querySelectorAll('#studentList input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', e => {
      const id = e.target.dataset.id;
      const student = students.find(s => s.id === id);
      if (e.target.checked && student) selectedStudents.set(id, student);
      else selectedStudents.delete(id);
      renderStudents();
      updatePreview();
    });
  });
}

function updateSelectedView() {
  const selected = Array.from(selectedStudents.values()).sort(compareStudent);
  $('selectedCountText').textContent = `選択 ${selected.length}人`;
  $('selectedPanelCount').textContent = `${selected.length}人選択中`;

  if (selected.length === 0) {
    $('selectedStudentList').textContent = 'まだ選択されていません。';
    $('selectedStudentList').classList.add('empty');
    return;
  }

  $('selectedStudentList').classList.remove('empty');
  $('selectedStudentList').innerHTML = `
    <div class="selected-summary">${escapeHtml(selected.map(s => `${s.grade} ${s.name}さん`).join('、'))}</div>
    <div class="selected-table">
      ${selected.map(s => `
        <div class="selected-row">
          <span class="grade-badge">${escapeHtml(s.grade)}</span>
          <strong class="selected-name">${escapeHtml(s.name)}さん</strong>
          <span class="selected-school">${escapeHtml(s.school)}</span>
          <button type="button" class="remove-selected" data-id="${escapeHtml(s.id)}">解除</button>
        </div>
      `).join('')}
    </div>
  `;

  document.querySelectorAll('.remove-selected').forEach(btn => {
    btn.addEventListener('click', e => {
      selectedStudents.delete(e.currentTarget.dataset.id);
      renderStudents();
      updatePreview();
    });
  });
}

function compareStudent(a, b) {
  return gradeSortValue(a.grade) - gradeSortValue(b.grade) || String(a.school).localeCompare(String(b.school), 'ja') || String(a.name).localeCompare(String(b.name), 'ja');
}

function gradeSortValue(grade) {
  const g = normalizeGrade(grade);
  const m = g.match(/^([小中高])(\d)$/);
  if (!m) return 999;
  const base = { '小': 0, '中': 10, '高': 20 }[m[1]];
  return base + Number(m[2]);
}

function selectVisibleStudents() {
  getFilteredStudents().forEach(s => selectedStudents.set(s.id, s));
  renderStudents();
  updatePreview();
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
    .replaceAll('{{電話番号}}', '0568-41-8937')
    .replaceAll('{{生徒名}}', getPreviewStudentName());
}

function getPreviewStudentName() {
  const selected = Array.from(selectedStudents.values())[0];
  return selected ? selected.name : '山田太郎';
}

function updatePreview() {
  $('preview').textContent = buildPreviewBody();
}

async function sendMail() {
  const selected = Array.from(selectedStudents.values()).sort(compareStudent);
  const ids = selected.map(s => s.id);
  if (ids.length === 0) return showStatus('送信対象の生徒を選択してください。', 'error');
  if (!$('subjectInput').value.trim()) return showStatus('件名を入力してください。', 'error');
  if (!buildBody().trim()) return showStatus('本文を入力してください。', 'error');

  const selectedNames = selected.map(s => `${s.grade} ${s.name}さん`).join('\n');
  const templateId = $('templateSelect').value;
  let confirmNotice = '';
  if (templateId === 'tokkun') {
    confirmNotice = `特訓部屋の案内日時：${getDateText()}（${getWeekday()}）${getTimeText()}`;
  } else if (templateId === 'mada') {
    confirmNotice = `未着連絡：今から「まだお見えになっておりません」を送信します。`;
  } else {
    confirmNotice = `通常連絡を送信します。`;
  }
  const ok = confirm(`以下の生徒に送信します。\n\n${selectedNames}\n\n件名：${$('subjectInput').value}\n${confirmNotice}\n\n送信してよろしいですか？`);
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
      timeText: getTimeText(),
      selectedNames: selected.map(s => s.name),
      selectedLabels: selected.map(s => `${s.grade} ${s.name}さん`)
    });
    showStatus(`${result.sentCount}件送信しました。`, 'ok');
    // 送信後は選択済みをクリアして、誤送信・二重送信を防ぎます。
    selectedStudents.clear();
    renderStudents();
    updatePreview();
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
  const from = $('historyFromDate').value;
  const to = $('historyToDate').value;

  const list = histories.filter(h => {
    const hay = normalizeText(`${h.target} ${h.subject} ${h.summary || ''} ${h.noticeDateText} ${h.noticeTimeText} ${h.dateDisplay || h.date}`);
    if (keyword && !hay.includes(keyword)) return false;
    if (from && (!h.sendDateYmd || h.sendDateYmd < from)) return false;
    if (to && (!h.sendDateYmd || h.sendDateYmd > to)) return false;
    return true;
  });

  if (list.length === 0) {
    $('historyList').textContent = '履歴がありません。';
    return;
  }

  $('historyList').innerHTML = list.map(h => buildHistoryCard(h)).join('');
}

function buildHistoryCard(h) {
  const kind = getHistoryKind(h);
  const target = h.target || '送信先不明';
  const count = h.count || 0;
  const sendDate = h.dateDisplay || h.date || '';
  let line = '';

  if (kind === '特訓部屋') {
    const notice = formatNoticeForHistory(h);
    line = `特訓部屋のお知らせ${notice ? '　' + notice : ''}`;
  } else if (kind === '未着連絡') {
    line = 'まだお見えになっておりません。';
  } else {
    line = h.subject || '通常連絡';
  }

  const body = h.bodyPreview || h.body || '';

  return `
    <div class="history-item simple">
      <div class="history-line">送信日時：${escapeHtml(sendDate)}</div>
      <div class="history-main-title">${escapeHtml(line)}</div>
      <div class="history-line history-target-line">送信先：${escapeHtml(target)} / ${escapeHtml(String(count))}件</div>
      <details class="history-details">
        <summary>本文・詳細を表示</summary>
        <pre>${escapeHtml(body)}</pre>
      </details>
    </div>
  `;
}

function formatNoticeForHistory(h) {
  const date = h.noticeDateText || '';
  const weekday = h.weekday || '';
  const time = h.noticeTimeText || '';
  if (!date && !time) return '';
  const datePart = date ? `${date}${weekday ? '（' + weekday + '）' : ''}` : '';
  return `${datePart}${time ? ' ' + time : ''}`.trim();
}

function getHistoryKind(h) {
  if (h.templateId === 'tokkun' || String(h.subject || '').includes('特訓部屋')) return '特訓部屋';
  if (h.templateId === 'mada' || String(h.subject || '').includes('まだ')) return '未着連絡';
  return '通常連絡';
}

function buildHistorySummary(h) {
  if (getHistoryKind(h) === '特訓部屋') {
    const notice = `${h.noticeDateText || ''}${h.weekday ? '（' + h.weekday + '）' : ''}${h.noticeTimeText ? ' ' + h.noticeTimeText : ''}`.trim();
    return `${h.target}へ、${notice || '案内日時未記録'}の特訓部屋を案内`;
  }
  if (getHistoryKind(h) === '未着連絡') {
    return `${h.target}へ、${h.date}に「まだお見えになっておりません」を送信`;
  }
  return `${h.target}へ、${h.subject || '通常連絡'}を送信`;
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
