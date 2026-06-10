import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const AGENTS = [
  { id: "scout",    name: "SCOUT",    role: "Lead Discovery",        status: "ACTIVE",   load: 87 },
  { id: "reed",     name: "REED",     role: "Content Research",      status: "ACTIVE",   load: 62 },
  { id: "compass",  name: "COMPASS",  role: "Outreach Sequencer",    status: "ACTIVE",   load: 91 },
  { id: "echo",     name: "ECHO",     role: "Voice Agent",           status: "STANDBY",  load: 23 },
  { id: "nexus",    name: "NEXUS",    role: "CRM Sync",              status: "ACTIVE",   load: 55 },
  { id: "forge",    name: "FORGE",    role: "Content Generator",     status: "ACTIVE",   load: 78 },
  { id: "sentinel", name: "SENTINEL", role: "Reply Monitor",         status: "ACTIVE",   load: 44 },
  { id: "oracle",   name: "ORACLE",   role: "Intent Scoring",        status: "STANDBY",  load: 12 },
];

const TELEMETRY = [
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
];

// ─── ORB CANVAS ───────────────────────────────────────────────────────────────
function OrbCanvas({ active }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const timeRef   = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width = 480;
    const H = canvas.height = 480;
    const cx = W / 2, cy = H / 2;

    // Particle system
    const N = 200;
    const particles = Array.from({ length: N }, () => {
      const angle  = Math.random() * Math.PI * 2;
      const radius = Math.random() * 130 + 20;
      return {
        angle,
        radius,
        baseR:  radius,
        speed:  (Math.random() * 0.008 + 0.002) * (Math.random() < 0.5 ? 1 : -1),
        size:   Math.random() * 1.8 + 0.4,
        alpha:  Math.random() * 0.8 + 0.2,
        phase:  Math.random() * Math.PI * 2,
      };
    });

    // Ring ticks
    const RING_TICKS = 64;

    function draw(ts) {
      timeRef.current = ts / 1000;
      const t = timeRef.current;
      ctx.clearRect(0, 0, W, H);

      // ── glow background ──
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
      bg.addColorStop(0,   "rgba(30,90,255,0.18)");
      bg.addColorStop(0.5, "rgba(10,50,200,0.08)");
      bg.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(cx, cy, 200, 0, Math.PI * 2);
      ctx.fill();

      // ── outer ring ──
      ctx.save();
      ctx.strokeStyle = "rgba(80,160,255,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 185, 0, Math.PI * 2);
      ctx.stroke();

      // dotted ring (ticks)
      for (let i = 0; i < RING_TICKS; i++) {
        const a = (i / RING_TICKS) * Math.PI * 2 - Math.PI / 2;
        const pulse = Math.sin(t * 2 + i * 0.4) * 0.4 + 0.6;
        const r1 = 188, r2 = 188 + (i % 8 === 0 ? 10 : i % 4 === 0 ? 6 : 3);
        ctx.strokeStyle = `rgba(80,200,255,${pulse * 0.8})`;
        ctx.lineWidth = i % 8 === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.stroke();
      }

      // rotating dashed ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.3);
      ctx.setLineDash([6, 12]);
      ctx.strokeStyle = "rgba(100,180,255,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 175, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // counter-rotate dashed ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-t * 0.18);
      ctx.setLineDash([3, 18]);
      ctx.strokeStyle = "rgba(60,140,255,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 160, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.restore();

      // ── particles ──
      particles.forEach(p => {
        p.angle += p.speed;
        const breathe = Math.sin(t * 1.2 + p.phase) * 10;
        p.radius = p.baseR + breathe;
        const x = cx + Math.cos(p.angle) * p.radius;
        const y = cy + Math.sin(p.angle) * p.radius;
        const flicker = Math.sin(t * 3 + p.phase) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120,200,255,${p.alpha * flicker})`;
        ctx.fill();
      });

      // ── core glow ──
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
      const pulse = Math.sin(t * 1.5) * 0.15 + 0.85;
      coreGlow.addColorStop(0,   `rgba(180,230,255,${0.9 * pulse})`);
      coreGlow.addColorStop(0.3, `rgba(80,160,255,${0.7 * pulse})`);
      coreGlow.addColorStop(0.7, `rgba(30,80,220,${0.3 * pulse})`);
      coreGlow.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, Math.PI * 2);
      ctx.fill();

      // inner bright dot
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.8 * pulse})`;
      ctx.fill();

      // ── cardinal markers ──
      const CARDINALS = ["N","E","S","W"];
      CARDINALS.forEach((c, i) => {
        const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
        const mx = cx + Math.cos(a) * 200;
        const my = cy + Math.sin(a) * 200;
        ctx.fillStyle = "rgba(100,200,255,0.6)";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c, mx, my);
      });

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width:  240,
        height: 240,
        filter: `drop-shadow(0 0 30px rgba(60,140,255,0.6)) ${active ? "drop-shadow(0 0 60px rgba(100,180,255,0.4))" : ""}`,
        transition: "filter 0.5s",
      }}
    />
  );
}

// ─── WAVEFORM ─────────────────────────────────────────────────────────────────
function Waveform() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = 180;
    canvas.height = 40;
    let t = 0;
    let raf;
    function draw() {
      ctx.clearRect(0, 0, 180, 40);
      ctx.strokeStyle = "rgba(60,200,255,0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < 180; x++) {
        const freq1 = Math.sin((x / 180) * Math.PI * 8 + t) * 10;
        const freq2 = Math.sin((x / 180) * Math.PI * 3 + t * 0.7) * 6;
        const freq3 = Math.sin((x / 180) * Math.PI * 15 + t * 1.3) * 3;
        const y = 20 + freq1 + freq2 + freq3;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      t += 0.05;
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} style={{ width: 90, height: 20, opacity: 0.85 }} />;
}

// ─── GAUGE (pie arc) ──────────────────────────────────────────────────────────
function GaugeArc({ value, size = 70 }) {
  const angle = (value / 100) * Math.PI * 2 - Math.PI / 2;
  const x = size / 2 + (size / 2 - 8) * Math.cos(angle);
  const y = size / 2 + (size / 2 - 8) * Math.sin(angle);
  const largeArc = value > 50 ? 1 : 0;
  const r = size / 2 - 8;
  const startX = size / 2;
  const startY = 8;
  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(30,60,120,0.5)" strokeWidth="4" />
      <path
        d={`M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}`}
        fill="none"
        stroke="rgba(80,180,255,0.9)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <text x={size/2} y={size/2+5} textAnchor="middle" fill="rgba(180,230,255,0.9)" fontSize="11" fontFamily="monospace">
        {value}%
      </text>
    </svg>
  );
}

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
function Sparkline({ color = "rgba(60,200,255,0.7)" }) {
  const vals = Array.from({ length: 30 }, () => Math.random() * 30 + 5);
  const max  = Math.max(...vals);
  const pts  = vals.map((v, i) => `${(i / 29) * 160},${30 - (v / max) * 28}`).join(" ");
  return (
    <svg width="160" height="30" style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
function ProgressBar({ value, label, color = "#3ab4ff" }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(140,200,255,0.7)", marginBottom: 2, fontFamily: "monospace" }}>
        <span>{label}</span><span>{value}%</span>
      </div>
      <div style={{ height: 3, background: "rgba(30,60,120,0.5)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 2, boxShadow: `0 0 6px ${color}66`, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function JarvisDashboard() {
  const [time, setTime]         = useState(new Date());
  const [tick, setTick]         = useState(0);
  const [logs, setLogs]         = useState(TELEMETRY.slice(0, 4));
  const [selectedAgent, setSel] = useState(null);
  const [status, setStatus]     = useState("ONLINE");
  const [objective]             = useState({ mrr: 30000, arr: 13461, net: 16039, progress: 44, inProduct: 10, subscriptions: 3798, totals: 322 });
  const [agentLoads, setLoads]  = useState(AGENTS.map(a => a.load));
  const logRef = useRef(null);
  let logIdx = useRef(4);

  // Clock
  useEffect(() => {
    const id = setInterval(() => { setTime(new Date()); setTick(t => t + 1); }, 1000);
    return () => clearInterval(id);
  }, []);

  // Rolling telemetry
  useEffect(() => {
    const id = setInterval(() => {
      const next = TELEMETRY[logIdx.current % TELEMETRY.length];
      logIdx.current++;
      setLogs(prev => [...prev.slice(-7), next]);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  // Drift agent loads
  useEffect(() => {
    const id = setInterval(() => {
      setLoads(prev => prev.map(v => Math.min(99, Math.max(5, v + (Math.random() * 6 - 3)))));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const timeStr = time.toTimeString().slice(0, 8);
  const dateStr = time.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase();

  const styles = {
    root: {
      background: "#000914",
      minHeight: "100vh",
      color: "#7ad4ff",
      fontFamily: "'Courier New', monospace",
      fontSize: 11,
      overflow: "hidden",
      position: "relative",
      userSelect: "none",
    },
    // scanline overlay
    scanlines: {
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100,
      background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,20,60,0.08) 2px, rgba(0,20,60,0.08) 4px)",
    },
    // top bar
    topBar: {
      height: 32,
      background: "linear-gradient(90deg, rgba(0,20,60,0.95), rgba(0,10,40,0.9))",
      borderBottom: "1px solid rgba(40,100,200,0.4)",
      display: "flex",
      alignItems: "center",
      padding: "0 14px",
      gap: 12,
    },
    // main title block
    titleBlock: {
      flex: 1,
    },
    titleMain: {
      fontSize: 10,
      color: "rgba(100,200,255,0.9)",
      letterSpacing: 3,
      fontWeight: "bold",
    },
    titleSub: {
      fontSize: 8,
      color: "rgba(60,140,200,0.6)",
      letterSpacing: 2,
    },
    statusBadge: (s) => ({
      padding: "2px 8px",
      border: `1px solid ${s === "ACTIVE" ? "rgba(60,200,100,0.5)" : "rgba(200,160,40,0.5)"}`,
      color: s === "ACTIVE" ? "rgba(80,220,120,0.9)" : "rgba(220,180,60,0.9)",
      fontSize: 8,
      letterSpacing: 2,
      background: s === "ACTIVE" ? "rgba(20,80,40,0.3)" : "rgba(80,60,10,0.3)",
      cursor: "pointer",
    }),
    // layout
    body: {
      display: "grid",
      gridTemplateColumns: "200px 1fr 200px",
      height: "calc(100vh - 32px)",
      gap: 0,
    },
    // left panel
    leftPanel: {
      borderRight: "1px solid rgba(30,70,160,0.4)",
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      overflowY: "auto",
      background: "rgba(0,8,30,0.5)",
    },
    panelLabel: {
      fontSize: 8,
      color: "rgba(60,130,200,0.7)",
      letterSpacing: 3,
      borderBottom: "1px solid rgba(30,70,160,0.3)",
      paddingBottom: 4,
      marginBottom: 4,
    },
    // center
    centerPanel: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 0 12px",
      position: "relative",
    },
    orbWrap: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
    },
    // right panel
    rightPanel: {
      borderLeft: "1px solid rgba(30,70,160,0.4)",
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 14,
      background: "rgba(0,8,30,0.5)",
      overflowY: "auto",
    },
    // telemetry log
    logWrap: {
      flex: 1,
      overflowY: "auto",
      fontSize: 8,
      lineHeight: 1.7,
    },
    logLine: {
      color: "rgba(80,180,255,0.75)",
      padding: "1px 0",
      borderBottom: "1px solid rgba(20,50,120,0.2)",
    },
    // objective card
    objCard: {
      border: "1px solid rgba(40,120,255,0.35)",
      background: "rgba(0,20,60,0.4)",
      padding: "10px 12px",
      position: "relative",
      overflow: "hidden",
    },
    objLabel: {
      fontSize: 7,
      letterSpacing: 2,
      color: "rgba(80,160,255,0.6)",
      marginBottom: 4,
    },
    metric: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#fff",
      letterSpacing: 1,
      textShadow: "0 0 20px rgba(80,180,255,0.8)",
    },
    subMetric: {
      fontSize: 11,
      color: "rgba(80,200,255,0.8)",
      fontWeight: "bold",
    },
    // agent row
    agentRow: (selected) => ({
      padding: "5px 6px",
      border: `1px solid ${selected ? "rgba(80,180,255,0.5)" : "rgba(20,60,140,0.3)"}`,
      background: selected ? "rgba(20,60,140,0.3)" : "rgba(0,10,40,0.3)",
      cursor: "pointer",
      marginBottom: 3,
      transition: "all 0.2s",
    }),
    dot: (active) => ({
      display: "inline-block", width: 5, height: 5, borderRadius: "50%",
      background: active ? "#40e080" : "#e0a020",
      boxShadow: active ? "0 0 6px #40e080" : "0 0 6px #e0a020",
      marginRight: 5,
      verticalAlign: "middle",
    }),
  };

  return (
    <div style={styles.root}>
      {/* Scanlines */}
      <div style={styles.scanlines} />

      {/* TOP BAR */}
      <div style={styles.topBar}>
        <div style={styles.titleBlock}>
          <div style={styles.titleMain}>J.A.R.V.I.S. · NEXT-GEN MULTI-AGENT INTELLIGENCE SYSTEM</div>
          <div style={styles.titleSub}>WELAUNCH · AGENT CLUSTER · ACTIVE RUN ON 3 MONTHS</div>
        </div>
        {["ONLINE","PAUSED","ENCRYPTED","AUTO-LIVE"].map(s => (
          <div key={s} onClick={() => setStatus(s)} style={{ ...styles.statusBadge(status === s || s === "ONLINE" ? "ACTIVE" : "STANDBY"), opacity: status === s ? 1 : 0.5 }}>
            {s === status ? "● " : ""}{s}
          </div>
        ))}
        <div style={{ fontSize: 10, color: "rgba(100,200,255,0.8)", letterSpacing: 1, marginLeft: 8 }}>
          {timeStr}<span style={{ fontSize: 8, opacity: 0.5, marginLeft: 4 }}>{dateStr}</span>
        </div>
        <div style={{ fontSize: 8, color: "rgba(60,140,200,0.6)", letterSpacing: 1 }}>
          CPU {(42 + tick % 12).toFixed(1)}%&nbsp;&nbsp;
          MEM {(3.2 + (tick % 8) * 0.1).toFixed(1)}GB&nbsp;&nbsp;
          LAT 34ms
        </div>
      </div>

      {/* BODY */}
      <div style={styles.body}>

        {/* ── LEFT PANEL ── */}
        <div style={styles.leftPanel}>
          <div>
            <div style={styles.panelLabel}>SYSTEM VITALS</div>
            <ProgressBar value={Math.round(agentLoads[0])} label="CPU USAGE" color="#3ab4ff" />
            <ProgressBar value={Math.round(agentLoads[1])} label="MEMORY" color="#30e080" />
            <ProgressBar value={Math.round(agentLoads[2])} label="API QUOTA" color="#e08030" />
            <ProgressBar value={Math.round(agentLoads[3])} label="LI SAFETY" color="#a060ff" />
            <ProgressBar value={Math.round(agentLoads[4])} label="GHL SYNC" color="#3ab4ff" />
          </div>

          <div>
            <div style={styles.panelLabel}>TELEMETRY</div>
            <div ref={logRef} style={styles.logWrap}>
              {logs.map((l, i) => (
                <div key={i} style={{ ...styles.logLine, opacity: i === logs.length - 1 ? 1 : 0.6 + i * 0.05 }}>
                  <span style={{ color: "rgba(40,140,255,0.5)" }}>›&nbsp;</span>{l}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={styles.panelLabel}>EXPOSURE LOGS</div>
            {["RESPONSE LINK","VOICE PROOF","EXPOSURE LOOP","OBJECTIVE LOOP"].map((k, i) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "rgba(60,130,200,0.6)", fontSize: 8 }}>{k}</span>
                <span style={{ color: i % 2 === 0 ? "rgba(80,220,120,0.8)" : "rgba(220,180,60,0.8)", fontSize: 8 }}>
                  {i % 2 === 0 ? "STABLE" : "ARMED"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── CENTER ── */}
        <div style={styles.centerPanel}>
          {/* Orb */}
          <div style={styles.orbWrap}>
            <OrbCanvas active={status === "ONLINE"} />
          </div>

          {/* Objective card */}
          <div style={{ width: "80%", ...styles.objCard }}>
            {/* corner accents */}
            {["topLeft","topRight","bottomLeft","bottomRight"].map(corner => (
              <div key={corner} style={{
                position: "absolute",
                width: 10, height: 10,
                borderTop:    corner.startsWith("top")    ? "1px solid rgba(80,180,255,0.6)" : "none",
                borderBottom: corner.startsWith("bottom") ? "1px solid rgba(80,180,255,0.6)" : "none",
                borderLeft:   corner.endsWith("Left")     ? "1px solid rgba(80,180,255,0.6)" : "none",
                borderRight:  corner.endsWith("Right")    ? "1px solid rgba(80,180,255,0.6)" : "none",
                top:    corner.startsWith("top")    ? 4 : "auto",
                bottom: corner.startsWith("bottom") ? 4 : "auto",
                left:   corner.endsWith("Left")     ? 4 : "auto",
                right:  corner.endsWith("Right")    ? 4 : "auto",
              }} />
            ))}
            <div style={styles.objLabel}>● PRIMARY OBJECTIVE &nbsp;|&nbsp; REVENUE &nbsp;|&nbsp; NET 30</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <div>
                <div style={styles.metric}>${objective.mrr.toLocaleString()}<span style={{ fontSize: 9, color: "rgba(80,160,255,0.6)", marginLeft: 3 }}>MRR</span></div>
              </div>
              <div>
                <div style={styles.subMetric}>${objective.arr.toLocaleString()}</div>
                <div style={{ fontSize: 7, color: "rgba(60,130,200,0.5)" }}>ARR</div>
              </div>
              <div>
                <div style={styles.subMetric}>${objective.net.toLocaleString()}</div>
                <div style={{ fontSize: 7, color: "rgba(60,130,200,0.5)" }}>NET</div>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "rgba(80,160,255,0.6)", marginBottom: 3 }}>
                <span>PROGRESS</span><span>{objective.progress}%</span>
                <span>IN PRODUCT</span><span>{objective.inProduct}</span>
                <span>SUBSCRIPTIONS</span><span>{objective.subscriptions.toLocaleString()}</span>
              </div>
              <div style={{ height: 4, background: "rgba(20,50,120,0.4)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${objective.progress}%`, height: "100%", background: "linear-gradient(90deg, #1a6aff, #40c0ff)", boxShadow: "0 0 10px rgba(60,180,255,0.6)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "rgba(60,120,200,0.5)", marginTop: 4 }}>
                <span>TOTALS &nbsp;{objective.totals}</span>
                <span>SYNC · {timeStr}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={styles.rightPanel}>
          {/* Pie gauge */}
          <div>
            <div style={styles.panelLabel}>FREQUENCY 1</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <GaugeArc value={Math.round(agentLoads[5])} size={70} />
            </div>
          </div>

          {/* Waveform */}
          <div>
            <div style={styles.panelLabel}>SIGNAL BIO 1</div>
            <div style={{ overflow: "hidden" }}><Waveform /></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "rgba(60,130,200,0.5)", marginTop: 2 }}>
              <span>BAND · A</span><span>FREQ · 14kHz</span>
            </div>
          </div>

          {/* Agent list */}
          <div style={{ flex: 1 }}>
            <div style={styles.panelLabel}>AGENT CLUSTER</div>
            {AGENTS.map((agent, i) => (
              <div
                key={agent.id}
                style={styles.agentRow(selectedAgent === agent.id)}
                onClick={() => setSel(selectedAgent === agent.id ? null : agent.id)}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={styles.dot(agent.status === "ACTIVE")} />
                    <span style={{ fontSize: 9, fontWeight: "bold", color: "rgba(140,210,255,0.9)", letterSpacing: 1 }}>{agent.name}</span>
                  </div>
                  <span style={{ fontSize: 7, color: agent.status === "ACTIVE" ? "rgba(60,200,100,0.7)" : "rgba(200,160,40,0.7)" }}>
                    {agent.status}
                  </span>
                </div>
                {selectedAgent === agent.id && (
                  <div style={{ marginTop: 4, fontSize: 7, color: "rgba(80,160,255,0.6)", lineHeight: 1.6 }}>
                    <div>{agent.role}</div>
                    <ProgressBar value={Math.round(agentLoads[i])} label="LOAD" color="#3ab4ff" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Corner stats */}
          <div style={{ borderTop: "1px solid rgba(30,70,160,0.3)", paddingTop: 8 }}>
            <div style={styles.panelLabel}>RUNTIME STATS</div>
            {[["INMAIL","4.2k"],["CONNECT","1.8k"],["REPLIED","342"],["BOOKED","29"],["MRR ATTR","$8.4k"]].map(([k,v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ color: "rgba(60,130,200,0.6)", fontSize: 8 }}>{k}</span>
                <span style={{ color: "rgba(100,200,255,0.85)", fontSize: 8, fontWeight: "bold" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
