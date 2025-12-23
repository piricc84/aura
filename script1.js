        const app = (() => {
            const STORAGE = { state: 'aura_v3_state', logs: 'aura_v3_logs', settings: 'aura_v3_settings', badges: 'aura_v3_badges', onboarding: 'aura_v3_onboarding', privacy: 'aura_v3_privacy', secure: 'aura_v3_secure' };

            const QUOTES = [
                { text: "La pace viene da dentro. Non cercarla fuori.", author: "Buddha" },
                { text: "Il momento presente è pieno di gioia.", author: "Thich Nhat Hanh" },
                { text: "Sii gentile, ogni persona combatte una battaglia.", author: "Platone" },
                { text: "La calma è la più grande manifestazione di potere.", author: "James Allen" },
                { text: "Respira. Lascia andare. Questo momento è l'unico che hai.", author: "Oprah" },
                { text: "La gratitudine trasforma ciò che abbiamo in abbastanza.", author: "Anonimo" },
                { text: "Ogni mattina nasce di nuovo. Oggi è ciò che conta.", author: "Buddha" },
                { text: "Dove c'è amore, c'è vita.", author: "Gandhi" }
            ];

            const MESSAGES = {
                ok: ['qui.', 'ci sono.', 'respira.', 'tutto ok.', 'presente.'],
                tense: ['calma.', 'piano.', 'respira.', 'va bene.', 'passerà.'],
                tired: ['riposa.', 'va bene.', 'piano.', 'gentile.', 'ascoltati.'],
                down: ['ci sono.', 'qui.', 'insieme.', 'presente.', 'vicino.'],
                sleeping: ['zzz...', 'sogni d\'oro...', 'riposo...']
            };

            const TIPS = {
                check: [{ e: '💡', t: 'Notare come stai è già cura.' }, { e: '🌿', t: 'Non giudicare, osserva.' }],
                calm: [{ e: '🫧', t: 'Il respiro è sempre con te.' }, { e: '🌊', t: 'Espira più a lungo.' }],
                focus: [{ e: '🎯', t: 'Una sola cosa. Ora.' }, { e: '🌱', t: 'Inizia piccolo.' }],
                general: [{ e: '🌙', t: 'Domani è un nuovo giorno.' }, { e: '💪', t: 'Sei più forte di quanto pensi.' }]
            };

            const BADGES_DEF = [
                { id: 'first', name: 'Primo Passo', desc: 'Primo check-in', icon: '👣', cond: (s,l) => l.filter(x=>x.action==='check').length >= 1 },
                { id: 'week', name: 'Settimana', desc: '7 giorni di fila', icon: '📅', cond: s => s.streak >= 7 },
                { id: 'breath10', name: 'Respiro Zen', desc: '10 respiri', icon: '🧘', cond: (s,l) => l.filter(x=>x.action==='calma').length >= 10 },
                { id: 'focus10', name: 'Ninja Focus', desc: '10 focus', icon: '🥷', cond: (s,l) => l.filter(x=>x.action==='focus').length >= 10 },
                { id: 'evo1', name: 'Risveglio', desc: 'Diventi un Elfo', icon: '🧝‍♂️', cond: s => s.stage >= 1 },
                { id: 'evo2', name: 'Guardiano', desc: 'Guardiano della Foresta', icon: '🌲', cond: s => s.stage >= 2 },
                { id: 'morning', name: 'Mattiniero', desc: '5 check mattutini', icon: '🌅', cond: (s,l) => l.filter(x=>x.action==='check'&&new Date(x.ts).getHours()<9).length >= 5 },
                { id: 'night', name: 'Nottambulo', desc: '5 check serali', icon: '🦉', cond: (s,l) => l.filter(x=>x.action==='check'&&new Date(x.ts).getHours()>=21).length >= 5 },
                { id: 'grateful', name: 'Grato', desc: '10 gratitudini', icon: '🙏', cond: (s,l) => l.filter(x=>x.gratitude).length >= 10 },
                { id: 'journal', name: 'Scrittore', desc: '10 note', icon: '✍️', cond: (s,l) => l.filter(x=>x.note).length >= 10 },
                { id: 'month', name: 'Mese d\'oro', desc: '30 giorni', icon: '🏆', cond: s => s.streak >= 30 },
                { id: 'century', name: 'Centurione', desc: '100 azioni', icon: '💯', cond: s => s.totalActions >= 100 }
            ];

            const STAGES = [{ name: 'Germoglio', emoji: '🌱', th: 0 }, { name: 'Elfo', emoji: '🧝‍♂️', th: 10 }, { name: 'Guardiano della Foresta', emoji: '🌲', th: 25 }];
            const LIMIT_TIPS = [['Inizia con un check-in appena sveglio', 'Usa il respiro prima di momenti impegnativi', 'Una piccola cosa alla volta è abbastanza'], ['Ascolta il tuo corpo al mattino', 'Respira prima di prendere decisioni', 'Celebra i piccoli progressi']];

            let state = { mood: 'ok', stage: 0, progress: 0, lastCheck: null, totalActions: 0, dailyActions: 0, lastActionDate: null, streak: 0, startDate: null, petName: 'Elfo', selectedMood: null };
            let settings = { theme: 'forest', vibrate: true, sound: true, tipsEnabled: true, breathRhythm: '4-4', dailyLimit: 10, privacyEnabled: false, ambientDefault: 'forest', musicEnabled: false, musicSoundscape: 'forest', musicVolume: 0.35 };
            let badges = {}, logs = [], currentSlide = 0;

            const els = {};

            // --- Audio Engine (WebAudio): suoni morbidi + soundscape (rain/waves/forest) ---
            const AudioEngine = (() => {
                let ctx = null;
                let master = null;
                let uiGain = null;
                let ambGain = null;
                let musicGain = null;
                let ambNodes = [];
                let musicNodes = [];
                let started = false;

                const ensure = async () => {
                    if (!ctx) {
                        const AC = window.AudioContext || window.webkitAudioContext;
                        ctx = new AC();
                        master = ctx.createGain(); master.gain.value = 0.95; master.connect(ctx.destination);
                        uiGain = ctx.createGain(); uiGain.gain.value = 0.12; uiGain.connect(master);
                        ambGain = ctx.createGain(); ambGain.gain.value = 0.22; ambGain.connect(master);
                        musicGain = ctx.createGain(); musicGain.gain.value = settings.musicVolume ?? 0.35; musicGain.connect(master);
                    }
                    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch(e){} }
                    started = true;
                };

                const stopNodes = (arr) => {
                    arr.forEach(n => { try{ n.stop?.(); }catch(e){} try{ n.disconnect?.(); }catch(e){} });
                    arr.length = 0;
                };

                const noise = () => {
                    const bufferSize = 2 * (ctx.sampleRate || 44100);
                    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
                    const src = ctx.createBufferSource();
                    src.buffer = buffer;
                    src.loop = true;
                    return src;
                };

                const uiChime = async (type='tap') => {
                    if (!settings.sound) return;
                    await ensure();
                    const t = ctx.currentTime;
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.type = 'sine';
                    const f0 = type==='success' ? 740 : type==='warn' ? 440 : 520;
                    o.frequency.setValueAtTime(f0, t);
                    o.frequency.exponentialRampToValueAtTime(f0*0.72, t+0.12);
                    g.gain.setValueAtTime(0.0001, t);
                    g.gain.exponentialRampToValueAtTime(0.10, t+0.02);
                    g.gain.exponentialRampToValueAtTime(0.0001, t+0.18);
                    o.connect(g); g.connect(uiGain);
                    o.start(t); o.stop(t+0.22);
                };

                const makeForest = () => {
                    // rumore + filtro + tremolo lieve (vento/foresta)
                    const src = noise();
                    const bp = ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
                    const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value = 1800; lp.Q.value = 0.3;
                    const lfo = ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value = 0.08;
                    const lfoG = ctx.createGain(); lfoG.gain.value = 240;
                    lfo.connect(lfoG); lfoG.connect(bp.frequency);
                    src.connect(bp); bp.connect(lp); lp.connect(ambGain);
                    src.start(); lfo.start();
                    ambNodes.push(src, bp, lp, lfo, lfoG);
                };

                const makeRain = () => {
                    const src = noise();
                    const hp = ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value = 900;
                    const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value = 4800;
                    const g = ctx.createGain(); g.gain.value = 0.6;
                    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(ambGain);
                    src.start();
                    ambNodes.push(src, hp, lp, g);
                };

                const makeWaves = () => {
                    const src = noise();
                    const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value = 900;
                    const shaper = ctx.createWaveShaper();
                    shaper.curve = new Float32Array([ -1,-0.6,-0.2,0.2,0.6,1 ]);
                    const lfo = ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value = 0.06;
                    const lfoG = ctx.createGain(); lfoG.gain.value = 0.45;
                    const g = ctx.createGain(); g.gain.value = 0.55;
                    lfo.connect(lfoG); lfoG.connect(g.gain);
                    src.connect(lp); lp.connect(shaper); shaper.connect(g); g.connect(ambGain);
                    src.start(); lfo.start();
                    ambNodes.push(src, lp, shaper, lfo, lfoG, g);
                };

                const setAmbient = async (kind='none') => {
                    await ensure();
                    stopNodes(ambNodes);
                    if (kind === 'none') return;
                    if (kind === 'rain') makeRain();
                    else if (kind === 'waves') makeWaves();
                    else makeForest();
                };

                const makeMusic = async (kind='forest') => {
                    await ensure();
                    stopNodes(musicNodes);
                    // pad morbido: 2 oscillatori detuned + filtro
                    const t = ctx.currentTime;
                    const o1 = ctx.createOscillator(); const o2 = ctx.createOscillator();
                    o1.type='sine'; o2.type='sine';
                    const base = kind==='waves' ? 174 : kind==='rain' ? 196 : 164;
                    o1.frequency.setValueAtTime(base, t);
                    o2.frequency.setValueAtTime(base*1.01, t);
                    const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value = 650; lp.Q.value = 0.4;
                    const g = ctx.createGain(); g.gain.value = 0.0001;
                    g.gain.exponentialRampToValueAtTime(0.22, t+1.2);
                    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(musicGain);
                    o1.start(); o2.start();
                    musicNodes.push(o1,o2,lp,g);
                };

                const setMusicOn = async (on) => {
                    await ensure();
                    if (!on) { stopNodes(musicNodes); return; }
                    await makeMusic(settings.musicSoundscape || 'forest');
                };

                const setMusicSoundscape = async (kind) => {
                    settings.musicSoundscape = kind;
                    if (settings.musicEnabled) await makeMusic(kind);
                };

                const setMusicVolume = async (v) => {
                    settings.musicVolume = v;
                    await ensure();
                    musicGain.gain.value = v;
                };

                return { ensure, uiChime, setAmbient, setMusicOn, setMusicSoundscape, setMusicVolume };
            })();

            function cacheElements() {
                els.app = document.getElementById('app');
                els.time = document.getElementById('time');
                els.quoteText = document.getElementById('quoteText');
                els.quoteAuthor = document.getElementById('quoteAuthor');
                els.stageBadge = document.getElementById('stageBadge');
                els.streakBadge = document.getElementById('streakBadge');
                els.petNameDisplay = document.getElementById('petNameDisplay');
                els.progressLevel = document.getElementById('progressLevel');
                els.progressCount = document.getElementById('progressCount');
                els.progressFill = document.getElementById('progressFill');
                els.pet = document.getElementById('pet');
                els.message = document.getElementById('message');
                els.petStatus = document.getElementById('petStatus');
                els.glowRing = document.getElementById('glowRing');
                els.tipToast = document.getElementById('tipToast');
                els.tipEmoji = document.getElementById('tipEmoji');
                els.tipText = document.getElementById('tipText');
                els.badgeToast = document.getElementById('badgeToast');
                els.badgeToastIcon = document.getElementById('badgeToastIcon');
                els.badgeToastTitle = document.getElementById('badgeToastTitle');
                els.badgeToastDesc = document.getElementById('badgeToastDesc');
                els.limitOverlay = document.getElementById('limitOverlay');
                els.limitTip1 = document.getElementById('limitTip1');
                els.limitTip2 = document.getElementById('limitTip2');
                els.limitTip3 = document.getElementById('limitTip3');
                els.breathingOverlay = document.getElementById('breathingOverlay');
                els.breathCircle = document.getElementById('breathCircle');
                els.breathLabel = document.getElementById('breathLabel');
                els.breathTimer = document.getElementById('breathTimer');
                els.breathPresets = document.getElementById('breathPresets');
                els.journeyOverlay = document.getElementById('journeyOverlay');
                els.journeyContent = document.getElementById('journeyContent');
                els.evolutionModal = document.getElementById('evolutionModal');
                els.evoStage = document.getElementById('evoStage');
                els.evoMessage = document.getElementById('evoMessage');
            }

            
            // --- Privacy: cifratura locale opzionale (PIN 4 cifre) ---
            const Privacy = (() => {
                let unlocked = false;
                let key = null;

                const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
                const ub64 = (str) => Uint8Array.from(atob(str), c => c.charCodeAt(0)).buffer;

                const deriveKey = async (pin, saltB64) => {
                    const salt = ub64(saltB64);
                    const enc = new TextEncoder();
                    const baseKey = await crypto.subtle.importKey('raw', enc.encode(pin), {name:'PBKDF2'}, false, ['deriveKey']);
                    return crypto.subtle.deriveKey(
                        {name:'PBKDF2', salt, iterations: 120000, hash:'SHA-256'},
                        baseKey,
                        {name:'AES-GCM', length:256},
                        false,
                        ['encrypt','decrypt']
                    );
                };

                const encrypt = async (pin, obj, saltB64=null) => {
                    const salt = saltB64 || b64(crypto.getRandomValues(new Uint8Array(16)));
                    const k = await deriveKey(pin, salt);
                    const iv = crypto.getRandomValues(new Uint8Array(12));
                    const enc = new TextEncoder().encode(JSON.stringify(obj));
                    const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, k, enc);
                    return { salt, iv: b64(iv), blob: b64(ct) };
                };

                const decrypt = async (pin, payload) => {
                    const k = await deriveKey(pin, payload.salt);
                    const iv = ub64(payload.iv);
                    const ct = ub64(payload.blob);
                    const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv: new Uint8Array(iv)}, k, ct);
                    const dec = new TextDecoder().decode(pt);
                    return { obj: JSON.parse(dec), key: k };
                };

                const isEnabled = () => {
                    try {
                        const meta = JSON.parse(localStorage.getItem(STORAGE.privacy) || 'null');
                        return !!(meta && meta.enabled);
                    } catch(e){ return false; }
                };

                const getMeta = () => {
                    try { return JSON.parse(localStorage.getItem(STORAGE.privacy) || 'null'); } catch(e){ return null; }
                };

                const setEnabled = async (pin) => {
                    // crea payload iniziale cifrato con dati attuali
                    const packed = { state, logs, settings: {...settings, privacyEnabled:true}, badges };
                    const payload = await encrypt(pin, packed);
                    localStorage.setItem(STORAGE.privacy, JSON.stringify({ enabled:true, salt: payload.salt }));
                    localStorage.setItem(STORAGE.secure, JSON.stringify(payload));
                    settings.privacyEnabled = true;
                    unlocked = true;
                    key = await deriveKey(pin, payload.salt);
                };

                const lock = () => { unlocked = false; key = null; };

                const tryUnlock = async (pin) => {
                    const payload = JSON.parse(localStorage.getItem(STORAGE.secure) || 'null');
                    if (!payload) throw new Error('No payload');
                    const { obj, key: kk } = await decrypt(pin, payload);
                    key = kk;
                    unlocked = true;
                    return obj;
                };

                const save = async (pin) => {
                    if (!settings.privacyEnabled) return;
                    const packed = { state, logs, settings, badges };
                    const meta = getMeta();
                    const payload = await encrypt(pin, packed, meta?.salt);
                    localStorage.setItem(STORAGE.secure, JSON.stringify(payload));
                };

                return { isEnabled, getMeta, setEnabled, lock, tryUnlock, save, get unlocked(){return unlocked;} };
            })();

            let _lastPin = null; // tenuto solo in memoria runtime

function loadData() {
                try {
                    // Privacy meta (non cifrato)
                    const meta = JSON.parse(localStorage.getItem(STORAGE.privacy) || 'null');
                    if (meta && meta.enabled) {
                        settings.privacyEnabled = true;
                        // mostra lock: i dati veri sono nel payload cifrato
                        showLockOverlay();
                        return;
                    }
                    // modalità standard (non cifrata)
                    const s = JSON.parse(localStorage.getItem(STORAGE.state) || 'null');
                    const l = JSON.parse(localStorage.getItem(STORAGE.logs) || 'null');
                    const se = JSON.parse(localStorage.getItem(STORAGE.settings) || 'null');
                    const b = JSON.parse(localStorage.getItem(STORAGE.badges) || 'null');
                    if (s) state = { ...state, ...s };
                    if (Array.isArray(l)) logs = l;
                    if (se) settings = { ...settings, ...se };
                    if (b) badges = b;
                } catch(e) { console.error(e); }
            }


            
function saveData() {
                try {
                    if (settings.privacyEnabled) {
                        if (_lastPin) Privacy.save(_lastPin);
                        return;
                    }
                    localStorage.setItem(STORAGE.state, JSON.stringify(state));
                    localStorage.setItem(STORAGE.logs, JSON.stringify(logs));
                    localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
                    localStorage.setItem(STORAGE.badges, JSON.stringify(badges));
                } catch(e) { console.error(e); }
            }


            function initStartDate() { if (!state.startDate) { state.startDate = Date.now(); saveData(); } }

            function checkNewDay() {
                const today = new Date().toDateString();
                const last = state.lastActionDate ? new Date(state.lastActionDate).toDateString() : null;
                if (today !== last) {
                    const y = new Date(); y.setDate(y.getDate()-1);
                    if (last === y.toDateString()) state.streak++;
                    else if (last !== today) state.streak = 0;
                    state.dailyActions = 0;
                    saveData();
                }
            }

            function updateTime() {
                const n = new Date();
                els.time.textContent = `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
            }

            function updateQuote() {
                const q = QUOTES[Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0)) / 86400000) % QUOTES.length];
                els.quoteText.textContent = `"${q.text}"`;
                els.quoteAuthor.textContent = `— ${q.author}`;
            }

            function getCurrentStage() {
                for (let i = STAGES.length-1; i >= 0; i--) if (state.progress >= STAGES[i].th) return i;
                return 0;
            }

            function updateUI() {
                const stage = getCurrentStage();
                els.stageBadge.textContent = STAGES[stage].emoji;
                els.pet.setAttribute('data-stage', stage);
                els.pet.setAttribute('data-mood', state.mood);
                els.petNameDisplay.textContent = state.petName;

                if (state.streak > 0) {
                    els.streakBadge.textContent = `🔥 ${state.streak}`;
                    els.streakBadge.classList.add('active');
                } else els.streakBadge.classList.remove('active');

                const next = STAGES[stage+1]?.th || state.progress;
                const prev = STAGES[stage].th;
                els.progressLevel.textContent = `Nv ${stage+1}`;
                els.progressCount.textContent = `${state.progress}/${next}`;
                els.progressFill.style.width = `${Math.min((state.progress-prev)/(next-prev)*100, 100)}%`;
           
                // Musica UI
                const mf = document.getElementById('musicFab');
                if (mf) mf.textContent = settings.musicEnabled ? '⏸' : '▶';
                // Mantieni volume slider coerente
                const slider = document.querySelector('#musicBanner input[type="range"]');
                if (slider) slider.value = settings.musicVolume ?? 0.35;

            }

            function rotateMessage() {
                if (document.querySelector('.modal.active, .breathing-overlay.active, .journey-overlay.active')) return;
                const msgs = els.pet.classList.contains('sleeping') ? MESSAGES.sleeping : (MESSAGES[state.mood] || MESSAGES.ok);
                els.message.textContent = msgs[Math.floor(Math.random()*msgs.length)];
            }

            function checkPetStatus() {
                const h = new Date().getHours();
                if (h >= 23 || h < 6) {
                    els.pet.classList.add('sleeping');
                    els.petStatus.textContent = '💤';
                } else {
                    els.pet.classList.remove('sleeping');
                    const hrs = (Date.now() - (state.lastCheck || state.startDate)) / 3600000;
                    els.petStatus.textContent = hrs > 8 && h >= 8 ? '🍃' : state.dailyActions > 0 ? '✨' : '';
                }
            }

            
function generateEnv() {
                // Stelle (tema night)
                const stars = document.getElementById('stars');
                if (stars && stars.children.length === 0) {
                    for (let i = 0; i < 24; i++) {
                        const s = document.createElement('div');
                        s.className = 'star';
                        s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*55}%;animation-delay:${Math.random()*3}s;opacity:${0.3+Math.random()*0.7}`;
                        stars.appendChild(s);
                    }
                }

                // Erba
                const grass = document.getElementById('grass');
                if (grass && grass.children.length === 0) {
                    for (let i = 0; i < 40; i++) {
                        const g = document.createElement('div');
                        g.className = 'grass-blade';
                        g.style.cssText = `height:${14+Math.random()*18}px;animation-delay:${Math.random()*2}s;opacity:${0.25+Math.random()*0.35}`;
                        grass.appendChild(g);
                    }
                }

                // Sagome foresta (sempre presenti ma leggere)
                const fl = document.getElementById('forestLayers');
                if (fl && fl.children.length === 0) {
                    const makeLayer = (cls, seed) => {
                        const wrap = document.createElement('div');
                        wrap.className = `tree-layer ${cls}`;
                        // SVG semplice: colline + alberi stilizzati
                        const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
                        svg.setAttribute('viewBox','0 0 1200 400');
                        const path = document.createElementNS('http://www.w3.org/2000/svg','path');
                        // pseudo random deterministico
                        const rnd = (n)=> {
                            const x = Math.sin((seed+n)*999)*10000;
                            return x - Math.floor(x);
                        };
                        let d = `M0,320 C120,${260+rnd(1)*60} 240,${320-rnd(2)*70} 360,${280+rnd(3)*70} C520,${220+rnd(4)*80} 700,${340-rnd(5)*60} 860,${280+rnd(6)*80} C980,${250+rnd(7)*70} 1100,${330-rnd(8)*70} 1200,300 L1200,400 L0,400 Z`;
                        path.setAttribute('d', d);
                        path.setAttribute('fill', 'currentColor');
                        svg.appendChild(path);
                        wrap.appendChild(svg);
                        fl.appendChild(wrap);
                    };
                    makeLayer('back', 1.7);
                    makeLayer('', 2.9);
                    makeLayer('front', 4.1);
                }

                // Particelle stagionali (più “foresta”)
                const se = document.getElementById('seasonalElements');
                if (se) se.innerHTML = '';
                const month = new Date().getMonth();
                const theme = settings.theme || 'forest';
                let elsArr = ['🍃','✨'];
                if (theme !== 'forest') {
                    elsArr = month >= 2 && month <= 4 ? ['🌸','🦋'] : month >= 5 && month <= 7 ? ['☀️','🌻'] : month >= 8 && month <= 10 ? ['🍂','🍁'] : ['❄️','⭐'];
                }
                if (se) {
                    for (let i = 0; i < 7; i++) {
                        const e = document.createElement('div');
                        e.className = 'season-particle';
                        e.textContent = elsArr[Math.floor(Math.random()*elsArr.length)];
                        e.style.cssText = `left:${Math.random()*100}%;animation-delay:${Math.random()*10}s;animation-duration:${8+Math.random()*4}s;opacity:${0.35+Math.random()*0.35}`;
                        se.appendChild(e);
                    }
                }

                // Lucciole (visibili in tema forest)
                const ff = document.getElementById('fireflies');
                if (ff && ff.children.length === 0) {
                    for (let i = 0; i < 10; i++) {
                        const f = document.createElement('div');
                        f.className = 'firefly';
                        f.style.cssText = `left:${Math.random()*100}%;top:${10+Math.random()*55}%;animation-delay:${Math.random()*6}s;animation-duration:${5+Math.random()*5}s`;
                        ff.appendChild(f);
                    }
                }
            }


            function showTip(cat) {
                if (!settings.tipsEnabled) return;
                const t = TIPS[cat] || TIPS.general;
                const tip = t[Math.floor(Math.random()*t.length)];
                els.tipEmoji.textContent = tip.e;
                els.tipText.textContent = tip.t;
                els.tipToast.classList.add('show');
                setTimeout(() => els.tipToast.classList.remove('show'), 4000);
            }
            function runFirstDemo() {
                try{
                    if (localStorage.getItem('aura_v3_demo') === 'true') return;
                    localStorage.setItem('aura_v3_demo','true');
                }catch(e){}

                const steps = [
                    { emoji:'🎧', text:'Prima volta: avvia la musica dal pulsante in basso (▶). Su iPhone serve un tap.' , pulse: () => document.getElementById('musicFab') },
                    { emoji:'✅', text:'Ora fai un Check‑in: scegli un mood e salva. È il “seme” della giornata.' , pulse: () => document.querySelectorAll('.action-btn')[0] },
                    { emoji:'🫧', text:'Prova “Calma”: 60 secondi di respiro guidato. Micro‑rituale, zero pressione.' , pulse: () => document.querySelectorAll('.action-btn')[1] },
                    { emoji:'🏅', text:'Guarda i badge quando vuoi: piccoli traguardi, non obiettivi.' , pulse: () => document.getElementById('badgesBtn') }
                ];

                let i = 0;
                const toast = document.getElementById('tipToast');
                const emo = document.getElementById('tipEmoji');
                const txt = document.getElementById('tipText');

                function clearPulse(){
                    document.querySelectorAll('.demo-pulse').forEach(el => el.classList.remove('demo-pulse'));
                }
                function pulse(el){
                    if(!el) return;
                    el.classList.add('demo-pulse');
                    setTimeout(() => el.classList.remove('demo-pulse'), 1400);
                }
                function show(){
                    if(i >= steps.length){ clearPulse(); return; }
                    const s = steps[i++];
                    if(emo) emo.textContent = s.emoji;
                    if(txt) txt.textContent = s.text;
                    if(toast){
                        toast.classList.add('show');
                        setTimeout(() => toast.classList.remove('show'), 3600);
                    }
                    try{ vibrate(18); }catch(_){}
                    clearPulse();
                    pulse(s.pulse());
                    setTimeout(show, 4200);
                }
                setTimeout(show, 500);
            }


            function showBadgeToast(b) {
                els.badgeToastIcon.textContent = b.icon;
                els.badgeToastTitle.textContent = b.name;
                els.badgeToastDesc.textContent = b.desc;
                els.badgeToast.classList.add('show');
                vibrate([100,50,100]);
                setTimeout(() => els.badgeToast.classList.remove('show'), 3000);
            }

            function vibrate(p = 50) {
                if (settings.vibrate && navigator.vibrate) navigator.vibrate(p);
            }
            function uiSound(type='tap'){ try{ AudioEngine.uiChime(type); }catch(e){} }

            function checkBadges() {
                BADGES_DEF.forEach(d => {
                    if (!badges[d.id] && d.cond(state, logs)) {
                        badges[d.id] = { at: Date.now(), seen: false };
                        showBadgeToast(d);
                        document.getElementById('badgesBtn')?.classList.add('has-new');
                    }
                });
                saveData();
            }

            function triggerGlow() {
                els.glowRing.classList.remove('active');
                void els.glowRing.offsetWidth;
                els.glowRing.classList.add('active');
            }

            function checkEvolution() {
                const ns = getCurrentStage();
                if (ns > state.stage) {
                    state.stage = ns;
                    showEvolution(ns);
                    return true;
                }
                return false;
            }

            function showEvolution(s) {
                els.evoStage.textContent = STAGES[s].emoji;
                els.evoMessage.textContent = `${state.petName} è ${STAGES[s].name.toLowerCase()}!`;
                els.evolutionModal.classList.add('active');
                vibrate([100,50,100,50,200]);
                setTimeout(() => {
                    els.evolutionModal.classList.remove('active');
                    updateUI();
                    checkBadges();
                }, 3500);
            }

            function petThePet() {
                if (els.pet.classList.contains('sleeping')) { showTip('general'); return; }
                els.pet.classList.add('happy');
                createHearts();
                vibrate([30,20,30]);
                if (Math.random() > 0.5) showTip('general');
                setTimeout(() => els.pet.classList.remove('happy'), 1000);
            }

            function createHearts() {
                const hearts = ['💝','💖','💗','💕'];
                for (let i = 0; i < 5; i++) {
                    const h = document.createElement('div');
                    h.className = 'heart-burst';
                    h.textContent = hearts[Math.floor(Math.random()*hearts.length)];
                    const a = (i/5)*Math.PI*2, d = 50+Math.random()*30;
                    h.style.cssText = `--tx:${Math.cos(a)*d}px;--ty:${Math.sin(a)*d-20}px;left:50%;top:50%`;
                    els.pet.appendChild(h);
                    setTimeout(() => h.remove(), 1000);
                }
            }

            function checkDailyLimit() {
                if (state.dailyActions >= settings.dailyLimit) {
                    showLimitOverlay();
                    return false;
                }
                return true;
            }

            function showLimitOverlay() {
                const tips = LIMIT_TIPS[Math.floor(Math.random()*LIMIT_TIPS.length)];
                els.limitTip1.textContent = tips[0];
                els.limitTip2.textContent = tips[1];
                els.limitTip3.textContent = tips[2];
                els.limitOverlay.classList.add('active');
                vibrate([50,30,50]);
            }

            function closeLimitOverlay() {
                els.limitOverlay.classList.remove('active');
            }

            function nextSlide() {
                const slides = document.querySelectorAll('.onboarding-slide');
                const dots = document.querySelectorAll('.onboarding-dot');
                if (currentSlide === 1) {
                    const n = document.getElementById('petNameInput').value.trim();
                    if (n) state.petName = n;
                }
                slides[currentSlide].classList.remove('active');
                dots[currentSlide].classList.remove('active');
                currentSlide++;
                slides[currentSlide].classList.add('active');
                dots[currentSlide].classList.add('active');
                vibrate(30);
            }

            function skipOnboarding() { completeOnboarding(); }

            function completeOnboarding() {
                const n = document.getElementById('petNameInput')?.value.trim() || 'Compagno';
                state.petName = n;
                localStorage.setItem(STORAGE.onboarding, 'true');
                document.getElementById('onboarding').classList.remove('active');
                saveData();
                updateUI();
                vibrate([30,20,30]);
                setTimeout(() => showTip('general'), 1000);
                            setTimeout(() => runFirstDemo(), 1400);
            }

            function selectMood(m) {
                state.selectedMood = m;
                document.querySelectorAll('.mood-btn').forEach(b => b.classList.toggle('selected', b.dataset.mood === m));
                document.getElementById('submitMoodBtn').disabled = false;
                document.getElementById('submitMoodBtn').textContent = 'Conferma';
                vibrate(20);
            }

            function openCheck() {
                if (!checkDailyLimit()) return;
                state.selectedMood = null;
                document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
                document.getElementById('journalInput').value = '';
                document.getElementById('gratitudeInput').value = '';
                document.getElementById('submitMoodBtn').disabled = true;
                document.getElementById('submitMoodBtn').textContent = 'Seleziona un mood';
                document.getElementById('checkModal').classList.add('active');
                uiSound('tap');
                showTip('check');
            }

            function submitCheck() {
                if (!state.selectedMood) return;
                checkNewDay();
                const note = document.getElementById('journalInput').value.trim();
                const grat = document.getElementById('gratitudeInput').value.trim();
                state.mood = state.selectedMood;
                state.lastCheck = Date.now();
                state.lastActionDate = Date.now();
                state.progress++;
                state.totalActions++;
                state.dailyActions++;
                logs.push({ ts: Date.now(), mood: state.selectedMood, action: 'check', note: note || undefined, gratitude: grat || undefined });
                els.pet.classList.add('happy');
                setTimeout(() => els.pet.classList.remove('happy'), 600);
                vibrate();
                triggerGlow();
                uiSound('success');
                saveData();
                document.getElementById('checkModal').classList.remove('active');
                if (!checkEvolution()) { updateUI(); checkBadges(); }
            }

            function openCalm() {
                if (!checkDailyLimit()) return;
                els.breathingOverlay.classList.add('active');
                els.breathPresets.style.display = 'flex';
                showTip('calm');
                uiSound('tap');
                AudioEngine.setAmbient(settings.ambientDefault || 'forest');
            }

            function setAmbient(s) {
                document.querySelectorAll('.ambient-btn').forEach(b => b.classList.toggle('active', b.dataset.sound === s));
                settings.ambientDefault = s;
                saveData();
                vibrate(20);
                uiSound('tap');
                AudioEngine.setAmbient(s);
            }

            function startBreath(dur) {
                els.breathPresets.style.display = 'none';
                const [inh, exh] = settings.breathRhythm.split('-').map(n => parseInt(n)*1000);
                let rem = dur, isIn = true;
                function cycle() {
                    if (rem <= 0) { completeBreath(); return; }
                    els.breathCircle.classList.remove('inhale','exhale');
                    setTimeout(() => {
                        if (isIn) {
                            els.breathCircle.classList.add('inhale');
                            els.breathLabel.textContent = 'IN';
                        } else {
                            els.breathCircle.classList.add('exhale');
                            els.breathLabel.textContent = 'OUT';
                            rem -= (inh + exh) / 1000;
                            els.breathTimer.textContent = Math.max(0, Math.ceil(rem)) + 's';
                        }
                        setTimeout(cycle, isIn ? inh : exh);
                        isIn = !isIn;
                    }, 100);
                }
                els.breathTimer.textContent = dur + 's';
                cycle();
            }

            function completeBreath() {
                checkNewDay();
                logs.push({ ts: Date.now(), action: 'calma' });
                state.progress += 2;
                state.totalActions++;
                state.dailyActions++;
                state.lastActionDate = Date.now();
                vibrate([50,100,50]);
                saveData();
                els.breathingOverlay.classList.remove('active');
                AudioEngine.setAmbient('none');
                uiSound('success');
                els.breathCircle.classList.remove('inhale','exhale');
                setTimeout(() => {
                    els.pet.classList.add('happy');
                    setTimeout(() => els.pet.classList.remove('happy'), 600);
                    triggerGlow();
                uiSound('success');
                    if (!checkEvolution()) { updateUI(); checkBadges(); }
                }, 300);
            }

            function closeBreath() {
                els.breathingOverlay.classList.remove('active');
                AudioEngine.setAmbient('none');
                uiSound('success');
                els.breathCircle.classList.remove('inhale','exhale');
            }

            function openFocus() {
                if (!checkDailyLimit()) return;
                document.getElementById('focusModal').classList.add('active');
                document.getElementById('focusTasks').classList.remove('hidden');
                document.getElementById('countdown').classList.add('hidden');
                showTip('focus');
            }

            function startTask(name) {
                document.getElementById('focusTasks').classList.add('hidden');
                document.getElementById('countdown').classList.remove('hidden');
                document.getElementById('focusTitle').textContent = name;
                let t = 10;
                document.getElementById('countdownDisplay').textContent = t;
                document.getElementById('countdownProgress').style.width = '100%';
                clearInterval(window.countdownInterval);
                window.countdownInterval = setInterval(() => {
                    t--;
                    document.getElementById('countdownDisplay').textContent = t;
                    document.getElementById('countdownProgress').style.width = (t/10*100)+'%';
                    if (t <= 0) clearInterval(window.countdownInterval);
                }, 1000);
            }

            function completeTask() {
                clearInterval(window.countdownInterval);
                checkNewDay();
                logs.push({ ts: Date.now(), action: 'focus' });
                state.progress++;
                state.totalActions++;
                state.dailyActions++;
                state.lastActionDate = Date.now();
                vibrate();
                saveData();
                document.getElementById('focusModal').classList.remove('active');
                setTimeout(() => {
                    els.pet.classList.add('happy');
                    setTimeout(() => els.pet.classList.remove('happy'), 600);
                    triggerGlow();
                uiSound('success');
                    if (!checkEvolution()) { updateUI(); checkBadges(); }
                }, 200);
            }

            function openStats() {
                genHeatmap();
                genChart();
                genPatterns();
                document.getElementById('statsModal').classList.add('active');
            }

            function switchStatsTab(tab) {
                document.querySelectorAll('.stats-tab').forEach((t,i) => t.classList.toggle('active', i===['weekly','patterns','export'].indexOf(tab)));
                document.querySelectorAll('.stats-panel').forEach((p,i) => p.classList.toggle('active', i===['weekly','patterns','export'].indexOf(tab)));
            }

            function genHeatmap() {
                const g = document.getElementById('heatmapGrid');
                g.innerHTML = '';
                ['L','M','M','G','V','S','D'].forEach(d => {
                    const l = document.createElement('div');
                    l.className = 'heatmap-day-label';
                    l.textContent = d;
                    g.appendChild(l);
                });
                for (let w = 3; w >= 0; w--) for (let d = 0; d < 7; d++) {
                    const date = new Date();
                    date.setDate(date.getDate() - (w*7 + (6-d)));
                    const ds = new Date(date.setHours(0,0,0,0)).getTime();
                    const cnt = logs.filter(l => l.ts >= ds && l.ts < ds + 86400000).length;
                    const lv = cnt === 0 ? 0 : cnt <= 2 ? 1 : cnt <= 4 ? 2 : cnt <= 6 ? 3 : 4;
                    const c = document.createElement('div');
                    c.className = 'heatmap-cell';
                    c.dataset.level = lv;
                    g.appendChild(c);
                }
            }

            function genChart() {
                const ch = document.getElementById('weeklyChart');
                ch.innerHTML = '';
                const days = ['L','M','M','G','V','S','D'];
                const cnts = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const ds = new Date(d.setHours(0,0,0,0)).getTime();
                    cnts.push(logs.filter(l => l.ts >= ds && l.ts < ds + 86400000).length);
                }
                const mx = Math.max(...cnts, 1);
                cnts.forEach((c,i) => {
                    const w = document.createElement('div');
                    w.className = 'chart-bar-wrapper';
                    w.innerHTML = `<div class="chart-bar-value">${c}</div><div class="chart-bar" style="height:${(c/mx)*80}px"></div><div class="chart-bar-label">${days[(new Date().getDay()+i)%7]}</div>`;
                    ch.appendChild(w);
                });
            }

            function genPatterns() {
                const p = document.getElementById('patternsPanel');
                const pts = [];
                const morn = logs.filter(l => l.action==='check' && new Date(l.ts).getHours()<12).length;
                const eve = logs.filter(l => l.action==='check' && new Date(l.ts).getHours()>=18).length;
                if (morn > eve*1.5) pts.push({i:'🌅',t:'Mattiniero',d:'Tendi a fare check al mattino.'});
                else if (eve > morn*1.5) pts.push({i:'🌙',t:'Serale',d:'Preferisci la sera per riflettere.'});
                if (state.streak >= 7) pts.push({i:'🔥',t:'Costanza',d:`${state.streak} giorni consecutivi!`});
                if (pts.length === 0) pts.push({i:'📈',t:'Continua',d:'Più dati = più insight.'});
                p.innerHTML = pts.map(x => `<div class="pattern-card"><div class="pattern-title"><span>${x.i}</span> ${x.t}</div><div class="pattern-text">${x.d}</div></div>`).join('');
            }

            function exportData() {
                const h = ['Data','Ora','Azione','Mood','Nota','Gratitudine'];
                const rows = logs.map(l => {
                    const d = new Date(l.ts);
                    return [d.toLocaleDateString('it-IT'), d.toLocaleTimeString('it-IT'), l.action, l.mood||'', l.note||'', l.gratitude||''].join(',');
                });
                const csv = [h.join(','), ...rows].join('\n');
                const blob = new Blob([csv], {type: 'text/csv'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `aura_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                vibrate(50);
            }

            function openBadges() {
                Object.keys(badges).forEach(id => badges[id].seen = true);
                document.getElementById('badgesBtn')?.classList.remove('has-new');
                saveData();
                const g = document.getElementById('badgesGrid');
                g.innerHTML = BADGES_DEF.map(d => {
                    const u = badges[d.id];
                    return `<div class="badge-item ${u?'':'locked'} ${u&&!u.seen?'new':''}">
                        <div class="badge-icon">${d.icon}</div>
                        <div class="badge-name">${d.name}</div>
                        <div class="badge-desc">${d.desc}</div>
                        ${u ? `<div class="badge-date">${new Date(u.at).toLocaleDateString('it-IT')}</div>` : ''}
                    </div>`;
                }).join('');
                document.getElementById('badgesModal').classList.add('active');
            }

            
            function showLockOverlay() {
                const ov = document.getElementById('lockOverlay');
                if (!ov) return;
                ov.classList.add('active');
                setTimeout(() => {
                    const i1 = document.getElementById('pin1');
                    i1 && i1.focus();
                    ['pin1','pin2','pin3','pin4'].forEach((id,idx) => {
                        const el = document.getElementById(id);
                        if (!el) return;
                        el.oninput = () => {
                            el.value = el.value.replace(/\D/g,'').slice(0,1);
                            const next = document.getElementById(['pin1','pin2','pin3','pin4'][idx+1]);
                            if (el.value && next) next.focus();
                        };
                    });
                }, 150);
            }
            function hideLockOverlay(){ document.getElementById('lockOverlay')?.classList.remove('active'); }

            function readPinInputs() {
                const p = ['pin1','pin2','pin3','pin4'].map(id => (document.getElementById(id)?.value || '').trim()).join('');
                return p.length===4 ? p : null;
            }

            async function unlock() {
                const pin = readPinInputs();
                if (!pin) { showTip('general'); uiSound('warn'); return; }
                try {
                    const obj = await Privacy.tryUnlock(pin);
                    _lastPin = pin;
                    state = { ...state, ...obj.state };
                    logs = Array.isArray(obj.logs) ? obj.logs : [];
                    settings = { ...settings, ...obj.settings, privacyEnabled:true };
                    badges = obj.badges || {};
                    hideLockOverlay();
                    render();
                    cacheElements();
                    updateUI();
                    if (!localStorage.getItem(STORAGE.onboarding)) document.getElementById('onboarding')?.classList.add('active');
                    uiSound('success');
                    vibrate([30,20,30]);
                } catch(e) {
                    uiSound('warn');
                    vibrate([80,60,80]);
                    ['pin1','pin2','pin3','pin4'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
                    document.getElementById('pin1')?.focus();
                }
            }

            async function enablePrivacyFlow() {
                const pin = prompt('Imposta un PIN di 4 cifre per proteggere i dati (solo locale).');
                if (!pin || !/^\d{4}$/.test(pin)) return;
                try {
                    _lastPin = pin;
                    await Privacy.setEnabled(pin);
                    settings.privacyEnabled = true;
                    localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
                    uiSound('success');
                    alert('Protezione attiva. Alla prossima apertura ti verrà chiesto il PIN.');
                } catch(e) { console.error(e); alert('Impossibile attivare la protezione su questo dispositivo.'); }
            }

            function disablePrivacyFlow() {
                if (!confirm('Disattivare la protezione? I dati torneranno in chiaro in locale.')) return;
                try {
                    const payload = JSON.parse(localStorage.getItem(STORAGE.secure) || 'null');
                    localStorage.removeItem(STORAGE.secure);
                    localStorage.removeItem(STORAGE.privacy);
                    settings.privacyEnabled = false;
                    _lastPin = null;
                    saveData();
                    alert('Protezione disattivata.');
                } catch(e) { console.error(e); }
            }

            // --- Mini player / Musica ---
            function toggleMusicPanel(forceClose=false){
                const b = document.getElementById('musicBanner');
                if(!b) return;
                if(forceClose) { b.classList.remove('active'); return; }
                b.classList.toggle('active');
                uiSound('tap');
                vibrate(15);
            }

            async function toggleMusic(){
                settings.musicEnabled = !settings.musicEnabled;
                await AudioEngine.setMusicOn(settings.musicEnabled);
                document.getElementById('musicFab')?.textContent = settings.musicEnabled ? '⏸' : '▶';
                // aggiorna banner testo/bottoni
                const b = document.getElementById('musicBanner');
                if(b) {
                    const ctl = b.querySelector('.music-ctl');
                    if(ctl) ctl.textContent = settings.musicEnabled ? 'Pausa' : 'Play';
                }
                uiSound(settings.musicEnabled?'success':'tap');
                saveData();
            }

            async function setMusicSoundscape(kind){
                settings.musicSoundscape = kind;
                await AudioEngine.setMusicSoundscape(kind);
                document.querySelectorAll('#musicBanner .chip-btn').forEach(btn => btn.classList.remove('active'));
                const map={forest:0,rain:1,waves:2};
                const idx=map[kind]??0;
                document.querySelectorAll('#musicBanner .chip-btn')[idx]?.classList.add('active');
                uiSound('tap');
                saveData();
            }

            async function setMusicVolume(v){
                const val = Math.max(0, Math.min(0.8, parseFloat(v)));
                settings.musicVolume = val;
                await AudioEngine.setMusicVolume(val);
                saveData();
            }



function openSettings() {
                document.getElementById('settingsModal').classList.add('active');
                document.getElementById('vibrateToggle')?.classList.toggle('active', !!settings.vibrate);
                document.getElementById('soundToggle')?.classList.toggle('active', !!settings.sound);
                document.getElementById('tipsToggle')?.classList.toggle('active', !!settings.tipsEnabled);
                document.getElementById('privacyToggle')?.classList.toggle('active', !!settings.privacyEnabled);
                document.getElementById('breathRhythm').value = settings.breathRhythm;
                document.getElementById('dailyLimit').value = settings.dailyLimit;
                document.querySelectorAll('.theme-option').forEach(o => o.classList.toggle('active', o.dataset.theme === settings.theme));
                uiSound('tap');
            }


            function setTheme(t) {
                settings.theme = t;
                document.getElementById('app').setAttribute('data-theme', t);
                generateEnv();
                document.querySelectorAll('.theme-option').forEach(o => o.classList.toggle('active', o.dataset.theme === t));
                saveData();
                vibrate(30);
            }

            function toggleVibrate() { settings.vibrate = !settings.vibrate; document.getElementById('vibrateToggle').classList.toggle('active'); saveData(); if (settings.vibrate) vibrate(); }
            function toggleSound() { settings.sound = !settings.sound; document.getElementById('soundToggle').classList.toggle('active'); saveData(); vibrate(30); uiSound(settings.sound?'success':'tap'); AudioEngine.ensure(); }
            function toggleTips() { settings.tipsEnabled = !settings.tipsEnabled; document.getElementById('tipsToggle').classList.toggle('active'); saveData(); vibrate(30); }
            function changeBreathRhythm() { settings.breathRhythm = document.getElementById('breathRhythm').value; saveData(); vibrate(30); }
            function changeDailyLimit() { settings.dailyLimit = parseInt(document.getElementById('dailyLimit').value); saveData(); vibrate(30); }

            function resetData() {
                if (confirm('Cancellare tutti i dati?')) {
                    localStorage.clear();
                    vibrate([100,50,100]);
                    setTimeout(() => location.reload(), 300);
                }
            }

            function openJourney() {
                const today = new Date().setHours(0,0,0,0);
                const tLogs = logs.filter(l => l.ts >= today).sort((a,b) => a.ts - b.ts);
                const days = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
                const now = new Date();
                let html = `<div class="journey-date">${days[now.getDay()]} ${now.getDate()}</div>`;
                if (tLogs.length === 0) {
                    html += `<div class="journey-empty"><div class="journey-empty-icon">🌱</div><div class="journey-empty-text">Nessun passo oggi.<br>Inizia con un check-in.</div></div>`;
                } else {
                    html += '<div class="journey-timeline">';
                    const am = { check:{i:'✅',l:'Check-in'}, calma:{i:'🫧',l:'Respiro'}, focus:{i:'🎯',l:'Focus'} };
                    const mm = {ok:'Ok',tense:'Teso',tired:'Stanco',down:'Giù'};
                    tLogs.forEach((l,i) => {
                        const t = new Date(l.ts);
                        const a = am[l.action] || {i:'✨',l:l.action};
                        html += `<div class="journey-item" data-i="${i}">
                            <div class="journey-item-time">${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}</div>
                            <div class="journey-item-content">
                                <div class="journey-item-action"><span>${a.i}</span><span>${a.l}</span></div>
                                ${l.mood ? `<div class="journey-item-mood">Mood: ${mm[l.mood]}</div>` : ''}
                                ${l.note ? `<div class="journey-item-note">"${l.note}"</div>` : ''}
                                ${l.gratitude ? `<div class="journey-item-note">🌟 ${l.gratitude}</div>` : ''}
                            </div>
                        </div>`;
                    });
                    html += '</div>';
                    const checks = tLogs.filter(l=>l.action==='check');
                    const calmas = tLogs.filter(l=>l.action==='calma');
                    const moods = checks.map(c=>c.mood);
                    const tense = moods.filter(m=>m==='tense'||m==='down').length;
                    let advice = tense > moods.length/2 && calmas.length===0 ? 'Giornata intensa. Prova il respiro domani.' : calmas.length >= 2 ? 'Ottimo lavoro con il respiro!' : 'Ogni passo conta.';
                    html += `<div class="journey-summary"><div class="journey-summary-title"><span>🌙</span> Per domani</div><div class="journey-advice">${advice}</div></div>`;
                }
                els.journeyContent.innerHTML = html;
                els.journeyOverlay.classList.add('active');
                setTimeout(() => document.querySelectorAll('.journey-item').forEach((it,i) => setTimeout(() => it.classList.add('visible'), i*150)), 200);
                vibrate(30);
            }

            function closeJourney() {
                els.journeyOverlay.classList.remove('active');
            }

            function render() {
                const appEl = document.getElementById('app');
                appEl.innerHTML = `
                    <div class="onboarding" id="onboarding">
                        <button class="onboarding-skip" onclick="app.skipOnboarding()">Salta</button>
                        <div class="onboarding-slide active" data-slide="0">
                            <div class="onboarding-icon">🧝‍♂️</div>
                            <div class="onboarding-title">Benvenuto nella Foresta di AURA</div>
                            <div class="onboarding-text">Un elfo gentile ti accompagna con rituali brevi: respiro, focus e piccoli consigli. Nessun dato esce dal tuo telefono.</div>
                            <div class="onboarding-dots"><div class="onboarding-dot active"></div><div class="onboarding-dot"></div><div class="onboarding-dot"></div><div class="onboarding-dot"></div></div>
                            <button class="onboarding-btn" onclick="app.nextSlide()">Continua</button>
                        </div>
                        <div class="onboarding-slide" data-slide="1">
                            <div class="onboarding-icon">🎒</div>
                            <div class="onboarding-title">Come lo chiami?</div>
                            <div class="onboarding-text">Dai un nome al tuo compagno. Crescerà insieme a te.</div>
                            <input type="text" class="onboarding-input" id="petNameInput" placeholder="Nome..." maxlength="12">
                            <div class="onboarding-dots"><div class="onboarding-dot"></div><div class="onboarding-dot active"></div><div class="onboarding-dot"></div><div class="onboarding-dot"></div></div>
                            <button class="onboarding-btn" onclick="app.nextSlide()">Continua</button>
                        </div>
                        <div class="onboarding-slide" data-slide="2">
                            <div class="onboarding-icon">🫧</div>
                            <div class="onboarding-title">Respira & Focus</div>
                            <div class="onboarding-text">Quando tutto è troppo, respira. Una piccola azione alla volta con Focus.</div>
                            <div class="onboarding-dots"><div class="onboarding-dot"></div><div class="onboarding-dot"></div><div class="onboarding-dot active"></div><div class="onboarding-dot"></div></div>
                            <button class="onboarding-btn" onclick="app.nextSlide()">Continua</button>
                        </div>
                        <div class="onboarding-slide" data-slide="3">
                            <div class="onboarding-icon">🏆</div>
                            <div class="onboarding-title">Sblocca badge</div>
                            <div class="onboarding-text">Guadagna badge per i tuoi progressi. Rivedi statistiche e scopri i tuoi pattern.</div>
                            <div class="onboarding-dots"><div class="onboarding-dot"></div><div class="onboarding-dot"></div><div class="onboarding-dot"></div><div class="onboarding-dot active"></div></div>
                            <button class="onboarding-btn" onclick="app.completeOnboarding()">Inizia</button>
                        </div>
                    </div>

                    <div class="tip-toast" id="tipToast"><span id="tipEmoji">💡</span><span id="tipText"></span></div>
                    <div class="badge-toast" id="badgeToast"><div class="badge-toast-icon" id="badgeToastIcon">🏆</div><div class="badge-toast-title" id="badgeToastTitle"></div><div class="badge-toast-desc" id="badgeToastDesc"></div></div>
                    <div class="limit-overlay" id="limitOverlay"><div class="limit-card"><div class="limit-icon">🌙</div><div class="limit-title">Hai fatto abbastanza</div><div class="limit-text">Oggi hai raggiunto il tuo limite.</div><div class="limit-tips"><div class="limit-tips-title"><span>🌿</span> Per domani</div><div class="limit-tip-item"><span>•</span><span id="limitTip1"></span></div><div class="limit-tip-item"><span>•</span><span id="limitTip2"></span></div><div class="limit-tip-item"><span>•</span><span id="limitTip3"></span></div></div><button class="limit-close-btn" onclick="app.closeLimitOverlay()">Ho capito</button></div></div>

                    <div class="header">
                        <div class="header-left">
                            <div class="header-time" id="time">--:--</div>
                            <div class="stage-badge" id="stageBadge">🌱</div>
                            <div class="streak-badge" id="streakBadge">🔥 0</div>
                        </div>
                        <div class="header-right">
                            <button class="header-btn" onclick="app.toggleMusicPanel()">🎵</button>
                            <button class="header-btn" id="badgesBtn" onclick="app.openBadges()">🏆</button>
                            <button class="header-btn" onclick="app.openStats()">📊</button>
                            <button class="header-btn" onclick="app.openSettings()">⚙️</button>
                        </div>
                    </div>

                    <div class="daily-quote"><div class="quote-card"><div class="quote-text" id="quoteText"></div><div class="quote-author" id="quoteAuthor"></div></div></div>

                    <div class="scene">
                        <div class="background"><div class="sky"></div><div class="stars" id="stars"></div><div class="forest-layers" id="forestLayers"></div><div class="fireflies" id="fireflies"></div><div class="ground"></div><div class="seasonal-elements" id="seasonalElements"></div></div>
                        <div class="grass" id="grass"></div>
                        <div class="progress-display">
                            <div style="display:flex;gap:5px"><span id="progressLevel">Nv 1</span><span id="progressCount">0/10</span></div>
                            <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
                        </div>
                        <div class="pet-container">
                            <div class="pet-name" id="petNameDisplay">${state.petName}</div>
                            <div class="pet-wrapper" onclick="app.petThePet()">
                                <div class="pet-status" id="petStatus"></div>
                                <div class="pet" id="pet" data-stage="${state.stage}" data-mood="${state.mood}">
                                    <div class="glow-ring" id="glowRing"></div><div class="elf-hat"><div class="elf-hat-tip"></div></div>
                                    <div class="pet-shadow"></div>
                                    <div class="pet-ears"><div class="pet-ear left"></div><div class="pet-ear right"></div></div>
                                    <div class="pet-body"><div class="pet-highlight"></div><div class="pet-cheeks"><div class="pet-cheek"></div><div class="pet-cheek"></div></div></div>
                                    <div class="pet-eyes"><div class="pet-eye"></div><div class="pet-eye"></div></div>
                                    <div class="pet-mouth"></div>
                                    <div class="zzz">💤</div>
                                </div>
                            </div>
                            <div class="message" id="message">ci sono.</div>
                        </div>
                    </div>

                    <div class="actions">
                        <button class="action-btn ${state.dailyActions >= settings.dailyLimit ? 'disabled' : ''}" onclick="app.openCheck()"><div class="action-icon">✅</div><div class="action-label">Check</div></button>
                        <button class="action-btn ${state.dailyActions >= settings.dailyLimit ? 'disabled' : ''}" onclick="app.openCalm()"><div class="action-icon">🫧</div><div class="action-label">Calma</div></button>
                        <button class="action-btn ${state.dailyActions >= settings.dailyLimit ? 'disabled' : ''}" onclick="app.openFocus()"><div class="action-icon">🎯</div><div class="action-label">Focus</div></button>
                    </div>

                    <div class="bottom-nav">
                        <button class="nav-btn" onclick="app.openJourney()" ${logs.filter(l=>l.ts>=new Date().setHours(0,0,0,0)).length===0?'disabled':''}><span>📜</span><span>I miei passi</span></button>
                    </div>

                    <button class="music-fab" id="musicFab" onclick="app.toggleMusic()">▶</button>
                    <div class="music-banner" id="musicBanner">
                        <div class="music-row">
                            <div>
                                <div class="music-title">Soundscape</div>
                                <div style="font-size:12px;font-weight:700">${settings.musicEnabled?'In riproduzione':'Pronto'}</div>
                            </div>
                            <div class="music-chip">
                                <button class="chip-btn ${settings.musicSoundscape==='forest'?'active':''}" onclick="app.setMusicSoundscape('forest')">🌲</button>
                                <button class="chip-btn ${settings.musicSoundscape==='rain'?'active':''}" onclick="app.setMusicSoundscape('rain')">🌧️</button>
                                <button class="chip-btn ${settings.musicSoundscape==='waves'?'active':''}" onclick="app.setMusicSoundscape('waves')">🌊</button>
                            </div>
                        </div>
                        <div class="music-slider"><input type="range" min="0" max="0.8" step="0.01" value="${settings.musicVolume}" oninput="app.setMusicVolume(this.value)"></div>
                        <div class="music-actions">
                            <button class="music-ctl" onclick="app.toggleMusic()">${settings.musicEnabled?'Pausa':'Play'}</button>
                            <button class="music-close" onclick="app.toggleMusicPanel(true)">Chiudi</button>
                        </div>
                    </div>

                    <div class="lock-overlay" id="lockOverlay">
                        <div class="lock-card">
                            <div class="lock-icon">🔒</div>
                            <div class="lock-title">AURA è protetta</div>
                            <div class="lock-text">Inserisci il PIN per sbloccare i tuoi dati locali.</div>
                            <div class="lock-pin">
                                <input inputmode="numeric" maxlength="1" id="pin1">
                                <input inputmode="numeric" maxlength="1" id="pin2">
                                <input inputmode="numeric" maxlength="1" id="pin3">
                                <input inputmode="numeric" maxlength="1" id="pin4">
                            </div>
                            <button class="lock-btn" onclick="app.unlock()">Sblocca</button>
                            <div class="lock-hint">Nessun dato viene inviato online.</div>
                        </div>
                    </div>

                    <div class="modal" id="checkModal">
                        <div class="modal-content">
                            <div class="modal-handle"></div>
                            <div class="modal-title">Come stai?</div>
                            <div class="mood-options">
                                <button class="mood-btn" data-mood="ok"><div class="mood-emoji">😌</div><div class="mood-label">ok</div></button>
                                <button class="mood-btn" data-mood="tense"><div class="mood-emoji">😣</div><div class="mood-label">teso</div></button>
                                <button class="mood-btn" data-mood="tired"><div class="mood-emoji">😴</div><div class="mood-label">stanco</div></button>
                                <button class="mood-btn" data-mood="down"><div class="mood-emoji">😔</div><div class="mood-label">giù</div></button>
                            </div>
                            <div class="journal-section">
                                <div class="journal-label">✏️ Un pensiero</div>
                                <textarea class="journal-input" id="journalInput" placeholder="Cosa ti passa per la mente?"></textarea>
                            </div>
                            <div class="gratitude-section">
                                <div class="journal-label">🌟 Gratitudine</div>
                                <input type="text" class="gratitude-input" id="gratitudeInput" placeholder="Oggi sono grato per...">
                            </div>
                            <button class="submit-mood-btn" id="submitMoodBtn" onclick="app.submitCheck()" disabled>Seleziona un mood</button>
                        </div>
                    </div>

                    <div class="modal" id="statsModal">
                        <div class="modal-content">
                            <div class="modal-handle"></div>
                            <div class="modal-title">Statistiche</div>
                            <div class="stats-tabs">
                                <button class="stats-tab active" onclick="app.switchStatsTab('weekly')">Settimana</button>
                                <button class="stats-tab" onclick="app.switchStatsTab('patterns')">Pattern</button>
                                <button class="stats-tab" onclick="app.switchStatsTab('export')">Export</button>
                            </div>
                            <div class="stats-panel active" id="weeklyPanel">
                                <div class="heatmap-container">
                                    <div class="heatmap-title">📅 Attività</div>
                                    <div class="heatmap-grid" id="heatmapGrid"></div>
                                    <div class="heatmap-legend"><span>Meno</span><div class="heatmap-legend-cell" style="background:var(--accent-light)"></div><div class="heatmap-legend-cell" style="background:rgba(168,212,184,.5)"></div><div class="heatmap-legend-cell" style="background:var(--calm)"></div><span>Più</span></div>
                                </div>
                                <div class="chart-container">
                                    <div class="chart-title">📊 Azioni/giorno</div>
                                    <div class="chart-bars" id="weeklyChart"></div>
                                </div>
                            </div>
                            <div class="stats-panel" id="patternsPanel"></div>
                            <div class="stats-panel" id="exportPanel">
                                <div class="pattern-card">
                                    <div class="pattern-title">📁 Esporta dati</div>
                                    <div class="pattern-text">Scarica i tuoi check-in in CSV.</div>
                                </div>
                                <button class="export-btn" onclick="app.exportData()"><span>📥</span> Scarica</button>
                            </div>
                        </div>
                    </div>

                    <div class="modal" id="badgesModal">
                        <div class="modal-content">
                            <div class="modal-handle"></div>
                            <div class="modal-title">I tuoi badge</div>
                            <div class="badges-grid" id="badgesGrid"></div>
                        </div>
                    </div>

                    <div class="modal" id="settingsModal">
                        <div class="modal-content">
                            <div class="modal-handle"></div>
                            <div class="modal-title">Impostazioni</div>
                            <div class="setting-group">
                                <div class="setting-group-title">Aspetto</div>
                                <div class="setting-item">
                                    <div class="setting-label">Tema</div>
                                    <div class="theme-picker">
                                        <div class="theme-option ${settings.theme==='day'?'active':''}" data-theme="day" onclick="app.setTheme('day')"></div>
                                        <div class="theme-option ${settings.theme==='night'?'active':''}" data-theme="night" onclick="app.setTheme('night')"></div>
                                        <div class="theme-option ${settings.theme==='ocean'?'active':''}" data-theme="ocean" onclick="app.setTheme('ocean')"></div>
                                        <div class="theme-option ${settings.theme==='forest'?'active':''}" data-theme="forest" onclick="app.setTheme('forest')"></div>
                                        <div class="theme-option ${settings.theme==='sunset'?'active':''}" data-theme="sunset" onclick="app.setTheme('sunset')"></div>
                                        <div class="theme-option ${settings.theme==='lavender'?'active':''}" data-theme="lavender" onclick="app.setTheme('lavender')"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="setting-group">
                                <div class="setting-group-title">Preferenze</div>
                                <div class="setting-item">
                                    <div class="setting-label">Vibrazione</div>
                                    <div class="toggle ${settings.vibrate?'active':''}" id="vibrateToggle" onclick="app.toggleVibrate()"><div class="toggle-knob"></div></div>
                                </div>
                                <div class="setting-item">
                                    <div class="setting-label">Suoni</div>
                                    <div class="toggle ${settings.sound?'active':''}" id="soundToggle" onclick="app.toggleSound()"><div class="toggle-knob"></div></div>
                                </div>
                                <div class="setting-item">
                                    <div class="setting-label">Consigli</div>
                                    <div class="toggle ${settings.tipsEnabled?'active':''}" id="tipsToggle" onclick="app.toggleTips()"><div class="toggle-knob"></div></div>
                                </div>
                                </div>
                            <div class="setting-group">
                                <div class="setting-group-title">Respiro</div>
                                <div class="setting-item">
                                    <div class="setting-label">Ritmo</div>
                                    <select class="setting-select" id="breathRhythm" onchange="app.changeBreathRhythm()">
                                        <option value="4-4">4-4</option>
                                        <option value="4-6">4-6</option>
                                        <option value="5-5">5-5</option>
                                    </select>
                                </div>
                            </div>
                            <div class="setting-group">
                                <div class="setting-group-title">Limiti</div>
                                <div class="setting-item">
                                    <div class="setting-label">Azioni/giorno</div>
                                    <select class="setting-select" id="dailyLimit" onchange="app.changeDailyLimit()">
                                        <option value="10">10</option>
                                        <option value="15">15</option>
                                        <option value="20">20</option>
                                        <option value="999">∞</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="setting-group">
                                <div class="setting-group-title">Privacy</div>
                                <div class="setting-item">
                                    <div class="setting-label">Protezione dati (PIN)</div>
                                    <div class="toggle ${settings.privacyEnabled?'active':''}" id="privacyToggle" onclick="${settings.privacyEnabled?'app.disablePrivacyFlow()':'app.enablePrivacyFlow()'}"><div class="toggle-knob"></div></div>
                                </div>
                                <div style="font-size:12px;color:var(--text-dim);line-height:1.4;margin-top:8px">
                                    Dati solo sul dispositivo. Se attivi il PIN, vengono cifrati in locale (AES‑GCM) e AURA chiede il PIN all’avvio.
                                </div>
                            </div>

                            <button class="reset-btn" onclick="app.resetData()">Reset dati</button>
                        </div>
                    </div>

                    <div class="modal" id="focusModal">
                        <div class="modal-content">
                            <div class="modal-handle"></div>
                            <div class="modal-title" id="focusTitle">Una cosa</div>
                            <div class="focus-tasks" id="focusTasks">
                                <button class="task-btn" onclick="app.startTask('Email')"><span>📩</span> Email</button>
                                <button class="task-btn" onclick="app.startTask('Spesa')"><span>🧾</span> Spesa</button>
                                <button class="task-btn" onclick="app.startTask('Studio')"><span>🧠</span> Studio</button>
                                <button class="task-btn" onclick="app.startTask('Altro')"><span>✨</span> Altro</button>
                            </div>
                            <div class="countdown hidden" id="countdown">
                                <div class="countdown-display" id="countdownDisplay">10</div>
                                <div class="countdown-bar"><div class="countdown-progress" id="countdownProgress"></div></div>
                                <button class="done-btn" onclick="app.completeTask()">Finito</button>
                            </div>
                        </div>
                    </div>

                    <div class="breathing-overlay" id="breathingOverlay">
                        <button class="close-breath" onclick="app.closeBreath()">×</button>
                        <div class="ambient-section">
                            <div class="ambient-label">🎵 Suono</div>
                            <div class="ambient-btns">
                                <button class="ambient-btn active" data-sound="none" onclick="app.setAmbient('none')">🔇</button>
                                <button class="ambient-btn" data-sound="rain" onclick="app.setAmbient('rain')">🌧️</button>
                                <button class="ambient-btn" data-sound="waves" onclick="app.setAmbient('waves')">🌊</button>
                                <button class="ambient-btn" data-sound="forest" onclick="app.setAmbient('forest')">🌲</button>
                            </div>
                        </div>
                        <div class="breath-circle" id="breathCircle"></div>
                        <div class="breath-label" id="breathLabel">IN</div>
                        <div class="breath-timer" id="breathTimer">--</div>
                        <div class="breath-presets" id="breathPresets">
                            <button class="preset-btn" onclick="app.startBreath(30)">30s</button>
                            <button class="preset-btn" onclick="app.startBreath(60)">60s</button>
                            <button class="preset-btn" onclick="app.startBreath(90)">90s</button>
                        </div>
                    </div>

                    <div class="journey-overlay" id="journeyOverlay">
                        <div class="journey-header">
                            <div class="journey-title">I tuoi passi</div>
                            <button class="journey-close" onclick="app.closeJourney()">×</button>
                        </div>
                        <div class="journey-content" id="journeyContent"></div>
                    </div>

                    <div class="evolution-modal" id="evolutionModal">
                        <div class="evolution-content">
                            <div class="evolution-title">✨ EVOLUZIONE! ✨</div>
                            <div class="evolution-stage" id="evoStage">🌿</div>
                            <div class="evolution-message" id="evoMessage"></div>
                        </div>
                    </div>
                `;
                cacheElements();
                document.querySelectorAll('.mood-btn').forEach(b => b.addEventListener('click', () => selectMood(b.dataset.mood)));
                cacheElements();
                updateUI();
                document.querySelectorAll('.mood-btn').forEach(b => b.addEventListener('click', () => selectMood(b.dataset.mood)));
                document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', (e) => {
                    if (e.target === m) m.classList.remove('active');
                }));
            }

            
function init() {
                loadData();
                initStartDate();
                checkNewDay();
                render();
                cacheElements();
                document.getElementById('app').setAttribute('data-theme', settings.theme || 'forest');
                generateEnv();
                updateQuote();
                updateTime();
                if (Privacy.isEnabled()) {
                    // dati cifrati: richiede PIN
                    showLockOverlay();
                } else {
                    updateUI();
                    checkPetStatus();
                    if (!localStorage.getItem(STORAGE.onboarding)) document.getElementById('onboarding').classList.add('active');
                }

                setInterval(updateTime, 1000);
                setInterval(rotateMessage, 18000);
                setInterval(checkPetStatus, 60000);
            }


            return {
                init, nextSlide, skipOnboarding, completeOnboarding, openCheck, submitCheck, openCalm, closeBreath, startBreath, setAmbient,
                openFocus, startTask, completeTask, petThePet, openStats, switchStatsTab, exportData, openBadges, openSettings,
                setTheme, toggleVibrate, toggleSound, toggleTips, changeBreathRhythm, changeDailyLimit, resetData,
                openJourney, closeJourney, closeLimitOverlay, selectMood,
                toggleMusicPanel, toggleMusic, setMusicSoundscape, setMusicVolume,
                unlock, enablePrivacyFlow, disablePrivacyFlow
            };
        })();

        document.addEventListener('DOMContentLoaded', app.init);
    </script>

<style>
/* PWA + audio controls (v3.3.0) — softer + no fixed tone */
#aura-audio-fab{
  position:fixed;
  right: max(14px, env(safe-area-inset-right));
  bottom: max(14px, env(safe-area-inset-bottom));
  z-index: 9999;
  display:flex;
  align-items:flex-end;
  gap:10px;
  font-family:inherit;
  touch-action:none; /* drag */
}
#aura-audio-fab-btn{
  all:unset;
  width:52px; height:52px;
  border-radius:16px;
  display:grid; place-items:center;
  cursor:pointer;
  background: linear-gradient(135deg, var(--accent-light), var(--accent));
  box-shadow: 0 12px 26px rgba(61,46,31,.18);
  border:1px solid rgba(61,46,31,.10);
  color: var(--text);
  user-select:none;
}
#aura-audio-fab-btn:active{transform:scale(.96)}
#aura-audio-panel{
  width: min(320px, calc(100vw - 110px));
  border-radius: 18px;
  background: rgba(255,251,247,.88);
  border:1px solid rgba(61,46,31,.10);
  box-shadow: 0 16px 42px rgba(61,46,31,.20);
  padding: 10px 10px 10px;
  display:none;
  backdrop-filter: blur(10px);
}
#aura-audio-panel.open{display:block; animation:fadeIn .18s ease}
#aura-audio-panel .row{display:flex; align-items:center; justify-content:space-between; gap:10px}
#aura-audio-panel .title{font-weight:800; font-size:12px; color: var(--text)}
#aura-audio-panel .sub{font-size:11px;color:var(--text-dim);margin-top:2px}
#aura-audio-panel .ctrl{display:flex; gap:8px; align-items:center; margin-top:10px}
#aura-audio-toggle{
  all:unset; cursor:pointer;
  height:38px; padding:0 12px;
  border-radius: 14px;
  border:1px solid rgba(61,46,31,.12);
  background: rgba(255,255,255,.55);
  font-weight:900;
  color: var(--text);
}
#aura-audio-toggle:active{transform:scale(.985)}
#aura-audio-select{
  flex:1;
  height:38px;
  border-radius:14px;
  border:1px solid rgba(61,46,31,.12);
  background: rgba(255,255,255,.55);
  color: var(--text);
  padding:0 10px;
  font-weight:800;
  outline:none;
}
#aura-audio-volume{
  width:100%;
}
#aura-audio-mini{
  all:unset; cursor:pointer;
  height:34px; padding:0 10px;
  border-radius: 12px;
  border:1px solid rgba(61,46,31,.10);
  background: rgba(255,255,255,.45);
  font-weight:800;
  color: var(--text-dim);
  font-size:12px;
}
#aura-audio-panel.is-hidden{display:none}

        /* --- AURA 3.4: Foresta + Elfo + Mini Player + Privacy --- */
        .forest-layers{position:absolute;inset:0;pointer-events:none;overflow:hidden}
        .tree-layer{position:absolute;bottom:0;width:120%;left:-10%;height:55%;opacity:.18;filter:blur(0px)}
        .tree-layer.back{height:70%;opacity:.10;transform:translateY(6px)}
        .tree-layer.front{height:50%;opacity:.22}
        .tree-layer svg{width:100%;height:100%}
        .fireflies{position:absolute;inset:0;pointer-events:none;opacity:.0;transition:opacity 1s}
        [data-theme=forest] .fireflies{opacity:.55}
        .firefly{position:absolute;width:6px;height:6px;border-radius:50%;background:radial-gradient(circle,#fff,rgba(255,255,255,0) 70%);filter:drop-shadow(0 0 10px rgba(255,255,255,.8));animation:fly 6s ease-in-out infinite}
        @keyframes fly{0%{transform:translate(0,0);opacity:.2}30%{opacity:1}60%{transform:translate(24px,-18px)}100%{transform:translate(0,0);opacity:.2}}

        /* Elf skin: usa la struttura esistente del pet */
        .pet[data-stage="1"] .pet-body{background:linear-gradient(145deg,#C6E7C9,#7CC488);border-radius:44% 44% 54% 54%}
        .pet[data-stage="2"] .pet-body{background:linear-gradient(145deg,#BFE8C6,#5FB86F)}
        .pet .elf-hat{position:absolute;top:6px;left:50%;transform:translateX(-50%);width:84px;height:48px;z-index:3;filter:drop-shadow(0 8px 16px var(--shadow-strong))}
        .pet .elf-hat::before{content:'';position:absolute;inset:0;background:linear-gradient(145deg,#2F6B45,#1E3A24);border-radius:50% 50% 20% 20%}
        .pet .elf-hat::after{content:'';position:absolute;right:-10px;top:-10px;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle,#fff,rgba(255,255,255,.2));opacity:.9}
        .pet .elf-hat-tip{position:absolute;right:-26px;top:6px;width:46px;height:34px;border-radius:0 0 40px 40px;background:linear-gradient(145deg,#2F6B45,#1E3A24);transform:rotate(18deg)}
        .pet[data-stage="0"] .elf-hat{display:none}
        .pet[data-stage="2"] .elf-hat::after{opacity:1;animation:twinkle 2.8s ease-in-out infinite}
        .pet-ear{border-radius:60% 60% 10% 10%}
        .pet[data-stage="1"] .pet-ear,.pet[data-stage="2"] .pet-ear{background:linear-gradient(145deg,#C6E7C9,#7CC488)}
        .pet[data-stage="1"] .pet-ear.left,.pet[data-stage="2"] .pet-ear.left{transform:rotate(-28deg) translateX(-4px)}
        .pet[data-stage="1"] .pet-ear.right,.pet[data-stage="2"] .pet-ear.right{transform:rotate(28deg) translateX(4px)}

        /* Mini player */
        .music-fab{position:fixed;right:16px;bottom:108px;width:56px;height:56px;border-radius:18px;border:none;background:var(--gradient-calm);color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px var(--shadow-strong);z-index:1200;cursor:pointer;transition:transform .2s,opacity .2s}
        .music-fab:active{transform:scale(.94)}
        .music-fab.hidden{opacity:0;pointer-events:none}
        .music-banner{position:fixed;left:50%;transform:translateX(-50%);bottom:170px;width:min(440px,calc(100vw - 26px));background:rgba(255,255,255,.7);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.35);border-radius:18px;box-shadow:0 12px 34px var(--shadow-strong);z-index:1201;display:none;overflow:hidden}
        [data-theme=night] .music-banner{background:rgba(28,37,48,.65);border-color:rgba(255,255,255,.08)}
        .music-banner.active{display:block;animation:slideUp .35s cubic-bezier(.34,1.56,.64,1)}
        .music-row{display:flex;align-items:center;gap:10px;padding:12px 12px}
        .music-title{font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--text-dim)}
        .music-chip{display:flex;gap:6px;margin-left:auto}
        .chip-btn{border:none;background:var(--bg-2);padding:8px 10px;border-radius:12px;font-size:14px;cursor:pointer;box-shadow:0 2px 8px var(--shadow-soft)}
        .chip-btn.active{background:var(--text);color:var(--bg-1)}
        .music-slider{width:100%;padding:0 14px 12px}
        .music-slider input{width:100%}
        .music-actions{display:flex;gap:10px;padding:0 12px 12px}
        .music-ctl{flex:1;border:none;border-radius:14px;background:var(--text);color:var(--bg-1);padding:12px 10px;font-weight:700;cursor:pointer}
        .music-close{border:none;border-radius:14px;background:var(--bg-2);padding:12px 10px;font-weight:700;cursor:pointer}

        /* Privacy lock */
        .lock-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(10px);z-index:6000;display:none;align-items:center;justify-content:center;padding:26px}
        .lock-overlay.active{display:flex}
        .lock-card{width:min(420px,100%);background:var(--bg-1);border-radius:24px;padding:26px 20px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.25)}
        .lock-icon{font-size:44px;margin-bottom:10px}
        .lock-title{font-size:20px;font-weight:700;margin-bottom:6px}
        .lock-text{font-size:13px;color:var(--text-dim);line-height:1.5;margin-bottom:14px}
        .lock-pin{display:flex;gap:10px;justify-content:center;margin:10px 0 16px}
        .lock-pin input{width:54px;height:54px;text-align:center;font-size:22px;font-weight:800;border-radius:16px;border:2px solid var(--accent-light);background:var(--bg-2);color:var(--text)}
        .lock-pin input:focus{outline:none;border-color:var(--calm)}
        .lock-btn{width:100%;padding:14px;border:none;border-radius:14px;background:var(--text);color:var(--bg-1);font-weight:800;cursor:pointer}
        .lock-hint{margin-top:10px;font-size:11px;color:var(--text-dim)}

</style>

<div id="aura-audio-fab" aria-label="Audio AURA">
  <button id="aura-audio-fab-btn" title="Musica / Suoni">🎧</button>
  <div id="aura-audio-panel" role="dialog" aria-modal="false">
    <div class="row">
      <div>
        <div class="title">Suoni morbidi</div>
        <div class="sub" id="aura-audio-status">Tocca ▶ per avviare (iPhone richiede un tap).</div>
      </div>
      <button class="aura-audio-mini" id="aura-audio-close" title="Chiudi">✕</button>
    </div>

    <div class="ctrl">
      <button id="aura-audio-toggle">▶</button>
      <select id="aura-audio-select" class="aura-audio-select" aria-label="Ambiente">
        <option value="ocean">Onda</option>
        <option value="rain">Pioggia</option>
        <option value="forest">Foresta</option>
        <option value="space">Deep Focus</option>
      </select>
      <button class="aura-audio-mini" id="aura-audio-hide" title="Nascondi">–</button>
    </div>

    <div style="margin-top:10px">
      <div class="row" style="margin-bottom:6px">
        <div class="title">Volume</div>
        <div class="sub" id="aura-audio-vol-label">30%</div>
      </div>
      <input id="aura-audio-volume" type="range" min="5" max="100" value="30" />
      <div class="sub" style="margin-top:6px">Consiglio: 20–45% su iPhone.</div>
    </div>
  </div>
</div>
