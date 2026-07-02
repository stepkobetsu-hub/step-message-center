// ==================================================
// STEP配信システム Code.gs Ver.20
// 生徒キャッシュ高速化対応
// ==================================================
const VERSION = 'Ver.21';
const SHEET_SETTING = '設定';
const SHEET_TEMPLATE = 'テンプレート';
const SHEET_HISTORY = '配信履歴';
const SHEET_STUDENT_CACHE = '生徒キャッシュ';
const SHEET_ABSENCE_CACHE = '欠席キャッシュ';
const MASTER_SHEET_NAME = '☆マスタ';
const DEFAULT_MASTER_ID = '1CIJkTlYUcUkbb8jBdFc6L8D5ubTGsxwNxFv01ten-Zk';
const DEFAULT_ABSENCE_ID = '1c2He5p_FMXGq0Gor74wIrJKtdBvTdjmO992ZkNSVuLQ';
const ABSENCE_SHEET_NAME = '★欠席遅刻';

function setupStepMailSystem(){const ss=SpreadsheetApp.getActiveSpreadsheet();ensureSetting_(ss);ensureTemplate_(ss);ensureHistory_(ss);ensureStudentCache_(ss);ensureAbsenceCache_(ss);refreshStudentCache();refreshAbsenceCache();installDailyStudentCacheTrigger();installAbsenceSubmitTrigger();SpreadsheetApp.getUi().alert('STEP配信システム '+VERSION+' 初期設定完了');}
function ensureSetting_(ss){let sh=ss.getSheetByName(SHEET_SETTING)||ss.insertSheet(SHEET_SETTING); if(sh.getLastRow()<1){sh.appendRow(['設定名','値']);sh.appendRow(['生徒マスタID',DEFAULT_MASTER_ID]);sh.appendRow(['欠席遅刻シートID',DEFAULT_ABSENCE_ID]);sh.appendRow(['神領校電話','0568-41-8937']);sh.appendRow(['大手町校電話','0568-27-9581']);sh.appendRow(['送信者名','個別指導STEP']);} else {const s=getSettings_(); if(!s['欠席遅刻シートID']) sh.appendRow(['欠席遅刻シートID',DEFAULT_ABSENCE_ID]);}}
function ensureTemplate_(ss){let sh=ss.getSheetByName(SHEET_TEMPLATE)||ss.insertSheet(SHEET_TEMPLATE); if(sh.getLastRow()<1){sh.appendRow(['ID','タイトル','件名','本文','使用','削除']); addDefaultTemplates_(sh);}}
function addDefaultTemplates_(sh){sh.appendRow(['mada','まだお見えになっておりません','まだお見えになっておりません',`{{生徒名}}さん\n\nお世話になります。\n★本日は　{{時間帯}}で授業です。★\nまだお見えになっておりません。\n\nご確認のほどよろしくお願いいたします。\n※ご連絡いただいてる方、行き違いなどご容赦ください。\n\nまた、ご欠席・遅刻される場合は、こちらよりご連絡いただけますと助かります。\nhttps://x.gd/WfTJM\n\n※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。\n\n個別指導ステップ`,true,'']);sh.appendRow(['tokkun','特訓部屋のお知らせ','特訓部屋のお知らせ',`{{生徒名}}さん\n\n★{{日付}}{{時間帯}}　★\nいつもお世話になっております。\n本日の確認テストの結果が不合格でした（2問以上間違えると不合格になります）。\n確認テストは前回指導内容の理解度の目安です。\nこのため別日程（上記日時）で特訓部屋に参加して、勉強内容の確認をさせていただきます。\n\n※ご都合が悪い場合、お手数ですが早めに教室まで「お電話」または「公式LINE」にてご連絡をいただけると幸いです。\n個別指導ステップ {{電話番号}}\n\n※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。`,true,'']);sh.appendRow(['free','自由記述','',`{{生徒名}}さん\n\n`,true,'']);}
function ensureHistory_(ss){let sh=ss.getSheetByName(SHEET_HISTORY)||ss.insertSheet(SHEET_HISTORY); if(sh.getLastRow()<1){sh.appendRow(['履歴ID','送信日時','送信日','テンプレートID','件名','本文','送信先','送信件数','案内日','案内曜日','案内時間','添付名','結果','表示']);}}
function getSettings_(){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SETTING); if(!sh) return {'生徒マスタID':DEFAULT_MASTER_ID,'欠席遅刻シートID':DEFAULT_ABSENCE_ID}; const v=sh.getDataRange().getValues(); const o={}; for(let i=1;i<v.length;i++) o[v[i][0]]=v[i][1]; return o;}
function jsonOut_(obj,cb){const txt=cb?`${cb}(${JSON.stringify(obj)});`:JSON.stringify(obj); return ContentService.createTextOutput(txt).setMimeType(cb?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON);}
function doGet(e){try{const a=e.parameter.action, cb=e.parameter.callback; let r; if(a==='getStudents')r=getStudentList(); else if(a==='getTemplates')r=getTemplates(); else if(a==='getHistory')r=getHistory(e.parameter); else if(a==='getAbsences')r=getAbsences(); else r={ok:true,version:VERSION}; return jsonOut_(r,cb);}catch(err){return jsonOut_({error:true,message:err.message},e.parameter.callback);}}
function doPost(e){try{const d=JSON.parse(e.postData.contents); let r; if(d.action==='refreshStudents')r=refreshStudentCache(); else if(d.action==='refreshAbsences')r=refreshAbsenceCache(); else if(d.action==='sendSelected')r=sendSelected_(d); else if(d.action==='archiveHistory')r=archiveHistory_(d.id); else if(d.action==='restoreHistory')r=restoreHistory_(d.id); else if(d.action==='deleteHistoryPermanent')r=deleteHistoryPermanent_(d.id); else if(d.action==='saveTemplate')r=saveTemplate_(d,false); else if(d.action==='saveTemplateAs')r=saveTemplate_(d,true); else if(d.action==='deleteTemplate')r=deleteTemplate_(d.id); else throw new Error('不明なactionです'); return jsonOut_(r);}catch(err){return jsonOut_({error:true,message:err.message});}}
function normalizeGrade_(g){return String(g||'').replace(/[０-９]/g,s=>String.fromCharCode(s.charCodeAt(0)-65248)).replace(/　| /g,'').trim();}
function ensureStudentCache_(ss){let sh=ss.getSheetByName(SHEET_STUDENT_CACHE)||ss.insertSheet(SHEET_STUDENT_CACHE); if(sh.getLastRow()<1){sh.appendRow(['生徒番号','生徒氏名','校舎','学年','メール1','メール2','更新日時']);}}
function refreshStudentCache(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(); ensureStudentCache_(ss);
  const s=getSettings_(); const masterSS=SpreadsheetApp.openById(s['生徒マスタID']||DEFAULT_MASTER_ID); const sh=masterSS.getSheetByName(MASTER_SHEET_NAME);
  const v=sh.getDataRange().getValues(); const h=v[0];
  const col={active:1,id:h.indexOf('生徒番号'),name:h.indexOf('生徒氏名'),school:h.indexOf('校舎'),grade:h.indexOf('学年'),mail1:h.indexOf('メールアドレス（保護者）'),mail2:h.indexOf('メールアドレス２')};
  const rows=[]; const now=new Date();
  for(let i=1;i<v.length;i++){const r=v[i], flag=r[col.active]; if(!(flag===1||flag===0||flag==='1'||flag==='0')) continue; if(!r[col.id]||!r[col.name])continue; if(!r[col.mail1]&&!r[col.mail2])continue; let school=r[col.school]; if(school==='神領')school='神領校'; if(school==='大手')school='大手町校'; rows.push([String(r[col.id]),String(r[col.name]),String(school||''),normalizeGrade_(r[col.grade]),String(r[col.mail1]||'').trim(),String(r[col.mail2]||'').trim(),now]);}
  const cache=ss.getSheetByName(SHEET_STUDENT_CACHE); cache.clearContents(); cache.appendRow(['生徒番号','生徒氏名','校舎','学年','メール1','メール2','更新日時']); if(rows.length) cache.getRange(2,1,rows.length,rows[0].length).setValues(rows);
  return {ok:true,count:rows.length,updatedAt:Utilities.formatDate(now,'Asia/Tokyo','yyyy/MM/dd HH:mm:ss')};
}
function installDailyStudentCacheTrigger(){
  ScriptApp.getProjectTriggers().forEach(t=>{if(t.getHandlerFunction()==='refreshStudentCache') ScriptApp.deleteTrigger(t);});
  ScriptApp.newTrigger('refreshStudentCache').timeBased().everyDays(1).atHour(5).create();
  return {ok:true};
}
function getStudentList(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(); ensureStudentCache_(ss); const sh=ss.getSheetByName(SHEET_STUDENT_CACHE);
  if(sh.getLastRow()<2) refreshStudentCache();
  const v=sh.getDataRange().getValues(); const out=[];
  for(let i=1;i<v.length;i++){const r=v[i]; if(!r[0]||!r[1])continue; out.push({id:String(r[0]),name:String(r[1]),school:String(r[2]||''),grade:String(r[3]||'')});}
  return out;
}
function getCachedStudentMap_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(); ensureStudentCache_(ss); const sh=ss.getSheetByName(SHEET_STUDENT_CACHE); if(sh.getLastRow()<2) refreshStudentCache();
  const v=sh.getDataRange().getValues(); const m={};
  for(let i=1;i<v.length;i++){const r=v[i]; if(!r[0])continue; m[String(r[0])]={id:String(r[0]),name:String(r[1]),school:String(r[2]||''),grade:String(r[3]||''),mail1:String(r[4]||'').trim(),mail2:String(r[5]||'').trim()};}
  return m;
}
function getTemplates(){ensureTemplate_(SpreadsheetApp.getActiveSpreadsheet()); const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TEMPLATE); const v=sh.getDataRange().getValues(); const out=[]; for(let i=1;i<v.length;i++){if(v[i][5])continue; if(v[i][4]===false||v[i][4]==='FALSE')continue; out.push({id:String(v[i][0]),name:String(v[i][1]),subject:String(v[i][2]||''),body:String(v[i][3]||'')});} return out;}
function phone_(school,s){if(school==='神領'||school==='神領校')return s['神領校電話']||''; if(school==='大手'||school==='大手町校')return s['大手町校電話']||''; return '';}
function sendSelected_(d){
  const s=getSettings_();
  const ids=(d.studentIds||[]).map(String);
  if(!ids.length)throw new Error('送信先が選択されていません');
  const studentMap=getCachedStudentMap_();
  let sent=0, names=[], errors=[], attNames=[], actualBodies=[];
  const attachments=(d.attachments||[]).map(a=>{attNames.push(a.name);return Utilities.newBlob(Utilities.base64Decode(a.data),a.type||MimeType.PLAIN_TEXT,a.name)});
  ids.forEach(id=>{
    const r=studentMap[String(id)];
    if(!r){errors.push('生徒ID '+id+'：キャッシュにありません');return;}
    const name=r.name, school=r.school, grade=r.grade;
    const to=[r.mail1,r.mail2].filter(Boolean).join(',');
    if(!to){errors.push(name+'：メールなし');return;}
    const body=String(d.body||'')
      .replaceAll('{{生徒名}}',name)
      .replaceAll('{{日付}}',d.dateText||'')
      .replaceAll('{{曜日}}',d.weekday||'')
      .replaceAll('{{時間帯}}',d.timeText||'')
      .replaceAll('{{電話番号}}',phone_(school,s));
    try{
      MailApp.sendEmail(to,d.subject||'',body,{name:s['送信者名']||'個別指導STEP',attachments:attachments.length?attachments:undefined});
      sent++;
      names.push(`${grade} ${name}さん`);
      actualBodies.push(`【${grade} ${name}さん 宛】
${body}`);
    }catch(e){
      errors.push(name+'：'+e.message);
    }
  });
  saveHistory_(d,names,sent,attNames,errors,actualBodies);
  return {ok:true,sentCount:sent,sentNames:names,errors};
}
function saveHistory_(d,names,sent,attNames,errors,actualBodies){
  ensureHistory_(SpreadsheetApp.getActiveSpreadsheet());
  const actualBody=(actualBodies&&actualBodies.length)?actualBodies.join('\n\n--------------------\n\n'):(d.body||'');
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HISTORY).appendRow([
    Utilities.getUuid(),new Date(),Utilities.formatDate(new Date(),'Asia/Tokyo','yyyy/MM/dd'),d.templateId||'',d.subject||'',actualBody,names.join('、'),sent,d.dateValue||'',d.weekday||'',d.timeText||'',attNames.join('、'),errors.length?errors.join('\n'):'OK',1
  ]);
}
function dateLabel_(date){if(!date)return''; const d=date instanceof Date?date:new Date(date); return Utilities.formatDate(d,'Asia/Tokyo','yyyy/MM/dd')+'（'+'日月火水木金土'.charAt(d.getDay())+'）';}
function safeDate_(v){
  if(v instanceof Date && !isNaN(v.getTime())) return v;
  if(typeof v === 'number' && isFinite(v)){
    if(v > 20000){
      const d=new Date(Math.round((v-25569)*86400*1000));
      if(!isNaN(d.getTime())) return d;
    }
    return null;
  }
  if(typeof v === 'string'){
    const t = v.trim();
    if(!t) return null;
    const d = new Date(t.replace(/\//g,'-'));
    if(!isNaN(d.getTime())) return d;
  }
  return null;
}
function getHistory(p){
  ensureHistory_(SpreadsheetApp.getActiveSpreadsheet());
  const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HISTORY);
  const v=sh.getDataRange().getValues();
  if(v.length<=1) return [];
  const out=[];
  const q=String(p.q||'').toLowerCase();
  const from=p.from?new Date(p.from+'T00:00:00'):null;
  const to=p.to?new Date(p.to+'T23:59:59'):null;

  for(let i=v.length-1;i>=1;i--){
    const r=v[i];
    // New schema: 履歴ID, 送信日時, 送信日, テンプレートID, 件名, 本文, 送信先, 送信件数, 案内日, 案内曜日, 案内時間, 添付名, 結果, 表示
    const wantArchived = String(p.archived||'') === '1';
    const isArchived = (r[13]===0 || r[13]==='0');
    if(wantArchived !== isArchived) continue;

    let sentAt=safeDate_(r[1]);
    if(sentAt && sentAt.getFullYear && sentAt.getFullYear()<2000) sentAt=safeDate_(r[2])||sentAt;
    let subject=String(r[4]||'');
    let body=String(r[5]||'');
    let targets=String(r[6]||'');
    let count=r[7]||'';
    let guideDate=r[8];
    let guideTime=String(r[10]||'');
    let templateId=String(r[3]||'');
    let id=String(r[0]||('row_'+i));

    // Legacy schema fallback: 送信日時, テンプレートID, 件名, 本文, 対象, 送信件数, 結果...
    if(!sentAt && safeDate_(r[0])){
      sentAt=safeDate_(r[0]);
      templateId=String(r[1]||'');
      subject=String(r[2]||'');
      body=String(r[3]||'');
      targets=String(r[4]||'');
      count=r[5]||'';
      id='legacy_'+i;
    }

    if(!sentAt) continue;
    if(from && sentAt<from) continue;
    if(to && sentAt>to) continue;

    const searchText=(subject+' '+targets+' '+body).toLowerCase();
    if(q && !searchText.includes(q)) continue;

    const isTokkun=templateId.includes('tokkun') || subject.includes('特訓');
    let titleLine=subject;
    if(isTokkun){
      let guide='';
      const gd=safeDate_(guideDate);
      if(gd) guide=dateLabel_(gd)+' '+guideTime;
      else if(String(guideDate||'').trim()) guide=String(guideDate)+' '+guideTime;
      titleLine=(subject||'特訓部屋のお知らせ')+(guide?'　'+guide:'');
    }

    out.push({
      id:id,
      sentDateLabel:dateLabel_(sentAt),
      titleLine:titleLine,
      targetLine:`${targets} / ${count}件`,
      body:body
    });
    if(out.length>=200) break;
  }
  return out;
}
function archiveHistory_(id){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HISTORY); const v=sh.getDataRange().getValues(); const legacy=String(id||'').match(/^legacy_(\d+)$/); if(legacy){const row=Number(legacy[1])+1; sh.getRange(row,14).setValue(0); return {ok:true};} for(let i=1;i<v.length;i++){if(String(v[i][0])===String(id)){sh.getRange(i+1,14).setValue(0);return{ok:true};}} return{ok:false};}
function restoreHistory_(id){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HISTORY); const v=sh.getDataRange().getValues(); const legacy=String(id||'').match(/^legacy_(\d+)$/); if(legacy){const row=Number(legacy[1])+1; sh.getRange(row,14).setValue(1); return {ok:true};} for(let i=1;i<v.length;i++){if(String(v[i][0])===String(id)){sh.getRange(i+1,14).setValue(1);return{ok:true};}} return{ok:false};}
function deleteHistoryPermanent_(id){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HISTORY); const v=sh.getDataRange().getValues(); const legacy=String(id||'').match(/^legacy_(\d+)$/); if(legacy){const row=Number(legacy[1])+1; sh.deleteRow(row); return {ok:true};} for(let i=1;i<v.length;i++){if(String(v[i][0])===String(id)){sh.deleteRow(i+1);return{ok:true};}} return{ok:false};}
function saveTemplate_(d,asNew){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TEMPLATE); let id=asNew||!d.id?'tpl_'+Date.now():d.id; const v=sh.getDataRange().getValues(); for(let i=1;i<v.length;i++){if(String(v[i][0])===String(id)){sh.getRange(i+1,2,1,4).setValues([[d.name,d.subject,d.body,true]]);return{ok:true,id};}} sh.appendRow([id,d.name,d.subject,d.body,true,'']); return{ok:true,id};}
function deleteTemplate_(id){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TEMPLATE); const v=sh.getDataRange().getValues(); for(let i=1;i<v.length;i++){if(String(v[i][0])===String(id)){sh.getRange(i+1,6).setValue(1);return{ok:true};}} return{ok:false};}

function ensureAbsenceCache_(ss){
  let sh=ss.getSheetByName(SHEET_ABSENCE_CACHE)||ss.insertSheet(SHEET_ABSENCE_CACHE);
  if(sh.getLastRow()<1){
    sh.appendRow(['日付','日付表示','本日','校舎','生徒名','理由','欠席遅刻','その他','元行','更新日時']);
  }
}

function refreshAbsenceCache(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(); ensureAbsenceCache_(ss);
  const s=getSettings_();
  const srcSS=SpreadsheetApp.openById(s['欠席遅刻シートID']||DEFAULT_ABSENCE_ID);
  const src=srcSS.getSheetByName(ABSENCE_SHEET_NAME);
  if(!src) throw new Error('欠席遅刻シート「'+ABSENCE_SHEET_NAME+'」が見つかりません。');
  const v=src.getDataRange().getValues();
  const today0=new Date(); today0.setHours(0,0,0,0);
  const rows=[]; const now=new Date();
  for(let i=1;i<v.length;i++){
    const r=v[i];
    const rawDate=r[3]; // D列：日付
    const date=safeDate_(rawDate);
    if(!date) continue;
    const d=new Date(date); d.setHours(0,0,0,0);
    if(d<today0) continue;
    rows.push([d,dateLabel_(d),d.getTime()===today0.getTime(),r[2]||'',r[1]||'',r[5]||'',r[6]||'',r[7]||'',i+1,now]);
  }
  rows.sort((a,b)=>a[0]-b[0] || String(a[4]).localeCompare(String(b[4]),'ja'));
  const cache=ss.getSheetByName(SHEET_ABSENCE_CACHE);
  cache.clearContents();
  cache.appendRow(['日付','日付表示','本日','校舎','生徒名','理由','欠席遅刻','その他','元行','更新日時']);
  if(rows.length) cache.getRange(2,1,rows.length,rows[0].length).setValues(rows);
  return {ok:true,count:rows.length,updatedAt:Utilities.formatDate(now,'Asia/Tokyo','yyyy/MM/dd HH:mm:ss')};
}

function installAbsenceSubmitTrigger(){
  const s=getSettings_();
  const absenceId=s['欠席遅刻シートID']||DEFAULT_ABSENCE_ID;
  ScriptApp.getProjectTriggers().forEach(t=>{
    if(t.getHandlerFunction()==='onAbsenceFormSubmit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onAbsenceFormSubmit').forSpreadsheet(absenceId).onFormSubmit().create();
  return {ok:true};
}

function onAbsenceFormSubmit(e){
  // フォーム回答が入ったら、欠席キャッシュを即時更新します。
  refreshAbsenceCache();
}

function getAbsences(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(); ensureAbsenceCache_(ss);
  const sh=ss.getSheetByName(SHEET_ABSENCE_CACHE);
  if(sh.getLastRow()<2) refreshAbsenceCache();
  const v=sh.getDataRange().getValues();
  const out=[];
  for(let i=1;i<v.length;i++){
    const r=v[i];
    if(!r[0]) continue;
    out.push({dateLabel:r[1]||dateLabel_(r[0]),isToday:r[2]===true||r[2]==='TRUE',school:r[3]||'',name:r[4]||'',reason:r[5]||'',kind:r[6]||'',other:r[7]||''});
  }
  return out;
}


function authorizeMailSystem(){MailApp.sendEmail({to:'mintcocoajasmine@gmail.com',subject:'STEP配信システム 権限確認',body:'このメールが届けば、メール送信権限は有効です。'});}
