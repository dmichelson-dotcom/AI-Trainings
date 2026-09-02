# CURRENT Manager Dev Series

This portable package was exported from O'Reilly Creative Studio.

## Run locally

Serve this folder with any static web server, then open `index.html`. For example:

```sh
npx serve .
```

## Deploy

Upload the folder contents to any static host (Vercel, Netlify, GitHub Pages, S3, or your own web server). The package has no build step or server-side JavaScript dependency. Keep `js/app.js` alongside `index.html`: it provides the client-side behavior for interactive exports such as curated-learning filters and sorting.

## Contents

- `index.html` — rendered interactive-sales-experience design
- `css/styles.css` — captured design and brand styles
- `js/app.js` — required client-side behavior for interactive exports (including curated-learning filters and sorting)
- `assets/` — local images and fonts referenced by the design
- `data/content.json` — normalized Creative Studio design data
- `reference/preview.png` — rendered reference image, when capture succeeded
