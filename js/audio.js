/* ============================================================================
   audio.js — fully synthesized sci-fi sound engine (Web Audio API).
   No audio files, no network. Ambient drone bed + reactive UI/scene sounds.
   Exposes window.JVA. Audio starts on first user gesture (browser policy).
   ============================================================================ */
(function () {
  let ctx = null, master = null, droneGain = null, sfxGain = null;
  let started = false, enabled = true;
  const drones = [];           // active ambient oscillators
  let droneHue = 205;          // current pad "key" (shifts per scene)
  let convolver = null;

  // ---- lazy init on first gesture ---------------------------------------
  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.0; master.connect(ctx.destination);
    // gentle master fade-in
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 2.5);

    droneGain = ctx.createGain(); droneGain.gain.value = 0.0; droneGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);

    // simple algorithmic reverb (noise impulse) for "command center" space
    convolver = ctx.createConvolver();
    const len = ctx.sampleRate * 2.4, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    convolver.buffer = buf;
    const revGain = ctx.createGain(); revGain.gain.value = 0.32;
    convolver.connect(revGain); revGain.connect(master);
    sfxGain.connect(convolver);

    return ctx;
  }

  // hz from a hue so each scene sits in a different tonal "key"
  function rootFor(hue) {
    // map hue 0..360 to a pentatonic-ish root between ~98 and ~165 Hz
    const notes = [98.0, 110.0, 130.8, 146.8, 164.8, 87.3]; // G2 A2 C3 D3 E3 F2
    return notes[Math.floor((hue / 360) * notes.length) % notes.length];
  }

  // ---- ambient drone bed -------------------------------------------------
  function buildDrone(hue) {
    const root = rootFor(hue);
    const partials = [
      { f: root, type: "sine", g: 0.5, det: 0 },
      { f: root * 1.5, type: "sine", g: 0.22, det: 4 },      // fifth
      { f: root * 2, type: "triangle", g: 0.16, det: -3 },   // octave
      { f: root * 3.01, type: "sine", g: 0.08, det: 7 },     // shimmer
    ];
    partials.forEach((p) => {
      const osc = ctx.createOscillator(); osc.type = p.type; osc.frequency.value = p.f; osc.detune.value = p.det;
      const g = ctx.createGain(); g.gain.value = p.g;
      // slow LFO on gain for breathing
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + Math.random() * 0.08;
      const lfoG = ctx.createGain(); lfoG.gain.value = p.g * 0.4;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      // lowpass to keep it warm
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = 0.6;
      osc.connect(g); g.connect(lp); lp.connect(droneGain);
      osc.start(); lfo.start();
      drones.push({ osc, g, lfo, lp, base: p.f, det: p.det });
    });
    // faint high "air" noise
    const noise = ctx.createBufferSource();
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * 0.5;
    noise.buffer = nb; noise.loop = true;
    const ng = ctx.createGain(); ng.gain.value = 0.012;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 6000; bp.Q.value = 0.7;
    noise.connect(bp); bp.connect(ng); ng.connect(droneGain); noise.start();
    drones.push({ osc: noise, g: ng, special: true });
  }

  function start() {
    if (started) return; started = true;
    ensure(); buildDrone(droneHue);
    droneGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    droneGain.gain.exponentialRampToValueAtTime(enabled ? 0.5 : 0.0001, ctx.currentTime + 3);
  }

  // shift drone "key" smoothly when scene changes
  function setSceneHue(hue) {
    droneHue = hue;
    if (!ctx || !started) return;
    const root = rootFor(hue);
    const mult = [1, 1.5, 2, 3.01];
    let i = 0;
    drones.forEach((d) => {
      if (d.special) return;
      const f = root * (mult[i] || 1); i++;
      d.osc.frequency.cancelScheduledValues(ctx.currentTime);
      d.osc.frequency.setTargetAtTime(f, ctx.currentTime, 0.8);
    });
  }

  // ---- low-level tone helper --------------------------------------------
  function tone(freq, dur, opts) {
    if (!ctx || !enabled) return;
    opts = opts || {};
    const t0 = ctx.currentTime + (opts.delay || 0);
    const osc = ctx.createOscillator(); osc.type = opts.type || "sine"; osc.frequency.value = freq;
    if (opts.to) { osc.frequency.setValueAtTime(freq, t0); osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur); }
    const g = ctx.createGain();
    const peak = opts.gain == null ? 0.3 : opts.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.atk || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc;
    if (opts.filter) { const f = ctx.createBiquadFilter(); f.type = opts.filter; f.frequency.value = opts.cutoff || 1200; osc.connect(f); node = f; }
    node.connect(g); g.connect(sfxGain);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  // ---- named SFX ---------------------------------------------------------
  const SFX = {
    // soft UI hover/tick
    tick() { tone(2200, 0.05, { type: "square", gain: 0.04, filter: "lowpass", cutoff: 3000 }); },
    // command engaged — rising confirm
    engage(hue) {
      const r = rootFor(hue || droneHue) * 2;
      tone(r, 0.5, { type: "sawtooth", to: r * 2, gain: 0.18, filter: "lowpass", cutoff: 2600, atk: 0.02 });
      tone(r * 1.5, 0.6, { type: "sine", to: r * 3, gain: 0.12, delay: 0.04 });
      tone(r * 3, 0.4, { type: "triangle", gain: 0.08, delay: 0.08 });
    },
    // jarvis "thinking" sweep before narration
    process() {
      tone(420, 0.7, { type: "sine", to: 880, gain: 0.07, filter: "bandpass", cutoff: 1400 });
      tone(620, 0.7, { type: "sine", to: 1240, gain: 0.05, delay: 0.05 });
    },
    // notification chime — bright two-note
    chime() {
      tone(1318, 0.5, { type: "sine", gain: 0.16, atk: 0.005 });
      tone(1760, 0.7, { type: "sine", gain: 0.13, delay: 0.12, atk: 0.005 });
    },
    // alert — urgent low pulse (leakage/warnings)
    alert() {
      tone(140, 0.18, { type: "sawtooth", gain: 0.2, filter: "lowpass", cutoff: 600 });
      tone(140, 0.18, { type: "sawtooth", gain: 0.2, filter: "lowpass", cutoff: 600, delay: 0.24 });
    },
    // big whoosh for major scene transition (facility19)
    whoosh() {
      tone(90, 1.2, { type: "sawtooth", to: 320, gain: 0.16, filter: "lowpass", cutoff: 900, atk: 0.3 });
      tone(2000, 1.0, { type: "sine", to: 200, gain: 0.06, filter: "bandpass", cutoff: 1200 });
    },
    // typewriter blip
    type() { if (Math.random() < 0.55) tone(1400 + Math.random() * 600, 0.025, { type: "square", gain: 0.018, filter: "lowpass", cutoff: 2600 }); },
    // boot beep
    boot() { tone(1046, 0.08, { type: "square", gain: 0.06 }); },
    // power-on stinger when boot completes
    online() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.6, { type: "sine", gain: 0.12, delay: i * 0.09, atk: 0.01 }));
    },
    // voice wake activation — ascending triad
    wake() {
      tone(660, 0.25, { type: "sine", gain: 0.14, atk: 0.005 });
      tone(880, 0.3, { type: "sine", gain: 0.12, delay: 0.08, atk: 0.005 });
      tone(1320, 0.4, { type: "sine", gain: 0.1, delay: 0.16, atk: 0.005 });
    },
    // voice listening — subtle hum
    listen() {
      tone(440, 0.15, { type: "sine", gain: 0.06, atk: 0.01 });
      tone(550, 0.15, { type: "sine", gain: 0.04, delay: 0.04 });
    },
  };

  function toggle(on) {
    enabled = on;
    if (!ctx) { if (on) start(); return; }
    droneGain.gain.cancelScheduledValues(ctx.currentTime);
    droneGain.gain.setTargetAtTime(on ? 0.5 : 0.0001, ctx.currentTime, 0.4);
  }

  window.JVA = {
    start, setSceneHue, toggle,
    play: (name, arg) => { if (SFX[name]) SFX[name](arg); },
    resume() { if (ctx && ctx.state === "suspended") ctx.resume(); },
    get enabled() { return enabled; },
    get ready() { return started; },
  };
})();
