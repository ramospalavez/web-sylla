// Servidor sin dependencias externas (solo módulos nativos de Node.js).
// Este entorno de pruebas no tiene acceso al registro de npm, así que
// se reemplazaron Express/EJS/Multer/dotenv por implementaciones propias
// mínimas en la carpeta lib/. Funciona igual en cualquier hosting con Node 18+.
//
// El almacenamiento (datos + fotos/videos subidos desde /admin) vive en el
// repositorio de GitHub del proyecto (ver lib/github.js), no en el disco del
// servidor — así funciona en hostings sin disco persistente (Vercel, Render
// gratis, etc.). La autenticación de /admin usa una cookie firmada sin estado
// (ver lib/auth.js), necesaria porque en serverless cada visita puede caer en
// una instancia distinta del proceso.

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { loadEnv } = require('./lib/env');
const { createToken, verifyToken } = require('./lib/auth');
const { getBoundary, parseMultipart } = require('./lib/multipart');
const { parseCookies, readBody, parseUrlEncoded, sendHtml, redirect } = require('./lib/http');
const { readData, writeData, genId, hasGithubConfig } = require('./lib/store');
const { putFile, deleteFile, publicUrl } = require('./lib/github');
const { renderPublicPage } = require('./views/publicPage');
const { renderLoginPage } = require('./views/loginPage');
const { renderDashboardPage } = require('./views/dashboardPage');
const { renderComingSoonPage } = require('./views/comingSoonPage');

loadEnv(path.join(__dirname, '.env'));

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-cambiame';
const SESSION_COOKIE = 'sid';
const SESSION_MAX_AGE = 1000 * 60 * 60 * 8; // 8 horas
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB

const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

// Solo se usan carpetas locales de uploads como respaldo cuando NO hay
// credenciales de GitHub configuradas (por ejemplo, pruebas rápidas locales).
if (!hasGithubConfig()) {
  ['photos', 'videos', 'crests'].forEach((sub) => {
    fs.mkdirSync(path.join(UPLOADS_DIR, sub), { recursive: true });
  });
}

const MIME = {
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime'
};

function isAuthed(req) {
  const cookies = parseCookies(req);
  return verifyToken(cookies[SESSION_COOKIE], SESSION_SECRET);
}

function setCookieHeader(token) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${Math.floor(SESSION_MAX_AGE / 1000)}; SameSite=Lax`;
}

function clearCookieHeader() {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

async function serveStatic(req, res, pathname) {
  const relative = decodeURIComponent(pathname);
  const resolved = path.join(PUBLIC_DIR, relative);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Prohibido');
    return;
  }
  fs.readFile(resolved, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('No encontrado');
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

async function getMultipartFields(req, contentType) {
  const boundary = getBoundary(contentType);
  if (!boundary) return { fields: {}, files: {} };
  const buffer = await readBody(req, MAX_UPLOAD_BYTES);
  const parts = parseMultipart(buffer, boundary);
  const fields = {};
  const files = {};
  const fileParts = [];
  parts.forEach((part) => {
    if (!part.name) return;
    if (part.filename) {
      if (part.filename.trim() !== '') {
        files[part.name] = part; // último con ese nombre (compatibilidad)
        fileParts.push(part);     // todos, para subidas múltiples
      }
    } else {
      fields[part.name] = part.data.toString('utf-8');
    }
  });
  return { fields, files, fileParts };
}

// Guarda un archivo subido. Si hay credenciales de GitHub, lo sube al repo
// (vía API, funciona en serverless) y devuelve la URL pública del CDN.
// Si no, lo guarda en el disco local (solo para pruebas rápidas sin internet).
async function saveUploadedFile(part, subfolder) {
  const ext = path.extname(part.filename) || '';
  const filename = genId() + ext;

  if (hasGithubConfig()) {
    const repoPath = `public/uploads/${subfolder}/${filename}`;
    await putFile(repoPath, part.data, `Subir archivo: ${filename}`);
    return publicUrl(repoPath);
  }

  const dest = path.join(UPLOADS_DIR, subfolder, filename);
  fs.writeFileSync(dest, part.data);
  return `/uploads/${subfolder}/${filename}`;
}

async function deleteUploadedFile(fileUrl) {
  if (!fileUrl) return;
  if (hasGithubConfig() && fileUrl.startsWith('http')) {
    const match = fileUrl.match(/@[^/]+\/(.+)$/);
    if (match) {
      await deleteFile(match[1], 'Eliminar archivo desde /admin').catch(() => {});
    }
    return;
  }
  if (fileUrl.startsWith('/uploads/')) {
    const filePath = path.join(PUBLIC_DIR, fileUrl);
    fs.unlink(filePath, () => {});
  }
}

async function handleRequest(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  try {
    // --- Archivos estáticos (solo CSS del sitio; los uploads viven en GitHub) ---
    if (method === 'GET' && (pathname.startsWith('/css/') || pathname.startsWith('/uploads/'))) {
      return serveStatic(req, res, pathname);
    }

    // --- Sitio público ---
    if (method === 'GET' && pathname === '/') {
      const data = await readData();
      if (data.site && data.site.underConstruction) {
        return sendHtml(res, 200, renderComingSoonPage(data));
      }
      return sendHtml(res, 200, renderPublicPage(data));
    }

    // --- Login admin ---
    if (pathname === '/admin/login') {
      if (method === 'GET') {
        return sendHtml(res, 200, renderLoginPage(null));
      }
      if (method === 'POST') {
        const body = await readBody(req, 1024 * 1024);
        const fields = parseUrlEncoded(body);
        if (fields.username === ADMIN_USER && fields.password === ADMIN_PASSWORD) {
          const token = createToken(SESSION_MAX_AGE, SESSION_SECRET);
          return redirect(res, '/admin', setCookieHeader(token));
        }
        return sendHtml(res, 401, renderLoginPage('Usuario o contraseña incorrectos.'));
      }
    }

    if (method === 'GET' && pathname === '/admin/logout') {
      return redirect(res, '/admin/login', clearCookieHeader());
    }

    // --- Todo lo demás bajo /admin requiere sesión ---
    if (pathname.startsWith('/admin')) {
      if (!isAuthed(req)) {
        return redirect(res, '/admin/login');
      }

      if (method === 'GET' && pathname === '/admin') {
        const data = await readData();
        const saved = parsed.query.saved || null;
        return sendHtml(res, 200, renderDashboardPage(data, saved));
      }

      if (method === 'POST' && pathname === '/admin/site') {
        const body = await readBody(req, 1024 * 1024);
        const f = parseUrlEncoded(body);
        const data = await readData();
        data.site = data.site || {};
        data.site.underConstruction = f.underConstruction === '1';
        await writeData(data);
        return redirect(res, '/admin?saved=sitio');
      }

      if (method === 'POST' && pathname === '/admin/player') {
        const body = await readBody(req, 1024 * 1024);
        const f = parseUrlEncoded(body);
        const data = await readData();
        Object.assign(data.player, {
          name: f.name, position: f.position, squadNumber: f.squadNumber,
          birthdate: f.birthdate, birthplace: f.birthplace, nationality: f.nationality, height: f.height,
          foot: f.foot, currentClub: f.currentClub, signedDate: f.signedDate, marketValue: f.marketValue,
          contractUntil: f.contractUntil, agent: f.agent, showAgent: f.showAgent === '1', transfermarktUrl: f.transfermarktUrl,
          bio: f.bio, email: f.email, phone: f.phone, instagram: f.instagram, youtube: f.youtube
        });
        await writeData(data);
        return redirect(res, '/admin?saved=datos');
      }

      if (method === 'POST' && pathname === '/admin/hero-photo') {
        const { files } = await getMultipartFields(req, req.headers['content-type']);
        const data = await readData();
        if (files.heroPhoto) {
          data.player.heroPhoto = await saveUploadedFile(files.heroPhoto, 'photos');
          await writeData(data);
        }
        return redirect(res, '/admin?saved=foto');
      }

      if (method === 'POST' && pathname === '/admin/stats/season') {
        const body = await readBody(req, 1024 * 1024);
        const f = parseUrlEncoded(body);
        const data = await readData();
        data.seasonStats = {
          season: f.season,
          matches: Number(f.matches) || 0,
          goals: Number(f.goals) || 0,
          assists: Number(f.assists) || 0,
          minutes: Number(f.minutes) || 0,
          yellowCards: Number(f.yellowCards) || 0,
          redCards: Number(f.redCards) || 0
        };
        await writeData(data);
        return redirect(res, '/admin?saved=stats-temporada');
      }

      if (method === 'POST' && pathname === '/admin/stats/career') {
        const body = await readBody(req, 1024 * 1024);
        const f = parseUrlEncoded(body);
        const data = await readData();
        data.careerStats = {
          matches: Number(f.matches) || 0,
          goals: Number(f.goals) || 0,
          assists: Number(f.assists) || 0,
          seasons: Number(f.seasons) || 0,
          clubs: Number(f.clubs) || 0
        };
        await writeData(data);
        return redirect(res, '/admin?saved=stats-carrera');
      }

      if (method === 'POST' && pathname === '/admin/club') {
        const { fields, files } = await getMultipartFields(req, req.headers['content-type']);
        const data = await readData();
        data.clubHistory.unshift({
          id: genId(),
          club: fields.club,
          period: fields.period,
          role: fields.role,
          note: fields.note || '',
          visible: true,
          photos: [],
          crest: files.crest ? await saveUploadedFile(files.crest, 'crests') : null
        });
        await writeData(data);
        return redirect(res, '/admin?saved=club');
      }

      let m;
      if (method === 'POST' && (m = pathname.match(/^\/admin\/club\/([^/]+)\/update$/))) {
        const { fields, files, fileParts } = await getMultipartFields(req, req.headers['content-type']);
        const data = await readData();
        const club = data.clubHistory.find((c) => c.id === m[1]);
        if (club) {
          club.club = fields.club;
          club.period = fields.period;
          club.role = fields.role;
          club.note = fields.note || '';
          club.visible = fields.visible === '1';
          club.showNote = fields.showNote === '1';
          if (files.crest) {
            if (club.crest) await deleteUploadedFile(club.crest);
            club.crest = await saveUploadedFile(files.crest, 'crests');
          }
          // Subida en bloque: todas las fotos con nombre "photos" se agregan.
          if (!Array.isArray(club.photos)) club.photos = [];
          const newPhotos = (fileParts || []).filter((p) => p.name === 'photos');
          for (const part of newPhotos) {
            club.photos.push({ id: genId(), url: await saveUploadedFile(part, 'photos'), featured: false });
          }
          await writeData(data);
        }
        return redirect(res, '/admin?saved=club-actualizado');
      }

      // Borrar una foto concreta de un club.
      if (method === 'POST' && (m = pathname.match(/^\/admin\/club\/([^/]+)\/photo\/([^/]+)\/delete$/))) {
        const data = await readData();
        const club = data.clubHistory.find((c) => c.id === m[1]);
        if (club && Array.isArray(club.photos)) {
          const ph = club.photos.find((p) => p.id === m[2]);
          if (ph) await deleteUploadedFile(ph.url);
          club.photos = club.photos.filter((p) => p.id !== m[2]);
          await writeData(data);
        }
        return redirect(res, '/admin?saved=foto-eliminada');
      }

      // Marcar/desmarcar una foto como destacada.
      if (method === 'POST' && (m = pathname.match(/^\/admin\/club\/([^/]+)\/photo\/([^/]+)\/feature$/))) {
        const data = await readData();
        const club = data.clubHistory.find((c) => c.id === m[1]);
        if (club && Array.isArray(club.photos)) {
          const ph = club.photos.find((p) => p.id === m[2]);
          if (ph) ph.featured = !ph.featured;
          await writeData(data);
        }
        return redirect(res, '/admin?saved=foto-destacada');
      }

      if (method === 'POST' && (m = pathname.match(/^\/admin\/club\/([^/]+)\/delete$/))) {
        const data = await readData();
        const removed = data.clubHistory.find((c) => c.id === m[1]);
        if (removed) {
          if (removed.crest) await deleteUploadedFile(removed.crest);
          for (const ph of (removed.photos || [])) await deleteUploadedFile(ph.url);
        }
        data.clubHistory = data.clubHistory.filter((c) => c.id !== m[1]);
        await writeData(data);
        return redirect(res, '/admin?saved=club-eliminado');
      }

      if (method === 'POST' && pathname === '/admin/gallery') {
        const { fields, files } = await getMultipartFields(req, req.headers['content-type']);
        const data = await readData();
        if (files.photo) {
          data.gallery.unshift({
            id: genId(),
            url: await saveUploadedFile(files.photo, 'photos'),
            caption: fields.caption || '',
            date: new Date().toISOString().slice(0, 10)
          });
          await writeData(data);
        }
        return redirect(res, '/admin?saved=galeria');
      }

      if (method === 'POST' && (m = pathname.match(/^\/admin\/gallery\/([^/]+)\/delete$/))) {
        const data = await readData();
        const item = data.gallery.find((g) => g.id === m[1]);
        if (item) await deleteUploadedFile(item.url);
        data.gallery = data.gallery.filter((g) => g.id !== m[1]);
        await writeData(data);
        return redirect(res, '/admin?saved=galeria-eliminada');
      }

      if (method === 'POST' && pathname === '/admin/videos') {
        const { fields, files } = await getMultipartFields(req, req.headers['content-type']);
        const data = await readData();
        const entry = { id: genId(), title: fields.title, date: fields.date || new Date().toISOString().slice(0, 10) };
        if (files.videoFile) {
          entry.type = 'upload';
          entry.url = await saveUploadedFile(files.videoFile, 'videos');
        } else if (fields.videoUrl) {
          entry.type = 'link';
          entry.url = fields.videoUrl;
        } else {
          return redirect(res, '/admin?saved=video-error');
        }
        data.videos.unshift(entry);
        await writeData(data);
        return redirect(res, '/admin?saved=video');
      }

      if (method === 'POST' && (m = pathname.match(/^\/admin\/videos\/([^/]+)\/delete$/))) {
        const data = await readData();
        const item = data.videos.find((v) => v.id === m[1]);
        if (item && item.type === 'upload') await deleteUploadedFile(item.url);
        data.videos = data.videos.filter((v) => v.id !== m[1]);
        await writeData(data);
        return redirect(res, '/admin?saved=video-eliminado');
      }

      if (method === 'POST' && pathname === '/admin/news') {
        const body = await readBody(req, 1024 * 1024);
        const f = parseUrlEncoded(body);
        const data = await readData();
        data.news.unshift({
          id: genId(),
          title: f.title,
          source: f.source,
          url: f.url,
          summary: f.summary,
          date: f.date || new Date().toISOString().slice(0, 10)
        });
        await writeData(data);
        return redirect(res, '/admin?saved=noticia');
      }

      if (method === 'POST' && (m = pathname.match(/^\/admin\/news\/([^/]+)\/delete$/))) {
        const data = await readData();
        data.news = data.news.filter((n) => n.id !== m[1]);
        await writeData(data);
        return redirect(res, '/admin?saved=noticia-eliminada');
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Página no encontrada');
  } catch (err) {
    if (err.message === 'PAYLOAD_TOO_LARGE') {
      res.writeHead(413, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('El archivo es demasiado grande.');
      return;
    }
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Error interno del servidor: ' + err.message);
  }
}

// En Vercel, este módulo se importa y se usa el propio manejador de
// peticiones (no hace falta listen). Localmente, arrancamos el servidor.
if (require.main === module) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Panel de administración en http://localhost:${PORT}/admin/login`);
  });
}

module.exports = handleRequest;
