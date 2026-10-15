// Static site generator: content/*.json -> dist/. No dependencies.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';

const site = JSON.parse(readFileSync('content/site.json', 'utf8'));
const projects = JSON.parse(readFileSync('content/projects.json', 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const trackTitle = (id) => site.tracks.find((t) => t.id === id)?.title ?? id;

const page = ({ title, description, body, depth = 0 }) => {
  const root = depth ? '../'.repeat(depth) : '';
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="stylesheet" href="${root}style.css">
</head>
<body>
<header class="wrap nav">
  <a class="brand" href="${root}index.html">${esc(site.name)}</a>
  <nav>
    <a href="${root}index.html#projects">Projects</a>
    <a href="${root}learning.html">Learning log</a>
    <a href="${root}index.html#contact">Contact</a>
  </nav>
</header>
<main class="wrap">
${body}
</main>
<footer class="wrap foot">${esc(site.name)}</footer>
</body>
</html>
`;
};

const card = (p, root = '') => `<a class="card" href="${root}projects/${p.slug}.html">
  <span class="tag">${esc(trackTitle(p.track))}</span>
  <h3>${esc(p.title)}</h3>
  <p>${esc(p.summary)}</p>
  <span class="meta">${esc(p.period)}</span>
</a>`;

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/projects', { recursive: true });
cpSync('style.css', 'dist/style.css');

const links = [
  site.linkedin && `<a href="${esc(site.linkedin)}">LinkedIn</a>`,
  site.github && `<a href="${esc(site.github)}">GitHub</a>`,
  `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>`,
].filter(Boolean).join(' · ');

writeFileSync('dist/index.html', page({
  title: `${site.name} | Mechanical Engineer`,
  description: site.tagline,
  body: `<section class="hero">
  <h1>${esc(site.name)}</h1>
  <p class="lead">${esc(site.tagline)}</p>
  <p>${esc(site.intro)}</p>
</section>
<section id="projects">
  <h2>Projects</h2>
  <div class="grid">${projects.map((p) => card(p)).join('\n')}</div>
</section>
<section id="contact">
  <h2>Contact</h2>
  <p>${links}</p>
</section>`,
}));

for (const p of projects) {
  const sections = p.sections.map((s) => `<h2>${esc(s.heading)}</h2>\n${s.body.map((b) => `<p>${esc(b)}</p>`).join('\n')}`).join('\n');
  writeFileSync(`dist/projects/${p.slug}.html`, page({
    depth: 1,
    title: `${p.title} | ${site.name}`,
    description: p.summary,
    body: `<article>
<p class="tag">${esc(trackTitle(p.track))} · ${esc(p.period)}</p>
<h1>${esc(p.title)}</h1>
<p class="lead">${esc(p.summary)}</p>
<p class="tools">${p.tools.map((t) => `<span>${esc(t)}</span>`).join('')}</p>
${sections}
</article>`,
  }));
}

const tracks = site.tracks.map((t) => {
  const done = projects.filter((p) => p.track === t.id);
  return `<section class="track">
<h2>${esc(t.title)}</h2>
<p>${esc(t.why)}</p>
${done.length ? `<h3>Existing work</h3><ul>${done.map((p) => `<li><a href="projects/${p.slug}.html">${esc(p.title)}</a></li>`).join('')}</ul>` : ''}
<h3>Planned</h3>
<ul>${t.planned.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
</section>`;
}).join('\n');

writeFileSync('dist/learning.html', page({
  title: `Learning log | ${site.name}`,
  description: 'The skills I am building and the projects planned for each.',
  body: `<h1>Learning log</h1>
<p class="lead">Four tracks, each with a project that produces something I can show. Planned items move to Projects when they are finished.</p>
${tracks}`,
}));

console.log(`Built ${projects.length} projects -> dist/`);
