const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const api = 'http://127.0.0.1:4409/api';
  async function request(path, body, token) {
    const r = await fetch(api + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}) });
    return {status:r.status, data:await r.json()};
  }
  const owner = await request('/auth/login', {email:'teacher.owner@nexalab.local',password:'AcceptanceOnly-2026!'});
  assert.equal(owner.status,201);
  const username = 'a1browser'+Date.now();
  const student = await request('/classes/class-pilot-a/students', {username, fullName:'A1 Browser Student', grade:8,consent:true}, owner.data.accessToken);
  assert.equal(student.status,201);
  const assignment = await request('/classes/class-pilot-a/assignments',{title:'A1 Published Lesson',contentId:'lesson-circuit',contentType:'lesson',dueDate:new Date(Date.now()+86400000).toISOString(),studentIds:[student.data.user.id]},owner.data.accessToken);
  assert.equal(assignment.status,201);
  const duplicate = await request('/classes/class-pilot-a/assignments',{title:'Invalid duplicate',contentId:'lesson-circuit',contentType:'lesson',dueDate:new Date().toISOString(),studentIds:[student.data.user.id,student.data.user.id]},owner.data.accessToken);
  assert.equal(duplicate.status,400);
  const browser = await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
  try {
    const page=await browser.newPage(); const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5199/');
    await page.getByLabel('Tên đăng nhập học sinh').fill(username);
    await page.getByLabel('Mật khẩu',{exact:true}).fill(student.data.credentials.temporaryPassword);
    await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
    await page.getByLabel('Mật khẩu tạm').fill(student.data.credentials.temporaryPassword);
    await page.getByLabel('Mật khẩu mới (ít nhất 12 ký tự)').fill('A1Browser-Private2026!');
    await page.getByRole('button',{name:'Lưu và bắt đầu học'}).click();
    await page.getByRole('link',{name:/A1 Published Lesson/}).waitFor();
    await page.reload();
    await page.getByRole('link',{name:/A1 Published Lesson/}).click();
    await page.getByRole('heading',{name:'Định luật Ohm',exact:true}).first().waitFor();
    for(const width of [390,768,1024,1440]) {
      await page.setViewportSize({width,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow at ${width}`);
    }
    await page.getByTitle('Đăng xuất').click();
    await page.getByLabel('Tên đăng nhập học sinh').waitFor();
    await page.reload(); await page.getByLabel('Tên đăng nhập học sinh').waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS provision -> password gate -> reload/refresh -> assigned published lesson -> logout -> reload; widths 390/768/1024/1440; duplicate targets rejected; no JS errors');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
