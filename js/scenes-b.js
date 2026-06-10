/* ============================================================================
   scenes-b.js — Commands 6–10
   6 Outbound Health Control Room · 7 Customer Universe · 8 Forecast Tunnel
   9 Daily Intelligence Feed · 10 Facility19 Digital Universe (showstopper)
   ============================================================================ */
(function () {
  const D = window.DATA, J = window.JV, hsl = J.hsl;
  const TAU = Math.PI * 2;

  /* =========================================================================
     6 · OUTBOUND HEALTH CONTROL ROOM
     Central health gauge + holographic status panels in an arc.
     ========================================================================= */
  J.register("health", {
    camera: { pos: [0, 1, 17], look: [0, 0.5, 0] }, drift: 0.5,
    bloom: { strength: 0.9, radius: 0.7, threshold: 0.15 },
    build(ctx) {
      const g = new THREE.Group();
      // central gauge — segmented arc filled to health score
      const SEG = 60, score = D.health.score, gauge = new THREE.Group();
      const ticks = [];
      for (let i = 0; i < SEG; i++) {
        const frac = i / SEG, a = -Math.PI * 0.75 + frac * Math.PI * 1.5; // 270° sweep
        const on = frac * 100 <= score;
        const hue = on ? (score > 80 ? 150 : 45) : 210;
        const geo = new THREE.BoxGeometry(0.12, on ? 0.7 : 0.4, 0.12);
        const mat = new THREE.MeshBasicMaterial({ color: hsl(hue, 90, on ? 60 : 36), transparent: true, opacity: on ? 0.95 : 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(Math.cos(a) * 4, Math.sin(a) * 4, 0); m.rotation.z = a - Math.PI / 2;
        gauge.add(m); ticks.push({ m, on, base: a });
      }
      g.add(gauge); ctx.ticks = ticks;
      g.add(J.wireSphere(1.7, 150, 0.4, 1));
      g.add(J.glow(150, 4, 0.7, 70));
      g.add(J.label(`<span class="lbl-k">SYSTEM HEALTH</span><span class="lbl-v" style="font-size:40px;color:#46e6a0">${score}</span>`, 0, 0, 0.2, ""));
      g.add(J.label(`<span class="lbl-k" style="color:#7df0b6">◢ NOMINAL · 2 ADVISORIES</span>`, 0, -5.4, 0, "tag"));

      // status panels in arc
      const panels = [];
      D.health.systems.forEach((s, i) => {
        const ang = -Math.PI * 0.62 + (i / (D.health.systems.length - 1)) * Math.PI * 1.24;
        const R = 8.2, x = Math.cos(ang) * R, y = Math.sin(ang) * R * 0.7 + 0.5;
        const col = s.status === "ok" ? "#7df0b6" : s.status === "warn" ? "#ffd27a" : "#ff8a82";
        const hue = s.status === "ok" ? 150 : s.status === "warn" ? 42 : 8;
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), new THREE.MeshBasicMaterial({ color: hsl(hue, 80, 30), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
        plane.position.set(x, y, -1); g.add(plane);
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(3, 1.5)), new THREE.LineBasicMaterial({ color: hsl(hue, 90, 60), transparent: true, opacity: 0.6 }));
        edge.position.copy(plane.position); g.add(edge); plane.userData.edge = edge; plane.userData.hue = hue;
        g.add(J.label(`<span class="lbl-k">${s.name}</span><span class="lbl-v" style="color:${col}">${s.v}${s.unit}</span><span class="lbl-k" style="opacity:.7">${s.note}</span>`, x, y, -0.8, ""));
        panels.push(plane);
      });
      ctx.panels = panels;
      return g;
    },
    update(t, dt, g, ctx) {
      ctx.ticks.forEach((tk, i) => { if (tk.on) tk.m.material.opacity = 0.7 + Math.sin(t * 4 - i * 0.2) * 0.3; });
      ctx.panels.forEach((p, i) => { const fl = p.userData.hue !== 150; p.material.opacity = 0.1 + Math.sin(t * (fl ? 6 : 2) + i) * (fl ? 0.08 : 0.04); });
    },
  });

  /* =========================================================================
     7 · CUSTOMER UNIVERSE  (hero)
     Tier clusters as nebulae; top accounts as bright stars; lines to core.
     ========================================================================= */
  J.register("customers", {
    camera: { pos: [0, 5, 30], look: [0, 0, 0] }, drift: 1,
    bloom: { strength: 1.05, radius: 0.9, threshold: 0.1 },
    build(ctx) {
      const g = new THREE.Group();
      const core = J.glow(195, 6, 0.95, 80); g.add(core); ctx.core = core;
      g.add(J.wireSphere(1.6, 195, 0.5, 1));
      g.add(J.label(J.kv("FACILITY19", "322 CUSTOMERS"), 0, 3, 0, "tag"));

      const clusters = [];
      D.customers.tiers.forEach((tier, idx) => {
        const ang = (idx / 3) * TAU + 0.4;
        const cx = Math.cos(ang) * 14, cz = Math.sin(ang) * 14, cy = (idx - 1) * 3;
        const n = tier.count, pos = new Float32Array(n * 3), spread = 2 + tier.count / 40;
        for (let i = 0; i < n; i++) {
          const r = Math.pow(Math.random(), 0.5) * spread, a = Math.random() * TAU, b = Math.acos(Math.random() * 2 - 1);
          pos[i * 3] = cx + r * Math.sin(b) * Math.cos(a); pos[i * 3 + 1] = cy + r * Math.cos(b); pos[i * 3 + 2] = cz + r * Math.sin(b) * Math.sin(a);
        }
        const pts = J.points(pos, { size: 0.22, hue: tier.hue, opacity: 0.9 });
        pts.userData.spin = 0.04 + idx * 0.01; g.add(pts); clusters.push(pts);
        g.add(J.glow(tier.hue, spread * 1.6, 0.4, 55).translateX(cx).translateY(cy).translateZ(cz));
        g.add(J.label(`<span class="lbl-k">${tier.name}</span><span class="lbl-v">${tier.count}</span>`, cx, cy + spread + 1.2, cz, "tag"));
        // line cluster -> core
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(cx, cy, cz), new THREE.Vector3(0, 0, 0)]), new THREE.LineBasicMaterial({ color: hsl(tier.hue, 80, 55), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending }));
        g.add(line);
      });
      ctx.clusters = clusters;

      // top accounts = bright revenue stars near core
      D.customers.top.forEach((acc, i) => {
        const ang = (i / 3) * TAU, x = Math.cos(ang) * 6, z = Math.sin(ang) * 6, y = 4 + i;
        const star = J.glow(45, 2.6, 0.95, 66); star.position.set(x, y, z); g.add(star); star.userData.tw = Math.random() * 6;
        g.add(J.wireSphere(0.7, 45, 0.6, 0).translateX(x).translateY(y).translateZ(z));
        g.add(J.label(`<span class="lbl-k" style="color:#ffce5c">${acc.name}</span><span class="lbl-v" style="color:#ffce5c">${acc.pct}%</span>`, x, y + 1.3, z, "gold"));
      });
      g.add(J.label(`<span class="lbl-k">◢ TOP 3 = ${D.customers.concentration}% OF REVENUE · MODERATE CONCENTRATION</span>`, 0, -7.5, 0, "tag"));
      return g;
    },
    update(t, dt, g, ctx) {
      ctx.core.material.opacity = 0.8 + Math.sin(t * 2) * 0.12;
      ctx.clusters.forEach((c) => (c.rotation.y += dt * c.userData.spin));
      g.rotation.y += dt * 0.03;
    },
  });

  /* =========================================================================
     8 · FUTURE FORECAST — time-travel tunnel + projected trajectory
     ========================================================================= */
  J.register("forecast", {
    camera: { pos: [0, 0, 13], look: [0, 0, -6] }, drift: 0.4,
    bloom: { strength: 1.0, radius: 0.85, threshold: 0.12 },
    build(ctx) {
      const g = new THREE.Group();
      // warp tunnel rings receding into -z
      const rings = [];
      for (let i = 0; i < 30; i++) {
        const r = J.ring(5 + Math.sin(i * 0.7) * 0.9, 270 - i * 2, 0.34, 0.02);
        r.position.z = -i * 2.8;
        r.userData.spin = (Math.random() - 0.5) * 0.6;
        g.add(r);
        rings.push(r);
      }
      ctx.rings = rings;

      // helical guide rails to make the tunnel read as a timeline corridor
      const rails = [];
      const railGroup = new THREE.Group();
      for (let lane = 0; lane < 3; lane++) {
        const pts = [];
        for (let i = 0; i < 120; i++) {
          const z = -i * 0.86;
          const a = i * 0.24 + lane * (TAU / 3);
          pts.push(new THREE.Vector3(Math.cos(a) * 3.2, Math.sin(a) * 2.2, z));
        }
        const rail = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: hsl(255 + lane * 12, 85, 58), transparent: true, opacity: 0.22 })
        );
        railGroup.add(rail);
        rails.push(rail);
      }
      g.add(railGroup);
      ctx.railGroup = railGroup;
      ctx.rails = rails;

      // warp streaks
      const N = 560, pos = new Float32Array(N * 3), spd = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const a = Math.random() * TAU, rr = 1.5 + Math.random() * 7;
        pos[i * 3] = Math.cos(a) * rr;
        pos[i * 3 + 1] = Math.sin(a) * rr;
        pos[i * 3 + 2] = -Math.random() * 92;
        spd[i] = 18 + Math.random() * 34;
      }
      const streaks = J.points(pos, { size: 0.13, hue: 280, opacity: 0.82 });
      streaks.userData = { spd, N };
      g.add(streaks);
      ctx.streaks = streaks;

      // projected trajectory graph (history -> projected) floating at tunnel end
      const graph = new THREE.Group();
      graph.position.set(0, -1.1, -15.5);
      g.add(graph);

      const f = D.forecast, all = f.history.concat(f.projected.slice(1));
      const max = Math.max.apply(null, all.concat([f.mrr.high]));
      const min = Math.min.apply(null, f.history);
      const xAt = (i, n) => -7.6 + (15.2 * i) / (n - 1);
      const toY = (v) => ((v - min) / (max - min)) * 6.2 + 0.15;

      // graph backdrop + frame
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 8.4),
        new THREE.MeshBasicMaterial({
          color: hsl(230, 70, 20),
          transparent: true,
          opacity: 0.09,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      panel.position.set(0, 3.2, -0.25);
      graph.add(panel);
      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(18, 8.4)),
        new THREE.LineBasicMaterial({ color: hsl(250, 90, 62), transparent: true, opacity: 0.35 })
      );
      frame.position.copy(panel.position);
      graph.add(frame);

      // grid lines
      const grid = new THREE.Group();
      for (let i = 0; i <= 6; i++) {
        const y = (6.4 * i) / 6;
        const hLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-8.3, y, 0), new THREE.Vector3(8.3, y, 0)]),
          new THREE.LineBasicMaterial({ color: hsl(235, 70, i % 2 ? 38 : 50), transparent: true, opacity: i % 2 ? 0.12 : 0.2 })
        );
        grid.add(hLine);
      }
      for (let i = 0; i <= 10; i++) {
        const x = -8.3 + (16.6 * i) / 10;
        const vLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, 6.4, 0)]),
          new THREE.LineBasicMaterial({ color: hsl(235, 70, 48), transparent: true, opacity: 0.1 })
        );
        grid.add(vLine);
      }
      graph.add(grid);
      ctx.grid = grid;

      const histPts = f.history.map((v, i) => new THREE.Vector3(xAt(i, all.length), toY(v), 0));
      const projPts = f.projected.map((v, i) => new THREE.Vector3(xAt(i + f.history.length - 1, all.length), toY(v), 0));

      // history fill area
      const histShape = [
        new THREE.Vector2(histPts[0].x, 0),
        ...histPts.map((p) => new THREE.Vector2(p.x, p.y)),
        new THREE.Vector2(histPts[histPts.length - 1].x, 0)
      ];
      const histMesh = new THREE.Mesh(
        new THREE.ShapeGeometry(new THREE.Shape(histShape)),
        new THREE.MeshBasicMaterial({
          color: hsl(205, 80, 56),
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      graph.add(histMesh);

      graph.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(histPts),
        new THREE.LineBasicMaterial({ color: hsl(205, 90, 66), transparent: true, opacity: 0.82 })
      ));

      const projLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(projPts),
        new THREE.LineDashedMaterial({ color: hsl(272, 95, 68), transparent: true, opacity: 0.96, dashSize: 0.33, gapSize: 0.17 })
      );
      projLine.computeLineDistances();
      graph.add(projLine);

      // confidence ribbon
      const upper = [], lower = [];
      projPts.forEach((p, i) => {
        const spread = 0.33 + i * 0.12;
        upper.push(new THREE.Vector2(p.x, p.y + spread));
        lower.push(new THREE.Vector2(p.x, p.y - spread));
      });
      const ribbonShape = new THREE.Shape(upper.concat(lower.reverse()));
      const bandMesh = new THREE.Mesh(
        new THREE.ShapeGeometry(ribbonShape),
        new THREE.MeshBasicMaterial({
          color: hsl(272, 90, 58),
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      graph.add(bandMesh);

      // whiskers for uncertainty spread per projected month
      const whiskers = [];
      const spreadBase = (f.mrr.high - f.mrr.low) / f.mrr.likely;
      f.projected.forEach((v, i) => {
        const p = projPts[i];
        const widen = (0.14 + i * 0.08) * spreadBase * v;
        const yLow = toY(v - widen);
        const yHigh = toY(v + widen * 0.9);
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p.x, yLow, 0), new THREE.Vector3(p.x, yHigh, 0)]),
          new THREE.LineBasicMaterial({ color: hsl(285, 88, 67), transparent: true, opacity: 0.34 })
        );
        graph.add(line);
        whiskers.push(line);
      });
      ctx.whiskers = whiskers;

      // markers
      const markers = [];
      histPts.forEach((p, i) => {
        const dot = J.glow(205, i === histPts.length - 1 ? 0.85 : 0.62, i === histPts.length - 1 ? 0.88 : 0.45, 66);
        dot.position.copy(p);
        graph.add(dot);
      });
      projPts.forEach((p, i) => {
        const dot = J.glow(272, i === projPts.length - 1 ? 1.35 : 0.96, 0.9, 72);
        const halo = J.ring(0.2 + i * 0.012, 272, 0.4, 0.009);
        halo.position.copy(p);
        halo.rotation.x = Math.PI / 2;
        dot.position.copy(p);
        graph.add(dot);
        graph.add(halo);
        markers.push({ dot, halo, base: i === projPts.length - 1 ? 1.35 : 0.96, phase: i * 0.65 });
      });
      ctx.markers = markers;

      // axis labels
      f.months.forEach((m, i) => {
        const p = projPts[i];
        graph.add(J.label(`<span class="lbl-k">${m}</span>`, p.x, -0.8, 0, ""));
      });
      for (let i = 0; i <= 4; i++) {
        const v = Math.round((min + ((max - min) * i) / 4) / 100) * 100;
        graph.add(J.label(`<span class="lbl-k" style="color:var(--ink-faint)">$${(v / 1000).toFixed(1)}K</span>`, -9.5, (6.4 * i) / 4, 0, ""));
      }

      // probability radar module
      const radar = new THREE.Group();
      radar.position.set(8.4, 4.2, -13.3);
      const rr1 = J.ring(1.15, 280, 0.32, 0.024); rr1.rotation.x = Math.PI / 2;
      const rr2 = J.ring(1.6, 275, 0.22, 0.018); rr2.rotation.y = Math.PI / 2.4;
      const blip = J.glow(280, 0.6, 0.9, 72); blip.position.set(0.8, 0.2, 0);
      radar.add(rr1, rr2, blip);
      g.add(radar);
      ctx.radar = { rr1, rr2, blip };

      // projected metric labels
      g.add(J.label(`<span class="lbl-k">FORECAST STACK · NEXT 6 MONTHS</span><span class="lbl-v" style="color:#c79bff">$16,050 LIKELY</span>`, 0, 5.7, -13.4, ""));
      g.add(J.label(J.kv("RANGE", "$14.1K – $18.2K"), -7.4, 3.3, -13.4, "tag"));
      g.add(J.label(J.kv("NEW CUSTOMERS", "+38"), 7.4, 3.3, -13.4, "tag"));
      g.add(J.label(J.kv("MEETINGS", "41"), -7.4, -4.5, -13.4, "tag"));
      g.add(J.label(J.kv("CONFIDENCE", "82%"), 7.4, -4.5, -13.4, "tag"));
      g.add(J.label(`<span class="lbl-k">SCENARIOS</span><span class="lbl-v" style="font-size:15px;color:#a7d8ff">LOW $14.1K · BASE $16.1K · HIGH $18.2K</span>`, 0, -6.7, -13.4, "tag"));
      ctx.graph = graph;
      return g;
    },
    update(t, dt, g, ctx) {
      ctx.rings.forEach((r, i) => {
        r.position.z += dt * 10.4;
        r.rotation.z += dt * (0.24 + r.userData.spin);
        if (r.position.z > 9) r.position.z -= 84;
        r.material.opacity = 0.09 + Math.max(0, 0.45 - Math.abs(r.position.z + 8) / 28) + Math.sin(t * 2 + i) * 0.02;
      });
      ctx.railGroup.rotation.z += dt * 0.08;
      ctx.railGroup.rotation.x = Math.sin(t * 0.35) * 0.06;
      ctx.rails.forEach((rail, i) => { rail.material.opacity = 0.14 + Math.sin(t * 1.7 + i * 0.9) * 0.07; });

      const a = ctx.streaks.geometry.attributes.position.array, u = ctx.streaks.userData;
      for (let i = 0; i < u.N; i++) {
        a[i * 3 + 2] += dt * u.spd[i];
        if (a[i * 3 + 2] > 10) a[i * 3 + 2] -= 102;
      }
      ctx.streaks.geometry.attributes.position.needsUpdate = true;
      ctx.graph.position.y = -1.1 + Math.sin(t * 0.9) * 0.18;
      ctx.graph.rotation.z = Math.sin(t * 0.4) * 0.015;
      ctx.whiskers.forEach((w, i) => { w.material.opacity = 0.2 + Math.sin(t * 2.4 + i) * 0.12; });
      ctx.markers.forEach((m, i) => {
        const pulse = 1 + Math.sin(t * 3 + m.phase) * 0.12;
        m.dot.scale.setScalar(m.base * pulse);
        m.dot.material.opacity = 0.64 + Math.sin(t * 2.2 + i) * 0.22;
        m.halo.rotation.z += dt * (0.7 + i * 0.1);
        m.halo.material.opacity = 0.22 + Math.sin(t * 1.8 + i) * 0.11;
      });
      ctx.radar.rr1.rotation.z += dt * 1.0;
      ctx.radar.rr2.rotation.z -= dt * 0.65;
      ctx.radar.blip.position.set(Math.cos(t * 1.6) * 0.88, Math.sin(t * 1.6) * 0.36, 0);
    },
  });

  /* =========================================================================
     9 · DAILY INTELLIGENCE FEED — holographic event cards + briefing
     ========================================================================= */
  J.register("feed", {
    camera: { pos: [0, 0, 16], look: [0, 0, 0] }, drift: 0.4,
    bloom: { strength: 0.8, radius: 0.6, threshold: 0.18 },
    build(ctx) {
      const g = new THREE.Group();
      const hubPos = new THREE.Vector3(-1.9, 0, 0);
      const hub = new THREE.Group();
      hub.position.copy(hubPos);
      const core = J.glow(195, 4.3, 0.84, 76);
      const ringA = J.ring(2.1, 195, 0.34, 0.024); ringA.rotation.x = Math.PI / 2;
      const ringB = J.ring(2.8, 205, 0.22, 0.018); ringB.rotation.y = Math.PI / 2.5;
      hub.add(core, ringA, ringB, J.wireSphere(1.15, 195, 0.45, 1));
      g.add(hub);
      g.add(J.label(`<span class="lbl-k">INTELLIGENCE CORE</span><span class="lbl-v">LIVE BRIEF</span>`, -1.9, -3.1, 0, "tag"));
      ctx.hub = { core, ringA, ringB };

      // executive briefing
      const highlights = D.feed.slice(0, 3).map((ev) =>
        `<div style="display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--line-soft);padding-top:6px;margin-top:6px;">
          <span style="font-size:8px;letter-spacing:2px;color:var(--ink-soft)">${ev.cat}</span>
          <span style="font-size:9px;color:#dff1ff">${ev.sub}</span>
        </div>`).join("");
      const brief = document.createElement("div");
      brief.className = "lbl"; brief.style.opacity = "0"; brief.style.whiteSpace = "normal";
      brief.innerHTML = `<div style="width:390px;text-align:left;border:1px solid var(--line);background:hsla(var(--hue),60%,8%,.62);backdrop-filter:blur(5px);padding:14px 16px;">
        <div style="font-size:8px;letter-spacing:3px;color:var(--accent);margin-bottom:6px;">◢ EXECUTIVE BRIEFING · TODAY</div>
        <div style="font-size:12px;line-height:1.55;color:#dff1ff;white-space:normal;overflow-wrap:anywhere;word-break:break-word;">${D.briefing}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px;">
          <span style="border:1px solid var(--line);padding:3px 6px;font-size:8px;letter-spacing:1px;">GOOD ${D.feed.filter((e) => e.tone === "good").length}</span>
          <span style="border:1px solid var(--line);padding:3px 6px;font-size:8px;letter-spacing:1px;">WARN ${D.feed.filter((e) => e.tone === "warn").length}</span>
          <span style="border:1px solid var(--line);padding:3px 6px;font-size:8px;letter-spacing:1px;">SYSTEM ${D.feed.filter((e) => e.tone === "ok").length}</span>
        </div>
        ${highlights}
      </div>`;
      const bo = new THREE.CSS2DObject(brief); bo.position.set(-7.1, 0.15, 0); g.add(bo);

      // timeline spine + event cards
      const spine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(4.6, -5.6, -1), new THREE.Vector3(4.6, 5.6, 1)]),
        new THREE.LineBasicMaterial({ color: hsl(195, 80, 60), transparent: true, opacity: 0.24 })
      );
      g.add(spine);

      const cards = [], pulses = [], nodes = [];
      D.feed.forEach((ev, i) => {
        const col = ev.tone === "good" ? "#7df0b6" : ev.tone === "warn" ? "#ffd27a" : "#9fd4ff";
        const hue = ev.tone === "good" ? 150 : ev.tone === "warn" ? 42 : 205;
        const icon = ev.tone === "good" ? "▲" : ev.tone === "warn" ? "⚠" : "●";
        const el = document.createElement("div");
        el.className = "lbl";
        el.style.opacity = "0";
        el.style.whiteSpace = "normal";
        el.innerHTML = `<div style="width:300px;text-align:left;border-left:2px solid ${col};background:hsla(var(--hue),50%,9%,.56);padding:8px 11px;backdrop-filter:blur(4px);">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <div style="font-size:7.5px;letter-spacing:2px;color:${col};">${icon} ${ev.cat}</div>
            <div style="font-size:7px;letter-spacing:1px;color:var(--ink-faint);">${ev.tone.toUpperCase()}</div>
          </div>
          <div style="font-size:11px;color:#dff1ff;line-height:1.3;margin-top:3px;white-space:normal;overflow-wrap:anywhere;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${ev.text}</div>
          <div style="font-size:8.5px;color:var(--ink-faint);margin-top:3px;white-space:normal;overflow-wrap:anywhere;word-break:break-word;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;">${ev.sub}</div>
        </div>`;
        const o = new THREE.CSS2DObject(el);
        const row = i - (D.feed.length - 1) / 2;
        const y = -row * 1.55, z = row * 0.55;
        o.position.set(7.2, y, z); g.add(o);
        cards.push({ obj: o, el, baseY: y, baseZ: z, phase: Math.random() * TAU });

        const node = J.glow(hue, 0.85, 0.88, 68);
        node.position.set(4.6, y, z * 0.4);
        g.add(node);
        nodes.push(node);
        const tether = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([node.position.clone(), new THREE.Vector3(6.25, y, z)]),
          new THREE.LineBasicMaterial({ color: hsl(hue, 90, 62), transparent: true, opacity: 0.26 })
        );
        g.add(tether);

        const pulse = J.glow(hue, 0.72, 0.88, 68); g.add(pulse);
        pulses.push({ sp: pulse, a: node.position.clone(), b: hubPos.clone(), p: Math.random(), speed: 0.32 + Math.random() * 0.28 });
      });
      ctx.cards = cards;
      ctx.pulses = pulses;
      ctx.nodes = nodes;

      // stream particles flowing toward briefing core
      const N = 240, pos = new Float32Array(N * 3), prog = new Float32Array(N);
      const laneY = new Float32Array(N), laneZ = new Float32Array(N), speed = new Float32Array(N), phase = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        prog[i] = Math.random();
        laneY[i] = (Math.random() - 0.5) * 9;
        laneZ[i] = (Math.random() - 0.5) * 3;
        speed[i] = 0.22 + Math.random() * 0.26;
        phase[i] = Math.random() * TAU;
        pos[i * 3] = 7 - prog[i] * 8.9;
        pos[i * 3 + 1] = laneY[i] * (1 - prog[i] * 0.75);
        pos[i * 3 + 2] = laneZ[i] * (1 - prog[i]);
      }
      const pts = J.points(pos, { size: 0.1, hue: 195, opacity: 0.74 });
      pts.userData = { prog, laneY, laneZ, speed, phase, N };
      g.add(pts);
      ctx.pts = pts;

      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(4.8, 12.4),
        new THREE.MeshBasicMaterial({
          color: hsl(205, 70, 22),
          transparent: true,
          opacity: 0.08,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      wall.position.set(6.1, 0, -1.1);
      g.add(wall);

      const sweep = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 12.4),
        new THREE.MeshBasicMaterial({
          color: hsl(195, 90, 62),
          transparent: true,
          opacity: 0.09,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      sweep.position.set(5.9, 0, 0.3);
      g.add(sweep);
      ctx.sweep = sweep;

      g.add(J.glow(195, 6.2, 0.52, 72).translateX(-1.9));
      return g;
    },
    update(t, dt, g, ctx) {
      const a = ctx.pts.geometry.attributes.position.array, u = ctx.pts.userData;
      for (let i = 0; i < u.N; i++) {
        u.prog[i] += dt * u.speed[i];
        if (u.prog[i] > 1) {
          u.prog[i] = 0;
          u.laneY[i] = (Math.random() - 0.5) * 9;
          u.laneZ[i] = (Math.random() - 0.5) * 3;
        }
        const p = u.prog[i];
        a[i * 3] = 7 - p * 8.9;
        a[i * 3 + 1] = u.laneY[i] * (1 - p * 0.75) + Math.sin(p * 9 + u.phase[i] + t * 0.7) * 0.25;
        a[i * 3 + 2] = u.laneZ[i] * (1 - p) + Math.cos(p * 8 + u.phase[i]) * 0.08;
      }
      ctx.pts.geometry.attributes.position.needsUpdate = true;
      ctx.cards.forEach((c, i) => {
        c.obj.position.y = c.baseY + Math.sin(t * 1.6 + c.phase) * 0.13;
        c.obj.position.z = c.baseZ + Math.cos(t * 1.2 + c.phase) * 0.07;
        c.el.style.opacity = String(0.76 + Math.sin(t * 2 + i) * 0.2);
      });
      ctx.nodes.forEach((n, i) => {
        n.material.opacity = 0.62 + Math.sin(t * 2.7 + i) * 0.24;
        const s = 1 + Math.sin(t * 2.1 + i) * 0.09;
        n.scale.set(s, s, 1);
      });
      ctx.pulses.forEach((pu) => {
        pu.p += dt * pu.speed;
        if (pu.p > 1) pu.p -= 1;
        pu.sp.position.lerpVectors(pu.a, pu.b, pu.p);
        pu.sp.position.y += Math.sin(pu.p * Math.PI) * 0.9;
        pu.sp.material.opacity = Math.sin(pu.p * Math.PI) * 0.9;
      });
      ctx.hub.core.material.opacity = 0.66 + Math.sin(t * 2.3) * 0.2;
      ctx.hub.ringA.rotation.z += dt * 0.65;
      ctx.hub.ringB.rotation.z -= dt * 0.42;
      ctx.sweep.position.x = 5.9 + Math.sin(t * 1.25) * 0.55;
      ctx.sweep.material.opacity = 0.05 + Math.sin(t * 2.1) * 0.03;
    },
  });

  /* =========================================================================
     10 · FACILITY19 DIGITAL UNIVERSE  (showstopper)
     Central core; 8 orbiting domain planets; data pulses; deep starfield.
     ========================================================================= */
  J.register("facility19", {
    camera: { pos: [0, 9, 33], look: [0, 0, 0] }, drift: 1.1,
    bloom: { strength: 1.25, radius: 0.95, threshold: 0.08 },
    build(ctx) {
      const g = new THREE.Group();
      // deep starfield
      const SN = 1400, sp = new Float32Array(SN * 3);
      for (let i = 0; i < SN; i++) { const r = 40 + Math.random() * 120, a = Math.random() * TAU, b = Math.acos(Math.random() * 2 - 1); sp[i * 3] = r * Math.sin(b) * Math.cos(a); sp[i * 3 + 1] = r * Math.cos(b); sp[i * 3 + 2] = r * Math.sin(b) * Math.sin(a); }
      g.add(J.points(sp, { size: 0.45, hue: 210, opacity: 0.55 }));

      // central core (Facility19)
      const core = J.glow(205, 11, 0.95, 82); g.add(core); ctx.core = core;
      const cs1 = J.wireSphere(3.2, 205, 0.4, 2), cs2 = J.wireSphere(3.9, 200, 0.22, 3);
      g.add(cs1, cs2); ctx.cs = [cs1, cs2];
      g.add(J.glow(205, 5, 0.9, 72));
      g.add(J.label(`<span class="lbl-k">FACILITY19 · LIVE</span><span class="lbl-v" style="font-size:26px">$13,200 MRR</span>`, 0, -5.2, 0, "tag"));

      // domain planets
      const domains = [
        { n: "REVENUE", m: "44%", hue: 205, r: 11, inc: 0.1, speed: 0.18, sz: 1.4 },
        { n: "GROWTH", m: "29 MTG", hue: 150, r: 13, inc: 0.5, speed: -0.14, sz: 1.2 },
        { n: "CUSTOMERS", m: "322", hue: 195, r: 15.5, inc: -0.3, speed: 0.12, sz: 1.5 },
        { n: "FORECAST", m: "$16K", hue: 270, r: 18, inc: 0.7, speed: -0.1, sz: 1.2 },
        { n: "AGENTS", m: "8", hue: 45, r: 9.5, inc: -0.6, speed: 0.22, sz: 1.3 },
        { n: "HEALTH", m: "86", hue: 165, r: 20.5, inc: 0.2, speed: -0.09, sz: 1.1 },
        { n: "ATTRIBUTION", m: "5 CH", hue: 150, r: 16.8, inc: 1.0, speed: 0.11, sz: 1.0 },
        { n: "LEAKAGE", m: "-$8.4K", hue: 8, r: 22.5, inc: -0.9, speed: -0.08, sz: 1.0 },
      ];
      const planets = [], pulses = [];
      domains.forEach((d, i) => {
        // orbit ring
        const orbit = J.ring(d.r, d.hue, 0.16, 0.012); orbit.rotation.x = Math.PI / 2 + d.inc; g.add(orbit);
        // planet group
        const pg = new THREE.Group();
        const planet = J.glow(d.hue, d.sz * 2.4, 0.92, 64); pg.add(planet);
        pg.add(J.wireSphere(d.sz, d.hue, 0.55, 1));
        pg.add(J.label(`<span class="lbl-k"${d.n === "LEAKAGE" ? ' style="color:#ff9a92"' : ""}>${d.n}</span><span class="lbl-v"${d.n === "AGENTS" ? ' style="color:#ffce5c"' : d.n === "LEAKAGE" ? ' style="color:#ff8a82"' : ""}>${d.m}</span>`, 0, d.sz + 1.4, 0, d.n === "AGENTS" ? "gold" : d.n === "LEAKAGE" ? "danger" : ""));
        g.add(pg);
        planets.push({ pg, r: d.r, inc: d.inc, speed: d.speed, ang: (i / domains.length) * TAU });
        // data pulse core->planet
        const sppt = J.glow(d.hue, 0.9, 0.9, 70); g.add(sppt);
        pulses.push({ sp: sppt, planet: pg, p: Math.random(), speed: 0.3 + Math.random() * 0.3 });
      });
      ctx.planets = planets; ctx.pulses = pulses;
      return g;
    },
    update(t, dt, g, ctx) {
      ctx.core.material.opacity = 0.82 + Math.sin(t * 1.8) * 0.12;
      ctx.core.scale.setScalar(11 * (1 + Math.sin(t * 1.8) * 0.03));
      ctx.cs[0].rotation.y += dt * 0.1; ctx.cs[1].rotation.y -= dt * 0.07; ctx.cs[1].rotation.x += dt * 0.04;
      ctx.planets.forEach((p) => {
        p.ang += dt * p.speed;
        const x = Math.cos(p.ang) * p.r, z = Math.sin(p.ang) * p.r, y = Math.sin(p.ang) * Math.sin(p.inc) * p.r * 0.5;
        p.pg.position.set(x, y, z); p.pg.rotation.y += dt * 0.5;
      });
      ctx.pulses.forEach((pu) => { pu.p += dt * pu.speed; if (pu.p > 1) pu.p -= 1; pu.sp.position.copy(pu.planet.position).multiplyScalar(pu.p); pu.sp.material.opacity = Math.sin(pu.p * Math.PI) * 0.85; });
      g.rotation.y += dt * 0.025;
    },
  });
})();
