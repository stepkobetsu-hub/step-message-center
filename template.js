let templates = [];
let histories = [];
let currentTemplateId = '';
let visibleHistory = [];
const $ = id => document.getElementById(id);

function initTemplatePage() {
  bindTemplateEvents();
  loadTemplatesForPage();
  loadHistoryForPage();
}

function bindTemplateEvents() {
  $('newTemplateButton').addEventListener('click', clearTemplateForm);
  $('saveTemplateButton').addEventListener('click', saveTemplateFromPage);
  $('deleteTemplateButton').addEventListener('click', deleteTemplateFromPage);
  $('historyReloadButton').addEventListener('click', loadHistoryForPage);
  $('historySearch').addEventListener('input', renderHistoryForPage);
  $('historyFromDate').addEventListener('change', renderHistoryForPage);
  $('historyToDate').addEventListener('change', renderHistoryForPage);
  $('historyClearButton').addEventListener('click', () => {
    $('historySearch').value = '';
    $('historyFromDate').value = '';
    $('historyToDate').value = '';
    renderHistoryForPage();
  });
}

async function loadTemplatesForPage() {
  $('templateList').textContent = '読み込み中...';
  try {
    const result = await getTemplatesRequest();
    if (!Array.isArray(result)) throw new Error(result.message || 'テンプレートを取得できませんでした。');
    templates = result;
    renderTemplateList();
    if (!currentTemplateId && templates.length) selectTemplate(templates[0].id);
  } catch (e) {
    $('templateList').innerHTML = `<div class="status error">${escapeHtml(e.message)}</div>`;
  }
}

function renderTemplateList() {
  if (!templates.length) {
    $('templateList').textContent = 'テンプレートがありません。新規作成してください。';
    return;
  }
  $('templateList').innerHTML = templates.map(t => `
    <button type="button" class="${t.id === currentTemplateId ? 'active' : ''}" data-id="${escapeHtml(t.id)}">
      <strong>${escapeHtml(t.name)}</strong><br><small>${escapeHtml(t.subject || '件名なし')}</small>
    </button>`).join('');
  document.querySelectorAll('#templateList button').forEach(btn => btn.addEventListener('click', () => selectTemplate(btn.dataset.id)));
}

function selectTemplate(id) {
  const t = templates.find(x => x.id === id);
  if (!t) return;
  currentTemplateId = t.id;
  $('templateNameInput').value = t.name || '';
  $('templateSubjectInput').value = t.subject || '';
  $('templateBodyInput').value = t.body || '';
  renderTemplateList();
}

function clearTemplateForm() {
  currentTemplateId = '';
  $('templateNameInput').value = '';
  $('templateSubjectInput').value = '';
  $('templateBodyInput').value = '';
  renderTemplateList();
  showTemplateStatus('新規作成できます。', '');
}

async function saveTemplateFromPage() {
  const name = $('templateNameInput').value.trim();
  const subject = $('templateSubjectInput').value.trim();
  const body = $('templateBodyInput').value;
  if (!name) return showTemplateStatus('タイトルを入力してください。', 'error');
  if (!subject) return showTemplateStatus('件名を入力してください。', 'error');
  if (!body.trim()) return showTemplateStatus('本文を入力してください。', 'error');
  try {
    const result = await saveTemplateRequest({ id: currentTemplateId || undefined, name, subject, body });
    if (result && result.error) throw new Error(result.message || '保存に失敗しました。');
    currentTemplateId = result.id;
    showTemplateStatus('保存しました。', 'ok');
    await loadTemplatesForPage();
    selectTemplate(currentTemplateId);
  } catch (e) {
    showTemplateStatus(e.message, 'error');
  }
}

async function deleteTemplateFromPage() {
  if (!currentTemplateId) return showTemplateStatus('削除するテンプレートを選択してください。', 'error');
  const t = templates.find(x => x.id === currentTemplateId);
  if (!confirm(`「${t ? t.name : currentTemplateId}」を削除します。よろしいですか？`)) return;
  try {
    const result = await deleteTemplateRequest({ id: currentTemplateId });
    if (result && result.error) throw new Error(result.message || '削除に失敗しました。');
    showTemplateStatus('削除しました。', 'ok');
    currentTemplateId = '';
    clearTemplateForm();
    await loadTemplatesForPage();
  } catch (e) {
    showTemplateStatus(e.message, 'error');
  }
}

async function loadHistoryForPage() {
  $('historyList').textContent = '読み込み中...';
  try {
    histories = await getHistoryRequest();
    if (!Array.isArray(histories)) throw new Error(histories.message || '履歴を取得できませんでした。');
    renderHistoryForPage();
  } catch (e) {
    $('historyList').innerHTML = `<div class="status error">${escapeHtml(e.message)}</div>`;
  }
}

function renderHistoryForPage() {
  const keyword = normalizeText($('historySearch').value);
  const from = $('historyFromDate').value;
  const to = $('historyToDate').value;
  visibleHistory = histories.filter(h => {
    const hay = normalizeText(`${h.date} ${h.subject} ${h.target} ${h.body} ${h.bodyPreview}`);
    if (keyword && !hay.includes(keyword)) return false;
    if (from && h.sendDateYmd < from) return false;
    if (to && h.sendDateYmd > to) return false;
    return true;
  });
  if (!visibleHistory.length) {
    $('historyList').textContent = '履歴がありません。';
    return;
  }
  $('historyList').innerHTML = visibleHistory.slice(0, 100).map((h, i) => buildHistoryItem(h, i)).join('');
  document.querySelectorAll('.copy-history-button').forEach(btn => btn.addEventListener('click', () => copyHistoryToTemplate(Number(btn.dataset.index))));
}

function buildHistoryItem(h, i) {
  return `<div class="history-item simple">
    <div class="history-line">送信日：${escapeHtml(h.date || '')}</div>
    <div class="history-main-title">${escapeHtml(h.subject || '')}</div>
    <div class="history-line history-target-line">送信先：${escapeHtml(h.target || '')} / ${escapeHtml(String(h.count || 0))}件</div>
    <details class="history-details"><summary>本文を表示</summary><pre>${escapeHtml(h.bodyPreview || h.body || '')}</pre><button type="button" class="small-button copy-history-button" data-index="${i}">この内容を作成欄へコピー</button></details>
  </div>`;
}

function copyHistoryToTemplate(index) {
  const h = visibleHistory[index];
  if (!h) return;
  currentTemplateId = '';
  $('templateNameInput').value = h.subject || '履歴から作成';
  $('templateSubjectInput').value = h.subject || '';
  $('templateBodyInput').value = h.body || h.bodyPreview || '';
  renderTemplateList();
  showTemplateStatus('履歴からコピーしました。修正して保存してください。', 'ok');
}

function showTemplateStatus(message, type) { $('templateStatus').textContent = message; $('templateStatus').className = `status ${type || ''}`; }
function normalizeText(v) { return String(v || '').toLowerCase().replace(/[ァ-ン]/g, s => String.fromCharCode(s.charCodeAt(0) - 0x60)).replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/\s/g, ''); }
function escapeHtml(v) { return String(v ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch])); }

document.addEventListener('DOMContentLoaded', initTemplatePage);
