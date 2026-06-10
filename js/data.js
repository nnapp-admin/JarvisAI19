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
    prevMRR:    11800,
    delta:      { mrr: +11.9, arr: +11.9, netNew: +22, progress: +8, confidence: +3 },
    spark:      [8200, 8900, 9600, 10400, 11100, 11800, 13200],
  };

  // ---- Revenue attribution (sums to CURRENT_MRR) --------------------------
  const channels = [
    { id: "li",   name: "LINKEDIN OUTBOUND", mrr: 5940, pct: 45, hue: 205, deals: 142, delta: +8,  spark: [4200,4600,4900,5200,5500,5940] },
    { id: "inb",  name: "INBOUND / ORGANIC", mrr: 2640, pct: 20, hue: 150, deals: 74,  delta: +14, spark: [1800,1900,2100,2200,2400,2640] },
    { id: "ref",  name: "REFERRAL",          mrr: 1980, pct: 15, hue: 270, deals: 58,  delta: +6,  spark: [1500,1600,1650,1700,1820,1980] },
    { id: "paid", name: "PAID SOCIAL",        mrr: 1320, pct: 10, hue: 35,  deals: 28,  delta: -3,  spark: [1500,1480,1400,1350,1340,1320] },
    { id: "part", name: "PARTNERSHIPS",       mrr: 1320, pct: 10, hue: 320, deals: 20,  delta: +18, spark: [800,900,1000,1100,1200,1320]  },
  ];

  // ---- Growth engine funnel ----------------------------------------------
  const funnel = [
    { id: "inmail",   label: "INMAIL SENT",     count: 4210, hue: 205, prev: 3800, delta: +10.8 },
    { id: "connect",  label: "CONNECTIONS",     count: 1840, hue: 195, prev: 1620, delta: +13.6 },
    { id: "reply",    label: "REPLIES",         count: 342,  hue: 165, prev: 298,  delta: +14.8 },
    { id: "meeting",  label: "MEETINGS BOOKED", count: 29,   hue: 145, prev: 22,   delta: +31.8 },
  ];
  // conversion between stages, computed
  funnel.forEach((s, i) => {
    s.conv = i === 0 ? 100 : Math.round((s.count / funnel[i - 1].count) * 100);
  });

  // ---- Opportunity leakage -----------------------------------------------
  const leaks = [
    { stage: "INMAIL → CONNECTION", lost: 2370, reason: "NO RESPONSE",        valueLost: 3100, sev: 0.62, delta: -4,  trend: "improving" },
    { stage: "CONNECTION → REPLY",  lost: 1498, reason: "WEAK PERSONALIZATION", valueLost: 3800, sev: 0.81, delta: +12, trend: "worsening" },
    { stage: "REPLY → MEETING",     lost: 313,  reason: "TIMING / NO-SHOW",    valueLost: 1500, sev: 0.44, delta: -8,  trend: "improving" },
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
    prevScore: 82,
    delta: +4,
    systems: [
      { name: "LINKEDIN API",  status: "ok",   v: 99.2, unit: "%",  note: "UPTIME",     prev: 99.0, delta: +0.2 },
      { name: "GHL CRM SYNC",  status: "ok",   v: 34,   unit: "ms", note: "LATENCY",    prev: 42,   delta: -19  },
      { name: "EMAIL DELIVER", status: "ok",   v: 97.4, unit: "%",  note: "INBOX RATE", prev: 96.8, delta: +0.6 },
      { name: "QUEUE BACKLOG", status: "warn", v: 218,  unit: "",   note: "PENDING",    prev: 185,  delta: +18  },
      { name: "ERROR RATE",    status: "ok",   v: 0.4,  unit: "%",  note: "24H",        prev: 0.6,  delta: -33  },
      { name: "LI SAFETY",     status: "warn", v: 81,   unit: "%",  note: "HEADROOM",   prev: 88,   delta: -8   },
    ],
  };

  // ---- Customer universe --------------------------------------------------
  const customers = {
    total: 322,
    subscriptions: 410,
    arpu: 41,
    churn: 3.1,
    nrr: 112,
    delta: { total: +12, subs: +18, arpu: +3, churn: -0.4, nrr: +2 },
    spark: [240,260,278,290,305,322],
    tiers: [
      { name: "ENTERPRISE", count: 18,  mrr: 5200, hue: 45,  delta: +2  },
      { name: "GROWTH",     count: 96,  mrr: 5400, hue: 195, delta: +8  },
      { name: "STARTUP",    count: 208, mrr: 2600, hue: 270, delta: +2  },
    ],
    top: [
      { name: "NORTHWIND", mrr: 1100, pct: 8.3 },
      { name: "ARCADIA",   mrr: 720,  pct: 5.5 },
      { name: "MERIDIAN",  mrr: 540,  pct: 4.1 },
    ],
    concentration: 17.9,
  };

  // ---- Forecast (next month) ---------------------------------------------
  const forecast = {
    confidence: 82,
    prevConf:   78,
    delta:      { conf: +4, mrr: +21.6 },
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
      narration: "Let me walk you through the revenue picture. " +
        "Our monthly recurring revenue stands at thirteen thousand two hundred dollars — that is up nearly twelve percent from last month, which is a strong upward move. " +
        "We are currently at forty-four percent of our thirty-thousand dollar target, which means we still have a sixteen thousand eight hundred dollar gap to close. " +
        "The annual run rate based on this MRR is one hundred fifty-eight thousand four hundred dollars. " +
        "Net new revenue added this month is twenty-eight hundred dollars, up twenty-two percent — that tells me acquisition momentum is building. " +
        "Model confidence in this trajectory is at ninety-one percent, which is high. " +
        "Overall, the trend is clearly positive, but the gap to target means we need to maintain this acceleration to hit our goal on schedule.",
    },
    {
      id: 2, scene: "attribution", q: "Where is revenue coming from?",
      short: "ATTRIBUTION", theme: { hue: 150, name: "ATTRIBUTION" },
      narration: "Here is the channel-by-channel revenue breakdown. " +
        "LinkedIn outbound is our dominant source at forty-five percent of MRR — that is five thousand nine hundred forty dollars across one hundred forty-two deals, growing eight percent. " +
        "Inbound and organic is second at twenty percent, bringing in twenty-six hundred forty dollars with seventy-four deals — this channel is up fourteen percent, which is the fastest growth rate we are seeing. " +
        "Referrals contribute fifteen percent at nineteen hundred eighty dollars from fifty-eight deals, growing six percent steadily. " +
        "Paid social holds ten percent at thirteen hundred twenty dollars from twenty-eight deals, but I should flag this — it is down three percent, the only declining channel. " +
        "Partnerships also hold ten percent at thirteen hundred twenty but are surging eighteen percent, our strongest growth trend. " +
        "My recommendation: keep LinkedIn efficient while scaling inbound and partnerships to reduce channel concentration risk.",
    },
    {
      id: 3, scene: "growth", q: "Show the growth engine.",
      short: "GROWTH ENGINE", theme: { hue: 150, name: "GROWTH" },
      narration: "Let me take you through the funnel stage by stage. " +
        "At the top, we sent four thousand two hundred ten InMails — that is up nearly eleven percent from last period's thirty-eight hundred. Good volume increase. " +
        "From those, we generated one thousand eight hundred forty connections, a forty-four percent conversion rate, up almost fourteen percent. The outreach is resonating better. " +
        "Replies came in at three hundred forty-two, an eighteen-and-a-half percent conversion from connections, up nearly fifteen percent. This is where personalization improvements are paying off. " +
        "Finally, we booked twenty-nine meetings from those replies — an eight-and-a-half percent conversion — up an impressive thirty-two percent. " +
        "The end-to-end book rate from InMail to meeting is zero-point-six-nine percent. Every stage improved this period, which is exactly what we want to see. The bottleneck to focus on next is reply-to-meeting conversion.",
    },
    {
      id: 4, scene: "leakage", q: "Where are we leaking opportunities?",
      short: "LEAKAGE", theme: { hue: 8, name: "LEAKAGE" },
      narration: "I have identified three pipeline fractures costing us a total of eight thousand four hundred dollars per month. Let me walk through each one. " +
        "First, InMail to Connection — we are losing twenty-three hundred seventy prospects here due to no response. That costs us thirty-one hundred per month. The good news: this leak is improving, down four percent from last period. " +
        "Second, and this is the most critical one — Connection to Reply. Weak personalization is causing fourteen hundred ninety-eight drop-offs, costing thirty-eight hundred per month. This leak is actually worsening, up twelve percent. This needs immediate attention. " +
        "Third, Reply to Meeting — timing issues and no-shows are causing three hundred thirteen lost opportunities at fifteen hundred per month. This one is also improving, down eight percent. " +
        "My priority recommendation: focus resources on the connection-to-reply stage. Stronger personalization and better follow-up timing would have the highest revenue recovery impact.",
    },
    {
      id: 5, scene: "agents", q: "Which AI agents create the most value?",
      short: "AGENT VALUE", theme: { hue: 45, name: "AGENT VALUE" },
      narration: "Let me rank the agent cluster by value for you. " +
        "Scout leads as our top performer with a six hundred twelve percent return on investment and forty-one hundred dollars in attributed revenue. It handles lead discovery and has processed eighteen hundred forty tasks at eighty-seven percent load. " +
        "Compass is second — our outreach sequencer running at five hundred forty percent ROI with thirty-six hundred in attributed revenue. It is our busiest agent at ninety-one percent load, which I am monitoring. " +
        "Sentinel comes third, monitoring replies at four hundred seventy percent ROI, twenty-four hundred attributed, running lighter at forty-four percent load. " +
        "Forge handles content generation at three hundred eighty-eight percent ROI. Reed does content research at three hundred five percent. Nexus manages CRM sync at two hundred forty percent ROI with the highest task count at over three thousand. " +
        "Oracle and Echo are on standby — Oracle for intent scoring and Echo as the voice agent. Six of eight agents are active, and the cluster is performing well overall.",
    },
    {
      id: 6, scene: "health", q: "What is the health of our outbound system?",
      short: "OUTBOUND HEALTH", theme: { hue: 165, name: "SYSTEM HEALTH" },
      narration: "System health is at eighty-six, up four points from last period. Let me go through each subsystem. " +
        "LinkedIn API uptime is at ninety-nine-point-two percent — rock solid, up slightly. " +
        "GHL CRM sync latency is at thirty-four milliseconds, improved nineteen percent — that is fast and getting faster. " +
        "Email deliverability is at ninety-seven-point-four percent inbox rate, up zero-point-six — healthy territory. " +
        "Now the two advisories. Queue backlog has two hundred eighteen items pending, up eighteen percent. This is building up and could constrain throughput if it continues. " +
        "Error rate is at zero-point-four percent over twenty-four hours, which is well within tolerance and actually down thirty-three percent. " +
        "Finally, LinkedIn safety headroom is at eighty-one percent, down eight points. This is the one I am watching most closely — I have already throttled outbound batch seven to protect deliverability. " +
        "Overall the system is healthy but those two constraints need monitoring as we scale.",
    },
    {
      id: 7, scene: "customers", q: "How many customers support the company?",
      short: "CUSTOMER UNIVERSE", theme: { hue: 195, name: "CUSTOMERS" },
      narration: "Here is the complete customer picture. " +
        "We have three hundred twenty-two customers, up twelve from last period — steady growth. They hold four hundred ten active subscriptions, up eighteen, meaning our multi-product attach rate is healthy. " +
        "Average revenue per user is forty-one dollars, up three percent. " +
        "Net revenue retention is at one hundred twelve percent — this is excellent. It means existing customers are expanding faster than they churn, adding revenue organically. " +
        "Churn rate is three-point-one percent, down zero-point-four — that improvement is significant and headed in the right direction. " +
        "By tier: Enterprise has eighteen accounts with fifty-two hundred MRR, Growth has ninety-six accounts at fifty-four hundred, and Startup — our largest segment — has two hundred eight accounts at twenty-six hundred. " +
        "Top three account concentration is seventeen-point-nine percent — Northwind at eight-point-three, Arcadia at five-point-five, and Meridian at four-point-one. This concentration is moderate and manageable.",
    },
    {
      id: 8, scene: "forecast", q: "What will next month look like?",
      short: "FORECAST", theme: { hue: 270, name: "FORECAST" },
      narration: "Let me lay out the forecast for next month. " +
        "Our base projection is sixteen thousand fifty dollars in monthly recurring revenue — that would be a twenty-one-point-six percent increase, a significant jump. " +
        "The scenario range is: low case at fourteen thousand one hundred, base case at sixteen thousand fifty, and high case at eighteen thousand two hundred. That is a four-thousand-one-hundred dollar spread. " +
        "We expect thirty-eight new customers in the base case, with a range from twenty-six to fifty-one depending on pipeline conversion. " +
        "Projected churn is eleven customers, with a range from seven to sixteen. Net customer growth should be solidly positive. " +
        "Meeting volume is forecasted at forty-one, ranging from thirty-three to fifty-two. " +
        "Model confidence is at eighty-two percent, up four points from last projection at seventy-eight. " +
        "The trajectory toward our thirty-thousand target looks achievable if we maintain this growth rate and continue improving conversion efficiency.",
    },
    {
      id: 9, scene: "feed", q: "Summarize today's activity.",
      short: "DAILY BRIEFING", theme: { hue: 195, name: "BRIEFING" },
      narration: "Here is your daily briefing, event by event. " +
        "Leads: Scout qualified eighty-four net-new ICP leads today — that is twenty-two percent above yesterday. Strong pipeline input. " +
        "Outreach: Compass dispatched three hundred twelve sequenced touches across six batches. Volume is healthy. " +
        "Replies: Sentinel routed eleven positive replies, with four already moving to calendar. Good engagement signals. " +
        "Meetings: Three meetings were booked today, adding eleven hundred eighty dollars to the pipeline. " +
        "Revenue: Two new subscriptions activated, adding eighty-two dollars in MRR. Every dollar counts. " +
        "One alert to be aware of: LinkedIn safety headroom dropped to eighty-one percent. I have throttled batch seven to protect our deliverability score. " +
        "System note: Nexus reconciled eight CRM records with zero conflicts. Clean sync. " +
        "Overall assessment: a strong operational day with good momentum. The one risk to watch is that outbound safety constraint.",
    },
    {
      id: 10, scene: "facility19", q: "Show me Facility19.",
      short: "FACILITY19", theme: { hue: 210, name: "FACILITY19" },
      narration: "This is Facility19 — the complete system view. Let me summarize each domain. " +
        "Revenue: thirteen thousand two hundred MRR, up twelve percent, forty-four percent to target. The trend is positive. " +
        "Customers: three hundred twenty-two accounts, up twelve this period. Net revenue retention at one hundred twelve percent — expansion outpacing churn. " +
        "Agent cluster: eight agents deployed, six active, two on standby. Scout and Compass are leading value creation. " +
        "System health: eighty-six, up four points. All core systems nominal with two advisories around queue backlog and LinkedIn headroom. " +
        "Forecast: projecting sixteen thousand next month at eighty-two percent confidence. Trajectory is aimed at target. " +
        "Leakage: eight thousand four hundred per month lost across three pipeline fractures. The connection-to-reply stage is the priority fix. " +
        "Every stream, every metric, orbiting a single core. The system is performing well and accelerating.",
    },
  ];

  window.DATA = {
    company: "FACILITY19",
    revenue, channels, funnel, leaks, leakTotal,
    agents, health, customers, forecast,
    feed, briefing, telemetry, commands,
  };
})();
