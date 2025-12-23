/* AURA ambient audio engine (v3.3.0) — offline, soft, no harsh fixed tone */
(() => {
  const LS = 'aura_audio_v3';
  const fab = document.getElementById('aura-audio-fab');
  const btn = document.getElementById('musicFab');
  const panel = document.getElementById('aura-audio-panel');
  const closeBtn = document.getElementById('aura-audio-close');
  const hideBtn = document.getElementById('aura-audio-hide');
  const toggle = document.getElementById('aura-audio-toggle');
  const sel = document.getElementById('aura-audio-select');
  const vol = document.getElementById('aura-audio-volume');
  const volLbl = document.getElementById('aura-audio-vol-label');
  const status = document.getElementById('aura-audio-status');

  // Drag (keep previous behavior)
  let drag = null;
  function onDown(e){
    const p = (e.touches && e.touches[0]) || e;
    drag = {x:p.clientX, y:p.clientY, sx:fabricss('right'), sy:fabricss('bottom')};
  }
  function fabricss(prop){
    const v = getComputedStyle(fab)[prop];
    return parseFloat(v)||14;
  }
  function onMove(e){
    if(!drag) return;
    const p = (e.touches && e.touches[0]) || e;
    const dx = p.clientX - drag.x;
    const dy = p.clientY - drag.y;
    const right = Math.max(8, drag.sx - dx);
    const bottom = Math.max(8, drag.sy - dy);
    fab.style.right = right + 'px';
    fab.style.bottom = bottom + 'px';
  }
  function onUp(){ drag = null; }
  btn.addEventListener('touchstart', onDown, {passive:true});
  btn.addEventListener('touchmove', onMove, {passive:true});
  btn.addEventListener('touchend', onUp);
  btn.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);

  // Read app settings (sound toggle) if available
  function getAppState(){
    try{
      const s = localStorage.getItem('aura_v3_state');
      return s ? JSON.parse(s) : null;
    }catch(_){ return null; }
  }
  function appSoundEnabled(){
    const st = getAppState();
    return st && st.settings ? (st.settings.sound !== false) : true;
  }

  const audio = {
    ctx: null,
    nodes: null,
    on: false,
    env: 'ocean',
    vol: 0.30
  };

  function load(){
    try{
      const raw = localStorage.getItem(LS);
      if(raw){
        const o = JSON.parse(raw);
        if(o.env) audio.env = o.env;
        if(typeof o.vol === 'number') audio.vol = o.vol;
      }
    }catch(e){}
    sel.value = audio.env;
    vol.value = Math.round(audio.vol*100);
    volLbl.textContent = Math.round(audio.vol*100)+'%';
  }
  function save(){
    try{
      localStorage.setItem(LS, JSON.stringify({env: audio.env, vol: audio.vol}));
    }catch(e){}
  }

  function ensureCtx(){
    if(audio.ctx) return audio.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx){
      status.textContent = 'Audio non supportato.';
      return null;
    }
    audio.ctx = new Ctx();
    return audio.ctx;
  }

  function buildAmbient(ctx, env){
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -22;
    comp.knee.value = 18;
    comp.ratio.value = 3;
    comp.attack.value = 0.015;
    comp.release.value = 0.20;
    comp.connect(master);

    // Noise (2s loop)
    const nlen = Math.floor(ctx.sampleRate * 2);
    const nb = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for(let i=0;i<nlen;i++){ d[i] = (Math.random()*2-1); }
    const ns = ctx.createBufferSource();
    ns.buffer = nb; ns.loop = true;

    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 1150;
    nf.Q.value = 0.8;

    const ng = ctx.createGain();
    ng.gain.value = 0.14;

    ns.connect(nf); nf.connect(ng); ng.connect(comp);

    // Pad (3 sines)
    const pad = ctx.createGain();
    pad.gain.value = 0.12;
    const pf = ctx.createBiquadFilter();
    pf.type = 'lowpass';
    pf.frequency.value = 780;
    pf.Q.value = 0.5;
    pad.connect(pf); pf.connect(comp);

    function mkOsc(freq, det){
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      o.detune.value = det;
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      o.connect(g); g.connect(pad);
      return {o,g};
    }
    const base = (env === 'space') ? 110 : (env === 'forest' ? 140 : 125);
    const oA = mkOsc(base, -7);
    const oB = mkOsc(base*1.5, +5);
    const oC = mkOsc(base*2.0, -3);

    // Movement
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain);
    lfoGain.connect(nf.frequency);

    const lfo2 = ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.value = 0.05;
    const lfo2Gain = ctx.createGain();
    lfo2Gain.gain.value = 0.06;
    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(pad.gain);

    // Profiles
    if(env === 'rain'){
      nf.frequency.value = 950; ng.gain.value = 0.18;
      pf.frequency.value = 700; pad.gain.value = 0.10;
    } else if(env === 'forest'){
      nf.frequency.value = 1400; ng.gain.value = 0.12;
      pf.frequency.value = 1000; pad.gain.value = 0.14;
    } else if(env === 'space'){
      nf.frequency.value = 700; ng.gain.value = 0.10;
      pf.frequency.value = 650; pad.gain.value = 0.16;
      oA.o.frequency.value = 98; oB.o.frequency.value = 147; oC.o.frequency.value = 196;
    } else {
      nf.frequency.value = 1150; ng.gain.value = 0.14;
      pf.frequency.value = 780; pad.gain.value = 0.12;
    }

    // Start
    const t = ctx.currentTime;
    ns.start(t);
    [oA,oB,oC].forEach(x => {
      x.g.gain.setValueAtTime(0.0001, t);
      x.g.gain.exponentialRampToValueAtTime(0.35, t+1.2);
      x.o.start(t);
    });
    lfo.start(t);
    lfo2.start(t);

    // Fade in
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(Math.max(0.05, audio.vol), t+0.8);

    return { master, ns, oA,oB,oC, lfo,lfo2, stop: () => {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now+0.35);
      setTimeout(() => {
        try{ ns.stop(); }catch(e){}
        [oA,oB,oC].forEach(x => { try{x.o.stop();}catch(e){} });
        try{ lfo.stop(); lfo2.stop(); }catch(e){}
        try{ master.disconnect(); }catch(e){}
      }, 420);
    }};
  }

  async function start(){
    if(!appSoundEnabled()){
      status.textContent = 'Audio disattivato nelle impostazioni di AURA.';
      return;
    }
    const ctx = ensureCtx();
    if(!ctx) return;
    if(ctx.state === 'suspended'){ try{ await ctx.resume(); }catch(e){} }
    if(audio.nodes){ try{ audio.nodes.stop(); }catch(e){} audio.nodes=null; }
    audio.nodes = buildAmbient(ctx, audio.env);
    audio.on = true;
    toggle.textContent = '⏸';
    status.textContent = 'In riproduzione • volume ' + Math.round(audio.vol*100) + '%';
  }
  function stop(){
    if(audio.nodes){ try{ audio.nodes.stop(); }catch(e){} audio.nodes=null; }
    audio.on=false;
    toggle.textContent='▶';
    status.textContent='In pausa.';
  }
  function setVol(v){
    audio.vol = Math.min(1, Math.max(0.05, v));
    volLbl.textContent = Math.round(audio.vol*100)+'%';
    if(audio.nodes && audio.nodes.master && audio.ctx){
      const now = audio.ctx.currentTime;
      audio.nodes.master.gain.cancelScheduledValues(now);
      audio.nodes.master.gain.setValueAtTime(Math.max(0.0001, audio.nodes.master.gain.value), now);
      audio.nodes.master.gain.exponentialRampToValueAtTime(audio.vol, now+0.15);
    }
    if(audio.on) status.textContent = 'In riproduzione • volume ' + Math.round(audio.vol*100) + '%';
    save();
  }

  // Panel open/close
  function openPanel(){ panel.classList.add('open'); }
  function closePanel(){ panel.classList.remove('open'); }
  btn.addEventListener('click', ()=>{ panel.classList.contains('open') ? closePanel() : openPanel(); });
  closeBtn.addEventListener('click', closePanel);
  hideBtn.addEventListener('click', ()=>{ closePanel(); });

  toggle.addEventListener('click', async ()=>{ audio.on ? stop() : await start(); });
  sel.addEventListener('change', async (e)=>{
    audio.env = e.target.value;
    save();
    if(audio.on) await start();
  });
  vol.addEventListener('input', (e)=> setVol(Number(e.target.value)/100));

  // Autoload settings
  load();

  // Keep in sync: if user disables sound in app settings, stop audio
  window.addEventListener('storage', (e)=>{
    if(e.key === 'aura_v3_state' && !appSoundEnabled() && audio.on) stop();
  });
})();
</script>

</body>
