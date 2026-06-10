/* ============================================================================
   FACILITY19 · JARVIS COMMAND CENTER
   data.js — single coherent (but entirely simulated) dataset.
   Every scene reads from window.DATA so numbers stay consistent across the demo.
   ============================================================================ */
(function () {
  // ---- Core revenue truth -------------------------------------------------
  const TARGET_MRR  = 30000;
  const CURRENT_MRR = 13200;          // 44% of target
  const PROGRESS    = Math.round((CURRENT_MRR / TARGET_MRR) * 100); // 44

  const revenue = {
    targetMRR:  TARGET_MRR,
    currentMRR: CURRENT_MRR,
    progress:   PROGRESS,
    arr:        CURRENT_MRR * 12,      // 158,400
    netNew:     2840,
    inProduct:  10,
    confidence: 91,
  };

  // ---- Revenue attribution (sums to CURRENT_MRR) --------------------------
  const channels = [
    { id: "li",   name: "LINKEDIN OUTBOUND", mrr: 5940, pct: 45, hue: 205, deals: 142 },
    { id: "inb",  name: "INBOUND / ORGANIC", mrr: 2640, pct: 20, hue: 150, deals: 74  },
    { id: "ref",  name: "REFERRAL",          mrr: 1980, pct: 15, hue: 270, deals: 58  },
    { id: "paid", name: "PAID SOCIAL",        mrr: 1320, pct: 10, hue: 35,  deals: 28  },
    { id: "part", name: "PARTNERSHIPS",       mrr: 1320, pct: 10, hue: 320, deals: 20  },
  ];

  // ---- Growth engine funnel ----------------------------------------------
  const funnel = [
    { id: "inmail",   label: "INMAIL SENT",     count: 4210, hue: 205 },
    { id: "connect",  label: "CONNECTIONS",     count: 1840, hue: 195 },
    { id: "reply",    label: "REPLIES",         count: 342,  hue: 165 },
    { id: "meeting",  label: "MEETINGS BOOKED", count: 29,   hue: 145 },
  ];
  // conversion between stages, computed
  funnel.forEach((s, i) => {
    s.conv = i === 0 ? 100 : Math.round((s.count / funnel[i - 1].count) * 100);
  });

  // ---- Opportunity leakage -----------------------------------------------
  const leaks = [
    { stage: "INMAIL → CONNECTION", lost: 2370, reason: "NO RESPONSE",        valueLost: 3100, sev: 0.62 },
    { stage: "CONNECTION → REPLY",  lost: 1498, reason: "WEAK PERSONALIZATION", valueLost: 3800, sev: 0.81 },
    { stage: "REPLY → MEETING",     lost: 313,  reason: "TIMING / NO-SHOW",    valueLost: 1500, sev: 0.44 },
  ];
  const leakTotal = leaks.reduce((a, l) => a + l.valueLost, 0); // 8,400

  // ---- AI Agent ecosystem (neural city) ----------------------------------
  // load matches the source dashboard; value/roi simulated.
  const agents = [
    { id: "scout",    name: "SCOUT",    role: "Lead Discovery",     status: "ACTIVE",  load: 87, roi: 612, value: 0.92, mrr: 4100, tasks: 1840, hue: 205 },
    { id: "compass",  name: "COMPASS",  role: "Outreach Sequencer", status: "ACTIVE",  load: 91, roi: 540, value: 0.88, mrr: 3600, tasks: 2210, hue: 200 },
    { id: "sentinel", name: "SENTINEL", role: "Reply Monitor",      status: "ACTIVE",  load: 44, roi: 470, value: 0.79, mrr: 2400, tasks: 690,  hue: 165 },
    { id: "forge",    name: "FORGE",    role: "Content Generator",  status: "ACTIVE",  load: 78, roi: 388, value: 0.71, mrr: 1500, tasks: 980,  hue: 45  },
    { id: "reed",     name: "REED",     role: "Content Research",   status: "ACTIVE",  load: 62, roi: 305, value: 0.64, mrr: 900,  tasks: 540,  hue: 270 },
    { id: "nexus",    name: "NEXUS",    role: "CRM Sync",           status: "ACTIVE",  load: 55, roi: 240, value: 0.55, mrr: 420,  tasks: 3120, hue: 220 },
    { id: "oracle",   name: "ORACLE",   role: "Intent Scoring",     status: "STANDBY", load: 12, roi: 210, value: 0.48, mrr: 280,  tasks: 160,  hue: 300 },
    { id: "echo",     name: "ECHO",     role: "Voice Agent",        status: "STANDBY", load: 23, roi: 120, value: 0.31, mrr: 0,    tasks: 40,   hue: 330 },
  ];

  // ---- Outbound system health --------------------------------------------
  const health = {
    score: 86,
    systems: [
      { name: "LINKEDIN API",  status: "ok",   v: 99.2, unit: "%",  note: "UPTIME" },
      { name: "GHL CRM SYNC",  status: "ok",   v: 34,   unit: "ms", note: "LATENCY" },
      { name: "EMAIL DELIVER", status: "ok",   v: 97.4, unit: "%",  note: "INBOX RATE" },
      { name: "QUEUE BACKLOG", status: "warn", v: 218,  unit: "",   note: "PENDING" },
      { name: "ERROR RATE",    status: "ok",   v: 0.4,  unit: "%",  note: "24H" },
      { name: "LI SAFETY",     status: "warn", v: 81,   unit: "%",  note: "HEADROOM" },
    ],
  };

  // ---- Customer universe --------------------------------------------------
  const customers = {
    total: 322,
    subscriptions: 410,
    arpu: 41,
    churn: 3.1,
    nrr: 112,
    tiers: [
      { name: "ENTERPRISE", count: 18,  mrr: 5200, hue: 45  },
      { name: "GROWTH",     count: 96,  mrr: 5400, hue: 195 },
      { name: "STARTUP",    count: 208, mrr: 2600, hue: 270 },
    ],
    top: [
      { name: "NORTHWIND", mrr: 1100, pct: 8.3 },
      { name: "ARCADIA",   mrr: 720,  pct: 5.5 },
      { name: "MERIDIAN",  mrr: 540,  pct: 4.1 },
    ],
    concentration: 17.9, // top 3 share %
  };

  // ---- Forecast (next month) ---------------------------------------------
  const forecast = {
    confidence: 82,
    mrr:        { likely: 16050, low: 14100, high: 18200 },
    newCust:    { likely: 38,    low: 26,    high: 51 },
    churn:      { likely: 11,    low: 7,     high: 16 },
    meetings:   { likely: 41,    low: 33,    high: 52 },
    months: ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV"],
    history:  [9200, 10400, 11100, 12300, 12800, 13200],
    projected:[13200, 16050, 19200, 22800, 26100, 30200],
  };

  // ---- Daily intelligence feed -------------------------------------------
  const feed = [
    { cat: "LEADS",    tone: "good", text: "SCOUT qualified 84 net-new ICP leads", sub: "+22% vs yesterday" },
    { cat: "OUTREACH", tone: "good", text: "COMPASS dispatched 312 sequenced touches", sub: "6 batches" },
    { cat: "REPLIES",  tone: "good", text: "SENTINEL routed 11 positive replies", sub: "4 to calendar" },
    { cat: "MEETINGS", tone: "good", text: "3 meetings booked", sub: "$1,180 pipeline added" },
    { cat: "REVENUE",  tone: "good", text: "2 subscriptions activated", sub: "+$82 MRR" },
    { cat: "ALERT",    tone: "warn", text: "LinkedIn safety headroom at 81%", sub: "throttling batch #7" },
    { cat: "SYSTEM",   tone: "ok",   text: "NEXUS reconciled 8 CRM records", sub: "0 conflicts" },
  ];
  const briefing =
    "Strong day. Pipeline expanded 9% on Scout's lead surge; eleven positive replies " +
    "are in motion. One advisory: outbound safety headroom is tightening — I have " +
    "throttled batch seven to protect deliverability.";

  // ---- Rolling telemetry (left-panel ticker) ------------------------------
  const telemetry = [
    "SCOUT › 14 new ICP leads qualified from Sales Nav export",
    "COMPASS › Connection req sent to M. Rodriguez @ Salesforce",
    "REED › Research complete for 3 pending outreach targets",
    "NEXUS › GHL sync successful — 8 contacts updated",
    "FORGE › Generated 5 InMail drafts pending approval",
    "SENTINEL › 2 positive replies routed to calendar",
    "COMPASS › Follow-up seq triggered for batch #7",
    "SCOUT › Competitor follower scrape complete — 320 leads",
    "ORACLE › Intent spike detected: Facility19 ICP cluster",
    "REED › Blog analysis: target posted 3h ago — flagged warm",
    "SENTINEL › Inbox sweep — 41 messages classified",
    "NEXUS › Billing reconcile — 410 active subscriptions",
  ];

  // ---- The ten executive commands ----------------------------------------
  // theme.color drives the per-scene color shift; narration is Jarvis's voice.
  const commands = [
    {
      id: 1, scene: "revenue", q: "How close are we to our revenue goal?",
      short: "REVENUE GOAL", theme: { hue: 205, name: "REVENUE" },
      narration: "We are at thirteen thousand two hundred in monthly recurring revenue — forty-four percent of the thirty-thousand target. Net new is up twenty-eight hundred. Confidence is high.",
    },
    {
      id: 2, scene: "attribution", q: "Where is revenue coming from?",
      short: "ATTRIBUTION", theme: { hue: 150, name: "ATTRIBUTION" },
      narration: "Forty-five percent of revenue flows from LinkedIn outbound. Inbound and referral together hold a healthy thirty-five percent. Paid and partnerships round out the rest.",
    },
    {
      id: 3, scene: "growth", q: "Show the growth engine.",
      short: "GROWTH ENGINE", theme: { hue: 150, name: "GROWTH" },
      narration: "Four thousand two hundred touches entered the funnel. They converged to one thousand eight hundred connections, three hundred forty-two replies, and twenty-nine booked meetings.",
    },
    {
      id: 4, scene: "leakage", q: "Where are we leaking opportunities?",
      short: "LEAKAGE", theme: { hue: 8, name: "LEAKAGE" },
      narration: "I have isolated three fractures. The largest is connection-to-reply — weak personalization is bleeding thirty-eight hundred in monthly value. Total leakage: eighty-four hundred.",
    },
    {
      id: 5, scene: "agents", q: "Which AI agents create the most value?",
      short: "AGENT VALUE", theme: { hue: 45, name: "AGENT VALUE" },
      narration: "Scout leads the cluster — a six-hundred-percent return, forty-one hundred in attributed revenue. Compass and Sentinel follow. Oracle and Echo remain on standby.",
    },
    {
      id: 6, scene: "health", q: "What is the health of our outbound system?",
      short: "OUTBOUND HEALTH", theme: { hue: 165, name: "SYSTEM HEALTH" },
      narration: "System health is eighty-six. All APIs nominal. Two advisories: the send queue is backing up, and LinkedIn safety headroom is at eighty-one percent. I am compensating.",
    },
    {
      id: 7, scene: "customers", q: "How many customers support the company?",
      short: "CUSTOMER UNIVERSE", theme: { hue: 195, name: "CUSTOMERS" },
      narration: "Three hundred twenty-two customers across four hundred ten subscriptions. Net revenue retention is one hundred twelve percent. Top three accounts hold eighteen percent — concentration is moderate.",
    },
    {
      id: 8, scene: "forecast", q: "What will next month look like?",
      short: "FORECAST", theme: { hue: 270, name: "FORECAST" },
      narration: "Projecting sixteen thousand in recurring revenue next month — a confidence band from fourteen-one to eighteen-two. Thirty-eight new customers expected against eleven churned.",
    },
    {
      id: 9, scene: "feed", q: "Summarize today's activity.",
      short: "DAILY BRIEFING", theme: { hue: 195, name: "BRIEFING" },
      narration: briefing,
    },
    {
      id: 10, scene: "facility19", q: "Show me Facility19.",
      short: "FACILITY19", theme: { hue: 210, name: "FACILITY19" },
      narration: "This is Facility19 — entire. Every agent, every stream, every metric, orbiting a single core. Revenue, growth, customers, forecast, the agent cluster — one living system.",
    },
  ];

  window.DATA = {
    company: "FACILITY19",
    revenue, channels, funnel, leaks, leakTotal,
    agents, health, customers, forecast,
    feed, briefing, telemetry, commands,
  };
})();
