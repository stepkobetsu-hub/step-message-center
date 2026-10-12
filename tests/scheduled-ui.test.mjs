import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
function setup(){
  const ids=['deliveryMode','scheduledAtInput','scheduledModeOption','scheduleAvailability','scheduleInputWrap','sendBtn'];
  const elements=Object.fromEntries(ids.map(id=>[id,{value:'',disabled:true,textContent:'',classList:{toggle(){}}}]));
  elements.deliveryMode.value='now';
  const context={window:{},console,Date,setInterval(){},setTimeout,clearTimeout,document:{getElementById:id=>elements[id],addEventListener(){}},api:{getScheduledDeliveries:async()=>({supported:true,items:[]})}};
  vm.createContext(context);vm.runInContext(source,context);
  return {context,elements};
}
test('通常の配信では予約日時を要求しない',()=>{
  const f=setup();assert.equal(f.context.scheduleSelection(),null);f.context.syncDeliveryMode();assert.equal(f.elements.sendBtn.textContent,'配信する');
});
test('予約の時刻を端末のタイムゾーンによらず日本時間で指定する',async()=>{
  const f=setup();await f.context.checkScheduleSupport();f.elements.deliveryMode.value='scheduled';
  const time=new Date(Date.now()+3600000+9*3600000).toISOString().slice(0,16);f.elements.scheduledAtInput.value=time;
  const choice=f.context.scheduleSelection();assert.equal(choice.iso,time+':00+09:00');assert.equal(new Date(choice.iso).getTime(),new Date(time+'Z').getTime()-9*3600000);
  f.context.syncDeliveryMode();assert.equal(f.elements.sendBtn.textContent,'配信を予約する');
});
test('古い本番APIでは予約を有効化せず、通常の配信を維持する',async()=>{
  const f=setup();f.context.api.getScheduledDeliveries=async()=>({ok:true,version:'Ver.31.5'});await f.context.checkScheduleSupport();assert.equal(f.elements.scheduledModeOption.disabled,true);assert.equal(f.context.scheduleSelection(),null);f.elements.deliveryMode.value='scheduled';assert.throws(()=>f.context.scheduleSelection(),/準備が完了/);
});
test('空・過去・1分未満の予約日時は確認前に拒否する',async()=>{
  const f=setup();await f.context.checkScheduleSupport();f.elements.deliveryMode.value='scheduled';
  for(const value of ['', '2020-01-01T00:00',new Date(Date.now()+9*3600000).toISOString().slice(0,16)]){f.elements.scheduledAtInput.value=value;assert.throws(()=>f.context.scheduleSelection());}
});
