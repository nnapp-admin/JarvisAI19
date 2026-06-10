/* ============================================================================
   engine.js — WebGL core, post-processing bloom, camera rig, CSS2D labels,
   shared scene helpers, scene registry + cinematic transition manager,
   and the idle "home" Jarvis core.
   Exposes window.JV.
   ============================================================================ */
(function () {
  const JV = (window.JV = {
    scenes: {},
    current: null,
    transitioning: false,
    driftAmt: 1,
    _labels: [],
  });

  // ---- renderer / scene / camera -----------------------------------------
  const stage = document.getElementById("stage");
  const W = () => window.innerWidth, H = () => window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.setClearColor(0x00040c, 1);
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x00040c, 0.012);

  const camera = new THREE.PerspectiveCamera(55, W() / H(), 0.1, 2000);

  // CSS2D label renderer
  const css2d = new THREE.CSS2DRenderer();
  css2d.setSize(W(), H());
  css2d.domElement.className = "css2d-layer";
  css2d.domElement.style.position = "absolute";
  css2d.domElement.style.top = "0";
  css2d.domElement.style.left = "0";
  stage.appendChild(css2d.domElement);

  // ambient + key lights (subtle; most things are emissive/basic)
  scene.add(new THREE.AmbientLight(0x335577, 0.6));
  const key = new THREE.PointLight(0x66bbff, 1.1, 400);
  key.position.set(40, 60, 60); scene.add(key);

  // ---- post-processing ----------------------------------------------------
  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(W(), H()), 0.9, 0.7, 0.18);
  composer.addPass(bloom);
  JV.bloom = bloom;

  // sceneRoot holds the active command scene (separate from persistent lights)
  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  JV.scene = scene; JV.camera = camera; JV.renderer = renderer;
  JV.composer = composer; JV.css2d = css2d; JV.sceneRoot = sceneRoot;

  // ---- camera rig (base pose tweened by gsap; drift added per-frame) ------
  JV.cam = { px: 0, py: 0, pz: 17, lx: 0, ly: 0, lz: 0 };
  const pointer = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / W()) * 2 - 1;
    pointer.y = (e.clientY / H()) * 2 - 1;
  });

  // =========================================================================
  //  SHARED HELPERS
  // =========================================================================
  const hsl = (JV.hsl = (h, s = 100, l = 60) =>
    new THREE.Color().setHSL((h % 360) / 360, s / 100, l / 100));

  // soft radial dot texture (cached)
  let _dot;
  function dotTexture() {
    if (_dot) return _dot;
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d");
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, "rgba(255,255,255,1)");
    rg.addColorStop(0.25, "rgba(255,255,255,.9)");
    rg.addColorStop(0.55, "rgba(255,255,255,.25)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    _dot = new THREE.CanvasTexture(c); return _dot;
  }
  // soft glow sprite texture (cached)
  let _glow;
  function glowTexture() {
    if (_glow) return _glow;
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, "rgba(255,255,255,.95)");
    rg.addColorStop(0.2, "rgba(255,255,255,.55)");
    rg.addColorStop(0.5, "rgba(255,255,255,.15)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    _glow = new THREE.CanvasTexture(c); return _glow;
  }
  JV.dotTexture = dotTexture; JV.glowTexture = glowTexture;

  // glow sprite
  JV.glow = function (hue, size, opacity, light) {
    const m = new THREE.SpriteMaterial({
      map: glowTexture(), color: hsl(hue, 90, light || 62),
      transparent: true, opacity: opacity == null ? 0.9 : opacity,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const s = new THREE.Sprite(m); s.scale.set(size, size, 1); return s;
  };

  // generic point cloud
  JV.points = function (positions, opts) {
    opts = opts || {};
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    if (opts.colors) geo.setAttribute("color", new THREE.BufferAttribute(opts.colors, 3));
    const mat = new THREE.PointsMaterial({
      size: opts.size || 0.6, map: dotTexture(),
      transparent: true, opacity: opts.opacity == null ? 0.9 : opts.opacity,
      blending: THREE.AdditiveBlending, depthWrite: false,
      vertexColors: !!opts.colors,
      color: opts.colors ? 0xffffff : hsl(opts.hue == null ? 205 : opts.hue, 90, 65),
      sizeAttenuation: opts.sizeAttenuation !== false,
    });
    return new THREE.Points(geo, mat);
  };

  // a ring of dots / torus
  JV.ring = function (radius, hue, opacity, tube) {
    const geo = new THREE.TorusGeometry(radius, tube || 0.02, 8, 120);
    const mat = new THREE.MeshBasicMaterial({
      color: hsl(hue, 90, 60), transparent: true,
      opacity: opacity == null ? 0.5 : opacity, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    return new THREE.Mesh(geo, mat);
  };

  // wire sphere
  JV.wireSphere = function (radius, hue, opacity, detail) {
    const geo = new THREE.IcosahedronGeometry(radius, detail == null ? 2 : detail);
    const mat = new THREE.MeshBasicMaterial({
      color: hsl(hue, 90, 62), wireframe: true, transparent: true,
      opacity: opacity == null ? 0.35 : opacity, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    return new THREE.Mesh(geo, mat);
  };

  // CSS2D label. cls extra classes. Returns the CSS2DObject (object.element to animate)
  JV.label = function (html, x, y, z, cls) {
    const el = document.createElement("div");
    el.className = "lbl " + (cls || "");
    el.innerHTML = html;
    const obj = new THREE.CSS2DObject(el);
    obj.position.set(x, y, z);
    el.style.opacity = "0";
    return obj;
  };
  JV.kv = (k, v) => `<span class="lbl-k">${k}</span><span class="lbl-v">${v}</span>`;

  // fade all labels under a group in/out
  JV.fadeLabels = function (group, to, dur, delay) {
    const els = [];
    group.traverse((o) => { if (o.isCSS2DObject) els.push(o.element); });
    els.forEach((el, i) =>
      gsap.to(el, { opacity: to, duration: dur || 0.6, delay: (delay || 0) + i * 0.04, ease: "power2.out" }));
  };

  // dispose a group's geometries/materials
  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { if (m.map && m.map !== _dot && m.map !== _glow) m.map.dispose(); m.dispose(); });
      }
    });
  }

  // =========================================================================
  //  SCENE REGISTRY + TRANSITIONS
  // =========================================================================
  JV.register = function (key, def) { JV.scenes[key] = def; };

  // move camera + theme; build/teardown scene groups with a cinematic beat
  JV._pendingGo = null;
  JV._bridges = [];

  // ---- cinematic particle bridge -----------------------------------------
  // A burst of light that erupts at the core as one scene dissolves and the
  // next materializes — the "particle bridge" between destinations.
  function spawnBridge(hue) {
    const N = 280;
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N * 4); // dirx, diry, dirz, speed
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1);
      const dx = Math.sin(b) * Math.cos(a), dy = Math.cos(b), dz = Math.sin(b) * Math.sin(a);
      const r = 0.6 + Math.random() * 1.6;
      pos[i * 3] = dx * r; pos[i * 3 + 1] = dy * r; pos[i * 3 + 2] = dz * r;
      seed[i * 4] = dx; seed[i * 4 + 1] = dy; seed[i * 4 + 2] = dz; seed[i * 4 + 3] = 7 + Math.random() * 12;
    }
    const pts = JV.points(pos, { size: 0.2, hue: hue == null ? 205 : hue, opacity: 0 });
    pts.userData._bridge = { seed, N };
    sceneRoot.add(pts);
    JV._bridges.push(pts);
    gsap.to(pts.material, {
      opacity: 0.95, duration: 0.45, ease: "power2.out",
      onComplete() { gsap.to(pts.material, { opacity: 0, duration: 1.4, ease: "power2.in" }); },
    });
    setTimeout(() => {
      const idx = JV._bridges.indexOf(pts);
      if (idx >= 0) JV._bridges.splice(idx, 1);
      sceneRoot.remove(pts); disposeGroup(pts);
    }, 2100);
  }
  JV.spawnBridge = spawnBridge;

  JV.go = function (key, opts) {
    opts = opts || {};
    const def = JV.scenes[key];
    if (!def) { if (opts.onArrive) { try { opts.onArrive(); } catch (e) {} } return; }

    if (JV.transitioning) {
      JV._pendingGo = { key: key, opts: opts };
      return;
    }
    JV.transitioning = true;
    JV.driftAmt = 0.25; // settle drift during move

    const prev = JV.current;
    const cinematic = !!opts.cinematic && !!prev;

    const buildNext = () => {
      const ctx = {};
      const group = def.build(ctx);
      group.userData._def = def;
      group.scale.setScalar(0.82);
      sceneRoot.add(group);
      JV.current = { key, def, group, ctx };

      // intro: scale to 1 + custom enter
      gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: cinematic ? 1.5 : 1.3, ease: "power3.out" });
      if (def.enter) def.enter(group, ctx);

      // camera flight (flythrough to destination)
      const c = def.camera || { pos: [0, 0, 17], look: [0, 0, 0] };
      gsap.to(JV.cam, {
        px: c.pos[0], py: c.pos[1], pz: c.pos[2],
        lx: c.look[0], ly: c.look[1], lz: c.look[2],
        duration: cinematic ? 2.0 : 1.7, ease: "power3.inOut",
        onComplete: () => {
          JV.transitioning = false;
          JV.driftAmt = def.drift == null ? 1 : def.drift;
          // destination has fully materialized — narration may now begin
          if (opts.onArrive) { try { opts.onArrive(); } catch (e) {} }
          if (JV._pendingGo) {
            var p = JV._pendingGo;
            JV._pendingGo = null;
            setTimeout(function() { JV.go(p.key, p.opts); }, 50);
          }
        },
      });
      // bloom tuning per scene
      if (def.bloom) gsap.to(bloom, { strength: def.bloom.strength, radius: def.bloom.radius, threshold: def.bloom.threshold, duration: 1.4 });

      // labels appear once the camera nears rest
      JV.fadeLabels(group, 1, 0.6, cinematic ? 1.1 : 0.9);
    };

    const dissolvePrev = (after) => {
      JV.fadeLabels(prev.group, 0, 0.35, 0);
      gsap.to(prev.group.scale, { x: 0.7, y: 0.7, z: 0.7, duration: 0.6, ease: "power2.in" });
      gsap.to(prev.group.rotation, { y: prev.group.rotation.y + 0.5, duration: 0.6, ease: "power2.in" });
      // fade meshes
      prev.group.traverse((o) => {
        if (o.material && o.material.opacity != null) {
          o.userData._o = o.material.opacity;
          gsap.to(o.material, { opacity: 0, duration: 0.5, ease: "power2.in" });
        }
      });
      setTimeout(() => { sceneRoot.remove(prev.group); disposeGroup(prev.group); after(); }, cinematic ? 680 : 560);
    };

    if (prev) {
      if (cinematic) {
        // 1) camera pullback  2) particle bridge  3) environment dissolve
        // 4) camera flythrough into the materializing destination
        spawnBridge(205);
        gsap.to(JV.cam, {
          pz: JV.cam.pz + 7, duration: 0.6, ease: "power2.inOut",
          onComplete: () => dissolvePrev(buildNext),
        });
      } else {
        dissolvePrev(buildNext);
      }
    } else {
      buildNext();
    }
  };

  // =========================================================================
  //  HOME — idle Jarvis core
  // =========================================================================
  JV.register("home", {
    camera: { pos: [0, 0, 17], look: [0, 0, 0] },
    drift: 1,
    bloom: { strength: 1.0, radius: 0.75, threshold: 0.15 },
    build() {
      const g = new THREE.Group();

      // core glow
      const core = JV.glow(205, 9, 0.95, 80); g.add(core);
      const core2 = JV.glow(205, 5, 0.9, 70); g.add(core2);
      g.userData.core = core; g.userData.core2 = core2;

      // nested wire shells
      const s1 = JV.wireSphere(3.0, 205, 0.4, 1);
      const s2 = JV.wireSphere(3.6, 200, 0.22, 2);
      const s3 = JV.wireSphere(2.4, 210, 0.5, 1);
      g.add(s1, s2, s3); g.userData.shells = [s1, s2, s3];

      // gyro rings
      const r1 = JV.ring(4.6, 200, 0.55, 0.025);
      const r2 = JV.ring(5.2, 210, 0.4, 0.02); r2.rotation.x = Math.PI / 2.2;
      const r3 = JV.ring(4.0, 195, 0.5, 0.02); r3.rotation.y = Math.PI / 3;
      g.add(r1, r2, r3); g.userData.rings = [r1, r2, r3];

      // particle shell
      const N = 1400, pos = new Float32Array(N * 3), rad = new Float32Array(N), ang = new Float32Array(N), sp = new Float32Array(N), ph = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const r = 4 + Math.random() * 4.5, a = Math.random() * Math.PI * 2, y = (Math.random() - 0.5) * 9;
        rad[i] = r; ang[i] = a; sp[i] = (Math.random() * 0.4 + 0.1) * (Math.random() < 0.5 ? 1 : -1); ph[i] = Math.random() * Math.PI * 2;
        pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(a) * r;
      }
      const pts = JV.points(pos, { size: 0.09, hue: 205, opacity: 0.8 });
      pts.userData = { rad, ang, sp, ph, N };
      g.add(pts); g.userData.pts = pts;

      // far starfield (persistent feel)
      const SN = 800, sp2 = new Float32Array(SN * 3);
      for (let i = 0; i < SN; i++) {
        const r = 60 + Math.random() * 120, a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1);
        sp2[i * 3] = r * Math.sin(b) * Math.cos(a); sp2[i * 3 + 1] = r * Math.cos(b); sp2[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
      }
      const stars = JV.points(sp2, { size: 0.5, hue: 205, opacity: 0.5, sizeAttenuation: true });
      g.add(stars);

      g.add(JV.label(JV.kv("J.A.R.V.I.S", "STANDBY"), 0, -6.2, 0, "tag"));
      return g;
    },
    update(t, dt, g) {
      const u = g.userData;
      u.shells[0].rotation.y += dt * 0.18; u.shells[0].rotation.x += dt * 0.05;
      u.shells[1].rotation.y -= dt * 0.12; u.shells[1].rotation.z += dt * 0.04;
      u.shells[2].rotation.x += dt * 0.22; u.shells[2].rotation.y -= dt * 0.1;
      u.rings[0].rotation.z += dt * 0.3; u.rings[1].rotation.z -= dt * 0.18; u.rings[2].rotation.z += dt * 0.24;
      const pulse = 0.85 + Math.sin(t * 1.6) * 0.15;
      u.core.scale.setScalar(9 * pulse); u.core2.scale.setScalar(5 * (1.9 - pulse));
      const p = u.pts, a = p.geometry.attributes.position.array, d = p.userData;
      for (let i = 0; i < d.N; i++) {
        d.ang[i] += d.sp[i] * dt * 0.3;
        const r = d.rad[i] + Math.sin(t * 1.2 + d.ph[i]) * 0.4;
        a[i * 3] = Math.cos(d.ang[i]) * r; a[i * 3 + 2] = Math.sin(d.ang[i]) * r;
      }
      p.geometry.attributes.position.needsUpdate = true;
      g.rotation.y += dt * 0.02;
    },
  });

  // =========================================================================
  //  RENDER LOOP
  // =========================================================================
  const clock = new THREE.Clock();
  let driftT = 0;
  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    driftT += dt;

    if (JV.current && JV.current.def.update) {
      try { JV.current.def.update(t, dt, JV.current.group, JV.current.ctx); } catch (e) {}
    }

    // cinematic transition bridge particles
    for (let bi = 0; bi < JV._bridges.length; bi++) {
      const b = JV._bridges[bi], u = b.userData._bridge;
      const a = b.geometry.attributes.position.array, s = u.seed;
      for (let k = 0; k < u.N; k++) {
        const sp = s[k * 4 + 3];
        a[k * 3] += s[k * 4] * sp * dt;
        a[k * 3 + 1] += s[k * 4 + 1] * sp * dt;
        a[k * 3 + 2] += s[k * 4 + 2] * sp * dt;
      }
      b.geometry.attributes.position.needsUpdate = true;
      b.rotation.y += dt * 0.5;
    }

    // camera: base pose + idle drift + pointer parallax
    const da = JV.driftAmt;
    const dx = Math.sin(driftT * 0.25) * 0.6 * da + pointer.x * 0.9 * da;
    const dy = Math.cos(driftT * 0.2) * 0.4 * da - pointer.y * 0.7 * da;
    camera.position.set(JV.cam.px + dx, JV.cam.py + dy, JV.cam.pz);
    camera.lookAt(JV.cam.lx, JV.cam.ly, JV.cam.lz);

    composer.render();
    css2d.render(scene, camera);
  }
  tick();

  // ---- resize -------------------------------------------------------------
  window.addEventListener("resize", () => {
    camera.aspect = W() / H(); camera.updateProjectionMatrix();
    renderer.setSize(W(), H()); composer.setSize(W(), H()); css2d.setSize(W(), H());
    bloom.resolution.set(W(), H());
  });
})();
