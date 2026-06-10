/* ============================================================================
   scenes-a.js — Commands 1–5
   1 Revenue Goal Universe · 2 Revenue Attribution Galaxy · 3 Growth Funnel
   4 Opportunity Leakage · 5 AI Agent Neural City
   ============================================================================ */
(function () {
  const D = window.DATA, J = window.JV, hsl = J.hsl;
  const TAU = Math.PI * 2;

  /* =========================================================================
     1 · REVENUE GOAL UNIVERSE  (hero)
     Giant energy sphere; rings below the waterline fill with revenue.
     ========================================================================= */
  J.register("revenue", {
    camera: { pos: [0, 1.5, 15.5], look: [0, 0.5, 0] }, drift: 0.7,
    bloom: { strength: 1.05, radius: 0.8, threshold: 0.12 },
    build(ctx) {
      const g = new THREE.Group();
      const R = 5, STEPS = 34, hue = 205;
      const rings = [];
      for (let i = 1; i < STEPS; i++) {
        const y = -R + (2 * R * i) / STEPS;
        const rr = Math.sqrt(Math.max(0, R * R - y * y));
        const ring = J.ring(rr, hue, 0.5, 0.018);
        ring.rotation.x = Math.PI / 2; ring.position.y = y;
        ring.userData.norm = (y + R) / (2 * R);
        g.add(ring); rings.push(ring);
      }
      ctx.rings = rings;
      // outer goal shell + gyro
      const shell = J.wireSphere(R + 0.05, hue, 0.16, 3); g.add(shell); ctx.shell = shell;
      const gr1 = J.ring(R + 1.1, hue, 0.4, 0.02); gr1.rotation.x = Math.PI / 2.3; g.add(gr1);
      const gr2 = J.ring(R + 1.6, 200, 0.28, 0.015); gr2.rotation.x = Math.PI / 1.7; g.add(gr2);
      ctx.gyro = [gr1, gr2];
      // core glow + waterline plate
      const core = J.glow(hue, 6, 0.85, 78); g.add(core); ctx.core = core;
      const plate = J.glow(150, 7, 0.0, 70); g.add(plate); ctx.plate = plate;
      // rising particles
      const N = 500, pos = new Float32Array(N * 3), seed = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const a = Math.random() * TAU, rr = Math.random() * R * 0.85;
        pos[i * 3] = Math.cos(a) * rr; pos[i * 3 + 1] = -R + Math.random() * 2 * R; pos[i * 3 + 2] = Math.sin(a) * rr;
        seed[i] = Math.random();
      }
      const pts = J.points(pos, { size: 0.1, hue: 150, opacity: 0.9 });
      pts.userData.seed = seed; g.add(pts); ctx.pts = pts;

      // labels
      g.add(J.label(J.kv("CURRENT MRR", "$0"), 0, R + 2.4, 0, "big-mrr"));
      ctx.mrrLabel = g.children[g.children.length - 1];
      g.add(J.label(J.kv("TARGET", "$30,000"), -7.5, 2.6, 0, "tag"));
      g.add(J.label(J.kv("ARR", "$158,400"), 7.5, 2.6, 0, "tag"));
      g.add(J.label(J.kv("NET NEW", "+$2,840"), -7.5, -1.4, 0, "tag"));
      g.add(J.label(J.kv("CONFIDENCE", "91%"), 7.5, -1.4, 0, "tag"));
      g.add(J.label(J.kv("PROGRESS", "0%"), 0, -R - 1.8, 0, "big-pct"));
      ctx.pctLabel = g.children[g.children.length - 1];

      ctx.fill = { v: 0 }; ctx.R = R;
      return g;
    },
    enter(g, ctx) {
      const target = D.revenue.progress / 100;
      gsap.to(ctx.fill, { v: target, duration: 2.2, delay: 0.9, ease: "power2.out" });
      const mrrEl = ctx.mrrLabel.element, pctEl = ctx.pctLabel.element;
      const o = { m: 0, p: 0 };
      gsap.to(o, {
        m: D.revenue.currentMRR, p: D.revenue.progress, duration: 2.2, delay: 0.9, ease: "power2.out",
        onUpdate() {
          mrrEl.innerHTML = J.kv("CURRENT MRR", "$" + Math.round(o.m).toLocaleString());
          pctEl.innerHTML = J.kv("PROGRESS", Math.round(o.p) + "%");
        },
      });
    },
    update(t, dt, g, ctx) {
      const fill = ctx.fill.v;
      ctx.rings.forEach((r) => {
        const on = r.userData.norm <= fill;
        const tgt = on ? 0.95 : 0.12;
        r.material.opacity += (tgt - r.material.opacity) * 0.12;
        r.material.color.copy(on ? hsl(150, 90, 60) : hsl(205, 80, 55));
        const pulse = on ? 1 + Math.sin(t * 3 + r.userData.norm * 8) * 0.04 : 1;
        r.scale.setScalar(pulse);
      });
      // waterline plate
      ctx.plate.position.y = -ctx.R + 2 * ctx.R * fill;
      ctx.plate.material.opacity = 0.5 + Math.sin(t * 4) * 0.1;
      ctx.plate.material.color.copy(hsl(150, 90, 65));
      ctx.gyro[0].rotation.z += dt * 0.3; ctx.gyro[1].rotation.z -= dt * 0.22;
      ctx.shell.rotation.y += dt * 0.05;
      ctx.core.material.opacity = 0.7 + Math.sin(t * 2) * 0.15;
      // rising particles, capped at waterline
      const a = ctx.pts.geometry.attributes.position.array, sd = ctx.pts.userData.seed, R = ctx.R;
      const wl = -R + 2 * R * fill;
      for (let i = 0; i < sd.length; i++) {
        a[i * 3 + 1] += dt * (0.6 + sd[i]);
        if (a[i * 3 + 1] > wl || a[i * 3 + 1] > R) {
          const ang = Math.random() * TAU, rr = Math.random() * R * 0.8;
          a[i * 3] = Math.cos(ang) * rr; a[i * 3 + 1] = -R + Math.random() * 0.5; a[i * 3 + 2] = Math.sin(ang) * rr;
        }
      }
      ctx.pts.geometry.attributes.position.needsUpdate = true;
    },
  });

  /* =========================================================================
     2 · REVENUE ATTRIBUTION GALAXY  (hero)
     Channel clusters as spiral galaxies; money particles stream to core.
     ========================================================================= */
  J.register("attribution", {
    camera: { pos: [0, 7, 25], look: [0, 0, 0] }, drift: 1,
    bloom: { strength: 1.0, radius: 0.85, threshold: 0.1 },
    build(ctx) {
      const g = new THREE.Group();
      // central Facility19 core
      const core = J.glow(150, 7, 0.95, 80); g.add(core); ctx.core = core;
      g.add(J.wireSphere(1.6, 150, 0.5, 1));
      g.add(J.label(J.kv("FACILITY19", "$13,200 MRR"), 0, 3, 0, "tag"));

      const galaxies = [], streams = [];
      const ring = 15;
      D.channels.forEach((ch, idx) => {
        const ang = (idx / D.channels.length) * TAU;
        const cx = Math.cos(ang) * ring, cz = Math.sin(ang) * ring, cy = (idx % 2 ? 1 : -1) * 2.2;
        const gg = new THREE.Group(); gg.position.set(cx, cy, cz);
        // spiral disk of points, count scaled by deals
        const n = 120 + ch.deals * 6;
        const pos = new Float32Array(n * 3);
        const scale = 1 + ch.pct / 18; // bigger galaxies = more revenue
        for (let i = 0; i < n; i++) {
          const arm = (i % 2) * Math.PI;
          const dist = Math.pow(Math.random(), 0.6) * 3.4 * scale;
          const a = dist * 0.9 + arm + Math.random() * 0.5;
          pos[i * 3] = Math.cos(a) * dist; pos[i * 3 + 1] = (Math.random() - 0.5) * 0.6; pos[i * 3 + 2] = Math.sin(a) * dist;
        }
        const pts = J.points(pos, { size: 0.13, hue: ch.hue, opacity: 0.92 });
        gg.add(pts);
        gg.add(J.glow(ch.hue, 2.4 * scale, 0.6, 65));
        gg.userData.spin = (idx % 2 ? -1 : 1) * (0.1 + Math.random() * 0.1);
        gg.add(J.label(J.kv(ch.name, "$" + ch.mrr.toLocaleString()), 0, 2.6 * scale, 0, "tag"));
        gg.add(J.label(`<span class="lbl-v">${ch.pct}%</span>`, 0, -2.4 * scale, 0, ""));
        g.add(gg); galaxies.push(gg);

        // money particle stream galaxy -> core
        const sn = 40, sp = new Float32Array(sn * 3), prog = new Float32Array(sn);
        for (let i = 0; i < sn; i++) prog[i] = i / sn;
        const spt = J.points(sp, { size: 0.16, hue: ch.hue, opacity: 0.9 });
        spt.userData = { from: new THREE.Vector3(cx, cy, cz), prog, n: sn, speed: 0.12 + ch.pct / 200 };
        g.add(spt); streams.push(spt);
      });
      ctx.galaxies = galaxies; ctx.streams = streams;
      return g;
    },
    update(t, dt, g, ctx) {
      ctx.core.material.opacity = 0.8 + Math.sin(t * 2.4) * 0.12;
      ctx.galaxies.forEach((gg) => (gg.rotation.y += dt * gg.userData.spin));
      ctx.streams.forEach((s) => {
        const a = s.geometry.attributes.position.array, u = s.userData, f = u.from;
        for (let i = 0; i < u.n; i++) {
          u.prog[i] += dt * u.speed;
          if (u.prog[i] > 1) u.prog[i] -= 1;
          const p = u.prog[i], e = p * p; // ease toward core
          const wob = Math.sin(p * 6 + i) * (1 - p) * 1.2;
          a[i * 3] = f.x * (1 - e) + wob; a[i * 3 + 1] = f.y * (1 - e) + Math.cos(p * 5 + i) * (1 - p); a[i * 3 + 2] = f.z * (1 - e) + wob;
        }
        s.geometry.attributes.position.needsUpdate = true;
      });
      g.rotation.y += dt * 0.03;
    },
  });

  /* =========================================================================
     Shared funnel builder for scenes 3 & 4
     ========================================================================= */
  function buildFunnel(g, hue) {
    // profile: 5 boundary y / radii (top -> bottom), 4 stages
    const ys = [6, 3, 0, -3, -6], rs = [6, 4.1, 2.5, 1.2, 0.45];
    const stages = [];
    for (let i = 0; i < 4; i++) {
      const h = ys[i] - ys[i + 1], mid = (ys[i] + ys[i + 1]) / 2;
      const geo = new THREE.CylinderGeometry(rs[i], rs[i + 1], h, 56, 1, true);
      const mat = new THREE.MeshBasicMaterial({
        color: hsl(hue - i * 4, 85, 55), transparent: true, opacity: 0.1,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const wall = new THREE.Mesh(geo, mat); wall.position.y = mid;
      g.add(wall);
      const ring = J.ring(rs[i], hue, 0.7, 0.03); ring.rotation.x = Math.PI / 2; ring.position.y = ys[i];
      g.add(ring);
      stages.push({ wall, ring, yTop: ys[i], yBot: ys[i + 1], rTop: rs[i], rBot: rs[i + 1] });
    }
    const bot = J.ring(rs[4], hue, 0.7, 0.03); bot.rotation.x = Math.PI / 2; bot.position.y = ys[4]; g.add(bot);
    // radius profile fn
    function radiusAt(y) {
      for (let i = 0; i < 4; i++) {
        if (y <= ys[i] && y >= ys[i + 1]) {
          const f = (ys[i] - y) / (ys[i] - ys[i + 1]);
          return rs[i] + (rs[i + 1] - rs[i]) * f;
        }
      }
      return rs[4];
    }
    return { stages, ys, rs, radiusAt };
  }

  /* =========================================================================
     3 · GROWTH ENGINE FUNNEL
     ========================================================================= */
  J.register("growth", {
    camera: { pos: [0, 6, 17], look: [0, 0, 0] }, drift: 0.6,
    bloom: { strength: 0.95, radius: 0.7, threshold: 0.14 },
    build(ctx) {
      const g = new THREE.Group();
      const F = buildFunnel(g, 150); ctx.F = F;
      // stage labels
      D.funnel.forEach((s, i) => {
        const y = (F.ys[i] + F.ys[i + 1]) / 2, r = F.rs[i] + 1.4;
        g.add(J.label(J.kv(s.label, s.count.toLocaleString()), r, y, 0, "tag"));
        if (i > 0) g.add(J.label(`<span class="lbl-v">${s.conv}%</span>`, -r, y, 0, ""));
      });
      // descending particles, thinned per stage by funnel proportions
      const N = 900, pos = new Float32Array(N * 3), depth = new Float32Array(N), ang = new Float32Array(N), spd = new Float32Array(N);
      const c0 = D.funnel[0].count;
      const bounds = [F.ys[1], F.ys[2], F.ys[3], F.ys[4]];
      const fr = [1, D.funnel[1].count / c0, D.funnel[2].count / c0, D.funnel[3].count / c0];
      function assign(i) {
        const r = Math.random();
        let stop = F.ys[1];
        if (r < fr[3]) stop = bounds[3]; else if (r < fr[2]) stop = bounds[2]; else if (r < fr[1]) stop = bounds[1]; else stop = bounds[0];
        depth[i] = stop; ang[i] = Math.random() * TAU; spd[i] = 1.6 + Math.random() * 1.4;
        const y = F.ys[0] - Math.random() * 1; pos[i * 3 + 1] = y;
        const rr = F.radiusAt(y) * (0.3 + Math.random() * 0.6);
        pos[i * 3] = Math.cos(ang[i]) * rr; pos[i * 3 + 2] = Math.sin(ang[i]) * rr;
      }
      for (let i = 0; i < N; i++) assign(i);
      const pts = J.points(pos, { size: 0.12, hue: 150, opacity: 0.95 });
      pts.userData = { depth, ang, spd, assign, N }; g.add(pts); ctx.pts = pts;
      g.add(J.label(J.kv("CONVERSION", "0.69% → MEETING"), 0, -8.2, 0, "tag"));
      return g;
    },
    update(t, dt, g, ctx) {
      const p = ctx.pts, a = p.geometry.attributes.position.array, u = p.userData, F = ctx.F;
      for (let i = 0; i < u.N; i++) {
        a[i * 3 + 1] -= dt * u.spd[i];
        const y = a[i * 3 + 1];
        const rr = F.radiusAt(y) * 0.85, ca = u.ang[i] + t * 0.2;
        a[i * 3] = Math.cos(ca) * rr * (0.5 + 0.5 * Math.abs(Math.sin(i)));
        a[i * 3 + 2] = Math.sin(ca) * rr * (0.5 + 0.5 * Math.abs(Math.cos(i)));
        if (y < u.depth[i]) u.assign(i);
      }
      p.geometry.attributes.position.needsUpdate = true;
      F.stages.forEach((s, i) => { s.ring.material.opacity = 0.5 + Math.sin(t * 2 + i) * 0.2; });
    },
  });

  /* =========================================================================
     4 · OPPORTUNITY LEAKAGE
     Fractured funnel; red energy leaks out at the weak joints.
     ========================================================================= */
  J.register("leakage", {
    camera: { pos: [0, 5, 17], look: [0, -0.5, 0] }, drift: 0.5,
    bloom: { strength: 1.2, radius: 0.85, threshold: 0.08 },
    build(ctx) {
      const g = new THREE.Group();
      const F = buildFunnel(g, 8); ctx.F = F; // red hue
      F.stages.forEach((s) => { s.wall.material.opacity = 0.07; });
      // leak emitters at the 3 documented fractures (between stages)
      const emitters = [];
      D.leaks.forEach((lk, i) => {
        const y = F.ys[i + 1]; // boundary
        const r = F.rs[i + 1];
        const M = Math.round(40 + lk.sev * 80), pos = new Float32Array(M * 3), life = new Float32Array(M), vel = new Float32Array(M * 3);
        function spawn(j) {
          const a = Math.random() * TAU;
          pos[j * 3] = Math.cos(a) * r; pos[j * 3 + 1] = y; pos[j * 3 + 2] = Math.sin(a) * r;
          vel[j * 3] = Math.cos(a) * (1.4 + Math.random()); vel[j * 3 + 1] = -0.4 - Math.random() * 0.6; vel[j * 3 + 2] = Math.sin(a) * (1.4 + Math.random());
          life[j] = Math.random();
        }
        for (let j = 0; j < M; j++) spawn(j);
        const pts = J.points(pos, { size: 0.16, hue: 8, opacity: 0.95 });
        pts.userData = { life, vel, spawn, M, y, r };
        g.add(pts); emitters.push(pts);
        g.add(J.label(`<span class="lbl-k">${lk.stage}</span><span class="lbl-v" style="color:#ff8a82">-$${lk.valueLost.toLocaleString()}</span>`, r + 3.2, y, 0, "tag danger"));
        g.add(J.label(`<span class="lbl-k" style="color:#ff9a92">${lk.reason}</span>`, r + 3.2, y - 0.9, 0, ""));
      });
      ctx.emitters = emitters;
      // descending (surviving) particles, sparse + red
      const N = 300, p2 = new Float32Array(N * 3), spd = new Float32Array(N), ang = new Float32Array(N);
      for (let i = 0; i < N; i++) { ang[i] = Math.random() * TAU; spd[i] = 1.2 + Math.random(); const y = F.ys[0] - Math.random() * 12; p2[i * 3 + 1] = y; const rr = F.radiusAt(y) * 0.6; p2[i * 3] = Math.cos(ang[i]) * rr; p2[i * 3 + 2] = Math.sin(ang[i]) * rr; }
      const flow = J.points(p2, { size: 0.1, hue: 30, opacity: 0.7 }); flow.userData = { spd, ang, N }; g.add(flow); ctx.flow = flow;
      g.add(J.label(J.kv("TOTAL LEAKAGE", "$" + D.leakTotal.toLocaleString() + "/MO"), 0, 8.5, 0, "tag danger"));
      g.add(J.label(`<span class="lbl-k" style="color:#ff9a92">◢ PIPELINE INTEGRITY COMPROMISED</span>`, 0, -8.3, 0, ""));
      return g;
    },
    update(t, dt, g, ctx) {
      ctx.emitters.forEach((e) => {
        const a = e.geometry.attributes.position.array, u = e.userData;
        for (let j = 0; j < u.M; j++) {
          u.life[j] += dt * 0.7;
          a[j * 3] += u.vel[j * 3] * dt; a[j * 3 + 1] += u.vel[j * 3 + 1] * dt; a[j * 3 + 2] += u.vel[j * 3 + 2] * dt;
          if (u.life[j] > 1) u.spawn(j);
        }
        e.geometry.attributes.position.needsUpdate = true;
        e.material.opacity = 0.6 + Math.sin(t * 9 + u.y) * 0.35; // urgent flicker
      });
      const f = ctx.flow, a = f.geometry.attributes.position.array, u = f.userData, F = ctx.F;
      for (let i = 0; i < u.N; i++) {
        a[i * 3 + 1] -= dt * u.spd[i];
        if (a[i * 3 + 1] < F.ys[4]) { a[i * 3 + 1] = F.ys[0]; }
        const rr = F.radiusAt(a[i * 3 + 1]) * 0.6, ca = u.ang[i] + t * 0.1;
        a[i * 3] = Math.cos(ca) * rr; a[i * 3 + 2] = Math.sin(ca) * rr;
      }
      f.geometry.attributes.position.needsUpdate = true;
      F.stages.forEach((s, i) => { s.ring.material.opacity = 0.4 + Math.sin(t * 7 + i * 2) * 0.3; });
    },
  });

  /* =========================================================================
     5 · AI AGENT NEURAL CITY  (hero)
     Districts (towers) per agent; height = value; gold = top performers;
     light lines = collaboration pipeline.
     ========================================================================= */
  J.register("agents", {
    camera: { pos: [0, 10, 23], look: [0, 2, 0] }, drift: 1,
    bloom: { strength: 1.0, radius: 0.8, threshold: 0.12 },
    build(ctx) {
      const g = new THREE.Group();
      // ground grid
      const grid = new THREE.GridHelper(48, 24, hsl(45, 80, 50), hsl(210, 60, 30));
      grid.material.transparent = true; grid.material.opacity = 0.22; g.add(grid);
      g.add(J.glow(45, 22, 0.18, 30)); // city base glow

      const cols = [-12, -4, 4, 12], rows = [-4.5, 4.5];
      const pos = {};
      D.agents.forEach((ag, i) => {
        const x = cols[i % 4], z = rows[Math.floor(i / 4)];
        const h = 2 + ag.value * 9;
        const top = ag.value >= 0.8, hue = top ? 45 : ag.hue;
        const geo = new THREE.BoxGeometry(2.2, h, 2.2);
        const mat = new THREE.MeshBasicMaterial({ color: hsl(hue, 85, top ? 58 : 48), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
        const tower = new THREE.Mesh(geo, mat); tower.position.set(x, h / 2, z); g.add(tower);
        // wire edges
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: hsl(hue, 90, 66), transparent: true, opacity: 0.7 }));
        edges.position.copy(tower.position); g.add(edges);
        // rooftop beacon
        const beacon = J.glow(hue, top ? 3.4 : 2.2, 0.85, top ? 66 : 60); beacon.position.set(x, h + 0.4, z); g.add(beacon);
        g.add(J.label(`<span class="lbl-k">${ag.name}</span><span class="lbl-v${top ? " " : ""}" ${top ? 'style="color:#ffce5c"' : ""}>${ag.roi}%</span>`, x, h + 2.2, z, top ? "gold" : ""));
        if (ag.status === "STANDBY") g.add(J.label(`<span class="lbl-k" style="color:#ffc24d">STANDBY</span>`, x, h + 1.0, z, ""));
        pos[ag.id] = new THREE.Vector3(x, h, z);
        tower.userData = { base: 0.32, top };
      });
      ctx.pos = pos;
      // collaboration edges (discovery pipeline + intent loop)
      const edges = [["scout", "reed"], ["reed", "forge"], ["forge", "compass"], ["compass", "sentinel"], ["sentinel", "nexus"], ["oracle", "scout"], ["nexus", "scout"]];
      const pulses = [];
      edges.forEach(([a, b]) => {
        const pa = pos[a], pb = pos[b]; if (!pa || !pb) return;
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(pa.x, 0.4, pa.z), new THREE.Vector3(pb.x, 0.4, pb.z)]);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: hsl(195, 90, 60), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending }));
        g.add(line);
        const sp = J.glow(195, 1.1, 0.9, 70); g.add(sp);
        pulses.push({ sp, a: new THREE.Vector3(pa.x, 0.4, pa.z), b: new THREE.Vector3(pb.x, 0.4, pb.z), p: Math.random(), speed: 0.3 + Math.random() * 0.4 });
      });
      ctx.pulses = pulses; ctx.towers = [];
      g.traverse((o) => { if (o.userData && o.userData.base != null) ctx.towers.push(o); });
      g.add(J.label(J.kv("AGENT CLUSTER", "8 DISTRICTS · 6 ACTIVE"), 0, -2.4, 0, "tag"));
      return g;
    },
    update(t, dt, g, ctx) {
      ctx.pulses.forEach((pu) => {
        pu.p += dt * pu.speed; if (pu.p > 1) pu.p -= 1;
        pu.sp.position.lerpVectors(pu.a, pu.b, pu.p);
        pu.sp.material.opacity = Math.sin(pu.p * Math.PI) * 0.9;
      });
      ctx.towers.forEach((tw, i) => { tw.material.opacity = tw.userData.base + Math.sin(t * 2 + i) * 0.06; });
    },
  });
})();
