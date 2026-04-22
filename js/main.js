// ═══════════════ ENTRY + BOOT ═══════════════
(function () {
  const entry = document.getElementById('entry');
  const boot = document.getElementById('boot');
  const blines = document.getElementById('blines');
  const bbar = document.getElementById('bbar');
  const bootData = [
    { t: 'BIOS v2.0 — SAGAR.P SYSTEM INIT', c: 'ok', d: 120 },
    { t: 'Loading kernel modules...', c: '', d: 240 },
    { t: '[OK] neural_engine.ko → loaded', c: 'ok', d: 380 },
    { t: '[OK] crypto_core.ko → loaded', c: 'ok', d: 510 },
    { t: '[OK] flutter_runtime.ko → loaded', c: 'ok', d: 640 },
    { t: '[WARN] social_battery.ko — low charge detected', c: 'warn', d: 800 },
    { t: '[OK] gemini_api.ko → loaded', c: 'ok', d: 940 },
    { t: '[OK] tensorflow_stack.ko → loaded', c: 'ok', d: 1060 },
    { t: 'Mounting GEC_THRISSUR_2027...', c: '', d: 1180 },
    { t: '[ERR] caffeine.dep — dependency unsatisfied', c: 'err', d: 1320 },
    { t: '[OK] cybersec_tools → /skills/security', c: 'ok', d: 1460 },
    { t: '[OK] ai_ml_stack → /skills/ai', c: 'ok', d: 1580 },
    { t: 'Starting services: pricerail · blindfold · czernode...', c: '', d: 1720 },
    { t: '[OK] All systems operational.', c: 'ok', d: 1880 },
    { t: 'BOOT COMPLETE — Welcome to SAGAR.P v2.0 🦁', c: 'ok', d: 2020 },
  ];
  // Entry fades after 2.8s, then boot shows
  setTimeout(() => {
    entry.style.transition = 'opacity .7s ease';
    entry.style.opacity = '0';
    setTimeout(() => {
      entry.style.display = 'none';
      boot.classList.add('show');
      runBoot();
    }, 700);
  }, 2800);
  function runBoot() {
    bootData.forEach((l, i) => {
      setTimeout(() => {
        const d = document.createElement('div');
        d.className = 'bl ' + (l.c || ''); d.textContent = '> ' + l.t;
        blines.appendChild(d);
        requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('vis')));
        bbar.style.width = ((i + 1) / bootData.length * 100) + '%';
        if (i === bootData.length - 1) {
          setTimeout(() => {
            boot.style.transition = 'opacity .7s ease';
            boot.style.opacity = '0';
            setTimeout(() => {
              boot.style.display = 'none';
              document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));
              document.querySelectorAll('.kcat').forEach(el => skillObs.observe(el));
              startHero();
            }, 700);
          }, 500);
        }
      }, l.d);
    });
  }
})();

// ═══════════════ SCROLL REVEAL ═══════════════
const revObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); revObs.unobserve(e.target); } });
}, { threshold: .1, rootMargin: '0px 0px -40px 0px' });
const skillObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.sbrf').forEach(b => { b.style.width = b.style.getPropertyValue('--w') || '0%'; });
    }
  });
}, { threshold: .3 });

// ═══════════════ NAV ACTIVE ═══════════════
const navSecs = ['hero', 'about', 'skills', 'projects', 'achievements', 'czernode', 'game', 'contact'];
window.addEventListener('scroll', () => {
  let cur = '';
  navSecs.forEach(id => { const el = document.getElementById(id); if (el && window.scrollY >= el.offsetTop - 120) cur = id; });
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('act', a.getAttribute('href') === '#' + cur));
}, { passive: true });

// ═══════════════ HERO PARTICLES CANVAS ═══════════════
function startHero() {
  // Typing tagline — text goes in span#htagl; .hcursor span blinks separately in CSS
  const phrases = ['Building Intelligent Systems', 'Breaking Them Securely', 'AI Developer + CTF Warrior', 'Kerala → the Stars 🚀', 'Founder of Czernode'];
  let pi = 0, ci = 0, del = false;
  const el = document.getElementById('htagl');
  function typeIt() {
    const p = phrases[pi];
    if (!del) { el.textContent = p.substring(0, ci + 1); ci++; if (ci === p.length) { del = true; setTimeout(typeIt, 1900); return; } }
    else { el.textContent = p.substring(0, ci - 1); ci--; if (ci === 0) { del = false; pi = (pi + 1) % phrases.length; setTimeout(typeIt, 400); return; } }
    setTimeout(typeIt, del ? 48 : 72);
  }
  setTimeout(typeIt, 500);

  // Particle network canvas
  const canvas = document.getElementById('hcanvas');
  const ctx = canvas.getContext('2d');
  let W, H, nodes = [];
  function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
  resize(); window.addEventListener('resize', () => { resize(); initNodes(); }, { passive: true });
  function initNodes() {
    const count = Math.floor(W * H / 14000);
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4,
      r: 1 + Math.random() * 2,
      color: [`rgba(124,58,237,`, `rgba(0,212,255,`, `rgba(0,255,136,`, `rgba(236,72,153,`][Math.floor(Math.random() * 4)]
    }));
  }
  initNodes();
  function drawNodes() {
    ctx.clearRect(0, 0, W, H);
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.color + '0.8)'; ctx.fill();
    });
    // Connect close nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(124,58,237,${.18 * (1 - dist / 130)})`; ctx.lineWidth = .6; ctx.stroke();
        }
      }
    }
    requestAnimationFrame(drawNodes);
  }
  drawNodes();
}

// ═══════════════ CONTACT FORM ═══════════════
function sendMsg() {
  const n = document.getElementById('cfn').value.trim();
  const e = document.getElementById('cfe').value.trim();
  const j = document.getElementById('cfj').value.trim();
  const m = document.getElementById('cfm').value.trim();
  const s = document.getElementById('cfs');
  if (!n || !e || !m) { s.textContent = '// ERROR: Fill all fields'; s.className = 'cfe'; return; }
  window.location.href = `mailto:sagarp.cvr@gmail.com?subject=${encodeURIComponent(j || 'Portfolio Contact: ' + n)}&body=${encodeURIComponent('From: ' + n + '\nEmail: ' + e + '\n\n' + m)}`;
  s.textContent = '// ./transmit.sh executed — opening mail client'; s.className = 'cfo';
}

// ═══════════════ CHATBOT ═══════════════
let apiKey = '';
function openChat() { document.getElementById('chatbox').classList.add('open'); }
function closeChat() { document.getElementById('chatbox').classList.remove('open'); }
function saveKey() {
  apiKey = document.getElementById('apii').value.trim();
  if (apiKey) {
    const b = document.getElementById('apib'); b.textContent = '✓ ACTIVE'; b.style.cssText = 'background:rgba(0,255,136,.2);border:1px solid var(--brd);color:var(--grn);font-family:Fira Code,monospace;font-size:.62rem;padding:4px 8px;cursor:pointer;white-space:nowrap';
    addBot('▶ Claude API mode active! Full AI responses enabled 🤖');
  }
}
function addBot(t) { const d = document.createElement('div'); d.className = 'msg mbot'; d.textContent = t; document.getElementById('cmsgs').appendChild(d); document.getElementById('cmsgs').scrollTop = 9999; }
function addUsr(t) { const d = document.createElement('div'); d.className = 'msg musr'; d.textContent = t; document.getElementById('cmsgs').appendChild(d); document.getElementById('cmsgs').scrollTop = 9999; }
function addTyping() { const d = document.createElement('div'); d.className = 'msg mbot'; d.id = 'typ'; d.textContent = '▶ ...'; document.getElementById('cmsgs').appendChild(d); document.getElementById('cmsgs').scrollTop = 9999; return d; }

const CTX = `You are SAGAR.AI — the portfolio assistant for Sagar P, CS student at GEC Thrissur (B.Tech CSE 2023–2027).
FACTS: Name: Sagar P | Email: sagarp.cvr@gmail.com | Discord: sagarp_c | GitHub: github.com/sagarp-c | LinkedIn: linkedin.com/in/sagarp- | Instagram: @sagarp___ | YouTube: @czernode | Kaggle: kaggle.com/sagarpc
PROJECTS: PriceTrail (Flutter+Gemini AI), Devanagari Classifier (97.55% CNN+Docker), BlindFold (Privacy-first forensics), CivilSupply Connect (supply chain), Malayalam OCR (in progress), XmasFriendPicker (live at xmasfriendpicker.onrender.com)
SKILLS: Python, Dart, C/C++, Java, JS/React/Node | TensorFlow, Keras, CNN, NLP, Gemini API | Flutter, Firebase, Supabase, PostgreSQL | Cryptography, Digital Forensics, CTF, Kali, TryHackMe, PicoCTF | Docker, Git, ROS, Selenium
WINS: 1st National Virtual Stock Market NIT Calicut Aug 2024 | Rank 68/124 BURNOUT Kaggle | Innovate 2.0 Hackathon IEEE Kerala Feb 2026 | IEEE RAS ROS Workshop | NPTEL Elite Cryptography IIT Kharagpur 75%
CZERNODE: AI-narrated tech YouTube channel. Encoderz = CS education companion channel. Founded 2023.
Be concise, sharp, technical, slightly edgy. Use terminal-style formatting. If asked about hiring, mention national award, NPTEL Elite, and hands-on ML/mobile/security projects.`;

async function callAPI(msg) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400, system: CTX, messages: [{ role: 'user', content: msg }] })
  });
  const d = await r.json();
  if (d.content && d.content[0]) return d.content[0].text;
  throw new Error(d.error?.message || 'API error');
}
function staticReply(q) {
  q = q.toLowerCase();
  if (/^(hi|hey|hello|yo|sup)/.test(q)) return '>> SAGAR.AI ONLINE\n\nHey! I\'m Sagar\'s AI assistant.\nAsk about:\n• projects • skills • contact\n• achievements • Czernode • why hire';
  if (/pricetrail/.test(q)) return '>> PriceTrail\nFlutter + Gemini AI app fighting tourist price gouging with AI-driven estimates from text or image. Location-aware. Targeting SIH 2025 + KSUM incubation.\nStack: Flutter · Gemini API · Firebase · Geolocator';
  if (/blindfold/.test(q)) return '>> BlindFold\nPrivacy-first forensic tool detecting explicit media while preserving victim anonymity. Built for law enforcement.\nStack: Python · Deep Learning · Digital Forensics';
  if (/devanagari|97|cnn|classifier/.test(q)) return '>> Devanagari Digit Classifier\n97.55% validation accuracy on 33,000+ images using CNN + augmentation. Docker containerized for reproducible ML pipelines. Published on Kaggle.';
  if (/project|built|made/.test(q)) return '>> ACTIVE PROJECTS:\n🔷 PriceTrail — AI travel price estimator\n🔷 Devanagari Classifier — 97.55% CNN\n🔷 BlindFold — Privacy-first forensics\n🔷 CivilSupply Connect — Supply chain\n🔷 Malayalam OCR — Indic NLP (WIP)\n🔷 XmasFriendPicker — Live full-stack\n\nAsk about any project!';
  if (/skill|stack|tech|know/.test(q)) return '>> TECH STACK:\n⚡ Languages: Python, Dart, C/C++, Java, JS\n⚡ AI/ML: TensorFlow, Keras, CNN, Gemini API\n⚡ Security: Cryptography, CTF, Kali, Forensics\n⚡ Mobile: Flutter, Firebase, Supabase\n⚡ Tools: Docker, Git, Linux, ROS, Selenium';
  if (/contact|email|reach|linkedin|git/.test(q)) return '>> CONTACT:\n📧 sagarp.cvr@gmail.com\n🔗 linkedin.com/in/sagarp-\n💻 github.com/sagarp-c\n🎮 Discord: sagarp_c\n📸 Instagram: @sagarp___\n▶ YouTube: @czernode\n\nOpen to: internships, hackathons, AI/security collabs';
  if (/achiev|award|win|nit|kaggle/.test(q)) return '>> ACHIEVEMENTS:\n🥇 1st — Virtual Stock Market, NIT Calicut (National, 2024)\n📊 Rank 68/124 — BURNOUT Kaggle Datathon\n🚀 Innovate 2.0 Hackathon — IEEE Kerala (48hrs)\n🤖 IEEE RAS Kerala — ROS Workshop\n📜 NPTEL Elite — Cryptography (IIT Kharagpur, 75%)';
  if (/czernode|youtube|channel/.test(q)) return '>> CZERNODE:\nAI-narrated tech storytelling on YouTube.\nEncoderz = CS education for engineering students.\n\n▶ youtube.com/@czernode\n📸 instagram.com/czernode\n\nCovers: Cybersecurity · AI · Career guidance';
  if (/hire|recruit|job|intern|google|spacex/.test(q)) return '>> WHY HIRE SAGAR?\n✅ National-level winner (NIT Calicut)\n✅ NPTEL Elite Cryptography (IIT Kharagpur)\n✅ 97.55% ML accuracy (Docker deployed)\n✅ Full-stack Flutter + Gemini AI apps\n✅ CTF practitioner (TryHackMe, PicoCTF)\n✅ Founded 2 tech YouTube channels\n✅ IEEE hackathon participant\n\nContact: sagarp.cvr@gmail.com';
  if (/about|who|yourself/.test(q)) return '>> SAGAR.P // v2.0\nCSE @ GEC Thrissur (2023-2027)\nBuilding at AI + Cybersecurity + Mobile intersection.\n\n"I don\'t just build systems — I test their limits."\n\nNational award winner. NPTEL Elite. CTF practitioner. Founder of Czernode. Targeting KSUM incubation for PriceTrail.';
  return `>> Query: "${q}"\nI can tell you about Sagar\'s:\n• projects • skills • achievements\n• contact • Czernode • why hire\n\nOr enter your Anthropic API key for full AI mode! 🔑`;
}
async function sendChat() {
  const inp = document.getElementById('ci');
  const msg = inp.value.trim(); if (!msg) return;
  inp.value = ''; addUsr(msg);
  if (apiKey) {
    const t = addTyping();
    try { const r = await callAPI(msg); t.remove(); addBot(r); }
    catch (err) { t.remove(); addBot('>> API Error: ' + err.message + '\n\n' + staticReply(msg)); }
  } else { setTimeout(() => addBot(staticReply(msg)), 380); }
}
function askBot(q) { document.getElementById('ci').value = q; openChat(); sendChat(); }


// ═══════════════ CARD FLIP ═══════════════
function flipCard(el) {
  const card = el.closest('.pcard');
  card.classList.toggle('flipped');
}

// ═══════════════ THEME TOGGLE ═══════════════
function toggleTheme() {
  const body = document.body;
  const icon = document.getElementById('t-icon');
  const text = document.getElementById('t-text');
  
  body.classList.toggle('light-mode');
  
  if (body.classList.contains('light-mode')) {
    if (icon) icon.className = 'fas fa-sun';
    if (text) text.innerHTML = 'LIGHT<br>MODE';
    localStorage.setItem('theme', 'light');
  } else {
    if (icon) icon.className = 'fas fa-moon';
    if (text) text.innerHTML = 'DARK<br>MODE';
    localStorage.setItem('theme', 'dark');
  }
}

// Set initial icon on load based on default body class
(function initThemeIcon() {
  const icon = document.getElementById('t-icon');
  const text = document.getElementById('t-text');
  if (document.body.classList.contains('light-mode')) {
    if (icon) icon.className = 'fas fa-sun';
    if (text) text.innerHTML = 'LIGHT<br>MODE';
  } else {
    if (icon) icon.className = 'fas fa-moon';
    if (text) text.innerHTML = 'DARK<br>MODE';
  }
})();