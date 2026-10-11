window.Delve = window.Delve || {};
(function(){
  const $ = id => document.getElementById(id);

  function injectIntroMarkup(){
    const existing = $("introOverlay");
    if(existing) return;

    const wrap = document.createElement("div");
    wrap.id = "introOverlay";
    wrap.innerHTML = `
      <div id="introCard">
        <h1>underward</h1>
        <p class="sub">A short guide before you descend.</p>

        <div class="intro-steps">
          <div class="intro-step">
            <div class="n">1</div>
            <div>
              <strong>Move and explore</strong>
              <small>Step onto nearby floor tiles to move. The ward is full of gold, monsters, barrels, and loot.</small>
            </div>
          </div>

          <div class="intro-step">
            <div class="n">2</div>
            <div>
              <strong>Fight smart</strong>
              <small>Enemies close in fast. Attack a neighboring target, then back off before you get overwhelmed.</small>
            </div>
          </div>

          <div class="intro-step">
            <div class="n">3</div>
            <div>
              <strong>Rest when needed</strong>
              <small>You can rest a few times per floor. It's the easiest way to recover when you're low on HP.</small>
            </div>
          </div>

          <div class="intro-step">
            <div class="n">4</div>
            <div>
              <strong>Visit the Trading Post</strong>
              <small>Every few floors, a shop appears. Buy gear, heal, and decide whether to push deeper or spend your gold.</small>
            </div>
          </div>

          <div class="intro-step">
            <div class="n">5</div>
            <div>
              <strong>Spend shards in the hub</strong>
              <small>When you return to the hub, spend your shards on upgrades before starting your next run.</small>
            </div>
          </div>
        </div>

        <div id="introActions">
          <button class="btn big" id="introStartBtn">Start run</button>
        </div>
      </div>
    `;

    const app = document.getElementById("app");
    if(app) app.appendChild(wrap);
  }

  function injectIntroStyles(){
    if(document.getElementById("intro-overlay-styles")) return;
    const s = document.createElement("style");
    s.id = "intro-overlay-styles";
    s.textContent = `
      #introOverlay{
        position:absolute;inset:0;z-index:27;display:none;align-items:center;justify-content:center;
        background:rgba(6,10,15,.82);
      }
      #introCard{
        width:min(560px, calc(100vw - 24px));
        max-height:calc(100vh - 24px);overflow:auto;
        background:#0e1620;border:1px solid #2a3440;border-radius:22px;
        padding:20px 18px 18px;display:flex;flex-direction:column;gap:14px;
        box-shadow:0 20px 50px rgba(0,0,0,.45);
      }
      #introCard h1{ margin:0; font-size:clamp(32px,8vw,50px); letter-spacing:2px; }
      #introCard .sub{ max-width:none; }
      .intro-steps{
        display:flex;flex-direction:column;gap:10px; width:100%;
      }
      .intro-step{
        display:flex;align-items:flex-start;gap:10px;
        background:#141b23;border:1px solid #2a3440;border-radius:12px;padding:12px 12px;
      }
      .intro-step .n{
        flex:0 0 32px;height:32px;border-radius:50%;
        background:#1f7a5c;color:#eafff5;font-weight:900;
        display:flex;align-items:center;justify-content:center;
      }
      .intro-step strong{ display:block; font-size:14px; margin-bottom:2px; }
      .intro-step small{ color:#9fb3c5; line-height:1.45; font-size:12px; }
      #introActions{ display:flex;flex-direction:column;gap:8px; width:100%; }
    `;
    document.head.appendChild(s);
  }

  function wrapShowHub(){
    const originalShowHub = Delve.showHub;
    if(!originalShowHub) return;

    Delve.showHub = function(){
      originalShowHub.call(this);
      
      const seenTutorial = !!(Delve.save && Delve.save.seenTutorial);
      if(!seenTutorial){
        setTimeout(function(){ Delve.showIntro(); }, 100);
      }
    };
  }

  Delve.showIntro = function(){
    const overlay = $("introOverlay");
    if(!overlay) return;
    overlay.style.display = "flex";
  };

  Delve.hideIntro = function(){
    const overlay = $("introOverlay");
    if(!overlay) return;
    overlay.style.display = "none";
    if(Delve.save){
      Delve.save.seenTutorial = true;
      if(Delve.persist) Delve.persist();
    }
  };

  injectIntroStyles();
  injectIntroMarkup();
  wrapShowHub();

  const introBtn = $("introStartBtn");
  if(introBtn) introBtn.addEventListener("click", Delve.hideIntro);
})();
