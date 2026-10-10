window.Delve = window.Delve || {};
(function(){

 const def = function(id){
  return (Delve.CONFIG.STATUS_EFFECTS || {})[id];
 };

 // ── Apply a status to a monster or boss ──────────────────────
 Delve.applyEffect = function(target, id){
  const d = def(id);
  if(!d || !target) return false;
  target.effects = target.effects || [];
  if(d.stackable){
   target.effects.push({ id: id, turns: d.turns });
  } else {
   const existing = target.effects.find(e => e.id === id);
   if(existing) existing.turns = d.turns;
   else target.effects.push({ id: id, turns: d.turns });
  }
  return true;
 };

 // ── Tick monster DOTs at the START of its swing cycle ────────
 // Returns true if the monster died from the damage-over-time.
 Delve.tickMonsterEffects = function(m){
  if(!m.effects || !m.effects.length) return false;
  let died = false;

  for(const e of m.effects){
   const d = def(e.id);
   if(!d) continue;
   if(d.perTurn){
    m.hp -= d.perTurn;
    if(Delve.addFloater) Delve.addFloater(d.name + " -" + d.perTurn, m.x, m.y - 0.7, d.color);
    if(m.hp <= 0){ died = true; break; }
   }
  }

  m.effects = m.effects
   .map(e => ({ id: e.id, turns: e.turns - 1 }))
   .filter(e => e.turns > 0);

  return died;
 };

 // ── Advance player-side effects by one swing cycle ───────────
 Delve.tickPlayerEffects = function(){
  const G = Delve.G;
  if(!G.effects) G.effects = [];
  G.effects = G.effects
   .map(e => ({ id: e.id, turns: e.turns - 1 }))
   .filter(e => e.turns > 0);
  return G.effects;
 };

 // ── Apply a status to the player (e.g. Wraith's Weaken) ──────
 Delve.applyPlayerEffect = function(id){
  const G = Delve.G, d = def(id);
  if(!G || !d) return;
  G.effects = G.effects || [];
  const existing = G.effects.find(e => e.id === id);
  if(existing) existing.turns = d.turns;
  else G.effects.push({ id: id, turns: d.turns });
 };

 // ── Active-debuff checks used by combat ─────────────────────
 Delve.playerWeakened = function(){
  const G = Delve.G;
  return !!(G.effects && G.effects.some(e => e.id === "weaken"));
 };

 Delve.statusColor = function(id){
  const d = def(id);
  return d ? d.color : "#ffffff";
 };

})();
