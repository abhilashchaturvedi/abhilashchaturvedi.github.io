# Portfolio

Static portfolio site with no dependencies. Content lives in `content/`, `build.mjs` generates `dist/`.

```
node build.mjs     # build (fails on em dashes or missing images)
npx serve dist     # preview at http://localhost:3000
```

## Editing

- **Projects:** `content/projects.json`. Order in the file is the order on the site. `featured: true` gives a wide card. Each section can carry its own `figures`.
- **Everything else** (intro, stats, experience, activities, skills, learning tracks): `content/site.json`.
- **Images:** drop into `content/images/` and reference by filename. The build reads their size so pages do not jump while loading, and warns about images nothing uses.

## Publishing

`.github/workflows/pages.yml` builds and deploys to GitHub Pages on every push to `main`. In the repo, set Settings > Pages > Source to "GitHub Actions". After the first deploy, set `baseUrl` in `site.json` to the live URL so link previews, the sitemap and canonical URLs use absolute addresses.

## Rules

- Only publish work you did yourself, and say so when work was done in a team.
- No employer-confidential material.
