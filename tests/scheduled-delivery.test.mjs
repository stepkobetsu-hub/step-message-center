import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scheduler=fs.readFileSync(new URL('../ScheduledDelivery.gs',import.meta.url),'utf8');
function setup(){
  let rows=[],props={},fileCount=0,triggers=[],sent=[],saved={},fail=false,locked=false;
  const sh={getLastRow:()=>rows.length,appendRow:r=>rows.push([...r]),getDataRange:()=>({getValues:()=>rows.map(r=>[...r])}),getRange:(r,c)=>({setValue:v=>{rows[r-1][c-1]=v;}})};
  const ss={getId:()=> 'ss-id',getSheetByName:()=>rows.length?sh:null,insertSheet:()=>sh};
  const lock={waitLock(){assert.equal(locked,false);locked=true;},tryLock(){if(locked)return false;locked=true;return true;},releaseLock(){locked=false;}};
  const context={Date,console,MimeType:{PLAIN_TEXT:'text/plain'},SpreadsheetApp:{getActiveSpreadsheet:()=>ss,openById:id=>{assert.equal(id,'ss-id');return ss;},flush(){}},LockService:{getScriptLock:()=>lock},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k],setProperty:(k,v)=>{props[k]=v;}})},ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:name=>({timeBased:()=>({everyMinutes:n=>({create:()=>{assert.equal(n,1);triggers.push({getHandlerFunction:()=>name});}})})})},DriveApp:{createFolder:()=>({getId:()=> 'private-folder'}),getFolderById:()=>({createFile:(name,data)=>{const id='file-'+(++fileCount);saved[id]=data;return {getId:()=>id};}}),getFileById:id=>({getBlob:()=>({getDataAsString:()=>saved[id]})})},Utilities:{formatDate:(date,tz,format)=>{assert.equal(tz,'Asia/Tokyo');const iso=new Date(date.getTime()+9*3600000).toISOString();return format.includes('T')?iso.slice(0,16)+':00':iso.slice(0,16).replace('T',' ').replaceAll('-','/');}},getCachedStudentMap_:()=>({'1001':{id:'1001',name:'テスト生徒',school:'神領校',mail1:'test@example.invalid'}}),getPublicSettings_:()=>({'神領校電話':'0568-41-8937'}),sendSelected_:(payload,snapshot)=>{sent.push({payload,snapshot});if(fail)throw new Error('通信エラー');return {ok:true,sentCount:1,errors:[]};}};
  vm.createContext(context);vm.runInContext(scheduler,context);
  const at=(offset=5*60000)=>new Date(Date.now()+offset+9*3600000).toISOString().slice(0,16)+':00+09:00';
  const request=(extra={})=>({sendRequestId:'step-schedule-test001',scheduledAt:at(),studentIds:['1001'],subject:'予約のお知らせ',body:'{{生徒名}}さん',attachments:[{name:'案内.pdf',type:'application/pdf',data:'dGVzdA=='}],...extra});
  return {context,rows,sent,props,saved,request,get fileCount(){return fileCount;},get triggers(){return triggers;},setFail:()=>{fail=true;}};
}
test('予約作成ではメールを送らず、本文・添付・生徒情報を保存する',()=>{
  const f=setup(),result=f.context.scheduleSelected_(f.request());
  assert.equal(result.state,'予約中');assert.equal(f.sent.length,0);assert.equal(f.fileCount,1);assert.equal(f.triggers.length,1);assert.equal(f.props.STEP_SCHEDULE_SS_ID,'ss-id');
  const data=JSON.parse(Object.values(f.saved)[0]);assert.equal(data.payload.attachments[0].name,'案内.pdf');assert.equal(data.snapshot.studentMap['1001'].mail1,'test@example.invalid');
  const list=f.context.getScheduledDeliveries_();assert.equal(list.items.length,1);assert.equal(JSON.stringify(list).includes('test@example.invalid'),false);
});
test('同じ予約IDで再試行しても予約・保存ファイル・トリガーは増えない',()=>{
  const f=setup(),r=f.request();f.context.scheduleSelected_(r);f.context.scheduleSelected_(r);assert.equal(f.rows.length,2);assert.equal(f.fileCount,1);assert.equal(f.triggers.length,1);
});
test('未来の予約は実行されず、時刻に達した予約は1回だけ配信される',()=>{
  const f=setup();f.context.scheduleSelected_(f.request());f.context.processScheduledDeliveries();assert.equal(f.sent.length,0);
  f.rows[1][1]=new Date(Date.now()-1000);f.context.processScheduledDeliveries();f.context.processScheduledDeliveries();
  assert.equal(f.sent.length,1);assert.equal(f.rows[1][2],'配信済み');assert.equal(f.sent[0].snapshot.studentMap['1001'].name,'テスト生徒');
});
test('キャンセル後は予定時刻を過ぎても配信されない',()=>{
  const f=setup();const r=f.context.scheduleSelected_(f.request());f.context.cancelScheduledDelivery_(r.id);f.context.cancelScheduledDelivery_(r.id);f.rows[1][1]=new Date(0);f.context.processScheduledDeliveries();assert.equal(f.sent.length,0);assert.equal(f.rows[1][2],'キャンセル');
});
test('配信開始済みの予約はキャンセルできない',()=>{
  const f=setup();const r=f.context.scheduleSelected_(f.request());f.rows[1][2]='配信中';assert.throws(()=>f.context.cancelScheduledDelivery_(r.id),/すでに配信/);
});
test('実行途中の異常終了と送信エラーは再送せず要確認にする',()=>{
  const f=setup();f.context.scheduleSelected_(f.request());f.rows[1][2]='配信中';f.rows[1][8]=new Date(Date.now()-16*60000);f.context.processScheduledDeliveries();assert.equal(f.rows[1][2],'要確認');assert.equal(f.sent.length,0);
  const g=setup();g.context.scheduleSelected_(g.request());g.rows[1][1]=new Date(0);g.setFail();g.context.processScheduledDeliveries();g.context.processScheduledDeliveries();assert.equal(g.rows[1][2],'要確認');assert.equal(g.sent.length,1);
});
test('過去・空の宛先・不明な生徒・空の件名は保存前に拒否する',()=>{
  for(const [extra,pattern] of [[{scheduledAt:'2020-01-01T00:00:00+09:00'},/1分以上/],[{studentIds:[]},/送信先/],[{studentIds:['9999']},/見つかりません/],[{subject:''},/件名と本文/],[{scheduledAt:'2026-10-12T13:00:00Z'},/日本時間/]]){
    const f=setup();assert.throws(()=>f.context.scheduleSelected_(f.request(extra)),pattern);assert.equal(f.fileCount,0);assert.equal(f.sent.length,0);
  }
});
test('予約の詳細から本文と添付名を確認でき、メールアドレスは返さない',()=>{
  const f=setup();const r=f.context.scheduleSelected_(f.request());const detail=f.context.getScheduledDeliveryDetail_(r.id);assert.equal(detail.body,'{{生徒名}}さん');assert.equal(detail.attachments[0],'案内.pdf');assert.equal(JSON.stringify(detail).includes('test@example.invalid'),false);
});
