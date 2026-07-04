const { escapeHtml: e } = require('../lib/escape');

function renderComingSoonPage(data) {
  const p = data.player;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${e(p.name)} | Próximamente</title>
<meta name="robots" content="noindex">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.85em%22 font-size=%2290%22>%E2%9A%BD</text></svg>">
<link rel="stylesheet" href="/css/style.css">
</head>
<body>
<div class="cs-wrap">
  <div class="cs-badge">⚽</div>
  <div class="cs-name">${e(p.name)}</div>
  <div class="cs-title">Sitio en construcción</div>
  ${p.email ? `<a class="btn btn-gold" href="mailto:${e(p.email)}">Contacto</a>` : ''}
</div>
</body>
</html>`;
}

module.exports = { renderComingSoonPage };
