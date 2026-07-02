let templates = [];
let histories = [];
let currentTemplateId = '';
const $ = id => document.getElementById(id);
const ARCHIVE_KEY = 'step_message_center_archived_history_v12';

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
    $('templateList').textContent = 'テンプレートがありません。';
    return;
  }
  $('templateList').innerHTML = templates.map(t => `
    <button type="button" class="template-list-item ${String(t.id) === String(currentTemplateId) ? 'active' : ''}" data-id="${escapeHtml(t.id)}">
      <strong>${escapeHtml(t.name)}</strong>
      <span>${escapeHtml(t.subject || '件名なし')}</span>
    </button>
  `).join('');
  document.querySelectorAll('.template-list-item').forEach(btn => {
    btn.addEventListener('click', () => selectTemplate(btn.dataset.id));
  });
}

function selectTemplate(id) {
  const t = templates.find(x => String(x.id) === String(id));
  if (!t) return;
  currentTemplateId = String(t.id);
  $('templateNameInput').value = t.name || '';
  $('templateSubjectInput').value = t.subject || '';
  $('templateBodyInput').value = t.body || '';
  renderTemplateList();
  showTemplateStatus('', '');
}

function clearTemplateForm() {
  currentTemplateId = '';
  $('templateNameInput').value = '';
  $('templateSubjectInput').value = '';
  $('templateBodyInput').value = '';
  renderTemplateList();
  $('templateNameInput').focus();
  showTemplateStatus('新しいテンプレートを作成します。', '');
}

async function saveTemplateFromPage() {
  const name = $('templateNameInput').value.trim();
  const subject = $('templateSubjectInput').value.trim();
  const body = $('templateBodyInput').value;
  if (!name) return showTemplateStatus('タイトルを入力してください。', 'error');
  if (!subject) return showTemplateStatus('件名を入力してください。', 'error');
  if (!body.trim()) return showTemplateStatus('本文を入力してください。', 'error');
  try {
    const result = await saveTemplateRequest({ id: currentTemplateId || 'tpl_' + Date.now(), name, subject, body });
    if (result && result.error) throw new Error(result.message || '保存できませんでした。');
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
  const t = templates.find(x => String(x.id) === String(currentTemplateId));
  if (!confirm(`「${t ? t.name : currentTemplateId}」を削除しますか？`)) return;
  try {
    const result = await deleteTemplateRequest({ id: currentTemplateId });
    if (result && result.error) throw new Error(result.message || '削除できませんでした。');
    clearTemplateForm();
    showTemplateStatus('削除しました。', 'ok');
    await loadTemplatesForPage();
  } catch (e) {
    showTemplateStatus(e.message, 'error');
  }
}

async function loadHistoryForPage() {
  $('historyList').textContent = '読み込み中...';
  try {
    const result = await getHistoryRequest();
    if (!Array.isArray(result)) throw new Error(result.message || '履歴を取得できませんでした。');
    histories = result;
    renderHistoryForPage();
  } catch (e) {
    $('historyList').innerHTML = `<div class="status error">${escapeHtml(e.message)}</div>`;
  }
}

function getArchivedIds() {
  try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); }
  catch(e) { return []; }
}
function setArchivedIds(ids) { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(Array.from(new Set(ids)))); }
function historyKey(h) {
  return String(h.id || h.historyId || [h.date, h.subject, h.target, h.count, h.noticeDateText, h.noticeTimeText].join('|'));
}

function getVisibleHistories() {
  const archived = new Set(getArchivedIds());
  const keyword = normalizeText($('historySearch').value);
  const from = $('historyFromDate').value;
  const to = $('historyToDate').value;
  return histories.filter(h => {
    if (archived.has(historyKey(h))) return false;
    const hay = normalizeText(`${h.date} ${h.dateDisplay} ${h.subject} ${h.target} ${h.body} ${h.bodyPreview} ${h.noticeDateText} ${h.noticeTimeText}`);
    if (keyword && !hay.includes(keyword)) return false;
    if (from && h.sendDateYmd < from) return false;
    if (to && h.sendDateYmd > to) return false;
    return true;
  });
}

function renderHistoryForPage() {
  const list = getVisibleHistories();
  if (!list.length) {
    $('historyList').textContent = '履歴がありません。';
    return;
  }
  $('historyList').innerHTML = list.slice(0, 100).map((h, i) => buildHistoryItem(h, i)).join('');
  document.querySelectorAll('.copy-history-button').forEach(btn => {
    btn.addEventListener('click', () => copyHistoryToTemplate(Number(btn.dataset.index)));
  });
  document.querySelectorAll('.archive-history-button').forEach(btn => {
    btn.addEventListener('click', () => archiveHistoryFromPage(Number(btn.dataset.index)));
  });
}

function buildHistoryItem(h, i) {
  const target = h.target || '';
  const count = h.count || 0;
  const title = buildHistoryTitle(h);
  const sendDate = h.dateDisplay || h.date || '';
  const finalText = buildActualHistoryBody(h);
  return `
    <div class="history-item simple">
      <div class="history-line">送信日：${escapeHtml(sendDate)}</div>
      <div class="history-main-title">${escapeHtml(title)}</div>
      <div class="history-line history-target-line">送信先：${escapeHtml(target)} / ${escapeHtml(String(count))}件</div>
      <details class="history-details">
        <summary>本文を表示</summary>
        <pre>${escapeHtml(finalText)}</pre>
        <div class="history-button-row">
          <button type="button" class="small-button copy-history-button" data-index="${i}">この内容をテンプレート作成欄へコピー</button>
          <button type="button" class="small-button danger-light archive-history-button" data-index="${i}">アーカイブへ移動</button>
        </div>
      </details>
    </div>
  `;
}

function buildHistoryTitle(h) {
  if (h.templateId === 'tokkun' || String(h.subject || '').includes('特訓部屋')) {
    const notice = formatNoticeForHistory(h);
    return `特訓部屋のお知らせ${notice ? '　' + notice : ''}`;
  }
  if (h.templateId === 'mada' || String(h.subject || '').includes('まだ')) return 'まだお見えになっておりません。';
  return h.subject || '通常連絡';
}

function buildActualHistoryBody(h) {
  if (h.actualBody) return h.actualBody;
  if (Array.isArray(h.actualBodies) && h.actualBodies.length) {
    return h.actualBodies.map(x => `【${x.name || '送信先'}】\n${x.body || ''}`).join('\n\n--------------------\n\n');
  }
  const raw = h.body || h.bodyPreview || '';
  const names = parseTargetNames(h.target);
  if (!raw.includes('{{')) return raw + buildAttachmentText(h);
  if (!names.length) return applyPlaceholders(raw, h, '生徒');
  return names.map(name => `【${name}さん宛】\n${applyPlaceholders(raw, h, name)}`).join('\n\n--------------------\n\n') + buildAttachmentText(h);
}

function applyPlaceholders(body, h, studentName) {
  const dateText = h.noticeDateText || h.dateText || '';
  const weekday = h.weekday || '';
  const timeText = h.noticeTimeText || h.timeText || '';
  return String(body || '')
    .replaceAll('{{生徒名}}', studentName)
    .replaceAll('{{日付}}', dateText)
    .replaceAll('{{曜日}}', weekday)
    .replaceAll('{{時間帯}}', timeText)
    .replaceAll('{{電話番号}}', '0568-41-8937');
}

function parseTargetNames(target) {
  return String(target || '')
    .split(/[、,，]/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/^小\d\s*/, '').replace(/^中\d\s*/, '').replace(/^高\d\s*/, '').replace(/さん$/,'').trim())
    .filter(Boolean);
}

function buildAttachmentText(h) {
  if (!h.attachmentNames) return '';
  return `\n\n【添付】\n${h.attachmentNames}`;
}

function formatNoticeForHistory(h) {
  const date = h.noticeDateText || '';
  const weekday = h.weekday || '';
  const time = h.noticeTimeText || '';
  const datePart = date ? `${date}${weekday ? '（' + weekday + '）' : ''}` : '';
  return `${datePart}${time ? ' ' + time : ''}`.trim();
}

async function archiveHistoryFromPage(index) {
  const visible = getVisibleHistories();
  const h = visible[index];
  if (!h) return;
  if (!confirm('この送信履歴をアーカイブへ移動しますか？\n※画面の過去履歴から非表示になります。')) return;
  const key = historyKey(h);
  setArchivedIds([...getArchivedIds(), key]);
  renderHistoryForPage();
  try {
    if (typeof archiveHistoryRequest === 'function') await archiveHistoryRequest({ id: h.id || h.historyId || '', key });
  } catch(e) {
    // Apps Script側未対応でも画面上は非表示にする
    console.warn(e);
  }
}

function copyHistoryToTemplate(index) {
  const visible = getVisibleHistories();
  const h = visible[index];
  if (!h) return;
  currentTemplateId = '';
  $('templateNameInput').value = h.subject || '履歴から作成';
  $('templateSubjectInput').value = h.subject || '';
  $('templateBodyInput').value = h.body || h.bodyPreview || '';
  renderTemplateList();
  showTemplateStatus('履歴からコピーしました。必要に応じて修正して保存してください。', 'ok');
}

function showTemplateStatus(message, type) {
  $('templateStatus').textContent = message;
  $('templateStatus').className = `status ${type || ''}`;
}

function normalizeText(v) {
  return String(v || '').toLowerCase().replace(/[ァ-ン]/g, s => String.fromCharCode(s.charCodeAt(0) - 0x60)).replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/\s/g, '');
}
function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

document.addEventListener('DOMContentLoaded', initTemplatePage);
