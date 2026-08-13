import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const code = fs.readFileSync(new URL('../Code.gs', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const style = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('Brevo opened Webhookを認証して個別メールログへ記録する', () => {
  for (const text of [
    "route==='brevoOpenWebhook'",
    'BREVO_OPEN_WEBHOOK_TOKEN',
    'handleStepBrevoOpenWebhook_',
    "events:['opened']",
    '初回開封日時',
    '最終開封日時',
    '開封回数',
    '最終開封イベントキー'
  ]) assert.ok(code.includes(text), text);
});

test('履歴と個別メールログを送信要求IDで紐づける', () => {
  assert.match(code, /'送信要求ID'/);
  assert.match(code, /d\.sendRequestId\|\|''/);
  assert.match(code, /getStepOpenStatusByRequestIds_/);
  assert.match(code, /openStatuses\[item\.sendRequestId\]/);
  assert.match(code, /開封確認データなし/);
});

test('送信履歴へ誤断定しない開封表示を追加する', () => {
  for (const text of ['開封確認あり','開封確認なし','開封確認データなし','openRecipients']) assert.ok(app.includes(text), text);
  for (const text of ['openConfirmed','openUnconfirmed','openUnavailable']) assert.ok(style.includes(text), text);
  assert.match(page, /20260813-open-tracking-v1/);
});

test('Webhook登録は既存WebアプリURLを使い秘密トークンを戻り値へ含めない', () => {
  assert.match(code, /ScriptApp\.getService\(\)\.getUrl\(\)/);
  assert.match(code, /先に既存Webアプリを新バージョンへデプロイしてください/);
  const setup = code.match(/function setupStepBrevoOpenWebhook\(\)\{[\s\S]*?\n\}/)?.[0] || '';
  assert.ok(setup);
  assert.doesNotMatch(setup, /return \{[^}]*token/);
});
