/**
 * js/chatbot.js — Bonga na Vybe
 * Floating RAG chatbot panel for the Vybe Africa website.
 *
 * Connects to /api/chat on the backend.
 * Self-contained — no external dependencies required.
 */

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const RENDER_BOT_ENDPOINT = 'https://vybe-africa-bot.onrender.com/api/chat';
  const PRIMARY_API_URL = (typeof window !== 'undefined' && window.BOT_API_URL) ? window.BOT_API_URL : RENDER_BOT_ENDPOINT;
  const FALLBACK_API_URL = '/api/chat';

  const PILLARS = [
    { id: null,              label: '🌍 All Topics',       color: '#9f402d' },
    { id: 'srhr',            label: '💊 SRHR & Health',    color: '#4d6453' },
    { id: 'climate',         label: '🌱 Climate',          color: '#705d00' },
    { id: 'child_protection',label: '🛡 Child Protection', color: '#802918' },
    { id: 'governance',      label: '🏛 Governance',       color: '#516857' },
  ];

  const WELCOME_MSG =
    `Habari! I'm **Bonga na Vybe** 🤖 — your guide to Vybe Africa's four pillars.\n\n` +
    `I can answer questions about:\n` +
    `• 💊 SRHR & Maternal Health\n` +
    `• 🌱 Climate Action & Eco\n` +
    `• 🛡 Child Protection\n` +
    `• 🏛 Inclusive Governance\n\n` +
    `All my answers come from trusted sources. Ask away!\n\n` +
    `📞 **Emergency Toll-free Helplines**:\n` +
    `• **Aunty Jane (SRHR)**: 0800721530 (WhatsApp: 0727101919)\n` +
    `• **GBV Helpline**: 1195 (24/7)\n` +
    `• **Child Helpline**: 116 (24/7)`;

  const SUGGESTED = [
    'What is FGM and how does Vybe address it?',
    'How does climate change affect West Pokot?',
    'How can youth participate in governance?',
    'What are children\'s rights in Kenya?',
  ];

  // ── State ─────────────────────────────────────────────────────────────────
  let activePillar   = null;
  let isOpen         = false;
  let isLoading      = false;
  let messageHistory = [];

  // ── Inject styles ─────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --bvb-primary:   #9f402d;
      --bvb-secondary: #4d6453;
      --bvb-surface:   #fcf9f8;
      --bvb-on-surface:#1c1b1b;
      --bvb-muted:     #56423e;
      --bvb-border:    #ddc0ba;
      --bvb-shadow:    0 20px 60px rgba(28,27,27,0.18);
    }

    /* Launcher button */
    #bvb-launcher {
      position: fixed; bottom: 28px; right: 28px; z-index: 9999;
      width: 60px; height: 60px; border-radius: 50%;
      background: linear-gradient(135deg, #9f402d, #c45e45);
      color: #fff; border: none; cursor: pointer;
      box-shadow: 0 6px 24px rgba(159,64,45,0.45);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.25s cubic-bezier(.34,1.56,.64,1),
                  box-shadow 0.25s ease;
      font-size: 26px;
    }
    #bvb-launcher:hover {
      transform: scale(1.1);
      box-shadow: 0 8px 32px rgba(159,64,45,0.55);
    }
    #bvb-launcher .bvb-launcher-label {
      position: absolute;
      right: 74px;
      background: #1c1b1b;
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: 'Plus Jakarta Sans', sans-serif;
      border: 1px solid rgba(255,255,255,0.1);
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
    }
    #bvb-launcher:hover .bvb-launcher-label {
      transform: scale(1.05);
      opacity: 1;
    }
    #bvb-launcher .bvb-badge {
      position: absolute; top: 2px; right: 2px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #e9c400; border: 2px solid #fff;
      animation: bvb-pulse 2s infinite;
    }
    @keyframes bvb-pulse {
      0%,100% { opacity: 1; transform: scale(1); }
      50%      { opacity: .7; transform: scale(1.3); }
    }

    /* Panel */
    #bvb-panel {
      position: fixed; bottom: 100px; right: 28px; z-index: 9998;
      width: 380px; max-width: calc(100vw - 40px);
      height: 580px; max-height: calc(100vh - 140px);
      background: var(--bvb-surface);
      border-radius: 20px;
      box-shadow: var(--bvb-shadow);
      display: flex; flex-direction: column;
      overflow: hidden;
      transform: translateY(24px) scale(0.96);
      opacity: 0; pointer-events: none;
      transition: transform 0.3s cubic-bezier(.34,1.3,.64,1),
                  opacity 0.25s ease;
      font-family: 'Inter', sans-serif;
    }
    #bvb-panel.bvb-open {
      transform: translateY(0) scale(1);
      opacity: 1; pointer-events: all;
    }

    /* Header */
    #bvb-header {
      background: linear-gradient(135deg, #9f402d 0%, #7a3220 100%);
      color: #fff;
      padding: 16px 18px 12px;
      display: flex; align-items: center; gap: 12px;
      flex-shrink: 0;
    }
    #bvb-avatar {
      width: 42px; height: 42px; border-radius: 50%;
      background: rgba(255,255,255,0.18);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    #bvb-header-info { flex: 1; min-width: 0; }
    #bvb-header-name {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 800; font-size: 15px; line-height: 1.2;
    }
    #bvb-header-status {
      font-size: 11px; opacity: .85; display: flex; align-items: center; gap: 5px; margin-top: 2px;
    }
    #bvb-status-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #4caf50;
      animation: bvb-pulse 2.5s infinite;
    }
    #bvb-close {
      background: rgba(255,255,255,0.15); border: none; color: #fff;
      width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; transition: background .2s;
      flex-shrink: 0;
    }
    #bvb-close:hover { background: rgba(255,255,255,0.3); }

    /* Pillar chips */
    #bvb-pills {
      padding: 10px 14px;
      display: flex; gap: 6px; overflow-x: auto; flex-shrink: 0;
      background: #f6f3f2; border-bottom: 1px solid var(--bvb-border);
      scrollbar-width: none;
    }
    #bvb-pills::-webkit-scrollbar { display: none; }
    .bvb-pill {
      white-space: nowrap; border: 1.5px solid transparent;
      padding: 4px 10px; border-radius: 999px;
      font-size: 11px; font-weight: 600; cursor: pointer;
      background: #fff; color: var(--bvb-muted);
      border-color: var(--bvb-border); transition: all .2s;
    }
    .bvb-pill.bvb-active {
      background: var(--bvb-primary); color: #fff; border-color: var(--bvb-primary);
    }
    .bvb-pill:hover:not(.bvb-active) { border-color: var(--bvb-primary); color: var(--bvb-primary); }

    /* Messages */
    #bvb-messages {
      flex: 1; overflow-y: auto; padding: 16px 14px;
      display: flex; flex-direction: column; gap: 14px;
      scroll-behavior: smooth;
    }
    #bvb-messages::-webkit-scrollbar { width: 4px; }
    #bvb-messages::-webkit-scrollbar-thumb { background: var(--bvb-border); border-radius: 4px; }

    .bvb-msg { display: flex; gap: 8px; animation: bvb-fadein .25s ease; }
    .bvb-msg.bvb-user { flex-direction: row-reverse; }
    @keyframes bvb-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

    .bvb-bubble {
      max-width: 82%; padding: 10px 14px; border-radius: 16px;
      font-size: 13.5px; line-height: 1.65; color: var(--bvb-on-surface);
      background: #f0eded;
    }
    .bvb-msg.bvb-user .bvb-bubble {
      background: var(--bvb-primary); color: #fff;
      border-bottom-right-radius: 4px;
    }
    .bvb-msg.bvb-bot .bvb-bubble { border-bottom-left-radius: 4px; }
    .bvb-bubble strong { font-weight: 700; }
    .bvb-bubble ul { margin: 6px 0 0 16px; padding: 0; }
    .bvb-bubble li { margin-bottom: 3px; }

    /* Sources */
    .bvb-sources {
      margin-top: 8px; padding-top: 8px;
      border-top: 1px solid rgba(0,0,0,.08);
      display: flex; flex-direction: column; gap: 4px;
    }
    .bvb-source-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .05em; color: var(--bvb-muted); opacity: .7;
      margin-bottom: 2px;
    }
    .bvb-source-link {
      font-size: 11px; color: var(--bvb-primary); text-decoration: none;
      font-weight: 600; display: flex; align-items: center; gap: 4px;
    }
    .bvb-source-link:hover { text-decoration: underline; }
    .bvb-source-link::before { content: '↗'; font-size: 10px; }

    /* Suggested prompts */
    #bvb-suggestions {
      padding: 0 14px 10px;
      display: flex; flex-direction: column; gap: 6px; flex-shrink: 0;
    }
    .bvb-suggestion {
      background: #fff; border: 1.5px solid var(--bvb-border);
      border-radius: 10px; padding: 7px 12px;
      font-size: 12px; color: var(--bvb-primary); cursor: pointer;
      text-align: left; font-weight: 500; transition: all .18s;
    }
    .bvb-suggestion:hover {
      background: #fff3f0; border-color: var(--bvb-primary);
    }

    /* Input area */
    #bvb-input-area {
      padding: 10px 14px 14px;
      border-top: 1px solid var(--bvb-border);
      display: flex; gap: 8px; align-items: flex-end;
      background: var(--bvb-surface); flex-shrink: 0;
    }
    #bvb-input {
      flex: 1; border: 1.5px solid var(--bvb-border);
      border-radius: 12px; padding: 9px 13px;
      font-size: 13.5px; font-family: 'Inter', sans-serif;
      resize: none; outline: none; line-height: 1.5;
      max-height: 100px; overflow-y: auto;
      background: #fff; color: var(--bvb-on-surface);
      transition: border-color .2s;
    }
    #bvb-input:focus { border-color: var(--bvb-primary); }
    #bvb-send {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--bvb-primary); color: #fff;
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: opacity .2s, transform .15s;
      font-size: 18px;
    }
    #bvb-send:hover:not(:disabled) { transform: scale(1.08); }
    #bvb-send:disabled { opacity: .45; cursor: default; }

    /* Typing indicator */
    .bvb-typing { display: flex; align-items: center; gap: 5px; padding: 10px 14px; }
    .bvb-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--bvb-primary); opacity: .6;
      animation: bvb-bounce .9s infinite;
    }
    .bvb-dot:nth-child(2) { animation-delay: .15s; }
    .bvb-dot:nth-child(3) { animation-delay: .3s; }
    @keyframes bvb-bounce {
      0%,80%,100% { transform: translateY(0); }
      40%          { transform: translateY(-6px); }
    }

    /* Powered-by footer */
    #bvb-footer {
      text-align: center; font-size: 10px;
      color: #999; padding: 0 14px 10px;
      flex-shrink: 0;
    }
    #bvb-footer a { color: #999; }

    /* Mobile & Device Responsiveness */
    @media (max-width: 640px) {
      #bvb-launcher {
        bottom: 18px !important;
        right: 18px !important;
        width: 56px !important;
        height: 56px !important;
        font-size: 24px !important;
      }
      #bvb-launcher .bvb-launcher-label {
        display: none !important;
      }
      #bvb-panel {
        position: fixed !important;
        bottom: 0 !important;
        right: 0 !important;
        left: 0 !important;
        top: 0 !important;
        width: 100vw !important;
        height: 100dvh !important;
        max-width: 100vw !important;
        max-height: 100dvh !important;
        border-radius: 0 !important;
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      #bvb-header {
        padding-top: max(16px, env(safe-area-inset-top, 16px));
      }
      #bvb-input {
        font-size: 16px !important;
        padding: 12px 14px !important;
      }
      .bvb-bubble {
        max-width: 88% !important;
        font-size: 14px !important;
      }
      #bvb-close {
        width: 36px !important;
        height: 36px !important;
        font-size: 22px !important;
      }
    }
  `;
  document.head.appendChild(style);

  // ── Build DOM ─────────────────────────────────────────────────────────────
  function buildUI() {
    // Launcher
    const launcher = document.createElement('button');
    launcher.id    = 'bvb-launcher';
    launcher.setAttribute('aria-label', 'Open Bonga na Vybe chatbot');
    launcher.innerHTML = `<span class="material-symbols-outlined" style="font-size:26px">forum</span><span class="bvb-launcher-label">Bonga na Vybe</span><span class="bvb-badge"></span>`;

    // Panel
    const panel = document.createElement('div');
    panel.id    = 'bvb-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Bonga na Vybe chat');
    panel.innerHTML = `
      <div id="bvb-header">
        <div id="bvb-avatar" style="overflow:hidden; display:flex; align-items:center; justify-content:center;">
          <img src="assets/images/bot-logo.png" alt="Bonga na Vybe Mascot" class="w-full h-full object-cover" onerror="this.outerHTML='🤖'">
        </div>
        <div id="bvb-header-info">
          <div id="bvb-header-name">Bonga na Vybe</div>
          <div id="bvb-header-status">
            <span id="bvb-status-dot"></span>
            <span>Online · Powered by Vybe Africa</span>
          </div>
        </div>
        <button id="bvb-close" aria-label="Close chat">✕</button>
      </div>

      <div id="bvb-pills">
        ${PILLARS.map((p, i) =>
          `<button class="bvb-pill${i === 0 ? ' bvb-active' : ''}" data-pillar="${p.id ?? ''}">${p.label}</button>`
        ).join('')}
      </div>

      <div id="bvb-messages"></div>

      <div id="bvb-suggestions">
        ${SUGGESTED.map(s =>
          `<button class="bvb-suggestion">${s}</button>`
        ).join('')}
      </div>

      <div id="bvb-input-area">
        <textarea id="bvb-input" rows="1"
          placeholder="Ask about SRHR, climate, child protection, governance…"
          maxlength="400"></textarea>
        <button id="bvb-send" disabled aria-label="Send message">
          <span class="material-symbols-outlined" style="font-size:20px">send</span>
        </button>
      </div>

      <div id="bvb-footer">
        Answers sourced from UNICEF · UN Kenya · Red Cross · UNFPA
      </div>
    `;

    // Remove old floating button if present
    document.querySelectorAll('button.fixed.bottom-6.right-6').forEach(el => el.remove());

    document.body.appendChild(launcher);
    document.body.appendChild(panel);
    return { launcher, panel };
  }

  // ── Render message ─────────────────────────────────────────────────────────
  function renderMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  function appendMessage(role, text, sources = []) {
    const msgs    = document.getElementById('bvb-messages');
    const div     = document.createElement('div');
    div.className = `bvb-msg bvb-${role}`;

    const sourcesHtml = sources.length ? `
      <div class="bvb-sources">
        <div class="bvb-source-label">Sources</div>
        ${sources.map(s => `<a class="bvb-source-link" href="${s.url}" target="_blank" rel="noopener">${s.name}</a>`).join('')}
      </div>` : '';

    div.innerHTML = `
      <div class="bvb-bubble">
        <p>${renderMarkdown(text)}</p>
        ${sourcesHtml}
      </div>`;

    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showTyping() {
    const msgs = document.getElementById('bvb-messages');
    const div  = document.createElement('div');
    div.className = 'bvb-msg bvb-bot';
    div.id = 'bvb-typing';
    div.innerHTML = `<div class="bvb-bubble bvb-typing"><span class="bvb-dot"></span><span class="bvb-dot"></span><span class="bvb-dot"></span></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function hideTyping() {
    document.getElementById('bvb-typing')?.remove();
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(text) {
    if (isLoading || !text.trim()) return;

    // Hide suggestions once user interacts
    const sugg = document.getElementById('bvb-suggestions');
    if (sugg) sugg.style.display = 'none';

    isLoading = true;
    document.getElementById('bvb-send').disabled = true;
    document.getElementById('bvb-input').value   = '';
    document.getElementById('bvb-input').style.height = '';

    appendMessage('user', text);
    messageHistory.push({ role: 'user', content: text });

    showTyping();

    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 55000); // 55s client timeout

      let targetUrl = PRIMARY_API_URL;
      let res;
      try {
        res = await fetch(targetUrl, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ message: text, pillar: activePillar }),
          signal:  controller.signal,
        });
      } catch (firstErr) {
        if (FALLBACK_API_URL && targetUrl !== FALLBACK_API_URL) {
          targetUrl = FALLBACK_API_URL;
          res = await fetch(targetUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ message: text, pillar: activePillar }),
            signal:  controller.signal,
          });
        } else {
          throw firstErr;
        }
      }

      clearTimeout(timeoutId);
      hideTyping();

      if (!res.ok) {
        let errorMsg = 'Something went wrong. Please try again.';
        try {
          const rawText = await res.text();
          try {
            const errObj = JSON.parse(rawText);
            errorMsg = errObj.error || errObj.message || errorMsg;
          } catch (e) {
            if (rawText.includes('data:')) {
              const match = rawText.match(/data:\s*(\{"(?:error|text)":.*?\})/);
              if (match) {
                const parsed = JSON.parse(match[1]);
                errorMsg = parsed.error || parsed.text || errorMsg;
              }
            } else if (rawText.trim().length > 0 && rawText.length < 200) {
              errorMsg = rawText.trim();
            }
          }
        } catch (e) {}

        appendMessage('bot', errorMsg);
        return;
      }

      // Parse plain JSON response (compatible with Vercel serverless)
      const data = await res.json();

      if (data.error) {
        appendMessage('bot', data.error);
        return;
      }

      const answerText = data.text || 'No response received.';
      const sources    = data.sources || [];

      appendMessage('bot', answerText, sources);
      messageHistory.push({ role: 'assistant', content: answerText });

    } catch (err) {
      hideTyping();
      if (err.name === 'AbortError') {
        appendMessage('bot', 'The request timed out. Please try a shorter question or try again.');
      } else {
        appendMessage('bot', 'Could not connect to the server. Please check your connection and try again.');
      }
    } finally {
      isLoading = false;
      document.getElementById('bvb-send').disabled = false;
      document.getElementById('bvb-input').focus();
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    const { launcher, panel } = buildUI();
    const msgs    = document.getElementById('bvb-messages');
    const input   = document.getElementById('bvb-input');
    const sendBtn = document.getElementById('bvb-send');

    // Welcome message
    appendMessage('bot', WELCOME_MSG);

    // Open / close
    launcher.addEventListener('click', () => {
      isOpen = !isOpen;
      panel.classList.toggle('bvb-open', isOpen);
      launcher.style.display = isOpen ? 'none' : 'flex';
      launcher.querySelector('.bvb-badge')?.remove();
      const label = launcher.querySelector('.bvb-launcher-label');
      if (label) {
        label.style.opacity = isOpen ? '0' : '1';
        label.style.pointerEvents = isOpen ? 'none' : 'all';
      }
      if (isOpen) input.focus();
    });
    document.getElementById('bvb-close').addEventListener('click', () => {
      isOpen = false;
      panel.classList.remove('bvb-open');
      launcher.style.display = 'flex';
      const label = launcher.querySelector('.bvb-launcher-label');
      if (label) {
        label.style.opacity = '1';
        label.style.pointerEvents = 'all';
      }
    });

    // Pillar pills
    document.querySelectorAll('.bvb-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.bvb-pill').forEach(p => p.classList.remove('bvb-active'));
        pill.classList.add('bvb-active');
        activePillar = pill.dataset.pillar || null;
      });
    });

    // Suggested prompts
    document.querySelectorAll('.bvb-suggestion').forEach(btn => {
      btn.addEventListener('click', () => sendMessage(btn.textContent));
    });

    // Input
    input.addEventListener('input', () => {
      sendBtn.disabled = input.value.trim().length === 0;
      input.style.height = '';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
      }
    });
    sendBtn.addEventListener('click', () => sendMessage(input.value));
  }

  // Run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
