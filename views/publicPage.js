const { escapeHtml: e } = require('../lib/escape');

function renderPublicPage(data) {
  const p = data.player;
  const nameParts = (p.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const restName = nameParts.slice(1).join(' ');

  const clubRows = data.clubHistory.map((c) => `
    <div class="club-row">
      <div class="crest">
        ${c.crest ? `<img src="${e(c.crest)}" alt="${e(c.club)}">` : `<div class="ph" style="width:100%;height:100%;font-size:8px;">Escudo</div>`}
      </div>
      <div>
        <div class="club-name">${e(c.club)}</div>
        <div class="club-period">${e(c.period)}</div>
      </div>
      <div class="club-role">${e(c.role)}</div>
    </div>
  `).join('') || `<div class="admin-list-item" style="padding:20px;">Todavía no hay clubes cargados.</div>`;

  const galleryHtml = data.gallery.length > 0
    ? `<div class="gallery-grid">${data.gallery.map((g) => `<div class="gallery-item"><img src="${e(g.url)}" alt="${e(g.caption)}"></div>`).join('')}</div>`
    : `<p class="empty-note">Todavía no hay fotos. Subilas desde el panel /admin.</p>`;

  const videosHtml = data.videos.length > 0
    ? `<div class="video-grid">${data.videos.map((v) => `
        <div class="video-card">
          <div class="video-frame">
            ${v.type === 'upload'
              ? `<video src="${e(v.url)}" controls></video>`
              : `<iframe src="${e(v.url)}" allowfullscreen></iframe>`}
          </div>
          <div class="video-body">
            <div class="video-title">${e(v.title)}</div>
            <div class="video-date">${e(v.date)}</div>
          </div>
        </div>
      `).join('')}</div>`
    : `<p class="empty-note">Todavía no hay videos. Subilos o enlazalos desde el panel /admin.</p>`;

  const newsHtml = data.news.length > 0
    ? `<div class="news-list">${data.news.map((n) => `
        <div class="news-item">
          <div class="news-source">${e(n.source)} · <span class="news-date">${e(n.date)}</span></div>
          <div class="news-title">${e(n.title)}</div>
          <div class="news-summary">${e(n.summary)}</div>
          ${n.url ? `<a class="news-link" href="${e(n.url)}" target="_blank" rel="noopener">Leer nota original ↗</a>` : ''}
        </div>
      `).join('')}</div>`
    : `<p class="empty-note">Todavía no hay noticias cargadas.</p>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${e(p.name)} | Ficha oficial</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.85em%22 font-size=%2290%22>%E2%9A%BD</text></svg>">
<link rel="stylesheet" href="/css/style.css">
</head>
<body>

<nav class="site-nav">
  <div class="container">
    <div class="brand">${e(firstName)} <span>${e(restName)}</span></div>
    <div class="nav-links">
      <a href="#ficha">Ficha</a>
      <a href="#stats">Estadísticas</a>
      <a href="#trayectoria">Trayectoria</a>
      <a href="#galeria">Galería</a>
      <a href="#videos">Videos</a>
      <a href="#noticias">Noticias</a>
    </div>
  </div>
</nav>

<header class="player-hero" id="ficha">
  <div class="container hero-inner">
    <div class="hero-photo">
      ${p.heroPhoto
        ? `<img src="${e(p.heroPhoto)}" alt="${e(p.name)}">`
        : `<div class="ph" style="width:100%;height:100%;">[ Foto principal —<br>subir desde /admin ]</div>`}
    </div>
    <div class="hero-info">
      <div class="hero-number">Nº ${e(p.squadNumber)} · ${e(p.position)}</div>
      <div class="hero-name">${e(p.name)}</div>
      <div class="hero-meta">
        <span><strong>${e(p.currentClub)}</strong></span>
        ${p.nationality ? `<span>${e(p.nationality)}</span>` : ''}
        ${p.height ? `<span>${e(p.height)}</span>` : ''}
        ${p.foot ? `<span>Pie: ${e(p.foot)}</span>` : ''}
      </div>
      <div class="hero-links">
        <a class="btn btn-gold" href="#noticias">Últimas noticias</a>
        ${p.transfermarktUrl ? `<a class="btn btn-outline" href="${e(p.transfermarktUrl)}" target="_blank" rel="noopener">Ver en Transfermarkt ↗</a>` : ''}
      </div>
    </div>
  </div>

  <div class="stat-strip">
    <div class="container">
      <div class="stat-cell"><div class="n">${e(data.careerStats.matches)}</div><div class="l">Partidos</div></div>
      <div class="stat-cell"><div class="n">${e(data.careerStats.goals)}</div><div class="l">Goles</div></div>
      <div class="stat-cell"><div class="n">${e(data.careerStats.assists)}</div><div class="l">Asistencias</div></div>
      <div class="stat-cell"><div class="n">${e(data.careerStats.seasons)}</div><div class="l">Temporadas</div></div>
      <div class="stat-cell"><div class="n">${e(data.careerStats.clubs)}</div><div class="l">Clubes</div></div>
    </div>
  </div>
</header>

<section id="stats">
  <div class="container">
    <div class="section-title">Ficha técnica</div>
    <div class="section-sub">Temporada ${e(data.seasonStats.season)} · Datos de contrato y valor de mercado</div>
    <div class="data-table">
      <div class="data-row"><div class="k">Fecha de nacimiento</div><div class="v">${e(p.birthdate)}</div></div>
      ${p.birthplace ? `<div class="data-row"><div class="k">Lugar de nacimiento</div><div class="v">${e(p.birthplace)}</div></div>` : ''}
      <div class="data-row"><div class="k">Nacionalidad</div><div class="v">${e(p.nationality)}</div></div>
      ${p.height ? `<div class="data-row"><div class="k">Altura</div><div class="v">${e(p.height)}</div></div>` : ''}
      ${p.foot ? `<div class="data-row"><div class="k">Pie hábil</div><div class="v">${e(p.foot)}</div></div>` : ''}
      <div class="data-row"><div class="k">Club actual</div><div class="v">${e(p.currentClub)}</div></div>
      ${p.signedDate ? `<div class="data-row"><div class="k">Fichado</div><div class="v">${e(p.signedDate)}</div></div>` : ''}
      ${p.marketValue ? `<div class="data-row"><div class="k">Valor de mercado</div><div class="v">${e(p.marketValue)}</div></div>` : ''}
      ${p.contractUntil ? `<div class="data-row"><div class="k">Contrato hasta</div><div class="v">${e(p.contractUntil)}</div></div>` : ''}
      ${p.agent ? `<div class="data-row"><div class="k">Representación</div><div class="v">${e(p.agent)}</div></div>` : ''}
      <div class="data-row"><div class="k">Estadísticas ${e(data.seasonStats.season)}</div><div class="v">${e(data.seasonStats.matches)} PJ · ${e(data.seasonStats.goals)} goles · ${e(data.seasonStats.assists)} asist. · ${e(data.seasonStats.minutes)} min · ${e(data.seasonStats.yellowCards)} amar. · ${e(data.seasonStats.redCards)} rojas</div></div>
    </div>
    ${p.transfermarktUrl ? `<a class="tm-link" href="${e(p.transfermarktUrl)}" target="_blank" rel="noopener">Perfil completo en Transfermarkt ↗</a>` : ''}
  </div>
</section>

<section>
  <div class="container">
    <div class="section-title">Sobre el jugador</div>
    <div class="section-sub">&nbsp;</div>
    <p class="bio-text">${e(p.bio)}</p>
  </div>
</section>

<section id="trayectoria">
  <div class="container">
    <div class="section-title">Trayectoria</div>
    <div class="section-sub">Historial de clubes</div>
    <div class="club-list">${clubRows}</div>
  </div>
</section>

<section id="galeria">
  <div class="container">
    <div class="section-title">Galería</div>
    <div class="section-sub">Fotos de partidos y entrenamientos</div>
    ${galleryHtml}
  </div>
</section>

<section id="videos">
  <div class="container">
    <div class="section-title">Videos y highlights</div>
    <div class="section-sub">Jugadas y goles destacados</div>
    ${videosHtml}
  </div>
</section>

<section id="noticias">
  <div class="container">
    <div class="section-title">Noticias</div>
    <div class="section-sub">Menciones y notas de prensa</div>
    ${newsHtml}
  </div>
</section>

<div class="contact-band">
  <div class="container">
    ${p.agent ? `<div class="agent-line">Representado por ${e(p.agent)}</div>` : ''}
    <div class="icon-row">
      ${p.email ? `<a class="icon-link" href="mailto:${e(p.email)}" aria-label="Email" title="${e(p.email)}">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
      </a>` : ''}
      ${p.instagram ? `<a class="icon-link" href="${e(p.instagram)}" target="_blank" rel="noopener" aria-label="Instagram" title="Instagram">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>
      </a>` : ''}
    </div>
  </div>
</div>

<footer>© ${new Date().getFullYear()} ${e(p.name)}</footer>

</body>
</html>`;
}

module.exports = { renderPublicPage };
