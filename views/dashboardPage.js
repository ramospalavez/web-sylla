const { escapeHtml: e } = require('../lib/escape');

function yearOptions(selected, includePresente) {
  const nowYear = new Date().getFullYear();
  const years = [];
  for (let y = nowYear + 2; y >= 2010; y--) years.push(y);
  let html = includePresente
    ? `<option value="" ${!selected ? 'selected' : ''}>Presente</option>`
    : `<option value="">—</option>`;
  html += years.map((y) => `<option value="${y}" ${Number(selected) === y ? 'selected' : ''}>${y}</option>`).join('');
  return html;
}

function renderDashboardPage(data, saved) {
  const p = data.player;
  const s = data.seasonStats;

  const clubItems = data.clubHistory.map((club, idx) => {
    const photos = Array.isArray(club.photos) ? club.photos : [];
    const isFirst = idx === 0;
    const isLast = idx === data.clubHistory.length - 1;
    // Importante: estos mini-formularios van FUERA del <form> de edición del club.
    // Un <form> dentro de otro <form> es HTML inválido — el navegador lo ignora
    // y los botones terminan enviando el formulario grande equivocado.
    const photosHtml = photos.length > 0
      ? `<div class="photo-thumbs">${photos.map((ph) => `
          <div class="photo-thumb">
            <div class="thumb-frame${ph.featured ? ' is-featured' : ''}">
              <img src="${e(ph.url)}">
            </div>
            <div class="thumb-actions">
              <form method="POST" action="/admin/club/${e(club.id)}/photo/${e(ph.id)}/feature">
                <button class="admin-btn" type="submit" title="Destacar en el collage">${ph.featured ? '★' : '☆'}</button>
              </form>
              <form method="POST" action="/admin/club/${e(club.id)}/photo/${e(ph.id)}/delete">
                <button class="admin-btn danger" type="submit">✕</button>
              </form>
            </div>
          </div>`).join('')}</div>`
      : `<p class="empty-note" style="margin-left:0;">Sin fotos todavía.</p>`;
    return `
    <div class="club-block">
      <div class="club-block-bar">
        <div class="club-move-btns">
          <form method="POST" action="/admin/club/${e(club.id)}/move"><input type="hidden" name="direction" value="up">
            <button class="admin-btn move-btn" type="submit" title="Mover antes (más viejo)" ${isFirst ? 'disabled' : ''}>▲</button>
          </form>
          <form method="POST" action="/admin/club/${e(club.id)}/move"><input type="hidden" name="direction" value="down">
            <button class="admin-btn move-btn" type="submit" title="Mover después (más reciente)" ${isLast ? 'disabled' : ''}>▼</button>
          </form>
        </div>
        <div class="club-block-crest">${club.crest ? `<img src="${e(club.crest)}">` : ''}</div>
        <div class="club-block-title">
          <strong>${e(club.club) || '(sin nombre)'}</strong>
          <span class="club-block-sub">${e(club.period)}${club.role ? ` · ${e(club.role)}` : ''}${club.showNote === false ? ' · nota oculta' : ''}${club.showPhotos === false ? ' · fotos ocultas' : ''}</span>
        </div>
      </div>
      <details class="club-details">
        <summary>Editar etapa / fotos</summary>
        <form method="POST" action="/admin/club/${e(club.id)}/update" enctype="multipart/form-data" class="savable-form" id="form-club-${e(club.id)}" data-label="${e(club.club)}">
          <div class="form-grid">
            <div class="form-field"><label>Club</label><input name="club" value="${e(club.club)}" required></div>
            <div class="form-field"><label>Rol</label><input name="role" value="${e(club.role)}" placeholder="Titular / Formativas"></div>
            <div class="form-field"><label>Desde (año)</label><select name="yearFrom">${yearOptions(club.yearFrom, false)}</select></div>
            <div class="form-field"><label>Hasta</label><select name="yearTo">${yearOptions(club.yearTo, true)}</select></div>
            <div class="form-field full"><label>Texto alternativo de período (opcional — si lo completás, reemplaza a los años; usalo para casos como "Fútbol base")</label><input name="periodText" value="${club.yearFrom ? '' : e(club.period || '')}" placeholder="Ej: Fútbol base"></div>
            <div class="form-field">
              <label>Escudo (dejar vacío para conservar el actual)</label>
              <div style="display:flex;align-items:center;gap:10px;">
                <div class="thumb">${club.crest ? `<img src="${e(club.crest)}">` : ''}</div>
                <input type="file" name="crest" accept="image/*">
              </div>
            </div>
            <div class="form-field full"><label>Nota / relato de esta etapa (se muestra bajo el club)</label><textarea name="note">${e(club.note || '')}</textarea></div>
            <div class="form-field full">
              <label>Agregar fotos de esta etapa (podés elegir varias a la vez)</label>
              <input type="file" name="photos" accept="image/*" multiple>
            </div>
            <div class="form-field full">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" name="showNote" value="1" ${club.showNote !== false ? 'checked' : ''} style="width:auto;">
                Mostrar la nota/descripción de esta etapa en la web
              </label>
            </div>
            <div class="form-field full">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" name="showPhotos" value="1" ${club.showPhotos !== false ? 'checked' : ''} style="width:auto;">
                Mostrar las fotos de esta etapa en la web
              </label>
            </div>
            <p class="form-field full section-hint" style="margin:0;">El club (escudo, nombre, período y rol) siempre aparece en la trayectoria — estos dos interruptores solo ocultan el texto o las fotos.</p>
          </div>
          <button class="admin-btn inline-save-btn" type="submit" style="margin-top:10px;">Guardar cambios</button>
        </form>
        <div style="margin-top:12px;">
          <label>Fotos cargadas (★ destaca en el collage · ✕ elimina)</label>
          ${photosHtml}
        </div>
        <form method="POST" action="/admin/club/${e(club.id)}/delete" style="margin-top:10px;">
          <button class="admin-btn danger" type="submit">Eliminar club</button>
        </form>
      </details>
    </div>
  `;
  }).join('');

  const galleryItems = data.gallery.map((g) => `
    <div class="admin-list-item">
      <div class="thumb"><img src="${e(g.url)}"></div>
      <div class="grow">${e(g.caption) || '(sin descripción)'} — ${e(g.date)}</div>
      <form method="POST" action="/admin/gallery/${e(g.id)}/delete">
        <button class="admin-btn danger" type="submit">Eliminar</button>
      </form>
    </div>
  `).join('');

  const videoItems = data.videos.map((v) => `
    <div class="admin-list-item">
      <div class="grow"><strong>${e(v.title)}</strong> — ${v.type === 'upload' ? 'archivo subido' : 'enlace'} — ${e(v.date)}</div>
      <form method="POST" action="/admin/videos/${e(v.id)}/delete">
        <button class="admin-btn danger" type="submit">Eliminar</button>
      </form>
    </div>
  `).join('');

  const newsItems = data.news.map((n) => `
    <div class="admin-list-item">
      <div class="grow"><strong>${e(n.title)}</strong> — ${e(n.source)} — ${e(n.date)}</div>
      <form method="POST" action="/admin/news/${e(n.id)}/delete">
        <button class="admin-btn danger" type="submit">Eliminar</button>
      </form>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Panel de administración</title>
<link rel="stylesheet" href="/css/style.css">
</head>
<body class="admin-body">

<nav class="admin-nav">
  <div class="container">
    <div class="brand">Panel de administración</div>
    <div class="nav-links" style="gap:18px;">
      <a href="/" target="_blank">Ver sitio ↗</a>
      <a href="/admin/logout">Salir</a>
    </div>
  </div>
</nav>

<div class="admin-wrap">
  ${saved ? `<div class="saved-msg">Cambios guardados correctamente.</div>` : ''}

  <div class="admin-card">
    <h3>Estado del sitio</h3>
    <form method="POST" action="/admin/site">
      <div class="form-field full">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" name="underConstruction" value="1" ${data.site && data.site.underConstruction ? 'checked' : ''} style="width:auto;">
          Sitio en construcción (los visitantes ven una página de "próximamente" en vez de la web real)
        </label>
      </div>
      <button class="admin-btn" type="submit" style="margin-top:10px;">Guardar estado</button>
    </form>
  </div>

  <div class="admin-card">
    <h3>Datos del jugador</h3>
    <form method="POST" action="/admin/player" class="savable-form" id="form-player" data-label="Datos del jugador">
      <div class="form-grid">
        <div class="form-field"><label>Nombre completo</label><input name="name" value="${e(p.name)}" required></div>
        <div class="form-field"><label>Posición</label><input name="position" value="${e(p.position)}"></div>
        <div class="form-field"><label>Dorsal</label><input name="squadNumber" value="${e(p.squadNumber)}"></div>
        <div class="form-field"><label>Fecha de nacimiento</label><input name="birthdate" value="${e(p.birthdate)}" placeholder="AAAA-MM-DD"></div>
        <div class="form-field"><label>Lugar de nacimiento</label><input name="birthplace" value="${e(p.birthplace)}"></div>
        <div class="form-field"><label>Nacionalidad</label><input name="nationality" value="${e(p.nationality)}"></div>
        <div class="form-field"><label>Altura</label><input name="height" value="${e(p.height)}"></div>
        <div class="form-field"><label>Pie hábil</label><input name="foot" value="${e(p.foot)}"></div>
        <div class="form-field"><label>Club actual</label><input name="currentClub" value="${e(p.currentClub)}"></div>
        <div class="form-field"><label>Fichado (fecha)</label><input name="signedDate" value="${e(p.signedDate)}" placeholder="AAAA-MM-DD"></div>
        <div class="form-field"><label>Valor de mercado</label><input name="marketValue" value="${e(p.marketValue)}"></div>
        <div class="form-field"><label>Contrato hasta</label><input name="contractUntil" value="${e(p.contractUntil)}" placeholder="AAAA-MM-DD"></div>
        <div class="form-field"><label>Agente / Representante</label><input name="agent" value="${e(p.agent)}"></div>
        <div class="form-field full">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" name="showAgent" value="1" ${p.showAgent !== false ? 'checked' : ''} style="width:auto;">
            Mostrar la representación/agente en el sitio (ficha técnica y pie de página)
          </label>
        </div>
        <div class="form-field full"><label>Enlace a Transfermarkt</label><input name="transfermarktUrl" value="${e(p.transfermarktUrl)}"></div>
        <div class="form-field full"><label>Biografía</label><textarea name="bio">${e(p.bio)}</textarea></div>
        <div class="form-field"><label>Email de contacto (aparece como ícono en el pie)</label><input name="email" value="${e(p.email)}"></div>
        <div class="form-field"><label>Instagram — URL completa (aparece como ícono en el pie)</label><input name="instagram" value="${e(p.instagram)}" placeholder="https://instagram.com/usuario"></div>
        <div class="form-field"><label>Teléfono (uso interno, no se muestra)</label><input name="phone" value="${e(p.phone)}"></div>
        <div class="form-field"><label>YouTube (uso interno, no se muestra)</label><input name="youtube" value="${e(p.youtube)}"></div>
      </div>
      <button class="admin-btn inline-save-btn" type="submit">Guardar datos</button>
    </form>
  </div>

  <div class="admin-card">
    <h3>Foto principal (hero)</h3>
    <form method="POST" action="/admin/hero-photo" enctype="multipart/form-data" class="savable-form" id="form-hero" data-label="Foto principal">
      <div class="form-field"><label>Subir/reemplazar foto</label><input type="file" name="heroPhoto" accept="image/*" required></div>
      <button class="admin-btn inline-save-btn" type="submit">Subir foto</button>
    </form>
  </div>

  <div class="admin-card">
    <h3>Temporada</h3>
    <p class="section-hint">Solo se usa como referencia en el subtítulo de "Ficha técnica" (ej. "Temporada 2025/26 · Datos de contrato..."). Los contadores de partidos/goles se quitaron de la web — ya está el enlace a Transfermarkt para eso.</p>
    <form method="POST" action="/admin/stats/season" class="savable-form" id="form-season" data-label="Temporada">
      <div class="form-grid">
        <div class="form-field"><label>Temporada</label><input name="season" value="${e(s.season)}" placeholder="2025/2026"></div>
      </div>
      <button class="admin-btn inline-save-btn" type="submit">Guardar</button>
    </form>
  </div>

  <div class="admin-card">
    <h3>Historial de clubes</h3>
    <p class="section-hint">Del más viejo (arriba) al presente (abajo). Usá ▲▼ para reordenar; tocá "Editar etapa" para desplegar los datos de cada uno.</p>
    ${clubItems}
    <details class="club-details" style="margin-top:16px;">
      <summary>+ Añadir club nuevo</summary>
      <form method="POST" action="/admin/club" enctype="multipart/form-data">
        <div class="form-grid">
          <div class="form-field"><label>Club</label><input name="club" required></div>
          <div class="form-field"><label>Rol</label><input name="role" placeholder="Titular / Formativas"></div>
          <div class="form-field"><label>Desde (año)</label><select name="yearFrom">${yearOptions(null, false)}</select></div>
          <div class="form-field"><label>Hasta</label><select name="yearTo">${yearOptions(null, true)}</select></div>
          <div class="form-field full"><label>Texto alternativo de período (opcional)</label><input name="periodText" placeholder="Ej: Fútbol base"></div>
          <div class="form-field"><label>Escudo (imagen)</label><input type="file" name="crest" accept="image/*"></div>
        </div>
        <button class="admin-btn" type="submit" style="margin-top:10px;">Añadir club (se agrega al final, el más reciente)</button>
      </form>
    </details>
  </div>

  <div class="admin-card">
    <h3>Galería de fotos</h3>
    ${galleryItems}
    <form method="POST" action="/admin/gallery" enctype="multipart/form-data" style="margin-top:16px;">
      <div class="form-grid">
        <div class="form-field"><label>Foto</label><input type="file" name="photo" accept="image/*" required></div>
        <div class="form-field"><label>Descripción (opcional)</label><input name="caption"></div>
      </div>
      <button class="admin-btn" type="submit">Subir foto</button>
    </form>
  </div>

  <div class="admin-card">
    <h3>Videos</h3>
    ${videoItems}
    <form method="POST" action="/admin/videos" enctype="multipart/form-data" style="margin-top:16px;">
      <div class="form-grid">
        <div class="form-field full"><label>Título</label><input name="title" required></div>
        <div class="form-field"><label>Subir archivo de video</label><input type="file" name="videoFile" accept="video/*"></div>
        <div class="form-field"><label>...o pegar enlace embebible (YouTube/Vimeo)</label><input name="videoUrl" placeholder="https://www.youtube.com/embed/XXXX"></div>
        <div class="form-field"><label>Fecha</label><input name="date" placeholder="AAAA-MM-DD"></div>
      </div>
      <button class="admin-btn" type="submit">Añadir video</button>
    </form>
  </div>

  <div class="admin-card">
    <h3>Noticias</h3>
    ${newsItems}
    <form method="POST" action="/admin/news" style="margin-top:16px;">
      <div class="form-grid">
        <div class="form-field full"><label>Título</label><input name="title" required></div>
        <div class="form-field"><label>Fuente / medio</label><input name="source" placeholder="Diario Deportivo"></div>
        <div class="form-field"><label>Fecha</label><input name="date" placeholder="AAAA-MM-DD"></div>
        <div class="form-field full"><label>Enlace a la nota original</label><input name="url" placeholder="https://..."></div>
        <div class="form-field full"><label>Resumen breve</label><textarea name="summary"></textarea></div>
      </div>
      <button class="admin-btn" type="submit">Publicar noticia</button>
    </form>
  </div>

</div>

<div id="floating-save" class="floating-save">
  <span id="floating-save-label" class="floating-save-label">Guardar cambios</span>
  <button type="button" id="floating-save-btn" class="floating-save-btn">Guardar cambios</button>
</div>

<script>
(function(){
  var forms=Array.prototype.slice.call(document.querySelectorAll('.savable-form'));
  if(!forms.length)return;
  document.body.classList.add('has-floating-save');
  var btn=document.getElementById('floating-save-btn');
  var label=document.getElementById('floating-save-label');
  var active=forms[0];
  var pinned=null;
  function setActive(f){
    if(!f||f===active)return;
    active=f;
    label.textContent=f.getAttribute('data-label')||'Guardar cambios';
  }
  setActive(forms[0]);
  forms.forEach(function(f){
    f.addEventListener('focusin',function(){
      setActive(f);
      if(!f.closest('.club-details'))pinned=null;
    });
  });
  // Abrir un acordeón de club es la señal más confiable de "esto es lo que
  // estoy editando" — mientras esté abierto, el guardado flotante no debe
  // saltar a otro formulario solo porque el scroll lo acerca al centro.
  document.querySelectorAll('.club-details').forEach(function(det){
    det.addEventListener('toggle',function(){
      var f=det.querySelector('.savable-form');
      if(det.open&&f){pinned=f;setActive(f);}
      else if(pinned&&det.contains(pinned)){pinned=null;}
    });
  });
  function updateByScroll(){
    if(pinned)return;
    var vh=window.innerHeight,best=null,bestDist=Infinity;
    forms.forEach(function(f){
      var r=f.getBoundingClientRect();
      var center=r.top+r.height/2;
      var dist=Math.abs(center-vh/2);
      if(dist<bestDist){bestDist=dist;best=f;}
    });
    if(best)setActive(best);
  }
  var t;
  window.addEventListener('scroll',function(){clearTimeout(t);t=setTimeout(updateByScroll,120);},{passive:true});
  updateByScroll();
  btn.addEventListener('click',function(){
    if(active.reportValidity && !active.reportValidity())return;
    if(active.requestSubmit)active.requestSubmit();else active.submit();
  });
})();
</script>

</body>
</html>`;
}

module.exports = { renderDashboardPage };
