let templates=[], current=null; const $=id=>document.getElementById(id);
async function load(){
  const cached = localStorage.getItem('step_templates_v30_3');
  if(cached){try{templates=JSON.parse(cached)||[]; renderSelect();}catch(e){}}
  try{templates=await api.getTemplates(); localStorage.setItem('step_templates_v30_3', JSON.stringify(templates)); renderSelect();}
  catch(e){ if(!templates.length) alert('テンプレートの読み込みに失敗しました：'+e.message); }
  loadSettings();
  loadHistory();
}
function renderSelect(){ $('templateSelect').innerHTML='<option value="">新規作成</option>'+templates.map(t=>`<option value="${t.id}">${t.name}</option>`).join('') }
function show(t){current=t; $('nameInput').value=t?.name||''; $('subjectInput').value=t?.subject||''; $('bodyInput').value=t?.body||''; $('templateSelect').value=t?.id||'' }
function normalizeTemplateBody(body){
  const map={NAME:'生徒名',DATE:'日付',DAY:'曜日',WEEKDAY:'曜日',TIME:'時間帯',PHONE:'電話番号'};
  return String(body||'').replace(/\{\{\s*(NAME|DATE|DAY|WEEKDAY|TIME|PHONE)\s*\}\}/g,(m,k)=>'{{'+map[k]+'}}')
    .replace(/(^|[^\{])\b(NAME|DATE|DAY|WEEKDAY|TIME|PHONE)\b/g,(m,p,k)=>p+'{{'+map[k]+'}}');
}
function validateTemplateBody(body){
  const allowed=['生徒名','日付','曜日','時間帯','電話番号'];
  const found=[...String(body||'').matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(m=>m[1].trim());
  const bad=found.filter(x=>!allowed.includes(x));
  if(bad.length){alert('使えない差し込みがあります：\n{{'+bad.join('}}\n{{')+'}}\n\nボタンから差し込みを入れてください。');return false}
  return true;
}
async function save(asNew){
  let body=normalizeTemplateBody($('bodyInput').value); $('bodyInput').value=body; if(!validateTemplateBody(body))return;
  let name=$('nameInput').value.trim();
  if(asNew){
    const newName=prompt('名前をつけて保存します。保存名を入力してください。', name ? name+' コピー' : '');
    if(!newName) return;
    name=newName.trim();
    $('nameInput').value=name;
  }
  const payload={id:current?.id||'',name:name,subject:$('subjectInput').value.trim(),body:body};
  if(!payload.name||!payload.subject){alert('タイトルと件名を入力してください');return}
  const res=asNew?await api.saveTemplateAs(payload):await api.saveTemplate(payload);
  $('status').textContent='保存しました';
  alert('保存しました。');
  templates=await api.getTemplates(); localStorage.setItem('step_templates_v30_3', JSON.stringify(templates)); renderSelect(); show(templates.find(t=>t.id===res.id));
}
async function del(){if(!current){alert('削除するテンプレートを選択してください');return} if(!confirm('削除しますか？'))return; await api.deleteTemplate(current.id); $('status').textContent='削除しました'; alert('削除しました。'); templates=await api.getTemplates(); localStorage.setItem('step_templates_v30_3', JSON.stringify(templates)); renderSelect(); show(null)}
function insert(text){const ta=$('bodyInput'); const st=ta.selectionStart, en=ta.selectionEnd; ta.value=ta.value.slice(0,st)+text+ta.value.slice(en); ta.focus(); ta.selectionStart=ta.selectionEnd=st+text.length}
async function loadHistory(){const data=await api.getHistory({q:$('historySearch').value});$('historyList').innerHTML=data.map(h=>`<div class="historyItem"><div class="historyMeta">${h.sentDateLabel}</div><div class="historyTitle">${h.titleLine}</div><div class="historyMeta">${h.targetLine}</div><details class="details"><summary>本文を表示</summary><pre>${h.body||''}</pre></details></div>`).join('')||'<div class="muted">履歴がありません。</div>'}
async function loadSettings(){try{const s=await api.getSettings(); $('jinryoPhone').value=s['神領校電話']||''; $('otePhone').value=s['大手町校電話']||''; $('senderName').value=s['送信者名']||'';}catch(e){$('settingsStatus').textContent='設定の読み込みに失敗しました';}}
async function saveSettings(){const payload={'神領校電話':$('jinryoPhone').value.trim(),'大手町校電話':$('otePhone').value.trim(),'送信者名':$('senderName').value.trim()}; await api.saveSettings(payload); $('settingsStatus').textContent='設定を保存しました'; alert('設定を保存しました。');}
document.addEventListener('DOMContentLoaded',()=>{load(); $('templateSelect').onchange=()=>show(templates.find(t=>t.id===$('templateSelect').value)||null); $('newBtn').onclick=()=>show(null); $('saveBtn').onclick=()=>save(false); $('saveAsBtn').onclick=()=>save(true); $('deleteBtn').onclick=del; document.querySelectorAll('[data-ins]').forEach(b=>b.onclick=()=>insert(b.dataset.ins)); $('reloadHistory').onclick=loadHistory; $('historySearch').oninput=loadHistory; $('saveSettingsBtn').onclick=saveSettings; if($('toggleSettingsBtn')) $('toggleSettingsBtn').onclick=()=>$('settingsCard').classList.toggle('hidden');});
