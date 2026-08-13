// ==================================================
// STEP配信システム Code.gs Ver.31.2
// 安定化版：生徒キャッシュ・欠席キャッシュ高速化・履歴代表本文
// ==================================================
const VERSION = 'Ver.31.2';
const SHEET_SETTING = '設定';
const SHEET_TEMPLATE = 'テンプレート';
const SHEET_HISTORY = '配信履歴';
const SHEET_STUDENT_CACHE = '生徒キャッシュ';
const SHEET_MAIL_SETTING = 'メール設定';
const SHEET_ABSENCE_CACHE = '欠席キャッシュ';
const STUDENT_CACHE_HEADER = ['生徒番号','生徒氏名','フリガナ','校舎','学年','メール1','メール2','メール3','メール4','更新日時'];
const MASTER_SHEET_NAME = '☆マスタ';
const DEFAULT_MASTER_ID = '1CIJkTlYUcUkbb8jBdFc6L8D5ubTGsxwNxFv01ten-Zk';
const DEFAULT_ABSENCE_ID = '1c2He5p_FMXGq0Gor74wIrJKtdBvTdjmO992ZkNSVuLQ';
const ABSENCE_SHEET_NAME = '★欠席遅刻';
const STEP_MAIL_PROVIDER_MAILAPP = 'MAILAPP';
const STEP_MAIL_PROVIDER_BREVO = 'BREVO';
const STEP_MAIL_SOURCE = 'STEP_MESSAGE_CENTER';
const STEP_BREVO_FROM_EMAIL = 'admin@educrest.jp';
const STEP_TEST_ADMIN_EMAIL = 'mintcocoajasmine@gmail.com';
const STEP_SHARED_LOG_SS_PROPERTY = 'CHECKIN_LOG_SS_ID';
const STEP_SHARED_LOG_SHEET = 'ログ';
const STEP_DELIVERED_RETENTION_DAYS = 30;
const STEP_CLEANUP_MAX_ROWS = 500;
const STEP_BREVO_OPEN_WEBHOOK_TOKEN_PROPERTY = 'BREVO_OPEN_WEBHOOK_TOKEN';
const STEP_BREVO_OPEN_WEBHOOK_ID_PROPERTY = 'BREVO_OPEN_WEBHOOK_ID';
const STEP_BREVO_OPEN_WEBHOOK_DESCRIPTION = 'STEP配信システム 開封確認';

function setupStepMailSystem(){const ss=SpreadsheetApp.getActiveSpreadsheet();ensureSetting_(ss);ensureTemplate_(ss);ensureHistory_(ss);ensureStudentCache_(ss);ensureMailSetting_(ss);ensureAbsenceCache_(ss);refreshStudentCache();refreshAbsenceCache();installDailyStudentCacheTrigger();installAbsenceSubmitTrigger();SpreadsheetApp.getUi().alert('STEP配信システム '+VERSION+' 初期設定完了');}
function ensureSetting_(ss){let sh=ss.getSheetByName(SHEET_SETTING)||ss.insertSheet(SHEET_SETTING); if(sh.getLastRow()<1){sh.appendRow(['設定名','値']);sh.appendRow(['生徒マスタID',DEFAULT_MASTER_ID]);sh.appendRow(['欠席遅刻シートID',DEFAULT_ABSENCE_ID]);sh.appendRow(['神領校電話','0568-41-8937']);sh.appendRow(['大手町校電話','0568-27-9581']);sh.appendRow(['送信者名','個別指導STEP']);} else {const s=getSettings_(); if(!s['欠席遅刻シートID']) sh.appendRow(['欠席遅刻シートID',DEFAULT_ABSENCE_ID]);}}
function ensureTemplate_(ss){let sh=ss.getSheetByName(SHEET_TEMPLATE)||ss.insertSheet(SHEET_TEMPLATE); if(sh.getLastRow()<1){sh.appendRow(['ID','タイトル','件名','本文','使用','削除']); addDefaultTemplates_(sh);}}
function addDefaultTemplates_(sh){sh.appendRow(['mada','まだお見えになっておりません','まだお見えになっておりません',`{{生徒名}}さん\n\nお世話になります。\n★本日は　{{時間帯}}で授業です。★\nまだお見えになっておりません。\n\nご確認のほどよろしくお願いいたします。\n※ご連絡いただいてる方、行き違いなどご容赦ください。\n\nまた、ご欠席・遅刻される場合は、こちらよりご連絡いただけますと助かります。\nhttps://x.gd/WfTJM\n\n※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。\n\n個別指導ステップ`,true,'']);sh.appendRow(['tokkun','特訓部屋のお知らせ','特訓部屋のお知らせ',`{{生徒名}}さん\n\n★{{日付}}{{時間帯}}　★\nいつもお世話になっております。\n本日の確認テストの結果が不合格でした（2問以上間違えると不合格になります）。\n確認テストは前回指導内容の理解度の目安です。\nこのため別日程（上記日時）で特訓部屋に参加して、勉強内容の確認をさせていただきます。\n\n※ご都合が悪い場合、お手数ですが早めに教室まで「お電話」または「公式LINE」にてご連絡をいただけると幸いです。\n個別指導ステップ {{電話番号}}\n\n※ 本メールは送信専用です。ご返信いただいてもお答えできませんのでご了承ください。`,true,'']);sh.appendRow(['free','自由記述','',`{{生徒名}}さん\n\n`,true,'']);}
function ensureHistory_(ss){let sh=ss.getSheetByName(SHEET_HISTORY)||ss.insertSheet(SHEET_HISTORY); const headers=['履歴ID','送信日時','送信日','テンプレートID','件名','本文','送信先','送信件数','案内日','案内曜日','案内時間','添付名','結果','表示','送信要求ID']; if(sh.getLastRow()<1){sh.appendRow(headers);return sh;} const current=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),headers.length)).getValues()[0].map(String); headers.forEach(h=>{if(current.indexOf(h)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(h);current.push(h);}}); return sh;}
function getSettings_(){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SETTING); if(!sh) return {'生徒マスタID':DEFAULT_MASTER_ID,'欠席遅刻シートID':DEFAULT_ABSENCE_ID}; const v=sh.getDataRange().getValues(); const o={}; for(let i=1;i<v.length;i++) o[v[i][0]]=v[i][1]; return o;}

function getPublicSettings_(){
  const s=getSettings_();
  return {
    '神領校電話': s['神領校電話'] || '0568-41-8937',
    '大手町校電話': s['大手町校電話'] || '0568-27-9581',
    '送信者名': s['送信者名'] || '個別指導STEP'
  };
}
function saveSettings_(settings){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const sh=ss.getSheetByName(SHEET_SETTING)||ss.insertSheet(SHEET_SETTING);
  if(sh.getLastRow()<1) sh.appendRow(['設定名','値']);
  const current=sh.getDataRange().getValues();
  const rowMap={};
  for(let i=1;i<current.length;i++) rowMap[current[i][0]]=i+1;
  ['神領校電話','大手町校電話','送信者名'].forEach(k=>{
    if(settings[k]===undefined) return;
    if(rowMap[k]) sh.getRange(rowMap[k],2).setValue(settings[k]);
    else sh.appendRow([k,settings[k]]);
  });
  return {ok:true};
}
function fullDateForBody_(dateValue, dateText, weekday){
  if(dateValue){
    const d=safeDate_(dateValue);
    if(d){
      return (d.getMonth()+1)+'月'+d.getDate()+'日（'+'日月火水木金土'.charAt(d.getDay())+'）';
    }
  }
  let t=String(dateText||'').trim();
  if(!t) return '';
  if(/[（(][日月火水木金土][）)]/.test(t)) return t;
  return weekday ? t+'（'+weekday+'）' : t;
}
function jsonOut_(obj,cb){const txt=cb?`${cb}(${JSON.stringify(obj)});`:JSON.stringify(obj); return ContentService.createTextOutput(txt).setMimeType(cb?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON);}
function doGet(e){try{const a=e.parameter.action, cb=e.parameter.callback; let r; if(a==='getStudents')r=getStudentList(); else if(a==='getMailSettings')r=getMailSettings_(e.parameter); else if(a==='getTemplates')r=getTemplates(); else if(a==='getSettings')r=getPublicSettings_(); else if(a==='getHistory')r=getHistory(e.parameter); else if(a==='getAbsences')r=getAbsences(); else if(a==='investigateSend')r=investigateStepSend_(e.parameter.requestId); else r={ok:true,version:VERSION}; return jsonOut_(r,cb);}catch(err){return jsonOut_({error:true,message:err.message},e.parameter.callback);}}
function doPost(e){try{const route=String(e&&e.parameter&&e.parameter.action||''); const d=JSON.parse(e.postData.contents); let r; if(route==='brevoOpenWebhook')r=handleStepBrevoOpenWebhook_(d,String(e.parameter.token||'')); else if(d.action==='saveSettings')r=saveSettings_(d.settings||{}); else if(d.action==='saveStudentMailSetting')r=saveStudentMailSetting_(d); else if(d.action==='refreshStudents')r=refreshStudentCache(); else if(d.action==='refreshAbsences')r=refreshAbsenceCache(); else if(d.action==='sendSelected')r=sendSelected_(d); else if(d.action==='archiveHistory')r=archiveHistory_(d.id); else if(d.action==='restoreHistory')r=restoreHistory_(d.id); else if(d.action==='deleteHistoryPermanent')r=deleteHistoryPermanent_(d.id); else if(d.action==='saveTemplate')r=saveTemplate_(d,false); else if(d.action==='saveTemplateAs')r=saveTemplate_(d,true); else if(d.action==='deleteTemplate')r=deleteTemplate_(d.id); else throw new Error('不明なactionです'); return jsonOut_(r);}catch(err){return jsonOut_({error:true,message:err.message});}}
function normalizeGrade_(g){return String(g||'').replace(/[０-９]/g,s=>String.fromCharCode(s.charCodeAt(0)-65248)).replace(/　| /g,'').trim();}
function ensureStudentCache_(ss){
  let sh=ss.getSheetByName(SHEET_STUDENT_CACHE)||ss.insertSheet(SHEET_STUDENT_CACHE);
  if(sh.getLastRow()<1){sh.appendRow(STUDENT_CACHE_HEADER);return sh;}
  const h=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),STUDENT_CACHE_HEADER.length)).getValues()[0];
  const needsUpdate=STUDENT_CACHE_HEADER.some((name,i)=>h[i]!==name);
  if(needsUpdate){
    sh.clearContents();
    sh.appendRow(STUDENT_CACHE_HEADER);
  }
  return sh;
}
function ensureMailSetting_(ss){let sh=ss.getSheetByName(SHEET_MAIL_SETTING)||ss.insertSheet(SHEET_MAIL_SETTING); if(sh.getLastRow()<1){sh.appendRow(['生徒番号','生徒氏名','校舎','学年','メール1配信','メール2配信','メール3配信','メール4配信','更新日時']);}}
function boolSetting_(v,def){if(v===true||v==='TRUE'||v==='true'||v===1||v==='1')return true; if(v===false||v==='FALSE'||v==='false'||v===0||v==='0')return false; return def;}
function getMailEnabledMap_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(); ensureMailSetting_(ss); const sh=ss.getSheetByName(SHEET_MAIL_SETTING);
  const v=sh.getDataRange().getValues(); const m={};
  for(let i=1;i<v.length;i++){const r=v[i]; if(!r[0])continue; m[String(r[0])]=[boolSetting_(r[4],true),boolSetting_(r[5],true),boolSetting_(r[6],true),boolSetting_(r[7],true)];}
  return m;
}
function upsertMailSetting_(student,enabled){
  const ss=SpreadsheetApp.getActiveSpreadsheet(); ensureMailSetting_(ss); const sh=ss.getSheetByName(SHEET_MAIL_SETTING);
  const v=sh.getDataRange().getValues(); const id=String(student.id||''); const e=enabled||[true,true,true,true];
  const row=[id,student.name||'',student.school||'',student.grade||'',e[0]!==false,e[1]!==false,e[2]!==false,e[3]!==false,new Date()];
  for(let i=1;i<v.length;i++){if(String(v[i][0])===id){sh.getRange(i+1,1,1,row.length).setValues([row]);return;}}
  sh.appendRow(row);
}
function refreshStudentCache(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(); ensureStudentCache_(ss);
  const s=getSettings_(); const masterSS=SpreadsheetApp.openById(s['生徒マスタID']||DEFAULT_MASTER_ID); const sh=masterSS.getSheetByName(MASTER_SHEET_NAME);
  const v=sh.getDataRange().getValues(); const h=v[0];
  const col={active:1,id:0,name:4,kana:5,school:h.indexOf('校舎'),grade:h.indexOf('学年'),mail1:h.indexOf('メールアドレス（保護者）'),mail2:52,mail3:53,mail4:54};
  const rows=[]; const now=new Date();
  for(let i=1;i<v.length;i++){const r=v[i], flag=r[col.active]; if(!(flag===1||flag===0||flag==='1'||flag==='0')) continue; if(!r[col.id]||!r[col.name])continue; let school=r[col.school]; if(school==='神領')school='神領校'; if(school==='大手')school='大手町校'; rows.push([String(r[col.id]),String(r[col.name]),String(r[col.kana]||''),String(school||''),normalizeGrade_(r[col.grade]),String(r[col.mail1]||'').trim(),String(r[col.mail2]||'').trim(),String(r[col.mail3]||'').trim(),String(r[col.mail4]||'').trim(),now]);}
  const cache=ss.getSheetByName(SHEET_STUDENT_CACHE); cache.clearContents(); cache.appendRow(STUDENT_CACHE_HEADER); if(rows.length) cache.getRange(2,1,rows.length,rows[0].length).setValues(rows);
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
  for(let i=1;i<v.length;i++){const r=v[i]; if(!r[0]||!r[1])continue; out.push({id:String(r[0]),name:String(r[1]),kana:String(r[2]||''),school:String(r[3]||''),grade:String(r[4]||'')});}
  return out;
}
function getCachedStudentMap_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(); const sh=ensureStudentCache_(ss); if(sh.getLastRow()<2) refreshStudentCache();
  const v=sh.getDataRange().getValues(); const m={};
  for(let i=1;i<v.length;i++){const r=v[i]; if(!r[0])continue; m[String(r[0])]={id:String(r[0]),name:String(r[1]),kana:String(r[2]||''),school:String(r[3]||''),grade:String(r[4]||''),mail1:String(r[5]||'').trim(),mail2:String(r[6]||'').trim(),mail3:String(r[7]||'').trim(),mail4:String(r[8]||'').trim()};}
  return m;
}
function getMailSettings_(p){
  refreshStudentCache();
  const ss=SpreadsheetApp.getActiveSpreadsheet(); ensureStudentCache_(ss); ensureMailSetting_(ss);
  const q=String((p&&p.q)||'').toLowerCase().trim();
  const enabledMap=getMailEnabledMap_();
  const students=getCachedStudentMap_();
  return Object.keys(students).map(id=>{
    const s=students[id], enabled=enabledMap[id]||[true,true,true,true];
    return {id:s.id,name:s.name,school:s.school,grade:s.grade,mail1:s.mail1,mail2:s.mail2,mail3:s.mail3,mail4:s.mail4,enabled};
  }).filter(s=>!q||s.id.toLowerCase().includes(q)||s.name.toLowerCase().includes(q)||s.school.toLowerCase().includes(q));
}
function findMasterRowByStudentId_(sh,id,idCol){
  const last=sh.getLastRow(); if(last<2)return 0;
  const vals=sh.getRange(2,idCol+1,last-1,1).getValues();
  for(let i=0;i<vals.length;i++){if(String(vals[i][0])===String(id))return i+2;}
  return 0;
}
function saveStudentMailSetting_(d){
  const id=String(d.id||'').trim(); if(!id)throw new Error('生徒番号がありません');
  const enabled=(d.enabled||[true,true,true,true]).map(x=>x!==false);
  const s=getSettings_(); const masterSS=SpreadsheetApp.openById(s['生徒マスタID']||DEFAULT_MASTER_ID); const sh=masterSS.getSheetByName(MASTER_SHEET_NAME);
  const h=sh.getDataRange().getValues()[0];
  const col={id:h.indexOf('生徒番号'),mail2:52,mail3:53,mail4:54};
  if(col.id<0)throw new Error('生徒マスタに「生徒番号」列が見つかりません');
  const row=findMasterRowByStudentId_(sh,id,col.id);
  if(!row)throw new Error('生徒番号 '+id+' が生徒マスタに見つかりません');
  sh.getRange(row,col.mail2+1,1,3).setValues([[String(d.mail2||'').trim(),String(d.mail3||'').trim(),String(d.mail4||'').trim()]]);
  refreshStudentCache();
  const student=getCachedStudentMap_()[id]||{id:id,name:d.name||'',school:d.school||'',grade:d.grade||''};
  upsertMailSetting_(student,enabled);
  return {ok:true,item:getMailSettings_({q:id}).find(x=>x.id===id)};
}
function getTemplates(){ensureTemplate_(SpreadsheetApp.getActiveSpreadsheet()); const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TEMPLATE); const v=sh.getDataRange().getValues(); const out=[]; for(let i=1;i<v.length;i++){if(v[i][5])continue; if(v[i][4]===false||v[i][4]==='FALSE')continue; out.push({id:String(v[i][0]),name:String(v[i][1]),subject:String(v[i][2]||''),body:String(v[i][3]||'')});} return out;}
function phone_(school,s){if(school==='神領'||school==='神領校')return s['神領校電話']||''; if(school==='大手'||school==='大手町校')return s['大手町校電話']||''; return '';}
function sendSelected_(d){
  const s=getSettings_();
  const ids=(d.studentIds||[]).map(String);
  if(!ids.length) throw new Error('送信先が選択されていません');

  const studentMap=getCachedStudentMap_();
  const mailEnabledMap=getMailEnabledMap_();
  let sent=0, names=[], errors=[], attNames=[];

  const attachments=(d.attachments||[]).map(a=>{
    attNames.push(a.name);
    return Utilities.newBlob(Utilities.base64Decode(a.data), a.type || MimeType.PLAIN_TEXT, a.name);
  });

  let representativeBody='';

  ids.forEach(id=>{
    const r=studentMap[String(id)];
    if(!r){ errors.push('生徒ID '+id+'：キャッシュにありません'); return; }

    const name=r.name, school=r.school, grade=r.grade;
    const enabled=mailEnabledMap[String(id)]||[true,true,true,true];
    const recipients=[...new Set([r.mail1,r.mail2,r.mail3,r.mail4].filter((x,i)=>enabled[i]!==false&&String(x||'').trim()).map(x=>String(x).trim()))];
    if(!recipients.length){ errors.push(name+'：メールなし'); return; }

    const dateFull = fullDateForBody_(d.dateValue, d.dateText, d.weekday);
    const body=String(d.body||'')
      .replaceAll('{{日付}}（{{曜日}}）', dateFull)
      .replaceAll('{{日付}}{{曜日}}', dateFull)
      .replaceAll('{{生徒名}}',name)
      .replaceAll('{{日付}}', dateFull)
      .replaceAll('{{曜日}}',d.weekday||'')
      .replaceAll('{{時間帯}}',d.timeText||'')
      .replaceAll('{{電話番号}}',phone_(school,s));

    if(!representativeBody) representativeBody = body;

    const options={name:s['送信者名']||'個別指導STEP'};
    if(attachments.length) options.attachments=attachments;

    // 1つの不正アドレスで全体が止まらないよう、宛先ごとに送信する
    let oneSuccess=false;
    recipients.forEach(to=>{
      try{
        const result=sendStepMail_(to,d.subject||'',body,options,d.attachments||[],{
          studentId:id,studentName:name,school:school,templateId:d.templateId||'',sendRequestId:d.sendRequestId||''
        });
        if(!result.accepted) throw new Error(result.error||'送信できませんでした');
        oneSuccess=true;
      }catch(e){
        errors.push(name+'（'+to+'）：'+e.message);
      }
    });

    if(oneSuccess){
      sent++;
      names.push(`${grade} ${name}さん`);
    }
  });

  saveHistory_(d,names,sent,attNames,errors,representativeBody);
  return {ok:true,sentCount:sent,sentNames:names,errors};
}

function getStepMailProvider_(){
  const value=String(getSettings_()['メール送信方式']||STEP_MAIL_PROVIDER_MAILAPP).trim().toUpperCase();
  if(value!==STEP_MAIL_PROVIDER_MAILAPP&&value!==STEP_MAIL_PROVIDER_BREVO) throw new Error('設定シートの「メール送信方式」は MAILAPP または BREVO を指定してください');
  return value;
}

function normalizeStepBrevoMessageId_(value){return String(value||'').trim().replace(/^<+|>+$/g,'').trim().toLowerCase();}

function stepMailType_(templateId,subject){
  const id=String(templateId||'').toLowerCase(), text=String(subject||'');
  if(id==='mada'||text.includes('まだお見え')||text.includes('未到着'))return '未到着連絡';
  if(text.includes('欠席')||text.includes('遅刻'))return '欠席連絡';
  if(id.includes('tokkun')||text.includes('特訓'))return '特訓案内';
  if(text.includes('公開模試')||text.includes('模試'))return '公開模試';
  if(text.includes('締切'))return '締切案内';
  if(text.includes('休校'))return '休校案内';
  if(id==='free')return '自由記述';
  return 'その他';
}

function sendStepMail_(to,subject,body,mailAppOptions,rawAttachments,meta){
  const provider=getStepMailProvider_();
  if(provider===STEP_MAIL_PROVIDER_MAILAPP){
    MailApp.sendEmail(to,subject,body,mailAppOptions||{});
    return {accepted:true,provider:provider,messageId:'',sendResult:'sent_mailapp'};
  }
  return sendStepMailViaBrevo_(to,subject,body,mailAppOptions,rawAttachments,meta||{});
}

function sendStepMailViaBrevo_(to,subject,body,options,attachments,meta){
  const props=PropertiesService.getScriptProperties();
  const apiKey=props.getProperty('BREVO_API_KEY');
  if(!apiKey) throw new Error('BREVO_API_KEY がScript Propertiesに設定されていません');
  const correlationId=Utilities.getUuid();
  const payload={
    sender:{name:(options&&options.name)||'個別指導STEP',email:STEP_BREVO_FROM_EMAIL},
    to:[{email:String(to),name:(meta&&meta.studentName)||String(to)}],
    subject:String(subject||''),
    htmlContent:escapeStepHtml_(body).replace(/\r?\n/g,'<br>'),
    tags:['step-message-center',stepMailType_(meta.templateId,subject)],
    headers:{'X-Mailin-custom':'correlation_id:'+correlationId}
  };
  const replyTo=String(getSettings_()['返信先メール']||'').trim();
  if(replyTo) payload.replyTo={email:replyTo};
  if(attachments&&attachments.length) payload.attachment=attachments.map(a=>({content:String(a.data||''),name:String(a.name||'attachment')}));
  const response=UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email',{method:'post',contentType:'application/json',headers:{'api-key':apiKey,'accept':'application/json'},payload:JSON.stringify(payload),muteHttpExceptions:true});
  const status=response.getResponseCode();
  let parsed={}; try{parsed=JSON.parse(response.getContentText()||'{}');}catch(ignore){}
  if(status<200||status>=300) return {accepted:false,provider:STEP_MAIL_PROVIDER_BREVO,messageId:'',sendResult:'error',error:'Brevo送信失敗 ('+status+'): '+response.getContentText(),httpStatus:status,correlationId:correlationId};
  const messageId=normalizeStepBrevoMessageId_(parsed.messageId);
  const result={accepted:true,provider:STEP_MAIL_PROVIDER_BREVO,messageId:messageId,sendResult:messageId?'sent':'sent_without_message_id',httpStatus:status,correlationId:correlationId};
  const trackingRecord={sentAt:new Date(),mailType:stepMailType_(meta.templateId,subject),studentId:meta.studentId||'',studentName:meta.studentName||'',school:meta.school||'',email:to,subject:subject,messageId:messageId,sendResult:result.sendResult,correlationId:correlationId,sendRequestId:meta.sendRequestId||''};
  try{
    appendStepSharedMailLog_(trackingRecord);
    stepTrackingRecordRecipient_(trackingRecord);
  }catch(trackingError){
    // ログ連携の障害で、既に成功したBrevo送信を失敗扱いにしない。
    Logger.log('STEP mail tracking skipped: '+String(trackingError&&trackingError.message||trackingError));
  }
  return result;
}

function escapeStepHtml_(value){return String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

function getStepSharedLogSheet_(){
  const ssId=String(PropertiesService.getScriptProperties().getProperty(STEP_SHARED_LOG_SS_PROPERTY)||'').trim();
  if(!ssId) throw new Error(STEP_SHARED_LOG_SS_PROPERTY+' がScript Propertiesに設定されていません');
  const ss=SpreadsheetApp.openById(ssId);
  const sh=ss.getSheetByName(STEP_SHARED_LOG_SHEET);
  if(!sh) throw new Error('共通ログシート「'+STEP_SHARED_LOG_SHEET+'」が見つかりません');
  ensureStepSharedLogHeaders_(sh);
  return sh;
}

function ensureStepSharedLogHeaders_(sh){
  const required=['BrevoメッセージID','照合ID','配信状態','最終イベント日時','最終配信成功日時','最終エラー理由','配信状態更新日時','送信元システム','送信種別','件名','送信時結果','送信要求ID','初回開封日時','最終開封日時','開封回数','最終開封イベントキー'];
  const width=Math.max(sh.getLastColumn(),7), headers=sh.getRange(1,1,1,width).getValues()[0].map(String);
  required.forEach(h=>{if(headers.indexOf(h)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(h);headers.push(h);}});
  return headers;
}

function appendStepSharedMailLog_(record){
  const sh=getStepSharedLogSheet_(), headers=ensureStepSharedLogHeaders_(sh), row=new Array(headers.length).fill('');
  const set=(name,value)=>{const i=headers.indexOf(name);if(i>=0)row[i]=value;};
  set('タイムスタンプ',record.sentAt);set('生徒番号',record.studentId);set('生徒氏名',record.studentName);set('種別',record.mailType);set('校舎',record.school);set('メール送信結果',record.sendResult);set('送信先メール',record.email);
  set('BrevoメッセージID',record.messageId);set('照合ID',record.correlationId);set('配信状態','送信受付');set('配信状態更新日時',record.sentAt);set('送信元システム',STEP_MAIL_SOURCE);set('送信種別',record.mailType);set('件名',record.subject);set('送信時結果',record.sendResult);set('送信要求ID',record.sendRequestId);
  sh.appendRow(row);
}

function stepBrevoWebhookEventDate_(event){
  const epoch=Number(event&&event.ts_epoch); if(epoch>0)return new Date(epoch);
  const seconds=Number(event&&(event.ts_event||event.ts)); if(seconds>0)return new Date(seconds*1000);
  const parsed=safeDate_(event&&event.date); return parsed||new Date();
}

function stepBrevoOpenEventKey_(event,messageId,openedAt){
  return [String(event&&event.id||''),messageId,String(event&&event.ts_event||event&&event.ts_epoch||openedAt.getTime())].join(':');
}

function handleStepBrevoOpenWebhook_(payload,token){
  const props=PropertiesService.getScriptProperties();
  const expected=String(props.getProperty(STEP_BREVO_OPEN_WEBHOOK_TOKEN_PROPERTY)||'');
  if(!expected||String(token||'')!==expected) throw new Error('Webhook認証に失敗しました');
  const events=Array.isArray(payload)?payload:[payload], opens=events.filter(event=>/^(opened|uniqueopened|unique_opened)$/i.test(String(event&&event.event||'')));
  if(!opens.length)return {ok:true,updated:0,ignored:events.length};
  const sh=getStepSharedLogSheet_(), headers=ensureStepSharedLogHeaders_(sh);
  if(sh.getLastRow()<2)return {ok:true,updated:0,notFound:opens.length};
  const firstRow=Math.max(2,sh.getLastRow()-4999), rowCount=sh.getLastRow()-firstRow+1;
  const values=sh.getRange(firstRow,1,rowCount,headers.length).getValues();
  const idx=name=>headers.indexOf(name), updates=[], missing=[];
  opens.forEach(event=>{
    const messageId=normalizeStepBrevoMessageId_(event['message-id']||event.messageId||'');
    const email=String(event.email||'').trim().toLowerCase();
    const openedAt=stepBrevoWebhookEventDate_(event), eventKey=stepBrevoOpenEventKey_(event,messageId,openedAt);
    let found=-1;
    for(let i=values.length-1;i>=0;i--){
      const rowMessageId=normalizeStepBrevoMessageId_(values[i][idx('BrevoメッセージID')]);
      const rowEmail=String(values[i][idx('送信先メール')]||'').trim().toLowerCase();
      if(messageId&&rowMessageId===messageId&&(!email||!rowEmail||email===rowEmail)){found=i;break;}
    }
    if(found<0){missing.push(messageId||'message-idなし');return;}
    const row=values[found];
    if(String(row[idx('最終開封イベントキー')]||'')===eventKey)return;
    if(!row[idx('初回開封日時')])row[idx('初回開封日時')]=openedAt;
    row[idx('最終開封日時')]=openedAt;
    row[idx('開封回数')]=Math.max(0,Number(row[idx('開封回数')])||0)+1;
    row[idx('最終開封イベントキー')]=eventKey;
    updates.push({row:firstRow+found,values:row});
  });
  updates.forEach(update=>sh.getRange(update.row,1,1,headers.length).setValues([update.values]));
  return {ok:true,updated:updates.length,notFound:missing.length};
}

function setupStepBrevoOpenWebhook(){
  const props=PropertiesService.getScriptProperties(), apiKey=String(props.getProperty('BREVO_API_KEY')||'').trim();
  if(!apiKey)throw new Error('BREVO_API_KEY がScript Propertiesに設定されていません');
  let token=String(props.getProperty(STEP_BREVO_OPEN_WEBHOOK_TOKEN_PROPERTY)||'').trim();
  if(!token){token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');props.setProperty(STEP_BREVO_OPEN_WEBHOOK_TOKEN_PROPERTY,token);}
  const serviceUrl=ScriptApp.getService().getUrl();
  if(!serviceUrl||!/\/exec(?:$|\?)/.test(serviceUrl))throw new Error('先に既存Webアプリを新バージョンへデプロイしてください');
  const webhookUrl=serviceUrl+(serviceUrl.includes('?')?'&':'?')+'action=brevoOpenWebhook&token='+encodeURIComponent(token);
  const storedId=String(props.getProperty(STEP_BREVO_OPEN_WEBHOOK_ID_PROPERTY)||'').trim();
  const request={url:webhookUrl,description:STEP_BREVO_OPEN_WEBHOOK_DESCRIPTION,events:['opened'],type:'transactional'};
  const call=(url,method)=>UrlFetchApp.fetch(url,{method:method,contentType:'application/json',headers:{'api-key':apiKey,'accept':'application/json'},payload:JSON.stringify(request),muteHttpExceptions:true});
  let response=storedId?call('https://api.brevo.com/v3/webhooks/'+encodeURIComponent(storedId),'put'):null;
  if(!response||response.getResponseCode()===404)response=call('https://api.brevo.com/v3/webhooks','post');
  const status=response.getResponseCode(); let data={}; try{data=JSON.parse(response.getContentText()||'{}');}catch(ignore){}
  if(status<200||status>=300)throw new Error('Brevo Webhook設定失敗 ('+status+'): '+response.getContentText());
  const webhookId=String(data.id||storedId||''); if(webhookId)props.setProperty(STEP_BREVO_OPEN_WEBHOOK_ID_PROPERTY,webhookId);
  return {ok:true,webhookId:webhookId,event:'opened',description:STEP_BREVO_OPEN_WEBHOOK_DESCRIPTION};
}

function getStepOpenStatusByRequestIds_(requestIds){
  const wanted=new Set((requestIds||[]).map(String).filter(Boolean)), result={}; if(!wanted.size)return result;
  let sh,headers; try{sh=getStepSharedLogSheet_();headers=ensureStepSharedLogHeaders_(sh);}catch(ignore){return result;}
  if(sh.getLastRow()<2)return result;
  const firstRow=Math.max(2,sh.getLastRow()-1999), values=sh.getRange(firstRow,1,sh.getLastRow()-firstRow+1,headers.length).getValues(), idx=name=>headers.indexOf(name);
  values.forEach(row=>{
    const requestId=String(row[idx('送信要求ID')]||''); if(!wanted.has(requestId)||String(row[idx('送信元システム')]||'')!==STEP_MAIL_SOURCE)return;
    if(!result[requestId])result[requestId]={recipientCount:0,openedCount:0,lastOpenedAt:null,details:[]};
    const item=result[requestId], opened=safeDate_(row[idx('初回開封日時')]), last=safeDate_(row[idx('最終開封日時')]);
    item.recipientCount++; if(opened)item.openedCount++; if(last&&(!item.lastOpenedAt||last>item.lastOpenedAt))item.lastOpenedAt=last;
    item.details.push({studentName:String(row[idx('生徒氏名')]||'送信先'),opened:!!opened,openedAt:opened?dateTimeLabel_(opened):''});
  });
  Object.keys(result).forEach(id=>{const item=result[id];item.summary=item.openedCount?'開封確認あり '+item.openedCount+'/'+item.recipientCount:'開封確認なし 0/'+item.recipientCount;item.lastOpenedLabel=item.lastOpenedAt?dateTimeLabel_(item.lastOpenedAt):'';delete item.lastOpenedAt;});
  return result;
}

function investigateStepSend_(requestId){
  const id=String(requestId||'').trim();
  if(!/^step-[a-z0-9-]{12,100}$/i.test(id)) throw new Error('送信照合IDが正しくありません');
  const sh=getStepSharedLogSheet_(), headers=ensureStepSharedLogHeaders_(sh);
  if(sh.getLastRow()<2)return {ok:true,found:false,requestId:id,items:[]};
  const idx=name=>headers.indexOf(name);
  const values=sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues();
  const items=[];
  for(let i=values.length-1;i>=0;i--){
    const row=values[i];
    if(String(row[idx('送信要求ID')]||'')!==id)continue;
    if(String(row[idx('送信元システム')]||'')!==STEP_MAIL_SOURCE)continue;
    const state=String(row[idx('配信状態')]||row[idx('メール送信結果')]||'送信受付');
    const stamp=row[idx('タイムスタンプ')];
    items.push({sentAt:stamp instanceof Date?Utilities.formatDate(stamp,'Asia/Tokyo','yyyy/MM/dd HH:mm:ss'):String(stamp||''),studentName:String(row[idx('生徒氏名')]||''),mailType:String(row[idx('送信種別')]||row[idx('種別')]||''),state:state,error:String(row[idx('最終エラー理由')]||''),delivered:/配信完了|送信完了|delivered|sent/i.test(state)});
  }
  return {ok:true,found:items.length>0,requestId:id,items:items};
}

function testStepBrevoMailToAdministrator(adminEmail){
  const email=String(adminEmail||'').trim();
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('管理者メールアドレスを1件指定してください');
  if(getStepMailProvider_()!==STEP_MAIL_PROVIDER_MAILAPP) throw new Error('本番切替前テストのため、設定シートの「メール送信方式」は MAILAPP のまま実行してください');
  const subject='STEP配信 Brevo連携テスト';
  const body='STEP配信システムのBrevo連携テストです。\n日本語表示とHTML改行を確認してください。';
  const result=sendStepMailViaBrevo_(email,subject,body,{name:'個別指導STEP'},[],{studentId:'TEST',studentName:'管理者テスト',school:'テスト',templateId:'test'});
  return {ok:result.accepted,to:email,from:STEP_BREVO_FROM_EMAIL,subject:subject,messageId:result.messageId,sendResult:result.sendResult,providerAfterTest:getStepMailProvider_()};
}

function testStepBrevoMailToConfiguredAdministrator(){
  const result=testStepBrevoMailToAdministrator(STEP_TEST_ADMIN_EMAIL);
  Logger.log(JSON.stringify({ok:result.ok,from:result.from,subject:result.subject,messageId:result.messageId,sendResult:result.sendResult,providerAfterTest:result.providerAfterTest}));
  return result;
}

function cleanupDeliveredMailLogs_(){
  const sh=getStepSharedLogSheet_(); if(sh.getLastRow()<2)return {ok:true,deleted:0};
  const headers=ensureStepSharedLogHeaders_(sh), rows=sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues();
  const idx=n=>headers.indexOf(n), cutoff=Date.now()-STEP_DELIVERED_RETENTION_DAYS*86400000, targets=[];
  for(let i=rows.length-1;i>=0&&targets.length<STEP_CLEANUP_MAX_ROWS;i--){
    const r=rows[i], state=String(r[idx('配信状態')]||'').toLowerCase(), source=String(r[idx('送信元システム')]||''), updated=r[idx('配信状態更新日時')], d=updated instanceof Date?updated:new Date(updated);
    if(source===STEP_MAIL_SOURCE&&state==='delivered'&&!isNaN(d.getTime())&&d.getTime()<cutoff){
      const email=r[idx('送信先メール')], studentId=r[idx('生徒番号')];
      if(!stepTrackingHasProtectedFailure_(email,studentId)) targets.push(i+2);
    }
  }
  targets.forEach(row=>sh.deleteRow(row));
  return {ok:true,deleted:targets.length,limit:STEP_CLEANUP_MAX_ROWS};
}

function setupMailLogCleanupTrigger(){
  const handler='cleanupDeliveredMailLogs_';
  if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()===handler)) ScriptApp.newTrigger(handler).timeBased().everyDays(1).atHour(4).create();
  return {ok:true,handler:handler};
}

function stripHistoryBody_(body){
  let text = String(body || '');
  // 履歴では宛名違いの本文を大量に表示しないため、冒頭の「〇〇さん」だけ外して1通分として保存する
  text = text.replace(/^\s*[^\n]{1,80}さん\s*\n+/, '');
  return text.trim();
}

function saveHistory_(d,names,sent,attNames,errors,representativeBody){
  ensureHistory_(SpreadsheetApp.getActiveSpreadsheet());
  const bodyToSave = stripHistoryBody_(representativeBody || d.body || '');
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HISTORY).appendRow([
    Utilities.getUuid(),
    new Date(),
    Utilities.formatDate(new Date(),'Asia/Tokyo','yyyy/MM/dd'),
    d.templateId||'',
    d.subject||'',
    bodyToSave,
    names.join('、'),
    sent,
    d.dateValue||'',
    d.weekday||'',
    d.timeText||'',
    attNames.join('、'),
    errors.length?errors.join('\n'):'OK',
    1,
    d.sendRequestId||''
  ]);
}
function dateLabel_(date){if(!date)return''; const d=date instanceof Date?date:new Date(date); return Utilities.formatDate(d,'Asia/Tokyo','yyyy/MM/dd')+'（'+'日月火水木金土'.charAt(d.getDay())+'）';}
function timestampLabel_(v){const d=safeDate_(v); if(!d)return''; return Utilities.formatDate(d,'Asia/Tokyo','yyyy/MM/dd H:mm:ss')+'着';}
function dateTimeLabel_(date){if(!date)return''; const d=date instanceof Date?date:new Date(date); return Utilities.formatDate(d,'Asia/Tokyo','yyyy/MM/dd')+'（'+'日月火水木金土'.charAt(d.getDay())+'） '+Utilities.formatDate(d,'Asia/Tokyo','HH:mm');}
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
  const lastRow=sh.getLastRow();
  if(lastRow<=1) return [];
  const limit=Math.min(Math.max(Number(p.limit)||10,1),100);
  // 直近の履歴だけを対象にし、シート全体を読まないことで初期表示を高速化する。
  const scanRows=Math.min(lastRow-1,Math.max(limit*10,50));
  const startRow=lastRow-scanRows+1;
  const v=sh.getRange(startRow,1,scanRows,Math.max(sh.getLastColumn(),14)).getValues();
  const out=[];
  const q=String(p.q||'').toLowerCase();
  const from=p.from?new Date(p.from+'T00:00:00'):null;
  const to=p.to?new Date(p.to+'T23:59:59'):null;

  for(let i=v.length-1;i>=0;i--){
    const r=v[i];
    const sheetIndex=startRow+i-1;
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
    let id=String(r[0]||('row_'+sheetIndex));
    let sendRequestId=String(r[14]||'');

    // Legacy schema fallback: 送信日時, テンプレートID, 件名, 本文, 対象, 送信件数, 結果...
    if(!sentAt && safeDate_(r[0])){
      sentAt=safeDate_(r[0]);
      templateId=String(r[1]||'');
      subject=String(r[2]||'');
      body=String(r[3]||'');
      targets=String(r[4]||'');
      count=r[5]||'';
      id='legacy_'+sheetIndex;
      sendRequestId='';
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
      sentAtMs:sentAt.getTime(),
      sendRequestId:sendRequestId,
      sentDateLabel:dateTimeLabel_(sentAt),
      titleLine:titleLine,
      targetLine:`${targets} / ${count}件`,
      body:body
    });
  }
  out.sort((a,b)=>b.sentAtMs-a.sentAtMs);
  const limited=out.slice(0,limit), openStatuses=getStepOpenStatusByRequestIds_(limited.map(item=>item.sendRequestId));
  return limited.map(item=>{const status=openStatuses[item.sendRequestId];item.openStatus=status||{recipientCount:0,openedCount:0,summary:'開封確認データなし',lastOpenedLabel:'',details:[]};delete item.sentAtMs;delete item.sendRequestId;return item;});
}
function archiveHistory_(id){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HISTORY); const v=sh.getDataRange().getValues(); const legacy=String(id||'').match(/^legacy_(\d+)$/); if(legacy){const row=Number(legacy[1])+1; sh.getRange(row,14).setValue(0); return {ok:true};} for(let i=1;i<v.length;i++){if(String(v[i][0])===String(id)){sh.getRange(i+1,14).setValue(0);return{ok:true};}} return{ok:false};}
function restoreHistory_(id){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HISTORY); const v=sh.getDataRange().getValues(); const legacy=String(id||'').match(/^legacy_(\d+)$/); if(legacy){const row=Number(legacy[1])+1; sh.getRange(row,14).setValue(1); return {ok:true};} for(let i=1;i<v.length;i++){if(String(v[i][0])===String(id)){sh.getRange(i+1,14).setValue(1);return{ok:true};}} return{ok:false};}
function deleteHistoryPermanent_(id){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HISTORY); const v=sh.getDataRange().getValues(); const legacy=String(id||'').match(/^legacy_(\d+)$/); if(legacy){const row=Number(legacy[1])+1; sh.deleteRow(row); return {ok:true};} for(let i=1;i<v.length;i++){if(String(v[i][0])===String(id)){sh.deleteRow(i+1);return{ok:true};}} return{ok:false};}
function saveTemplate_(d,asNew){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TEMPLATE); let id=asNew||!d.id?'tpl_'+Date.now():d.id; const v=sh.getDataRange().getValues(); for(let i=1;i<v.length;i++){if(String(v[i][0])===String(id)){sh.getRange(i+1,2,1,4).setValues([[d.name,d.subject,d.body,true]]);return{ok:true,id};}} sh.appendRow([id,d.name,d.subject,d.body,true,'']); return{ok:true,id};}
function deleteTemplate_(id){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TEMPLATE); const v=sh.getDataRange().getValues(); for(let i=1;i<v.length;i++){if(String(v[i][0])===String(id)){sh.getRange(i+1,6).setValue(1);return{ok:true};}} return{ok:false};}

function ensureAbsenceCache_(ss){
  let sh=ss.getSheetByName(SHEET_ABSENCE_CACHE)||ss.insertSheet(SHEET_ABSENCE_CACHE);
  if(sh.getLastRow()<1){
    sh.appendRow(['日付','日付表示','本日','校舎','生徒名','理由','欠席遅刻','その他','元行','受付時刻','更新日時']);
  }
}

function readAbsencesDirect_(){
  const s=getSettings_();
  const srcSS=SpreadsheetApp.openById(s['欠席遅刻シートID']||DEFAULT_ABSENCE_ID);
  const src=srcSS.getSheetByName(ABSENCE_SHEET_NAME);
  if(!src) throw new Error('欠席遅刻シート「'+ABSENCE_SHEET_NAME+'」が見つかりません。');
  const v=src.getDataRange().getValues();
  const today0=new Date(); today0.setHours(0,0,0,0);
  const out=[];
  for(let i=1;i<v.length;i++){
    const r=v[i];
    const date=safeDate_(r[3]); // D列：日付
    if(!date) continue;
    const d=new Date(date); d.setHours(0,0,0,0);
    if(d<today0) continue;
    out.push({
      dateObj:d,
      dateLabel:dateLabel_(d),
      isToday:d.getTime()===today0.getTime(),
      school:r[2]||'',
      name:r[1]||'',
      reason:r[5]||'',
      kind:r[6]||'',
      other:r[7]||'',
      row:i+1,
      receivedLabel: timestampLabel_(r[0])
    });
  }
  out.sort((a,b)=>a.dateObj-b.dateObj || String(a.name).localeCompare(String(b.name),'ja'));
  return out;
}

function refreshAbsenceCache(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(); ensureAbsenceCache_(ss);
  const list=readAbsencesDirect_();
  const now=new Date();
  const cache=ss.getSheetByName(SHEET_ABSENCE_CACHE);
  cache.clearContents();
  cache.appendRow(['日付','日付表示','本日','校舎','生徒名','理由','欠席遅刻','その他','元行','受付時刻','更新日時']);
  if(list.length){
    const rows=list.map(a=>[a.dateObj,a.dateLabel,a.isToday,a.school,a.name,a.reason,a.kind,a.other,a.row,a.receivedLabel||'',now]);
    cache.getRange(2,1,rows.length,rows[0].length).setValues(rows);
  }
  return {ok:true,count:list.length,updatedAt:Utilities.formatDate(now,'Asia/Tokyo','yyyy/MM/dd HH:mm:ss'),items:list.map(({dateObj,...rest})=>rest)};
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
  refreshAbsenceCache();
}

function getAbsences(){
  // Ver.31.2：画面表示は欠席キャッシュだけを読みます（高速化）。
  // キャッシュが空のときだけ元の「★欠席遅刻」シートから作り直します。
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  ensureAbsenceCache_(ss);
  const cache=ss.getSheetByName(SHEET_ABSENCE_CACHE);
  if(cache.getLastRow()<2){
    refreshAbsenceCache();
  }
  const values=cache.getDataRange().getValues();
  const out=[];
  for(let i=1;i<values.length;i++){
    const r=values[i];
    if(!r[0]) continue;
    out.push({
      dateLabel:String(r[1]||''),
      isToday:r[2]===true || r[2]==='TRUE',
      school:String(r[3]||''),
      name:String(r[4]||''),
      reason:String(r[5]||''),
      kind:String(r[6]||''),
      other:String(r[7]||''),
      row:r[8]||'',
      receivedLabel:String(r[9]||'')
    });
  }
  return out;
}


function authorizeMailSystem(){MailApp.sendEmail({to:'mintcocoajasmine@gmail.com',subject:'STEP配信システム 権限確認',body:'このメールが届けば、メール送信権限は有効です。'});}
