// 愛知全県模試 受験票作成（年度別・固定受験番号）
const EXAM_MASTER_SS_ID_='1CIJkTlYUcUkbb8jBdFc6L8D5ubTGsxwNxFv01ten-Zk';
const EXAM_MASTER_SHEET_='☆マスタ';
const EXAM_NUMBER_SHEET_='全県模試受験番号';
const EXAM_NUMBER_HEADERS_=['生徒コード','生徒氏名','学年','受験番号','校舎','割当日','備考','年度'];
const EXAM_SCHOOL_CODE_SHEET_='中学校コード';
const EXAM_SCHOOL_CODE_HEADERS_=['学校名','中学校コード','備考'];
const EXAM_LISTENING_SHEET_='全県模試リスニング';
const EXAM_LISTENING_HEADERS_=['年度','回','学年','リスニングURL','ユーザー名','パスワード','更新日','備考'];
const EXAM_TARGET_GRADES_=['小４','小５','小６','中１','中２','中３'];

function examGrade_(value){return String(value||'').normalize('NFKC').replace(/[\s　]+/g,'').replace('小1','小１').replace('小2','小２').replace('小3','小３').replace('小4','小４').replace('小5','小５').replace('小6','小６').replace('中1','中１').replace('中2','中２').replace('中3','中３').replace('高1','高１');}
function examGradeStart_(grade){return {'中１':1001,'中２':2001,'中３':3001,'小４':4001,'小５':5001,'小６':6001}[grade]||0;}
function examCampus_(value){const s=String(value||'');return s.indexOf('神領')>=0?'神領':s.indexOf('大手')>=0?'大手':s;}
function examNumberInGrade_(number,grade){const n=Number(number),start=examGradeStart_(grade);return start&&n>=start&&n<start+999;}
function examAcademicYear_(){const now=new Date(),year=Number(Utilities.formatDate(now,'Asia/Tokyo','yyyy')),md=Utilities.formatDate(now,'Asia/Tokyo','MMdd');return md>='0401'?year:year-1;}
function examYearAvailable_(year){const today=Number(Utilities.formatDate(new Date(),'Asia/Tokyo','yyyyMMdd'));return today>=Number(year)*10000+301;}
function examTargetYear_(value){const current=examAcademicYear_(),year=Number(value);if(!year||year===current)return current;if(year===current+1){if(examYearAvailable_(year))return year;throw new Error(year+'年度は'+year+'年3月1日から選択できます。それ以前は選択できません。');}return current;}
function examAdvanceGrade_(grade,steps){const order=['小１','小２','小３','小４','小５','小６','中１','中２','中３','高１'];let index=order.indexOf(examGrade_(grade));if(index<0)return '';index+=Number(steps)||0;return index>=0&&index<order.length?order[index]:'';}
function examRound_(value){const n=Number(value);if(!Number.isInteger(n)||n<1||n>6)throw new Error('受験回は第1回～第6回で指定してください。');return n;}
function examSchoolName_(value){return String(value||'').normalize('NFKC').replace(/[\s　]+/g,'').replace(/中学校$/,'中');}

function ensureExamSchoolCodeSheet_(){
  const ss=SpreadsheetApp.openById(EXAM_MASTER_SS_ID_);let sh=ss.getSheetByName(EXAM_SCHOOL_CODE_SHEET_);
  if(!sh){sh=ss.insertSheet(EXAM_SCHOOL_CODE_SHEET_);sh.getRange(1,1,1,EXAM_SCHOOL_CODE_HEADERS_.length).setValues([EXAM_SCHOOL_CODE_HEADERS_]);sh.setFrozenRows(1);}
  const current=sh.getRange(1,1,1,EXAM_SCHOOL_CODE_HEADERS_.length).getDisplayValues()[0];
  if(EXAM_SCHOOL_CODE_HEADERS_.some((h,i)=>current[i]!==h))throw new Error('「'+EXAM_SCHOOL_CODE_SHEET_+'」の見出しが変更されています。見出しを元に戻してください。');
  return sh;
}
function examSchoolCodeMap_(){
  const sh=ensureExamSchoolCodeSheet_(),map={},last=sh.getLastRow();
  if(last<2)return map;
  const rows=sh.getRange(2,1,last-1,2).getDisplayValues();
  for(let i=0;i<rows.length;i++){const school=examSchoolName_(rows[i][0]),code=String(rows[i][1]||'').trim();if(school&&/^\d{3}$/.test(code))map[school]=code;}
  return map;
}
function saveExamSchoolCode_(d){
  const school=examSchoolName_(d.schoolName),code=String(d.schoolCode||'').normalize('NFKC').trim();
  if(!school)throw new Error('学校名がありません。');
  if(!/^\d{3}$/.test(code))throw new Error('中学校コードは3桁の数字で入力してください。');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const sh=ensureExamSchoolCodeSheet_(),last=sh.getLastRow(),rows=last>1?sh.getRange(2,1,last-1,1).getDisplayValues():[];
    let row=0;for(let i=0;i<rows.length;i++){if(examSchoolName_(rows[i][0])===school){row=i+2;break;}}
    if(row)sh.getRange(row,1,1,3).setValues([[school,code,'画面から登録 '+Utilities.formatDate(new Date(),'Asia/Tokyo','yyyy/MM/dd HH:mm')]]);
    else sh.appendRow([school,code,'画面から登録 '+Utilities.formatDate(new Date(),'Asia/Tokyo','yyyy/MM/dd HH:mm')]);
    sh.getRange(row||sh.getLastRow(),2).setNumberFormat('@');
    return {ok:true,schoolName:school,schoolCode:code,sheetUrl:'https://docs.google.com/spreadsheets/d/'+EXAM_MASTER_SS_ID_+'/edit?gid=2026081901#gid=2026081901'};
  }finally{lock.releaseLock();}
}

function ensureExamListeningSheet_(){
  const ss=SpreadsheetApp.openById(EXAM_MASTER_SS_ID_);let sh=ss.getSheetByName(EXAM_LISTENING_SHEET_);
  if(!sh){sh=ss.insertSheet(EXAM_LISTENING_SHEET_);sh.getRange(1,1,1,EXAM_LISTENING_HEADERS_.length).setValues([EXAM_LISTENING_HEADERS_]);sh.setFrozenRows(1);}
  const current=sh.getRange(1,1,1,EXAM_LISTENING_HEADERS_.length).getDisplayValues()[0];
  if(EXAM_LISTENING_HEADERS_.some((h,i)=>current[i]!==h))throw new Error('「'+EXAM_LISTENING_SHEET_+'」の見出しが変更されています。見出しを元に戻してください。');
  return sh;
}
function getExamListeningSettings_(requestedYear,requestedRound){
  const targetYear=examTargetYear_(requestedYear),round=examRound_(requestedRound),sh=ensureExamListeningSheet_(),last=sh.getLastRow(),settings={};
  const rows=last>1?sh.getRange(2,1,last-1,EXAM_LISTENING_HEADERS_.length).getDisplayValues():[];
  for(let i=0;i<rows.length;i++){
    const r=rows[i],year=Number(r[0]),rRound=Number(r[1]),grade=examGrade_(r[2]),url=String(r[3]||'').trim(),username=String(r[4]||'').trim(),password=String(r[5]||'').trim();
    if(year!==targetYear||rRound!==round||['中１','中２','中３'].indexOf(grade)<0||!url||!username||!password)continue;
    settings[grade]={year:targetYear,round:round,grade:grade,url:url,username:username,password:password};
  }
  const missing=['中１','中２','中３'].filter(g=>!settings[g]);
  return {ok:true,year:targetYear,round:round,settings:settings,missingGrades:missing,sheetUrl:'https://docs.google.com/spreadsheets/d/'+EXAM_MASTER_SS_ID_+'/edit?gid=2026081902#gid=2026081902'};
}
function saveExamListeningSettings_(d){
  const year=Number(d.year),round=examRound_(d.round),grade=examGrade_(d.grade),url=String(d.url||'').trim(),username=String(d.username||'').trim(),password=String(d.password||'').trim();
  if(!Number.isInteger(year)||year<2026||year>2100)throw new Error('年度を正しく指定してください。');
  if(['中１','中２','中３'].indexOf(grade)<0)throw new Error('学年は中１・中２・中３から選んでください。');
  if(!/^https:\/\//i.test(url))throw new Error('リスニングURLはhttps://から入力してください。');
  if(!username||!password)throw new Error('ユーザー名とパスワードを入力してください。');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const sh=ensureExamListeningSheet_(),last=sh.getLastRow(),rows=last>1?sh.getRange(2,1,last-1,3).getDisplayValues():[];let row=0;
    for(let i=0;i<rows.length;i++){if(Number(rows[i][0])===year&&Number(rows[i][1])===round&&examGrade_(rows[i][2])===grade){row=i+2;break;}}
    const values=[year,round,grade,url,username,password,new Date(),year+'年度 第'+round+'回'];
    if(row)sh.getRange(row,1,1,values.length).setValues([values]);else sh.appendRow(values);
    return {ok:true,item:{year:year,round:round,grade:grade,url:url,username:username,password:password},sheetUrl:'https://docs.google.com/spreadsheets/d/'+EXAM_MASTER_SS_ID_+'/edit?gid=2026081902#gid=2026081902'};
  }finally{lock.releaseLock();}
}

function ensureExamNumberSheet_(){
  const ss=SpreadsheetApp.openById(EXAM_MASTER_SS_ID_);let sh=ss.getSheetByName(EXAM_NUMBER_SHEET_);
  if(!sh){sh=ss.insertSheet(EXAM_NUMBER_SHEET_);sh.getRange(1,1,1,EXAM_NUMBER_HEADERS_.length).setValues([EXAM_NUMBER_HEADERS_]);sh.setFrozenRows(1);}
  const current=sh.getRange(1,1,1,EXAM_NUMBER_HEADERS_.length).getDisplayValues()[0];
  if(EXAM_NUMBER_HEADERS_.some((h,i)=>current[i]!==h))throw new Error('「'+EXAM_NUMBER_SHEET_+'」の見出しが変更されています。見出しを元に戻してください。');
  return sh;
}

function activeExamStudents_(targetYear,schoolCodeMap){
  const sh=SpreadsheetApp.openById(EXAM_MASTER_SS_ID_).getSheetByName(EXAM_MASTER_SHEET_);if(!sh)throw new Error('☆マスタが見つかりません。');
  const values=sh.getDataRange().getValues(),out=[],steps=targetYear-examAcademicYear_();
  for(let i=1;i<values.length;i++){
    const r=values[i],currentGrade=examGrade_(r[9]||r[10]),grade=examAdvanceGrade_(currentGrade,steps);
    if(String(r[1])!=='1'||EXAM_TARGET_GRADES_.indexOf(grade)<0||!r[0]||!r[4])continue;
    const juniorHighName=examSchoolName_(r[15]),juniorHighCode=/^中/.test(grade)?String(schoolCodeMap[juniorHighName]||''):'';
    out.push({studentId:String(r[0]),name:String(r[4]),kana:String(r[5]||''),grade:grade,campus:examCampus_(r[7]),juniorHighName:juniorHighName,juniorHighCode:juniorHighCode});
  }
  return out.sort((a,b)=>examGradeStart_(a.grade)-examGradeStart_(b.grade)||Number(a.studentId)-Number(b.studentId));
}

function getExamTicketStudents_(requestedYear,forceRefresh){
  var targetYear=examTargetYear_(requestedYear);
  var cache=CacheService.getScriptCache();
  var cacheKey='exam_ticket_students_v58_'+targetYear;
  if(!forceRefresh){
    var cached=cache.get(cacheKey);
    if(cached){try{return JSON.parse(cached);}catch(ignore){}}
  }
  var lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    if(!forceRefresh){
      var lockedCache=cache.get(cacheKey);
      if(lockedCache){try{return JSON.parse(lockedCache);}catch(ignoreLocked){}}
    }
    var sh=ensureExamNumberSheet_();
    var last=Math.max(sh.getLastRow(),1);
    var saved=last>1?sh.getRange(2,1,last-1,EXAM_NUMBER_HEADERS_.length).getValues():[];
    var rowByKey={};
    var used={'中１':{},'中２':{},'中３':{},'小４':{},'小５':{},'小６':{}};
    var max={'中１':1000,'中２':2000,'中３':3000,'小４':4000,'小５':5000,'小６':6000};
    var i;
    for(i=0;i<saved.length;i++){
      var savedRow=saved[i];
      var savedId=String(savedRow[0]||'').trim();
      var savedGrade=examGrade_(savedRow[2]);
      var savedNumber=Number(savedRow[3]);
      var savedYear=Number(savedRow[7]||2026);
      if(savedId)rowByKey[savedYear+':'+savedId]={row:i+2,values:savedRow};
      if(savedYear===targetYear&&examNumberInGrade_(savedNumber,savedGrade)){
        used[savedGrade][savedNumber]=true;
        max[savedGrade]=Math.max(max[savedGrade],savedNumber);
      }
    }
    var schoolCodeMap=examSchoolCodeMap_();
    var students=activeExamStudents_(targetYear,schoolCodeMap);
    var updates=[];
    var appends=[];
    var warnings=[];
    var warningMap={};
    var activeNumbers={};
    var missingSchoolMap={};
    for(i=0;i<students.length;i++){
      var student=students[i];
      var found=rowByKey[targetYear+':'+student.studentId];
      var number=found?Number(found.values[3]):0;
      var oldGrade=found?examGrade_(found.values[2]):'';
      var values;
      if(!found||oldGrade!==student.grade||!examNumberInGrade_(number,student.grade)){
        do{number=++max[student.grade];}while(used[student.grade][number]);
        used[student.grade][number]=true;
        var note=String(targetYear)+'年度 自動割当';
        if(found&&oldGrade&&oldGrade!==student.grade)note='学年訂正 '+oldGrade+' '+found.values[3]+'→'+student.grade+' '+number;
        values=[student.studentId,student.name,student.grade,number,student.campus,new Date(),note,targetYear];
        if(found)updates.push({row:found.row,values:values});else appends.push(values);
      }else{
        values=[student.studentId,student.name,student.grade,number,student.campus,found.values[5]||new Date(),found.values[6]||'',targetYear];
        if(String(found.values[1])!==student.name||examCampus_(found.values[4])!==student.campus||Number(found.values[7])!==targetYear)updates.push({row:found.row,values:values});
      }
      if(activeNumbers[number]){
        var warning='受験番号'+number+'が重複しています（'+activeNumbers[number]+'・'+student.name+'）';
        if(!warningMap[warning]){warningMap[warning]=true;warnings.push(warning);}
      }
      activeNumbers[number]=student.name;
      student.examNumber=String(number).padStart(4,'0');
      student.year=targetYear;
      if(/^中/.test(student.grade)&&!student.juniorHighCode)missingSchoolMap[student.juniorHighName||'（☆マスタP列が空欄）']=true;
    }
    for(i=0;i<updates.length;i++)sh.getRange(updates[i].row,1,1,EXAM_NUMBER_HEADERS_.length).setValues([updates[i].values]);
    if(appends.length)sh.getRange(sh.getLastRow()+1,1,appends.length,EXAM_NUMBER_HEADERS_.length).setValues(appends);
    var result={ok:true,year:targetYear,students:students,warnings:warnings,missingSchoolCodes:Object.keys(missingSchoolMap),schoolCodeSheetUrl:'https://docs.google.com/spreadsheets/d/'+EXAM_MASTER_SS_ID_+'/edit?gid=2026081901#gid=2026081901',updatedAt:Utilities.formatDate(new Date(),'Asia/Tokyo','yyyy/MM/dd HH:mm:ss')};
    cache.put(cacheKey,JSON.stringify(result),300);
    return result;
  }finally{
    lock.releaseLock();
  }
}
