// ═══════════════ SECTION LOADER ═══════════════
// Fetches each HTML partial in order, injects them into <body>,
// then dynamically loads main.js and game.js so they run after
// the full DOM is available.

const sections = [
  'sections/entry.html',
  'sections/nav.html',
  'sections/hero.html',
  'sections/about.html',
  'sections/skills.html',
  'sections/projects.html',
  'sections/achievements.html',
  'sections/czernode.html',
  'sections/game.html',
  'sections/contact.html',
  'sections/footer.html',
  'sections/chatbot.html'
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

Promise.all(sections.map(url => fetch(url).then(r => r.text())))
  .then(htmlChunks => {
    document.getElementById('site-root').innerHTML = htmlChunks.join('\n');
    return loadScript('js/main.js');
  })
  .then(() => loadScript('js/game.js'))
  .catch(err => console.error('[Loader] Failed to load section:', err));
