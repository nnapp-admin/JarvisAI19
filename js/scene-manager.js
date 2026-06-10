/* ============================================================================
   scene-manager.js — Centralized Scene Authority
   -----------------------------------------------------------------------------
   The single source of truth for what scene is on screen and what the system is
   doing. The scene is Jarvis's PRIMARY output, so every cinematic change flows
   through here. Only one major scene is active at a time.

   Tracked state:
     active      — current scene key
     previous    — scene we came from
     transition  — "idle" | "transitioning"
     animation   — "idle" | "animating"
     camera      — "rest" | "moving"
     narration   — "idle" | "speaking"

   Public API (window.SceneManager):
     transitionTo(scene, opts) -> Promise<bool>   resolves when the destination
                                                   scene has fully materialized
     focus(scene, target)      -> Promise<bool>   navigate (if needed) + highlight
     highlight(target)                            highlight within current scene
     beginNarration() / endNarration()
     getState() -> snapshot
     onChange(fn)
   ============================================================================ */
(function () {
  var state = {
    active: null,
    previous: null,
    transition: "idle",
    animation: "idle",
    camera: "rest",
    narration: "idle",
  };
  var subs = [];

  function emit() { var snap = getState(); subs.forEach(function (fn) { try { fn(snap); } catch (e) {} }); }
  function getState() { return { active: state.active, previous: state.previous, transition: state.transition, animation: state.animation, camera: state.camera, narration: state.narration }; }

  function liveScene() {
    var J = window.JV;
    if (J && J.current && J.current.key) return J.current.key;
    return state.active;
  }

  /* ---- cinematic transition: exit current -> bridge -> materialize new ----- */
  function transitionTo(scene, opts) {
    opts = opts || {};
    var UI = window.JARVIS_UI;
    return new Promise(function (resolve) {
      if (!UI || !UI.run) { resolve(false); return; }

      var current = liveScene();

      // Already here — just re-focus the narration sequence, no full transition.
      if (current === scene) {
        state.active = scene;
        if (UI.sequenceHighlights) UI.sequenceHighlights(scene);
        emit();
        resolve(false);
        return;
      }

      state.previous = current || state.active;
      state.active = scene;
      state.transition = "transitioning";
      state.camera = "moving";
      state.animation = "animating";
      emit();

      var settled = false;
      function arrive() {
        if (settled) return;
        settled = true;
        state.transition = "idle";
        state.camera = "rest";
        state.animation = "idle";
        emit();
        resolve(true);
      }

      // Safety net in case a transition is superseded and onArrive never fires.
      setTimeout(arrive, 5000);

      UI.run(scene, { fromVoice: true, cinematic: opts.cinematic !== false, onArrive: arrive });
    });
  }

  /* ---- navigate (if needed) then highlight a metric ----------------------- */
  function focus(scene, target) {
    var current = liveScene();
    if (!scene || scene === current) {
      state.active = scene || current;
      highlight(target);
      emit();
      return Promise.resolve(false);
    }
    return transitionTo(scene, { cinematic: true }).then(function (did) {
      // let the scene settle, then point at the element being discussed
      setTimeout(function () { highlight(target); }, 500);
      return did;
    });
  }

  function highlight(target) {
    if (!target) return;
    var UI = window.JARVIS_UI;
    if (!UI) return;
    var keyword = typeof target === "string" ? target : target.keyword;
    if (!keyword) return;
    if (UI.highlightMetric) UI.highlightMetric(keyword);
    else if (UI.highlightLabel) UI.highlightLabel(keyword);
  }

  function beginNarration() { state.narration = "speaking"; emit(); }
  function endNarration() { state.narration = "idle"; emit(); }

  window.SceneManager = {
    transitionTo: transitionTo,
    focus: focus,
    highlight: highlight,
    beginNarration: beginNarration,
    endNarration: endNarration,
    getState: getState,
    onChange: function (fn) { subs.push(fn); },
  };
})();
