// 予約本文・添付は非公開のDriveファイルに保存。シートには管理情報だけを保持する。
const STEP_SCHEDULE_SHEET = '配信予約';
const STEP_SCHEDULE_SS_PROPERTY = 'STEP_SCHEDULE_SS_ID';
const STEP_SCHEDULE_FOLDER_PROPERTY = 'STEP_SCHEDULE_FOLDER_ID';
const STEP_SCHEDULE_HEADERS = ['予約ID','配信日時','状態','予約作成日時','件名','対象生徒','データファイルID','結果','処理日時'];

function scheduleSpreadsheet_(){
  const id=PropertiesService.getScriptProperties().getProperty(STEP_SCHEDULE_SS_PROPERTY);
  return id?SpreadsheetApp.openById(id):SpreadsheetApp.getActiveSpreadsheet();
}
function ensureScheduleSheet_(){
  const ss=scheduleSpreadsheet_();
  if(!ss)throw new Error('予約保存先が設定されていません');
  const sh=ss.getSheetByName(STEP_SCHEDULE_SHEET)||ss.insertSheet(STEP_SCHEDULE_SHEET);
  if(!sh.getLastRow())sh.appendRow(STEP_SCHEDULE_HEADERS);
  PropertiesService.getScriptProperties().setProperty(STEP_SCHEDULE_SS_PROPERTY,ss.getId());
  return sh;
}
function installScheduledDeliveryTrigger(){
  ensureScheduleSheet_();
  if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='processScheduledDeliveries')){
    ScriptApp.newTrigger('processScheduledDeliveries').timeBased().everyMinutes(1).create();
  }
  return {ok:true};
}
function parseScheduleDate_(value){
  const text=String(value||'');
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+09:00$/.test(text))throw new Error('配信日時を日本時間で指定してください');
  const date=new Date(text);
  if(isNaN(date.getTime())||Utilities.formatDate(date,'Asia/Tokyo',"yyyy-MM-dd'T'HH:mm:00")!==text.slice(0,19))throw new Error('配信日時が正しくありません');
  return date;
}
function scheduleRowItem_(r){
  const result=r[7]?JSON.parse(String(r[7])):{};
  return {id:String(r[0]),scheduledAt:new Date(r[1]).toISOString(),scheduledLabel:Utilities.formatDate(new Date(r[1]),'Asia/Tokyo','yyyy/MM/dd HH:mm'),state:String(r[2]),subject:String(r[4]),names:String(r[5]),result};
}
function getScheduledDeliveries_(){
  const ss=scheduleSpreadsheet_(),sh=ss&&ss.getSheetByName(STEP_SCHEDULE_SHEET);
  const rows=sh?sh.getDataRange().getValues().slice(1):[];
  const active=rows.filter(r=>r[0]&&['予約中','配信中','要確認'].includes(String(r[2]))).sort((a,b)=>new Date(a[1])-new Date(b[1]));
  const finished=rows.filter(r=>r[0]&&!['予約中','配信中','要確認'].includes(String(r[2]))).reverse().slice(0,20);
  return {supported:true,items:active.concat(finished).map(scheduleRowItem_)};
}
function getScheduledDeliveryDetail_(id){
  const sh=scheduleSpreadsheet_().getSheetByName(STEP_SCHEDULE_SHEET);
  const row=sh&&sh.getDataRange().getValues().slice(1).find(r=>String(r[0])===String(id));
  if(!row)throw new Error('予約が見つかりません');
  const data=JSON.parse(DriveApp.getFileById(String(row[6])).getBlob().getDataAsString()).payload;
  return {...scheduleRowItem_(row),body:data.body,dateValue:data.dateValue,timeText:data.timeText,attachments:(data.attachments||[]).map(a=>String(a.name||''))};
}
function scheduleSelected_(d){
  const id=String(d.sendRequestId||'');
  if(!/^step-[a-z0-9-]{8,100}$/.test(id))throw new Error('予約IDが正しくありません');
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const sh=ensureScheduleSheet_(),rows=sh.getDataRange().getValues();
    const existing=rows.slice(1).find(r=>String(r[0])===id);
    // 同じ予約IDで通信を再試行しても予約は増やさない。
    if(existing)return {ok:true,...scheduleRowItem_(existing)};
    const date=parseScheduleDate_(d.scheduledAt);
    if(date.getTime()<Date.now()+60000)throw new Error('配信日時は現在より1分以上先を指定してください');
    if(date.getTime()>Date.now()+366*86400000)throw new Error('配信日時は1年以内を指定してください');
    if(rows.filter(r=>r[2]==='予約中').length>=50)throw new Error('予約は最大50件です');
    const ids=[...new Set((d.studentIds||[]).map(String))];
    if(!ids.length)throw new Error('送信先が選択されていません');
    if(!String(d.subject||'').trim()||!String(d.body||'').trim())throw new Error('件名と本文を入力してください');
    const map=getCachedStudentMap_(),studentMap={};
    ids.forEach(studentId=>{if(!map[studentId])throw new Error('生徒ID '+studentId+'が見つかりません');studentMap[studentId]=map[studentId];});
    const payload={sendRequestId:id,studentIds:ids,subject:String(d.subject),body:String(d.body),templateId:String(d.templateId||''),dateValue:String(d.dateValue||''),dateText:String(d.dateText||''),weekday:String(d.weekday||''),timeText:String(d.timeText||''),attachments:d.attachments||[]};
    const saved=JSON.stringify({payload,snapshot:{studentMap,settings:getPublicSettings_()}});
    if(saved.length>20*1024*1024)throw new Error('添付ファイルが大きすぎます。合計15MB以下にしてください');
    installScheduledDeliveryTrigger();
    const props=PropertiesService.getScriptProperties();
    let folderId=props.getProperty(STEP_SCHEDULE_FOLDER_PROPERTY);
    if(!folderId){folderId=DriveApp.createFolder('STEP配信予約データ').getId();props.setProperty(STEP_SCHEDULE_FOLDER_PROPERTY,folderId);}
    const file=DriveApp.getFolderById(folderId).createFile(id+'.json',saved,MimeType.PLAIN_TEXT);
    const row=[id,date,'予約中',new Date(),payload.subject,ids.map(i=>studentMap[i].name).join('、'),file.getId(),'', ''];
    sh.appendRow(row);SpreadsheetApp.flush();
    return {ok:true,...scheduleRowItem_(row)};
  }finally{lock.releaseLock();}
}
function cancelScheduledDelivery_(id){
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const sh=ensureScheduleSheet_(),rows=sh.getDataRange().getValues();
    const index=rows.findIndex((r,i)=>i>0&&String(r[0])===String(id));
    if(index<1)throw new Error('予約が見つかりません');
    if(rows[index][2]==='キャンセル')return {ok:true};
    if(rows[index][2]!=='予約中')throw new Error('すでに配信処理が始まっています。キャンセルできません');
    sh.getRange(index+1,3).setValue('キャンセル');
    sh.getRange(index+1,9).setValue(new Date());SpreadsheetApp.flush();
    return {ok:true};
  }finally{lock.releaseLock();}
}
function processScheduledDeliveries(){
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
  let job;
  try{
    const sh=ensureScheduleSheet_(),rows=sh.getDataRange().getValues(),now=Date.now();
    // 実行が途中で終了した予約は再送せず、調査が必要と表示する。
    rows.forEach((r,i)=>{if(i>0&&r[2]==='配信中'&&now-new Date(r[8]).getTime()>15*60000){sh.getRange(i+1,3).setValue('要確認');sh.getRange(i+1,8).setValue(JSON.stringify({errors:['処理が途中で終了した可能性があります。送信ログを確認してください。自動再送は行いません。']}));r[2]='要確認';}});
    if(rows.some(r=>r[2]==='配信中'))return;
    const due=rows.map((r,i)=>({r,row:i+1})).filter(x=>x.row>1&&x.r[2]==='予約中'&&new Date(x.r[1]).getTime()<=now).sort((a,b)=>new Date(a.r[1])-new Date(b.r[1]));
    if(!due.length)return;
    job=due[0];
    sh.getRange(job.row,3).setValue('配信中');sh.getRange(job.row,9).setValue(new Date());
    SpreadsheetApp.flush(); // 送信前に状態を永続化し、重複起動を防ぐ。
  }finally{lock.releaseLock();}
  let result,state;
  try{
    const saved=JSON.parse(DriveApp.getFileById(String(job.r[6])).getBlob().getDataAsString());
    result=sendSelected_(saved.payload,saved.snapshot);
    state=result.errors&&result.errors.length?'エラーあり':'配信済み';
  }catch(err){result={errors:[String(err.message||err)]};state='要確認';}
  lock.waitLock(10000);
  try{
    const sh=ensureScheduleSheet_();
    sh.getRange(job.row,3).setValue(state);sh.getRange(job.row,8).setValue(JSON.stringify(result));sh.getRange(job.row,9).setValue(new Date());SpreadsheetApp.flush();
  }finally{lock.releaseLock();}
}
