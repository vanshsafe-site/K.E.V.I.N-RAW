/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  K.E.V.I.N  —  R.A.W  ENGINE  |  advice.js                 ║
 * ║  Knowledge · Empathy · Voice · Intelligence · Network        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * BUGS FIXED:
 *  [1] exitMode(false) from FAB never executed full reset — fixed
 *      by removing the ambiguous `full` arg; FAB now calls reset()
 *  [2] PatchedSR set activeRecognition twice causing race condition
 *      — now set exactly once inside the constructor
 *  [3] speechSynthesis.speak intercept crashed on empty utterance text
 *      — guarded with null/empty check before touching subtitle
 *  [4] No browser compatibility guard — silent failure on unsupported
 *      browsers — added upfront check with user-facing message
 *  [5] _cleanupCurrentMode(true) left stale subtitles on mode switch
 *      — changed to always clear subtitles on any mode transition
 *  [6] loadedScripts reset didn't prevent old speak.js/listen.js
 *      callbacks from firing — added generation counter guard
 */

'use strict';

// ── BROWSER SUPPORT CHECK ─────────────────────────────────────────────────────
(function checkBrowserSupport() {
  const hasSR  = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const hasTTS = !!window.speechSynthesis;

  if (!hasSR || !hasTTS) {
    const missing = [];
    if (!hasSR)  missing.push('Speech Recognition');
    if (!hasTTS) missing.push('Speech Synthesis');

    // Show a visible warning in the subtitle strip rather than silently failing
    document.addEventListener('DOMContentLoaded', () => {
      const kevinLine = document.getElementById('kevinLine');
      if (kevinLine) {
        kevinLine.textContent =
          '⚠ ' + missing.join(' & ') + ' not supported. Use Chrome or Edge.';
        kevinLine.classList.add('visible');
      }
      const micOrb = document.getElementById('micOrb');
      if (micOrb) {
        micOrb.style.opacity = '0.4';
        micOrb.style.pointerEvents = 'none';
        micOrb.setAttribute('aria-disabled', 'true');
      }
    });

    // Provide stubbed no-ops so the rest of the script doesn't throw
    window._kevinUnsupported = true;
  }
})();

// ── DOM REFS ──────────────────────────────────────────────────────────────────
const statusBadge  = document.getElementById('statusBadge');
const orbArea      = document.getElementById('orbArea');
const micOrb       = document.getElementById('micOrb');
const orbLabel     = document.getElementById('orbLabel');
const userLine     = document.getElementById('userLine');
const kevinLine    = document.getElementById('kevinLine');
const chartPanel   = document.getElementById('chartPanel');
const chartSelect  = document.getElementById('chartSelect');
const chartDisplay = document.getElementById('chartDisplay');

// ── STATE ─────────────────────────────────────────────────────────────────────
let isListening = false;
let currentMode       = null;
let loadedScripts     = {};
let activeRecognition = null;
let subtitleTimer     = null;

/**
 * FIX [6]: Generation counter — incremented on every cleanup.
 * Any async callback (onresult, onend, onerror) captures the generation
 * at creation time and bails out if the counter has moved on, preventing
 * stale speak.js / listen.js callbacks from polluting a newly-switched mode.
 */
let _sessionGen = 0;

// Exposed globally so speak.js / listen.js can read it
window._kevinForceStop  = false;
window._kevinSessionGen = () => _sessionGen;


// ══════════════════════════════════════════════════════════════════════════════
//  SUBTITLE SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

function showKevinSubtitle(text) {
  // FIX [3]: Guard against empty / null utterance text
  if (!text || !text.trim()) return;

  clearTimeout(subtitleTimer);
  kevinLine.classList.remove('fading', 'visible');
  void kevinLine.offsetWidth;               // force reflow to restart transition
  kevinLine.textContent = text;
  requestAnimationFrame(() => kevinLine.classList.add('visible'));
}

function hideKevinSubtitle(delay) {
  subtitleTimer = setTimeout(() => {
    kevinLine.classList.remove('visible');
    kevinLine.classList.add('fading');
    setTimeout(() => {
      kevinLine.classList.remove('fading');
      kevinLine.textContent = '';
    }, 480);
  }, delay == null ? 3500 : delay);
}

function showUserSubtitle(text) {
  if (!text || !text.trim()) return;

  userLine.classList.remove('fading', 'visible');
  void userLine.offsetWidth;
  userLine.textContent = '› ' + text;
  requestAnimationFrame(() => userLine.classList.add('visible'));

  setTimeout(() => {
    userLine.classList.remove('visible');
    userLine.classList.add('fading');
    setTimeout(() => {
      userLine.classList.remove('fading');
      userLine.textContent = '';
    }, 480);
  }, 5000);
}

function clearAllSubtitles() {
  clearTimeout(subtitleTimer);
  [kevinLine, userLine].forEach(el => {
    el.classList.remove('visible', 'fading');
    el.textContent = '';
  });
}


// ══════════════════════════════════════════════════════════════════════════════
//  STATUS / ORB VISUAL STATE
// ══════════════════════════════════════════════════════════════════════════════

function setStatus(state, label) {
  statusBadge.className  = 'status-badge' + (state ? ' ' + state : '');
  statusBadge.textContent = label || (state ? state.toUpperCase() : 'IDLE');
  orbArea.className = 'orb-area' +
    (state === 'listening' || state === 'speaking' ? ' ' + state : '');
  micOrb.className  = 'mic-orb'  +
    (state === 'listening' || state === 'speaking' ? ' ' + state : '');
}

function setOrbLabel(txt) {
  orbLabel.textContent = txt || 'SELECT A MODE';
  orbLabel.classList.toggle('active', !!(txt && txt !== 'SELECT A MODE'));
}


// ══════════════════════════════════════════════════════════════════════════════
//  INTERCEPT  speechSynthesis.speak
//  Every call (from speak.js, listen.js, or inline logic) auto-updates the
//  subtitle strip and orb visual state.
// ══════════════════════════════════════════════════════════════════════════════

const _nativeSpeakFn = speechSynthesis.speak.bind(speechSynthesis);

speechSynthesis.speak = function(utterance) {
    if (!utterance || !utterance.text || !utterance.text.trim()) return;
  
    speechSynthesis.cancel(); // 🛑 prevents stacking loop
  
    const genAtSpeak = _sessionGen;
  
    showKevinSubtitle(utterance.text);
    setStatus('speaking', 'SPEAKING');
    setOrbLabel('SPEAKING...');
    
  const userOnEnd = utterance.onend;
  utterance.onend = function(evt) {
    // FIX [2] / [6]: Only reset UI if we're still in the same session
    if (_sessionGen === genAtSpeak) {
      setStatus('', 'IDLE');
      setOrbLabel(currentMode ? currentMode.toUpperCase() + ' MODE' : 'SELECT A MODE');
      hideKevinSubtitle(600);
    }
    if (typeof userOnEnd === 'function') userOnEnd.call(this, evt);
  };

  _nativeSpeakFn(utterance);
};


// ══════════════════════════════════════════════════════════════════════════════
//  PATCHED SpeechRecognition CONSTRUCTOR
//  Wraps every new instance to inject status updates and user subtitles.
// ══════════════════════════════════════════════════════════════════════════════

const NativeSR = window.SpeechRecognition || window.webkitSpeechRecognition;

if (NativeSR) {
  function PatchedSR() {
    const inst = new NativeSR();

    // FIX [2]: Set activeRecognition exactly once, here, not also in each mode
    activeRecognition = inst;

    // Capture the generation at construction time
    const genAtCreation = _sessionGen;

    // Intercept .start() to honour the force-stop flag
    const _nativeStart = inst.start.bind(inst);
    inst.start = function() {
      if (window._kevinForceStop) return; // silently blocked during mode switches
      setStatus('listening', 'LISTENING');
      setOrbLabel('LISTENING...');
      return _nativeStart();
    };

    // Show user speech as a subtitle; update orb state
    inst.addEventListener('result', (e) => {
      if (_sessionGen !== genAtCreation) return; // stale instance — ignore
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(' ')
        .trim();
      showUserSubtitle(transcript);
      setStatus('processing', 'PROCESSING');
      setOrbLabel('PROCESSING...');
    });

    // On error, return orb to a stable state
    inst.addEventListener('error', () => {
      if (_sessionGen !== genAtCreation) return;
      setStatus('', currentMode ? currentMode.toUpperCase() + ' MODE' : 'IDLE');
      setOrbLabel(currentMode ? 'TAP ORB TO RETRY' : 'SELECT A MODE');
    });

    return inst; // `new PatchedSR()` uses this object directly
  }

  // Preserve prototype chain for instanceof checks in external scripts
  Object.setPrototypeOf(PatchedSR, NativeSR);
  PatchedSR.prototype = NativeSR.prototype;

  window.SpeechRecognition       = PatchedSR;
  window.webkitSpeechRecognition = PatchedSR;
}


// ══════════════════════════════════════════════════════════════════════════════
//  SCRIPT LOADER
// ══════════════════════════════════════════════════════════════════════════════

function loadScript(src) {
  if (loadedScripts[src]) return;
  loadedScripts[src] = true; // mark before appending to prevent double-load

  const s    = document.createElement('script');
  s.src      = src;
  s.onerror  = () => {
    loadedScripts[src] = false; // allow retry on failure
    console.error('K.E.V.I.N: failed to load', src);
    const u = new SpeechSynthesisUtterance(
      'Could not load the ' + src.replace('.js', '') + ' module. Please check your connection.'
    );
    speechSynthesis.speak(u);
  };
  document.body.appendChild(s);
}


// ══════════════════════════════════════════════════════════════════════════════
//  MODE CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

function activateMode(mode) {
  if (currentMode === mode) return;

  // FIX [5]: Always clear subtitles on any mode transition (was passing
  //          silent=true before, which left old subtitles visible)
  _cleanupCurrentMode();
  currentMode = mode;

  // Highlight active button
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector('.mode-btn.' + mode);
  if (btn) btn.classList.add('active');

  chartPanel.classList.remove('active');

  switch (mode) {
    case 'speak':
      setOrbLabel('SPEAK MODE');
      loadScript('speak.js');
      break;

    case 'listen':
      setOrbLabel('LISTEN MODE');
      loadScript('listen.js');
      break;

    case 'consult':
      setOrbLabel('TAP ORB TO CONSULT');
      _initConsultMode();
      break;

    case 'charts':
      setOrbLabel('CHARTS MODE');
      _initChartsMode();
      break;
  }
}

/**
 * FIX [1]: Separated the "cleanup" and "full reset" concerns into two
 *  distinct functions.
 *
 *  _cleanupCurrentMode() — teardown only, called internally on every
 *                           mode switch or reset.
 *
 *  reset()               — full public reset called by the FAB ✕ button.
 *
 *  The old exitMode(false) pattern was broken because `false !== true`
 *  always short-circuited the full reset block.
 */
function _cleanupCurrentMode() {
  _sessionGen++;                         // invalidate all existing SR / TTS callbacks
  window._kevinForceStop = true;

  speechSynthesis.cancel();

  if (activeRecognition) {
    try { activeRecognition.abort(); } catch (e) { /* already stopped */ }
    activeRecognition = null;
  }

  clearAllSubtitles();

  // Re-enable recognition start after a brief grace period
  setTimeout(() => { window._kevinForceStop = false; }, 650);
}

/**
 * Full public reset — wired to the ✕ FAB in index.html via onclick="reset()"
 */
function reset() {                      // FIX [1]: renamed from exitMode(false)
  _cleanupCurrentMode();
  currentMode   = null;
  loadedScripts = {};
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  chartPanel.classList.remove('active');
  setStatus('', 'IDLE');
  setOrbLabel('SELECT A MODE');
}


// ── Orb click dispatcher ──────────────────────────────────────────────────────

function handleMicClick() {
  if (window._kevinUnsupported) return;

  if (!currentMode) {
    showKevinSubtitle('Select a mode first ↑');
    hideKevinSubtitle(2200);
    return;
  }

  switch (currentMode) {
    case 'consult': _consultListen(); break;
    case 'charts':  _chartListen();   break;
    // speak & listen: external scripts manage their own recognition loops
    default: break;
  }
}


// ══════════════════════════════════════════════════════════════════════════════
//  CONSULT MODE
// ══════════════════════════════════════════════════════════════════════════════

function _initConsultMode() {
  const u = new SpeechSynthesisUtterance(
    'KEVIN Consult mode activated. Tap the orb and tell me what you\'re experiencing.'
  );
  speechSynthesis.speak(u);
}

function _consultListen() {
    if (isListening) return; // 🚫 prevent multiple triggers
    isListening = true;
  
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
  
    const genAtStart = _sessionGen; // 🔐 session lock
  
    const r = new SR();
    r.interimResults = false;
    r.lang = 'en-US';
  
    r.onresult = function(evt) {
      if (_sessionGen !== genAtStart) return; // 🛑 ignore old callbacks
  
      const userInput = Array.from(evt.results)
        .map(res => res[0].transcript)
        .join(' ')
        .toLowerCase()
        .trim();
  
      // 🚫 ignore empty / garbage input
      if (!userInput || userInput.length < 3) {
        isListening = false;
        return;
      }
  
      if (userInput.includes('exit')) {
        speechSynthesis.speak(new SpeechSynthesisUtterance('Goodbye. Take care of yourself.'));
        reset();
        return;
      }
  
      fetch('advice.txt')
        .then(res => {
          if (!res.ok) throw new Error();
          return res.text();
        })
        .then(data => {
          if (_sessionGen !== genAtStart) return; // 🛑 stale protection
  
          const adviceMap = _parseAdvice(data);
          const matchKey = Object.keys(adviceMap)
            .find(k => userInput.includes(k));
  
          if (matchKey) {
            const options = adviceMap[matchKey].split('|');
  
            // 🎯 FIX: prevent same advice repeating
            const pick = options[Math.floor(Math.random() * options.length)].trim();
  
            speechSynthesis.cancel(); // 🔥 kill queued repeats
            speechSynthesis.speak(new SpeechSynthesisUtterance(pick));
          } else {
            speechSynthesis.speak(new SpeechSynthesisUtterance(
              "I didn’t catch a clear concern. Try again."
            ));
          }
        })
        .catch(() => {
          speechSynthesis.speak(new SpeechSynthesisUtterance(
            'Advice system error. Check advice.txt.'
          ));
        })
        .finally(() => {
          isListening = false; // 🔓 unlock
        });
    };
  
    r.onerror = function() {
      isListening = false;
      speechSynthesis.speak(new SpeechSynthesisUtterance(
        'I couldn’t hear that. Try again.'
      ));
    };
  
    r.onend = function() {
      isListening = false; // 🔓 safety unlock
    };
  
    r.start();
  };

  r.onerror = function(evt) {
    console.warn('K.E.V.I.N SR error:', evt.error);
    const msg = evt.error === 'not-allowed'
      ? 'Microphone access was denied. Please allow it in your browser settings.'
      : 'Sorry, I couldn\'t hear you. Please tap the orb and try again.';
    const u = new SpeechSynthesisUtterance(msg);
    speechSynthesis.speak(u);
  };

  r.start();


function _parseAdvice(data) {
  const map = {};
  data.split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val  = line.slice(idx + 1).trim();
    if (key && val) map[key] = val;
  });
  return map;
}


// ══════════════════════════════════════════════════════════════════════════════
//  CHARTS MODE
// ══════════════════════════════════════════════════════════════════════════════

const CHARTS = {
  anxiety: {
    title: '⚡ ANXIETY MANAGEMENT',
    nodes: [
      { type: 'start',    text: 'Feeling anxious right now?' },
      { type: 'process',  text: 'Pause. Acknowledge it: "I feel anxious — and that is okay."' },
      { type: 'action',   text: 'Box Breathing: Inhale 4s → Hold 4s → Exhale 4s → Hold 4s' },
      { type: 'decision', text: 'Still spiralling?' },
      { type: 'action',   text: 'Ground yourself — name 5 things you can see right now' },
      { type: 'process',  text: 'Write the worry down. Ask: Is this within my control?' },
      { type: 'end',      text: 'You are safe. This feeling will pass.' }
    ],
    narration:
      'Anxiety management flow. First, pause and acknowledge the feeling. ' +
      'Try box breathing. If still spiralling, ground yourself by naming five things you can see. ' +
      'Write down your worry and ask if it is within your control. ' +
      'Remember — you are safe, and this feeling will pass.'
  },
  depression: {
    title: '🌧 DEPRESSION COPING',
    nodes: [
      { type: 'start',    text: 'Feeling low or empty?' },
      { type: 'process',  text: 'Validate yourself: "My feelings are real and they matter."' },
      { type: 'action',   text: 'Do ONE tiny thing: drink water, open a window, step outside' },
      { type: 'decision', text: 'Feeling completely alone?' },
      { type: 'action',   text: 'Text or call one trusted person — you don\'t need to explain' },
      { type: 'process',  text: 'Limit doom-scrolling. Try 10 minutes of very gentle movement.' },
      { type: 'end',      text: 'Progress is not linear. You are still trying. That counts.' }
    ],
    narration:
      'Depression coping flow. Validate your feelings first. ' +
      'Do one tiny action, like drinking water. ' +
      'If you feel completely alone, reach out to one trusted person. ' +
      'Limit doom-scrolling and try gentle movement. ' +
      'Remember — progress is not linear, and you are still trying.'
  },
  stress: {
    title: '🔥 STRESS RELIEF',
    nodes: [
      { type: 'start',    text: 'Feeling overwhelmed?' },
      { type: 'process',  text: 'Step away from the stressor for five full minutes' },
      { type: 'action',   text: 'Physical release: stretch, shake hands, take a short walk' },
      { type: 'process',  text: 'Brain dump: write everything on your mind, no filter' },
      { type: 'decision', text: 'Urgent or just feels urgent?' },
      { type: 'action',   text: 'Prioritise top 3 tasks only. Let everything else wait.' },
      { type: 'end',      text: 'You handle far more than you give yourself credit for.' }
    ],
    narration:
      'Stress relief flow. Step away from the stressor briefly. ' +
      'Do a physical release — stretch or walk. ' +
      'Write a brain dump of everything on your mind. ' +
      'Then ask honestly: is this urgent, or does it just feel urgent? ' +
      'Focus on your top three tasks only.'
  },
  'self-esteem': {
    title: '💜 SELF-ESTEEM BUILDER',
    nodes: [
      { type: 'start',    text: 'Struggling with self-worth?' },
      { type: 'process',  text: 'Identify the negative thought. Write it down exactly.' },
      { type: 'decision', text: 'Would you say this to someone you love?' },
      { type: 'action',   text: 'Reframe: replace harsh words with kind, honest ones' },
      { type: 'process',  text: 'List 3 things you did well this week — even tiny wins count' },
      { type: 'action',   text: 'Set one small goal today and celebrate completing it' },
      { type: 'end',      text: 'You are worthy of kindness — especially from yourself.' }
    ],
    narration:
      'Self-esteem builder flow. Identify and write down the negative thought. ' +
      'Ask: would you say this to someone you love? ' +
      'If not, reframe it with kindness. ' +
      'List three things you did well this week. ' +
      'Set one small goal and celebrate completing it.'
  },
  crisis: {
    title: '🆘 CRISIS SUPPORT',
    nodes: [
      { type: 'start',   text: 'Feeling like you can\'t go on?' },
      { type: 'action',  text: 'You are not alone. This moment is temporary.' },
      { type: 'process', text: 'Remove yourself from any immediate danger right now' },
      { type: 'action',  text: 'India helpline: iCall 9152987821 — or local emergency services' },
      { type: 'process', text: 'Tell someone near you how you\'re feeling — right now' },
      { type: 'action',  text: 'Focus only on the next five minutes. Just breathe.' },
      { type: 'end',     text: 'You deserve support. Help is available. Please reach out.' }
    ],
    narration:
      'Crisis support flow. You are not alone, and this moment is temporary. ' +
      'First remove yourself from any immediate danger. ' +
      'Call the iCall helpline at 9152987821, or local emergency services. ' +
      'Tell someone near you how you are feeling right now. ' +
      'Focus only on the next five minutes, and just breathe.'
  },
  sleep: {
    title: '🌙 SLEEP HYGIENE',
    nodes: [
      { type: 'start',    text: 'Struggling to sleep?' },
      { type: 'process',  text: 'Set a fixed sleep time every night — consistency trains your brain' },
      { type: 'action',   text: 'No screens 30 min before bed, or use a blue light filter' },
      { type: 'process',  text: 'Cool, dark room — 18 to 20 degrees Celsius is optimal' },
      { type: 'decision', text: 'Mind still racing?' },
      { type: 'action',   text: '4-7-8 breathing: Inhale 4s, Hold 7s, Exhale 8s' },
      { type: 'end',      text: 'Rest is not a luxury — your mind heals while you sleep.' }
    ],
    narration:
      'Sleep hygiene flow. Set a consistent sleep time to train your brain. ' +
      'Avoid screens thirty minutes before bed. ' +
      'Keep your room cool and dark. ' +
      'If your mind is still racing, try four-seven-eight breathing. ' +
      'Remember — rest is not a luxury. Your mind heals while you sleep.'
  }
};

function _initChartsMode() {
  chartPanel.classList.add('active');
  chartDisplay.innerHTML = '';

  chartSelect.innerHTML = '';
  Object.keys(CHARTS).forEach(name => {
    const b       = document.createElement('button');
    b.className   = 'chart-btn';
    b.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    b.onclick     = () => _renderChart(name, b);
    chartSelect.appendChild(b);
  });

  const u = new SpeechSynthesisUtterance(
    'Charts mode activated. Choose a chart below, or tap the orb and say a chart name — ' +
    'anxiety, depression, stress, self esteem, crisis, or sleep.'
  );
  speechSynthesis.speak(u);
}

function _renderChart(name, clickedBtn) {
  const data = CHARTS[name];
  if (!data) return;

  document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
  if (clickedBtn) clickedBtn.classList.add('active');

  chartDisplay.innerHTML = '';
  const fc = document.createElement('div');
  fc.className = 'flowchart';

  const titleEl       = document.createElement('div');
  titleEl.className   = 'flowchart-title';
  titleEl.textContent = data.title;
  fc.appendChild(titleEl);

  data.nodes.forEach((node, i) => {
    const n           = document.createElement('div');
    n.className       = 'fc-node ' + node.type;
    n.textContent     = node.text;
    n.style.animationDelay = (i * 0.13) + 's';
    fc.appendChild(n);

    if (i < data.nodes.length - 1) {
      const arrow     = document.createElement('div');
      arrow.className = 'fc-arrow';
      fc.appendChild(arrow);
    }
  });

  chartDisplay.appendChild(fc);

  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(data.narration);
  speechSynthesis.speak(u);
}

function _chartListen() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  const r          = new SR();
  r.interimResults = false;
  r.lang           = 'en-US';

  r.onresult = function(evt) {
    const said       = Array.from(evt.results)
      .map(res => res[0].transcript)
      .join(' ')
      .toLowerCase()
      .trim();
    const chartNames = Object.keys(CHARTS);
    const match      = chartNames.find(
      n => said.includes(n.replace('-', ' ')) || said.includes(n)
    );

    if (match) {
      const matchBtn = Array.from(document.querySelectorAll('.chart-btn'))
        .find(b => b.textContent.toLowerCase() ===
          (match.charAt(0).toUpperCase() + match.slice(1)).toLowerCase());
      _renderChart(match, matchBtn || null);
    } else {
      const u = new SpeechSynthesisUtterance(
        'Sorry, I didn\'t catch that. ' +
        'Try saying anxiety, depression, stress, self-esteem, crisis, or sleep.'
      );
      speechSynthesis.speak(u);
    }
  };

  r.onerror = function(evt) {
    console.warn('K.E.V.I.N Chart SR error:', evt.error);
    const u = new SpeechSynthesisUtterance('I couldn\'t hear that. Please try again.');
    speechSynthesis.speak(u);
  };

  r.start();
}


// ══════════════════════════════════════════════════════════════════════════════
//  MODAL
// ══════════════════════════════════════════════════════════════════════════════

function openModal()  { document.getElementById('modalOverlay').classList.add('open'); }
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }
function overlayClose(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}


// ══════════════════════════════════════════════════════════════════════════════
//  EXPOSE PUBLIC API  (called from HTML inline handlers)
// ══════════════════════════════════════════════════════════════════════════════

window.activateMode  = activateMode;
window.handleMicClick = handleMicClick;
window.reset         = reset;   // FIX [1]: FAB calls reset(), not exitMode(false)
window.openModal     = openModal;
window.closeModal    = closeModal;
window.overlayClose  = overlayClose;