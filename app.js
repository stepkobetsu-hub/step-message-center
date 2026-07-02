let templates = [];
let students = [];
let histories = [];
let selectedFiles = [];
const selectedStudents = new Map();

const DEFAULT_TEMPLATES = [
  {
    id: 'mada',
    name: 'まだお見えになっておりません',
    subject: 'まだお見えになっておりません',
    body: `{{生徒名}}さん\n\nお世話になります。\n★本日は　{{時間帯}}で授業です。★\nまだお見えになっておりません。\n\nご確認のほどよろしくお願いいたします。\n※ご連絡いただいてる方、行き違いなどご容赦ください。\n\nまた、ご欠席・遅刻される場合は、こちらよりご連絡いただけますと助かります。\nhttps://x.gd/WfTJM\n\n※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。\n\n個別指導ステップ`
  },
  {
    id: 'tokkun',
    name: '特訓部屋のお知らせ',
    subject: '特訓部屋のお知らせ',
    body: `{{生徒名}}さん\n\n★{{日付}}（{{曜日}}）{{時間帯}}　★\nいつもお世話になっております。\n本日の確認テストの結果が不合格でした（2問以上間違えると不合格になります）。\n確認テストは前回指導内容の理解度の目安です。\nこのため別日程（上記日時）で特訓部屋に参加して、勉強内容の確認をさせていただきます。\n\n※ご都合が悪い場合、お手数ですが早めに教室まで「お電話」または「公式LINE」にてご連絡をいただけると幸いです。\n個別指導ステップ {{電話番号}}\n\n※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。`
  },
  { id: 'free', name: '自由記述', subject: '', body: '' }
];

const $ = id => document.getElementById(id);

function init() {
  setToday();
  updateDateDisplay();
  bindEvents();
  setTemplates(DEFAULT_TEMPLATES);
  loadTemplates();
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
  $('reloadButton').addEventListener('click', () => { loadTemplates(); loadStudents(); loadHistory(); });
  $('selectVisibleButton').addEventListener('click', selectVisibleStudents);
  $('clearVisibleButton').addEventListener('click', clearVisibleStudents);
  $('invertVisibleButton').addEventListener('click', invertVisibleStudents);
  $('clearSelectedButton').addEventListener('click', () => { selectedStudents.clear(); renderStudents(); updatePreview(); });
  $('visibleCheckAll').addEventListener('change', toggleVisibleAll);
  $('sendButton').addEventListener('click', sendMail);

  $('fileInput').addEventListener('change', e => addFiles(Array.from(e.target.files || [])));
  const dz = $('dropZone');
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('dragover');
    addFiles(Array.from(e.dataTransfer.files || []));
  });

  $('historyReloadButton').addEventListener('click', loadHistory);
  $('historySearch').addEventListener('input', renderHistory);
  $('historyFromDate').addEventListener('change', renderHistory);
  $('historyToDate').addEventListener('change', renderHistory);
  $('historyClearButton').addEventListener('click', () => {
    $('historySearch').value = '';
    $('historyFromDate').value = '';
    $('historyToDate').value = '';
    renderHistory();
  });
}

function setToday() {
  $('dateInput').value = toYmd(new Date());
}

function toYmd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getFullDateDisplay() {
  if (!$('dateInput').value) return '日付未選択';
  const d = new Date($('dateInput').value + 'T00:00:00');
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}（${w}）`;
}

function updateDateDisplay() {
  $('dateDisplay').textContent = getFullDateDisplay();
}

async function loadTemplates() {
  try {
    const result = await getTemplatesRequest();
    if (Array.isArray(result) && result.length > 0) {
      setTemplates(result);
      $('templateNotice').textContent = '';
    } else {
      setTemplates(DEFAULT_TEMPLATES);
      $('templateNotice').textContent = 'テンプレートを取得できなかったため、初期テンプレートを表示しています。';
    }
  } catch (e) {
    setTemplates(DEFAULT_TEMPLATES);
    $('templateNotice').textContent = 'テンプレート取得エラー：初期テンプレートを表示しています。';
    console.warn(e);
  }
  applyTemplate();
  updatePreview();
}

function setTemplates(list) {
  const current = $('templateSelect').value;
  templates = list.map(t => ({
    id: String(t.id),
    name: String(t.name || t.id),
    subject: String(t.subject || ''),
    body: String(t.body || '')
  }));
  $('templateSelect').innerHTML = templates.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join('');
  if (templates.some(t => t.id === current)) $('templateSelect').value = current;
}

function getCurrentTemplate() {
  return templates.find(t => t.id === $('templateSelect').value) || templates[0] || DEFAULT_TEMPLATES[0];
}

function applyTemplate() {
  const t = getCurrentTemplate();
  if (!t) return;
  $('subjectInput').value = t.subject || '';
  $('bodyInput').value = t.body || '';
}

function toggleCustomTime() {
  $('customTimeArea').classList.toggle('hidden', $('timeSelect').value !== 'その他');
}

async function loadStudents() {
  $('studentCountText').textContent = '読み込み中...';
  $('studentTableBody').innerHTML = '<tr><td colspan="5" class="empty-cell">読み込み中...</td></tr>';
  try {
    students = await getStudentsRequest();
    if (!Array.isArray(students)) throw new Error(students.message || '生徒一覧を取得できませんでした。');
    students.forEach(s => { if (selectedStudents.has(s.id)) selectedStudents.set(s.id, s); });
    renderStudents();
  } catch (e) {
    $('studentCountText').textContent = '取得失敗';
    $('studentTableBody').innerHTML = `<tr><td colspan="5" class="empty-cell error">${escapeHtml(e.message)}</td></tr>`;
  }
}

function getFilteredStudents() {
  const school = $('schoolFilter').value;
  const grade = $('gradeFilter').value;
  const kw = normalizeText($('nameSearch').value);
  return students.filter(s => {
    if (school !== '全校舎' && s.school !== school) return false;
    if (!matchesGradeFilter(s.grade, grade)) return false;
    const hay = normalizeText(`${s.name} ${s.grade} ${s.school} ${s.id}`);
    if (kw && !hay.includes(kw)) return false;
    return true;
  }).sort(compareStudent);
}

function matchesGradeFilter(studentGrade, filter) {
  const g = normalizeGrade(studentGrade);
  if (!filter || filter === '全学年' || filter === '全生徒') return true;
  if (filter === '全小学生') return g.startsWith('小');
  if (filter === '全中学生') return g.startsWith('中');
  if (filter === '全高校生') return g.startsWith('高');
  if (filter === '全小学生＆全中学生') return g.startsWith('小') || g.startsWith('中');
  return g === normalizeGrade(filter);
}

function renderStudents() {
  const list = getFilteredStudents();
  $('studentCountText').textContent = `${list.length}人表示 / ${students.length}人取得`;
  updateSelectedDisplay();
  renderTable(list);
}

function renderTable(list) {
  const tbody = $('studentTableBody');
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">該当する生徒がいません。</td></tr>';
    $('visibleCheckAll').checked = false;
    $('visibleCheckAll').indeterminate = false;
    return;
  }
  tbody.innerHTML = list.map(s => {
    const checked = selectedStudents.has(s.id) ? 'checked' : '';
    return `
      <tr data-id="${escapeHtml(s.id)}" class="${checked ? 'row-selected' : ''}">
        <td class="check-col"><input type="checkbox" class="student-check" data-id="${escapeHtml(s.id)}" ${checked}></td>
        <td><strong>${escapeHtml(s.name)}さん</strong></td>
        <td>${escapeHtml(s.grade || '')}</td>
        <td>${escapeHtml(s.school || '')}</td>
        <td>${escapeHtml(s.id || '')}</td>
      </tr>`;
  }).join('');
  document.querySelectorAll('.student-check').forEach(cb => {
    cb.addEventListener('click', e => e.stopPropagation());
    cb.addEventListener('change', e => {
      const s = students.find(x => x.id === e.target.dataset.id);
      if (!s) return;
      if (e.target.checked) selectedStudents.set(s.id, s);
      else selectedStudents.delete(s.id);
      renderStudents();
      updatePreview();
    });
  });
  document.querySelectorAll('#studentTableBody tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => {
      const id = tr.dataset.id;
      const s = students.find(x => x.id === id);
      if (!s) return;
      if (selectedStudents.has(id)) selectedStudents.delete(id);
      else selectedStudents.set(id, s);
      renderStudents();
      updatePreview();
    });
  });
  updateVisibleCheckState(list);
}

function updateVisibleCheckState(list = getFilteredStudents()) {
  const all = list.length > 0 && list.every(s => selectedStudents.has(s.id));
  const some = list.some(s => selectedStudents.has(s.id));
  $('visibleCheckAll').checked = all;
  $('visibleCheckAll').indeterminate = some && !all;
}

function toggleVisibleAll(e) {
  const list = getFilteredStudents();
  if (e.target.checked) list.forEach(s => selectedStudents.set(s.id, s));
  else list.forEach(s => selectedStudents.delete(s.id));
  renderStudents();
  updatePreview();
}

function updateSelectedDisplay() {
  const selected = Array.from(selectedStudents.values()).sort(compareStudent);
  $('selectedCountText').textContent = `選択 ${selected.length}人`;
  $('selectedPanelCount').textContent = `${selected.length}人`;
  if (selected.length === 0) {
    $('selectedStudentList').textContent = 'まだ選択されていません。';
    return;
  }
  const groupSummary = buildSelectedGroupSummary(selected);
  const summary = selected.map(s => `${s.grade} ${s.name}さん`).join('、');
  $('selectedStudentList').innerHTML = `
    <div class="selected-group-summary">${escapeHtml(groupSummary)}</div>
    <div class="selected-summary compact-summary">${escapeHtml(summary)}</div>
    <div class="selected-table compact-selected-table">
      ${selected.map(s => `
        <div class="selected-row compact-selected-row">
          <span class="grade-pill">${escapeHtml(s.grade)}</span>
          <strong>${escapeHtml(s.name)}さん</strong>
          <span>${escapeHtml(s.school)}</span>
          <button class="remove-selected" data-id="${escapeHtml(s.id)}" type="button">×</button>
        </div>`).join('')}
    </div>`;
  document.querySelectorAll('.remove-selected').forEach(btn => {
    btn.addEventListener('click', e => {
      selectedStudents.delete(e.currentTarget.dataset.id);
      renderStudents();
      updatePreview();
    });
  });
}

function buildSelectedGroupSummary(list) {
  const groups = new Map();
  list.forEach(s => {
    const key = `${s.school || ''} ${s.grade || ''}`.trim();
    groups.set(key, (groups.get(key) || 0) + 1);
  });
  return Array.from(groups.entries()).map(([k, v]) => `${k}：${v}人`).join(' ／ ');
}

function compareStudent(a, b) {
  return gradeSortValue(a.grade) - gradeSortValue(b.grade) || String(a.school).localeCompare(String(b.school), 'ja') || String(a.name).localeCompare(String(b.name), 'ja');
}
function gradeSortValue(grade) {
  const g = normalizeGrade(grade);
  const m = g.match(/^([小中高])([1-6])$/);
  if (!m) return 999;
  return ({ 小: 0, 中: 10, 高: 20 }[m[1]] || 99) + Number(m[2]);
}
function selectVisibleStudents() {
  const list = getFilteredStudents();
  list.forEach(s => selectedStudents.set(s.id, s));
  renderStudents();
  updatePreview();
  showStatus(`${list.length}人を選択に追加しました。`, 'ok');
}

function clearVisibleStudents() {
  const list = getFilteredStudents();
  list.forEach(s => selectedStudents.delete(s.id));
  renderStudents();
  updatePreview();
  showStatus(`表示中の${list.length}人を選択から外しました。`, '');
}

function invertVisibleStudents() {
  const list = getFilteredStudents();
  list.forEach(s => {
    if (selectedStudents.has(s.id)) selectedStudents.delete(s.id);
    else selectedStudents.set(s.id, s);
  });
  renderStudents();
  updatePreview();
  showStatus(`表示中の${list.length}人の選択を反転しました。`, '');
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
  if (links) body += `\n\n【リンク】\n${links}`;
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
function updatePreview() { $('preview').textContent = buildPreviewBody(); }

function addFiles(files) {
  files.forEach(file => {
    if (!selectedFiles.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) selectedFiles.push(file);
  });
  $('fileInput').value = '';
  renderAttachmentList();
}
function renderAttachmentList() {
  if (selectedFiles.length === 0) { $('attachmentList').textContent = '添付ファイルはありません。'; return; }
  $('attachmentList').innerHTML = selectedFiles.map((f, i) => `
    <div class="attachment-row"><span>📎 ${escapeHtml(f.name)}（${formatFileSize(f.size)}）</span><button type="button" data-index="${i}" class="remove-file">削除</button></div>`).join('');
  document.querySelectorAll('.remove-file').forEach(btn => btn.addEventListener('click', e => { selectedFiles.splice(Number(e.currentTarget.dataset.index), 1); renderAttachmentList(); }));
}
function formatFileSize(size) { return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(size / 1024)}KB`; }
function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, mimeType: file.type || 'application/octet-stream', data: String(reader.result || '').split(',')[1] || '', size: file.size });
    reader.onerror = () => reject(new Error(`${file.name}を読み込めませんでした。`));
    reader.readAsDataURL(file);
  });
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
  if (templateId === 'tokkun') confirmNotice = `案内日時：${getDateText()}（${getWeekday()}）${getTimeText()}`;
  else if (templateId === 'mada') confirmNotice = `未着連絡：今から「まだお見えになっておりません」を送信します。`;
  else confirmNotice = `通常連絡を送信します。`;
  const fileNotice = selectedFiles.length ? `\n添付：${selectedFiles.map(f => f.name).join('、')}` : '';
  const ok = confirm(`以下の生徒に送信します。\n\n${selectedNames}\n\n件名：${$('subjectInput').value}\n${confirmNotice}${fileNotice}\n\n送信してよろしいですか？`);
  if (!ok) return;

  $('sendButton').disabled = true;
  showStatus('送信中です...', '');
  try {
    const attachments = await Promise.all(selectedFiles.map(fileToAttachment));
    const result = await sendSelectedMail({
      templateId,
      studentIds: ids,
      subject: $('subjectInput').value,
      body: buildBody(),
      dateText: getDateText(),
      weekday: getWeekday(),
      timeText: getTimeText(),
      selectedLabels: selected.map(s => `${s.grade} ${s.name}さん`),
      attachments
    });
    if (result && result.error) throw new Error(result.message || '送信に失敗しました。');
    showStatus(`${result.sentCount}件送信しました。`, 'ok');
    selectedStudents.clear();
    selectedFiles = [];
    renderAttachmentList();
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
    const hay = normalizeText(`${h.target} ${h.subject} ${h.noticeDateText} ${h.noticeTimeText} ${h.date || ''}`);
    if (keyword && !hay.includes(keyword)) return false;
    if (from && (!h.sendDateYmd || h.sendDateYmd < from)) return false;
    if (to && (!h.sendDateYmd || h.sendDateYmd > to)) return false;
    return true;
  });
  $('historyList').innerHTML = list.length ? list.map(buildHistoryCard).join('') : '履歴がありません。';
  document.querySelectorAll('.archive-history-button').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const rowNumber = e.currentTarget.dataset.row;
      if (!rowNumber) return;
      if (!confirm('この履歴を画面表示から消します。履歴シートには残ります。')) return;
      try {
        const result = await archiveHistoryRequest({ rowNumber });
        if (result && result.error) throw new Error(result.message || '履歴を非表示にできませんでした。');
        histories = histories.filter(h => String(h.rowNumber) !== String(rowNumber));
        renderHistory();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}
function buildHistoryCard(h) {
  const kind = getHistoryKind(h);
  const sendDate = h.date || '';
  let line = '';
  if (kind === '特訓部屋') line = `特訓部屋のお知らせ${formatNoticeForHistory(h) ? '　' + formatNoticeForHistory(h) : ''}`;
  else if (kind === '未着連絡') line = 'まだお見えになっておりません。';
  else line = h.subject || '通常連絡';
  const attach = h.attachmentNames ? `\n\n【添付】\n${h.attachmentNames}` : '';
  return `<div class="history-item simple" data-row="${escapeHtml(h.rowNumber || '')}">
    <button type="button" class="archive-history-button" data-row="${escapeHtml(h.rowNumber || '')}" title="表示から消す">×</button>
    <div class="history-line">送信日：${escapeHtml(sendDate)}</div>
    <div class="history-main-title">${escapeHtml(line)}</div>
    <div class="history-line history-target-line">送信先：${escapeHtml(h.target || '送信先不明')} / ${escapeHtml(String(h.count || 0))}件</div>
    <details class="history-details"><summary>本文・詳細を表示</summary><pre>${escapeHtml((h.bodyPreview || h.body || '') + attach)}</pre></details>
  </div>`;
}
function formatNoticeForHistory(h) {
  const date = h.noticeDateText || '';
  const weekday = h.weekday || '';
  const time = h.noticeTimeText || '';
  const datePart = date ? `${date}${weekday ? '（' + weekday + '）' : ''}` : '';
  return `${datePart}${time ? ' ' + time : ''}`.trim();
}
function getHistoryKind(h) {
  if (h.templateId === 'tokkun' || String(h.subject || '').includes('特訓部屋')) return '特訓部屋';
  if (h.templateId === 'mada' || String(h.subject || '').includes('まだ')) return '未着連絡';
  return '通常連絡';
}
function showStatus(message, type) { $('statusMessage').textContent = message; $('statusMessage').className = `status ${type || ''}`; }
function normalizeGrade(v) { return String(v || '').replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/\s/g, ''); }
function normalizeText(v) { return String(v || '').toLowerCase().replace(/[ァ-ン]/g, s => String.fromCharCode(s.charCodeAt(0) - 0x60)).replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/\s/g, ''); }
function escapeHtml(v) { return String(v ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch])); }

document.addEventListener('DOMContentLoaded', init);
