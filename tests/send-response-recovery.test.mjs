import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const apiSource = fs.readFileSync(new URL('../api.js', import.meta.url), 'utf8');
const indexSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function loadHelpers(){
  const context = { console, URLSearchParams, AbortController, setTimeout, clearTimeout };
  vm.createContext(context);
  vm.runInContext(`${apiSource}\nglobalThis.__test = { sendResultFromInvestigation };`, context);
  return context.__test;
}

test('送信受付ログを成功結果へ変換する', () => {
  const { sendResultFromInvestigation } = loadHelpers();
  const result = sendResultFromInvestigation({
    found: true,
    items: [
      { studentName: '山田太郎', state: '送信受付', error: '' },
      { studentName: '山田太郎', state: '送信受付', error: '' }
    ]
  });
  assert.equal(result.ok, true);
  assert.equal(result.recovered, true);
  assert.equal(result.sentCount, 1);
  assert.deepEqual([...result.sentNames], ['山田太郎']);
  assert.deepEqual([...result.errors], []);
});

test('送信POSTは再送せず、失敗時に照合IDのログを確認する', () => {
  assert.match(apiSource, /payload\.action === 'sendSelected'/);
  assert.match(apiSource, /catch\(e\)\{ return recoverSendResultFromLog\(payload, e\); \}/);
  assert.match(apiSource, /await jsonpOnce\('investigateSend', \{ requestId \}\)/);
  assert.match(apiSource, /try\{ return await postJsonOnce\(payload\); \}\s*catch\(e\)/);
});

test('APIのキャッシュ更新番号が変更されている', () => {
  assert.match(indexSource, /api\.js\?v=20260813-send-auto-confirm-v1/);
});
