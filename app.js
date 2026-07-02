const templates = {
  mada: {
    name: 'まだお見えになっておりません',
    subject: '本日の授業について',
    body: `お世話になります。\n★本日は　{{時間帯}}で授業です。★\nまだお見えになっておりません。\n\nご確認のほどよろしくお願いいたします。\n※ご連絡いただいてる方、行き違いなどご容赦ください。\n\nまた、ご欠席・遅刻される場合は、こちらよりご連絡いただけますと助かります。\nhttps://x.gd/WfTJM\n\n※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。`
  },
  tokkun: {
    name: '特訓部屋のお知らせ',
    subject: '特訓部屋のお知らせ',
    body: `★{{日付}}（{{曜日}}）{{時間帯}}　★\nいつもお世話になっております。\n本日の確認テストの結果が不合格でした（2問以上間違えると不合格になります）。\n確認テストは前回指導内容の理解度の目安です。\nこのため別日程（上記日時）で特訓部屋に参加して、勉強内容の確認をさせていただきます。\n\n※ご都合が悪い場合、お手数ですが早めに教室までお電話をいただけると幸いです。\n個別指導ステップ {{電話番号}}\n\n※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。`
  }
};

let students = [];
const selectedIds = new Set();

const $ = id => document.getElementById(id);

window.addEventListener('DOMContentLoaded', () => {
  initTemplates();
  setToday();
  bindEvents();
  loadStudents();
  refreshTemplate();
});

function initTemplates() {
  const select = $('templateSelect');
  select.innerHTML = Object.entries(templates).map(([id, t]) => `<option value="${id}">${t.name}</option>`).join('');
}

function setToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  $('dateInput').value = `${yyyy}-${mm}-${dd}`;
}

function bindEvents() {
  ['templateSelect','dateInput','timeSelect','customTimeInput','subjectInput','bodyInput'].forEach(id => $(id).addEventListener('input', updatePreview));
  $('templateSelect').addEventListener('change', refreshTemplate);
  $('timeSelect').addEventListener('change', () => {
    $('customTimeBox').classList.toggle('hidden', $('timeSelect').value !== 'その他');
    updatePreview();
  });
  ['schoolFilter','gradeFilter','nameSearch'].forEach(id => $(id).addEventListener('input', renderStudents));
  $('reloadStudents').addEventListener('click', loadStudents);
  $('sendButton').addEventListener('click', sendMail);
}

function refreshTemplate() {
  const t = templates[$('templateSelect').value];
  $('subjectInput').value = t.subject;
  $('bodyInput').value = t.body;
  updatePreview();
}

function loadStudents() {
  $('studentMessage').textContent = '読み込み中...';
  $('studentMessage').classList.remove('error');
  $('studentList').innerHTML = '';
  getStudentsRequest(data => {
    if (data && data.error) {
      $('studentMessage').textContent = data.message || '取得失敗';
      $('studentMessage').classList.add('error');
      return;
    }
    students = Array.isArray(data) ? data : [];
    $('studentMessage').textContent = `${students.length}人取得`;
    renderStudents();
  });
}

function renderStudents() {
  const school = $('schoolFilter').value;
  const grade = $('gradeFilter').value;
  const q = normalize($('nameSearch').value);
  const list = students.filter(s => {
    if (school !== '全校舎' && s.school !== school) return false;
    if (grade !== '全学年' && s.grade !== grade) return false;
    if (q && !normalize(s.name).includes(q)) return false;
    return true;
  });
  $('studentList').innerHTML = list.map(s => `
    <label class="studentItem">
      <input type="checkbox" value="${escapeHtml(s.id)}" ${selectedIds.has(String(s.id)) ? 'checked' : ''}>
      <div><div class="studentName">${escapeHtml(s.name)}</div><div class="studentMeta">${escapeHtml(s.school)}　${escapeHtml(s.grade)}</div></div>
    </label>`).join('') || '<div class="studentItem">該当する生徒がいません。</div>';
  document.querySelectorAll('#studentList input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', e => {
      if (e.target.checked) selectedIds.add(String(e.target.value)); else selectedIds.delete(String(e.target.value));
      updateSelectedCount();
    });
  });
  updateSelectedCount();
}

function updateSelectedCount() { $('selectedCount').textContent = `選択 ${selectedIds.size}人`; }
function normalize(v) { return String(v || '').replace(/\s+/g,'').toLowerCase(); }
function escapeHtml(v) { return String(v ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

function getDateParts() {
  const value = $('dateInput').value;
  const d = value ? new Date(value + 'T00:00:00') : new Date();
  const week = ['日','月','火','水','木','金','土'][d.getDay()];
  return { dateText: `${d.getMonth()+1}月${d.getDate()}日`, weekday: week };
}
function getTimeText() { return $('timeSelect').value === 'その他' ? $('customTimeInput').value : $('timeSelect').value; }
function buildBody() {
  const {dateText, weekday} = getDateParts();
  return $('bodyInput').value.replaceAll('{{日付}}', dateText).replaceAll('{{曜日}}', weekday).replaceAll('{{時間帯}}', getTimeText()).replaceAll('{{電話番号}}', '（校舎に応じて自動挿入）');
}
function updatePreview() { $('preview').textContent = buildBody(); }

async function sendMail() {
  if (selectedIds.size === 0) { alert('送信対象の生徒を選択してください。'); return; }
  const names = students.filter(s => selectedIds.has(String(s.id))).map(s => s.name).join('、');
  if (!confirm(`${selectedIds.size}人に送信します。\n\n${names}\n\nよろしいですか？`)) return;
  const {dateText, weekday} = getDateParts();
  $('statusMessage').textContent = '送信中...';
  try {
    const result = await sendSelectedMail({
      templateId: $('templateSelect').value,
      subject: $('subjectInput').value,
      body: $('bodyInput').value,
      dateText, weekday,
      timeText: getTimeText(),
      studentIds: Array.from(selectedIds)
    });
    $('statusMessage').textContent = `送信完了：${result.sentCount}件`;
    if (result.errors && result.errors.length) alert(result.errors.join('\n'));
  } catch (e) {
    $('statusMessage').textContent = '送信エラー：' + e.message;
  }
}
