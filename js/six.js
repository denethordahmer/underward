window.Delve = window.Delve || {};
(function(){

  // ── Audio context (created on first user gesture to satisfy browsers) ──
  let ctx = null;
  let masterGain = null;
  let muted = false;

  // Throttle for pickup so a gold hoard doesn't machine-gun
  let lastPickupTime = 0;
  const PICKUP_THROTTLE = 200; // ms

  function getCtx(){
    if(!ctx){
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.55; // default volume
      masterGain.connect(ctx.destination);
    }
    if(ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // ── Core synth helpers ───────────────────────────────────────

  function osc(type, freq, start, dur, gainVal, bend){
    const c = getCtx();
    if(muted) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if(bend) o.frequency.linearRampToValueAtTime(bend, start + dur);
    g.gain.setValueAtTime(gainVal, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(masterGain);
    o.start(start);
    o.stop(start + dur);
  }

  function noise(start, dur, gainVal, lpFreq){
    const c = getCtx();
    if(muted) return;
    const bufLen = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const data = buf.getChannelData(0);
    for(let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2) - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = lpFreq || 800;
    const g = c.createGain();
    g.gain.setValueAtTime(gainVal, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(lp);
    lp.connect(g);
    g.connect(masterGain);
    src.start(start);
    src.stop(start + dur);
  }

  // ── Sound definitions ────────────────────────────────────────

  const sounds = {

    // Player swing connects — low thunk + bright metal click
    hit: function(){
      const c = getCtx(), t = c.currentTime;
      osc("square",  160, t,       0.04, 0.35, 80);   // low thunk body
      noise(t,               0.035, 0.28, 2200);        // impact thud
      osc("sine",    1800, t+0.01, 0.025, 0.18, 900);  // metal click snap
    },

    // You take a hit — heavier, grimmer
    hurt: function(){
      const c = getCtx(), t = c.currentTime;
      noise(t,       0.055, 0.40, 600);                 // dull low burst
      osc("sawtooth", 90, t, 0.07, 0.25, 60);          // low grim tone
    },

    // Kill — pitch swoop down + crunch settle
    kill: function(){
      const c = getCtx(), t = c.currentTime;
      osc("sawtooth", 320, t,      0.06, 0.30, 55);    // crunch pitch fall
      noise(t,                0.08, 0.35, 500);          // crunch body
      osc("sine",     110,  t+0.04, 0.05, 0.18, 70);   // low settle thud
    },

    // Pickup (gold / item) — short bright clink
    pickup: function(){
      const now = Date.now();
      if(now - lastPickupTime < PICKUP_THROTTLE) return;
      lastPickupTime = now;
      const c = getCtx(), t = c.currentTime;
      osc("sine", 1400, t,      0.03, 0.22, 1700);      // bright clink
      osc("sine", 2100, t+0.01, 0.025, 0.10, 1800);    // shimmer
    },

    // Level up — rising two-note shimmer, arcade but not chirpy
    levelup: function(){
      const c = getCtx(), t = c.currentTime;
      osc("sine", 440, t,      0.18, 0.22, 660);        // first note rise
      osc("sine", 660, t+0.15, 0.18, 0.28, 880);       // second note higher
      osc("square", 220, t,   0.12, 0.10, 220);         // dark undertone
    },

    // Death — long low fall + rumble
    death: function(){
      const c = getCtx(), t = c.currentTime;
      osc("sawtooth", 180, t, 0.55, 0.32, 30);          // long low fall
      noise(t,        0.90, 0.28, 300);                  // deep rumble
      osc("sine",      60, t+0.2, 0.55, 0.20, 35);     // sub bass dread
    },

    // Victory (The Warden falls) — low boom + brief choral swell
    victory: function(){
      const c = getCtx(), t = c.currentTime;
      osc("sine",     55,  t,       0.12, 0.40, 50);    // sub boom
      noise(t,                0.10, 0.50, 400);           // impact thud
      osc("sine",     330, t+0.10, 0.22, 0.28, 440);   // choral low note
      osc("sine",     495, t+0.18, 0.18, 0.20, 550);   // choral harmony
      osc("sine",     660, t+0.28, 0.14, 0.14, 700);   // choral top shimmer
    },

    // Crit — extra snap on top of hit
    crit: function(){
      const c = getCtx(), t = c.currentTime;
      osc("square", 260, t,      0.05, 0.30, 100);
      osc("sine",  2400, t+0.01, 0.03, 0.22, 1200);
      noise(t,            0.06, 0.40, 3000);
    }
  };

  // ── Public API ───────────────────────────────────────────────
  Delve.sfx = function(name){
    if(muted) return;
    if(sounds[name]) sounds[name]();
  };

  Delve.sfxMuted = function(){ return muted; };

  Delve.sfxToggleMute = function(){
    muted = !muted;
    if(masterGain) masterGain.gain.value = muted ? 0 : Delve._sfxVolume || 0.55;
    return muted;
  };

  Delve.sfxSetVolume = function(v){
    Delve._sfxVolume = v;
    if(!muted && masterGain) masterGain.gain.value = v;
  };

  Delve.sfxGetVolume = function(){
    return Delve._sfxVolume !== undefined ? Delve._sfxVolume : 0.55;
  };

  // Initialise audio context on first tap anywhere
  document.addEventListener("pointerdown", function(){
    getCtx();
  }, { once: true, passive: true });

})();
