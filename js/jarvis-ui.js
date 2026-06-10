/* ============================================================================
   jarvis-ui.js — boot sequence, command palette, narration captions,
   live HUD telemetry, per-scene contextual panel, and orchestration.
   ============================================================================ */
(function () {
  const D = window.DATA, J = window.JV;
  const $ = (s) => document.querySelector(s);
  const A = window.JVA;
  const cmdById = {};
  D.commands.forEach((c) => (cmdById[c.scene] = c));

  /* ---- theme hue tween --------------------------------------------------- */
  const hueProxy = { h: 205 };
  function setHue(h) {
    gsap.to(hueProxy, { h, duration: 0.9, ease: "power2.inOut", onUpdate() { document.documentElement.style.setProperty("--hue", Math.round(hueProxy.h)); } });
  }

  /* ---- live clock + system mini ----------------------------------------- */
  let tick = 0;
  function clock() {
    const d = new Date();
    $("#clock").textContent = d.toTimeString().slice(0, 8);
    $("#date").textContent = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase();
    $("#cpu").textContent = (42 + (tick % 12)).toFixed(0) + "%";
    $("#mem").textContent = (3.2 + (tick % 8) * 0.1).toFixed(1) + "GB";
    $("#lat").textContent = (30 + (tick % 9)).toFixed(0) + "ms";
    tick++;
  }
  setInterval(clock, 1000); clock();

  /* ---- vitals bars ------------------------------------------------------- */
  const VITALS = [
    { k: "CPU LOAD", v: 87 }, { k: "MEMORY", v: 62 }, { k: "API QUOTA", v: 78 },
    { k: "LI SAFETY", v: 81 }, { k: "GHL SYNC", v: 55 },
  ];
  function renderVitals() {
    $("#vitals").innerHTML = VITALS.map((b) =>
      `<div class="bar-row"><div class="bl"><span>${b.k}</span><span>${Math.round(b.v)}%</span></div>
       <div class="bar-track"><div class="bar-fill" style="width:${b.v}%"></div></div></div>`).join("");
  }
  renderVitals();
  setInterval(() => { VITALS.forEach((b) => (b.v = Math.min(99, Math.max(8, b.v + (Math.random() * 8 - 4))))); renderVitals(); }, 2600);

  /* ---- agent list -------------------------------------------------------- */
  $("#agentlist").innerHTML = D.agents.map((a) =>
    `<div class="arow"><div class="l"><span class="d ${a.status === "ACTIVE" ? "on" : "sb"}"></span><span class="nm">${a.name}</span></div><span class="st">${a.status}</span></div>`).join("");

  /* ---- rolling telemetry ------------------------------------------------- */
  const tel = $("#telemetry");
  let telIdx = 0, telLines = [];
  function pushTel() {
    const line = D.telemetry[telIdx % D.telemetry.length]; telIdx++;
    const parts = line.split("›");
    telLines.push(`<div class="t"><span class="a">${parts[0]}›</span>${parts[1] || ""}</div>`);
    if (telLines.length > 9) telLines.shift();
    tel.innerHTML = telLines.join("");
  }
  for (let i = 0; i < 6; i++) pushTel();
  setInterval(pushTel, 2800);

  /* ---- contextual right panel ------------------------------------------- */
  const stat = (k, v, cls) => `<div class="stat"><div class="k">${k}</div><div class="v ${cls || ""}">${v}</div></div>`;
  const mr = (k, v) => `<div class="minirow"><span>${k}</span><span>${v}</span></div>`;
  const CTX = {
    home: () => ({ t: "PRIMARY OBJECTIVE", h: stat("CURRENT MRR", "$13,200", "") + `<div class="bar-track" style="margin:6px 0 14px"><div class="bar-fill" style="width:44%"></div></div>` + mr("TARGET", "$30,000") + mr("PROGRESS", "44%") + mr("ARR", "$158,400") + mr("ACTIVE AGENTS", "6 / 8") + mr("STATUS", "ALL NOMINAL") }),
    revenue: () => ({ t: "REVENUE GOAL", h: stat("MRR", "$13,200") + mr("TARGET", "$30,000") + mr("PROGRESS", "44%") + mr("ARR", "$158,400") + mr("NET NEW", "+$2,840") + mr("CONFIDENCE", "91%") + `<div style="margin-top:8px">${["TO GOAL","$16,800 GAP"].map(c=>`<span class="chip">${c}</span>`).join("")}</div>` }),
    attribution: () => ({ t: "ATTRIBUTION", h: stat("CHANNELS", "5") + D.channels.map((c) => mr(c.name, "$" + c.mrr.toLocaleString() + " · " + c.pct + "%")).join("") }),
    growth: () => ({ t: "GROWTH ENGINE", h: D.funnel.map((s) => mr(s.label, s.count.toLocaleString() + (s.conv < 100 ? " · " + s.conv + "%" : ""))).join("") + stat("BOOK RATE", "0.69%", "warn") }),
    leakage: () => ({ t: "OPPORTUNITY LEAKAGE", h: stat("LOST / MO", "$8,400", "bad") + D.leaks.map((l) => mr(l.stage.split(" → ")[0] + "→" + l.stage.split(" → ")[1].slice(0, 3), "-$" + l.valueLost.toLocaleString())).join("") + `<div style="margin-top:8px"><span class="chip" style="border-color:#ff5a52;color:#ff8a82">3 FRACTURES</span></div>` }),
    agents: () => ({ t: "AGENT VALUE", h: stat("TOP", "SCOUT", "warn") + D.agents.slice(0, 6).map((a) => mr(a.name, a.roi + "% ROI")).join("") }),
    health: () => ({ t: "OUTBOUND HEALTH", h: stat("HEALTH SCORE", "86", "good") + D.health.systems.map((s) => mr(s.name, s.v + s.unit)).join("") }),
    customers: () => ({ t: "CUSTOMER UNIVERSE", h: stat("CUSTOMERS", "322") + mr("SUBSCRIPTIONS", "410") + mr("ARPU", "$41") + mr("NRR", "112%") + mr("CHURN", "3.1%") + mr("TOP-3 CONC.", "17.9%") }),
    forecast: () => ({
      t: "FORECAST · NEXT MO",
      h: stat("PROJ. MRR", "$16,050") +
        mr("RANGE", "$14.1K–18.2K") +
        mr("SCENARIO", "LOW $14.1K · BASE $16.1K · HIGH $18.2K") +
        mr("NEW CUST", "+38") +
        mr("CHURN", "11") +
        mr("MEETINGS", "41") +
        mr("CONFIDENCE", "82%", "warn") +
        `<div style="margin-top:8px">${["TUNNEL VIEW","6-MONTH TRAJECTORY","UNCERTAINTY BAND"].map(c=>`<span class="chip">${c}</span>`).join("")}</div>`
    }),
    feed: () => ({
      t: "DAILY BRIEFING",
      h: stat("EXEC SUMMARY", "LIVE") +
        mr("GOOD SIGNALS", String(D.feed.filter((e) => e.tone === "good").length)) +
        mr("WARNINGS", String(D.feed.filter((e) => e.tone === "warn").length)) +
        mr("SYSTEM NOTES", String(D.feed.filter((e) => e.tone === "ok").length)) +
        D.feed.map((e) => mr(e.cat, e.text.length > 34 ? e.text.slice(0, 32) + "…" : e.text)).join("") +
        `<div style="margin-top:8px"><span class="chip">TIMELINE STREAM</span><span class="chip">HUB ROUTING</span></div>`
    }),
    facility19: () => ({ t: "FACILITY19 · ALL", h: stat("MRR", "$13,200") + mr("CUSTOMERS", "322") + mr("AGENTS", "8") + mr("HEALTH", "86") + mr("FORECAST", "$16K") + mr("LEAKAGE", "-$8.4K") + `<div style="margin-top:8px"><span class="chip">UNIFIED VIEW</span></div>` }),
  };
  function setCtx(scene) {
    const c = (CTX[scene] || CTX.home)();
    $("#ctx-title").textContent = c.t;
    const body = $("#ctx-body"); body.style.opacity = 0; body.innerHTML = c.h;
    gsap.to(body, { opacity: 1, duration: 0.5, delay: 0.4 });
  }

  /* ---- narration typewriter --------------------------------------------- */
  const capEl = $("#caption"), capTxt = capEl.querySelector(".ctxt");
  let typer = null;
  function narrate(text) {
    if (typer) clearInterval(typer);
    capEl.style.opacity = 1;
    capTxt.innerHTML = "";
    let i = 0;
    const cursor = '<span class="cursor"></span>';
    typer = setInterval(() => {
      i += 1;
      capTxt.innerHTML = text.slice(0, i) + (i < text.length ? cursor : "");
      if (A) A.play("type");
      if (i >= text.length) { clearInterval(typer); typer = null; }
    }, 18);
  }

  /* ---- scene title ------------------------------------------------------- */
  function showTitle(cmd) {
    const el = $("#scene-title");
    el.querySelector(".st-q").textContent = '"JARVIS, ' + cmd.q.toUpperCase() + '"';
    el.querySelector(".st-n").textContent = cmd.theme.name;
    gsap.fromTo(el, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.3 });
    gsap.to(el, { opacity: 0, duration: 0.8, delay: 4.2 });
  }

  /* ---- command dock ------------------------------------------------------ */
  const cmdsEl = $("#cmds");
  D.commands.forEach((c) => {
    const b = document.createElement("div");
    b.className = "cmd"; b.dataset.scene = c.scene;
    b.innerHTML = `<div class="ci">0${c.id}</div><div class="cn">${c.short}</div>`;
    b.addEventListener("mouseenter", () => { if (A) A.play("tick"); });
    b.addEventListener("click", () => run(c.scene));
    cmdsEl.appendChild(b);
  });

  let activeScene = null;
  function run(scene, opts) {
    opts = opts || {};
    if (J.transitioning || (scene === activeScene && !opts.fromVoice)) return;
    const cmd = cmdById[scene];
    if (!cmd) return;
    activeScene = scene;
    document.querySelectorAll(".cmd").forEach((el) => el.classList.toggle("active", el.dataset.scene === scene));
    $("#hint").style.opacity = 0;

    setHue(cmd.theme.hue);
    if (A) {
      A.setSceneHue(cmd.theme.hue);
      if (scene === "facility19") A.play("whoosh");
      else A.play("engage", cmd.theme.hue);
      if (scene === "leakage" || scene === "health") setTimeout(() => A.play("alert"), 700);
    }
    J.go(scene);
    showTitle(cmd);
    setCtx(scene);

    if (!opts.fromVoice) {
      capEl.style.opacity = 1;
      capTxt.innerHTML = '<span style="color:var(--ink-faint)">› recognizing command…</span>';
      if (A) setTimeout(() => A.play("process"), 500);
      setTimeout(() => { if (A) A.play("chime"); narrate(cmd.narration); }, 1100);
    }
  }

  window.JARVIS_UI = { run: run, narrate: narrate, setHue: setHue, setCtx: setCtx, engage: engageSystem };

  document.addEventListener("click", function ensureAudio() {
    if (A) { if (!A.ready) A.start(); else A.resume(); }
    document.removeEventListener("click", ensureAudio);
  }, true);

  /* ---- boot sequence ----------------------------------------------------- */
  const blog = $("#blog");
  const bootLines = [
    "BOOTING J.A.R.V.I.S KERNEL v9.4 ...",
    "MOUNTING AGENT CLUSTER [8] ......... <span class='ok'>OK</span>",
    "HR OPS AGENT HANDOFF ............... <span class='ok'>READY</span>",
    "NEXUS · CRM / BILLING LINK ......... <span class='ok'>OK</span>",
    "CALIBRATING VISUALIZATION ENGINE ... <span class='ok'>OK</span>",
    "VOICE INTELLIGENCE LAYER ........... <span class='ok'>ARMED</span>",
    "ENCRYPTION HANDSHAKE ............... <span class='ok'>SECURE</span>",
    "SYNTHESIZING REAL-TIME TELEMETRY ... <span class='ok'>LIVE</span>",
    "<span class='ok'>J.A.R.V.I.S ONLINE · VOICE ENABLED · AWAITING COMMAND</span>",
  ];
  let bl = 0, acc = "";
  function bootStep() {
    if (bl < bootLines.length) {
      acc += "› " + bootLines[bl] + "<br/>"; blog.innerHTML = acc; bl++;
      if (A) A.play(bl === bootLines.length ? "online" : "boot");
      setTimeout(bootStep, bl === bootLines.length ? 700 : 360);
    } else {
      gsap.to("#boot", { opacity: 0, duration: 1, onComplete() { $("#boot").style.display = "none"; } });
      window.dispatchEvent(new Event("jarvis-booted"));
    }
  }

  // ---- audio arm gate: start audio on first gesture, then run boot -------
  const arm = $("#audio-arm");
  let armed = false;
  function engageSystem() {
    if (armed) return; armed = true;
    if (A) A.start();
    gsap.to(arm, { opacity: 0, duration: 0.6, onComplete() { arm.style.display = "none"; } });
    J.go("home");
    setCtx("home");
    setTimeout(bootStep, 400);
  }
  arm.addEventListener("click", engageSystem);
  // if user never taps, still boot silently after a moment
  setTimeout(() => { if (!armed) { armed = true; arm.style.display = "none"; J.go("home"); setCtx("home"); setTimeout(bootStep, 200); } }, 9000);

  // ---- sound toggle ------------------------------------------------------
  const soundBadge = $("#b-sound");
  soundBadge.addEventListener("click", (e) => {
    e.stopPropagation();
    const on = !(A && A.enabled);
    if (A) A.toggle(on);
    soundBadge.classList.toggle("off", !on);
    $("#sound-state").textContent = on ? "ON" : "OFF";
    if (on && A) setTimeout(() => A.play("chime"), 60);
  });

  // occasional ambient notification chime tied to telemetry
  setInterval(() => { if (A && A.enabled && A.ready && Math.random() < 0.4) A.play("tick"); }, 5600);
})();
