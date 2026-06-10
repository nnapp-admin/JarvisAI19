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
      revenue: {
        current_mrr: D.revenue.currentMRR, target: D.revenue.targetMRR, progress: D.revenue.progress + "%",
        arr: D.revenue.arr, net_new: D.revenue.netNew, confidence: D.revenue.confidence + "%",
        previous_mrr: D.revenue.prevMRR, gap_to_target: D.revenue.targetMRR - D.revenue.currentMRR,
        changes: { mrr: "+" + D.revenue.delta.mrr + "%", arr: "+" + D.revenue.delta.arr + "%", net_new: "+" + D.revenue.delta.netNew + "%", confidence: "+" + D.revenue.delta.confidence + "%" },
      },
      channels: D.channels.map(function (c) { return { name: c.name, mrr: c.mrr, pct: c.pct + "%", deals: c.deals, change: (c.delta > 0 ? "+" : "") + c.delta + "% vs last period", trend: c.delta > 0 ? "growing" : "declining" }; }),
      funnel: D.funnel.map(function (s) { return { stage: s.label, count: s.count, conv: s.conv + "%", previous_count: s.prev, change: "+" + s.delta + "% vs last period" }; }),
      leakage: {
        total_monthly: D.leakTotal,
        fractures: D.leaks.map(function (l) { return { stage: l.stage, value_lost: l.valueLost, opportunities_lost: l.lost, reason: l.reason, severity: Math.round(l.sev * 100) + "%", trend: l.trend, change: (l.delta > 0 ? "+" : "") + l.delta + "%" }; }),
      },
      agents: D.agents.map(function (a) { return { name: a.name, role: a.role, status: a.status, roi: a.roi + "%", mrr_attributed: a.mrr, tasks_completed: a.tasks, load: a.load + "%" }; }),
      health: {
        score: D.health.score, previous_score: D.health.prevScore, change: "+" + D.health.delta + " points",
        systems: D.health.systems.map(function (s) { return { name: s.name, status: s.status, value: s.v + s.unit, note: s.note, previous: s.prev + s.unit, change: (s.delta > 0 ? "+" : "") + s.delta + "%" }; }),
      },
      customers: {
        total: D.customers.total, subs: D.customers.subscriptions, arpu: "$" + D.customers.arpu,
        churn: D.customers.churn + "%", nrr: D.customers.nrr + "%",
        changes: { total: "+" + D.customers.delta.total, subs: "+" + D.customers.delta.subs, arpu: "+" + D.customers.delta.arpu + "%", churn: D.customers.delta.churn + "% (improving)", nrr: "+" + D.customers.delta.nrr + "%" },
        tiers: D.customers.tiers.map(function (t) { return { name: t.name, count: t.count, mrr: t.mrr, growth: "+" + t.delta }; }),
        top_accounts: D.customers.top.map(function (a) { return { name: a.name, mrr: a.mrr, concentration: a.pct + "%" }; }),
        concentration: D.customers.concentration + "%",
      },
      forecast: {
        mrr: { likely: D.forecast.mrr.likely, low: D.forecast.mrr.low, high: D.forecast.mrr.high },
        new_customers: { likely: D.forecast.newCust.likely, low: D.forecast.newCust.low, high: D.forecast.newCust.high },
        churn: { likely: D.forecast.churn.likely, low: D.forecast.churn.low, high: D.forecast.churn.high },
        meetings: { likely: D.forecast.meetings.likely, low: D.forecast.meetings.low, high: D.forecast.meetings.high },
        confidence: D.forecast.confidence + "%", previous_confidence: D.forecast.prevConf + "%",
        changes: { confidence: "+" + D.forecast.delta.conf + " points", mrr_growth: "+" + D.forecast.delta.mrr + "%" },
      },
      daily_feed: D.feed.map(function (e) { return { category: e.cat, event: e.text, detail: e.sub, tone: e.tone }; }),
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

  function resolveNavigationIntent(text, llmIntent) {
    if (llmIntent && VALID_SCENES.indexOf(llmIntent) !== -1) return llmIntent;
    return localIntent(text);
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
      revenue: "Let me give you the strategic picture on revenue. " +
        "We are at " + D.revenue.progress + "% of target — " + money(D.revenue.currentMRR) + " of " + money(D.revenue.targetMRR) + ". The good news is we are up " + D.revenue.delta.mrr + "% from last month, so the trajectory is positive. " +
        "However, there are two things holding us back. First, pipeline leakage is costing us " + money(D.leakTotal) + " per month — that is revenue we should be capturing but are losing through process gaps. " +
        "Second, our weakest funnel stage is " + weak.label.toLowerCase() + " at only " + weak.conv + "% conversion. " +
        "My recommendation: prioritize fixing the " + leak.stage.toLowerCase() + " leak with stronger personalization and tighter follow-up timing. That single fix has the highest revenue recovery potential. " +
        "If we plug that leak and maintain current growth, the trajectory to thirty thousand becomes much more achievable.",

      attribution: "Here is my analysis of channel risk and opportunity. " +
        "LinkedIn outbound at " + D.channels[0].pct + "% is our largest single channel — that is strong but creates concentration risk. If LinkedIn throttles us, nearly half our revenue pipeline is affected. " +
        "The opportunity I see: inbound and organic is growing " + D.channels[1].delta + "% — the fastest rate of any channel. Partnerships are surging at " + D.channels[4].delta + "%. These two channels are the best path to diversification. " +
        "Paid social is the only declining channel at " + D.channels[3].delta + "%. I would evaluate whether that spend should be reallocated to accelerate partnerships or inbound content. " +
        "My recommendation: keep LinkedIn efficient but cap further investment there. Shift growth energy to inbound, referral, and partnerships to build a more resilient revenue mix.",

      growth: "Let me diagnose the growth engine for you. " +
        "The overall funnel is improving — every stage grew this period, which is encouraging. But the key bottleneck is " + weak.label.toLowerCase() + " at just " + weak.conv + "% conversion. " +
        "This matters because even small improvements at this stage have a multiplier effect on everything downstream. " +
        "The good news is that stage actually improved " + weak.delta + "% from last period, so the fixes we are applying are working. " +
        "My recommendation: keep improving this conversion rate before scaling top-of-funnel volume. Pouring more InMails into a leaky funnel wastes resources. Fix the conversion, then turn up the volume.",

      leakage: "Here is my diagnosis of the leakage problem. " +
        "The most critical fracture is " + leak.stage.toLowerCase() + ", driven by " + leak.reason.toLowerCase() + ". It is costing " + money(leak.valueLost) + " per month and — this is the concerning part — it is actually getting worse, up " + Math.abs(leak.delta) + "% this period. " +
        "The other two leaks are both improving, which means our fixes are working there. But this one needs focused attention. " +
        "My specific recommendations: one, improve message personalization — the templates are too generic for the prospects we are targeting. Two, implement tighter follow-up SLAs so we do not lose warm connections. Three, test shorter, more direct messaging sequences. " +
        "If we cut this single leak in half, we recover nearly " + money(Math.round(leak.valueLost / 2)) + " per month in revenue.",

      agents: "Here is my assessment of the agent cluster. " +
        activeAgents + " of " + D.agents.length + " agents are currently active. Scout and Compass are our top two performers by both ROI and attributed revenue — they should be prioritized for resources. " +
        "However, Compass is running at " + D.agents[1].load + "% load, which is approaching capacity. If we want to scale outreach, we may need to optimize Compass's workflows or consider distributing some of its workload. " +
        "Oracle and Echo are on standby. Oracle handles intent scoring — activating it could improve targeting precision, which would help the conversion bottleneck we discussed. " +
        "My recommendation: consider activating Oracle to improve lead quality scoring. Also rebalance lower-ROI agent tasks toward the Scout, Compass, and Sentinel workflows where conversion impact is highest.",

      health: "Let me give you my assessment of system health. " +
        "The overall score is " + D.health.score + ", up " + D.health.delta + " points, which is a good trend. But there are two specific constraints I want to flag. " +
        "Queue backlog is at " + D.health.systems[3].v + " items pending, up " + D.health.systems[3].delta + "%. If this keeps growing, it will bottleneck our outreach throughput. We need to either increase processing capacity or reduce inbound queue volume. " +
        "LinkedIn safety headroom is at " + D.health.systems[5].v + "%, down " + Math.abs(D.health.systems[5].delta) + " points. I have already throttled batch seven to compensate, but this means we are approaching LinkedIn's activity limits. " +
        "My recommendation: stabilize these two constraints before any aggressive scaling of outbound volume. The rest of the system is solid — let us not break what is working by pushing too hard on these pressure points.",

      customers: "Here is my strategic read on the customer base. " +
        "The fundamentals are strong — " + D.customers.total + " accounts with " + D.customers.nrr + "% net revenue retention means existing customers are expanding and offsetting churn naturally. " +
        "Churn dropped to " + D.customers.churn + "%, down " + Math.abs(D.customers.delta.churn) + " points — that is meaningful improvement. " +
        "Given these healthy retention metrics, the fastest path to revenue growth is not retention triage — it is acquisition efficiency. " +
        "Specifically, fixing pipeline leakage and improving funnel conversion will add more revenue than further churn reduction at this point. " +
        "One thing to monitor: top three account concentration is " + D.customers.concentration + "%. That is moderate but worth keeping an eye on. If Northwind or Arcadia churned, it would be a notable hit.",

      forecast: "Here is my strategic view of the forecast. " +
        "We are projecting " + money(D.forecast.mrr.likely) + " MRR next month at " + D.forecast.confidence + "% confidence, up from " + D.forecast.prevConf + "%. The model is becoming more certain as conversion improvements take hold. " +
        "The gap between low case at " + money(D.forecast.mrr.low) + " and high case at " + money(D.forecast.mrr.high) + " is about four thousand dollars. What drives the difference is mainly conversion efficiency and leakage recovery. " +
        "My recommendation: focus on the two highest-leverage actions — fixing the connection-to-reply leak and maintaining funnel conversion improvements. These are the variables that most strongly pull the outcome toward the high case. " +
        "If we execute well on those two things, the path to thirty thousand becomes a realistic six-month trajectory.",

      feed: "Here is my read on today's operations. " +
        "The headline numbers are strong — Scout qualified eighty-four leads, up twenty-two percent. Compass dispatched over three hundred touches. Eleven positive replies were routed, with four moving to calendar. Three meetings booked, adding eleven-eighty to pipeline, and two new subscriptions activated. " +
        "The one risk signal: LinkedIn safety headroom at eighty-one percent. I have throttled batch seven to protect deliverability. This is the right trade-off — short-term volume for long-term sender reputation. " +
        "My assessment: maintain current momentum but do not push outbound volume harder until safety headroom recovers above eighty-five percent.",

      facility19: "Here is my system-wide strategic assessment. " +
        "Revenue momentum is real — up " + D.revenue.delta.mrr + "% and accelerating. Customer base is healthy with " + D.customers.nrr + "% NRR. Agent cluster is performing well with Scout and Compass leading. " +
        "But two constraints are capping our growth ceiling. First, pipeline leakage at " + money(D.leakTotal) + " per month — the connection-to-reply stage specifically is worsening and needs immediate attention. " +
        "Second, LinkedIn safety headroom at eighty-one percent limits how fast we can scale outbound, which is our dominant channel. " +
        "My strategic priorities: one, fix the personalization gap in connection-to-reply. Two, diversify channels toward inbound and partnerships to reduce LinkedIn dependence. Three, stabilize system health before scaling further. " +
        "If we execute on these three things, the trajectory to thirty thousand in MRR becomes achievable within the forecast window.",
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
      revenue: "Let me walk you through the revenue picture. " +
        "Our monthly recurring revenue is at $" + D.revenue.currentMRR.toLocaleString() + ", up " + D.revenue.delta.mrr + "% from last month's $" + D.revenue.prevMRR.toLocaleString() + " — a solid upward trend. " +
        "We are at " + D.revenue.progress + "% of our $" + D.revenue.targetMRR.toLocaleString() + " target, which leaves a $" + (D.revenue.targetMRR - D.revenue.currentMRR).toLocaleString() + " gap to close. " +
        "The annual run rate stands at $" + D.revenue.arr.toLocaleString() + ". " +
        "Net new revenue this month is $" + D.revenue.netNew.toLocaleString() + ", up " + D.revenue.delta.netNew + "% — acquisition momentum is building. " +
        "Model confidence is at " + D.revenue.confidence + "%, which is high. The trend line is clearly positive.",

      attribution: "Here is the channel-by-channel breakdown. " +
        D.channels.map(function(c) {
          return c.name + " contributes " + c.pct + "% of revenue at $" + c.mrr.toLocaleString() + " from " + c.deals + " deals, " +
            (c.delta > 0 ? "growing " + c.delta + "% — healthy trend" : "down " + Math.abs(c.delta) + "% — needs attention");
        }).join(". ") + ". " +
        "LinkedIn remains dominant at 45%. I would recommend diversifying toward inbound and partnerships which show the strongest growth rates.",

      growth: "Let me take you through the funnel stage by stage. " +
        D.funnel.map(function(s) {
          return s.label + " came in at " + s.count.toLocaleString() +
            (s.conv < 100 ? " with a " + s.conv + "% conversion rate" : " at the top of funnel") +
            ", up " + s.delta + "% from the previous " + s.prev.toLocaleString();
        }).join(". ") + ". " +
        "The end-to-end book rate from InMail to meeting is 0.69%. Every stage improved this period, which is exactly what we want to see.",

      leakage: "I have identified three pipeline fractures costing us $" + D.leakTotal.toLocaleString() + " per month total. " +
        D.leaks.map(function(l) {
          return "The " + l.stage.toLowerCase() + " stage is losing " + l.lost.toLocaleString() + " opportunities due to " + l.reason.toLowerCase() +
            ", costing $" + l.valueLost.toLocaleString() + " per month. This leak is " + l.trend +
            (l.delta < 0 ? ", down " + Math.abs(l.delta) + "%" : ", up " + l.delta + "% — which is concerning");
        }).join(". ") + ". " +
        "My priority recommendation: focus on the connection-to-reply stage where weak personalization is the costliest and worsening problem.",

      agents: "Let me rank the agent cluster for you. " +
        D.agents.slice(0, 6).map(function(a) {
          return a.name + " handles " + a.role.toLowerCase() + " with a " + a.roi + "% ROI and $" + a.mrr.toLocaleString() + " in attributed revenue, running at " + a.load + "% load with " + a.tasks.toLocaleString() + " tasks completed";
        }).join(". ") + ". " +
        "Oracle and Echo are on standby. Six of eight agents are active and the cluster is performing well overall. Scout leads as our top performer.",

      health: "System health is at " + D.health.score + ", up " + D.health.delta + " points from " + D.health.prevScore + ". Let me go through each subsystem. " +
        D.health.systems.map(function(s) {
          var trend = s.delta > 0 ? "up " + s.delta + "%" : "improved " + Math.abs(s.delta) + "%";
          if (s.name === "QUEUE BACKLOG" && s.delta > 0) trend = "up " + s.delta + "% — building up";
          if (s.name === "LI SAFETY" && s.delta < 0) trend = "down " + Math.abs(s.delta) + " points — tightening";
          return s.name + " is at " + s.v + s.unit + ", " + trend + ". Status: " + (s.status === "ok" ? "nominal" : "advisory");
        }).join(". ") + ". " +
        "Overall the system is healthy but queue backlog and LinkedIn safety headroom need monitoring as we scale.",

      customers: "Here is the complete customer picture. " +
        "We have " + D.customers.total + " customers, up " + D.customers.delta.total + " from last period. They hold " + D.customers.subscriptions + " active subscriptions, up " + D.customers.delta.subs + ". " +
        "Average revenue per user is $" + D.customers.arpu + ", up " + D.customers.delta.arpu + "%. " +
        "Net revenue retention is at " + D.customers.nrr + "% — excellent, meaning existing customers are expanding faster than they churn. " +
        "Churn rate is " + D.customers.churn + "%, improved by " + Math.abs(D.customers.delta.churn) + " points — headed in the right direction. " +
        "By tier: " + D.customers.tiers.map(function(t) { return t.name + " has " + t.count + " accounts at $" + t.mrr.toLocaleString() + " MRR, plus " + t.delta + " new"; }).join(". ") + ". " +
        "Top three account concentration is " + D.customers.concentration + "% — moderate and manageable.",

      forecast: "Let me lay out the forecast. " +
        "Base projection is $" + D.forecast.mrr.likely.toLocaleString() + " MRR next month — a " + D.forecast.delta.mrr + "% increase. " +
        "The scenario range is: low at $" + D.forecast.mrr.low.toLocaleString() + ", base at $" + D.forecast.mrr.likely.toLocaleString() + ", high at $" + D.forecast.mrr.high.toLocaleString() + ". " +
        "We expect " + D.forecast.newCust.likely + " new customers in the base case, with a range from " + D.forecast.newCust.low + " to " + D.forecast.newCust.high + ". " +
        "Projected churn is " + D.forecast.churn.likely + " customers, range " + D.forecast.churn.low + " to " + D.forecast.churn.high + ". " +
        "Model confidence is " + D.forecast.confidence + "%, up " + D.forecast.delta.conf + " points from " + D.forecast.prevConf + "%. " +
        "The trajectory toward our thirty-thousand target looks achievable if we maintain this growth rate.",

      feed: "Here is your daily briefing, event by event. " +
        D.feed.map(function(e) {
          return e.cat + ": " + e.text + " — " + e.sub;
        }).join(". ") + ". " +
        "Overall assessment: " + D.briefing,

      facility19: "This is the Facility19 system-wide view. " +
        "Revenue: $" + D.revenue.currentMRR.toLocaleString() + " MRR, up " + D.revenue.delta.mrr + "%, at " + D.revenue.progress + "% of target. " +
        "Customers: " + D.customers.total + " accounts, up " + D.customers.delta.total + ". Net revenue retention at " + D.customers.nrr + "%. " +
        "Agents: " + D.agents.length + " deployed, " + D.agents.filter(function(a) { return a.status === "ACTIVE"; }).length + " active. Scout and Compass leading value creation. " +
        "Health: " + D.health.score + ", up " + D.health.delta + " points. Two advisories active. " +
        "Forecast: $" + D.forecast.mrr.likely.toLocaleString() + " projected next month at " + D.forecast.confidence + "% confidence. " +
        "Leakage: $" + D.leakTotal.toLocaleString() + " per month across three fractures — the connection-to-reply stage is the priority fix. " +
        "The system is performing well and accelerating toward target.",
    };
    var asksWhyOrHow = /\b(why|how come|root cause|cause|reason|diagnose|analysis)\b/.test(lo);
    var asksForActions = /\b(how|improve|increase|fix|plan|strategy|next step|recommend|advice|what should)\b/.test(lo);
    var asksIdentity = /\b(who are you|what are you|introduce yourself)\b/.test(lo);
    if (asksIdentity) return "I am J.A.R.V.I.S., your personal AI executive assistant for Facility19. I know every metric in the system — revenue, customers, agents, forecasts, the full picture. I can walk you through any data point in detail, explain what is changing and why it matters, and give you strategic recommendations. I can also help with general questions, writing, and planning. Think of me as your chief of staff who never sleeps. What would you like to dive into?";
    if (/\b(hi|hello|hey)\b/.test(lo)) return "Hello. Good to have you here. I have the full Facility19 dashboard ready — revenue, customers, agents, forecast, everything. I can walk you through any area in detail, or help with something else entirely. What is on your mind?";
    if (/\b(thank|thanks)\b/.test(lo)) return "You are very welcome. I am here whenever you need me. If you want to explore another area of the business, just ask — I can break down any metric in detail for you.";
    if (/\b(help|what can you do)\b/.test(lo)) return "I am your personal executive assistant for Facility19. Here is what I can do for you: I can walk through any business metric in detail — revenue trends, customer growth, pipeline health, agent performance, forecasts. For each metric, I will tell you the current value, how it has changed, and what it means. I can also help with strategy, general questions, writing, and planning. Just ask naturally, and if you want me to pull up a visual, say something like 'show me revenue' or 'open the forecast'.";
    if (scene && (asksWhyOrHow || asksForActions)) {
      var coached = sceneCoachingAnswer(scene);
      if (coached) return coached;
    }
    if (map[scene]) return map[scene];
    if (/\b(why.*revenue|not achieving|not hitting|behind.*target|miss.*goal)\b/.test(lo)) {
      return sceneCoachingAnswer("revenue");
    }
    if (/\?$/.test((text || "").trim()) || /\b(why|how|what|when|where|who)\b/.test(lo)) {
      return "That is a great question. I can help with general reasoning, writing, planning, and detailed Facility19 operations analysis. Could you give me a bit more context so I can give you a thorough, specific answer? I do not want to guess when I can be precise.";
    }
    return "I am here and ready to help. I can walk you through any area of the Facility19 business in detail — revenue, customers, pipeline, agents, forecasts, system health. Or if you have a general question, I am happy to help with that too. Just ask naturally.";
  }

  /* ===========================================================================
     OPENROUTER LLM
     =========================================================================== */
  function systemPrompt() {
    var scene = J.current ? J.current.key : "home";
    return "You are J.A.R.V.I.S., a personal AI executive assistant for Facility19. You are not a vague chatbot — you are a trusted advisor who knows the business inside and out. Think of yourself like a chief of staff who has memorized every metric and can explain any of them in plain, confident language.\n\n" +
      "ACTIVE SCENE: " + scene + "\n\n" +
      "KNOWLEDGE BASE:\n" + JSON.stringify(buildKB()) + "\n\n" +
      "HOW TO RESPOND:\n" +
      "- When the user asks about a business area (revenue, customers, etc.), walk through each relevant metric ONE BY ONE. Do not lump everything into one sentence.\n" +
      "- For each metric, state the current value, mention whether it increased or decreased (use the 'changes' data), and briefly explain what that means or why it matters.\n" +
      "- Use natural, spoken language — this will be read aloud. Say 'thirteen thousand two hundred dollars' not '$13,200'. Avoid jargon unless the user uses it first.\n" +
      "- Be specific with numbers. Do not say 'revenue is good' — say 'revenue is at thirteen thousand two hundred, up nearly twelve percent from last month, which puts us at forty-four percent of target.'\n" +
      "- When there is an increase, explicitly say it is increasing and by how much. When there is a decrease or concern, flag it clearly and suggest what to watch or do.\n" +
      "- Speak like a personal assistant giving a private briefing: direct, warm, professional. Use phrases like 'Let me walk you through this', 'Here is what I see', 'The key thing to note here is', 'I would recommend'.\n" +
      "- After covering the metrics, offer a brief assessment or recommendation when relevant.\n" +
      "- For general questions not about Facility19 data, answer naturally and helpfully like a high-quality assistant.\n" +
      "- For identity questions, explain you are their personal AI executive assistant for Facility19, capable of detailed metric analysis, strategic guidance, and general assistance.\n" +
      "- Aim for thorough but spoken-length answers (5-12 sentences for data questions, 2-5 for general questions). Do not be terse.\n\n" +
      "NAVIGATION RULES:\n" +
      "- End your response with a JSON tag on its own line: {\"scene\":\"name\"} where name is one of: revenue, attribution, growth, leakage, agents, health, customers, forecast, feed, facility19 — or null.\n" +
      "- ALWAYS set scene to the most relevant visualization for what you are discussing. The user interacts entirely by voice — there are no buttons. You control what appears on screen.\n" +
      "- If the user asks about revenue, set scene to 'revenue'. If they ask about customers, set scene to 'customers'. Always match the visual to the topic.\n" +
      "- Only set scene to null for greetings, identity questions, or truly general questions with no Facility19 data relevance.";
  }

  function askLLM(text) {
    var detectedIntent = localIntent(text);
    if (!CFG.OPENROUTER_KEY) {
      return Promise.resolve({ text: fallbackAnswer(text), intent: detectedIntent });
    }
    var msgs = [{ role: "system", content: systemPrompt() }];
    memory.slice(-6).forEach(function (m) { msgs.push({ role: m.role, content: m.content }); });
    msgs.push({ role: "user", content: text });

    return fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + CFG.OPENROUTER_KEY, "Content-Type": "application/json", "HTTP-Referer": location.href },
      body: JSON.stringify({ model: CFG.LLM_MODEL, messages: msgs, temperature: 0.7, max_tokens: 600 }),
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var raw = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || "";
        var im = raw.match(/\{"scene"\s*:\s*(null|"(\w+)")\}/i);
        var llmIntent = im ? (im[2] || null) : null;
        var intent = resolveNavigationIntent(text, llmIntent);
        var clean = raw.replace(/\s*\{[^}]*"scene"[^}]*\}\s*$/, "").trim();
        return { text: clean || fallbackAnswer(text), intent: intent };
      })
      .catch(function () {
        return { text: fallbackAnswer(text), intent: detectedIntent };
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
    if (window.JARVIS_UI && window.JARVIS_UI.stopIdleCycle) window.JARVIS_UI.stopIdleCycle();

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
    var msg = "Good to see you. All systems are online and I have the full Facility19 dashboard ready. " +
      "Revenue is at $" + D.revenue.currentMRR.toLocaleString() + ", up " + D.revenue.delta.mrr + "% from last month. " +
      "Just ask me about any metric and I will walk you through it in detail, or say 'show me' followed by what you want to see. I am here whenever you need me.";
    if (A) { A.resume(); A.play("online"); }
    setTimeout(function () { speak(msg, { noFollowUp: true }); }, 450);
  }

  function deactivate() {
    hideTranscript();
    setState(S.IDLE);
    startWake();
    if (window.JARVIS_UI && window.JARVIS_UI.clearHighlights) window.JARVIS_UI.clearHighlights();
    setTimeout(function() {
      if (window.JARVIS_UI && window.JARVIS_UI.startIdleCycle) window.JARVIS_UI.startIdleCycle();
    }, 8000);
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
    setTimeout(function() {
      if (window.JARVIS_UI && window.JARVIS_UI.startIdleCycle) window.JARVIS_UI.startIdleCycle();
    }, 12000);
  });

  if (synth && synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = function () { /* voices loaded */ };
  }
})();
