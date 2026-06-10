/* ============================================================================
   intent-router.js — Conversation Intent → Scene Router
   -----------------------------------------------------------------------------
   The PRIMARY job of Jarvis is to drive SCENE TRANSITIONS. Text and speech are
   secondary. This module maps what the user says to the scene that should be on
   screen, with a confidence score, and resolves multi-step / follow-up
   conversation using the currently active scene as context.

   Public API (window.IntentRouter):
     route(text)          -> { scene, sceneId, title, confidence, type, target,
                               answer, reason }
     threshold            -> number (confidence required to switch scenes)
     getCurrentScene()    -> active scene key (from the live engine / manager)
     sceneIdFor(key)      -> descriptive scene id for a canonical key
   ============================================================================ */
(function () {
  var D = window.DATA;

  /* ---------------------------------------------------------------------------
     Scene catalogue. Each canonical scene key maps to a descriptive scene ID
     (the cinematic universe name) plus weighted keyword/phrase matchers.
       strong  : multi-word intents — high signal (weight 1.0)
       weak    : single terms       — supporting signal (weight 0.6)
     ------------------------------------------------------------------------- */
  var SCENES = {
    revenue: {
      id: "revenue_goal_universe", title: "Revenue Goal Universe",
      strong: ["revenue goal", "how close", "revenue target", "monthly recurring", "run rate", "to our goal", "to the goal", "revenue picture", "how are we doing on revenue", "are we on track"],
      weak: ["revenue", "mrr", "arr", "goal", "target", "money", "income", "earnings"],
    },
    attribution: {
      id: "revenue_attribution_galaxy", title: "Revenue Attribution Galaxy",
      strong: ["where is revenue coming from", "coming from", "revenue attribution", "by channel", "which channel", "channel breakdown", "revenue sources", "revenue mix", "where does it come from", "where is it coming from"],
      weak: ["attribution", "channel", "channels", "source", "sources", "linkedin", "inbound", "referral", "referrals", "partnership", "partnerships", "paid social"],
    },
    growth: {
      id: "growth_engine_funnel", title: "Growth Engine Funnel",
      strong: ["growth engine", "sales funnel", "show me the funnel", "our funnel", "the funnel", "conversion funnel", "outreach funnel", "growth engine funnel"],
      weak: ["growth", "funnel", "pipeline", "conversion", "inmail", "inmails", "connections", "replies", "meetings booked", "outreach"],
    },
    leakage: {
      id: "leakage_simulation", title: "Opportunity Leakage",
      strong: ["where are we leaking", "leaking opportunities", "opportunity leakage", "losing deals", "losing opportunities", "pipeline leak", "where are we losing", "drop off", "drop-off", "falling through"],
      weak: ["leak", "leaking", "leakage", "losing", "lost", "fracture", "fractures", "bleed", "wasted"],
    },
    agents: {
      id: "agent_city", title: "AI Agent City",
      strong: ["ai agents", "which agent", "agent value", "best agent", "agent performance", "top performer", "top performing", "agent cluster", "which agents", "create the most value"],
      weak: ["agent", "agents", "scout", "compass", "sentinel", "forge", "nexus", "oracle", "echo", "reed", "performing"],
    },
    health: {
      id: "control_room", title: "Outbound Health Control Room",
      strong: ["system health", "outbound health", "health of our", "control room", "system status", "is everything healthy", "how healthy", "are systems healthy"],
      weak: ["health", "uptime", "status", "api", "error rate", "queue", "deliverability", "safety", "latency", "backlog"],
    },
    customers: {
      id: "customer_universe", title: "Customer Universe",
      strong: ["how many customers", "customer universe", "our customers", "customer base", "customer metrics", "churn rate", "net revenue retention"],
      weak: ["customer", "customers", "subscriber", "subscribers", "subscription", "subscriptions", "churn", "retention", "tier", "tiers", "enterprise", "nrr", "arpu", "accounts"],
    },
    forecast: {
      id: "future_simulation", title: "Future Forecast",
      strong: ["next month", "what will", "future simulation", "what's coming", "whats coming", "what should we expect", "look like next", "where are we headed", "where we are headed"],
      weak: ["forecast", "predict", "prediction", "projection", "projections", "future", "outlook", "scenario", "scenarios", "projected", "trajectory"],
    },
    feed: {
      id: "intelligence_feed", title: "Daily Intelligence Feed",
      strong: ["daily summary", "today's activity", "todays activity", "summarize today", "daily briefing", "what's happening today", "whats happening today", "what happened today", "intelligence feed", "brief me", "catch me up"],
      weak: ["today", "summary", "briefing", "daily", "summarize", "activity", "happened", "feed", "recap"],
    },
    facility19: {
      id: "facility19_universe", title: "Facility19 Universe",
      strong: ["show me facility", "facility19 overview", "facility nineteen", "the whole system", "big picture", "entire system", "full picture", "overview of facility", "everything at once", "the full universe"],
      weak: ["facility19", "facility", "overview", "entire", "whole", "everything", "all systems", "universe"],
    },
  };

  var SCENE_KEYS = Object.keys(SCENES);
  var THRESHOLD = 0.55;
  var lastScene = null; // routed-scene memory (multi-step fallback)

  function norm(s) {
    return (" " + (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ") + " ");
  }

  function getCurrentScene() {
    var J = window.JV;
    if (J && J.current && J.current.key && J.current.key !== "home") return J.current.key;
    if (window.SceneManager && window.SceneManager.getState) {
      var a = window.SceneManager.getState().active;
      if (a) return a;
    }
    return lastScene;
  }

  /* ---- explicit keyword scoring ------------------------------------------- */
  function scoreScenes(text) {
    var t = norm(text);
    var scores = {};
    var best = null, bestScore = 0, hadStrong = {};
    SCENE_KEYS.forEach(function (key) {
      var def = SCENES[key], score = 0, strongHit = false;
      def.strong.forEach(function (p) { if (t.indexOf(" " + p + " ") !== -1 || t.indexOf(p) !== -1) { score += 1.0; strongHit = true; } });
      def.weak.forEach(function (w) { if (t.indexOf(" " + w + " ") !== -1) score += 0.6; });
      scores[key] = score;
      hadStrong[key] = strongHit;
      if (score > bestScore) { bestScore = score; best = key; }
    });
    return { scores: scores, best: best, bestScore: bestScore, strong: best ? hadStrong[best] : false };
  }

  /* ---- superlative helpers (for "which is strongest" style follow-ups) ----- */
  function strongestTarget(scene) {
    if (!D) return null;
    if (scene === "attribution") {
      var c = D.channels.slice().sort(function (a, b) { return b.mrr - a.mrr; })[0];
      return { keyword: c.name.split(" ")[0], answer: "Your strongest source is " + c.name.toLowerCase() + ", at " + c.pct + " percent of revenue across " + c.deals + " deals — and it is still growing " + Math.abs(c.delta) + " percent." };
    }
    if (scene === "agents") {
      var ag = D.agents.slice().sort(function (a, b) { return b.roi - a.roi; })[0];
      return { keyword: ag.name, answer: ag.name + " is your top-performing agent, delivering a " + ag.roi + " percent return on investment and " + (ag.mrr).toLocaleString() + " dollars in attributed revenue." };
    }
    if (scene === "customers") {
      var tr = D.customers.tiers.slice().sort(function (a, b) { return b.mrr - a.mrr; })[0];
      return { keyword: tr.name, answer: "Your " + tr.name.toLowerCase() + " tier contributes the most, with " + tr.count + " accounts." };
    }
    if (scene === "channels") return strongestTarget("attribution");
    return null;
  }

  function weakestTarget(scene) {
    if (!D) return null;
    if (scene === "attribution") {
      var c = D.channels.slice().sort(function (a, b) { return a.delta - b.delta; })[0];
      return { keyword: c.name.split(" ")[0], answer: "Your weakest channel right now is " + c.name.toLowerCase() + " — it is " + (c.delta < 0 ? "declining " + Math.abs(c.delta) : "only growing " + c.delta) + " percent and deserves attention." };
    }
    if (scene === "agents") {
      var actives = D.agents.filter(function (a) { return a.status === "ACTIVE"; });
      var ag = actives.slice().sort(function (a, b) { return a.roi - b.roi; })[0];
      return { keyword: ag.name, answer: ag.name + " is the lowest-return active agent at " + ag.roi + " percent." };
    }
    return null;
  }

  /* ---- relational / follow-up resolution ---------------------------------- */
  function resolveFollowUp(text, explicit) {
    var t = norm(text);
    var current = getCurrentScene();

    var asksStrongest = /\b(strongest|best|biggest|largest|top|highest|most|leading|dominant)\b/.test(t);
    var asksWeakest = /\b(weakest|worst|lowest|smallest|underperforming|declining)\b/.test(t);
    var asksWhich = /\b(which|what)\b/.test(t);
    var asksMore = /\b(more|deeper|detail|details|elaborate|expand|tell me more|go on|explain|break.*down)\b/.test(t);
    var asksComingFrom = /(coming from|come from|where.*from|the sources|what.*sources|by channel|breakdown)/.test(t);

    // "where is it coming from" — drill from revenue/overview into attribution
    if (asksComingFrom && (explicit.bestScore < 1.0 || explicit.best === "revenue")) {
      return { scene: "attribution", confidence: 0.85, type: "navigate", reason: "follow-up: revenue attribution drilldown" };
    }

    // "which is the strongest / weakest …"
    if ((asksStrongest || asksWeakest) && (asksWhich || explicit.bestScore < 1.0)) {
      var pick = asksWeakest ? weakestTarget : strongestTarget;
      var candidates = [];
      if (explicit.best && explicit.bestScore >= 0.6) candidates.push(explicit.best);
      if (current) candidates.push(current);
      candidates.push("attribution", "agents", "customers");
      var ctxScene = null, tgt = null;
      for (var ci = 0; ci < candidates.length; ci++) {
        var tt = pick(candidates[ci]);
        if (tt) { ctxScene = candidates[ci]; tgt = tt; break; }
      }
      if (tgt) {
        var sameScene = ctxScene === current;
        return {
          scene: ctxScene,
          confidence: 0.82,
          type: sameScene ? "highlight" : "navigate-highlight",
          target: tgt,
          answer: tgt.answer,
          reason: "follow-up: " + (asksWeakest ? "weakest" : "strongest") + " in " + ctxScene,
        };
      }
    }

    // "tell me more / go deeper" — stay in the current scene, narrate more
    if (asksMore && current && explicit.bestScore < 0.6) {
      return { scene: current, confidence: 0.7, type: "stay", reason: "follow-up: elaborate on current scene" };
    }

    return null;
  }

  /* ---- main entry point --------------------------------------------------- */
  function route(text) {
    if (!text) return { scene: null, confidence: 0, type: null, reason: "empty" };

    var explicit = scoreScenes(text);
    var follow = resolveFollowUp(text, explicit);

    var result;
    if (follow) {
      result = follow;
    } else if (explicit.best && explicit.bestScore >= THRESHOLD) {
      result = {
        scene: explicit.best,
        confidence: Math.min(0.97, explicit.strong ? Math.max(0.85, explicit.bestScore / 2) : explicit.bestScore),
        type: "navigate",
        reason: "explicit keyword match (score " + explicit.bestScore.toFixed(2) + ")",
      };
    } else {
      // No confident scene. If we already have a scene up and the user is clearly
      // asking a question, stay there so narration has visual context.
      var current = getCurrentScene();
      var isQuestion = /\b(why|how|what|when|where|who|is|are|do|does|can|should)\b/.test(norm(text)) || /\?\s*$/.test(text);
      if (current && isQuestion) {
        result = { scene: current, confidence: 0.5, type: "stay", reason: "low-confidence question — stay on current scene" };
      } else {
        result = { scene: explicit.best, confidence: explicit.bestScore, type: explicit.best ? "navigate" : null, reason: "below threshold" };
      }
    }

    // normalize navigate-highlight => navigate (caller handles target after arrival)
    if (result.type === "navigate-highlight") result.navHighlight = true;

    if (result.scene) {
      result.sceneId = sceneIdFor(result.scene);
      result.title = (SCENES[result.scene] || {}).title || result.scene;
      if (result.confidence >= THRESHOLD) lastScene = result.scene;
    }
    return result;
  }

  function sceneIdFor(key) { return (SCENES[key] || {}).id || key; }

  window.IntentRouter = {
    route: route,
    get threshold() { return THRESHOLD; },
    set threshold(v) { THRESHOLD = v; },
    getCurrentScene: getCurrentScene,
    sceneIdFor: sceneIdFor,
    scenes: SCENES,
  };
})();
