const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyXVtW6Ys3QWSNf8OWO81fXgWDq1-iUYV7j0118oKTetY4r4s0gGen6CMkVOD0uo7E_YQ/exec';

function getStudentsRequest() {
  return new Promise((resolve, reject) => {
    const callbackName = 'stepStudentCallback_' + Date.now();
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('生徒一覧の取得がタイムアウトしました。'));
    }, 15000);

    function cleanup() {
      clearTimeout(timer);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = data => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('生徒一覧を取得できませんでした。Apps Scriptのデプロイを確認してください。'));
    };

    script.src = `${WEB_APP_URL}?action=getStudents&callback=${callbackName}&t=${Date.now()}`;
    document.body.appendChild(script);
  });
}

async function sendSelectedMailRequest(payload) {
  await fetch(WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'sendSelected', ...payload })
  });
  return { ok: true };
}
