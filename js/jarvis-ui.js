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

  /* ---- visual helper functions ------------------------------------------ */

  function sparkSVG(data, cls) {
    if (!data || data.length < 2) return "";
    const w = 120, h = 22, pad = 1;
    const min = Math.min.apply(null, data), max = Math.max.apply(null, data);
    const range = max - min || 1;
    const pts = data.map(function(v, i) {
      return ((i / (data.length - 1)) * (w - pad * 2) + pad).toFixed(1) + "," +
             (h - pad - ((v - min) / range) * (h - pad * 2)).toFixed(1);
    }).join(" ");
    var fillPts = pad + "," + (h - pad) + " " + pts + " " + (w - pad) + "," + (h - pad);
    return '<svg class="m-spark ' + (cls || "") + '" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none">' +
      '<polygon class="spark-fill" points="' + fillPts + '"/>' +
      '<polyline class="spark-line" points="' + pts + '"/>' +
      '</svg>';
  }

  function deltaB(val, opts) {
    opts = opts || {};
    var inv = opts.invert;
    var isUp = val > 0, isDown = val < 0;
    var cls = inv ? (isUp ? "down" : isDown ? "up" : "neutral") : (isUp ? "up" : isDown ? "down" : "neutral");
    var arrow = isUp
      ? '<svg viewBox="0 0 10 10"><path d="M5 1L9 6H1Z" fill="currentColor"/></svg>'
      : isDown
        ? '<svg viewBox="0 0 10 10"><path d="M5 9L1 4H9Z" fill="currentColor"/></svg>'
        : '<svg viewBox="0 0 10 10"><rect x="1" y="4" width="8" height="2" fill="currentColor"/></svg>';
    return '<span class="m-delta ' + cls + '">' + arrow + (isUp ? "+" : "") + val + '%</span>';
  }

  function gaugeCircle(pct, cls, size) {
    size = size || 42;
    var r = 16, circ = 2 * Math.PI * r;
    var filled = circ * (pct / 100), gap = circ - filled;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 40 40">' +
      '<circle class="gauge-bg" cx="20" cy="20" r="' + r + '" transform="rotate(-90 20 20)"/>' +
      '<circle class="gauge-fill ' + cls + '" cx="20" cy="20" r="' + r + '" transform="rotate(-90 20 20)" ' +
      'stroke-dasharray="' + filled.toFixed(1) + ' ' + gap.toFixed(1) + '"/>' +
      '</svg>';
  }

  function ringSmall(pct, color, label) {
    var r = 14, circ = 2 * Math.PI * r;
    var f = circ * (pct / 100), gap = circ - f;
    return '<div class="m-ring">' +
      '<svg viewBox="0 0 36 36">' +
      '<circle cx="18" cy="18" r="' + r + '" fill="none" stroke="hsla(var(--hue),40%,25%,.3)" stroke-width="3" />' +
      '<circle cx="18" cy="18" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round" ' +
      'transform="rotate(-90 18 18)" stroke-dasharray="' + f.toFixed(1) + ' ' + gap.toFixed(1) + '" ' +
      'style="filter:drop-shadow(0 0 3px ' + color + ')"/>' +
      '</svg>' +
      '<div class="m-ring-val">' + label + '</div></div>';
  }

  function sevBar(val, max) {
    var pct = Math.round((val / max) * 100);
    var col = val > 0.7 ? "var(--bad)" : val > 0.5 ? "var(--warn)" : "var(--good)";
    return '<div class="m-sev">' +
      '<div class="m-sev-bar"><div class="m-sev-fill" style="width:' + pct + '%;background:' + col + ';box-shadow:0 0 4px ' + col + '"></div></div>' +
      '<span class="m-sev-label">' + Math.round(val * 100) + '%</span></div>';
  }

  function donutSVG(segments) {
    var r = 18, circ = 2 * Math.PI * r, offset = 0;
    var circles = segments.map(function(seg) {
      var len = circ * (seg.pct / 100);
      var c = '<circle cx="24" cy="24" r="' + r + '" fill="none" stroke="' + seg.color + '" stroke-width="7" ' +
              'stroke-dasharray="' + len.toFixed(1) + ' ' + (circ - len).toFixed(1) + '" ' +
              'stroke-dashoffset="' + (-offset).toFixed(1) + '" style="filter:drop-shadow(0 0 3px ' + seg.color + ')"/>';
      offset += len;
      return c;
    }).join("");
    return '<svg viewBox="0 0 48 48">' + circles + '</svg>';
  }

  function card(cls, content) {
    return '<div class="m-card ' + (cls || "") + '">' + content + '</div>';
  }

  function head(label, delta, opts) {
    return '<div class="m-head"><span class="m-label">' + label + '</span>' +
      (delta !== undefined && delta !== null ? deltaB(delta, opts) : "") + '</div>';
  }

  /* ---- contextual right panel ------------------------------------------- */
  var CTX = {
    home: function() {
      var R = D.revenue;
      return { t: "PRIMARY OBJECTIVE", h:
        card("m-good", head("CURRENT MRR", R.delta.mrr) +
          '<div class="m-val m-shine">$' + R.currentMRR.toLocaleString() + '</div>' +
          '<div class="m-hbar" style="margin:6px 0 2px"><div class="m-hbar-track"><div class="m-hbar-fill" style="width:' + R.progress + '%;background:linear-gradient(90deg,var(--accent-dim),var(--good))"></div></div>' +
          '<div class="m-hbar-labels"><span>0</span><span>' + R.progress + '% TO GOAL</span><span>$30K</span></div></div>' +
          sparkSVG(R.spark, "good-spark") +
          '<div class="m-desc">Revenue growing steadily with +11.9% month-over-month trajectory</div>'
        ) +
        card("", head("TARGET", null) +
          '<div class="m-gauge">' + gaugeCircle(R.progress, "accent") +
          '<div class="m-gauge-text"><div class="m-gauge-val">$30,000</div><div class="m-gauge-label">$' + (R.targetMRR - R.currentMRR).toLocaleString() + ' REMAINING</div></div></div>'
        ) +
        card("", head("ACTIVE AGENTS", null) +
          '<div class="m-ring-row">' + ringSmall(75, "var(--good)", '6/8') +
          '<div class="m-ring-info"><div class="m-ring-name">6 ACTIVE · 2 STANDBY</div><div class="m-ring-sub">ALL SYSTEMS NOMINAL</div></div></div>'
        ) +
        card("m-good", head("ARR", R.delta.arr) + '<div class="m-val" style="font-size:20px">$' + R.arr.toLocaleString() + '</div><div class="m-desc">Annualized run rate based on current MRR</div>')
      };
    },

    revenue: function() {
      var R = D.revenue;
      return { t: "REVENUE GOAL", h:
        card("m-good", head("MONTHLY RECURRING REVENUE", R.delta.mrr) +
          '<div class="m-val m-shine">$' + R.currentMRR.toLocaleString() + '</div>' +
          sparkSVG(R.spark, "good-spark") +
          '<div class="m-desc">Up from $' + R.prevMRR.toLocaleString() + ' last month — consistent upward trend across all channels</div>'
        ) +
        card("", head("TARGET PROGRESS", R.delta.progress) +
          '<div class="m-gauge">' + gaugeCircle(R.progress, "accent") +
          '<div class="m-gauge-text"><div class="m-gauge-val">' + R.progress + '%</div><div class="m-gauge-label">OF $' + R.targetMRR.toLocaleString() + ' TARGET</div></div></div>' +
          '<div class="m-hbar" style="margin-top:6px"><div class="m-hbar-track"><div class="m-hbar-fill" style="width:' + R.progress + '%;background:linear-gradient(90deg,var(--accent-dim),var(--accent))"></div></div></div>' +
          '<div class="m-desc">$' + (R.targetMRR - R.currentMRR).toLocaleString() + ' remaining to reach goal</div>'
        ) +
        card("", head("ANNUAL RUN RATE", R.delta.arr) +
          '<div class="m-val" style="font-size:22px">$' + R.arr.toLocaleString() + '</div>' +
          '<div class="m-desc">Projected yearly revenue at current monthly pace</div>'
        ) +
        card("m-good", head("NET NEW MRR", R.delta.netNew) +
          '<div class="m-val good" style="font-size:22px">+$' + R.netNew.toLocaleString() + '</div>' +
          '<div class="m-desc">New revenue added this month — strong acquisition momentum</div>'
        ) +
        card("m-good", head("CONFIDENCE", R.delta.confidence) +
          '<div class="m-gauge">' + gaugeCircle(R.confidence, "good") +
          '<div class="m-gauge-text"><div class="m-gauge-val good">' + R.confidence + '%</div><div class="m-gauge-label">HIGH CERTAINTY</div></div></div>' +
          '<div class="m-desc">Model confidence in achieving revenue trajectory</div>'
        ) +
        '<div style="margin-top:4px"><span class="chip bad-chip">$' + (R.targetMRR - R.currentMRR).toLocaleString() + ' GAP</span><span class="chip accent-chip">ON TRACK</span></div>'
      };
    },

    attribution: function() {
      var total = D.revenue.currentMRR;
      return { t: "ATTRIBUTION", h:
        card("", head("ACTIVE CHANNELS", null) +
          '<div class="m-val" style="font-size:22px">5 SOURCES</div>' +
          (function() {
            var segs = D.channels.map(function(c) {
              return { pct: c.pct, color: "hsl(" + c.hue + ",80%,55%)" };
            });
            var legend = D.channels.map(function(c) {
              return '<div class="m-donut-item"><div class="m-donut-swatch" style="background:hsl(' + c.hue + ',80%,55%)"></div>' + c.name.split(" ")[0] + ' ' + c.pct + '%</div>';
            }).join("");
            return '<div class="m-donut">' + donutSVG(segs) + '<div class="m-donut-legend">' + legend + '</div></div>';
          })()
        ) +
        D.channels.map(function(c) {
          return card(c.delta > 0 ? "m-good" : "m-bad",
            head(c.name, c.delta) +
            '<div class="m-val" style="font-size:20px">$' + c.mrr.toLocaleString() + '<small style="font-family:Share Tech Mono;font-size:10px;color:var(--ink-soft);margin-left:4px">' + c.pct + '%</small></div>' +
            '<div class="m-hbar"><div class="m-hbar-track"><div class="m-hbar-fill" style="width:' + c.pct + '%;background:hsl(' + c.hue + ',80%,55%);box-shadow:0 0 6px hsl(' + c.hue + ',80%,55%)"></div></div>' +
            '<div class="m-hbar-labels"><span>' + c.deals + ' DEALS</span><span>' + c.pct + '% SHARE</span></div></div>' +
            sparkSVG(c.spark, c.delta > 0 ? "good-spark" : "bad-spark") +
            '<div class="m-desc">' + (c.delta > 0 ? "Growing +" + c.delta + "% — strong upward trend" : "Declining " + c.delta + "% — needs attention") + '</div>'
          );
        }).join("")
      };
    },

    growth: function() {
      var maxCount = D.funnel[0].count;
      return { t: "GROWTH ENGINE", h:
        D.funnel.map(function(s, i) {
          var pct = Math.round((s.count / maxCount) * 100);
          var convTxt = s.conv < 100 ? s.conv + "% conversion from previous stage" : "Top of funnel — all outbound volume";
          return card("m-good",
            head(s.label, s.delta) +
            '<div class="m-val" style="font-size:22px">' + s.count.toLocaleString() + (s.conv < 100 ? '<small style="font-family:Share Tech Mono;font-size:10px;color:var(--ink-soft);margin-left:4px">' + s.conv + '% CVR</small>' : '') + '</div>' +
            '<div class="m-hbar"><div class="m-hbar-track"><div class="m-hbar-fill" style="width:' + pct + '%;background:hsl(' + s.hue + ',80%,55%);box-shadow:0 0 6px hsl(' + s.hue + ',80%,55%)"></div></div>' +
            '<div class="m-hbar-labels"><span>PREV: ' + s.prev.toLocaleString() + '</span><span>' + pct + '% OF TOP</span></div></div>' +
            '<div class="m-desc">' + convTxt + ' — up ' + Math.abs(s.delta).toFixed(1) + '% vs last period</div>'
          );
        }).join("") +
        card("m-warn",
          head("END-TO-END BOOK RATE", null) +
          '<div class="m-gauge">' + gaugeCircle(0.69, "warn") +
          '<div class="m-gauge-text"><div class="m-gauge-val warn">0.69%</div><div class="m-gauge-label">INMAIL → MEETING</div></div></div>' +
          '<div class="m-desc">Overall conversion from initial outreach to booked meeting</div>'
        )
      };
    },

    leakage: function() {
      return { t: "OPPORTUNITY LEAKAGE", h:
        card("m-bad",
          head("TOTAL MONTHLY LOSS", null) +
          '<div class="m-val bad">$' + D.leakTotal.toLocaleString() + '/MO</div>' +
          '<div class="m-desc">Revenue leaking through pipeline fractures across 3 stages</div>'
        ) +
        D.leaks.map(function(l) {
          var parts = l.stage.split(" → ");
          var trendCls = l.trend === "improving" ? "m-good" : "m-bad";
          var trendIcon = l.trend === "improving"
            ? '<span class="m-delta up"><svg viewBox="0 0 10 10"><path d="M5 1L9 6H1Z" fill="currentColor"/></svg>IMPROVING</span>'
            : '<span class="m-delta down"><svg viewBox="0 0 10 10"><path d="M5 9L1 4H9Z" fill="currentColor"/></svg>WORSENING</span>';
          return card(trendCls,
            '<div class="m-head"><span class="m-label">' + parts[0] + ' → ' + parts[1] + '</span>' + trendIcon + '</div>' +
            '<div class="m-val bad" style="font-size:22px">-$' + l.valueLost.toLocaleString() + '</div>' +
            sevBar(l.sev, 1) +
            '<div class="m-hbar"><div class="m-hbar-track"><div class="m-hbar-fill" style="width:' + Math.round(l.sev * 100) + '%;background:var(--bad);box-shadow:0 0 6px var(--bad)"></div></div>' +
            '<div class="m-hbar-labels"><span>SEVERITY ' + Math.round(l.sev * 100) + '%</span><span>' + l.lost.toLocaleString() + ' LOST</span></div></div>' +
            '<div class="m-desc"><strong style="color:var(--warn)">' + l.reason + '</strong> — ' + l.lost.toLocaleString() + ' opportunities dropped</div>'
          );
        }).join("") +
        '<div style="margin-top:4px"><span class="chip bad-chip m-pulse">3 FRACTURES DETECTED</span></div>'
      };
    },

    agents: function() {
      var topAgent = D.agents.reduce(function(a, b) { return a.roi > b.roi ? a : b; });
      return { t: "AGENT VALUE", h:
        card("m-good",
          head("TOP PERFORMER", null) +
          '<div class="m-val" style="font-size:22px;color:var(--gold)">' + topAgent.name + '</div>' +
          '<div class="m-gauge">' + gaugeCircle(Math.min(100, Math.round(topAgent.roi / 7)), "good") +
          '<div class="m-gauge-text"><div class="m-gauge-val good">' + topAgent.roi + '% ROI</div><div class="m-gauge-label">$' + topAgent.mrr.toLocaleString() + ' MRR ATTRIBUTED</div></div></div>'
        ) +
        D.agents.slice(0, 6).map(function(a) {
          var isTop = a.value >= 0.8;
          var loadCls = a.load > 85 ? "warn" : "good";
          var loadCol = a.load > 85 ? "var(--warn)" : "var(--good)";
          return card(isTop ? "m-good" : "",
            head(a.name + ' — ' + a.role, null) +
            '<div class="m-ring-row">' +
              ringSmall(Math.min(100, Math.round(a.roi / 7)), isTop ? "var(--gold)" : "var(--accent)", a.roi + '%') +
              '<div class="m-ring-info"><div class="m-ring-name" style="' + (isTop ? 'color:var(--gold)' : '') + '">' + a.roi + '% ROI · $' + a.mrr.toLocaleString() + '</div>' +
              '<div class="m-ring-sub">' + a.tasks.toLocaleString() + ' TASKS · ' + a.status + '</div></div>' +
            '</div>' +
            '<div class="m-hbar" style="margin-top:4px"><div class="m-hbar-track"><div class="m-hbar-fill" style="width:' + a.load + '%;background:' + loadCol + ';box-shadow:0 0 4px ' + loadCol + '"></div></div>' +
            '<div class="m-hbar-labels"><span>LOAD</span><span class="' + loadCls + '">' + a.load + '%</span></div></div>'
          );
        }).join("")
      };
    },

    health: function() {
      var H = D.health;
      var scoreCls = H.score >= 80 ? "good" : H.score >= 60 ? "warn" : "bad";
      return { t: "OUTBOUND HEALTH", h:
        card("m-good",
          head("SYSTEM HEALTH SCORE", H.delta) +
          '<div class="m-gauge">' + gaugeCircle(H.score, scoreCls, 52) +
          '<div class="m-gauge-text"><div class="m-gauge-val good" style="font-size:28px">' + H.score + '</div><div class="m-gauge-label">UP FROM ' + H.prevScore + ' LAST PERIOD</div></div></div>' +
          '<div class="m-desc">Overall system health improved — 2 advisories active</div>'
        ) +
        H.systems.map(function(s) {
          var dotCls = s.status;
          var valCls = s.status === "ok" ? "good" : s.status === "warn" ? "warn" : "bad";
          var cardCls = s.status === "ok" ? "" : "m-warn";
          var deltaDir = s.name === "QUEUE BACKLOG" || s.name === "ERROR RATE" ? {invert: true} : {};
          var desc = s.note;
          if (s.status === "warn") desc += " — needs monitoring";
          else desc += " — nominal";
          return card(cardCls,
            '<div class="m-status-row"><div class="m-status-dot ' + dotCls + '"></div>' +
            '<span class="m-status-name">' + s.name + '</span>' +
            '<span class="m-status-val">' + s.v + s.unit + '</span></div>' +
            '<div class="m-head" style="margin-top:4px;margin-bottom:0"><span class="m-label">' + s.note + '</span>' + deltaB(s.delta, deltaDir) + '</div>' +
            '<div class="m-desc">Previously ' + s.prev + s.unit + ' — ' + desc + '</div>'
          );
        }).join("")
      };
    },

    customers: function() {
      var C = D.customers;
      var segments = C.tiers.map(function(t) {
        return { pct: Math.round((t.count / C.total) * 100), color: "hsl(" + t.hue + ",80%,55%)" };
      });
      return { t: "CUSTOMER UNIVERSE", h:
        card("m-good",
          head("TOTAL CUSTOMERS", C.delta.total) +
          '<div class="m-val m-shine">' + C.total + '</div>' +
          sparkSVG(C.spark, "good-spark") +
          '<div class="m-desc">Customer base growing steadily with +' + C.delta.total + ' net new this period</div>'
        ) +
        card("",
          head("TIER DISTRIBUTION", null) +
          '<div class="m-donut">' + donutSVG(segments) +
          '<div class="m-donut-legend">' + C.tiers.map(function(t) {
            return '<div class="m-donut-item"><div class="m-donut-swatch" style="background:hsl(' + t.hue + ',80%,55%)"></div>' + t.name + ' ' + t.count + ' <span style="color:var(--good)">+' + t.delta + '</span></div>';
          }).join("") + '</div></div>'
        ) +
        card("",
          head("SUBSCRIPTIONS", C.delta.subs) +
          '<div class="m-ring-row">' + ringSmall(Math.round((C.subscriptions / 500) * 100), "var(--accent)", C.subscriptions) +
          '<div class="m-ring-info"><div class="m-ring-name">' + C.subscriptions + ' ACTIVE SUBS</div><div class="m-ring-sub">+' + C.delta.subs + ' net new this period</div></div></div>'
        ) +
        card("m-good",
          head("NET REVENUE RETENTION", C.delta.nrr) +
          '<div class="m-gauge">' + gaugeCircle(Math.min(100, C.nrr - 50), "good") +
          '<div class="m-gauge-text"><div class="m-gauge-val good">' + C.nrr + '%</div><div class="m-gauge-label">EXPANSION > CHURN</div></div></div>' +
          '<div class="m-desc">Above 100% means existing customers are expanding — healthy sign</div>'
        ) +
        card("",
          head("ARPU", C.delta.arpu) +
          '<div class="m-val" style="font-size:20px">$' + C.arpu + '</div><div class="m-desc">Average revenue per user — trending up</div>'
        ) +
        card(C.churn > 4 ? "m-bad" : "",
          head("CHURN RATE", C.delta.churn, {invert: true}) +
          '<div class="m-gauge">' + gaugeCircle(Math.round(C.churn * 10), C.churn > 4 ? "bad" : C.churn > 2 ? "warn" : "good") +
          '<div class="m-gauge-text"><div class="m-gauge-val ' + (C.churn > 4 ? "bad" : "") + '">' + C.churn + '%</div><div class="m-gauge-label">' + (C.delta.churn < 0 ? "IMPROVING" : "WATCH") + '</div></div></div>' +
          '<div class="m-desc">Monthly churn ' + (C.delta.churn < 0 ? "decreased by " + Math.abs(C.delta.churn) + "%" : "increased") + ' — ' + (C.churn < 4 ? "within healthy range" : "above target") + '</div>'
        ) +
        card("",
          head("CONCENTRATION", null) +
          '<div class="m-val" style="font-size:18px">' + C.concentration + '% TOP-3</div>' +
          '<div class="m-desc">Top 3 accounts: ' + C.top.map(function(a) { return a.name + " " + a.pct + "%"; }).join(", ") + ' — moderate risk</div>'
        )
      };
    },

    forecast: function() {
      var F = D.forecast;
      return { t: "FORECAST · NEXT MO", h:
        card("m-good",
          head("PROJECTED MRR", F.delta.mrr) +
          '<div class="m-val m-shine">$' + F.mrr.likely.toLocaleString() + '</div>' +
          sparkSVG(F.history.concat([F.mrr.likely]), "good-spark") +
          '<div class="m-desc">Expected monthly recurring revenue based on current pipeline and conversion rates</div>'
        ) +
        card("",
          head("SCENARIO ANALYSIS", null) +
          '<div class="m-scenarios">' +
            '<div class="m-scen"><span class="m-scen-label">LOW</span><span class="m-scen-val">$' + (F.mrr.low / 1000).toFixed(1) + 'K</span></div>' +
            '<div class="m-scen active"><span class="m-scen-label">BASE</span><span class="m-scen-val">$' + (F.mrr.likely / 1000).toFixed(1) + 'K</span></div>' +
            '<div class="m-scen"><span class="m-scen-label">HIGH</span><span class="m-scen-val">$' + (F.mrr.high / 1000).toFixed(1) + 'K</span></div>' +
          '</div>' +
          '<div class="m-desc">Range of $' + ((F.mrr.high - F.mrr.low) / 1000).toFixed(1) + 'K between scenarios — moderate uncertainty</div>'
        ) +
        card("",
          head("NEW CUSTOMERS", null) +
          '<div class="m-ring-row">' + ringSmall(Math.round((F.newCust.likely / F.newCust.high) * 100), "var(--good)", "+" + F.newCust.likely) +
          '<div class="m-ring-info"><div class="m-ring-name">+' + F.newCust.likely + ' EXPECTED</div><div class="m-ring-sub">RANGE: ' + F.newCust.low + ' – ' + F.newCust.high + '</div></div></div>'
        ) +
        card(F.churn.likely > 12 ? "m-warn" : "",
          head("PROJECTED CHURN", null) +
          '<div class="m-ring-row">' + ringSmall(Math.round((F.churn.likely / F.churn.high) * 100), F.churn.likely > 12 ? "var(--warn)" : "var(--accent)", F.churn.likely) +
          '<div class="m-ring-info"><div class="m-ring-name">' + F.churn.likely + ' CUSTOMERS AT RISK</div><div class="m-ring-sub">RANGE: ' + F.churn.low + ' – ' + F.churn.high + '</div></div></div>'
        ) +
        card("",
          head("MEETINGS FORECAST", null) +
          '<div class="m-gauge">' + gaugeCircle(Math.round((F.meetings.likely / F.meetings.high) * 100), "accent") +
          '<div class="m-gauge-text"><div class="m-gauge-val">' + F.meetings.likely + '</div><div class="m-gauge-label">RANGE: ' + F.meetings.low + ' – ' + F.meetings.high + '</div></div></div>'
        ) +
        card(F.confidence < 85 ? "m-warn" : "m-good",
          head("CONFIDENCE", F.delta.conf) +
          '<div class="m-gauge">' + gaugeCircle(F.confidence, F.confidence >= 85 ? "good" : "warn") +
          '<div class="m-gauge-text"><div class="m-gauge-val ' + (F.confidence >= 85 ? "good" : "warn") + '">' + F.confidence + '%</div><div class="m-gauge-label">UP FROM ' + F.prevConf + '%</div></div></div>' +
          '<div class="m-desc">Model confidence in base scenario — improving</div>'
        ) +
        '<div style="margin-top:4px"><span class="chip accent-chip">TUNNEL VIEW</span><span class="chip accent-chip">6-MONTH TRAJECTORY</span></div>'
      };
    },

    feed: function() {
      var good = D.feed.filter(function(e) { return e.tone === "good"; }).length;
      var warns = D.feed.filter(function(e) { return e.tone === "warn"; }).length;
      var sys = D.feed.filter(function(e) { return e.tone === "ok"; }).length;
      return { t: "DAILY BRIEFING", h:
        card("",
          head("EXECUTIVE SUMMARY", null) +
          '<div class="m-val" style="font-size:18px;color:var(--good)">LIVE</div>' +
          '<div style="display:flex;gap:4px;margin-top:5px">' +
            '<div class="m-scen" style="border-color:hsla(150,70%,50%,.3)"><span class="m-scen-label" style="color:var(--good)">GOOD</span><span class="m-scen-val" style="color:var(--good)">' + good + '</span></div>' +
            '<div class="m-scen" style="border-color:hsla(42,70%,50%,.3)"><span class="m-scen-label" style="color:var(--warn)">WARN</span><span class="m-scen-val" style="color:var(--warn)">' + warns + '</span></div>' +
            '<div class="m-scen" style="border-color:hsla(205,70%,50%,.3)"><span class="m-scen-label" style="color:var(--accent)">SYSTEM</span><span class="m-scen-val" style="color:var(--accent)">' + sys + '</span></div>' +
          '</div>'
        ) +
        D.feed.map(function(e) {
          var toneIcon = e.tone === "good" ? "▲" : e.tone === "warn" ? "⚠" : "●";
          var toneCls = e.tone === "good" ? "m-good" : e.tone === "warn" ? "m-warn" : "";
          var toneColor = e.tone === "good" ? "var(--good)" : e.tone === "warn" ? "var(--warn)" : "var(--accent)";
          return card(toneCls,
            '<div class="m-head"><span class="m-label"><span style="color:' + toneColor + '">' + toneIcon + '</span> ' + e.cat + '</span><span class="m-delta ' + (e.tone === "good" ? "up" : e.tone === "warn" ? "neutral" : "up") + '" style="font-size:7px">' + e.tone.toUpperCase() + '</span></div>' +
            '<div style="font-size:10px;color:#dff1ff;line-height:1.3">' + e.text + '</div>' +
            '<div class="m-desc">' + e.sub + '</div>'
          );
        }).join("") +
        '<div style="margin-top:4px"><span class="chip accent-chip">TIMELINE STREAM</span><span class="chip accent-chip">HUB ROUTING</span></div>'
      };
    },

    facility19: function() {
      var R = D.revenue, C = D.customers, H = D.health, F = D.forecast;
      return { t: "FACILITY19 · ALL", h:
        card("m-good",
          head("MRR", R.delta.mrr) +
          '<div class="m-val m-shine">$' + R.currentMRR.toLocaleString() + '</div>' +
          sparkSVG(R.spark, "good-spark")
        ) +
        card("",
          head("CUSTOMERS", C.delta.total) +
          '<div class="m-ring-row">' + ringSmall(Math.round((C.total / 400) * 100), "var(--accent)", C.total) +
          '<div class="m-ring-info"><div class="m-ring-name">' + C.total + ' ACTIVE</div><div class="m-ring-sub">' + C.subscriptions + ' SUBSCRIPTIONS</div></div></div>'
        ) +
        card("",
          head("AGENTS", null) +
          '<div class="m-ring-row">' + ringSmall(75, "var(--good)", '6/8') +
          '<div class="m-ring-info"><div class="m-ring-name">8 DEPLOYED</div><div class="m-ring-sub">6 ACTIVE · 2 STANDBY</div></div></div>'
        ) +
        card("m-good",
          head("HEALTH", H.delta) +
          '<div class="m-gauge">' + gaugeCircle(H.score, "good") +
          '<div class="m-gauge-text"><div class="m-gauge-val good">' + H.score + '</div><div class="m-gauge-label">SYSTEM HEALTH</div></div></div>'
        ) +
        card("",
          head("FORECAST", F.delta.mrr) +
          '<div class="m-val" style="font-size:20px">$' + (F.mrr.likely / 1000).toFixed(0) + 'K</div><div class="m-desc">Projected next month — ' + F.confidence + '% confidence</div>'
        ) +
        card("m-bad",
          head("LEAKAGE", null) +
          '<div class="m-val bad" style="font-size:20px">-$' + (D.leakTotal / 1000).toFixed(1) + 'K/MO</div><div class="m-desc">Pipeline fractures across 3 stages</div>'
        ) +
        '<div style="margin-top:4px"><span class="chip accent-chip">UNIFIED VIEW</span></div>'
      };
    },
  };

  function setCtx(scene) {
    var c = (CTX[scene] || CTX.home)();
    $("#ctx-title").textContent = c.t;
    var body = $("#ctx-body");
    body.style.opacity = 0;
    body.innerHTML = c.h;
    gsap.to(body, { opacity: 1, duration: 0.5, delay: 0.3 });
    var cards = body.querySelectorAll(".m-card");
    cards.forEach(function(el, i) {
      setTimeout(function() { el.classList.add("revealed"); }, 300 + i * 120);
    });
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
    if (scene === activeScene && !opts.fromVoice && !opts.silent) return;
    doRun(scene, opts);
  }

  function doRun(scene, opts) {
    const cmd = cmdById[scene];
    if (!cmd) return;
    activeScene = scene;
    document.querySelectorAll(".cmd").forEach((el) => el.classList.toggle("active", el.dataset.scene === scene));
    $("#hint").style.opacity = 0;

    setHue(cmd.theme.hue);
    if (A) {
      A.setSceneHue(cmd.theme.hue);
      if (scene === "facility19" || opts.cinematic) A.play("whoosh");
      else A.play("engage", cmd.theme.hue);
      if (scene === "leakage" || scene === "health") setTimeout(() => A.play("alert"), 700);
    }
    J.go(scene, { cinematic: opts.cinematic, onArrive: opts.onArrive });
    showTitle(cmd);
    setCtx(scene);

    if (opts.fromVoice && !opts.silent) {
      sequenceHighlights(scene);
    }

    if (!opts.fromVoice && !opts.silent) {
      capEl.style.opacity = 1;
      capTxt.innerHTML = '<span style="color:var(--ink-faint)">› analyzing…</span>';
      if (A) setTimeout(() => A.play("process"), 500);
      setTimeout(() => {
        if (A) A.play("chime");
        narrate(cmd.narration);
        sequenceHighlights(scene);
      }, 1100);
    }
  }

  /* ---- highlight system for narration ----------------------------------- */
  var highlightTimers = [];

  function clearHighlights() {
    highlightTimers.forEach(function(t) { clearTimeout(t); });
    highlightTimers = [];
    document.querySelectorAll(".m-card.m-highlight").forEach(function(el) { el.classList.remove("m-highlight"); });
    document.querySelectorAll(".lbl.lbl-highlight").forEach(function(el) { el.classList.remove("lbl-highlight"); });
  }

  function highlightCard(idx) {
    var body = $("#ctx-body");
    if (!body) return;
    var cards = body.querySelectorAll(".m-card");
    cards.forEach(function(el) { el.classList.remove("m-highlight"); });
    if (idx >= 0 && idx < cards.length) {
      cards[idx].classList.add("m-highlight");
      cards[idx].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function highlightLabel(keyword) {
    document.querySelectorAll(".lbl.lbl-highlight").forEach(function(el) { el.classList.remove("lbl-highlight"); });
    if (!keyword) return;
    var kw = keyword.toUpperCase();
    document.querySelectorAll(".lbl").forEach(function(el) {
      if (el.textContent.toUpperCase().indexOf(kw) !== -1) {
        el.classList.add("lbl-highlight");
      }
    });
  }

  // highlight a specific metric (3D label + matching context card) by keyword —
  // used when narration drills into a single element of the active scene
  function highlightMetric(keyword) {
    if (!keyword) return;
    highlightLabel(keyword);
    var body = $("#ctx-body");
    if (!body) return;
    var cards = body.querySelectorAll(".m-card");
    var kw = keyword.toUpperCase();
    cards.forEach(function(el) { el.classList.remove("m-highlight"); });
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].textContent.toUpperCase().indexOf(kw) !== -1) {
        cards[i].classList.add("m-highlight");
        cards[i].scrollIntoView({ behavior: "smooth", block: "nearest" });
        break;
      }
    }
  }

  function sequenceHighlights(scene) {
    clearHighlights();
    var sequences = {
      revenue:     [{ card:0, label:"MRR",        delay:1500 }, { card:1, label:"PROGRESS",   delay:6000 }, { card:2, label:"ARR",        delay:10000 }, { card:3, label:"NET NEW",    delay:13000 }, { card:4, label:"CONFIDENCE", delay:16000 }],
      attribution: [{ card:0, label:"FACILITY19",  delay:1500 }, { card:1, label:"LINKEDIN",   delay:4000 }, { card:2, label:"INBOUND",    delay:8000 },  { card:3, label:"REFERRAL",   delay:11000 }, { card:4, label:"PAID",       delay:14000 }, { card:5, label:"PARTNER", delay:17000 }],
      growth:      [{ card:0, label:"INMAIL",      delay:1500 }, { card:1, label:"CONNECTION",  delay:5000 }, { card:2, label:"REPL",       delay:8500 },  { card:3, label:"MEETING",    delay:12000 }, { card:4, label:"CONVERSION", delay:16000 }],
      leakage:     [{ card:0, label:"LEAKAGE",     delay:1500 }, { card:1, label:"INMAIL",      delay:5000 }, { card:2, label:"CONNECTION",  delay:9000 },  { card:3, label:"REPLY",      delay:13000 }],
      agents:      [{ card:0, label:"SCOUT",       delay:1500 }, { card:1, label:"SCOUT",       delay:4000 }, { card:2, label:"COMPASS",    delay:7000 },  { card:3, label:"SENTINEL",   delay:10000 }, { card:4, label:"FORGE",      delay:13000 }, { card:5, label:"REED", delay:15000 }, { card:6, label:"NEXUS", delay:17000 }],
      health:      [{ card:0, label:"HEALTH",      delay:1500 }, { card:1, label:"LINKEDIN API",delay:5000 }, { card:2, label:"GHL",        delay:7500 },  { card:3, label:"EMAIL",      delay:9500 },  { card:4, label:"QUEUE",      delay:11500 }, { card:5, label:"ERROR", delay:13500 }, { card:6, label:"SAFETY", delay:15500 }],
      customers:   [{ card:0, label:"CUSTOMER",    delay:1500 }, { card:1, label:"ENTERPRISE",  delay:5000 }, { card:2, label:"SUBSCRIPTION",delay:8500 },  { card:3, label:"RETENTION",  delay:11000 }, { card:4, label:"ARPU",       delay:14000 }, { card:5, label:"CHURN", delay:16000 }],
      forecast:    [{ card:0, label:"FORECAST",    delay:1500 }, { card:1, label:"SCENARIO",    delay:5000 }, { card:2, label:"NEW CUSTOMER",delay:9000 },  { card:3, label:"CHURN",      delay:12000 }, { card:4, label:"MEETING",    delay:14500 }, { card:5, label:"CONFIDENCE", delay:17000 }],
      feed:        [{ card:0, label:"INTELLIGENCE",delay:1500 }, { card:1, label:"LEADS",       delay:4000 }, { card:2, label:"OUTREACH",   delay:6000 },  { card:3, label:"REPL",       delay:8000 },  { card:4, label:"MEETING",    delay:10000 }, { card:5, label:"REVENUE", delay:12000 }, { card:6, label:"ALERT", delay:14000 }],
      facility19:  [{ card:0, label:"REVENUE",     delay:1500 }, { card:1, label:"CUSTOMER",    delay:4500 }, { card:2, label:"AGENT",      delay:7000 },  { card:3, label:"HEALTH",     delay:9500 },  { card:4, label:"FORECAST",   delay:12000 }, { card:5, label:"LEAKAGE", delay:14500 }],
    };
    var seq = sequences[scene];
    if (!seq) return;
    seq.forEach(function(step) {
      var t = setTimeout(function() {
        highlightCard(step.card);
        highlightLabel(step.label);
      }, step.delay);
      highlightTimers.push(t);
    });
    var lastDelay = seq[seq.length - 1].delay;
    var t2 = setTimeout(clearHighlights, lastDelay + 4000);
    highlightTimers.push(t2);
  }

  /* ---- idle scene cycling (lively ambient behavior) ---------------------- */
  var idleCycleTimer = null;
  var idleScenes = ["revenue", "attribution", "growth", "customers", "forecast", "health", "agents", "facility19"];
  var idleIdx = 0;
  var idlePaused = false;

  function startIdleCycle() {
    stopIdleCycle();
    idlePaused = false;
    idleCycleTimer = setInterval(function() {
      if (idlePaused) return;
      var scene = idleScenes[idleIdx % idleScenes.length];
      idleIdx++;
      run(scene, { fromVoice: true, silent: true });
    }, 18000);
  }

  function stopIdleCycle() {
    idlePaused = true;
    if (idleCycleTimer) { clearInterval(idleCycleTimer); idleCycleTimer = null; }
  }

  function pauseIdleCycle() { idlePaused = true; }
  function resumeIdleCycle() { idlePaused = false; if (!idleCycleTimer) startIdleCycle(); }

  window.JARVIS_UI = { run: run, narrate: narrate, setHue: setHue, setCtx: setCtx, engage: engageSystem, highlightCard: highlightCard, highlightLabel: highlightLabel, highlightMetric: highlightMetric, sequenceHighlights: sequenceHighlights, clearHighlights: clearHighlights, startIdleCycle: startIdleCycle, stopIdleCycle: stopIdleCycle, pauseIdleCycle: pauseIdleCycle, resumeIdleCycle: resumeIdleCycle };

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
