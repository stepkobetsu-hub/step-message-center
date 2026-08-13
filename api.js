const API_URL = 'https://script.google.com/macros/s/AKfycbxIH2VtgwRi50xduXgrkYrjD0yrzNfQ5vCWt1XgOzil6LZSgXNj6MJo9jPYvOkjNHdu/exec';

function delay(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function retry(fn, tries = 3){
  let last;
  for(let i=0;i<tries;i++){
    try{ return await fn(); }
    catch(e){ last=e; await delay(600 * (i + 1)); }
  }
  throw last;
}

function jsonpOnce(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    const qs = new URLSearchParams({ action, callback: callbackName, ...params });
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('通信がタイムアウトしました。もう一度お試しください。'));
    }, 45000);

    function cleanup(){
      clearTimeout(timer);
      try{ delete window[callbackName]; }catch(e){}
      try{ script.remove(); }catch(e){}
    }

    window[callbackName] = (data) => {
      cleanup();
      if(data && data.error) reject(new Error(data.message || 'Apps Scriptでエラーが発生しました'));
      else resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('通信に失敗しました。'));
    };
    script.src = `${API_URL}?${qs.toString()}`;
    document.body.appendChild(script);
  });
}

function jsonp(action, params = {}) {
  return retry(() => jsonpOnce(action, params), 3);
}

async function postJsonOnce(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try{
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!res.ok) throw new Error('送信に失敗しました。');
    const data = await res.json();
    if (data && data.error) throw new Error(data.message || 'Apps Scriptでエラーが発生しました');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function sendResultFromInvestigation(result) {
  if(!result || !result.found || !Array.isArray(result.items) || !result.items.length) return null;
  const failed = result.items.filter(item => item.error || /失敗|error|failed/i.test(String(item.state || '')));
  const successful = result.items.filter(item => !failed.includes(item));
  if(!successful.length) return null;
  const sentNames = [...new Set(successful.map(item => String(item.studentName || '').trim()).filter(Boolean))];
  return {
    ok: true,
    sentCount: sentNames.length || successful.length,
    sentNames,
    errors: failed.map(item => `${item.studentName || '送信先'}：${item.error || item.state || '送信失敗'}`),
    recovered: true,
    recoveryMessage: '送信ログで送信受付を自動確認しました。'
  };
}

async function recoverSendResultFromLog(payload, originalError) {
  const requestId = String(payload && payload.sendRequestId || '').trim();
  if(!requestId) throw originalError;
  const expectedStudents = new Set(Array.isArray(payload.studentIds) ? payload.studentIds.map(String) : []).size;
  const waits = [500, 1000, 2000, 3000];
  for(const wait of waits){
    await delay(wait);
    try{
      const investigation = await jsonpOnce('investigateSend', { requestId });
      const recovered = sendResultFromInvestigation(investigation);
      const loggedStudents = new Set((investigation.items || []).map(item => String(item.studentName || '').trim()).filter(Boolean)).size;
      if(recovered && (!expectedStudents || loggedStudents >= expectedStudents)) return recovered;
    }catch(ignore){}
  }
  throw originalError;
}

async function postJson(payload) {
  // メール送信POSTは二重送信防止のため再試行せず、応答障害時は同じ照合IDのログだけを確認します。
  if(payload && payload.action === 'sendSelected') {
    try{ return await postJsonOnce(payload); }
    catch(e){ return recoverSendResultFromLog(payload, e); }
  }
  return retry(() => postJsonOnce(payload), 2);
}

const api = {
  getStudents: () => jsonp('getStudents'),
  getTemplates: () => jsonp('getTemplates'),
  getSettings: () => jsonp('getSettings'),
  getHistory: (params) => jsonp('getHistory', params),
  getAbsences: () => jsonp('getAbsences'),
  investigateSend: (requestId) => jsonp('investigateSend', { requestId }),
  sendMail: (payload) => postJson({ action: 'sendSelected', ...payload }),
  archiveHistory: (id) => postJson({ action: 'archiveHistory', id }),
  restoreHistory: (id) => postJson({ action: 'restoreHistory', id }),
  deleteHistoryPermanent: (id) => postJson({ action: 'deleteHistoryPermanent', id }),
  saveTemplate: (payload) => postJson({ action: 'saveTemplate', ...payload }),
  saveSettings: (settings) => postJson({ action: 'saveSettings', settings }),
  saveTemplateAs: (payload) => postJson({ action: 'saveTemplateAs', ...payload }),
  deleteTemplate: (id) => postJson({ action: 'deleteTemplate', id }),
  refreshStudents: () => postJson({ action: 'refreshStudents' }),
  refreshAbsences: () => postJson({ action: 'refreshAbsences' })
};
