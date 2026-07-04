const { escapeHtml: e } = require('../lib/escape');

function calcAge(birthdate) {
  if (!birthdate) return null;
  let d;
  // Acepta "AAAA-MM-DD" (ISO) y "DD/MM/AAAA".
  const dmy = String(birthdate).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  } else {
    d = new Date(birthdate);
  }
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return (age > 0 && age < 120) ? age : null;
}

function renderPublicPage(data) {
  const p = data.player;
  const nameParts = (p.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const restName = nameParts.slice(1).join(' ');
  // Marca del nav: nombre compacto, sin el primer nombre si hay 3+ palabras.
  const brandWords = nameParts.length >= 3 ? nameParts.slice(1) : nameParts;
  const brandFirst = brandWords[0] || '';
  const brandRest = brandWords.slice(1).join(' ');
  const age = calcAge(p.birthdate);

  // Texto para buscadores y para cuando se comparte el link (WhatsApp/redes).
  const tagline = [p.position, p.currentClub, p.nationality, age ? `${age} años` : '']
    .filter(Boolean).join(' · ');
  const metaDesc = (p.bio && p.bio.trim())
    ? p.bio.replace(/\s+/g, ' ').trim().slice(0, 180)
    : tagline;

  const monogram = (name) => (name || '').replace(/\([^)]*\)/g, '').trim()
    .split(/\s+/).map((w) => w[0] || '').join('').slice(0, 3).toUpperCase();

  const timelineNodes = data.clubHistory
    .filter((c) => c.visible !== false)
    .map((c) => {
      const isNow = c.current === true;
      const photos = Array.isArray(c.photos) ? c.photos : [];
      const photosData = e(JSON.stringify(photos.map((ph) => ({ url: ph.url, featured: !!ph.featured }))));
      return `
    <div class="tl-node${isNow ? ' is-now' : ''}">
      <span class="tl-dot"></span>
      <div class="tl-card">
        <div class="tl-head">
          <div class="tl-crest">${c.crest ? `<img src="${e(c.crest)}" alt="${e(c.club)}">` : `<span>${e(monogram(c.club))}</span>`}</div>
          <div class="tl-htext">
            <div class="tl-club">${e(c.club)}</div>
            <div class="tl-period">${e(c.period)}</div>
          </div>
          ${c.role ? `<span class="tl-chip${isNow ? ' is-now' : ''}">${e(c.role)}</span>` : ''}
        </div>
        ${(c.note && c.showNote !== false) ? `<p class="tl-note">${e(c.note)}</p>` : ''}
        ${photos.length ? `<div class="tl-photos" data-photos="${photosData}"></div>` : ''}
      </div>
    </div>`;
    }).join('') || `<p class="empty-note">Todavía no hay clubes cargados.</p>`;

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
<meta name="description" content="${e(metaDesc)}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${e(p.name)}${p.position ? ` — ${e(p.position)}` : ''}">
<meta property="og:description" content="${e(metaDesc)}">
${p.heroPhoto ? `<meta property="og:image" content="${e(p.heroPhoto)}">` : ''}
<meta name="twitter:card" content="${p.heroPhoto ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${e(p.name)}${p.position ? ` — ${e(p.position)}` : ''}">
<meta name="twitter:description" content="${e(metaDesc)}">
${p.heroPhoto ? `<meta name="twitter:image" content="${e(p.heroPhoto)}">` : ''}
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.85em%22 font-size=%2290%22>%E2%9A%BD</text></svg>">
<link rel="stylesheet" href="/css/style.css">
</head>
<body>

<nav class="site-nav">
  <div class="container">
    <div class="brand">${e(brandFirst)} <span>${e(brandRest)}</span></div>
    <div class="nav-links">
      <a href="#ficha">Ficha</a>
      <a href="#stats">Estadísticas</a>
      <a href="#trayectoria">Trayectoria</a>
      ${data.gallery.length > 0 ? `<a href="#galeria">Galería</a>` : ''}
      ${data.videos.length > 0 ? `<a href="#videos">Videos</a>` : ''}
      ${data.news.length > 0 ? `<a href="#noticias">Noticias</a>` : ''}
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
      ${(p.squadNumber || p.position)
        ? `<div class="hero-number">${[p.squadNumber ? `Nº ${e(p.squadNumber)}` : '', p.position ? e(p.position) : ''].filter(Boolean).join(' · ')}</div>`
        : ''}
      <div class="hero-name">${e(p.name)}</div>
      <div class="hero-meta">
        ${p.currentClub ? `<span><strong>${e(p.currentClub)}</strong></span>` : ''}
        ${age ? `<span>${age} años</span>` : ''}
        ${p.nationality ? `<span>${e(p.nationality)}</span>` : ''}
        ${p.height ? `<span>${e(p.height)}</span>` : ''}
        ${p.foot ? `<span>Pie: ${e(p.foot)}</span>` : ''}
      </div>
      <div class="hero-links">
        <a class="btn btn-gold" href="${data.news.length > 0 ? '#noticias' : '#trayectoria'}">${data.news.length > 0 ? 'Últimas noticias' : 'Ver trayectoria'}</a>
        ${p.transfermarktUrl ? `<a class="btn btn-outline" href="${e(p.transfermarktUrl)}" target="_blank" rel="noopener">Ver en Transfermarkt ↗</a>` : ''}
      </div>
    </div>
  </div>
</header>

<section id="stats">
  <div class="container">
    <div class="section-title">Ficha técnica</div>
    <div class="section-sub">Temporada ${e(data.seasonStats.season)} · Datos de contrato y valor de mercado</div>
    <div class="data-table">
      ${p.birthdate ? `<div class="data-row"><div class="k">Fecha de nacimiento</div><div class="v">${e(p.birthdate)}${age ? ` · ${age} años` : ''}</div></div>` : ''}
      ${p.birthplace ? `<div class="data-row"><div class="k">Lugar de nacimiento</div><div class="v">${e(p.birthplace)}</div></div>` : ''}
      ${p.nationality ? `<div class="data-row"><div class="k">Nacionalidad</div><div class="v">${e(p.nationality)}</div></div>` : ''}
      ${p.height ? `<div class="data-row"><div class="k">Altura</div><div class="v">${e(p.height)}</div></div>` : ''}
      ${p.foot ? `<div class="data-row"><div class="k">Pie hábil</div><div class="v">${e(p.foot)}</div></div>` : ''}
      ${p.currentClub ? `<div class="data-row"><div class="k">Club actual</div><div class="v">${e(p.currentClub)}</div></div>` : ''}
      ${p.signedDate ? `<div class="data-row"><div class="k">Fichado</div><div class="v">${e(p.signedDate)}</div></div>` : ''}
      ${p.marketValue ? `<div class="data-row"><div class="k">Valor de mercado</div><div class="v">${e(p.marketValue)}</div></div>` : ''}
      ${p.contractUntil ? `<div class="data-row"><div class="k">Contrato hasta</div><div class="v">${e(p.contractUntil)}</div></div>` : ''}
      ${(p.agent && p.showAgent !== false) ? `<div class="data-row"><div class="k">Representación</div><div class="v">${e(p.agent)}</div></div>` : ''}
    </div>
    ${p.transfermarktUrl ? `<a class="tm-link" href="${e(p.transfermarktUrl)}" target="_blank" rel="noopener">Perfil completo en Transfermarkt ↗</a>` : ''}
  </div>
</section>

${p.bio ? `<section>
  <div class="container">
    <div class="section-title">Sobre el jugador</div>
    <div class="section-sub">&nbsp;</div>
    <p class="bio-text">${e(p.bio)}</p>
  </div>
</section>` : ''}

<section id="trayectoria" class="tl-section">
  <div class="container">
    <div class="section-title">Trayectoria</div>
    <div class="section-sub">De Conakry a Granada — cada club, su historia en fotos</div>
    <div class="tl">${timelineNodes}</div>
  </div>
</section>

${data.gallery.length > 0 ? `<section id="galeria">
  <div class="container">
    <div class="section-title">Galería</div>
    <div class="section-sub">Fotos de partidos y entrenamientos</div>
    ${galleryHtml}
  </div>
</section>` : ''}

${data.videos.length > 0 ? `<section id="videos">
  <div class="container">
    <div class="section-title">Videos y highlights</div>
    <div class="section-sub">Jugadas y goles destacados</div>
    ${videosHtml}
  </div>
</section>` : ''}

${data.news.length > 0 ? `<section id="noticias">
  <div class="container">
    <div class="section-title">Noticias</div>
    <div class="section-sub">Menciones y notas de prensa</div>
    ${newsHtml}
  </div>
</section>` : ''}

<div class="contact-band">
  <div class="container">
    ${(p.agent && p.showAgent !== false) ? `<div class="agent-line">Representado por ${e(p.agent)}</div>` : ''}
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

<div id="tl-lb" class="tl-lb" onclick="this.style.display='none'"><img id="tl-lb-img" alt="Foto ampliada"><span class="tl-lb-x">×</span></div>

<script>
(function(){
  var grids=[];
  document.querySelectorAll('.tl-photos').forEach(function(box){
    var photos;
    try{photos=JSON.parse(box.getAttribute('data-photos')||'[]');}catch(e){photos=[];}
    if(!photos.length)return;
    var grid=document.createElement('div');grid.className='tl-grid';box.appendChild(grid);
    var metas=photos.map(function(p){return{url:p.url,featured:!!p.featured,ratio:0.72};});
    var done=0;
    metas.forEach(function(mm){var im=new Image();im.onload=im.onerror=function(){if(im.naturalWidth)mm.ratio=im.naturalWidth/im.naturalHeight;done++;if(done===metas.length){grids.push({grid:grid,metas:metas});layout(grid,metas);}};im.src=mm.url;});
  });
  function layout(grid,metas){
    var arr=metas.slice().sort(function(a,b){return (b.featured?1:0)-(a.featured?1:0);});
    var cw=grid.clientWidth||600,gap=6,cols=cw<560?2:4;
    var colW=(cw-(cols-1)*gap)/cols;
    grid.style.gridTemplateColumns='repeat('+cols+',1fr)';
    grid.style.gridAutoRows=Math.max(46,Math.round(colW*0.62))+'px';
    var html='';
    arr.forEach(function(m,i){
      var land=m.ratio>1.15,feat=m.featured||i===0,cs,rs;
      if(feat){cs=Math.min(2,cols);rs=3;}
      else if(land){cs=Math.min(2,cols);rs=2;}
      else{cs=1;rs=2;}
      html+='<button class="tl-cell" style="grid-column:span '+cs+';grid-row:span '+rs+'" data-src="'+m.url+'"><img src="'+m.url+'" loading="lazy" alt=""></button>';
    });
    grid.innerHTML=html;
  }
  document.addEventListener('click',function(ev){
    var cell=ev.target.closest?ev.target.closest('.tl-cell'):null;
    if(!cell)return;
    document.getElementById('tl-lb-img').src=cell.getAttribute('data-src');
    document.getElementById('tl-lb').style.display='flex';
  });
  var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){grids.forEach(function(g){layout(g.grid,g.metas);});},150);});
})();
</script>

</body>
</html>`;
}

module.exports = { renderPublicPage };
