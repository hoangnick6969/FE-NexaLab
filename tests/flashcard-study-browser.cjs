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
      if (route.request().method() === "PUT") return route.fulfill({contentType:"application/json",body:"{}"});
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
    await harness("/src/features/classes/FlashcardStudy.tsx");
    await page.evaluate(async () => {
      const {React,root,module,code}=window.__uiCheck;
      const stylesheet=document.createElement("link"); stylesheet.rel="stylesheet"; stylesheet.href="/src/styles.css"; document.head.append(stylesheet);
      const queryUrl=[...code.matchAll(/from\s+"([^"]+)"/g)].map(m=>m[1]).find(v=>v.includes("tanstack_react-query"));
      const {QueryClient,QueryClientProvider}=await import(queryUrl);
      window.renderDeck=(cards)=>root.render(React.createElement(QueryClientProvider,{client:new QueryClient()},React.createElement(module.StudyDeck,{key:cards.length,resource:{id:"deck",classId:"class",title:"Dòng điện",content:{cards}}})));
      window.renderDeck([{id:"1",front:"Dòng điện là gì?",back:"Dòng chuyển dời có hướng."},{id:"2",front:"Pin có mấy cực?",back:"Hai cực."}]);
    });
    const flip=page.locator(".study-flip");
    await flip.click();
    await page.waitForFunction(()=>document.querySelector('.study-flip').classList.contains('is-flipped'));
    await page.getByRole("button",{name:"Thẻ sau"}).click();
    assert.equal(await flip.getAttribute("aria-pressed"),"false");
    assert.equal(await page.getByRole("button",{name:"Thẻ sau"}).isDisabled(),true);
    await flip.focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Space");
    await page.waitForFunction(()=>document.querySelector('.study-flip').classList.contains('is-flipped'));
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(500);
    await page.screenshot({path:"output/flashcard-study-mobile.png",fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth),true);
    await page.emulateMedia({reducedMotion:"reduce"});
    assert.equal(await page.locator(".study-flip-inner").evaluate(el=>getComputedStyle(el).transitionDuration),"0s");
    await page.evaluate(()=>window.renderDeck([]));
    await page.getByText("Bộ thẻ này chưa có nội dung.").waitFor();
    console.log("PASS flip, keyboard, boundaries, reset, mobile overflow, reduced motion, empty deck; API mocked");
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
