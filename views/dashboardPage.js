const { escapeHtml: e } = require('../lib/escape');

function renderDashboardPage(data, saved) {
  const p = data.player;
  const s = data.seasonStats;
  const c = data.careerStats;

  const clubItems = data.clubHistory.map((club) => `
    <div class="admin-list-item">
      <div class="thumb">${club.crest ? `<img src="${e(club.crest)}">` : ''}</div>
      <div class="grow"><strong>${e(club.club)}</strong> — ${e(club.period)} (${e(club.role)})</div>
      <form method="POST" action="/admin/club/${e(club.id)}/delete">
        <button class="admin-btn danger" type="submit">Eliminar</button>
      </form>
    </div>
  `).join('');

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
    <h3>Datos del jugador</h3>
    <form method="POST" action="/admin/player">
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
        <div class="form-field full"><label>Enlace a Transfermarkt</label><input name="transfermarktUrl" value="${e(p.transfermarktUrl)}"></div>
        <div class="form-field full"><label>Biografía</label><textarea name="bio">${e(p.bio)}</textarea></div>
        <div class="form-field"><label>Email de contacto (aparece como ícono en el pie)</label><input name="email" value="${e(p.email)}"></div>
        <div class="form-field"><label>Instagram — URL completa (aparece como ícono en el pie)</label><input name="instagram" value="${e(p.instagram)}" placeholder="https://instagram.com/usuario"></div>
        <div class="form-field"><label>Teléfono (uso interno, no se muestra)</label><input name="phone" value="${e(p.phone)}"></div>
        <div class="form-field"><label>YouTube (uso interno, no se muestra)</label><input name="youtube" value="${e(p.youtube)}"></div>
      </div>
      <button class="admin-btn" type="submit">Guardar datos</button>
    </form>
  </div>

  <div class="admin-card">
    <h3>Foto principal (hero)</h3>
    <form method="POST" action="/admin/hero-photo" enctype="multipart/form-data">
      <div class="form-field"><label>Subir/reemplazar foto</label><input type="file" name="heroPhoto" accept="image/*" required></div>
      <button class="admin-btn" type="submit">Subir foto</button>
    </form>
  </div>

  <div class="admin-card">
    <h3>Estadísticas — temporada actual</h3>
    <form method="POST" action="/admin/stats/season">
      <div class="form-grid">
        <div class="form-field"><label>Temporada</label><input name="season" value="${e(s.season)}"></div>
        <div class="form-field"><label>Partidos</label><input type="number" name="matches" value="${e(s.matches)}"></div>
        <div class="form-field"><label>Goles</label><input type="number" name="goals" value="${e(s.goals)}"></div>
        <div class="form-field"><label>Asistencias</label><input type="number" name="assists" value="${e(s.assists)}"></div>
        <div class="form-field"><label>Minutos jugados</label><input type="number" name="minutes" value="${e(s.minutes)}"></div>
        <div class="form-field"><label>Tarjetas amarillas</label><input type="number" name="yellowCards" value="${e(s.yellowCards)}"></div>
        <div class="form-field"><label>Tarjetas rojas</label><input type="number" name="redCards" value="${e(s.redCards)}"></div>
      </div>
      <button class="admin-btn" type="submit">Guardar estadísticas</button>
    </form>
  </div>

  <div class="admin-card">
    <h3>Estadísticas — carrera</h3>
    <form method="POST" action="/admin/stats/career">
      <div class="form-grid">
        <div class="form-field"><label>Partidos totales</label><input type="number" name="matches" value="${e(c.matches)}"></div>
        <div class="form-field"><label>Goles totales</label><input type="number" name="goals" value="${e(c.goals)}"></div>
        <div class="form-field"><label>Asistencias totales</label><input type="number" name="assists" value="${e(c.assists)}"></div>
        <div class="form-field"><label>Temporadas</label><input type="number" name="seasons" value="${e(c.seasons)}"></div>
        <div class="form-field"><label>Clubes</label><input type="number" name="clubs" value="${e(c.clubs)}"></div>
      </div>
      <button class="admin-btn" type="submit">Guardar estadísticas</button>
    </form>
  </div>

  <div class="admin-card">
    <h3>Historial de clubes</h3>
    ${clubItems}
    <form method="POST" action="/admin/club" enctype="multipart/form-data" style="margin-top:16px;">
      <div class="form-grid">
        <div class="form-field"><label>Club</label><input name="club" required></div>
        <div class="form-field"><label>Período</label><input name="period" placeholder="2024 — Presente" required></div>
        <div class="form-field"><label>Rol</label><input name="role" placeholder="Titular / Formativas"></div>
        <div class="form-field"><label>Escudo (imagen)</label><input type="file" name="crest" accept="image/*"></div>
      </div>
      <button class="admin-btn" type="submit">Añadir club</button>
    </form>
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
</body>
</html>`;
}

module.exports = { renderDashboardPage };
