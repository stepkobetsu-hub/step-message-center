const API_URL = 'https://script.google.com/macros/s/AKfycbxIH2VtgwRi50xduXgrkYrjD0yrzNfQ5vCWt1XgOzil6LZSgXNj6MJo9jPYvOkjNHdu/exec';

function jsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    const qs = new URLSearchParams({ action, callback: callbackName, ...params });
    window[callbackName] = (data) => {
      resolve(data);
      delete window[callbackName];
      script.remove();
    };
    script.onerror = () => {
      reject(new Error('通信に失敗しました'));
      delete window[callbackName];
      script.remove();
    };
    script.src = `${API_URL}?${qs.toString()}`;
    document.body.appendChild(script);
  });
}

async function postJson(payload) {
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('送信に失敗しました');
  const data = await res.json();
  if (data && data.error) throw new Error(data.message || 'Apps Scriptでエラーが発生しました');
  return data;
}

const api = {
  getStudents: () => jsonp('getStudents'),
  getTemplates: () => jsonp('getTemplates'),
  getHistory: (params) => jsonp('getHistory', params),
  getAbsences: () => jsonp('getAbsences'),
  sendMail: (payload) => postJson({ action: 'sendSelected', ...payload }),
  archiveHistory: (id) => postJson({ action: 'archiveHistory', id }),
  restoreHistory: (id) => postJson({ action: 'restoreHistory', id }),
  deleteHistoryPermanent: (id) => postJson({ action: 'deleteHistoryPermanent', id }),
  saveTemplate: (payload) => postJson({ action: 'saveTemplate', ...payload }),
  saveTemplateAs: (payload) => postJson({ action: 'saveTemplateAs', ...payload }),
  deleteTemplate: (id) => postJson({ action: 'deleteTemplate', id }),
  refreshStudents: () => postJson({ action: 'refreshStudents' })
};
