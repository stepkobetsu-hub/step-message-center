import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('送信ログの左にLINE講師連絡と公式LINEを横並び表示する',()=>{
  assert.match(html,/class="systemNav"/);
  assert.match(html,/LINE講師連絡システムへ/);
  assert.match(html,/https:\/\/stepkobetsu-hub\.github\.io\/step-form\/teacher_line_contact\.html/);
  assert.match(html,/公式LINEへ/);
  assert.match(html,/https:\/\/chat\.line\.biz\/U4ec286ef731d320a710bfa6cc796b713/);
  assert.match(html,/class="top".*class="systemNav".*href="template\.html"/);
  assert.match(css,/\.systemNavButton/);
  assert.match(css,/\.systemNav\{display:flex;gap:6px;align-items:center;margin:0\}/);
  assert.match(js,/related\.after\(btn\)/);
});
