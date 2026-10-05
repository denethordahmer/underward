window.Delve = window.Delve || {};
(function(){
  Delve.updateHUD = function(){
    document.getElementById("hudHp").textContent = Delve.G.hp + "/" + Delve.maxHp();
    document.getElementById("hudAtk").textContent = Delve.atk();
    document.getElementById("hudFloor").textContent = Delve.G.floor;
    document.getElementById("hudShards").textContent = Delve.save.shards;
  };

  Delve.refreshHub = function(){
    document.getElementById("hubShards").textContent = Delve.save.shards;
    const hb=document.getElementById("buyHp"), ab=document.getElementById("buyAtk");
    hb.textContent=Delve.hpCost();  ab.textContent=Delve.atkCost();
    hb.disabled = Delve.save.shards < Delve.hpCost();
    ab.disabled = Delve.save.shards < Delve.atkCost();
    document.getElementById("hpLvl").textContent="Lv "+Delve.save.hpLvl;
    document.getElementById("atkLvl").textContent="Lv "+Delve.save.atkLvl;
  };

  Delve.showHub = function(){
    document.getElementById("hubScreen").style.display="flex";
    document.getElementById("hud").style.display="none";
    document.getElementById("hint").style.display="none";
    Delve.refreshHub();
  };
  Delve.hideHub = function(){
    document.getElementById("hubScreen").style.display="none";
    document.getElementById("hud").style.display="flex";
    document.getElementById("hint").style.display="block";
  };

  document.getElementById("buyHp").addEventListener("click", ()=>{
    const c=Delve.hpCost();
    if(Delve.save.shards>=c){ Delve.save.shards-=c; Delve.save.hpLvl++; Delve.persist(); Delve.refreshHub(); }
  });
  document.getElementById("buyAtk").addEventListener("click", ()=>{
    const c=Delve.atkCost();
    if(Delve.save.shards>=c){ Delve.save.shards-=c; Delve.save.atkLvl++; Delve.persist(); Delve.refreshHub(); }
  });
  document.getElementById("startBtn").addEventListener("click", ()=>{
    Delve.hideHub(); Delve.newRun(); Delve.resize(); Delve.draw();
  });
  document.getElementById("deathBtn").addEventListener("click", ()=>{
    document.getElementById("deathScreen").style.display="none";
    Delve.showHub();
  });
})();
