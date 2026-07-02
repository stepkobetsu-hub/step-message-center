const API_URL = 'https://script.google.com/macros/s/AKfycbz9aRZIiaV4Vcz2jEyPsaoxWojUCts13IRR9dHveM8QM8baok0Wjm1jGA_M3lkqmQWRHw/exec';

function getStudentsRequest(callback) {
  const callbackName = 'jsonpCallback_' + Date.now();

  const script = document.createElement('script');

  window[callbackName] = function(data) {
    callback(data);
    delete window[callbackName];
    script.remove();
  };

  script.onerror = function() {
    callback({
      error: true,
      message: '生徒一覧の取得に失敗しました。'
    });
    delete window[callbackName];
    script.remove();
  };

  script.src = API_URL + '?action=getStudents&callback=' + callbackName;
  document.body.appendChild(script);
}

async function sendSelectedMail(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'sendSelected',
      ...payload
    })
  });

  if (!response.ok) {
    throw new Error('送信に失敗しました。');
  }

  return await response.json();
}
