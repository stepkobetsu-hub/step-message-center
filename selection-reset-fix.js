// 2026-09-04: 送信対象の選択が0人に戻ったとき、学年フィルターを「全生徒」へ復帰させる。
// 「決定」で候補一覧を隠したあと、選択した生徒を全員解除すると検索結果が0件のままになる問題への対策。
// 2026-09-04: 生徒検索では「髙」と「高」を同一文字として扱う。
(function(){
  const baseNormalizeStudentSearch_ = normalizeStudentSearch_;
  normalizeStudentSearch_ = function(value){
    return baseNormalizeStudentSearch_(value).replace(/髙/g,'高');
  };

  function restoreAllStudentsFilterIfEmpty(){
    if(selected.size!==0)return false;
    activeGrades=new Set(['全生徒']);
    renderGradeButtons();
    return true;
  }

  toggleStudent=function(id){
    const s=students.find(x=>x.id===id);
    if(!s)return;
    if(selected.has(id)){
      selected.delete(id);
      restoreAllStudentsFilterIfEmpty();
    }else{
      selected.set(id,s);
    }
    renderStudents();
    updatePreview();
  };

  window.removeSelectedStudent=function(id){
    selected.delete(id);
    restoreAllStudentsFilterIfEmpty();
    renderStudents();
    updatePreview();
  };

  renderSelected=function(){
    const arr=[...selected.values()];
    $('selectedCount').textContent=`${arr.length}人`;
    $('selectedSummary').classList.add('hidden');
    $('selectedList').innerHTML=arr.length
      ?arr.map(s=>`<div class="selectedItem"><span class="badge ${gradeClass(s.grade)}">${s.grade}</span><b>${s.name}さん</b><span>${s.school}</span><button class="chipX" title="解除" onclick="removeSelectedStudent('${s.id}')">×</button></div>`).join('')
      :'<span class="muted">まだ選択されていません。</span>';
  };

  decideSelection=function(){
    if(selected.size===0){
      activeGrades=new Set(['全生徒']);
    }else{
      activeGrades.clear();
    }
    $('nameFilter').value='';
    renderGradeButtons();
    renderStudents();
    updatePreview();
    document.getElementById('studentList')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  };

  document.addEventListener('DOMContentLoaded',()=>{
    const clearAll=$('clearAllSelectedBtn');
    if(clearAll)clearAll.onclick=()=>{
      selected.clear();
      activeGrades=new Set(['全生徒']);
      renderGradeButtons();
      renderStudents();
      updatePreview();
    };

    const clearVisible=$('clearVisibleBtn');
    if(clearVisible)clearVisible.onclick=()=>{
      filtered().forEach(s=>selected.delete(s.id));
      restoreAllStudentsFilterIfEmpty();
      renderStudents();
      updatePreview();
    };

    const invertVisible=$('invertVisibleBtn');
    if(invertVisible)invertVisible.onclick=()=>{
      filtered().forEach(s=>selected.has(s.id)?selected.delete(s.id):selected.set(s.id,s));
      restoreAllStudentsFilterIfEmpty();
      renderStudents();
      updatePreview();
    };
  });
})();
