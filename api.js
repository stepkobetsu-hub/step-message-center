const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyXVtW6Ys3QWSNf8OWO81fXgWDq1-iUYV7j0118oKTetY4r4s0gGen6CMkVOD0uo7E_YQ/exec';

async function sendMailRequest(payload) {
  // Apps ScriptはCORSの都合でレスポンスを読めない場合があるため no-cors で送信します。
  await fetch(WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return { ok: true };
}
