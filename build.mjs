// Static site generator: content/*.json -> dist/. No dependencies.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';

const site = JSON.parse(readFileSync('content/site.json', 'utf8'));
const projects = JSON.parse(readFileSync('content/projects.json', 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const trackTitle = (id) => site.tracks.find((t) => t.id === id)?.title ?? id;
const root = (depth) => '../'.repeat(depth);

for (const p of projects) {
  for (const f of p.figures ?? []) {
    if (!existsSync(`content/images/${f.src}`)) throw new Error(`Missing image: ${f.src} (${p.slug})`);
  }
}

const page = ({ title, description, body, depth = 0 }) => `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="stylesheet" href="${root(depth)}style.css">
</head>
<body>
<header class="bar"><div class="wrap nav">
  <a class="brand" href="${root(depth)}index.html">${esc(site.name)}</a>
  <nav>
    <a href="${root(depth)}index.html#projects">Projects</a>
    <a href="${root(depth)}learning.html">Learning log</a>
    <a href="${root(depth)}index.html#contact">Contact</a>
  </nav>
</div></header>
<main>
${body}
</main>
<footer class="wrap foot">${esc(site.name)}</footer>
<div id="lightbox" class="lightbox" hidden><img alt=""><p></p></div>
<script src="${root(depth)}site.js"></script>
</body>
</html>
`;

const cover = (p) => (p.figures?.length ? p.figures[p.cover ?? 0] : null);

const card = (p) => {
  const c = cover(p);
  return `<a class="card" href="projects/${p.slug}.html">
  ${c ? `<div class="thumb${p.coverFit === 'contain' ? ' fit' : ''}"><img src="images/${c.src}" alt="${esc(c.caption)}" loading="lazy"></div>` : `<div class="thumb blank"><span>${esc(p.tools[0])}</span></div>`}
  <div class="body">
    <span class="tag">${esc(trackTitle(p.track))}</span>
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.summary)}</p>
    <span class="meta">${esc(p.period)}${p.grade ? ` · ${esc(p.grade)}` : ''}</span>
  </div>
</a>`;
};

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/projects', { recursive: true });
cpSync('style.css', 'dist/style.css');
cpSync('site.js', 'dist/site.js');
cpSync('content/images', 'dist/images', { recursive: true });

const links = [
  site.linkedin && `<a href="${esc(site.linkedin)}">LinkedIn</a>`,
  site.github && `<a href="${esc(site.github)}">GitHub</a>`,
  `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>`,
].filter(Boolean).join('');

writeFileSync('dist/index.html', page({
  title: `${site.name} | Mechanical Engineer`,
  description: site.tagline,
  body: `<section class="hero"><div class="wrap">
  <p class="eyebrow">${esc(site.location)}</p>
  <h1>${esc(site.name)}</h1>
  <p class="lead">${esc(site.tagline)}</p>
  <p class="intro">${esc(site.intro)}</p>
  <ul class="stats">${site.stats.map((s) => `<li><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></li>`).join('')}</ul>
</div></section>
<section id="projects" class="wrap">
  <h2>Projects</h2>
  <div class="grid">${projects.map(card).join('\n')}</div>
</section>
<section id="skills" class="wrap">
  <h2>Skills and tools</h2>
  <div class="skills">${site.skills.map((g) => `<div><h3>${esc(g.group)}</h3><p>${g.items.map((i) => `<span>${esc(i)}</span>`).join('')}</p></div>`).join('')}</div>
</section>
<section id="contact" class="wrap">
  <h2>Contact</h2>
  <p class="links">${links}</p>
</section>`,
}));

for (const p of projects) {
  const figs = (p.figures ?? []).map((f) => `<figure><img src="../images/${f.src}" alt="${esc(f.caption)}" loading="lazy"><figcaption>${esc(f.caption)}</figcaption></figure>`).join('');
  const sections = p.sections.map((s) => `<h2>${esc(s.heading)}</h2>\n${s.body.map((b) => `<p>${esc(b)}</p>`).join('\n')}`).join('\n');
  writeFileSync(`dist/projects/${p.slug}.html`, page({
    depth: 1,
    title: `${p.title} | ${site.name}`,
    description: p.summary,
    body: `<article class="wrap project">
<p class="tag">${esc(trackTitle(p.track))} · ${esc(p.period)}${p.grade ? ` · Grade ${esc(p.grade)}` : ''}</p>
<h1>${esc(p.title)}</h1>
<p class="lead">${esc(p.summary)}</p>
<p class="course">${esc(p.course)}</p>
<p class="tools">${p.tools.map((t) => `<span>${esc(t)}</span>`).join('')}</p>
${p.facts?.length ? `<ul class="facts">${p.facts.map((f) => `<li><strong>${esc(f.value)}</strong><span>${esc(f.label)}</span></li>`).join('')}</ul>` : ''}
${figs ? `<div class="gallery n${p.figures.length}">${figs}</div>` : ''}
${sections}
${p.takeaway ? `<aside class="takeaway"><strong>What I took from it</strong><p>${esc(p.takeaway)}</p></aside>` : ''}
${p.links?.length ? `<p class="links">${p.links.map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join('')}</p>` : ''}
${p.evidence ? `<p class="evidence"><strong>Evidence:</strong> ${esc(p.evidence)}</p>` : ''}
<p><a href="../index.html#projects">&larr; All projects</a></p>
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
  body: `<div class="wrap project"><h1>Learning log</h1>
<p class="lead">Four tracks, each with a project that produces something I can show. Planned items move to Projects when they are finished.</p>
${tracks}</div>`,
}));

console.log(`Built ${projects.length} projects -> dist/`);
