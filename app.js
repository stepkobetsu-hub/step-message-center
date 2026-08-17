const W = ['日','月','火','水','木','金','土'];
let students=[], templates=[], selected=new Map(), currentTemplate=null, files=[], activeGrades=new Set(['全生徒']), sortMode='asc', historyMode='normal', historyLoadSeq=0;
const SEND_LOG_STORAGE_KEY='step_send_requests_v1';
const $=id=>document.getElementById(id);
function fmtDate(d){const x=new Date(d+'T00:00:00');return `${d.replaceAll('-','/')}（${W[x.getDay()]}）`}
function jpDateOnly(d){const x=new Date(d+'T00:00:00');return `${x.getMonth()+1}月${x.getDate()}日`}
function jpShort(d){const x=new Date(d+'T00:00:00');return `${x.getMonth()+1}月${x.getDate()}日（${W[x.getDay()]}）`}
function today(){return new Date().toISOString().slice(0,10)}
function timeText(){return $('timeSelect').value==='custom'?$('customTime').value:$('timeSelect').value}
function getDefaultTimeSlotByJapanTime(now=new Date()){
  const jp=new Date(now.toLocaleString('en-US',{timeZone:'Asia/Tokyo'}));
  const minutes=jp.getHours()*60+jp.getMinutes();
  if(minutes>=12*60+50 && minutes<14*60+20)return '13：00-14：15';
  if(minutes>=14*60+20 && minutes<15*60+45)return '14：20-15：35';
  if(minutes>=15*60+45 && minutes<17*60+10)return '15：45-17：00';
  if(minutes>=17*60+10 && minutes<18*60+35)return '17：10-18：25';
  if(minutes>=18*60+35 && minutes<20*60)return '18：35-19：50';
  if(minutes>=20*60 && minutes<21*60+16)return '20：00-21：15';
  return '17：10-18：25';
}
function setInitialTimeSlot(){
  const select=$('timeSelect');
  if(!select)return;
  select.value=getDefaultTimeSlotByJapanTime();
}
function gradeMatchOne(g,f){if(f==='全生徒'||f==='全学年')return true;if(f==='全小学生')return g.startsWith('小');if(f==='全中学生')return g.startsWith('中');if(f==='全高校生')return g.startsWith('高');return g===f}
function gradeMatch(g){if(!activeGrades.size)return false;if(activeGrades.has('全生徒'))return true;return [...activeGrades].some(f=>gradeMatchOne(g,f))}
const GRADE_ORDER=['小1','小2','小3','小4','小5','小6','中1','中2','中3','高1','高2','高3'];
function gradeRank(g){const i=GRADE_ORDER.indexOf(g);return i>=0?i:999}
function gradeClass(g){if(String(g).startsWith('小'))return 'gradeElem';if(String(g).startsWith('中'))return 'gradeJr';if(String(g).startsWith('高'))return 'gradeHigh';return ''}
function normalizeStudentSearch_(value){return String(value||'').normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0x60)).replace(/[\s　]+/g,'')}
const ROMAJI_PAIRS_={
  'きゃ':'kya','きゅ':'kyu','きょ':'kyo','ぎゃ':'gya','ぎゅ':'gyu','ぎょ':'gyo',
  'しゃ':'sha','しゅ':'shu','しょ':'sho','じゃ':'ja','じゅ':'ju','じょ':'jo',
  'ちゃ':'cha','ちゅ':'chu','ちょ':'cho','ぢゃ':'ja','ぢゅ':'ju','ぢょ':'jo',
  'にゃ':'nya','にゅ':'nyu','にょ':'nyo','ひゃ':'hya','ひゅ':'hyu','ひょ':'hyo',
  'びゃ':'bya','びゅ':'byu','びょ':'byo','ぴゃ':'pya','ぴゅ':'pyu','ぴょ':'pyo',
  'みゃ':'mya','みゅ':'myu','みょ':'myo','りゃ':'rya','りゅ':'ryu','りょ':'ryo',
  'うぃ':'wi','うぇ':'we','うぉ':'wo','ゔぁ':'va','ゔぃ':'vi','ゔぇ':'ve','ゔぉ':'vo',
  'ふぁ':'fa','ふぃ':'fi','ふぇ':'fe','ふぉ':'fo','しぇ':'she','じぇ':'je','ちぇ':'che',
  'てぃ':'ti','でぃ':'di','とぅ':'tu','どぅ':'du','つぁ':'tsa','つぃ':'tsi','つぇ':'tse','つぉ':'tso'
};
const ROMAJI_CHARS_={
  'あ':'a','い':'i','う':'u','え':'e','お':'o','か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
  'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go','さ':'sa','し':'shi','す':'su','せ':'se','そ':'so',
  'ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo','た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
  'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do','な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no',
  'は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho','ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
  'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po','ま':'ma','み':'mi','む':'mu','め':'me','も':'mo',
  'や':'ya','ゆ':'yu','よ':'yo','ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro','わ':'wa','を':'o',
  'ん':'n','ゔ':'vu','ぁ':'a','ぃ':'i','ぅ':'u','ぇ':'e','ぉ':'o','ゎ':'wa'
};
function kanaToRomaji_(value){
  const kana=normalizeStudentSearch_(value);
  let out='',smallTsu=false;
  for(let i=0;i<kana.length;i++){
    const ch=kana[i];
    if(ch==='っ'){smallTsu=true;continue}
    if(ch==='ー'){
      const vowel=(out.match(/[aeiou]$/)||[])[0];
      if(vowel)out+=vowel;
      continue;
    }
    const pair=ROMAJI_PAIRS_[kana.slice(i,i+2)];
    let roma=pair||ROMAJI_CHARS_[ch]||ch;
    if(pair)i++;
    if(smallTsu){
      if(roma.startsWith('ch'))out+='t';
      else if(/^[bcdfghjklmpqrstvwxyz]/.test(roma))out+=roma[0];
      smallTsu=false;
    }
    out+=roma;
  }
  return out;
}
function filtered(){const sc=$('schoolFilter').value, q=normalizeStudentSearch_($('nameFilter').value);const list=students.filter(s=>{const kana=s.kana||s.furigana||'';const values=[s.id,s.name,kana].map(normalizeStudentSearch_);values.push(kanaToRomaji_(kana));return(sc==='全校舎'||s.school===sc)&&gradeMatch(s.grade)&&(!q||values.some(v=>v.includes(q)))});list.sort((a,b)=>{const d=gradeRank(a.grade)-gradeRank(b.grade); if(d) return sortMode==='desc'?-d:d; return a.name.localeCompare(b.name,'ja')});return list}
function renderStudents(){const list=filtered();$('listCount').textContent=`${list.length}人表示 / ${students.length}人取得`; $('studentList').innerHTML=list.map(s=>`<div class="studentRow ${selected.has(s.id)?'selected':''}" data-id="${s.id}"><input type="checkbox" ${selected.has(s.id)?'checked':''}><b>${s.name}</b><span class="gradeBadge ${gradeClass(s.grade)}">${s.grade}</span><span>${s.school}</span></div>`).join('')||'<div class="muted" style="padding:12px">該当する生徒がいません。</div>'; document.querySelectorAll('.studentRow').forEach(r=>r.onclick=()=>toggleStudent(r.dataset.id));renderSelected()}
function toggleStudent(id){const s=students.find(x=>x.id===id); if(!s)return; selected.has(id)?selected.delete(id):selected.set(id,s); renderStudents()}
function renderSelected(){const arr=[...selected.values()];$('selectedCount').textContent=`${arr.length}人`; $('selectedSummary').classList.add('hidden'); $('selectedList').innerHTML=arr.length?arr.map(s=>`<div class="selectedItem"><span class="badge ${gradeClass(s.grade)}">${s.grade}</span><b>${s.name}さん</b><span>${s.school}</span><button class="chipX" title="解除" onclick="selected.delete('${s.id}');renderStudents();updatePreview()">×</button></div>`).join(''):'<span class="muted">まだ選択されていません。</span>'}
function decideSelection(){activeGrades.clear(); $('nameFilter').value=''; renderGradeButtons(); renderStudents(); updatePreview(); document.getElementById('studentList')?.scrollIntoView({behavior:'smooth',block:'nearest'});}
function applyTemplate(){const id=$('templateSelect').value; currentTemplate=templates.find(t=>t.id===id); if(!currentTemplate)return; $('subjectInput').value=currentTemplate.subject; $('bodyInput').value=currentTemplate.body; updatePreview()}
function previewPhone(){const arr=[...selected.values()]; if(arr.length===1){return arr[0].school==='大手町校'?'0568-27-9581':'0568-41-8937'} return '各生徒の校舎電話番号が入ります'}
function escapeHTML(s){return String(s||'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]||ch))}
function makeBody(){let b=$('bodyInput').value||''; const d=$('dateInput').value; const t=timeText(); const arr=[...selected.values()]; const sample=arr.length>=2?'__EACH_STUDENT_NAME__':(arr[0]?.name||'山田太郎'); const dateFull=jpShort(d); const weekday=W[new Date(d+'T00:00:00').getDay()]; return b.replaceAll('{{日付}}（{{曜日}}）',dateFull).replaceAll('{{日付}}{{曜日}}',dateFull).replaceAll('{{生徒名}}',sample).replaceAll('{{日付}}',dateFull).replaceAll('{{曜日}}',weekday).replaceAll('{{時間帯}}',t).replaceAll('{{電話番号}}',previewPhone())}
function updatePreview(){ const raw=makeBody(); const html=escapeHTML(raw).replaceAll('__EACH_STUDENT_NAME__','<span class="previewPlaceholder">〈各々の生徒名が入ります〉</span>'); $('preview').innerHTML=html }
function buildAttachments(){return Promise.all(files.map(f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res({name:f.name,type:f.type,data:r.result.split(',')[1]});r.onerror=rej;r.readAsDataURL(f)})))}

const GRADE_OPTIONS=['全生徒','全小学生','全中学生','全高校生','小1','小2','小3','小4','小5','小6','中1','中2','中3','高1','高2','高3'];
function renderGradeButtons(){
  const box=$('gradeButtons');
  box.innerHTML=GRADE_OPTIONS.map(g=>`<button type="button" class="gradeBtn ${activeGrades.has(g)?'active':''}" data-grade="${g}">${g}</button>`).join('');
  box.querySelectorAll('.gradeBtn').forEach(btn=>btn.onclick=()=>toggleGrade(btn.dataset.grade));
}
function toggleGrade(g){
  if(g==='全生徒'){
    if(activeGrades.has('全生徒')) activeGrades.clear();
    else activeGrades=new Set(['全生徒']);
  }else{
    activeGrades.delete('全生徒');
    activeGrades.has(g)?activeGrades.delete(g):activeGrades.add(g);
  }
  renderGradeButtons();
  renderStudents();
}

async function load(){
  ensureDeliveryLogButton();
  $('dateInput').value=today();
  setInitialTimeSlot();
  syncDate();
  renderGradeButtons();

  // Ver.31.2.2：まずブラウザ保存の生徒一覧を即表示し、裏で最新を取得します。
  const cached = localStorage.getItem('step_students_v314_roman');
  if(cached){
    try{
      students = JSON.parse(cached) || [];
      renderStudents();
    }catch(e){}
  }

  const cachedTemplates = localStorage.getItem('step_templates_v313');
  if(cachedTemplates){
    try{
      templates = JSON.parse(cachedTemplates) || [];
      $('templateSelect').innerHTML=templates.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
      applyTemplate();
    }catch(e){}
  }

  try{
    templates=await api.getTemplates();
    localStorage.setItem('step_templates_v313', JSON.stringify(templates));
    $('templateSelect').innerHTML=templates.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
    applyTemplate();
  }catch(e){
    if(!templates.length){
      alert('テンプレートの読み込みに失敗しました：'+e.message);
    }
  }

  api.getStudents().then(list=>{
    students=list||[];
    localStorage.setItem('step_students_v314_roman', JSON.stringify(students));
    renderStudents();
  }).catch(e=>{ if(!students.length) alert(e.message); });

  loadAbsences({refreshSource:true}).catch(()=>{});
}
function syncDate(){ $('dateDisplay').value=fmtDate($('dateInput').value) }
function openNativeDate(){ $('dateInput').showPicker?.(); $('dateInput').click() }
function showConfirm(){
  const arr=[...selected.values()];
  const title=$('subjectInput').value;
  const d=jpShort($('dateInput').value);
  const t=timeText();
  const isTokkun=(currentTemplate?.id||'').includes('tokkun');
  const isNotArrived=title.includes('まだお見えになっておりません');
  const showDate=isTokkun||isNotArrived;
  const guideDateText=isTokkun?`${d} ${t}`:`本日 ${t}`;
  return new Promise(resolve=>{
    let modal=$('confirmModal');
    if(!modal){
      modal=document.createElement('div');
      modal.id='confirmModal';
      modal.className='confirmOverlay hidden';
      document.body.appendChild(modal);
    }
    modal.innerHTML=`<section class="confirmDialog" role="dialog" aria-modal="true" aria-labelledby="confirmTitle" aria-describedby="confirmWarning">
      <h2 id="confirmTitle">送信内容の最終確認</h2>
      <p id="confirmWarning" class="confirmWarning">内容を十分に確認してから送信してください</p>
      <div class="confirmMain">
        <div class="confirmRecipients">
          <h3>送信先 <span>（${arr.length}名）</span></h3>
          <ul>${arr.map(s=>`<li><span class="gradeBadge ${gradeClass(s.grade)}">${escapeHTML(s.grade)}</span><strong>${escapeHTML(s.name)}さん</strong></li>`).join('')}</ul>
        </div>
        <dl class="confirmDetails">
          <div><dt>送信件数</dt><dd class="confirmCount">${arr.length}件</dd></div>
          <div><dt>件名</dt><dd>${escapeHTML(title)}</dd></div>
          ${showDate?`<div><dt>案内日時</dt><dd>${escapeHTML(guideDateText)}</dd></div>`:''}
        </dl>
      </div>
      <div class="confirmActions">
        <button id="confirmCancelBtn" type="button" class="confirmCancelBtn">キャンセル</button>
        <button id="confirmSendBtn" type="button" class="confirmSendBtn">この内容で送信する</button>
      </div>
    </section>`;
    const cancelBtn=$('confirmCancelBtn');
    const sendBtn=$('confirmSendBtn');
    const previousFocus=document.activeElement;
    const previousOverflow=document.body.style.overflow;
    let settled=false;
    const finish=confirmed=>{
      if(settled)return;
      settled=true;
      sendBtn.disabled=true;
      document.removeEventListener('keydown',onKeydown,true);
      modal.classList.add('hidden');
      document.body.style.overflow=previousOverflow;
      if(previousFocus?.isConnected)previousFocus.focus();
      resolve(confirmed);
    };
    const onKeydown=e=>{
      if(e.key==='Escape'){
        e.preventDefault();
        finish(false);
      }else if(e.key==='Enter'){
        e.preventDefault();
      }
    };
    cancelBtn.onclick=()=>finish(false);
    sendBtn.onclick=()=>finish(true);
    document.addEventListener('keydown',onKeydown,true);
    document.body.style.overflow='hidden';
    modal.classList.remove('hidden');
    requestAnimationFrame(()=>cancelBtn.focus());
  });
}
function showSendProgress(){let m=$('sendModal'); if(!m){m=document.createElement('div');m.id='sendModal';m.className='modalOverlay';document.body.appendChild(m)} m.innerHTML=`<div class="modalBox"><h2>送信中です…</h2><div class="progressBar"><div></div></div><p>画面を閉じずにお待ちください。</p></div>`; m.classList.remove('hidden')}
function showSendResult(res){let m=$('sendModal'); if(!m){m=document.createElement('div');m.id='sendModal';m.className='modalOverlay';document.body.appendChild(m)} const sent=res?.sentCount||0; const errors=res?.errors||[]; const ok=errors.length===0; m.innerHTML=`<div class="modalBox ${ok?'success':'warn'}"><h2>${ok?'✅ 配信が完了しました':'⚠ 配信結果を確認してください'}</h2><div class="resultCount">送信成功：${sent}件</div><div class="resultCount">送信失敗：${errors.length}件</div>${errors.length?`<pre class="errorList">${errors.join('\n')}</pre>`:''}<button class="btn primary" onclick="document.getElementById('sendModal').classList.add('hidden')">OK</button></div>`; m.classList.remove('hidden')}
function createSendRequestId(){return `step-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`}
function readSendRequests(){try{return JSON.parse(localStorage.getItem(SEND_LOG_STORAGE_KEY)||'[]')}catch(e){return[]}}
function rememberSendRequest(item){const list=readSendRequests().filter(x=>x.id!==item.id);list.unshift(item);localStorage.setItem(SEND_LOG_STORAGE_KEY,JSON.stringify(list.slice(0,20)))}
function stateClass(item){if(item.delivered)return 'deliveryOk';if(item.error)return 'deliveryError';return 'deliveryPending'}
function investigationSummary(result){if(!result?.found)return '<div class="deliveryUnknown">送信記録はまだ見つかりません。少し待ってからもう一度確認してください。再送はまだ行わないでください。</div>';return result.items.map(item=>`<div class="deliveryItem ${stateClass(item)}"><b>${escapeHTML(item.studentName||'送信先')}</b><span>${escapeHTML(item.state||'送信受付')}</span><small>${escapeHTML(item.sentAt||'')}</small>${item.error?`<div>${escapeHTML(item.error)}</div>`:''}</div>`).join('')}
async function investigateSend(requestId,targetId='sendInvestigationResult'){const target=$(targetId);if(target)target.innerHTML='<div class="muted">送信ログを調査しています…</div>';try{const result=await api.investigateSend(requestId);if(target)target.innerHTML=investigationSummary(result);return result}catch(e){if(target)target.innerHTML=`<div class="deliveryUnknown">調査できませんでした：${escapeHTML(e.message||e)}</div>`;throw e}}
function showSendError(e,requestId){let m=$('sendModal'); if(!m){m=document.createElement('div');m.id='sendModal';m.className='modalOverlay';document.body.appendChild(m)} m.innerHTML=`<div class="modalBox warn"><h2>送信結果を確認できませんでした</h2><pre class="errorList">${escapeHTML(e.message||e)}</pre><p>実際には送信できている場合があります。再送する前に調査してください。</p><div id="sendInvestigationResult"></div><div class="modalActions"><button id="investigateSendBtn" class="btn primary">送信できたかを調査する</button><button class="btn" onclick="document.getElementById('sendModal').classList.add('hidden')">閉じる</button></div></div>`; m.classList.remove('hidden');$('investigateSendBtn').onclick=()=>investigateSend(requestId)}
async function showDeliveryLog(){let m=$('deliveryLogModal');if(!m){m=document.createElement('div');m.id='deliveryLogModal';m.className='modalOverlay';document.body.appendChild(m)}const list=readSendRequests();m.innerHTML=`<div class="modalBox deliveryLogModal"><h2>この端末の送信ログ</h2><div id="deliveryLogList">${list.length?list.map(x=>`<button class="deliveryLogRow" data-request-id="${escapeHTML(x.id)}"><b>${escapeHTML(x.names||'送信先')}</b><span>${escapeHTML(x.createdAt||'')}</span><small>結果を確認</small></button>`).join(''):'<div class="muted">この端末の送信記録はまだありません。</div>'}</div><button class="btn" onclick="document.getElementById('deliveryLogModal').classList.add('hidden')">閉じる</button></div>`;m.classList.remove('hidden');m.querySelectorAll('.deliveryLogRow').forEach(btn=>btn.onclick=async()=>{btn.disabled=true;const label=btn.querySelector('b')?.textContent||'';const result=await api.investigateSend(btn.dataset.requestId).catch(e=>({found:false,error:e.message}));btn.outerHTML=`<div class="deliveryLogDetail"><b>${escapeHTML(label)}</b>${result.error?`<div class="deliveryUnknown">${escapeHTML(result.error)}</div>`:investigationSummary(result)}</div>`})}
function ensureDeliveryLogButton(){const top=document.querySelector('.top>div:last-child');if(!top||$('deliveryLogBtn'))return;const btn=document.createElement('button');btn.id='deliveryLogBtn';btn.type='button';btn.className='btn deliveryLogBtn';btn.textContent='送信ログ確認';btn.onclick=showDeliveryLog;top.prepend(btn)}
async function send(){
  if(!selected.size){alert('送信先を選択してください');return}
  if(!(await showConfirm()))return;
  const requestId=createSendRequestId();
  const selectedNames=[...selected.values()].map(s=>s.name).join('、');
  rememberSendRequest({id:requestId,names:selectedNames,createdAt:new Date().toLocaleString('ja-JP')});
  $('status').textContent='送信中です…';
  showSendProgress();
  try{
    const at=await buildAttachments();
    const res=await api.sendMail({sendRequestId:requestId,templateId:currentTemplate?.id||'',subject:$('subjectInput').value,body:$('bodyInput').value,studentIds:[...selected.keys()],dateText:jpDateOnly($('dateInput').value),dateValue:$('dateInput').value,weekday:W[new Date($('dateInput').value+'T00:00:00').getDay()],timeText:timeText(),attachments:at});
    if(!res || res.error) throw new Error(res?.message || '送信結果が確認できませんでした');
    const errText=(res.errors&&res.errors.length)?`（エラー：${res.errors.join(' / ')}）`:'';
    $('status').textContent=`送信完了：${res.sentCount||0}件${errText}`;
    showSendResult(res);
    selected.clear();
    files=[];
    activeGrades=new Set(['全生徒']);
    sortMode='asc';
    $('schoolFilter').value='全校舎';
    $('nameFilter').value='';
    renderFiles();
    renderGradeButtons();
    renderStudents();
    loadHistory();
  }catch(e){
    $('status').textContent='エラー：'+e.message;
    showSendError(e,requestId);
  }
}
function renderFiles(){ $('fileList').innerHTML=files.map(f=>`📎 ${f.name}`).join('<br>') }
async function loadHistory(){
  const loadSeq=++historyLoadSeq;
  const archived = historyMode==='archive' ? '1' : '';
  const historyList=$('historyList');
  historyList.innerHTML='<div class="muted">直近10件の送信履歴を更新中…</div>';
  let data;
  try{
    data=await api.getHistory({from:$('historyFrom').value,to:$('historyTo').value,q:$('historySearch').value,archived,limit:10});
    data=(data||[]).slice(0,10);
  }catch(e){
    if(loadSeq===historyLoadSeq) historyList.innerHTML=`<div class="message">送信履歴の取得に失敗しました：${escapeHTML(e.message||e)}</div>`;
    return;
  }
  if(loadSeq!==historyLoadSeq) return;
  const emptyMsg = historyMode==='archive' ? 'アーカイブはありません。' : '履歴がありません。';
  historyList.innerHTML=data.map(h=>{
    const actions = historyMode==='archive'
      ? `<div class="historyActions"><button class="btn small primary" onclick="restoreHistory('${h.id}')">復元</button><button class="btn small danger" onclick="deleteHistoryPermanent('${h.id}')">完全削除</button></div>`
      : `<button class="xbtn" title="アーカイブ" onclick="archiveHistory('${h.id}')">×</button>`;
    const label = historyMode==='archive' ? '<span class="archiveBadge">アーカイブ</span>' : '';
    return `<div class="historyItem">${actions}${label}<div class="historyMeta">送信日：${h.sentDateLabel}</div><div class="historyTitle">${h.titleLine}</div><div class="historyMeta">送信先：${h.targetLine}</div><details class="details"><summary>本文・詳細を表示</summary><pre>${h.body||''}</pre></details></div>`
  }).join('')||`<div class="muted">${emptyMsg}</div>`
}
function showNormalHistoryControls(){historyMode='normal';$('showArchiveBtn').classList.remove('hidden');$('showNormalHistoryBtn').classList.add('hidden')}
function resetHistoryFilters(){ $('historySearch').value=''; $('historyFrom').value=''; $('historyTo').value=''; showNormalHistoryControls(); }
async function archiveHistory(id){if(!confirm('この履歴を画面から非表示（アーカイブ）にしますか？'))return; await api.archiveHistory(id); loadHistory()}
async function restoreHistory(id){await api.restoreHistory(id); loadHistory()}
async function deleteHistoryPermanent(id){if(!confirm('この履歴を完全削除します。元に戻せません。よろしいですか？'))return; await api.deleteHistoryPermanent(id); loadHistory()}
function absenceUpdatedLabel_(snapshot){
  const raw=snapshot?.updatedAt||snapshot?.items?.find(x=>x?.cacheUpdatedAt)?.cacheUpdatedAt||'';
  if(!raw)return '';
  const d=new Date(raw);
  if(Number.isNaN(d.getTime()))return String(raw);
  return d.toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function normalizeAbsenceSnapshot_(value){
  if(Array.isArray(value))return {items:value,updatedAt:''};
  return {items:Array.isArray(value?.items)?value.items:[],updatedAt:value?.updatedAt||''};
}
function renderAbsences(snapshot,options={}){
  const normalized=normalizeAbsenceSnapshot_(snapshot);
  const newestFirst=[...normalized.items].reverse();
  $('absenceList').innerHTML=newestFirst.map(a=>`<div class="absenceItem ${a.isToday?'today':''}"><b>${a.dateLabel}</b>${a.receivedLabel?` <span class="receivedTime">${a.receivedLabel}</span>`:''}<div>${a.school}　${a.name}</div><div>${a.kind}　${a.reason||''}</div><div class="muted">${a.other||''}</div></div>`).join('')||'<div class="muted">本日以降の欠席遅刻連絡はありません。</div>';
  const status=$('absenceAutoStatus');
  if(status){
    const updated=absenceUpdatedLabel_(normalized);
    status.textContent=options.local?'保存データを表示中…':(updated?`元データ更新：${updated}`:'最新データを確認しました');
  }
}
async function loadAbsences(options={}){
  const cached=localStorage.getItem('step_absences_v313');
  if(cached){
    try{renderAbsences(JSON.parse(cached)||[],{local:true})}catch(e){}
  }
  try{
    const result=options.refreshSource?await api.refreshAbsences():await api.getAbsenceSnapshot();
    const snapshot=normalizeAbsenceSnapshot_(result);
    localStorage.setItem('step_absences_v313',JSON.stringify(snapshot));
    renderAbsences(snapshot);
    return snapshot;
  }catch(e){
    const status=$('absenceAutoStatus');
    if(status)status.textContent='自動更新に失敗しました';
    throw e;
  }
}
window.archiveHistory=archiveHistory;window.restoreHistory=restoreHistory;window.deleteHistoryPermanent=deleteHistoryPermanent;
document.addEventListener('DOMContentLoaded',()=>{load().catch(e=>alert(e.message)); $('dateDisplay').onclick=openNativeDate; $('dateInput').onchange=()=>{syncDate();updatePreview()}; ['timeSelect','customTime','subjectInput'].forEach(id=>$(id).oninput=updatePreview); $('templateSelect').onchange=applyTemplate; ['schoolFilter','nameFilter'].forEach(id=>$(id).oninput=renderStudents);  const refreshStudentsNow=async()=>{if(!confirm('生徒マスタから最新情報を取り込みますか？'))return; $('listCount').textContent='生徒情報を更新中…'; try{const r=await api.refreshStudents(); students=await api.getStudents(); localStorage.setItem('step_students_v314_roman', JSON.stringify(students)); selected.clear(); renderStudents(); alert('生徒情報を更新しました：'+(r.count||students.length)+'人');}catch(e){alert('更新エラー：'+e.message)}}; if($('refreshStudentsBtn')) $('refreshStudentsBtn').onclick=refreshStudentsNow; if($('refreshStudentsTopBtn')) $('refreshStudentsTopBtn').onclick=refreshStudentsNow; $('selectVisibleBtn').onclick=()=>{filtered().forEach(s=>selected.set(s.id,s));renderStudents()}; $('clearVisibleBtn').onclick=()=>{filtered().forEach(s=>selected.delete(s.id));renderStudents()}; $('invertVisibleBtn').onclick=()=>{filtered().forEach(s=>selected.has(s.id)?selected.delete(s.id):selected.set(s.id,s));renderStudents()}; $('clearAllSelectedBtn').onclick=()=>{selected.clear();renderStudents();updatePreview()}; if($('decideSelectionBtn')) $('decideSelectionBtn').onclick=decideSelection; $('clearGradeBtn').onclick=()=>{activeGrades.clear();renderGradeButtons();renderStudents()}; $('sortAscBtn').onclick=()=>{sortMode='asc';renderStudents()}; $('sortDescBtn').onclick=()=>{sortMode='desc';renderStudents()}; $('toggleBodyBtn').onclick=()=>$('bodyEditor').classList.toggle('hidden'); $('saveBodyBtn').onclick=updatePreview; $('sendBtn').onclick=send; $('fileInput').onchange=e=>{files=[...files,...e.target.files];renderFiles()}; const dz=$('dropZone'); dz.ondragover=e=>{e.preventDefault();dz.classList.add('drag')}; dz.ondragleave=()=>dz.classList.remove('drag'); dz.ondrop=e=>{e.preventDefault();dz.classList.remove('drag');files=[...files,...e.dataTransfer.files];renderFiles()}; $('absenceTab').onclick=()=>{$('absencePanel').classList.remove('hidden');$('historyPanel').classList.add('hidden');$('absenceTab').classList.add('active');$('historyTab').classList.remove('active')}; $('historyTab').onclick=()=>{$('historyPanel').classList.remove('hidden');$('absencePanel').classList.add('hidden');$('historyTab').classList.add('active');$('absenceTab').classList.remove('active');resetHistoryFilters();loadHistory()}; $('reloadHistory').onclick=()=>{showNormalHistoryControls();loadHistory()}; const clearHistBtn=$('clearHistorySearchBtn'); if(clearHistBtn) clearHistBtn.onclick=()=>{resetHistoryFilters();loadHistory()}; if($('refreshHistoryBtn')) $('refreshHistoryBtn').onclick=()=>loadHistory(); if($('showArchiveBtn')) $('showArchiveBtn').onclick=()=>{historyMode='archive';$('showArchiveBtn').classList.add('hidden');$('showNormalHistoryBtn').classList.remove('hidden');loadHistory()}; if($('showNormalHistoryBtn')) $('showNormalHistoryBtn').onclick=()=>{showNormalHistoryControls();loadHistory()}; const refreshAbsenceBtn=$('refreshAbsenceCacheBtn'); if(refreshAbsenceBtn) refreshAbsenceBtn.onclick=async()=>{refreshAbsenceBtn.disabled=true; refreshAbsenceBtn.textContent='更新中…'; try{const r=normalizeAbsenceSnapshot_(await api.refreshAbsences()); localStorage.setItem('step_absences_v313',JSON.stringify(r)); renderAbsences(r); alert('欠席連絡を更新しました：'+r.items.length+'件');}catch(e){alert('欠席連絡の更新エラー：'+e.message)} finally{refreshAbsenceBtn.disabled=false; refreshAbsenceBtn.textContent='欠席連絡を手動更新';}}; setInterval(()=>{loadAbsences().catch(()=>{})},300000); setInterval(()=>{loadAbsences({refreshSource:true}).catch(()=>{})},600000);});
