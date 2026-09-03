// 2026-09-04: 生徒検索で「髙」と「高」を同一文字として扱う。
// 例：生徒名が「髙木」の場合でも、「高木」で検索できるようにする。
(function(){
  const baseNormalizeStudentSearch_ = normalizeStudentSearch_;
  normalizeStudentSearch_ = function(value){
    return baseNormalizeStudentSearch_(value).replace(/髙/g,'高');
  };
})();
