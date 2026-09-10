// Run with PLAYWRIGHT_MODULE_PATH pointing to Playwright if it is not locally installed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = process.env.VERIFY_OUTPUT || '/tmp/moneyflow-verify';
const baseURL = process.env.VERIFY_URL || 'http://127.0.0.1:5174';
fs.mkdirSync(output, { recursive: true });
const results = [];
let browser;
const now = new Date();
const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
const previous = new Date(now.getFullYear(),now.getMonth()-1,1);
const lastMonth = `${previous.getFullYear()}-${String(previous.getMonth()+1).padStart(2,'0')}`;
const data = {
  user: { id:'verify-a', email:'verify-a@example.test', name:'Verification A' }, themeMode:'light', accounts:[],
  transactions:[
    {id:'food-a',merchant:'Test groceries',categoryId:'cat-food',amount:-300,type:'expense',date:`${month}-01`},
    {id:'food-b',merchant:'Test lunch',categoryId:'cat-food',amount:-120,type:'expense',date:`${month}-02`},
    {id:'bill',merchant:'Test subscription',categoryId:'cat-subs',amount:-20,type:'expense',date:`${lastMonth}-12`,recurring:true,frequency:'monthly'},
    {id:'income',merchant:'Test salary',categoryId:'cat-income',amount:2000,type:'income',date:`${month}-01`}
  ], budgets:[{categoryId:'cat-food',amount:400,periodType:'monthly',periodKey:month}],
  goals:[{id:'trip',name:'Test trip',current:300,target:1000}], categories:[], incomeEntries:[],incomeSources:[],savingsTransfers:[]
};
async function check(name, fn) {
  try { await fn(); results.push({name, status:'PASS'}); console.log('PASS',name); }
  catch(e) { results.push({name,status:'FAIL',error:e.message}); console.log('FAIL',name,e.message.slice(0,250)); }
}
async function session({mobile=false,platform='macOS',speech='absent',width=1440,height=1000}={}) {
  const ctx = await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  await ctx.addInitScript(({data,platform,speech})=>{
    Object.defineProperty(navigator,'userAgentData',{configurable:true,value:{platform}});
    Object.defineProperty(navigator,'platform',{configurable:true,value:platform==='macOS'?'MacIntel':'Win32'});
    if (!localStorage.getItem('verify-seeded')) {
      localStorage.setItem('et:auth-users',JSON.stringify([data.user,{id:'verify-b',email:'verify-b@example.test',name:'Verification B'}]));
      localStorage.setItem('et:auth-session','verify-a');
      localStorage.setItem('et:app-state:verify-a',JSON.stringify(data));
      localStorage.setItem('verify-seeded','1');
    }
    window.SpeechRecognition=undefined; window.webkitSpeechRecognition=undefined;
    if(speech==='mock') window.SpeechRecognition=class {
      start(){window.verifySpeech=this;this.onstart?.();}
      stop(){this.onend?.();}
      abort(){this.onend?.();}
    };
  },{data,platform,speech});
  const page=await ctx.newPage(); page.setDefaultTimeout(3500);
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(baseURL+'/dashboard'); await page.getByRole('button',{name:'Open Moneyflow assistant'}).waitFor();
  return {ctx,page,errors};
}
async function open(page){if(!await page.locator('#moneyflow-chat').count())await page.getByRole('button',{name:'Open Moneyflow assistant'}).click(); await page.waitForFunction(()=>{const el=document.querySelector('#moneyflow-chat');return el && el.getAnimations().every(a=>a.playState==='finished') && (innerWidth<1024 || document.querySelector('.chat-docked'));});}
async function query(page,text){await page.locator('#chat-input').fill(text); await page.getByRole('button',{name:'Send message',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.chat-thinking'));}
async function shot(page,name){await page.waitForTimeout(650);await page.screenshot({path:path.join(output,name+'.png'),fullPage:false});}
(async()=>{
 browser=await chromium.launch({headless:true,channel:process.env.VERIFY_BROWSER_CHANNEL || 'chrome'});
 const d=await session(); const page=d.page;
 await check('macOS shortcut hint recognizes userAgentData macOS',async()=>assert.match(await page.locator('.chat-launch').innerText(),/⌘/));
 await open(page);
 await check('Desktop dock is 380px and reserves content space',async()=>{
  const b=await page.locator('#moneyflow-chat').boundingBox();assert.equal(b.width,380);assert.equal(b.x,1060);
  assert.equal(await page.locator('#moneyflow-chat').getAttribute('role'),'complementary');
  assert.equal(await page.locator('.app').evaluate(el=>parseInt(getComputedStyle(el).paddingRight)),380);
 });
 await check('Mac Cmd+/ closes and reopens dock',async()=>{
  await page.keyboard.press('Meta+/'); await page.locator('#moneyflow-chat').waitFor({state:'hidden'});
  await page.keyboard.press('Meta+/');await page.locator('#moneyflow-chat').waitFor();
 });await open(page);
 await check('Spending chip yields $420 and an inline chart',async()=>{
  await page.getByRole('button',{name:"This month's spending",exact:true}).click();
  await page.locator('.chat-thinking').waitFor({state:'visible'});
  await page.locator('.chat-card-amount').first().waitFor();
  assert.equal(await page.locator('.chat-card-amount').first().innerText(),'$420.00');
  assert.equal(await page.locator('.chat-card canvas').count(),1);
 });
 await shot(page,'desktop-light');
 await check('Budget chip reports $420 of $400 and overspending',async()=>{
  await page.getByRole('button',{name:'Am I over budget?',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.chat-message--assistant').length===2);
  assert.match(await page.locator('.chat-message--assistant').last().innerText(),/over the limit/);
  assert.equal(await page.locator('.chat-progress').getAttribute('aria-valuetext'),'$420.00 of $400.00');
 });
 await check('Shift+Enter inserts a newline; Enter sends once',async()=>{
  await page.locator('#chat-input').fill('savings');await page.keyboard.press('Shift+Enter');await page.keyboard.type('goals');
  assert.equal(await page.locator('#chat-input').inputValue(),'savings\ngoals');
  const before=await page.locator('.chat-message--user').count();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>!document.querySelector('.chat-thinking'));
  assert.equal(await page.locator('.chat-message--user').count(),before+1);
  assert.match(await page.locator('.chat-message--assistant').last().innerText(),/\$300.00/);
 });
 await check('Desktop pointer resize and keyboard bounds',async()=>{
  const r=await page.locator('.chat-resize').boundingBox();await page.mouse.move(r.x+5,300);await page.mouse.down();await page.mouse.move(r.x-55,300,{steps:5});await page.mouse.up();
  assert.equal((await page.locator('#moneyflow-chat').boundingBox()).width,440);
  await page.locator('.chat-resize').focus();await page.keyboard.press('End');assert.equal((await page.locator('#moneyflow-chat').boundingBox()).width,480);
  await page.keyboard.press('Home');assert.equal((await page.locator('#moneyflow-chat').boundingBox()).width,360);
 });
 await check('Threads and desktop preferences survive reload',async()=>{
  await page.getByRole('button',{name:'New conversation',exact:true}).click();await query(page,'income');
  await page.reload();await page.locator('#moneyflow-chat').waitFor();assert.equal((await page.locator('#moneyflow-chat').boundingBox()).width,360);
  assert.equal(await page.locator('#chat-thread option').count(),2);assert.match(await page.locator('.chat-message--assistant').innerText(),/\$2,000.00/);
  const options=await page.locator('#chat-thread option').evaluateAll(els=>els.map(el=>el.value));await page.locator('#chat-thread').selectOption(options[1]);assert.equal(await page.locator('.chat-message--assistant').count(),3);
 });
 await check('Category link navigates to matching filtered records',async()=>{
  await page.locator('.chat-legend a').first().click();await page.waitForURL('**/transactions?**');
  assert.equal(new URL(page.url()).searchParams.get('category'),'cat-food');
  assert.equal(new URL(page.url()).searchParams.get('month'),month);
  await page.waitForFunction(()=>!document.querySelector('main').innerText.includes('Test salary'));
  assert.match(await page.locator('main').innerText(),/Test groceries/);assert.doesNotMatch(await page.locator('main').innerText(),/Test salary/);
 });
 await check('Transaction reference opens transaction detail',async()=>{
  await query(page,'Food spending');await page.locator('.chat-message--assistant').last().getByRole('link',{name:'Test lunch'}).click();
  await page.waitForURL('**/transactions/food-b');assert.match(await page.locator('main').innerText(),/Test lunch/);
 });
 await check('Desktop and narrow desktop have no page overflow',async()=>{
  await page.goto(baseURL+'/dashboard');await open(page);
  for(const w of [1440,1280,1024]){await page.setViewportSize({width:w,height:900});await page.waitForTimeout(100);const dims=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dims.scroll<=dims.width,JSON.stringify(dims));}
 });
 await page.setViewportSize({width:1440,height:1000});
 await check('Chat and chart render in dark theme',async()=>{
  await page.evaluate(()=>{const k='et:app-state:verify-a';const d=JSON.parse(localStorage.getItem(k));d.themeMode='dark';localStorage.setItem(k,JSON.stringify(d));});await page.reload();await page.locator('#moneyflow-chat').waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await shot(page,'desktop-dark');
 });
 await check('Account B cannot see account A chat; returning restores A',async()=>{
  await page.evaluate(()=>localStorage.setItem('et:auth-session','verify-b'));await page.reload();await open(page);assert.equal(await page.locator('.chat-message').count(),0);
  await query(page,'spending');assert.match(await page.locator('.chat-message--assistant').innerText(),/No expenses/);
  await page.evaluate(()=>localStorage.setItem('et:auth-session','verify-a'));await page.reload();await open(page);assert.ok(await page.locator('.chat-message').count()>2);
 });
 await check('Corrupt saved chat recovers without a crash',async()=>{
  await page.evaluate(()=>localStorage.setItem('et:chat:verify-a','{broken'));await page.reload();await open(page);assert.equal(await page.locator('.chat-message').count(),0);
 });
 await check('Upcoming bills chip returns labeled estimate and record link',async()=>{
  await page.getByRole('button',{name:'Upcoming bills',exact:true}).click();await page.locator('.chat-card').waitFor();
  assert.match(await page.locator('.chat-message--assistant').innerText(),/Estimated recurring expenses/);
  assert.equal(await page.locator('.chat-card-amount').innerText(),'$20.00');assert.equal(await page.locator('.chat-card a').getAttribute('href'),'/transactions/bill');
 });
 await check('Last-month reference preserves its period',async()=>{
  await query(page,'last month spending');await page.locator('.chat-message--assistant').last().getByRole('link',{name:'Total spending'}).click();await page.waitForURL('**/transactions?**');
  assert.equal(new URL(page.url()).searchParams.get('month'),lastMonth);await page.waitForFunction(()=>document.querySelector('main').innerText.includes('Test subscription'));
 });
 await check('Unsupported speech API hides microphone',async()=>assert.equal(await page.getByRole('button',{name:'Start voice input',exact:true}).count(),0));
 const w=await session({platform:'Windows'});
 await check('Windows Ctrl+/ toggles with correct hint',async()=>{
  assert.match(await w.page.locator('.chat-launch').innerText(),/Ctrl/);await w.page.keyboard.press('Control+/');await w.page.locator('#moneyflow-chat').waitFor();await w.page.keyboard.press('Control+/');await w.page.locator('#moneyflow-chat').waitFor({state:'hidden'});
 });
 const m=await session({mobile:true,width:390,height:844});
 await check('Mobile FAB clears bottom navigation',async()=>{
  const f=await m.page.locator('.chat-launch').boundingBox();const nav=await m.page.locator('.sidebar').boundingBox();assert.ok(f.y+f.height<=nav.y);assert.ok(f.width>=44&&f.height>=44);
 });await open(m.page);
 await check('Mobile is full viewport modal with inert background',async()=>{
  await m.page.waitForTimeout(250);const r=await m.page.locator('#moneyflow-chat').boundingBox();assert.equal(r.width,390);assert.ok(Math.abs(r.height-844)<1);assert.ok(Math.abs(r.y)<1);
  assert.equal(await m.page.locator('#moneyflow-chat').getAttribute('aria-modal'),'true');assert.equal(await m.page.locator('main').evaluate(el=>el.inert),true);
 });
 await check('Mobile quick reply renders card and chart',async()=>{await m.page.getByRole('button',{name:"This month's spending",exact:true}).click();await m.page.locator('.chat-card').waitFor();assert.equal(await m.page.locator('.chat-card-amount').first().innerText(),'$420.00');await shot(m.page,'mobile-light');});
 await check('Mobile controls have 44px touch targets',async()=>{
  const short=await m.page.locator('#moneyflow-chat button, #moneyflow-chat select, #moneyflow-chat a, #chat-input').evaluateAll(els=>els.filter(e=>e.getClientRects().length).map(e=>({text:e.getAttribute('aria-label')||e.textContent,h:e.getBoundingClientRect().height,w:e.getBoundingClientRect().width})).filter(r=>r.h<44||r.w<44));assert.deepEqual(short,[]);
 });
 await check('Short drag keeps modal open; long drag dismisses',async()=>{
  const handle=await m.page.locator('.chat-drag').boundingBox();const x=handle.x+handle.width/2,y=handle.y+20;
  await m.page.mouse.move(x,y);await m.page.mouse.down();await m.page.mouse.move(x,y+35,{steps:4});await m.page.mouse.up();assert.equal(await m.page.locator('#moneyflow-chat').count(),1);
  await m.page.mouse.move(x,y);await m.page.mouse.down();await m.page.mouse.move(x,y+140,{steps:6});await m.page.mouse.up();await m.page.locator('#moneyflow-chat').waitFor({state:'hidden'});assert.equal(await m.page.locator('main').evaluate(el=>el.inert),false);
 });await open(m.page);
 await check('Mobile focus cycles inside dialog',async()=>{
  await m.page.locator('.chat-drag').focus();await m.page.keyboard.press('Shift+Tab');assert.equal(await m.page.evaluate(()=>document.activeElement.closest('#moneyflow-chat')!==null),true);
  await m.page.keyboard.press('Tab');assert.equal(await m.page.evaluate(()=>document.activeElement.className),'chat-drag');
 });
 await check('Simulated keyboard viewport keeps composer visible',async()=>{
  await m.page.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,value:410});Object.defineProperty(window.visualViewport,'offsetTop',{configurable:true,value:45});window.visualViewport.dispatchEvent(new Event('resize'));});
  await m.page.waitForFunction(()=>document.querySelector('#moneyflow-chat').style.getPropertyValue('--chat-height')==='410px');
  const p=await m.page.locator('#moneyflow-chat').boundingBox();const i=await m.page.locator('#chat-input').boundingBox();assert.equal(p.y,45);assert.equal(p.height,410);assert.ok(i.y+i.height<=455);await shot(m.page,'mobile-keyboard-simulated');
  await m.page.evaluate(()=>{delete window.visualViewport.height;delete window.visualViewport.offsetTop;window.visualViewport.dispatchEvent(new Event('resize'));});
 });
 await check('Mobile category navigation dismisses chat',async()=>{await m.page.locator('.chat-legend a').first().click();await m.page.waitForURL('**/transactions?**');await m.page.locator('#moneyflow-chat').waitFor({state:'hidden'});});
 await check('Mobile layout fits narrow and landscape viewports',async()=>{
  await open(m.page);for(const size of [{width:320,height:568},{width:844,height:390}]){await m.page.setViewportSize(size);await m.page.waitForTimeout(350);const dim=await m.page.locator('#moneyflow-chat').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));assert.equal(dim.width,dim.scroll);const box=await m.page.locator('#chat-input').boundingBox();const vp=await m.page.evaluate(()=>({innerHeight,innerWidth,height:visualViewport.height,offset:visualViewport.offsetTop,panel:document.querySelector('#moneyflow-chat').getBoundingClientRect().toJSON()}));await shot(m.page,`mobile-${size.width}`);assert.ok(box.y+box.height<=size.height+1,JSON.stringify({size,box,vp}));}
 });
 await check('Reduced motion disables mobile slide animation',async()=>{
  await m.page.emulateMedia({reducedMotion:'reduce'});await m.page.getByRole('button',{name:'Close assistant',exact:true}).click();await open(m.page);
  assert.equal(await m.page.locator('#moneyflow-chat').evaluate(el=>getComputedStyle(el).animationName),'none');
 });
 await check('Mobile Enter inserts newline without sending',async()=>{
  await m.page.locator('#chat-input').fill('food');const count=await m.page.locator('.chat-message--user').count();await m.page.keyboard.press('Enter');await m.page.keyboard.type('spending');
  assert.equal(await m.page.locator('#chat-input').inputValue(),'food\nspending');assert.equal(await m.page.locator('.chat-message--user').count(),count);
 });
 const v=await session({speech:'mock'});await open(v.page);
 await check('Mock voice dictation populates draft and does not send',async()=>{
  await v.page.getByRole('button',{name:'Start voice input',exact:true}).click();await v.page.getByRole('button',{name:'Stop voice input',exact:true}).waitFor();
  await v.page.evaluate(()=>{window.verifySpeech.onresult({results:[[{transcript:'Food spending'}]]});window.verifySpeech.onend();});
  await v.page.waitForFunction(()=>document.querySelector('#chat-input').value==='Food spending');assert.equal(await v.page.locator('#chat-input').inputValue(),'Food spending');assert.equal(await v.page.locator('.chat-message').count(),0);
 });
 await check('Mock voice permission denial gives usable fallback',async()=>{
  await v.page.getByRole('button',{name:'Start voice input',exact:true}).click();await v.page.evaluate(()=>window.verifySpeech.onerror({error:'not-allowed'}));assert.match(await v.page.getByRole('alert').innerText(),/denied/);await query(v.page,'spending');assert.equal(await v.page.locator('.chat-card-amount').first().innerText(),'$420.00');
 });
 await check('Chat storage quota failure shows notice and keeps chat usable',async()=>{
  await v.page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('et:chat:'))throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value);};});
  await query(v.page,'goals');assert.match(await v.page.locator('.chat-notice').first().innerText(),/could not be saved/);assert.match(await v.page.locator('.chat-message--assistant').last().innerText(),/Test trip/);
 });
 await check('No browser runtime exceptions',async()=>assert.deepEqual([...d.errors,...w.errors,...m.errors,...v.errors],[]));
 await browser.close();
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({date:new Date().toISOString(),browser:'Chrome headless',results},null,2));
 console.log(JSON.stringify({passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,output}));
 process.exitCode=results.some(x=>x.status==='FAIL')?1:0;
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1;});
