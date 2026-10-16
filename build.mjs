// Static site generator: content/*.json -> dist/. No dependencies.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';

const site = JSON.parse(readFileSync('content/site.json', 'utf8'));
const projects = JSON.parse(readFileSync('content/projects.json', 'utf8'));
const base = site.baseUrl.replace(/\/$/, '');

// ---- checks -------------------------------------------------------------

const problems = [];
for (const file of ['content/site.json', 'content/projects.json']) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes('—')) problems.push(`${file}:${i + 1} contains an em dash`);
  });
}

// Read width/height from a JPEG header so pages can reserve space for images.
const dims = {};
for (const f of readdirSync('content/images')) {
  const b = readFileSync(`content/images/${f}`);
  let o = 2;
  while (o < b.length) {
    if (b[o] !== 0xff) { o++; continue; }
    const m = b[o + 1];
    if (m >= 0xc0 && m <= 0xc3) { dims[f] = { h: b.readUInt16BE(o + 5), w: b.readUInt16BE(o + 7) }; break; }
    o += 2 + b.readUInt16BE(o + 2);
  }
}

const used = new Set([site.photo, site.ogImage]);
const allFigures = (p) => [p.hero, ...p.sections.flatMap((s) => s.figures ?? [])].filter(Boolean);
for (const p of projects) {
  for (const f of allFigures(p)) {
    used.add(f.src);
    if (!dims[f.src]) problems.push(`${p.slug}: missing or unreadable image ${f.src}`);
  }
}
const unused = Object.keys(dims).filter((f) => !used.has(f));
if (unused.length) console.warn(`Unused images: ${unused.join(', ')}`);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

// ---- helpers ------------------------------------------------------------

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const trackTitle = (id) => site.tracks.find((t) => t.id === id)?.title ?? id;
const up = (depth) => '../'.repeat(depth);
const abs = (path) => (base ? `${base}/${path}` : '');

const img = (src, alt, prefix, { lazy = true, cls = '' } = {}) => {
  const d = dims[src];
  return `<img src="${prefix}images/${src}" alt="${esc(alt)}" width="${d.w}" height="${d.h}"${lazy ? ' loading="lazy"' : ''}${cls ? ` class="${cls}"` : ''}>`;
};

const figure = (f, prefix) => {
  // Small images stay near natural size; tall ones are capped at ~480px high.
  const { w, h } = dims[f.src];
  const max = Math.round(Math.min(w * 1.35, (480 * w) / h));
  return `<figure style="--max:${max}px"><button class="zoom" type="button" aria-label="Enlarge: ${esc(f.caption)}">${img(f.src, f.caption, prefix)}</button><figcaption>${esc(f.caption)}</figcaption></figure>`;
};

const meta = (p) => [p.period, p.grade && `Grade ${p.grade}`].filter(Boolean).map(esc).join(' · ');

const personLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: site.name,
  jobTitle: site.role,
  email: `mailto:${site.email}`,
  address: { '@type': 'PostalAddress', addressLocality: 'London', addressCountry: 'GB' },
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'University of Southampton' },
  sameAs: [site.linkedin, site.github].filter(Boolean),
  ...(base && { url: `${base}/` }),
};

const page = ({ title, description, body, depth = 0, path, image = site.ogImage, ld }) => `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${esc(site.name)}">
<meta name="theme-color" content="#0b5cad">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${base ? `<meta property="og:url" content="${abs(path)}">
<meta property="og:image" content="${abs(`images/${image}`)}">
<link rel="canonical" href="${abs(path)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${up(depth)}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${up(depth)}style.css">
${ld ? `<script type="application/ld+json">${JSON.stringify(ld)}</script>` : ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="bar"><div class="wrap nav">
  <a class="brand" href="${up(depth)}index.html">${esc(site.name)}</a>
  <nav aria-label="Main">
    <a href="${up(depth)}index.html#projects">Projects</a>
    <a href="${up(depth)}index.html#experience">Experience</a>
    <a href="${up(depth)}learning.html">Learning log</a>
    <a href="${up(depth)}index.html#contact">Contact</a>
  </nav>
</div></header>
<main id="main">
${body}
</main>
<footer class="foot"><div class="wrap">
  <span>${esc(site.name)} · ${esc(site.location)}</span>
  <span><a href="mailto:${esc(site.email)}">Email</a> · <a href="${esc(site.linkedin)}">LinkedIn</a></span>
</div></footer>
${site.goatcounter ? `<p class="analytics-note"><span class="wrap">Visits are counted with cookieless analytics (GoatCounter). No personal data is collected.</span></p>` : ''}
<div id="lightbox" class="lightbox" role="dialog" aria-modal="true" aria-label="Enlarged figure" hidden>
  <button class="lb-close" type="button" aria-label="Close">&times;</button>
  <button class="lb-prev" type="button" aria-label="Previous figure">&lsaquo;</button>
  <figure><img alt=""><figcaption></figcaption></figure>
  <button class="lb-next" type="button" aria-label="Next figure">&rsaquo;</button>
</div>
<script src="${up(depth)}site.js"></script>
${site.goatcounter ? `<script data-goatcounter="https://${esc(site.goatcounter)}.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>` : ''}
</body>
</html>
`;

// ---- output -------------------------------------------------------------

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/projects', { recursive: true });
for (const f of ['style.css', 'site.js', 'favicon.svg']) cpSync(f, `dist/${f}`);
cpSync('content/images', 'dist/images', { recursive: true });

const thumb = (p) => {
  if (!p.hero) {
    const f = p.facts?.[0];
    return `<div class="thumb blank">${f ? `<strong>${esc(f.value)}</strong><span>${esc(f.label)}</span>` : p.grade ? `<strong>${esc(p.grade)}</strong><span>grade</span>` : `<strong>${esc(p.tools[0])}</strong>`}</div>`;
  }
  return `<div class="thumb${p.hero.fit === 'contain' ? ' fit' : ''}">${img(p.hero.src, p.hero.caption, '')}</div>`;
};

const card = (p) => `<a class="card${p.featured ? ' featured' : ''}" href="projects/${p.slug}.html" data-track="${p.track}">
  ${thumb(p)}
  <div class="body">
    <span class="tag">${esc(trackTitle(p.track))}${p.featured ? ' · Featured' : ''}</span>
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.summary)}</p>
    ${p.featured && p.facts ? `<ul class="mini">${p.facts.slice(0, 2).map((f) => `<li><strong>${esc(f.value)}</strong> ${esc(f.label)}</li>`).join('')}</ul>` : ''}
    <span class="meta">${meta(p)}</span>
  </div>
</a>`;

const usedTracks = site.tracks.filter((t) => projects.some((p) => p.track === t.id));
const contactLinks = [
  `<a class="btn primary" href="mailto:${esc(site.email)}">Email me</a>`,
  `<a class="btn" href="${esc(site.linkedin)}">LinkedIn</a>`,
  site.github && `<a class="btn" href="${esc(site.github)}">GitHub</a>`,
].filter(Boolean).join('');

writeFileSync('dist/index.html', page({
  title: `${site.name} | ${site.role}`,
  description: site.tagline,
  path: '',
  ld: personLd,
  body: `<section class="hero"><div class="wrap">
  <div class="id">
    ${img(site.photo, `Photo of ${site.name}`, '', { lazy: false, cls: 'avatar' })}
    <div>
      <p class="eyebrow">${esc(site.role)} · ${esc(site.location)}</p>
      <h1>${esc(site.name)}</h1>
    </div>
  </div>
  <p class="lead">${esc(site.tagline)}</p>
  <p class="intro">${esc(site.intro)}</p>
  <p class="avail"><span class="dot" aria-hidden="true"></span>${esc(site.availability)}</p>
  <p class="actions"><a class="btn primary" href="#projects">See my projects</a><a class="btn" href="mailto:${esc(site.email)}">Get in touch</a></p>
</div>
<div class="wrap"><ul class="stats">${site.stats.map((s) => `<li><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></li>`).join('')}</ul></div>
</section>
<section id="projects" class="wrap section">
  <div class="section-head">
    <h2>Projects</h2>
    <div class="filters" role="group" aria-label="Filter projects">
      <button type="button" class="chip" aria-pressed="true" data-filter="all">All</button>
      ${usedTracks.map((t) => `<button type="button" class="chip" aria-pressed="false" data-filter="${t.id}">${esc(t.title)}</button>`).join('')}
    </div>
  </div>
  <div class="grid">${projects.map(card).join('\n')}</div>
</section>
<section id="experience" class="wrap section">
  <h2>Experience and education</h2>
  <ol class="timeline">${site.experience.map((e) => `<li>
    <div class="when">${esc(e.period)}</div>
    <div><h3>${esc(e.title)}</h3><p class="org">${esc(e.org)}, ${esc(e.place)}</p><p>${esc(e.text)}${e.link ? ` <a href="${esc(e.link)}">More</a>` : ''}</p></div>
  </li>`).join('')}</ol>
  <h2>Activities</h2>
  <ul class="activities">${site.activities.map((a) => `<li><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p></li>`).join('')}</ul>
</section>
<section id="skills" class="wrap section">
  <h2>Skills and tools</h2>
  <div class="skills">${site.skills.map((g) => `<div><h3>${esc(g.group)}</h3><p class="pills">${g.items.map((i) => `<span>${esc(i)}</span>`).join('')}</p></div>`).join('')}</div>
</section>
<section id="contact" class="wrap section contact">
  <h2>Contact</h2>
  <p>${esc(site.availability)} The quickest way to reach me is email.</p>
  <p class="actions">${contactLinks}</p>
  <p class="email">${esc(site.email)}</p>
</section>`,
}));

projects.forEach((p, i) => {
  const prev = projects[i - 1];
  const next = projects[i + 1];
  const sections = p.sections.map((s) => {
    const figs = s.figures ?? [];
    return `<section>
<h2>${esc(s.heading)}</h2>
${s.body.map((b) => `<p>${esc(b)}</p>`).join('\n')}
${figs.length ? `<div class="figs n${figs.length}">${figs.map((f) => figure(f, '../')).join('')}</div>` : ''}
</section>`;
  }).join('\n');

  writeFileSync(`dist/projects/${p.slug}.html`, page({
    depth: 1,
    path: `projects/${p.slug}.html`,
    image: p.hero?.src ?? site.ogImage,
    title: `${p.title} | ${site.name}`,
    description: p.summary,
    ld: {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: p.title,
      description: p.summary,
      author: { '@type': 'Person', name: site.name },
    },
    body: `<article class="wrap project">
<p class="crumbs"><a href="../index.html#projects">Projects</a> / ${esc(trackTitle(p.track))}</p>
<h1>${esc(p.title)}</h1>
<p class="lead">${esc(p.summary)}</p>
<dl class="facts-meta">
  <div><dt>When</dt><dd>${esc(p.period)}</dd></div>
  <div><dt>Context</dt><dd>${esc(p.context)}</dd></div>
  ${p.grade ? `<div><dt>Grade</dt><dd>${esc(p.grade)}</dd></div>` : ''}
  <div class="wide"><dt>My role</dt><dd>${esc(p.role)}</dd></div>
</dl>
<p class="pills">${p.tools.map((t) => `<span>${esc(t)}</span>`).join('')}</p>
${p.hero ? `<div class="figs n1 hero-fig">${figure(p.hero, '../')}</div>` : ''}
${p.facts?.length ? `<ul class="facts">${p.facts.map((f) => `<li><strong>${esc(f.value)}</strong><span>${esc(f.label)}</span></li>`).join('')}</ul>` : ''}
${sections}
${p.takeaway ? `<aside class="takeaway"><strong>What I took from it</strong><p>${esc(p.takeaway)}</p></aside>` : ''}
${p.links?.length ? `<p class="actions">${p.links.map((l) => `<a class="btn" href="${esc(l.url)}">${esc(l.label)}</a>`).join('')}</p>` : ''}
${p.evidence ? `<p class="evidence"><strong>Evidence:</strong> ${esc(p.evidence)}</p>` : ''}
<nav class="pager" aria-label="More projects">
  ${prev ? `<a href="${prev.slug}.html"><span>Previous</span>${esc(prev.title)}</a>` : '<span></span>'}
  ${next ? `<a class="next" href="${next.slug}.html"><span>Next</span>${esc(next.title)}</a>` : `<a class="next" href="../index.html#contact"><span>Next</span>Get in touch</a>`}
</nav>
</article>`,
  }));
});

const tracks = site.tracks.map((t) => {
  const done = projects.filter((p) => p.track === t.id);
  return `<section class="track">
<h2>${esc(t.title)}</h2>
<p>${esc(t.why)}</p>
${done.length ? `<h3>Done</h3><ul class="done">${done.map((p) => `<li><a href="projects/${p.slug}.html">${esc(p.title)}</a></li>`).join('')}</ul>` : ''}
<h3>Planned</h3>
<ul class="planned">${t.planned.map((x) => `<li><span class="badge">Planned</span>${esc(x)}</li>`).join('')}</ul>
</section>`;
}).join('\n');

writeFileSync('dist/learning.html', page({
  path: 'learning.html',
  title: `Learning log | ${site.name}`,
  description: 'The skills I am building alongside my job search, and the projects planned for each.',
  body: `<div class="wrap project"><h1>Learning log</h1>
<p class="lead">What I am building alongside my job search. Each track ends in a project I can show, and finished work moves to the Projects page.</p>
${tracks}</div>`,
}));

writeFileSync('dist/404.html', page({
  path: '404.html',
  title: `Page not found | ${site.name}`,
  description: 'Page not found.',
  body: `<div class="wrap project"><h1>Page not found</h1><p class="lead">That page does not exist. <a href="index.html">Go to the home page</a>.</p></div>`,
}));

if (base) {
  const urls = ['', 'learning.html', ...projects.map((p) => `projects/${p.slug}.html`)];
  writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${abs(u)}</loc></url>`).join('\n')}\n</urlset>\n`);
  writeFileSync('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${abs('sitemap.xml')}\n`);
}

console.log(`Built ${projects.length} projects -> dist/`);
