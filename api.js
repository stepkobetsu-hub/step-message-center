const API_URL = 'https://script.google.com/macros/s/AKfycbz9aRZIiaV4Vcz2jEyPsaoxWojUCts13IRR9dHveM8QM8baok0Wjm1jGA_M3lkqmQWRHw/exec';

function getStudentsRequest(callback) {
  const callbackName = 'jsonpCallback_' + Date.now();
  const script = document.createElement('script');
  let done = false;

  const cleanup = () => {
    try { delete window[callbackName]; } catch(e) { window[callbackName] = undefined; }
    if (script.parentNode) script.parentNode.removeChild(script);
  };

  const timer = setTimeout(() => {
    if (done) return;
    done = true;
    cleanup();
    callback({ error: true, message: '生徒一覧の取得がタイムアウトしました。Apps ScriptのデプロイURLと権限を確認してください。' });
  }, 15000);

  window[callbackName] = function(data) {
    if (done) return;
    done = true;
    clearTimeout(timer);
    cleanup();
    callback(data);
  };

  script.onerror = function() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    cleanup();
    callback({ error: true, message: '生徒一覧の取得に失敗しました。' });
  };

  script.src = API_URL + '?action=getStudents&callback=' + encodeURIComponent(callbackName) + '&t=' + Date.now();
  document.body.appendChild(script);
}

async function sendSelectedMail(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'sendSelected', ...payload })
  });
  if (!response.ok) throw new Error('送信に失敗しました。');
  return await response.json();
}
