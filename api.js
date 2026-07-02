const API_URL = 'https://script.google.com/macros/s/AKfycbz9aRZIiaV4Vcz2jEyPsaoxWojUCts13IRR9dHveM8QM8baok0Wjm1jGA_M3lkqmQWRHw/exec';

function getStudents(callback) {
  const callbackName = 'jsonpCallback_' + Date.now();

  window[callbackName] = function(data) {
    callback(data);
    delete window[callbackName];
    script.remove();
  };

  const script = document.createElement('script');
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
