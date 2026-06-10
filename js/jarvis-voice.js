/* ============================================================================
   jarvis-voice.js — Voice Intelligence Layer
   Wake word detection, conversational STT/TTS, OpenRouter LLM intent routing,
   ElevenLabs TTS, conversation memory, scene-aware knowledge base,
   and cinematic state machine with visual hooks.
   ============================================================================ */
(function () {
  const J = window.JV, A = window.JVA, D = window.DATA;

  /* ===========================================================================
     CONFIGURATION
     =========================================================================== */
  const ENV = window.JARVIS_CONFIG || {};
  const CFG = {
    OPENROUTER_KEY: ENV.OPENROUTER_KEY || "",
    ELEVENLABS_API_KEY: ENV.ELEVENLABS_API_KEY || "",
    ELEVENLABS_AGENT_ID: ENV.ELEVENLABS_AGENT_ID || "",
    ELEVENLABS_VOICE: ENV.ELEVENLABS_VOICE || "TxGEqnHWrfWFTfGW9XjX",
    WAKE_WORD: "jarvis",
    LLM_MODEL: "google/gemini-2.0-flash-exp:free",
    FOLLOW_UP_MS: 5000,
  };

  /* ===========================================================================
     STATE MACHINE
     idle → wake → listening → thinking → speaking → (follow-up → listening | idle)
     =========================================================================== */
  const S = { IDLE: "idle", WAKE: "wake", LISTEN: "listening", THINK: "thinking", SPEAK: "speaking" };
  let state = S.IDLE;
  const subs = [];
  var booted = false;
  var suppressFollowUpOnce = false;
  var startupGreetingDone = false;

  function setState(next) {
    if (next === state) return;
    const prev = state;
    state = next;
    document.body.className = document.body.className.replace(/\bvoice-\w+/g, "").trim() + " voice-" + next;
    subs.forEach(function (fn) { fn(next, prev); });
    applyBloom(next);
    updateMicLabel(next);
  }

  function applyBloom(s) {
    if (!J.bloom) return;
    var tgt = {};
    if (s === S.WAKE) tgt = { strength: 1.3, radius: 0.85 };
    else if (s === S.THINK) tgt = { strength: 1.15, radius: 0.8 };
    else if (s === S.SPEAK) tgt = { strength: 1.1, radius: 0.75 };
    else tgt = { strength: J.bloom._baseS || 1.0, radius: J.bloom._baseR || 0.75 };
    if (!J.bloom._baseS) { J.bloom._baseS = J.bloom.strength; J.bloom._baseR = J.bloom.radius; }
    gsap.to(J.bloom, { strength: tgt.strength, radius: tgt.radius, duration: 0.5 });
  }

  function updateMicLabel(s) {
    var el = document.getElementById("mic-state");
    if (!el) return;
    var map = { idle: "STANDBY", wake: "ACTIVATING", listening: "LISTENING", thinking: "PROCESSING", speaking: "SPEAKING" };
    el.textContent = map[s] || "STANDBY";
  }

  /* ===========================================================================
     CONVERSATION MEMORY
     =========================================================================== */
  var memory = [];
  function remember(role, text) {
    memory.push({ role: role, content: text });
    if (memory.length > 14) memory.shift();
  }

  /* ===========================================================================
     KNOWLEDGE BASE (derived from DATA at call time)
     =========================================================================== */
  function buildKB() {
    return {
      revenue: { current_mrr: D.revenue.currentMRR, target: D.revenue.targetMRR, progress: D.revenue.progress + "%", arr: D.revenue.arr, net_new: D.revenue.netNew, confidence: D.revenue.confidence + "%" },
      channels: D.channels.map(function (c) { return { name: c.name, mrr: c.mrr, pct: c.pct + "%" }; }),
      funnel: D.funnel.map(function (s) { return { stage: s.label, count: s.count, conv: s.conv + "%" }; }),
      leakage: { total: D.leakTotal, fractures: D.leaks.map(function (l) { return { stage: l.stage, lost: l.valueLost, reason: l.reason }; }) },
      agents: D.agents.map(function (a) { return { name: a.name, role: a.role, status: a.status, roi: a.roi + "%", mrr: a.mrr }; }),
      health: { score: D.health.score, systems: D.health.systems.map(function (s) { return { name: s.name, status: s.status, value: s.v + s.unit }; }) },
      customers: { total: D.customers.total, subs: D.customers.subscriptions, arpu: "$" + D.customers.arpu, churn: D.customers.churn + "%", nrr: D.customers.nrr + "%" },
      forecast: { mrr_likely: D.forecast.mrr.likely, mrr_low: D.forecast.mrr.low, mrr_high: D.forecast.mrr.high, new_cust: D.forecast.newCust.likely, churn: D.forecast.churn.likely, confidence: D.forecast.confidence + "%" },
      daily_feed: D.feed.map(function (e) { return { cat: e.cat, text: e.text, tone: e.tone }; }),
      briefing: D.briefing,
    };
  }

  /* ===========================================================================
     LOCAL INTENT ROUTER (keyword fallback)
     =========================================================================== */
  var INTENTS = {
    revenue: ["revenue", "mrr", "arr", "target", "goal", "how close", "how far", "money"],
    attribution: ["attribution", "channel", "source", "coming from", "where is revenue", "linkedin", "inbound", "referral"],
    growth: ["growth", "funnel", "engine", "pipeline", "conversion", "inmail", "meetings booked"],
    leakage: ["leak", "losing", "lost", "opportunity", "fracture", "bleed"],
    agents: ["agent", "scout", "compass", "sentinel", "forge", "nexus", "oracle", "echo", "performer", "performing", "which agent"],
    health: ["health", "system status", "uptime", "api", "error rate", "outbound health"],
    customers: ["customer", "subscriber", "churn", "retention", "tier", "enterprise", "universe"],
    forecast: ["forecast", "predict", "projection", "next month", "future", "outlook"],
    feed: ["today", "summary", "briefing", "daily", "summarize", "activity", "happened"],
    facility19: ["facility", "everything", "overview", "entire", "whole system", "big picture", "show me facility"],
  };
  var VALID_SCENES = Object.keys(INTENTS);

  function localIntent(text) {
    var lo = text.toLowerCase();
    for (var key in INTENTS) {
      for (var i = 0; i < INTENTS[key].length; i++) {
        if (lo.indexOf(INTENTS[key][i]) !== -1) return key;
      }
    }
    return null;
  }

  function hasVisualCue(text) {
    var lo = (text || "").toLowerCase();
    return /\b(show|display|open|switch|navigate|go to|take me to|bring up|pull up|visualize|view|focus)\b/.test(lo) ||
      /\b(screen|scene|dashboard|panel|chart|graph|visual|animation)\b/.test(lo);
  }

  function resolveNavigationIntent(text, llmIntent) {
    if (!llmIntent || VALID_SCENES.indexOf(llmIntent) === -1) return null;
    return hasVisualCue(text) ? llmIntent : null;
  }

  function money(v) {
    return "$" + Number(v || 0).toLocaleString();
  }

  function weakestFunnelStep() {
    var weak = null;
    for (var i = 1; i < D.funnel.length; i++) {
      if (!weak || D.funnel[i].conv < weak.conv) weak = D.funnel[i];
    }
    return weak;
  }

  function worstLeak() {
    var worst = D.leaks[0];
    for (var i = 1; i < D.leaks.length; i++) {
      if (D.leaks[i].valueLost > worst.valueLost) worst = D.leaks[i];
    }
    return worst;
  }

  function sceneCoachingAnswer(scene) {
    var weak = weakestFunnelStep();
    var leak = worstLeak();
    var activeAgents = D.agents.filter(function (a) { return a.status === "ACTIVE"; }).length;
    var guide = {
      revenue: "You're at " + D.revenue.progress + "% of target (" + money(D.revenue.currentMRR) + " of " + money(D.revenue.targetMRR) + "). Biggest blockers are leakage at " + money(D.leakTotal) + "/mo and weak " + weak.label.toLowerCase() + " conversion at " + weak.conv + "%. Focus on fixing " + leak.stage.toLowerCase() + " with stronger personalization and tighter follow-up SLAs.",
      attribution: "Channel mix is concentrated: LinkedIn is " + D.channels[0].pct + "% of MRR. To reduce risk, keep LinkedIn efficient while increasing inbound/referral throughput and partner-assisted deals.",
      growth: "The funnel bottleneck is " + weak.label.toLowerCase() + " at " + weak.conv + "% conversion. Improve this stage first, then scale top-of-funnel volume once downstream conversion is stable.",
      leakage: "Primary leak is " + leak.stage.toLowerCase() + " driven by " + leak.reason.toLowerCase() + ", costing " + money(leak.valueLost) + "/mo. Fix this first for the highest near-term revenue recovery.",
      agents: activeAgents + " of " + D.agents.length + " agents are active. Rebalance workload from lower-ROI routines into Scout/Compass/Sentinel workflows where conversion impact is highest.",
      health: "Health is " + D.health.score + ", but queue backlog and LinkedIn safety headroom are constraining throughput. Stabilize these two before aggressive scaling.",
      customers: "Customer base is solid (" + D.customers.total + " accounts, NRR " + D.customers.nrr + "%), so the fastest gain is usually acquisition efficiency and leakage recovery rather than retention triage.",
      forecast: "Forecast confidence is " + D.forecast.confidence + "% with a likely MRR of " + money(D.forecast.mrr.likely) + ". Improve conversion and leakage first to pull the outcome toward the high case.",
      feed: "Today looks operationally strong with one risk signal around outbound safety headroom. Keep momentum, but protect deliverability while scaling.",
      facility19: "Systemwide view: revenue momentum is real, but conversion leakage and safety constraints are capping growth. Fix those two constraints to accelerate toward target.",
    };
    return guide[scene] || null;
  }

  /* ===========================================================================
     FALLBACK RESPONSES (no LLM needed)
     =========================================================================== */
  function fallbackAnswer(text) {
    var lo = (text || "").toLowerCase();
    var scene = localIntent(text);
    var map = {
      revenue: "Current MRR is $" + D.revenue.currentMRR.toLocaleString() + ", " + D.revenue.progress + "% toward the $" + D.revenue.targetMRR.toLocaleString() + " target. Net new this period is $" + D.revenue.netNew.toLocaleString() + ".",
      attribution: "LinkedIn outbound drives " + D.channels[0].pct + "% of revenue at $" + D.channels[0].mrr.toLocaleString() + " MRR. Inbound and referral together account for thirty-five percent.",
      growth: "The funnel processed " + D.funnel[0].count.toLocaleString() + " touches, converging to " + D.funnel[3].count + " booked meetings at a " + D.funnel[3].conv + "% stage conversion.",
      leakage: "Three fractures detected totaling $" + D.leakTotal.toLocaleString() + " per month. The largest bleed is connection-to-reply — weak personalization at $3,800 lost.",
      agents: "Scout leads with " + D.agents[0].roi + "% ROI and $" + D.agents[0].mrr.toLocaleString() + " attributed MRR. " + D.agents.filter(function (a) { return a.status === "ACTIVE"; }).length + " of " + D.agents.length + " agents are active.",
      health: "System health score is " + D.health.score + ". All core APIs nominal. Two advisories: queue backlog and LinkedIn safety headroom.",
      customers: D.customers.total + " customers across " + D.customers.subscriptions + " subscriptions. Net revenue retention is " + D.customers.nrr + "%. Churn at " + D.customers.churn + "%.",
      forecast: "Projecting $" + D.forecast.mrr.likely.toLocaleString() + " MRR next month. Confidence band from $" + D.forecast.mrr.low.toLocaleString() + " to $" + D.forecast.mrr.high.toLocaleString() + ". " + D.forecast.newCust.likely + " new customers expected.",
      feed: D.briefing,
      facility19: "Facility19 live. MRR $" + D.revenue.currentMRR.toLocaleString() + ", " + D.customers.total + " customers, " + D.agents.length + " agents, health " + D.health.score + ".",
    };
    var asksWhyOrHow = /\b(why|how come|root cause|cause|reason|diagnose|analysis)\b/.test(lo);
    var asksForActions = /\b(how|improve|increase|fix|plan|strategy|next step|recommend|advice|what should)\b/.test(lo);
    var asksIdentity = /\b(who are you|what are you|introduce yourself)\b/.test(lo);
    if (asksIdentity) return "I'm J.A.R.V.I.S., your professional AI assistant for Facility19. I can answer general questions, explain decisions, and provide data-backed business guidance. If you want visuals, ask me to show a screen.";
    if (/\b(hi|hello|hey)\b/.test(lo)) return "Hello. I can help with general questions and Facility19 insights. What would you like to dive into?";
    if (/\b(thank|thanks)\b/.test(lo)) return "You're welcome. If you want, I can also pull up a specific screen when you ask.";
    if (/\b(help|what can you do)\b/.test(lo)) return "I can answer general questions, explain concepts, help with writing and strategy, and report Facility19 metrics. Ask naturally, and I will only switch screens when you explicitly request visuals.";
    if (scene && (asksWhyOrHow || asksForActions)) {
      var coached = sceneCoachingAnswer(scene);
      if (coached) return coached;
    }
    if (map[scene]) return map[scene];
    if (/\b(why.*revenue|not achieving|not hitting|behind.*target|miss.*goal)\b/.test(lo)) {
      return sceneCoachingAnswer("revenue");
    }
    if (/\?$/.test((text || "").trim()) || /\b(why|how|what|when|where|who)\b/.test(lo)) {
      return "Good question. I can help with general reasoning, writing, planning, and Facility19 operations. Share a bit more context and I will give a precise, professional answer.";
    }
    return "I can answer general questions as well as Facility19 metrics. Ask anything, and if you want visuals, say things like 'show' or 'open' for the screen you want.";
  }

  /* ===========================================================================
     OPENROUTER LLM
     =========================================================================== */
  function systemPrompt() {
    var scene = J.current ? J.current.key : "home";
    return "You are J.A.R.V.I.S., the AI assistant for Facility19. You can answer both Facility19 business questions and general questions like a normal LLM assistant. Speak with calm confidence and be genuinely helpful.\n\n" +
      "ACTIVE SCENE: " + scene + "\n\n" +
      "KNOWLEDGE BASE:\n" + JSON.stringify(buildKB()) + "\n\n" +
      "RULES:\n" +
      "- Answer the user's actual question first; do not force metrics unless the user asks for business/dashboard data.\n" +
      "- For Facility19 data questions, use exact metrics from the knowledge base.\n" +
      "- For questions like 'who are you' or strategic 'why are we behind', respond with identity/analysis, not just metric recitation.\n" +
      "- For general questions, answer naturally like a high-quality general assistant.\n" +
      "- Keep answers concise (usually 2-5 sentences).\n" +
      "- End your response with a JSON tag on its own line: {\"scene\":\"name\"} where name is one of: revenue, attribution, growth, leakage, agents, health, customers, forecast, feed, facility19 — or null.\n" +
      "- Set scene to a value only when the user explicitly asks to show, display, open, switch, or navigate visuals/screens for that domain. Otherwise set scene to null.";
  }

  function askLLM(text) {
    var fallbackIntent = hasVisualCue(text) ? localIntent(text) : null;
    if (!CFG.OPENROUTER_KEY) {
      return Promise.resolve({ text: fallbackAnswer(text), intent: fallbackIntent });
    }
    var msgs = [{ role: "system", content: systemPrompt() }];
    memory.slice(-6).forEach(function (m) { msgs.push({ role: m.role, content: m.content }); });
    msgs.push({ role: "user", content: text });

    return fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + CFG.OPENROUTER_KEY, "Content-Type": "application/json", "HTTP-Referer": location.href },
      body: JSON.stringify({ model: CFG.LLM_MODEL, messages: msgs, temperature: 0.7, max_tokens: 250 }),
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var raw = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || "";
        var im = raw.match(/\{"scene"\s*:\s*(null|"(\w+)")\}/i);
        var llmIntent = im ? (im[2] || null) : null;
        var intent = resolveNavigationIntent(text, llmIntent) || fallbackIntent;
        var clean = raw.replace(/\s*\{[^}]*"scene"[^}]*\}\s*$/, "").trim();
        return { text: clean || fallbackAnswer(text), intent: intent };
      })
      .catch(function () {
        return { text: fallbackAnswer(text), intent: fallbackIntent };
      });
  }

  /* ===========================================================================
     WEB SPEECH API — WAKE WORD DETECTION
     =========================================================================== */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var wakeRec = null, wakeOn = false;

  function initWake() {
    if (!SR) return;
    wakeRec = new SR();
    wakeRec.continuous = true;
    wakeRec.interimResults = true;
    wakeRec.lang = "en-US";

    wakeRec.onresult = function (ev) {
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var t = ev.results[i][0].transcript.toLowerCase();
        if (t.indexOf(CFG.WAKE_WORD) !== -1) {
          if (!booted) {
            stopWake();
            if (window.JARVIS_UI && window.JARVIS_UI.engage) window.JARVIS_UI.engage();
            return;
          }
          if (state !== S.IDLE) return;
          if (ev.results[i].isFinal) {
            var after = t.split(CFG.WAKE_WORD).pop().replace(/^[,.\s]+/, "").trim();
            stopWake();
            doActivate(after.length > 3 ? after : null);
          }
          return;
        }
      }
    };

    wakeRec.onend = function () {
      if (wakeOn && (state === S.IDLE || !booted)) setTimeout(function () { try { wakeRec.start(); } catch (e) { /* retry */ } }, 250);
    };
    wakeRec.onerror = function (e) {
      if (e.error !== "no-speech" && e.error !== "aborted") console.warn("Wake err:", e.error);
    };
  }

  function startWake() { if (!wakeRec) return; wakeOn = true; try { wakeRec.start(); } catch (e) { /* already running */ } }
  function stopWake() { wakeOn = false; if (wakeRec) try { wakeRec.stop(); } catch (e) { /* ok */ } }

  /* ===========================================================================
     WEB SPEECH API — ACTIVE LISTENING
     =========================================================================== */
  function listen() {
    if (!SR) { deactivate(); return; }
    stopWake();
    var rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    var final = "", silenceT = null;

    rec.onresult = function (ev) {
      var interim = "";
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) final += ev.results[i][0].transcript;
        else interim += ev.results[i][0].transcript;
      }
      showTranscript(final || interim);
      if (silenceT) clearTimeout(silenceT);
      silenceT = setTimeout(function () { if (final.trim()) try { rec.stop(); } catch (e) { /* ok */ } }, 1800);
    };

    rec.onend = function () {
      clearTimeout(silenceT);
      if (final.trim()) processInput(final.trim());
      else deactivate();
    };

    rec.onerror = function () { deactivate(); };
    setState(S.LISTEN);
    try { rec.start(); } catch (e) { deactivate(); }
  }

  /* ===========================================================================
     FOLLOW-UP LISTENING (after speaking, brief window)
     =========================================================================== */
  function followUp() {
    if (!SR) { deactivate(); return; }
    var rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    var final = "", heard = false;

    var timeout = setTimeout(function () { if (!heard) { try { rec.stop(); } catch (e) { /* ok */ } deactivate(); } }, CFG.FOLLOW_UP_MS);

    rec.onresult = function (ev) {
      heard = true;
      clearTimeout(timeout);
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) final += ev.results[i][0].transcript;
      }
      showTranscript(final);
    };

    rec.onend = function () {
      clearTimeout(timeout);
      if (final.trim()) processInput(final.trim());
      else deactivate();
    };

    rec.onerror = function () { clearTimeout(timeout); deactivate(); };
    setState(S.LISTEN);
    try { rec.start(); } catch (e) { deactivate(); }
  }

  /* ===========================================================================
     TEXT-TO-SPEECH — ELEVENLABS (primary) + BROWSER (fallback)
     =========================================================================== */
  var ttsAudio = null;
  var synth = window.speechSynthesis;

  function speak(text, opts) {
    opts = opts || {};
    suppressFollowUpOnce = !!opts.noFollowUp;
    setState(S.SPEAK);
    showCaption(text);

    elevenLabsTTS(text).then(function (ok) {
      if (!ok) browserTTS(text);
    });
  }

  function elevenLabsTTS(text) {
    if (!CFG.ELEVENLABS_API_KEY) return Promise.resolve(false);
    return fetch("https://api.elevenlabs.io/v1/text-to-speech/" + CFG.ELEVENLABS_VOICE + "/stream", {
      method: "POST",
      headers: { "xi-api-key": CFG.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ text: text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true } }),
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function (blob) {
        return new Promise(function (resolve) {
          var url = URL.createObjectURL(blob);
          ttsAudio = new Audio(url);
          ttsAudio.onended = function () { URL.revokeObjectURL(url); ttsAudio = null; onSpeakDone(); resolve(true); };
          ttsAudio.onerror = function () { URL.revokeObjectURL(url); ttsAudio = null; resolve(false); };
          ttsAudio.play().catch(function () { resolve(false); });
        });
      })
      .catch(function () { return false; });
  }

  function browserTTS(text) {
    if (!synth) { onSpeakDone(); return; }
    synth.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0; u.pitch = 0.85; u.volume = 0.9;
    var voices = synth.getVoices();
    var pref = voices.find(function (v) { return /Daniel|Google UK English Male|Microsoft David|Microsoft Mark/i.test(v.name); });
    if (pref) u.voice = pref;
    u.onend = onSpeakDone;
    u.onerror = onSpeakDone;
    synth.speak(u);
  }

  function stopTTS() {
    if (synth) synth.cancel();
    if (ttsAudio) { ttsAudio.pause(); ttsAudio.currentTime = 0; ttsAudio = null; }
  }

  /* ===========================================================================
     CORE FLOW
     =========================================================================== */
  function doActivate(immediateQuery) {
    setState(S.WAKE);
    if (A) { if (!A.ready) A.start(); A.resume(); A.play("chime"); setTimeout(function () { A.play("engage"); }, 200); }

    if (immediateQuery) {
      showCaption("Yes — processing…");
      setTimeout(function () { setState(S.THINK); showTranscript(immediateQuery); processInput(immediateQuery); }, 700);
    } else {
      showCaption("Yes, how can I help you?");
      setTimeout(function () { listen(); }, 900);
    }
  }

  function activate() {
    if (state === S.SPEAK) { stopTTS(); }
    if (state !== S.IDLE && state !== S.SPEAK) return;
    stopWake();
    doActivate(null);
  }

  function processInput(text) {
    remember("user", text);
    setState(S.THINK);
    hideTranscript();
    if (A) { A.resume(); A.play("process"); }

    askLLM(text).then(function (result) {
      remember("assistant", result.text);
      var didNavigate = false;
      if (result.intent && window.JARVIS_UI) {
        window.JARVIS_UI.run(result.intent, { fromVoice: true });
        didNavigate = true;
      }
      setTimeout(function () { speak(result.text); }, didNavigate ? 600 : 100);
    });
  }

  function onSpeakDone() {
    if (suppressFollowUpOnce) {
      suppressFollowUpOnce = false;
      deactivate();
      return;
    }
    followUp();
  }

  function startupGreeting() {
    if (startupGreetingDone) return;
    startupGreetingDone = true;
    stopWake();
    var msg = "Welcome to Facility19. HR operations is online for startup handoff. JARVIS is now active and ready to assist with any question.";
    if (A) { A.resume(); A.play("online"); }
    setTimeout(function () { speak(msg, { noFollowUp: true }); }, 450);
  }

  function deactivate() {
    hideTranscript();
    setState(S.IDLE);
    startWake();
  }

  /* ===========================================================================
     UI HELPERS
     =========================================================================== */
  function showTranscript(text) {
    var el = document.getElementById("voice-transcript");
    var tx = document.getElementById("voice-transcript-text");
    if (el && tx) { tx.textContent = text; el.style.opacity = "1"; }
  }

  function hideTranscript() {
    var el = document.getElementById("voice-transcript");
    if (el) gsap.to(el, { opacity: 0, duration: 0.4 });
  }

  function showCaption(text) {
    var capEl = document.getElementById("caption");
    var capTxt = capEl && capEl.querySelector(".ctxt");
    if (!capEl || !capTxt) return;
    capEl.style.opacity = "1";
    capTxt.innerHTML = "";
    var i = 0;
    var cursor = '<span class="cursor"></span>';
    var typer = setInterval(function () {
      i++;
      capTxt.innerHTML = text.slice(0, i) + (i < text.length ? cursor : "");
      if (i >= text.length) clearInterval(typer);
    }, 18);
  }

  /* ===========================================================================
     KEYBOARD SHORTCUT — Ctrl+J
     =========================================================================== */
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
      e.preventDefault();
      activate();
    }
  });

  /* ===========================================================================
     ORB + MIC CLICK ACTIVATION
     =========================================================================== */
  function bindClicks() {
    var orb = document.getElementById("voice-orb-overlay");
    if (orb) orb.addEventListener("click", activate);

    var mic = document.querySelector("#dock .mic");
    if (mic) { mic.style.cursor = "pointer"; mic.addEventListener("click", activate); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindClicks);
  else bindClicks();

  /* ===========================================================================
     PUBLIC API
     =========================================================================== */
  window.JARVIS_VOICE = {
    activate: activate,
    deactivate: deactivate,
    getState: function () { return state; },
    onState: function (fn) { subs.push(fn); },
    getMemory: function () { return memory.slice(); },
    startWake: startWake,
    stopWake: stopWake,
    stopTTS: stopTTS,
    textInput: function (t) { stopWake(); doActivate(t); },
    S: S,
  };

  /* ===========================================================================
     INIT — wait for boot sequence, then start wake detection
     =========================================================================== */
  initWake();
  setTimeout(function () { if (!booted) startWake(); }, 1200);

  window.addEventListener("jarvis-booted", function () {
    booted = true;
    setState(S.IDLE);
    setTimeout(startupGreeting, 900);
    setTimeout(startWake, 2000);
  });

  if (synth && synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = function () { /* voices loaded */ };
  }
})();
