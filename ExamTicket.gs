// 愛知全県模試 受験票作成（年度別・固定受験番号）
const EXAM_MASTER_SS_ID_='1CIJkTlYUcUkbb8jBdFc6L8D5ubTGsxwNxFv01ten-Zk';
const EXAM_MASTER_SHEET_='☆マスタ';
const EXAM_NUMBER_SHEET_='全県模試受験番号';
const EXAM_NUMBER_HEADERS_=['生徒コード','生徒氏名','学年','受験番号','校舎','割当日','備考','年度'];
const EXAM_TARGET_GRADES_=['小４','小５','小６','中１','中２','中３'];

function examGrade_(value){return String(value||'').normalize('NFKC').replace(/[\s　]+/g,'').replace('小1','小１').replace('小2','小２').replace('小3','小３').replace('小4','小４').replace('小5','小５').replace('小6','小６').replace('中1','中１').replace('中2','中２').replace('中3','中３').replace('高1','高１');}
function examGradeStart_(grade){return {'中１':1001,'中２':2001,'中３':3001,'小４':4001,'小５':5001,'小６':6001}[grade]||0;}
function examCampus_(value){const s=String(value||'');return s.indexOf('神領')>=0?'神領':s.indexOf('大手')>=0?'大手':s;}
function examNumberInGrade_(number,grade){const n=Number(number),start=examGradeStart_(grade);return start&&n>=start&&n<start+999;}
function examAcademicYear_(){const now=new Date(),year=Number(Utilities.formatDate(now,'Asia/Tokyo','yyyy')),md=Utilities.formatDate(now,'Asia/Tokyo','MMdd');return md>='0401'?year:year-1;}
function examTargetYear_(value){const current=examAcademicYear_(),year=Number(value);return year===current+1?year:current;}
function examAdvanceGrade_(grade,steps){const order=['小１','小２','小３','小４','小５','小６','中１','中２','中３','高１'];let index=order.indexOf(examGrade_(grade));if(index<0)return '';index+=Number(steps)||0;return index>=0&&index<order.length?order[index]:'';}

function ensureExamNumberSheet_(){
  const ss=SpreadsheetApp.openById(EXAM_MASTER_SS_ID_);let sh=ss.getSheetByName(EXAM_NUMBER_SHEET_);
  if(!sh){sh=ss.insertSheet(EXAM_NUMBER_SHEET_);sh.getRange(1,1,1,EXAM_NUMBER_HEADERS_.length).setValues([EXAM_NUMBER_HEADERS_]);sh.setFrozenRows(1);}
  const current=sh.getRange(1,1,1,EXAM_NUMBER_HEADERS_.length).getDisplayValues()[0];
  if(EXAM_NUMBER_HEADERS_.some((h,i)=>current[i]!==h))throw new Error('「'+EXAM_NUMBER_SHEET_+'」の見出しが変更されています。見出しを元に戻してください。');
  return sh;
}

function activeExamStudents_(targetYear){
  const sh=SpreadsheetApp.openById(EXAM_MASTER_SS_ID_).getSheetByName(EXAM_MASTER_SHEET_);if(!sh)throw new Error('☆マスタが見つかりません。');
  const values=sh.getDataRange().getValues(),out=[],steps=targetYear-examAcademicYear_();
  for(let i=1;i<values.length;i++){
    const r=values[i],currentGrade=examGrade_(r[9]||r[10]),grade=examAdvanceGrade_(currentGrade,steps);
    if(String(r[1])!=='1'||EXAM_TARGET_GRADES_.indexOf(grade)<0||!r[0]||!r[4])continue;
    out.push({studentId:String(r[0]),name:String(r[4]),kana:String(r[5]||''),grade:grade,campus:examCampus_(r[7])});
  }
  return out.sort((a,b)=>examGradeStart_(a.grade)-examGradeStart_(b.grade)||Number(a.studentId)-Number(b.studentId));
}

function getExamTicketStudents_(requestedYear){
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const targetYear=examTargetYear_(requestedYear),sh=ensureExamNumberSheet_(),last=Math.max(sh.getLastRow(),1);
    const saved=last>1?sh.getRange(2,1,last-1,EXAM_NUMBER_HEADERS_.length).getValues():[];
    const rowByKey={},used={'中１':new Set(),'中２':new Set(),'中３':new Set(),'小４':new Set(),'小５':new Set(),'小６':new Set()},max={'中１':1000,'中２':2000,'中３':3000,'小４':4000,'小５':5000,'小６':6000};
    saved.forEach((r,i)=>{const id=String(r[0]||'').trim(),grade=examGrade_(r[2]),number=Number(r[3]),year=Number(r[7]||2026);if(id)rowByKey[year+':'+id]={row:i+2,values:r};if(year===targetYear&&examNumberInGrade_(number,grade)){used[grade].add(number);max[grade]=Math.max(max[grade],number);}});
    const students=activeExamStudents_(targetYear),updates=[],appends=[],warnings=[],activeNumbers={};
    students.forEach(s=>{
      const found=rowByKey[targetYear+':'+s.studentId];let number=found?Number(found.values[3]):0;const oldGrade=found?examGrade_(found.values[2]):'';
      if(!found||oldGrade!==s.grade||!examNumberInGrade_(number,s.grade)){
        do{number=++max[s.grade];}while(used[s.grade].has(number));used[s.grade].add(number);
        const note=found&&oldGrade&&oldGrade!==s.grade?`学年訂正 ${oldGrade} ${found.values[3]}→${s.grade} ${number}`:`${targetYear}年度 自動割当`;
        const row=[s.studentId,s.name,s.grade,number,s.campus,new Date(),note,targetYear];found?updates.push({row:found.row,values:row}):appends.push(row);
      }else{
        const row=[s.studentId,s.name,s.grade,number,s.campus,found.values[5]||new Date(),found.values[6]||'',targetYear];
        if(String(found.values[1])!==s.name||examCampus_(found.values[4])!==s.campus||Number(found.values[7])!==targetYear)updates.push({row:found.row,values:row});
      }
      if(activeNumbers[number])warnings.push(`受験番号${number}が重複しています（${activeNumbers[number]}・${s.name}）`);activeNumbers[number]=s.name;s.examNumber=String(number).padStart(4,'0');s.year=targetYear;
    });
    updates.forEach(u=>sh.getRange(u.row,1,1,EXAM_NUMBER_HEADERS_.length).setValues([u.values]));
    if(appends.length)sh.getRange(sh.getLastRow()+1,1,appends.length,EXAM_NUMBER_HEADERS_.length).setValues(appends);
    return {ok:true,year:targetYear,students:students,warnings:[...new Set(warnings)],updatedAt:Utilities.formatDate(new Date(),'Asia/Tokyo','yyyy/MM/dd HH:mm:ss')};
  }finally{lock.releaseLock();}
}
