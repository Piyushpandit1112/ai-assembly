/**
 * KidLearn AI — Frontend Application Logic
 * ──────────────────────────────────────────
 * Highly interactive, gamified learning for kids.
 * Audio, animations, games, rewards!
 */

const API = 'http://localhost:8000';

// ── Audio Context for Sound Effects ────────────────────────────
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq = 800, duration = 100) {
  try {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + duration / 1000);
  } catch (e) {} // Ignore audio errors
}

// ── App State ──────────────────────────────────────────────────
// Per-user namespaced storage so different kids on same device keep separate progress.
const _activeUser = localStorage.getItem('kidlearn_username') || '';
const _ns = (key) => _activeUser ? `kidlearn:${_activeUser}:${key}` : `kidlearn_${key}`;
function _getNS(key, fallback) {
  const v = localStorage.getItem(_ns(key));
  return v === null ? fallback : v;
}
function _setNS(key, value) {
  localStorage.setItem(_ns(key), value);
}

const state = {
  username: _activeUser || null,
  age: parseInt(_getNS('age', '10')) || 10,
  language: 'English',
  points: parseInt(_getNS('points', '0')) || 0,
  streak: parseInt(_getNS('streak', '0')) || 0,
  englishLevel: _getNS('english_level', 'basic'),
  englishXp: parseInt(_getNS('english_xp', '0')) || 0,
  englishLessonProgress: JSON.parse(_getNS('english_path', '{}')),
  hearts: parseInt(_getNS('hearts', '5')) || 5,
  tutorialComplete: _getNS('tutorial', 'false') === 'true',
  badges: JSON.parse(_getNS('badges', '[]')),
};

function reloadStateForUser(username) {
  // Re-read per-user values when switching identity
  state.username = username;
  state.age = parseInt(localStorage.getItem(`kidlearn:${username}:age`) || '10') || 10;
  state.points = parseInt(localStorage.getItem(`kidlearn:${username}:points`) || '0') || 0;
  state.streak = parseInt(localStorage.getItem(`kidlearn:${username}:streak`) || '0') || 0;
  state.englishLevel = localStorage.getItem(`kidlearn:${username}:english_level`) || 'basic';
  state.englishXp = parseInt(localStorage.getItem(`kidlearn:${username}:english_xp`) || '0') || 0;
  state.englishLessonProgress = JSON.parse(localStorage.getItem(`kidlearn:${username}:english_path`) || '{}');
  state.hearts = parseInt(localStorage.getItem(`kidlearn:${username}:hearts`) || '5') || 5;
  state.badges = JSON.parse(localStorage.getItem(`kidlearn:${username}:badges`) || '[]');
}

function saveAll() {
  if (!state.username) return;
  const u = state.username;
  localStorage.setItem('kidlearn_username', u);
  localStorage.setItem(`kidlearn:${u}:age`, state.age);
  localStorage.setItem(`kidlearn:${u}:points`, state.points);
  localStorage.setItem(`kidlearn:${u}:streak`, state.streak);
  localStorage.setItem(`kidlearn:${u}:english_level`, state.englishLevel);
  localStorage.setItem(`kidlearn:${u}:english_xp`, state.englishXp);
  localStorage.setItem(`kidlearn:${u}:english_path`, JSON.stringify(state.englishLessonProgress));
  localStorage.setItem(`kidlearn:${u}:hearts`, state.hearts);
  localStorage.setItem(`kidlearn:${u}:badges`, JSON.stringify(state.badges));
}

// ── On Page Load ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (state.username) {
    showApp();
  }
  const nameInput = document.getElementById('welcome-name');
  if (nameInput) {
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') startLearning();
    });
  }
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
  }

  renderEnglishLevel();
  if (typeof renderEnglishPath === 'function') renderEnglishPath();
  if (typeof renderHearts === 'function') renderHearts();
  initBrainGames();
});

// ── Reward System ──────────────────────────────────────────────
function addPoints(amount = 10) {
  state.points += amount;
  state.streak += 1;
  saveAll();
  const el = document.getElementById('points-display');
  if (el) el.textContent = state.points;
  const totalEl = document.getElementById('total-points');
  if (totalEl) totalEl.textContent = state.points;
  const streakEl = document.getElementById('streak-count');
  if (streakEl) streakEl.textContent = state.streak;
  showPointsAnimation(amount);
  playSound(1200, 150);  // Success sound
  checkBadges();
}

function showPointsAnimation(amount) {
  const el = document.getElementById('points-display');
  if (!el) return;
  el.style.transform = 'scale(1.5)';
  el.style.color = '#10B981';
  setTimeout(() => {
    el.style.transform = 'scale(1)';
    el.style.color = 'inherit';
  }, 300);
}

function checkBadges() {
  const badges = [
    { id: 'first-question', name: '🌟 First Step', condition: () => state.points >= 10 },
    { id: 'chatterbox', name: '💬 Chatterbox', condition: () => state.points >= 50 },
    { id: 'learner', name: '📚 Learner', condition: () => state.points >= 100 },
    { id: 'genius', name: '🧠 Genius', condition: () => state.points >= 250 },
  ];

  badges.forEach(badge => {
    if (badge.condition() && !state.badges.includes(badge.id)) {
      state.badges.push(badge.id);
      saveAll();
      showBadgeNotification(badge.name);
      playSound(1500, 300);
    }
  });
}

function showBadgeNotification(badgeName) {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed; top: 100px; right: 20px; z-index: 1000;
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #000; padding: 16px 24px; border-radius: 12px;
    font-weight: 900; font-size: 1.1rem;
    box-shadow: 0 8px 20px rgba(255,165,0,0.5);
    animation: slideIn 0.5s ease, slideOut 0.5s ease 2.5s forwards;
  `;
  notif.innerHTML = `🏆 New Badge Unlocked!<br/><strong>${badgeName}</strong>`;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// ── Tutorial System ───────────────────────────────────────────
const tutorialSteps = [
  {
    title: "👋 Welcome to AI Assembly!",
    text: "Let's learn how to use this amazing app!",
    target: "header-logo",
    position: "bottom",
  },
  {
    title: "🤖 Talk to Buddy",
    text: "Ask Buddy anything! He's your AI friend who explains everything.",
    target: "tab-chat",
    position: "bottom",
  },
  {
    title: "📝 Fix Your Writing",
    text: "Write sentences and Buddy will help you improve them!",
    target: "tab-english",
    position: "bottom",
  },
  {
    title: "📚 Learn New Topics",
    text: "Curious about science? History? Buddy explains everything!",
    target: "tab-learn",
    position: "bottom",
  },
  {
    title: "💡 Build Your Ideas",
    text: "Have a crazy idea? Let's make it REAL together! 🚀",
    target: "tab-idea",
    position: "bottom",
  },
  {
    title: "🏆 Earn Points!",
    text: "Every activity gives you points. Collect badges and become a Genius! 🧠",
    target: "points-display",
    position: "bottom",
  },
];

let tutorialIndex = 0;

function showTutorial() {
  const step = tutorialSteps[tutorialIndex];
  if (!step) {
    state.tutorialComplete = true;
    localStorage.setItem('kidlearn_tutorial', 'true');
    playSound(2000, 200);
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'tutorial-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7); z-index: 999;
    display: flex; align-items: center; justify-content: center;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background: linear-gradient(135deg, #7C3AED, #4F46E5);
    color: white; padding: 32px; border-radius: 20px;
    max-width: 400px; text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    animation: popIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  `;
  card.innerHTML = `
    <h2 style="font-size:1.8rem; margin-bottom:8px; line-height:1.2;">${step.title}</h2>
    <p style="font-size:1rem; margin-bottom:20px; opacity:0.95; line-height:1.6;">${step.text}</p>
    <div style="display:flex; gap:8px; justify-content:center; margin-bottom:12px;">
      ${tutorialSteps.map((_, i) => `
        <div style="width:8px; height:8px; border-radius:50%; background:${i === tutorialIndex ? 'white' : 'rgba(255,255,255,0.3)'}; transition:all 0.3s;"></div>
      `).join('')}
    </div>
    <div style="display:flex; gap:10px;">
      ${tutorialIndex > 0 ? `<button onclick="tutorialPrev()" style="flex:1; padding:10px; background:rgba(255,255,255,0.2); color:white; border:none; border-radius:8px; font-weight:700; cursor:pointer;">← Back</button>` : ''}
      <button onclick="tutorialNext()" style="flex:1; padding:10px; background:white; color:#7C3AED; border:none; border-radius:8px; font-weight:700; cursor:pointer; font-size:0.95rem;">
        ${tutorialIndex === tutorialSteps.length - 1 ? '🎉 Start!' : 'Next →'}
      </button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function tutorialNext() {
  document.getElementById('tutorial-overlay')?.remove();
  tutorialIndex++;
  playSound(1000, 100);
  showTutorial();
}

function tutorialPrev() {
  if (tutorialIndex > 0) {
    document.getElementById('tutorial-overlay')?.remove();
    tutorialIndex--;
    playSound(900, 100);
    showTutorial();
  }
}

// ── Welcome / Name Setup ───────────────────────────────────────
function startLearning() {
  const nameInput = document.getElementById('welcome-name');
  const ageInput  = document.getElementById('welcome-age');
  const name = nameInput.value.trim();
  const age  = parseInt(ageInput.value) || 10;

  if (!name) {
    nameInput.focus();
    nameInput.style.borderColor = '#EF4444';
    setTimeout(() => nameInput.style.borderColor = '', 1500);
    return;
  }

  state.username = name;
  state.age      = age;
  // Switch identity — reload that user's saved progress (or fresh defaults)
  reloadStateForUser(name);
  state.age = age;
  saveAll();

  // Stop any onboarding speech if it was started
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();

  // Register with backend (fire-and-forget)
  fetch(`${API}/progress/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, age }),
  }).catch(() => {}); // Ignore errors here

  showApp();
}

function showApp() {
  document.getElementById('welcome-screen').style.display = 'none';
  document.getElementById('app-shell').style.display     = 'block';
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  document.getElementById('header-username').textContent  = state.username;
  document.getElementById('points-display').textContent   = state.points;
  const totalPoints = document.getElementById('total-points');
  const streakCount = document.getElementById('streak-count');
  if (totalPoints) totalPoints.textContent = state.points;
  if (streakCount) streakCount.textContent = state.streak;
  const chatName = document.getElementById('chat-name');
  if (chatName) chatName.textContent = state.username;
  showTab('dashboard');
}

function changeName() {
  document.getElementById('welcome-screen').style.display = 'flex';
  document.getElementById('app-shell').style.display     = 'none';
  document.getElementById('welcome-name').value = state.username || '';
  document.getElementById('welcome-age').value  = state.age || 10;
}

// ── Tab Navigation ─────────────────────────────────────────────
function showTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(t => t.classList.remove('active'));

  const panel = document.getElementById(`panel-${tabId}`);
  const tabBtn = document.getElementById(`tab-${tabId}`);
  const sideBtn = document.getElementById(`side-${tabId}`);
  if (panel)  panel.classList.add('active');
  if (tabBtn) tabBtn.classList.add('active');
  if (sideBtn) sideBtn.classList.add('active');

  if (tabId === 'progress') loadProgress();
  if (tabId === 'dashboard') renderDashboard();
  if (tabId === 'english') renderEnglishPath();

  // close mobile sidebar after tab change
  document.body.classList.remove('sidebar-open');
}

// ── Helper: Set loading state on a button ──────────────────────
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Thinking...';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || 'Go!';
  }
}

// ── Helper: Show a result area ─────────────────────────────────
function showResult(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.classList.add('visible');
}

// ── Helper: Track activity ─────────────────────────────────────
async function trackActivity(activity) {
  addPoints(10);  // Award points for every activity
  try {
    await fetch(`${API}/progress/${state.username}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity, increment: 1 }),
    });
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════
//  FEATURE 1: AI MENTOR CHAT
// ═══════════════════════════════════════════════════════════════

const chatHistory = [];  // Track messages for the session

function appendChatBubble(role, text) {
  const window = document.getElementById('chat-window');

  // Remove typing indicator if present
  const typing = document.getElementById('chat-typing');
  if (typing) typing.remove();

  const bubble = document.createElement('div');
  bubble.classList.add('chat-bubble', role);

  if (role === 'bot') {
    bubble.innerHTML = `<div class="bubble-name">🤖 Buddy</div>${escapeHtml(text)}`;
  } else {
    bubble.textContent = text;
  }

  window.appendChild(bubble);
  window.scrollTop = window.scrollHeight;
}

function showTypingIndicator() {
  const window = document.getElementById('chat-window');
  const existing = document.getElementById('chat-typing');
  if (existing) return;

  const typing = document.createElement('div');
  typing.id = 'chat-typing';
  typing.className = 'chat-typing';
  typing.innerHTML = '<span></span><span></span><span></span>';
  window.appendChild(typing);
  window.scrollTop = window.scrollHeight;
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  appendChatBubble('user', message);
  showTypingIndicator();

  const sendBtn = document.getElementById('chat-send-btn');
  sendBtn.disabled = true;

  try {
    const res = await fetch(`${API}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        username: state.username,
        language: state.language,
      }),
    });
    const data = await res.json();
    appendChatBubble('bot', data.reply || 'Hmm, I could not answer that. Try again!');
    trackActivity('ai_usage');
  } catch (err) {
    appendChatBubble('bot', '⚠️ Could not reach the AI. Is Ollama running? (ollama serve)');
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

// ═══════════════════════════════════════════════════════════════
//  FEATURE 2: ENGLISH COACH
// ═══════════════════════════════════════════════════════════════

async function correctEnglish() {
  const sentence = document.getElementById('english-input').value.trim();
  if (!sentence) return;

  setLoading('english-btn', true);

  try {
    const res = await fetch(`${API}/english/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sentence,
        username: state.username,
        language: state.language,
      }),
    });
    const data = await res.json();

    document.getElementById('english-corrected').textContent    = data.corrected    || '—';
    document.getElementById('english-mistake').textContent      = data.mistake      || '—';
    document.getElementById('english-better').textContent       = data.better_version || '—';

    showResult('english-result');
    addEnglishXp(15);
    trackActivity('english_score');
  } catch (err) {
    showApiError('english-result', 'english-error');
  } finally {
    setLoading('english-btn', false);
  }
}

// ═══════════════════════════════════════════════════════════════
//  FEATURE 3: SUBJECT EXPLAINER
// ═══════════════════════════════════════════════════════════════

async function explainTopic() {
  const topic = document.getElementById('learn-input').value.trim();
  if (!topic) return;

  setLoading('learn-btn', true);

  try {
    const res = await fetch(`${API}/learn/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        age: state.age,
        username: state.username,
        language: state.language,
      }),
    });
    const data = await res.json();

    document.getElementById('learn-explanation').textContent = data.explanation    || '—';
    document.getElementById('learn-example').textContent     = data.example        || '—';
    document.getElementById('learn-quiz').textContent        = data.quiz_question  || '—';

    showResult('learn-result');
    trackActivity('learning_usage');
  } catch (err) {
    showApiError('learn-result', 'learn-error');
  } finally {
    setLoading('learn-btn', false);
  }
}

// ═══════════════════════════════════════════════════════════════
//  FEATURE 4: IDEA GENERATOR
// ═══════════════════════════════════════════════════════════════

async function generateIdea() {
  const idea = document.getElementById('idea-input').value.trim();
  if (!idea) return;

  const blueprint = document.getElementById('idea-blueprint');
  blueprint.innerHTML = `
    <div class="ib-loading">
      <div class="ib-loader">⚙️</div>
      <p>AI Assembly is drafting your blueprint…</p>
      <small>Pulling real-world components, references and cost data.</small>
    </div>`;
  showResult('idea-result');
  setLoading('idea-btn', true);

  try {
    const res = await fetch(`${API}/idea/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea,
        username: state.username,
        language: state.language,
      }),
    });
    if (!res.ok) throw new Error('idea_failed');
    const data = await res.json();
    renderIdeaBlueprint(data);
    trackActivity('idea_usage');
  } catch (err) {
    blueprint.innerHTML = `
      <div class="alert alert-error">
        ⚠️ Could not reach AI Assembly. Make sure the server and Ollama are running, then try again.
      </div>`;
  } finally {
    setLoading('idea-btn', false);
  }
}

function renderIdeaBlueprint(d) {
  const blueprint = document.getElementById('idea-blueprint');
  const arch = d.architecture || {};
  const components = Array.isArray(arch.components) ? arch.components : [];
  const examples   = Array.isArray(d.real_world_examples) ? d.real_world_examples : [];
  const steps      = Array.isArray(d.build_steps) ? d.build_steps : [];
  const challenges = Array.isArray(d.challenges) ? d.challenges : [];
  const refs       = Array.isArray(d.references) ? d.references : [];
  const next       = Array.isArray(d.next_actions) ? d.next_actions : [];

  const html = `
    <!-- Hero -->
    <section class="ib-hero ib-fade" style="--delay:0s">
      <div class="ib-hero-badge">AI ASSEMBLY · BLUEPRINT</div>
      <h2 class="ib-title">${escapeHtml(d.title || d.original_idea || 'Your Idea')}</h2>
      <p class="ib-summary">${escapeHtml(d.summary || '')}</p>
      <div class="ib-meta">
        <div class="ib-meta-pill"><span>💰</span><div><b>Cost</b><div>${escapeHtml(d.cost_estimate || '—')}</div></div></div>
        <div class="ib-meta-pill"><span>⏱️</span><div><b>Time</b><div>${escapeHtml(d.time_estimate || '—')}</div></div></div>
        <div class="ib-meta-pill"><span>⚖️</span><div><b>Safety / Legal</b><div>${escapeHtml(d.safety_and_legal || '—')}</div></div></div>
      </div>
      <div class="ib-actions">
        <button class="ib-btn-mini" onclick="speakBlueprint()">🔊 Listen to plan</button>
        <button class="ib-btn-mini ghost" onclick="stopSpeaking()">⏹ Stop</button>
        <button class="ib-btn-mini ghost" onclick="copyBlueprint()">📋 Copy</button>
      </div>
    </section>

    <!-- Real-world examples -->
    ${examples.length ? `
    <section class="ib-card ib-fade" style="--delay:0.1s">
      <h3 class="ib-h3">🌍 Real-World Proof</h3>
      <div class="ib-examples">
        ${examples.map(e => `
          <div class="ib-example">
            <div class="ib-ex-name">${escapeHtml(e.name || '')}</div>
            <div class="ib-ex-by">by ${escapeHtml(e.by || '—')}</div>
            <div class="ib-ex-note">${escapeHtml(e.note || '')}</div>
          </div>`).join('')}
      </div>
    </section>` : ''}

    <!-- Architecture -->
    <section class="ib-card ib-fade" style="--delay:0.2s">
      <h3 class="ib-h3">🏗️ Core Architecture</h3>
      <p class="ib-arch-overview">${escapeHtml(arch.overview || '')}</p>

      <div class="ib-components">
        ${components.map((c, i) => `
          <div class="ib-comp" style="animation-delay:${i * 0.08}s">
            <div class="ib-comp-num">${i + 1}</div>
            <div class="ib-comp-body">
              <div class="ib-comp-name">${escapeHtml(c.name || '')}</div>
              <div class="ib-comp-role">${escapeHtml(c.role || '')}</div>
              <div class="ib-comp-tech"><b>Tech:</b> ${escapeHtml(c.tech || '—')}</div>
            </div>
          </div>`).join('')}
      </div>

      <div class="ib-flow">
        <div class="ib-flow-label">🔁 Data flow</div>
        <div class="ib-flow-text">${escapeHtml(arch.data_flow || '')}</div>
      </div>
    </section>

    <!-- Build phases -->
    ${steps.length ? `
    <section class="ib-card ib-fade" style="--delay:0.3s">
      <h3 class="ib-h3">🛠️ Build Roadmap</h3>
      <ol class="ib-roadmap">
        ${steps.map(s => `
          <li class="ib-phase">
            <div class="ib-phase-num">${s.step || ''}</div>
            <div class="ib-phase-body">
              <div class="ib-phase-title">${escapeHtml(s.title || '')}</div>
              <div class="ib-phase-detail">${escapeHtml(s.detail || '')}</div>
              ${Array.isArray(s.skills) && s.skills.length ? `
                <div class="ib-phase-skills">
                  ${s.skills.map(sk => `<span class="ib-skill">${escapeHtml(sk)}</span>`).join('')}
                </div>` : ''}
            </div>
          </li>`).join('')}
      </ol>
    </section>` : ''}

    <!-- Challenges -->
    ${challenges.length ? `
    <section class="ib-card ib-fade" style="--delay:0.4s">
      <h3 class="ib-h3">⚠️ Real Challenges</h3>
      <div class="ib-challenges">
        ${challenges.map(c => `
          <div class="ib-chall">
            <div class="ib-chall-prob"><b>Problem:</b> ${escapeHtml(c.problem || '')}</div>
            <div class="ib-chall-sol"><b>Fix:</b> ${escapeHtml(c.solution || '')}</div>
          </div>`).join('')}
      </div>
    </section>` : ''}

    <!-- References -->
    ${refs.length ? `
    <section class="ib-card ib-fade" style="--delay:0.5s">
      <h3 class="ib-h3">📚 References &amp; Proof</h3>
      <ul class="ib-refs">
        ${refs.map(r => `
          <li>
            <a href="${encodeURI(r.url || '#')}" target="_blank" rel="noopener noreferrer">
              🔗 ${escapeHtml(r.title || r.url || 'Source')}
            </a>
          </li>`).join('')}
      </ul>
    </section>` : ''}

    <!-- Next actions -->
    ${next.length ? `
    <section class="ib-card ib-cta-card ib-fade" style="--delay:0.6s">
      <h3 class="ib-h3">🚀 Do This Today</h3>
      <ul class="ib-next">
        ${next.map(n => `<li>${escapeHtml(n)}</li>`).join('')}
      </ul>
    </section>` : ''}

    <div class="ib-footer">⚙️ Generated by <b>AI Assembly</b> · Treat this as v0 — refine it as you build.</div>
  `;

  blueprint.innerHTML = html;
  // Stash plain-text version for TTS / clipboard
  blueprint.dataset.tts = buildBlueprintTTS(d);
}

function buildBlueprintTTS(d) {
  const arch = d.architecture || {};
  const lines = [
    `Blueprint for ${d.title}.`,
    d.summary || '',
    arch.overview ? `Architecture overview: ${arch.overview}` : '',
    `Estimated cost: ${d.cost_estimate}.`,
    `Estimated time: ${d.time_estimate}.`,
    Array.isArray(d.next_actions) && d.next_actions.length
      ? `Your first action: ${d.next_actions[0]}` : '',
  ].filter(Boolean);
  return lines.join(' ');
}

function speakBlueprint() {
  const text = document.getElementById('idea-blueprint')?.dataset?.tts;
  if (text) speakText(text);
}
function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
function copyBlueprint() {
  const text = document.getElementById('idea-blueprint')?.dataset?.tts || '';
  navigator.clipboard?.writeText(text).then(() => {
    showBadgeNotification('Copied to clipboard!');
  });
}

// ═══════════════════════════════════════════════════════════════
//  FEATURE 5: PROMPT TRAINER
// ═══════════════════════════════════════════════════════════════

async function improvePrompt() {
  const prompt = document.getElementById('prompt-input').value.trim();
  if (!prompt) return;

  setLoading('prompt-btn', true);

  try {
    const res = await fetch(`${API}/ai/improve-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, language: state.language }),
    });
    const data = await res.json();

    document.getElementById('prompt-improved').textContent    = data.improved_prompt || '—';
    document.getElementById('prompt-explanation').textContent = data.explanation     || '—';
    document.getElementById('prompt-tip').textContent         = data.tip             || '—';

    showResult('prompt-result');
    trackActivity('prompt_usage');
  } catch (err) {
    showApiError('prompt-result', 'prompt-error');
  } finally {
    setLoading('prompt-btn', false);
  }
}

// ═══════════════════════════════════════════════════════════════
//  FEATURE 6: PROGRESS DASHBOARD
// ═══════════════════════════════════════════════════════════════

async function loadProgress() {
  const container = document.getElementById('progress-content');
  container.innerHTML = '<p style="color:var(--text-light); text-align:center; padding:20px;">Loading your progress... 🔄</p>';

  try {
    const res = await fetch(`${API}/progress/${state.username}`);

    if (res.status === 404) {
      container.innerHTML = `
        <div class="alert alert-info">
          📊 No progress data yet! Start using the features above to track your learning journey.
        </div>`;
      return;
    }

    const data = await res.json();
    const total = data.total_sessions || 0;
    const maxVal = Math.max(
      data.english_score  || 0,
      data.learning_usage || 0,
      data.idea_usage     || 0,
      data.ai_usage       || 0,
      data.prompt_usage   || 0,
      data.brain_usage    || 0,
      1  // avoid division by zero
    );

    const bars = [
      { label: '📝 English Coach', key: 'english_score',  value: data.english_score  || 0 },
      { label: '📚 Subject Learning', key: 'learning_usage', value: data.learning_usage || 0 },
      { label: '💡 Idea Lab',       key: 'idea_usage',    value: data.idea_usage     || 0 },
      { label: '🤖 AI Mentor',      key: 'ai_usage',      value: data.ai_usage       || 0 },
      { label: '🎯 Prompt Trainer', key: 'prompt_usage',  value: data.prompt_usage   || 0 },
      { label: '🧩 Brain Games',    key: 'brain_usage',   value: data.brain_usage    || 0 },
    ];

    container.innerHTML = `
      <!-- Stat Summary Cards -->
      <div class="progress-grid">
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-value">${total}</div>
          <div class="stat-label">Total Sessions</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📝</div>
          <div class="stat-value">${data.english_score || 0}</div>
          <div class="stat-label">English Uses</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-value">${data.learning_usage || 0}</div>
          <div class="stat-label">Topics Learned</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💡</div>
          <div class="stat-value">${data.idea_usage || 0}</div>
          <div class="stat-label">Ideas Created</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🧩</div>
          <div class="stat-value">${data.brain_usage || 0}</div>
          <div class="stat-label">Brain Games</div>
        </div>
      </div>

      <!-- Activity Bars -->
      <div class="card">
        <h3 style="margin-bottom:18px; font-weight:800;">📊 Activity Breakdown</h3>
        ${bars.map(b => `
          <div class="progress-bar-row">
            <div class="progress-bar-label">${b.label}</div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width:${Math.round((b.value / maxVal) * 100)}%"></div>
            </div>
            <div class="progress-bar-count">${b.value}</div>
          </div>
        `).join('')}
      </div>

      <p style="color:var(--text-light); font-size:0.82rem; text-align:center; margin-top:14px;">
        Last active: ${data.last_active ? new Date(data.last_active).toLocaleString() : 'Just now'}
      </p>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="alert alert-error">
        ⚠️ Could not load progress. Make sure the server is running.
      </div>`;
  }
}

// ═══════════════════════════════════════════════════════════════
//  FEATURE 7: (REMOVED) Multi-language welcome guide — English-only now
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
//  FEATURE 8: DUOLINGO-STYLE ENGLISH MISSIONS
// ═══════════════════════════════════════════════════════════════

function setEnglishLevel(level) {
  state.englishLevel = level;
  saveAll();
  renderEnglishLevel();
}

function addEnglishXp(amount) {
  state.englishXp += amount;
  saveAll();
  document.querySelectorAll('#english-xp, #english-xp-w, #dash-xp').forEach(el => { el.textContent = state.englishXp; });
}

function renderEnglishLevel() {
  const levelEl = document.getElementById('english-level-status');
  if (levelEl) levelEl.textContent = state.englishLevel.toUpperCase();
  document.querySelectorAll('#english-xp, #english-xp-w, #dash-xp').forEach(el => { el.textContent = state.englishXp; });

  document.querySelectorAll('.english-level-btn').forEach(btn => {
    btn.style.outline = btn.dataset.level === state.englishLevel
      ? '3px solid #111827'
      : 'none';
  });
}

function startEnglishMission() {
  const input = document.getElementById('english-input');
  if (!input) return;

  const tasks = {
    basic: 'i am go school yesterday',
    intermediate: 'my mother cook food and i eat fast because i late',
    advanced: 'write 5 lines about how technology can help my village school',
  };

  input.value = tasks[state.englishLevel] || tasks.basic;
  input.focus();
  playSound(900, 120);
}

async function loadEnglishLesson(topic = 'articles') {
  const conceptEl = document.getElementById('english-lesson-concept');
  const rulesEl = document.getElementById('english-lesson-rules');
  const examplesEl = document.getElementById('english-lesson-examples');
  const questionEl = document.getElementById('english-lesson-question');
  const spokenTipEl = document.getElementById('english-spoken-tip');
  const writingTaskEl = document.getElementById('english-writing-task');

  if (!conceptEl || !rulesEl || !examplesEl || !questionEl || !spokenTipEl || !writingTaskEl) {
    return;
  }

  conceptEl.textContent = 'Loading lesson...';
  rulesEl.innerHTML = '';
  examplesEl.innerHTML = '';
  questionEl.textContent = '...';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    const res = await fetch(`${API}/english/lesson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        topic,
        level: state.englishLevel,
        language: state.language,
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error('lesson_request_failed');
    }

    const data = await res.json();

    conceptEl.textContent = data.concept || 'No concept available yet.';
    questionEl.textContent = data.practice_question || 'Try one sentence with this concept.';
    spokenTipEl.textContent = data.spoken_tip || 'Speak slowly and clearly.';
    writingTaskEl.textContent = data.writing_task || 'Write 3 short lines using this concept.';

    const rules = Array.isArray(data.rules) ? data.rules : [];
    const examples = Array.isArray(data.examples) ? data.examples : [];

    rulesEl.innerHTML = rules.map(rule => `<li>${escapeHtml(rule)}</li>`).join('');
    examplesEl.innerHTML = examples.map(ex => `<li>${escapeHtml(ex)}</li>`).join('');

    addEnglishXp(8);
    trackActivity('english_score');
  } catch (err) {
    let msg = 'Could not load AI lesson now. You can still practice with the writing box below.';
    if (err && err.name === 'AbortError') {
      msg = 'AI is thinking too long. Please wait a moment and click the topic again.';
    } else if (err && /Failed to fetch|NetworkError/i.test(String(err.message))) {
      msg = 'Cannot reach the server. Make sure the app and Ollama are running.';
    } else if (err && err.message === 'lesson_request_failed') {
      msg = 'AI returned an unexpected response. Try another topic or click again.';
    }
    conceptEl.textContent = msg;
    questionEl.textContent = `Make one ${state.englishLevel} sentence using ${topic}.`;
    spokenTipEl.textContent = 'Speak slowly. Focus on clear pronunciation and pauses.';
    writingTaskEl.textContent = `Write 3 lines about ${topic} in simple English.`;
    rulesEl.innerHTML = '<li>Start with short sentences.</li><li>Check subject and verb.</li><li>Use punctuation.</li>';
    examplesEl.innerHTML = '<li>I read a book.</li><li>She is my friend.</li><li>We play every day.</li>';
  }
}

function speakLessonQuestion() {
  const question = document.getElementById('english-lesson-question')?.textContent || '';
  if (!question || question === '—') return;
  speakInLanguage(question, state.language);
}

function startEnglishVoicePractice() {
  const SpeechRecognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  const feedbackEl = document.getElementById('english-spoken-feedback');
  if (!SpeechRecognition) {
    if (feedbackEl) feedbackEl.textContent = 'Voice not supported on this browser.';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = languageToVoiceCode(state.language);
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || '';
    const input = document.getElementById('english-spoken-input');
    if (input) input.value = transcript;
    if (feedbackEl) feedbackEl.textContent = 'Great! Now press Check Speaking.';
  };
}

function evaluateSpokenEnglish() {
  const target = (document.getElementById('english-lesson-question')?.textContent || '').toLowerCase();
  const spoken = (document.getElementById('english-spoken-input')?.value || '').toLowerCase();
  const feedbackEl = document.getElementById('english-spoken-feedback');

  if (!spoken || !feedbackEl) return;

  const targetWords = target.split(/\s+/).filter(Boolean);
  const spokenWords = spoken.split(/\s+/).filter(Boolean);
  const matched = spokenWords.filter(word => targetWords.includes(word)).length;
  const score = targetWords.length > 0 ? Math.round((matched / targetWords.length) * 100) : 0;

  if (score >= 70) {
    feedbackEl.textContent = `Excellent speaking! Score: ${score}%`;
    addEnglishXp(10);
    trackActivity('english_score');
  } else {
    feedbackEl.textContent = `Good try! Score: ${score}%. Listen once and retry.`;
  }
}

async function checkWritingPractice() {
  const writingText = document.getElementById('english-writing-input')?.value.trim() || '';
  const feedbackEl = document.getElementById('english-writing-feedback');
  if (!writingText || !feedbackEl) return;

  feedbackEl.textContent = 'Checking your writing...';
  try {
    const res = await fetch(`${API}/english/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sentence: writingText,
        username: state.username,
        language: state.language,
      }),
    });
    const data = await res.json();
    feedbackEl.textContent = `Correct: ${data.corrected || ''} | Tip: ${data.mistake || ''}`;
    addEnglishXp(12);
    trackActivity('english_score');
  } catch (err) {
    feedbackEl.textContent = 'Could not check writing now. Try again.';
  }
}

function quickLearn(topic) {
  const input = document.getElementById('learn-input');
  if (!input) return;
  input.value = topic;
  explainTopic();
}

function quickIdea(idea) {
  const input = document.getElementById('idea-input');
  if (!input) return;
  input.value = idea;
  generateIdea();
}

function toggleVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Voice input is not supported in this browser.');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = languageToVoiceCode(state.language);
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || '';
    const input = document.getElementById('chat-input');
    if (input) input.value = transcript;
  };
}

// ═══════════════════════════════════════════════════════════════
//  FEATURE 9: BRAIN GAMES (PUZZLE + QUIZ)
// ═══════════════════════════════════════════════════════════════

const puzzleBank = [
  { q: 'I am full of keys but open no doors. What am I?', a: 'keyboard' },
  { q: 'What has hands but cannot clap?', a: 'clock' },
  { q: 'What comes once in a minute, twice in a moment, never in a thousand years?', a: 'm' },
];

const quizBank = [
  {
    q: 'Which planet is called the Red Planet?',
    options: ['Earth', 'Mars', 'Jupiter'],
    answer: 'Mars',
  },
  {
    q: '5 + 7 = ?',
    options: ['10', '12', '14'],
    answer: '12',
  },
  {
    q: 'Water freezes at what temperature?',
    options: ['0 C', '10 C', '50 C'],
    answer: '0 C',
  },
];

let currentPuzzle = 0;
let currentQuiz = 0;

function initBrainGames() {
  renderPuzzle();
  renderQuiz();
}

function nextPuzzle() {
  currentPuzzle = (currentPuzzle + 1) % puzzleBank.length;
  renderPuzzle();
}

function renderPuzzle() {
  const q = document.getElementById('puzzle-question');
  const input = document.getElementById('puzzle-answer');
  const result = document.getElementById('puzzle-result');
  if (q) q.textContent = puzzleBank[currentPuzzle].q;
  if (input) input.value = '';
  if (result) result.textContent = '';
}

function checkPuzzle() {
  const input = document.getElementById('puzzle-answer');
  const result = document.getElementById('puzzle-result');
  if (!input || !result) return;
  const ans = input.value.trim().toLowerCase();
  const correct = puzzleBank[currentPuzzle].a.toLowerCase();
  if (!ans) return;
  if (ans === correct) {
    result.textContent = 'Correct! Brilliant thinking!';
    addPoints(12);
    trackActivity('brain_usage');
  } else {
    result.textContent = `Good try! Correct answer: ${puzzleBank[currentPuzzle].a}`;
  }
}

function nextQuiz() {
  currentQuiz = (currentQuiz + 1) % quizBank.length;
  renderQuiz();
}

function renderQuiz() {
  const q = document.getElementById('quiz-question');
  const options = document.getElementById('quiz-options');
  const result = document.getElementById('quiz-result');
  if (!q || !options || !result) return;

  q.textContent = quizBank[currentQuiz].q;
  result.textContent = '';
  options.innerHTML = quizBank[currentQuiz].options.map(option => (
    `<button onclick="submitQuiz('${option.replace(/'/g, "&#39;")}')" style="padding:10px 12px; border:none; border-radius:10px; background:#EFF6FF; cursor:pointer; font-weight:700;">${option}</button>`
  )).join('');
}

function submitQuiz(answer) {
  const result = document.getElementById('quiz-result');
  if (!result) return;
  if (answer === quizBank[currentQuiz].answer) {
    result.textContent = 'Awesome! You got it right!';
    addPoints(10);
    trackActivity('brain_usage');
  } else {
    result.textContent = `Nice attempt! Correct answer is ${quizBank[currentQuiz].answer}.`;
  }
}

// ── Helpers ────────────────────────────────────────────────────

function showApiError(resultId, errorId) {
  const resultArea = document.getElementById(resultId);
  if (resultArea) resultArea.classList.add('visible');
  const errorEl = document.getElementById(errorId);
  if (errorEl) {
    errorEl.style.display = 'block';
    errorEl.textContent = '⚠️ Could not reach the AI. Is Ollama running? Open a terminal and run: ollama serve';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD HOME
// ═══════════════════════════════════════════════════════════════

function renderDashboard() {
  const nameEl = document.getElementById('dash-username');
  if (nameEl) nameEl.textContent = state.username || 'Friend';
  const ptsEl = document.getElementById('dash-points');
  if (ptsEl) ptsEl.textContent = state.points;
  const streakEl = document.getElementById('dash-streak');
  if (streakEl) streakEl.textContent = state.streak;
  const xpEl = document.getElementById('dash-xp');
  if (xpEl) xpEl.textContent = state.englishXp;
  const heartsEl = document.getElementById('dash-hearts');
  if (heartsEl) heartsEl.textContent = '❤️'.repeat(state.hearts) + '🤍'.repeat(Math.max(0, 5 - state.hearts));
  const badgesEl = document.getElementById('dash-badges');
  if (badgesEl) badgesEl.textContent = state.badges.length;

  // Daily goal: 50 xp per day
  const goal = 50;
  const pct = Math.min(100, Math.round((state.englishXp % goal) / goal * 100));
  const goalBar = document.getElementById('dash-goal-bar');
  if (goalBar) goalBar.style.width = pct + '%';
  const goalText = document.getElementById('dash-goal-text');
  if (goalText) goalText.textContent = `${state.englishXp % goal} / ${goal} XP today`;
}

function renderHearts() {
  const heartsEl = document.getElementById('dash-hearts');
  if (heartsEl) heartsEl.textContent = '❤️'.repeat(state.hearts) + '🤍'.repeat(Math.max(0, 5 - state.hearts));
}

// ═══════════════════════════════════════════════════════════════
//  DUOLINGO-STYLE ENGLISH PATH
// ═══════════════════════════════════════════════════════════════

const englishPath = [
  // ── GRAMMAR ────────────────────────────────────────────────────────
  { id: 'l1',  cat: 'grammar', unit: 'Unit 1 · Basics',          icon: '🌱', title: 'Articles (a, an, the)',     topic: 'articles a an the', art: '🍎🐘📕' },
  { id: 'l3',  cat: 'grammar', unit: 'Unit 1 · Basics',          icon: '🔤', title: 'Alphabet & Sounds',         topic: 'alphabet sounds and phonics', art: '🅰️🅱️🆎' },

  { id: 'l4',  cat: 'grammar', unit: 'Unit 2 · 8 Parts of Speech', icon: '👤', title: 'Nouns (people, places)',    topic: 'nouns common and proper nouns', art: '👦🏠🐶' },
  { id: 'l5',  cat: 'grammar', unit: 'Unit 2 · 8 Parts of Speech', icon: '👫', title: 'Pronouns (I, you, he)',     topic: 'pronouns I you he she it we they', art: '🙋👉👨' },
  { id: 'l6',  cat: 'grammar', unit: 'Unit 2 · 8 Parts of Speech', icon: '⚡', title: 'Verbs (action words)',      topic: 'verbs action and helping verbs', art: '🏃⚽💃' },
  { id: 'l7',  cat: 'grammar', unit: 'Unit 2 · 8 Parts of Speech', icon: '🎨', title: 'Adjectives (describe)',     topic: 'adjectives describing words', art: '🌈🐘🍰' },
  { id: 'l8',  cat: 'grammar', unit: 'Unit 2 · 8 Parts of Speech', icon: '🏃', title: 'Adverbs (how/when/where)',  topic: 'adverbs how when where', art: '🐢⏰📍' },
  { id: 'l9',  cat: 'grammar', unit: 'Unit 2 · 8 Parts of Speech', icon: '📍', title: 'Prepositions (in, on, at)', topic: 'prepositions in on at under over', art: '📦🐱⬆️' },
  { id: 'l10', cat: 'grammar', unit: 'Unit 2 · 8 Parts of Speech', icon: '🔗', title: 'Conjunctions (and, but)',   topic: 'conjunctions and but or because', art: '🔗➕🤝' },
  { id: 'l11', cat: 'grammar', unit: 'Unit 2 · 8 Parts of Speech', icon: '🎉', title: 'Interjections (Wow!)',      topic: 'interjections wow oh hey', art: '😮😱🥳' },

  { id: 'l12', cat: 'grammar', unit: 'Unit 3 · Sentences',        icon: '🧱', title: 'Sentence Building',         topic: 'simple sentence building subject verb object', art: '🧱🔨🏗️' },
  { id: 'l13', cat: 'grammar', unit: 'Unit 3 · Sentences',        icon: '⏰', title: 'Present Tense',             topic: 'simple present tense', art: '⏰🌞📅' },
  { id: 'l14', cat: 'grammar', unit: 'Unit 3 · Sentences',        icon: '🕰️', title: 'Past Tense',                topic: 'simple past tense', art: '🕰️📜⏪' },
  { id: 'l15', cat: 'grammar', unit: 'Unit 3 · Sentences',        icon: '🚀', title: 'Future Tense',              topic: 'simple future tense', art: '🚀🔮⏩' },
  { id: 'l16', cat: 'grammar', unit: 'Unit 3 · Sentences',        icon: '❓', title: 'Questions & Negatives',     topic: 'making questions and negatives', art: '❓❗🚫' },
  { id: 'l17', cat: 'grammar', unit: 'Unit 3 · Sentences',        icon: '🔢', title: 'Singular & Plural',         topic: 'singular plural nouns', art: '1️⃣🐱🐱🐱' },
  { id: 'l25', cat: 'grammar', unit: 'Unit 6 · Pro',              icon: '💪', title: 'Advanced Grammar',          topic: 'advanced grammar review', art: '🧠💪🏆' },

  // ── SPOKEN ─────────────────────────────────────────────────────────
  { id: 'l2',  cat: 'spoken', unit: 'Unit 1 · Hello!',           icon: '⭐', title: 'Greetings & Names',         topic: 'greetings and introductions', art: '👋😊🤝' },
  { id: 'l18', cat: 'spoken', unit: 'Unit 2 · Phrases',          icon: '🗣️', title: 'Daily Phrases',             topic: 'spoken english daily phrases', art: '☀️🌙🍽️' },
  { id: 'l19', cat: 'spoken', unit: 'Unit 2 · Phrases',          icon: '🎤', title: 'Pronunciation',             topic: 'english pronunciation tips for kids', art: '👄🎤🔊' },
  { id: 'l20', cat: 'spoken', unit: 'Unit 3 · Conversations',    icon: '💬', title: 'Conversation Practice',     topic: 'simple english conversation practice', art: '💬👥🎙️' },

  // ── WRITING ────────────────────────────────────────────────────────
  { id: 'l21', cat: 'writing', unit: 'Unit 1 · Basics',          icon: '✍️', title: 'Writing Skills',            topic: 'writing skills basics for kids', art: '✏️📄💡' },
  { id: 'l23', cat: 'writing', unit: 'Unit 1 · Basics',          icon: '📝', title: 'Paragraph Writing',         topic: 'paragraph writing structure', art: '📝📚🔍' },
  { id: 'l22', cat: 'writing', unit: 'Unit 2 · Stories',         icon: '📖', title: 'Storytelling',              topic: 'short story writing for kids', art: '📖🦸🐉' },
  { id: 'l24', cat: 'writing', unit: 'Unit 3 · Pro',             icon: '🏆', title: 'Idioms & Phrases',          topic: 'common english idioms and phrases', art: '🌧️🐱🐶' },
  { id: 'l25', unit: 'Unit 6 · Pro',              icon: '💪', title: 'Advanced Grammar',          topic: 'advanced grammar review' },
];

let _englishCategory = 'grammar';

function setEnglishCategory(cat) {
  _englishCategory = cat;
  document.querySelectorAll('.eng-subtab').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  renderEnglishPath();
}

function renderEnglishPath() {
  const wrap = document.getElementById('english-path');
  if (!wrap) return;

  const items = englishPath.filter(n => n.cat === _englishCategory);
  let html = '';
  let currentUnit = '';
  items.forEach((node, i) => {
    if (node.unit !== currentUnit) {
      currentUnit = node.unit;
      html += `<div class="path-unit-banner">${escapeHtml(node.unit)}</div>`;
    }
    const done = state.englishLessonProgress[node.id];
    const prevDone = i === 0 || state.englishLessonProgress[items[i - 1].id];
    const status = done ? 'done' : (prevDone ? 'current' : 'locked');
    const offset = (i % 4); // 0,1,2,3 for zig-zag
    const offsetMap = [0, 60, 100, 60];
    html += `
      <div class="path-row" style="margin-left:${offsetMap[offset]}px;">
        <button class="path-node ${status}" onclick="openLesson('${node.id}')" ${status === 'locked' ? 'disabled' : ''} title="${escapeHtml(node.title)}">
          <span class="path-node-icon">${node.icon}</span>
          ${done ? '<span class="path-check">✓</span>' : ''}
        </button>
        <div class="path-label">${escapeHtml(node.title)}</div>
      </div>`;
  });
  wrap.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
//  MULTI-STAGE LESSON PLAYER — kid-friendly tutorial
//  Stages: Intro → Watch → Concept → Examples → Quiz → Speak → Write → Done
// ═══════════════════════════════════════════════════════════════

let _lp = {
  lessonId: null,
  node: null,
  data: null,        // AI lesson payload
  stages: [],        // computed stage list
  idx: 0,
  quizScore: 0,
  quizAnswered: 0,
};

function openLesson(lessonId) {
  const node = englishPath.find(n => n.id === lessonId);
  if (!node) return;

  _lp = { lessonId, node, data: null, stages: [], idx: 0, quizScore: 0, quizAnswered: 0 };

  const modal = document.getElementById('lesson-modal');
  modal.classList.add('open');
  modal.dataset.lessonId = lessonId;
  document.getElementById('lesson-modal-title').textContent = node.title;
  document.getElementById('lp-stages').innerHTML = '<div class="lp-loading">🦉 Buddy is preparing your lesson...</div>';

  loadLessonData(node.topic).then(() => {
    _lp.stages = buildStages(_lp.node, _lp.data);
    _lp.idx = 0;
    renderLessonStage();
  });
}

function closeLessonModal() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  document.getElementById('lesson-modal').classList.remove('open');
}

async function loadLessonData(topic) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    const res = await fetch(`${API}/english/lesson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ topic, level: state.englishLevel, language: state.language }),
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error('lesson_failed');
    _lp.data = await res.json();
  } catch (err) {
    // Fallback content so the lesson still works offline / without AI
    _lp.data = {
      concept: `Today we will learn about ${_lp.node.title}. This is a fun and important topic in English!`,
      rules: [
        `${_lp.node.title} are used in everyday English.`,
        'Pay attention to how they are used in real sentences.',
        'Practice makes perfect — try to use them when you speak and write!',
      ],
      examples: [
        'I read a book every day.',
        'She is my best friend.',
        'We play in the park.',
      ],
      practice_question: `Make one sentence using ${_lp.node.title}.`,
      spoken_tip: 'Speak slowly and clearly. Smile while you speak!',
      writing_task: `Write 3 short sentences using ${_lp.node.title}.`,
    };
  }
}

function buildStages(node, data) {
  const rules = Array.isArray(data.rules) ? data.rules.slice(0, 6) : [];
  const examples = Array.isArray(data.examples) ? data.examples.slice(0, 6) : [];
  const stages = [
    { type: 'intro',   icon: '🎬', label: 'Intro' },
    { type: 'watch',   icon: '📺', label: 'Watch' },
    { type: 'concept', icon: '📘', label: 'Learn' },
    { type: 'examples',icon: '✨', label: 'Examples', items: examples },
    { type: 'quiz',    icon: '🎯', label: 'Quiz', items: buildQuiz(examples, rules, node) },
    { type: 'speak',   icon: '🗣️', label: 'Speak' },
  ];
  if (node.cat === 'writing' || node.cat === 'grammar') {
    stages.push({ type: 'write', icon: '✍️', label: 'Write' });
  }
  stages.push({ type: 'done', icon: '🏆', label: 'Done!' });
  return stages;
}

function buildQuiz(examples, rules, node) {
  // Generate 3 simple multiple-choice questions
  const quiz = [];
  const correctPool = examples.length ? examples : [
    'I read a book.', 'She is happy.', 'We play together.',
  ];
  const distractors = [
    'I goed to the store.', 'She have two dog.', 'He do his homework yesterday.',
    'They was at home.', 'I am eat now.', 'We runs fast.',
  ];

  // Q1: Pick the correct sentence
  if (correctPool.length >= 1) {
    const correct = correctPool[0];
    const wrong = pickRandom(distractors, 2);
    quiz.push({
      q: `Which sentence is CORRECT? ✅`,
      options: shuffle([correct, ...wrong]),
      correct,
      hint: rules[0] || 'Look carefully at the verb!',
    });
  }
  // Q2: Pick the WRONG sentence
  if (correctPool.length >= 2) {
    const correct = correctPool[1];
    const wrong = distractors[0];
    quiz.push({
      q: `Which sentence has a MISTAKE? ❌`,
      options: shuffle([correct, wrong, correctPool[0] || correct]),
      correct: wrong,
      hint: 'Look for wrong verb forms or missing words.',
    });
  }
  // Q3: Topic-based (uses node title)
  quiz.push({
    q: `${node.title} are mostly about...`,
    options: shuffle([
      categoryDescription(node),
      'Drawing pictures only',
      'Counting numbers',
    ]),
    correct: categoryDescription(node),
    hint: rules[1] || 'Think about what we just learned!',
  });
  return quiz;
}

function categoryDescription(node) {
  const desc = {
    'l1': 'Words like "a", "an", "the" before nouns',
    'l4': 'Names of people, places or things',
    'l5': 'Words that replace nouns (I, you, he, she)',
    'l6': 'Action or doing words',
    'l7': 'Words that describe nouns',
    'l8': 'Words that describe verbs (how, when, where)',
    'l9': 'Words that show position (in, on, at)',
    'l10': 'Words that join sentences (and, but, or)',
    'l11': 'Words that show strong feeling (Wow!, Oh!)',
  };
  return desc[node.id] || `Using ${node.title} in English`;
}

function pickRandom(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderLessonStage() {
  const wrap = document.getElementById('lp-stages');
  const stage = _lp.stages[_lp.idx];
  const total = _lp.stages.length;
  if (!stage) return;

  // Update progress bar + counter + dots
  const pct = ((_lp.idx + 1) / total) * 100;
  document.getElementById('lp-progress-fill').style.width = pct + '%';
  document.getElementById('lp-step-counter').textContent = `${_lp.idx + 1} / ${total}`;
  const dotsEl = document.getElementById('lp-stage-dots');
  dotsEl.innerHTML = _lp.stages.map((s, i) =>
    `<span class="lp-dot ${i === _lp.idx ? 'active' : ''} ${i < _lp.idx ? 'done' : ''}" title="${s.label}">${s.icon}</span>`
  ).join('');

  // Stop any speech when changing stage
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();

  // Render specific stage
  let html = '';
  switch (stage.type) {
    case 'intro':    html = renderStageIntro();    break;
    case 'watch':    html = renderStageWatch();    break;
    case 'concept':  html = renderStageConcept();  break;
    case 'examples': html = renderStageExamples(stage.items); break;
    case 'quiz':     html = renderStageQuiz(stage.items); break;
    case 'speak':    html = renderStageSpeak();    break;
    case 'write':    html = renderStageWrite();    break;
    case 'done':     html = renderStageDone();     break;
  }
  wrap.innerHTML = `<div class="lp-stage-fade">${html}</div>`;

  // Update prev/next buttons
  document.getElementById('lp-prev').style.visibility = _lp.idx === 0 ? 'hidden' : 'visible';
  const nextBtn = document.getElementById('lp-next');
  if (stage.type === 'done') {
    nextBtn.textContent = '🎉 Finish';
  } else if (_lp.idx === total - 2) {
    nextBtn.textContent = 'Almost done ▶';
  } else {
    nextBtn.textContent = 'Next ▶';
  }

  // Auto-narrate intro/concept/examples
  setTimeout(() => autoNarrate(stage), 500);
}

function lpNext() {
  const stage = _lp.stages[_lp.idx];
  if (stage && stage.type === 'done') {
    finishLesson();
    return;
  }
  if (_lp.idx < _lp.stages.length - 1) {
    _lp.idx++;
    renderLessonStage();
    playSound(1000, 80);
  }
}
function lpPrev() {
  if (_lp.idx > 0) {
    _lp.idx--;
    renderLessonStage();
    playSound(600, 80);
  }
}

// ── Stage renderers ─────────────────────────────────────────────
function renderStageIntro() {
  const n = _lp.node;
  return `
    <div class="lp-intro">
      <div class="lp-art-big">${n.art || n.icon}</div>
      <h3 class="lp-stage-title">Hi! I'm Buddy 🦉</h3>
      <p class="lp-stage-text">Today we will learn about <b>${escapeHtml(n.title)}</b>.<br>It will be super fun! Are you ready? 🎉</p>
      <button class="lp-mini-btn" onclick="autoNarrate(_lp.stages[_lp.idx])">🔊 Listen again</button>
    </div>`;
}

function renderStageWatch() {
  const n = _lp.node;
  const ytQuery = encodeURIComponent(`${n.topic} for kids`);
  // Kick off async video fetch (non-blocking)
  setTimeout(() => loadStageWatchVideos(n.topic), 100);
  return `
    <div class="lp-watch">
      <div class="lp-anim-stage">
        <div class="lp-anim-emoji bounce">${(n.art || n.icon).slice(0, 2)}</div>
        <div class="lp-anim-emoji float">${(n.art || '✨').slice(2, 4)}</div>
        <div class="lp-anim-emoji wiggle">${(n.art || '⭐').slice(4, 6) || '⭐'}</div>
        <div class="lp-anim-clouds">☁️ ☁️ ☁️</div>
      </div>
      <h3 class="lp-stage-title">📺 Watch &amp; Learn</h3>
      <p class="lp-stage-text">Real videos about <b>${escapeHtml(n.title)}</b>:</p>
      <div id="lp-yt-grid" class="lp-yt-grid">
        <div class="lp-yt-loading">🎬 Finding the best videos…</div>
      </div>
      <a class="lp-mini-btn yt" href="https://www.youtube.com/results?search_query=${ytQuery}" target="_blank" rel="noopener">🔍 More videos on YouTube</a>
    </div>`;
}

async function loadStageWatchVideos(topic) {
  const grid = document.getElementById('lp-yt-grid');
  if (!grid) return;
  try {
    const res = await fetch(`${API}/media/youtube?q=${encodeURIComponent(topic + ' for kids')}&max_results=4`);
    const data = await res.json();
    if (!data.videos || data.videos.length === 0) {
      grid.innerHTML = data.configured
        ? '<div class="lp-yt-empty">No videos found — try the YouTube search button below.</div>'
        : '<div class="lp-yt-empty">📺 Add a free YouTube API key to see real videos here. Until then, click the search button below.</div>';
      return;
    }
    grid.innerHTML = data.videos.map(v => `
      <div class="lp-yt-card" onclick="playYTVideo('${v.id}')">
        <div class="lp-yt-thumb">
          <img src="${escapeHtml(v.thumbnail)}" alt="${escapeHtml(v.title)}" loading="lazy" />
          <div class="lp-yt-play">▶</div>
        </div>
        <div class="lp-yt-meta">
          <div class="lp-yt-title">${escapeHtml(v.title)}</div>
          <div class="lp-yt-channel">${escapeHtml(v.channel)}</div>
        </div>
      </div>`).join('');
  } catch (e) {
    grid.innerHTML = '<div class="lp-yt-empty">Could not load videos right now.</div>';
  }
}

function playYTVideo(id) {
  const grid = document.getElementById('lp-yt-grid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="lp-yt-player">
      <iframe src="https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0"
        title="YouTube video player" frameborder="0" allowfullscreen
        allow="accelerometer; autoplay; encrypted-media; picture-in-picture"></iframe>
    </div>
    <button class="lp-mini-btn" onclick="loadStageWatchVideos('${escapeHtml(_lp.node.topic)}')">⬅ Back to videos</button>`;
}

function renderStageConcept() {
  const concept = _lp.data?.concept || '';
  const rules = Array.isArray(_lp.data?.rules) ? _lp.data.rules : [];
  return `
    <div class="lp-concept">
      <h3 class="lp-stage-title">📘 Let's Learn!</h3>
      <div class="lp-concept-card">${escapeHtml(concept)}</div>
      <div class="lp-rules">
        <div class="lp-rules-title">📋 Important Rules:</div>
        <ul>${rules.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
      </div>
      <button class="lp-mini-btn" onclick="speakText(document.querySelector('.lp-concept-card').textContent)">🔊 Listen to concept</button>
    </div>`;
}

function renderStageExamples(items) {
  const list = (items && items.length) ? items : ['I read a book.', 'She is happy.', 'We play together.'];
  return `
    <div class="lp-examples">
      <h3 class="lp-stage-title">✨ Watch Examples</h3>
      <div class="lp-examples-list">
        ${list.map((ex, i) => `
          <div class="lp-example-card" style="animation-delay:${i * 0.15}s">
            <div class="lp-ex-num">${i + 1}</div>
            <div class="lp-ex-text">${escapeHtml(ex)}</div>
            <button class="lp-ex-listen" onclick="speakText(this.parentElement.querySelector('.lp-ex-text').textContent)" aria-label="Listen">🔊</button>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderStageQuiz(quiz) {
  _lp.quizScore = 0;
  _lp.quizAnswered = 0;
  return `
    <div class="lp-quiz">
      <h3 class="lp-stage-title">🎯 Quick Quiz!</h3>
      <p class="lp-stage-text">Tap the correct answer for each question.</p>
      <div class="lp-quiz-list">
        ${quiz.map((q, qi) => `
          <div class="lp-quiz-q" data-qi="${qi}">
            <div class="lp-q-text">${qi + 1}. ${escapeHtml(q.q)}</div>
            <div class="lp-q-opts">
              ${q.options.map(opt => `
                <button class="lp-q-opt" onclick="lpAnswerQuiz(${qi}, this, ${JSON.stringify(opt === q.correct)})" data-opt="${escapeHtml(opt)}">${escapeHtml(opt)}</button>
              `).join('')}
            </div>
            <div class="lp-q-feedback"></div>
          </div>`).join('')}
      </div>
      <div id="lp-quiz-score" class="lp-quiz-score"></div>
    </div>`;
}

function lpAnswerQuiz(qi, btn, isCorrect) {
  const card = btn.closest('.lp-quiz-q');
  if (card.dataset.done === '1') return; // already answered
  card.dataset.done = '1';
  const opts = card.querySelectorAll('.lp-q-opt');
  opts.forEach(o => o.disabled = true);
  const fb = card.querySelector('.lp-q-feedback');
  if (isCorrect) {
    btn.classList.add('correct');
    fb.innerHTML = '✅ <b>Yes! That\'s right!</b> 🎉';
    fb.className = 'lp-q-feedback ok';
    _lp.quizScore++;
    playSound(1500, 200);
  } else {
    btn.classList.add('wrong');
    fb.innerHTML = '❌ Oops! Try the next one.';
    fb.className = 'lp-q-feedback no';
    playSound(300, 200);
  }
  _lp.quizAnswered++;
  const total = card.parentElement.children.length;
  document.getElementById('lp-quiz-score').textContent =
    `Score: ${_lp.quizScore} / ${_lp.quizAnswered}`;
  if (_lp.quizAnswered === total) {
    document.getElementById('lp-quiz-score').innerHTML +=
      ` &nbsp; ${_lp.quizScore === total ? '🏆 Perfect!' : (_lp.quizScore >= total / 2 ? '👍 Good job!' : '💪 Keep practicing!')}`;
  }
}

function renderStageSpeak() {
  const tip = _lp.data?.spoken_tip || 'Speak slowly and clearly!';
  const sentence = (_lp.data?.examples && _lp.data.examples[0]) || _lp.data?.practice_question || 'I love learning English.';
  return `
    <div class="lp-speak">
      <h3 class="lp-stage-title">🗣️ Speak Time!</h3>
      <p class="lp-stage-text">${escapeHtml(tip)}</p>
      <div class="lp-speak-sentence" id="lp-speak-sentence">${escapeHtml(sentence)}</div>
      <div class="lp-speak-controls">
        <button class="lp-mini-btn" onclick="speakText(document.getElementById('lp-speak-sentence').textContent)">🔊 Listen</button>
        <button class="lp-mini-btn warm" onclick="lpStartMic()">🎤 Speak now</button>
      </div>
      <input id="lp-speak-input" class="form-input" type="text" placeholder="Or type what you want to say..." style="margin-top:10px;" />
      <div id="lp-speak-feedback" class="lp-speak-feedback"></div>
    </div>`;
}

function lpStartMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const fb = document.getElementById('lp-speak-feedback');
  if (!SR) { fb.textContent = 'Mic not supported in this browser. Type instead!'; return; }
  const rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  fb.textContent = '🎙️ Listening...';
  rec.onresult = (e) => {
    const text = e.results[0][0].transcript;
    document.getElementById('lp-speak-input').value = text;
    fb.innerHTML = `✅ You said: <b>${escapeHtml(text)}</b>`;
    fb.className = 'lp-speak-feedback ok';
  };
  rec.onerror = () => { fb.textContent = '⚠️ Could not hear you. Try again!'; };
  rec.start();
}

function renderStageWrite() {
  const task = _lp.data?.writing_task || `Write 3 short sentences using ${_lp.node.title}.`;
  return `
    <div class="lp-write">
      <h3 class="lp-stage-title">✍️ Your Turn to Write</h3>
      <p class="lp-stage-text">${escapeHtml(task)}</p>
      <textarea id="lp-write-input" class="form-textarea" rows="4" placeholder="Write your answer here..."></textarea>
      <button class="lp-mini-btn warm" onclick="lpCheckWriting()">✓ Check my writing</button>
      <div id="lp-write-feedback" class="lp-write-feedback"></div>
    </div>`;
}

async function lpCheckWriting() {
  const text = document.getElementById('lp-write-input').value.trim();
  const fb = document.getElementById('lp-write-feedback');
  if (!text) { fb.textContent = 'Please write something first!'; return; }
  fb.textContent = '🦉 Buddy is checking your writing...';
  try {
    const res = await fetch(`${API}/english/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, level: state.englishLevel }),
    });
    const data = await res.json();
    fb.innerHTML = `<div class="lp-correction"><b>Corrected:</b> ${escapeHtml(data.corrected || text)}</div>
                    <div class="lp-correction-tip">${escapeHtml(data.explanation || 'Great work!')}</div>`;
  } catch (e) {
    fb.textContent = '✅ Great writing! Keep practicing.';
  }
}

function renderStageDone() {
  return `
    <div class="lp-done">
      <div class="lp-confetti">🎉🎊🏆⭐✨</div>
      <h3 class="lp-stage-title big">You did it!</h3>
      <p class="lp-stage-text">You finished <b>${escapeHtml(_lp.node.title)}</b>! 🌟</p>
      <div class="lp-rewards">
        <div class="lp-reward"><div class="lp-reward-num">+20</div><div class="lp-reward-lbl">XP</div></div>
        <div class="lp-reward"><div class="lp-reward-num">${_lp.quizScore}</div><div class="lp-reward-lbl">Quiz</div></div>
        <div class="lp-reward"><div class="lp-reward-num">+1</div><div class="lp-reward-lbl">Streak</div></div>
      </div>
      <p class="lp-stage-text small">Click <b>Finish</b> to keep climbing the path! 🚀</p>
    </div>`;
}

function autoNarrate(stage) {
  if (!stage) return;
  let text = '';
  if (stage.type === 'intro') {
    text = `Hi! I'm Buddy. Today we will learn about ${_lp.node.title}. Are you ready? Let's go!`;
  } else if (stage.type === 'watch') {
    text = `Watch carefully! Here are the key ideas about ${_lp.node.title}.`;
  } else if (stage.type === 'concept') {
    text = _lp.data?.concept || `Let's learn about ${_lp.node.title}.`;
  } else if (stage.type === 'examples') {
    text = `Here are some examples of ${_lp.node.title}. Listen carefully!`;
  } else if (stage.type === 'done') {
    text = `Awesome work! You finished the ${_lp.node.title} lesson!`;
  }
  if (text) speakText(text);
}

function speakText(text) {
  if (!('speechSynthesis' in window) || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  u.pitch = 1.05;
  window.speechSynthesis.speak(u);
}

function finishLesson() {
  const lessonId = _lp.lessonId;
  if (!lessonId) return;
  state.englishLessonProgress[lessonId] = true;
  saveAll();
  addEnglishXp(20);
  addPoints(20);
  playSound(1500, 200);
  showBadgeNotification(`Lesson Complete! +20 XP`);
  closeLessonModal();
  renderEnglishPath();
  renderDashboard();
}

// Legacy function shells kept for any leftover refs (no-op safe)
function completeLesson() { finishLesson(); }
function loadEnglishLesson() { /* deprecated — superseded by lesson player */ }
function speakLessonQuestion() {
  const t = document.querySelector('.lp-speak-sentence')?.textContent;
  if (t) speakText(t);
}
function startEnglishVoicePractice() { lpStartMic(); }
function evaluateSpokenEnglish() { /* deprecated — handled inline in lpStartMic */ }
function checkWritingPractice() { lpCheckWriting(); }

// ═══════════════════════════════════════════════════════════════
//  EXTRA BRAIN GAMES — Math Sprint, Word Scramble, Memory Match
// ═══════════════════════════════════════════════════════════════

let mathSprint = { score: 0, current: null, timer: null, timeLeft: 30 };

function startMathSprint() {
  mathSprint = { score: 0, current: null, timer: null, timeLeft: 30 };
  document.getElementById('math-score').textContent = '0';
  document.getElementById('math-time').textContent = '30';
  nextMathQuestion();
  mathSprint.timer = setInterval(() => {
    mathSprint.timeLeft--;
    document.getElementById('math-time').textContent = mathSprint.timeLeft;
    if (mathSprint.timeLeft <= 0) endMathSprint();
  }, 1000);
}

function nextMathQuestion() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let answer;
  if (op === '+') answer = a + b;
  else if (op === '-') answer = a - b;
  else answer = a * b;
  mathSprint.current = answer;
  document.getElementById('math-question').textContent = `${a} ${op} ${b} = ?`;
  document.getElementById('math-answer').value = '';
  document.getElementById('math-answer').focus();
}

function submitMath() {
  const val = parseInt(document.getElementById('math-answer').value);
  if (val === mathSprint.current) {
    mathSprint.score += 10;
    document.getElementById('math-score').textContent = mathSprint.score;
    playSound(1300, 80);
    nextMathQuestion();
  } else {
    playSound(400, 120);
    document.getElementById('math-answer').style.borderColor = '#EF4444';
    setTimeout(() => document.getElementById('math-answer').style.borderColor = '', 400);
  }
}

function endMathSprint() {
  clearInterval(mathSprint.timer);
  mathSprint.timer = null;
  document.getElementById('math-question').textContent = `Time! Score: ${mathSprint.score}`;
  if (mathSprint.score > 0) {
    addPoints(Math.floor(mathSprint.score / 5));
    trackActivity('brain_usage');
  }
}

// — Word Scramble —
const scrambleBank = ['python', 'school', 'banana', 'rocket', 'rainbow', 'computer', 'library', 'science', 'planet', 'jungle'];
let scrambleWord = '';

function newScramble() {
  scrambleWord = scrambleBank[Math.floor(Math.random() * scrambleBank.length)];
  const arr = scrambleWord.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  document.getElementById('scramble-word').textContent = arr.join(' ').toUpperCase();
  document.getElementById('scramble-input').value = '';
  document.getElementById('scramble-result').textContent = '';
}

function checkScramble() {
  const val = (document.getElementById('scramble-input').value || '').trim().toLowerCase();
  const out = document.getElementById('scramble-result');
  if (val === scrambleWord) {
    out.textContent = '🎉 Correct! +15 points';
    addPoints(15);
    trackActivity('brain_usage');
    playSound(1400, 150);
    setTimeout(newScramble, 800);
  } else {
    out.textContent = `Not yet — try again. Hint: it has ${scrambleWord.length} letters.`;
  }
}

// — Memory Match —
let memoryState = { cards: [], flipped: [], matched: 0, moves: 0 };

function startMemoryGame() {
  const emojis = ['🐶','🐱','🦁','🐼','🐸','🦊','🐵','🐯'];
  const deck = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
  memoryState = { cards: deck, flipped: [], matched: 0, moves: 0 };
  const grid = document.getElementById('memory-grid');
  if (!grid) return;
  grid.innerHTML = deck.map((emoji, i) => `
    <div class="memory-card" data-i="${i}" onclick="flipCard(${i})">
      <div class="memory-inner">
        <div class="memory-front">?</div>
        <div class="memory-back">${emoji}</div>
      </div>
    </div>`).join('');
  document.getElementById('memory-moves').textContent = '0';
}

function flipCard(i) {
  if (memoryState.flipped.length >= 2) return;
  const card = document.querySelector(`.memory-card[data-i="${i}"]`);
  if (!card || card.classList.contains('flipped') || card.classList.contains('matched')) return;
  card.classList.add('flipped');
  memoryState.flipped.push(i);
  if (memoryState.flipped.length === 2) {
    memoryState.moves++;
    document.getElementById('memory-moves').textContent = memoryState.moves;
    const [a, b] = memoryState.flipped;
    if (memoryState.cards[a] === memoryState.cards[b]) {
      setTimeout(() => {
        document.querySelector(`.memory-card[data-i="${a}"]`)?.classList.add('matched');
        document.querySelector(`.memory-card[data-i="${b}"]`)?.classList.add('matched');
        memoryState.flipped = [];
        memoryState.matched += 2;
        playSound(1400, 100);
        if (memoryState.matched === memoryState.cards.length) {
          addPoints(30);
          trackActivity('brain_usage');
          showBadgeNotification('Memory Master! +30');
        }
      }, 500);
    } else {
      setTimeout(() => {
        document.querySelector(`.memory-card[data-i="${a}"]`)?.classList.remove('flipped');
        document.querySelector(`.memory-card[data-i="${b}"]`)?.classList.remove('flipped');
        memoryState.flipped = [];
      }, 800);
    }
  }
}

// Stub keepers (in case HTML still references) — speakInLanguage is used by speakLessonQuestion etc.
function speakInLanguage(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.95;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}
function languageToVoiceCode() { return 'en-US'; }

// Sidebar toggle for mobile
function toggleSidebar() {
  document.body.classList.toggle('sidebar-open');
}

// ═══════════════════════════════════════════════════════════════
//  WELCOME TUTORIAL CAROUSEL (animated, kid-friendly)
// ═══════════════════════════════════════════════════════════════
let _tutorIdx = 0;
let _tutorTimer = null;
let _tutorPaused = false;

function initTutorCarousel() {
  const slides = document.querySelectorAll('#tutor-track .tutor-slide');
  const dotsWrap = document.getElementById('tutor-dots');
  if (!dotsWrap || slides.length === 0) return;
  dotsWrap.innerHTML = '';
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'tutor-dot' + (i === 0 ? ' active' : '');
    dot.onclick = () => tutorGoTo(i);
    dotsWrap.appendChild(dot);
  });
  startTutorTimer();
}

function startTutorTimer() {
  if (_tutorTimer) clearInterval(_tutorTimer);
  _tutorTimer = setInterval(() => { if (!_tutorPaused) tutorNext(); }, 3500);
}

function tutorGoTo(i) {
  const slides = document.querySelectorAll('#tutor-track .tutor-slide');
  const dots = document.querySelectorAll('#tutor-dots .tutor-dot');
  if (slides.length === 0) return;
  _tutorIdx = (i + slides.length) % slides.length;
  slides.forEach((s, idx) => s.classList.toggle('active', idx === _tutorIdx));
  dots.forEach((d, idx) => d.classList.toggle('active', idx === _tutorIdx));
}

function tutorNext() { tutorGoTo(_tutorIdx + 1); }
function tutorPrev() { tutorGoTo(_tutorIdx - 1); }
function tutorPlayPause() {
  _tutorPaused = !_tutorPaused;
  const btn = document.getElementById('tutor-play-btn');
  if (btn) btn.textContent = _tutorPaused ? '▶' : '⏸';
}

document.addEventListener('DOMContentLoaded', () => {
  // only init carousel if welcome screen is showing
  if (document.getElementById('welcome-screen') && !state.username) {
    setTimeout(initTutorCarousel, 50);
  }
});
