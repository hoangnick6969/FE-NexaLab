const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");

// Isolated browser harness: every /api request is fulfilled locally or aborted.
// Run against a Vite development server with TEST_WEB (loopback only).
const base = process.env.TEST_WEB ?? "http://127.0.0.1:5173";
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname), "Use a loopback Vite server");

(async () => {
  const browser = await chromium.launch({ channel: process.env.CHROME_PATH ? undefined : "chrome", executablePath: process.env.CHROME_PATH });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    page.on("pageerror", error=>{ if(!error.message.startsWith("Intentional")) console.error("HARNESS PAGE ERROR:",error.message); });
    let unexpectedApi = [];
    let responses = {};
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
      const response = responses[path] ?? (path === "/labs" ? {body:[]} : undefined);
      if (route.request().method() !== "GET" || !response) {
        unexpectedApi.push(route.request().method()+" "+path);
        return route.abort();
      }
      return route.fulfill({status:response.status ?? 200, contentType:"application/json", body:JSON.stringify(response.body)});
    });
    await page.route("**/__student-ui-check", route => route.fulfill({contentType:"text/html", body:'<!doctype html><html lang="en"><body><h1>Outer shell stays visible</h1><div id="ui-check-root"></div></body></html>'}));
    async function harness(source) {
      await page.goto(base+"/__student-ui-check");
      return await page.evaluate(async (source) => {
        const refresh = (await import("/@react-refresh")).default;
        refresh.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => type => type;
        window.__vite_plugin_react_preamble_installed__ = true;
        const code = await (await fetch(source)).text();
        const main = await (await fetch("/src/main.tsx")).text();
        const url = (text, part) => {
          const matches=[...text.matchAll(/from\s+"([^"]+)"/g)].map(match=>match[1]);
          const found=matches.find(value=>value.includes(part));
          if (!found) throw new Error("Missing transformed import "+part);
          return found;
        };
        const reactModule = await import(url(code+"\n"+main,"/react.js"));
        const React = reactModule.default ?? reactModule;
        const dom = await import(url(main,"react-dom_client.js"));
        window.__uiCheck = {React, root:(dom.createRoot ?? dom.default.createRoot)(document.getElementById("ui-check-root")), module:await import(source), code};
        return true;
      }, source);
    }
    await harness("/src/features/labs/runtime/lazy-lab-activity.tsx");
    await page.evaluate(() => {
      const {React,root,module}=window.__uiCheck;
      let loads=0;
      const Scene=module.loadLabActivity(() => ++loads===1 ? Promise.reject(new Error("Intentional first-load failure")) : Promise.resolve({default:({label,onAction})=>React.createElement("button",{onClick:onAction},label)}));
      window.__actions=0;
      root.render(React.createElement(Scene,{label:"Activity props preserved",onAction:()=>window.__actions++}));
    });
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByRole("heading",{name:"Outer shell stays visible"}).isVisible(),true);
    await page.getByRole("button",{name:/Thử tải lại|Try loading again/}).click();
    await page.getByRole("button",{name:"Activity props preserved"}).click();
    assert.equal(await page.evaluate(()=>window.__actions),1);
    console.log("PASS lazy rejection stays local; retry restores scene and props");
    await harness("/src/features/labs/runtime/lazy-lab-activity.tsx");
    await page.evaluate(() => {
      const {React,root,module}=window.__uiCheck;
      const Scene=module.loadLabActivity(()=>Promise.resolve({default:()=>{throw new Error("Intentional render failure");}}));
      root.render(React.createElement(Scene,{}));
    });
    await page.getByRole("alert").waitFor();
    await page.getByRole("button",{name:/Thử tải lại|Try loading again/}).click();
    await page.getByRole("button",{name:/Tải lại trang|Reload page/}).waitFor();
    assert.equal(await page.getByRole("heading",{name:"Outer shell stays visible"}).isVisible(),true);
    console.log("PASS scene render failure is isolated; failed retry offers explicit reload");

    const stats={data:{progress:[],attempts:[]},isPending:false,isLoading:false,error:null,refetch:()=>{}};
    const assignments={data:[],isPending:false,isLoading:false,error:null,refetch:()=>{}};
    const subject={name:"Science",grades:[{chapters:[{topics:[{lessons:[{id:"open-lesson",title:"Open lesson"}]}]}]}]};
    const step={id:"video-step",type:"VIDEO",position:2,state:"IN_PROGRESS"};
    const completedGlobal={contentId:"assigned-lesson",status:"completed",updatedAt:"2026-11-01T10:00:00Z"};
    async function mountDashboard(queue, rows) {
      await harness("/src/features/dashboard/StudentDashboard.tsx");
      await page.evaluate(async ({queue,rows,stats,assignments})=>{
        const {React,root,module,code}=window.__uiCheck;
        const auth=await import("/src/lib/api.ts");
        auth.useAuth.getState().set({id:"ui-student",fullName:"UI Student",grade:8,role:"STUDENT"},"fixture-token");
        const imports=[...code.matchAll(/from\s+"([^"]+)"/g)].map(match=>match[1]);
        const query=await import(imports.find(url=>url.includes("@tanstack_react-query.js")));
        const router=await import(imports.find(url=>url.includes("react-router-dom.js")));
        const client=new query.QueryClient({defaultOptions:{queries:{retry:false}}});
        window.__uiClient=client;
        root.render(React.createElement(query.QueryClientProvider,{client},React.createElement(router.BrowserRouter,null,React.createElement(module.StudentDashboard,{user:{id:"ui-student",fullName:"UI Student",grade:8,role:"STUDENT"},stats:{...stats,data:{progress:rows,attempts:[]}},assignments:{...assignments,data:queue}}))));
      },{queue,rows,stats:{...stats,refetch:undefined},assignments:{...assignments,refetch:undefined}});
    }
    responses={
      "/me/progress":{body:{assignments:[{assignmentId:"new-assignment",completed:false}]}},
      "/assignments/new-assignment":{body:{contentType:"lesson",content:{id:"assigned-lesson",title:"Assigned lesson"}}},
      "/lessons/assigned-lesson/pathway":{body:{lesson:{id:"assigned-lesson",title:"Assigned lesson",subject:{name:"Science"}},steps:[{id:"reading-step",type:"READING",position:1,state:"AVAILABLE"}],nextStepId:"reading-step"}},
    };
    await mountDashboard([{id:"new-assignment",title:"Teacher task",canOpen:true,contentType:"lesson",contentId:"assigned-lesson",classroom:{name:"Class 8"}}],[completedGlobal]);
    await page.locator(".student-dashboard").waitFor();
    await page.locator(".student-continue-action").waitFor();
    assert.match(await page.locator(".student-continue-action").getAttribute("href"),/assigned-lesson\?tab=reading&assignmentId=new-assignment/);
    console.log("PASS dashboard preserves unfinished assignment despite completed global lesson");
    responses={
      "/me/progress":{body:{assignments:[]}},
      "/open-curriculum":{body:{subjects:[subject]}},
      "/open-curriculum/lessons/open-lesson":{body:{steps:[step]}},
    };
    await mountDashboard([],[{contentId:"open-lesson",status:"in_progress",updatedAt:"2026-11-02T10:00:00Z"}]);
    await page.locator(".student-dashboard").waitFor();
    await page.locator(".student-continue-action").waitFor();
    assert.equal(await page.locator(".student-continue-action").getAttribute("href"),"/lessons/open-lesson?tab=video");
    console.log("PASS dashboard resumes the real in-progress video");
    responses["/me/progress"]={status:503,body:{message:"Completion lookup unavailable"}};
    await mountDashboard([],[{contentId:"open-lesson",status:"in_progress",updatedAt:"2026-11-02T10:00:00Z"}]);
    await page.locator(".student-dashboard").waitFor();
    await page.locator(".student-continue-action").waitFor();
    assert.equal(await page.locator(".student-continue-action").getAttribute("href"),"/lessons/open-lesson?tab=video");
    assert.equal(await page.locator('a[href="/assignments"]').count()>0,true);
    console.log("PASS completion lookup failure preserves safe assignment access and open resume");
    assert.deepEqual(unexpectedApi,[],"Harness must not make unexpected API requests");
    console.log("PASS all browser checks used local fixtures; no real API data accessed");
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
