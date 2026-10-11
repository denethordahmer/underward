window.Delve = window.Delve || {};
(function(){
"use strict";

 // ── Persistent audio prefs (own key, outside Delve.save) ──
 const PREFS_KEY = "underward_audio_v1";
 const DEFAULT_PREFS = { muted:false, sfx:0.55, music:0.30, haptics:true };

 function clamp01(v){ const n = Number(v); return isFinite(n) ? Math.max(0, Math.min(1, n)) : 0; }

 let prefs = loadPrefs();
 function loadPrefs(){
  const out = Object.assign({}, DEFAULT_PREFS);
  try{
   const raw = localStorage.getItem(PREFS_KEY);
   if(raw){
    const p = JSON.parse(raw);
    if(p && typeof p === "object"){
     if(typeof p.muted === "boolean") out.muted = p.muted;
     if(typeof p.sfx === "number") out.sfx = clamp01(p.sfx);
     if(typeof p.music === "number") out.music = clamp01(p.music);
     if(typeof p.haptics === "boolean") out.haptics = p.haptics;
    }
   }
  }catch(_e){}
  return out;
 }
 function savePrefs(){ try{ localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }catch(_e){} }

 // ── Audio graph ─────────────────────────────────────────────
 let ctx = null, master = null, limiter = null, sfxBus = null, musicBus = null;
 let delayNode = null, delayFeedback = null, delaySend = null;
 let noiseBuf = null;
 let voices = [];
 const MAX_VOICES = 12;
 const cooldowns = {};

 const COOLDOWNS = {
  footstep:75, pickup_gold:90, pickup_item:140, dot_tick:420,
  ui_click:70, deny:120
 };

 function getCtx(){
  if(!ctx){
   const AC = window.AudioContext || window.webkitAudioContext;
   if(!AC) return null;
   ctx = new AC();
   buildGraph();
  }
  if(ctx && ctx.state === "suspended"){ try{ ctx.resume(); }catch(_e){} }
  return ctx;
 }

 function buildGraph(){
  master = ctx.createGain();
  master.gain.value = prefs.muted ? 0 : 1;

  limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.knee.value = 20;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  master.connect(limiter);
  limiter.connect(ctx.destination);

  sfxBus = ctx.createGain(); sfxBus.gain.value = prefs.sfx; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = prefs.music; musicBus.connect(master);

  delayNode = ctx.createDelay(1.0);
  delayNode.delayTime.value = 0.16;
  delayFeedback = ctx.createGain();
  delayFeedback.gain.value = 0.28;
  delaySend = ctx.createGain();
  delaySend.gain.value = 1.0;
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayNode.connect(sfxBus);
  delaySend.connect(delayNode);
 }

 function makeNoiseBuffer(c){
  const len = Math.max(1, Math.floor(c.sampleRate * 2));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for(let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
 }

 function enforceVoiceCap(){
  if(voices.length <= MAX_VOICES) return;
  voices.sort(function(a,b){ return a.end - b.end; });
  while(voices.length > MAX_VOICES){
   const v = voices.shift();
   try{ v.node.stop(ctx.currentTime + 0.01); }catch(_e){}
  }
 }

 function wire(src, gain, start, dur, opts){
  const bus = (opts && opts.bus === "music") ? musicBus : sfxBus;
  gain.connect(bus);
  if(opts && opts.delay) gain.connect(delaySend);
  if(opts && opts.offset !== undefined) src.start(start, opts.offset, dur + 0.05);
  else src.start(start);
  src.stop(start + dur + 0.05);
  enforceVoiceCap();
  voices.push({ node:src, end:start + dur + 0.05 });
 }

 function osc(type, freq, start, dur, gainVal, opts){
  const c = getCtx(); if(!c) return;
  opts = opts || {};
  const det = opts.detuneCents || 0;
  const jitter = opts.gainJitter || 0;
  const f = Math.max(1, freq * (opts.pitch || 1) * Math.pow(2, (Math.random()*2-1)*det/1200));
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, start);
  if(opts.bend) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.bend), start + dur);
  const g = c.createGain();
  const v = Math.max(0.0001, gainVal * (jitter ? 1 + (Math.random()*2-1)*jitter : 1));
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(v, start + (opts.attack || 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g);
  wire(o, g, start, dur, opts);
 }

 function noise(start, dur, gainVal, opts){
  const c = getCtx(); if(!c) return;
  opts = opts || {};
  if(!noiseBuf) noiseBuf = makeNoiseBuffer(c);
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const off = Math.random() * Math.max(0.01, noiseBuf.duration - dur);
  src.playbackRate.value = (opts.pitch || 1) * (1 + (Math.random()*2-1)*(opts.rateJitter || 0.03));

  let node = src;
  if(opts.lp || opts.hp || opts.band){
   const f = c.createBiquadFilter();
   f.type = opts.band ? "bandpass" : (opts.hp ? "highpass" : "lowpass");
   f.frequency.value = opts.lp || opts.hp || opts.band || 800;
   if(opts.q) f.Q.value = opts.q;
   src.connect(f);
   node = f;
  }

  const g = c.createGain();
  const v = Math.max(0.0001, gainVal * (opts.gainJitter ? 1 + (Math.random()*2-1)*opts.gainJitter : 1));
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(v, start + (opts.attack || 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  node.connect(g);
  opts.offset = off;
  wire(src, g, start, dur, opts);
 }

 function cooled(name, ms){
  const wait = ms || COOLDOWNS[name] || 0;
  if(!wait) return true;
  const now = performance.now();
  if(now - (cooldowns[name] || 0) < wait) return false;
  cooldowns[name] = now;
  return true;
 }

 function vibrate(pattern){
  if(!prefs.haptics) return;
  try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(_e){}
 }

 // ── Sound definitions ───────────────────────────────────────
 const sounds = {};

 function weaponHit(style, crit){
  const c = getCtx(); if(!c) return;
  const t = c.currentTime;
  const g = crit ? 1.15 : 1;
  switch(style){
   case "dagger":
    noise(t, 0.03, 0.22*g, { lp:6000, hp:2200, delay:0.04, rateJitter:0.06 });
    osc("sine", 2800, t, 0.025, 0.16*g, { bend:1600, delay:0.06 });
    if(crit) osc("sine", 4200, t+0.012, 0.03, 0.20, { bend:2400 });
    break;
   case "axe":
    osc("sawtooth", 100, t, 0.10, 0.30*g, { bend:45, delay:0.08 });
    noise(t, 0.07, 0.32*g, { lp:650, delay:0.06 });
    noise(t+0.02, 0.04, 0.16*g, { hp:1800, lp:4000 });
    if(crit) osc("sine", 2600, t+0.02, 0.04, 0.18, { bend:1200 });
    break;
   case "hammer":
    osc("sine", 62, t, 0.13, 0.40*g, { bend:30, delay:0.10 });
    noise(t, 0.06, 0.34*g, { lp:320, delay:0.08 });
    osc("square", 120, t, 0.06, 0.16*g, { bend:55 });
    if(crit) osc("sine", 48, t+0.02, 0.14, 0.24, { bend:26 });
    break;
   case "spear":
    noise(t, 0.06, 0.18*g, { hp:1400, lp:4200, delay:0.05, rateJitter:0.08 });
    osc("sine", 1500, t+0.01, 0.05, 0.20*g, { bend:650, delay:0.08 });
    if(crit) osc("sine", 2600, t+0.015, 0.04, 0.20, { bend:1100 });
    break;
   default: // sword
    osc("square", 210, t, 0.06, 0.26*g, { bend:100, delay:0.10 });
    noise(t, 0.045, 0.22*g, { lp:3200, hp:300, delay:0.06 });
    osc("sine", 1900, t+0.01, 0.04, 0.18*g, { bend:900, delay:0.12 });
    if(crit) osc("sine", 3200, t+0.015, 0.04, 0.20, { bend:1500 });
  }
 }
 sounds.hit = function(o){ weaponHit(o.weapon || "sword", false); };
 sounds.crit = function(o){ weaponHit(o.weapon || "sword", true); };

 sounds.hurt = function(o){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.06, 0.40, { lp:520, delay:0.08 });
  osc("sawtooth", 85, t, 0.08, 0.26, { bend:55, delay:0.06 });
  if(o && o.monster === "brute") osc("sine", 60, t, 0.09, 0.22, { bend:40 });
 };

 sounds.dodge = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.09, 0.18, { hp:1600, lp:3600, rateJitter:0.08 });
  osc("sine", 700, t, 0.07, 0.08, { bend:1200 });
 };

 function killBase(){
  const c = getCtx(); const t = c.currentTime;
  noise(t, 0.12, 0.32, { lp:520, delay:0.10 });
  osc("sawtooth", 260, t, 0.09, 0.24, { bend:50, delay:0.06 });
  osc("sine", 95, t+0.05, 0.09, 0.20, { bend:50 });
 }
 function killBody(o){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  killBase();
  const k = (o && o.monster) || "goblin";
  switch(k){
   case "rat": osc("sine", 1900, t, 0.05, 0.18, { bend:900 }); noise(t, 0.04, 0.16, { hp:3000 }); break;
   case "slime": noise(t, 0.10, 0.22, { lp:320, pitch:0.7 }); osc("sine", 140, t, 0.08, 0.18, { bend:60 }); break;
   case "goblin": osc("sawtooth", 340, t, 0.07, 0.20, { bend:120 }); break;
   case "brute": osc("sine", 55, t, 0.12, 0.26, { bend:35 }); noise(t, 0.09, 0.24, { lp:300 }); break;
   case "wraith": osc("sine", 950, t, 0.16, 0.16, { bend:180 }); noise(t, 0.14, 0.14, { hp:900 }); break;
   case "barkling": noise(t, 0.06, 0.26, { lp:900, hp:300 }); osc("square", 170, t, 0.05, 0.18, { bend:80 }); break;
   case "spore_swarm": noise(t, 0.14, 0.20, { hp:2200, rateJitter:0.06 }); break;
   case "thornling": noise(t, 0.05, 0.24, { lp:1400, hp:500 }); osc("square", 520, t, 0.04, 0.16, { bend:260 }); break;
   case "vine_stalker": noise(t, 0.07, 0.22, { hp:700, lp:2400 }); osc("sawtooth", 190, t, 0.06, 0.18, { bend:70 }); break;
   case "dryad": osc("sine", 230, t, 0.10, 0.20, { bend:110 }); noise(t, 0.07, 0.18, { lp:420 }); break;
   case "treant": osc("sine", 52, t, 0.18, 0.24, { bend:30 }); noise(t, 0.12, 0.22, { lp:220 }); break;
  }
 }
 sounds.kill = function(o){ killBody(o); vibrate([15,40,15]); };
 sounds.elite_kill = function(o){
  killBody(o);
  const c = getCtx();
  if(c){ const t = c.currentTime; osc("sine", 45, t+0.02, 0.20, 0.22, { bend:25 }); }
  vibrate([20,30,20,30,20]);
 };

 sounds.boss_kill = function(o){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sine", 60, t, 0.55, 0.42, { bend:28, delay:0.10 });
  noise(t, 0.70, 0.36, { lp:300, delay:0.12 });
  const k = (o && o.monster) || "boss_warden";
  if(k === "boss_thorn"){
   osc("sawtooth", 95, t+0.10, 0.45, 0.30, { bend:38 });
   noise(t+0.10, 0.50, 0.28, { lp:520 });
  } else {
   osc("square", 72, t+0.10, 0.45, 0.30, { bend:36 });
   osc("sine", 220, t+0.20, 0.35, 0.18, { bend:80 });
  }
  vibrate([20,40,20,40,20]);
 };

 sounds.victory = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sine", 55, t, 0.14, 0.40, { bend:50 });
  noise(t, 0.12, 0.46, { lp:400 });
  osc("sine", 330, t+0.10, 0.30, 0.24, { bend:440 });
  osc("sine", 495, t+0.20, 0.26, 0.18, { bend:550 });
  osc("sine", 660, t+0.32, 0.20, 0.14, { bend:700 });
 };

 sounds.death = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sawtooth", 180, t, 0.60, 0.32, { bend:28, delay:0.12 });
  noise(t, 1.0, 0.28, { lp:280, delay:0.15 });
  osc("sine", 60, t+0.20, 0.60, 0.20, { bend:32 });
  vibrate(120);
 };

 sounds.pickup_gold = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sine", 1400, t, 0.03, 0.20, { bend:1700, delay:0.06 });
  osc("sine", 2100, t+0.012, 0.025, 0.10, { bend:1800 });
 };
 sounds.pickup_item = function(o){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  const tier = (o && o.tier) || 1;
  const mult = 1 + tier * 0.08;
  osc("sine", 900*mult, t, 0.04, 0.22, { bend:1300*mult, delay:0.08 });
  osc("sine", 1500*mult, t+0.02, 0.03, 0.12, { bend:1900*mult });
  osc("triangle", 450*mult, t, 0.05, 0.12, { bend:600*mult });
 };
 sounds.pickup = sounds.pickup_item;

 sounds.potion = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.02, 0.24, { lp:900, hp:300 });
  osc("sine", 300, t+0.03, 0.10, 0.14, { bend:180 });
  noise(t+0.05, 0.10, 0.12, { lp:500 });
 };
 sounds.cure = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sine", 520, t, 0.16, 0.18, { bend:780, delay:0.10 });
  osc("sine", 780, t+0.10, 0.14, 0.14, { bend:1040 });
  noise(t, 0.10, 0.10, { hp:1800 });
 };

 sounds.equip = function(o){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  const slot = o && o.slot;
  if(slot === "weapon" || slot === "offhand" || slot === "head" || slot === "body" || slot === "hands" || slot === "feet"){
   noise(t, 0.04, 0.20, { lp:1200, hp:300, delay:0.06 });
   osc("sine", 700, t+0.01, 0.03, 0.12, { bend:900 });
  } else if(slot === "cloak"){
   noise(t, 0.08, 0.16, { hp:1200, lp:3000 });
  } else {
   osc("sine", 1600, t, 0.04, 0.14, { bend:2200, delay:0.10 });
   osc("sine", 2400, t+0.03, 0.03, 0.10, { bend:2800 });
  }
 };

 sounds.shop_open = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sine", 180, t, 0.10, 0.14, { bend:120 });
  noise(t, 0.05, 0.12, { lp:600 });
  osc("sine", 900, t+0.08, 0.04, 0.12, { bend:1200, delay:0.08 });
 };
 sounds.buy = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sine", 1200, t, 0.03, 0.18, { bend:1500 });
  osc("sine", 1800, t+0.02, 0.025, 0.12, { bend:2000 });
  noise(t, 0.02, 0.10, { hp:2000 });
 };
 sounds.deny = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("square", 140, t, 0.06, 0.20, { bend:100 });
  noise(t, 0.04, 0.14, { lp:500 });
 };
 sounds.ui_click = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.02, 0.12, { lp:1600 });
  osc("sine", 800, t, 0.02, 0.08, { bend:600 });
 };

 sounds.footstep = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.05, 0.12, { lp:420, hp:80, rateJitter:0.15, gainJitter:0.4 });
  osc("sine", 90, t, 0.04, 0.07, { bend:60, gainJitter:0.4 });
 };
 sounds.stairs = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.35, 0.20, { hp:300, lp:900, pitch:0.8 });
  osc("sine", 120, t, 0.30, 0.14, { bend:60 });
  noise(t+0.25, 0.20, 0.16, { lp:400 });
 };
 sounds.chest = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sawtooth", 90, t, 0.12, 0.12, { bend:140 });
  noise(t+0.10, 0.03, 0.18, { hp:1200 });
  osc("sine", 700, t+0.12, 0.06, 0.12, { bend:1000, delay:0.08 });
 };
 sounds.barrel = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.07, 0.30, { lp:900, hp:200 });
  osc("square", 130, t, 0.05, 0.16, { bend:70 });
  noise(t+0.04, 0.05, 0.18, { lp:1600, hp:500 });
 };
 sounds.secret = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.30, 0.18, { lp:320, pitch:0.6 });
  osc("sine", 80, t, 0.35, 0.14, { bend:45 });
  osc("sine", 220, t+0.25, 0.12, 0.10, { bend:140 });
 };
 sounds.rest = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.20, 0.10, { hp:600, lp:1800 });
  osc("sine", 320, t+0.05, 0.20, 0.10, { bend:420 });
 };

 sounds.status_poison = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.14, 0.14, { lp:380, pitch:0.9, rateJitter:0.06 });
  osc("sine", 200, t, 0.14, 0.10, { bend:140 });
 };
 sounds.status_bleed = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sine", 600, t, 0.04, 0.12, { bend:300 });
  noise(t+0.02, 0.03, 0.12, { hp:900 });
 };
 sounds.status_burn = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.18, 0.18, { hp:2200, rateJitter:0.08 });
  osc("sawtooth", 140, t, 0.16, 0.10, { bend:90 });
 };
 sounds.status_weaken = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sine", 420, t, 0.22, 0.12, { bend:180 });
  noise(t, 0.16, 0.08, { lp:700 });
 };
 sounds.status_proc = function(o){
  const id = o && o.status;
  if(id === "poison") sounds.status_poison();
  else if(id === "bleed") sounds.status_bleed();
  else if(id === "burn") sounds.status_burn();
  else sounds.status_weaken();
 };
 sounds.dot_tick = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sine", 500, t, 0.03, 0.07, { bend:380 });
 };

 sounds.second_wind = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.18, 0.18, { hp:700, lp:2600 });
  osc("sine", 300, t+0.05, 0.30, 0.16, { bend:600, delay:0.10 });
 };
 sounds.unbroken = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sine", 55, t, 0.16, 0.30, { bend:40 });
  osc("square", 220, t+0.04, 0.20, 0.14, { bend:330 });
 };

 sounds.levelup = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sine", 440, t, 0.18, 0.20, { bend:660, delay:0.10 });
  osc("sine", 660, t+0.15, 0.20, 0.24, { bend:880 });
  osc("square", 220, t, 0.14, 0.10, { bend:220 });
 };
 sounds.trait = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sine", 520, t, 0.12, 0.14, { bend:660, delay:0.10 });
  osc("sine", 780, t+0.08, 0.12, 0.12, { bend:900 });
 };
 sounds.ability_learn = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sine", 660, t, 0.14, 0.16, { bend:990, delay:0.10 });
  osc("sine", 990, t+0.10, 0.14, 0.14, { bend:1320 });
 };

 sounds.ability_cleave = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.10, 0.28, { lp:700, delay:0.08 });
  osc("sawtooth", 160, t, 0.10, 0.22, { bend:70 });
  noise(t+0.05, 0.08, 0.22, { lp:1800, hp:400 });
 };
 sounds.ability_lunge = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.14, 0.20, { hp:900, lp:3000, pitch:1.2 });
  osc("sine", 900, t+0.08, 0.05, 0.18, { bend:500 });
 };
 sounds.ability_stone_skin = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.30, 0.24, { lp:260, pitch:0.7 });
  osc("sine", 70, t, 0.35, 0.22, { bend:45 });
  osc("square", 110, t+0.10, 0.25, 0.12, { bend:70 });
 };
 sounds.ability_cinderbolt = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.22, 0.22, { hp:2000, rateJitter:0.08 });
  osc("sawtooth", 180, t, 0.18, 0.14, { bend:90 });
  noise(t+0.10, 0.16, 0.18, { lp:900, hp:300 });
 };
 sounds.ability_rally = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.15, 0.12, { hp:600, lp:2000 });
  osc("sine", 330, t, 0.30, 0.18, { bend:440 });
  osc("sine", 495, t+0.15, 0.30, 0.16, { bend:660 });
 };
 sounds.ability_blink = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.12, 0.16, { hp:1400, lp:3600, pitch:0.8 });
  osc("sine", 800, t+0.08, 0.06, 0.14, { bend:500 });
 };
 sounds.ability_whirlwind = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  noise(t, 0.22, 0.22, { hp:800, lp:2600, pitch:1.3 });
  osc("sawtooth", 200, t, 0.20, 0.14, { bend:80 });
  noise(t+0.10, 0.12, 0.18, { lp:1200 });
 };

 sounds.boss_intro = function(o){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  const ward = (o && o.ward) || 1;
  if(ward === 2){
   osc("sine", 48, t, 0.8, 0.26, { bend:32 });
   noise(t, 0.7, 0.18, { lp:260 });
   osc("sawtooth", 85, t+0.2, 0.6, 0.16, { bend:40 });
  } else {
   osc("square", 65, t, 0.7, 0.24, { bend:38 });
   osc("sine", 220, t+0.15, 0.6, 0.14, { bend:80 });
   noise(t, 0.5, 0.16, { lp:400 });
  }
 };
 sounds.floor_enter = function(o){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  const ward = (o && o.ward) || 1;
  const root = ward === 2 ? 55 : 73;
  osc("sine", root, t, 0.5, 0.14, { bend:root*0.8, delay:0.12 });
  osc("sine", root*1.5, t+0.15, 0.4, 0.10, { bend:root, delay:0.15 });
 };
 sounds.elite = function(){
  const c = getCtx(); if(!c) return; const t = c.currentTime;
  osc("sawtooth", 180, t, 0.12, 0.18, { bend:90 });
  osc("sine", 60, t+0.05, 0.16, 0.20, { bend:40 });
  noise(t, 0.08, 0.12, { lp:600 });
 };

 // ── Public API ──────────────────────────────────────────────
 Delve.sfx = function(name, opts){
  if(prefs.muted) return;
  const fn = sounds[name];
  if(!fn) return;
  if(!cooled(name)) return;
  try{ fn(opts || {}); }catch(_e){}
 };

 Delve.sfxMuted = function(){ return prefs.muted; };
 Delve.sfxToggleMute = function(){
  prefs.muted = !prefs.muted;
  if(master) master.gain.value = prefs.muted ? 0 : 1;
  savePrefs();
  return prefs.muted;
 };
 Delve.sfxSetVolume = function(v){
  prefs.sfx = clamp01(v);
  if(sfxBus) sfxBus.gain.value = prefs.sfx;
  savePrefs();
 };
 Delve.sfxGetVolume = function(){ return prefs.sfx; };
 Delve.musicSetVolume = function(v){
  prefs.music = clamp01(v);
  if(musicBus) musicBus.gain.value = prefs.music;
  savePrefs();
 };
 Delve.musicGetVolume = function(){ return prefs.music; };
 Delve.sfxSetHaptics = function(b){ prefs.haptics = !!b; savePrefs(); return prefs.haptics; };
 Delve.sfxGetHaptics = function(){ return !!prefs.haptics; };

 // Background music/ambience intentionally disabled for now.
 // These stubs keep existing call sites safe.
 Delve.sfxStartAmbience = function(){};
 Delve.sfxStopAmbience = function(){};
 Delve.sfxSetWard = function(){};

 // ── Gesture unlock + lifecycle ──────────────────────────────
 function unlock(){
  const c = getCtx();
  if(c && c.state === "running"){
   document.removeEventListener("pointerdown", unlock);
   document.removeEventListener("keydown", unlock);
  }
 }
 document.addEventListener("pointerdown", unlock, { passive:true });
 document.addEventListener("keydown", unlock, { passive:true });
 document.addEventListener("visibilitychange", function(){
  if(document.visibilityState === "visible" && ctx) getCtx();
 });

})();
