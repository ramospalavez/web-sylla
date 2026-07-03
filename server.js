// Servidor sin dependencias externas (solo módulos nativos de Node.js).
// Este entorno de pruebas no tiene acceso al registro de npm, así que
// se reemplazaron Express/EJS/Multer/dotenv por implementaciones propias
// mínimas en la carpeta lib/. Funciona igual en cualquier hosting con Node 18+.

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { loadEnv } = require('./lib/env');
const { createSession, getSession, destroySession } = require('./lib/session');
const { getBoundary, parseMultipart } = require('./lib/multipart');
const { parseCookies, readBody, parseUrlEncoded, sendHtml, redirect } = require('./lib/http');
const { readData, writeData, genId } = require('./lib/store');
const { renderPublicPage } = require('./views/publicPage');
const { renderLoginPage } = require('./views/loginPage');
const { renderDashboardPage } = require('./views/dashboardPage');

loadEnv(path.join(__dirname, '.env'));

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const SESSION_COOKIE = 'sid';
const SESSION_MAX_AGE = 1000 * 60 * 60 * 8; // 8 horas
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB

const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
['photos', 'videos', 'crests'].forEach((sub) => {
  fs.mkdirSync(path.join(UPLOADS_DIR, sub), { recursive: true });
});

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
  const session = getSession(cookies[SESSION_COOKIE]);
  return !!(session && session.isAdmin);
}

function setCookieHeader(sid) {
  return `${SESSION_COOKIE}=${sid}; HttpOnly; Path=/; Max-Age=${Math.floor(SESSION_MAX_AGE / 1000)}; SameSite=Lax`;
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
  parts.forEach((part) => {
    if (!part.name) return;
    if (part.filename) {
      if (part.filename.trim() !== '') {
        files[part.name] = part;
      }
    } else {
      fields[part.name] = part.data.toString('utf-8');
    }
  });
  return { fields, files };
}

function saveUploadedFile(part, subfolder) {
  const ext = path.extname(part.filename) || '';
  const filename = genId() + ext;
  const dest = path.join(UPLOADS_DIR, subfolder, filename);
  fs.writeFileSync(dest, part.data);
  return `/uploads/${subfolder}/${filename}`;
}

function deleteUploadedFile(publicUrl) {
  if (!publicUrl) return;
  const filePath = path.join(PUBLIC_DIR, publicUrl);
  fs.unlink(filePath, () => {});
}

async function handleRequest(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  try {
    // --- Archivos estáticos ---
    if (method === 'GET' && (pathname.startsWith('/css/') || pathname.startsWith('/uploads/'))) {
      return serveStatic(req, res, pathname);
    }

    // --- Sitio público ---
    if (method === 'GET' && pathname === '/') {
      const data = readData();
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
          const sid = createSession({ isAdmin: true }, SESSION_MAX_AGE);
          return redirect(res, '/admin', setCookieHeader(sid));
        }
        return sendHtml(res, 401, renderLoginPage('Usuario o contraseña incorrectos.'));
      }
    }

    if (method === 'GET' && pathname === '/admin/logout') {
      const cookies = parseCookies(req);
      destroySession(cookies[SESSION_COOKIE]);
      return redirect(res, '/admin/login', clearCookieHeader());
    }

    // --- Todo lo demás bajo /admin requiere sesión ---
    if (pathname.startsWith('/admin')) {
      if (!isAuthed(req)) {
        return redirect(res, '/admin/login');
      }

      if (method === 'GET' && pathname === '/admin') {
        const data = readData();
        const saved = parsed.query.saved || null;
        return sendHtml(res, 200, renderDashboardPage(data, saved));
      }

      if (method === 'POST' && pathname === '/admin/player') {
        const body = await readBody(req, 1024 * 1024);
        const f = parseUrlEncoded(body);
        const data = readData();
        Object.assign(data.player, {
          name: f.name, position: f.position, squadNumber: f.squadNumber,
          birthdate: f.birthdate, birthplace: f.birthplace, nationality: f.nationality, height: f.height,
          foot: f.foot, currentClub: f.currentClub, signedDate: f.signedDate, marketValue: f.marketValue,
          contractUntil: f.contractUntil, agent: f.agent, transfermarktUrl: f.transfermarktUrl,
          bio: f.bio, email: f.email, phone: f.phone, instagram: f.instagram, youtube: f.youtube
        });
        writeData(data);
        return redirect(res, '/admin?saved=datos');
      }

      if (method === 'POST' && pathname === '/admin/hero-photo') {
        const { files } = await getMultipartFields(req, req.headers['content-type']);
        const data = readData();
        if (files.heroPhoto) {
          data.player.heroPhoto = saveUploadedFile(files.heroPhoto, 'photos');
          writeData(data);
        }
        return redirect(res, '/admin?saved=foto');
      }

      if (method === 'POST' && pathname === '/admin/stats/season') {
        const body = await readBody(req, 1024 * 1024);
        const f = parseUrlEncoded(body);
        const data = readData();
        data.seasonStats = {
          season: f.season,
          matches: Number(f.matches) || 0,
          goals: Number(f.goals) || 0,
          assists: Number(f.assists) || 0,
          minutes: Number(f.minutes) || 0,
          yellowCards: Number(f.yellowCards) || 0,
          redCards: Number(f.redCards) || 0
        };
        writeData(data);
        return redirect(res, '/admin?saved=stats-temporada');
      }

      if (method === 'POST' && pathname === '/admin/stats/career') {
        const body = await readBody(req, 1024 * 1024);
        const f = parseUrlEncoded(body);
        const data = readData();
        data.careerStats = {
          matches: Number(f.matches) || 0,
          goals: Number(f.goals) || 0,
          assists: Number(f.assists) || 0,
          seasons: Number(f.seasons) || 0,
          clubs: Number(f.clubs) || 0
        };
        writeData(data);
        return redirect(res, '/admin?saved=stats-carrera');
      }

      if (method === 'POST' && pathname === '/admin/club') {
        const { fields, files } = await getMultipartFields(req, req.headers['content-type']);
        const data = readData();
        data.clubHistory.unshift({
          id: genId(),
          club: fields.club,
          period: fields.period,
          role: fields.role,
          crest: files.crest ? saveUploadedFile(files.crest, 'crests') : null
        });
        writeData(data);
        return redirect(res, '/admin?saved=club');
      }

      let m;
      if (method === 'POST' && (m = pathname.match(/^\/admin\/club\/([^/]+)\/delete$/))) {
        const data = readData();
        data.clubHistory = data.clubHistory.filter((c) => c.id !== m[1]);
        writeData(data);
        return redirect(res, '/admin?saved=club-eliminado');
      }

      if (method === 'POST' && pathname === '/admin/gallery') {
        const { fields, files } = await getMultipartFields(req, req.headers['content-type']);
        const data = readData();
        if (files.photo) {
          data.gallery.unshift({
            id: genId(),
            url: saveUploadedFile(files.photo, 'photos'),
            caption: fields.caption || '',
            date: new Date().toISOString().slice(0, 10)
          });
          writeData(data);
        }
        return redirect(res, '/admin?saved=galeria');
      }

      if (method === 'POST' && (m = pathname.match(/^\/admin\/gallery\/([^/]+)\/delete$/))) {
        const data = readData();
        const item = data.gallery.find((g) => g.id === m[1]);
        if (item) deleteUploadedFile(item.url);
        data.gallery = data.gallery.filter((g) => g.id !== m[1]);
        writeData(data);
        return redirect(res, '/admin?saved=galeria-eliminada');
      }

      if (method === 'POST' && pathname === '/admin/videos') {
        const { fields, files } = await getMultipartFields(req, req.headers['content-type']);
        const data = readData();
        const entry = { id: genId(), title: fields.title, date: fields.date || new Date().toISOString().slice(0, 10) };
        if (files.videoFile) {
          entry.type = 'upload';
          entry.url = saveUploadedFile(files.videoFile, 'videos');
        } else if (fields.videoUrl) {
          entry.type = 'link';
          entry.url = fields.videoUrl;
        } else {
          return redirect(res, '/admin?saved=video-error');
        }
        data.videos.unshift(entry);
        writeData(data);
        return redirect(res, '/admin?saved=video');
      }

      if (method === 'POST' && (m = pathname.match(/^\/admin\/videos\/([^/]+)\/delete$/))) {
        const data = readData();
        const item = data.videos.find((v) => v.id === m[1]);
        if (item && item.type === 'upload') deleteUploadedFile(item.url);
        data.videos = data.videos.filter((v) => v.id !== m[1]);
        writeData(data);
        return redirect(res, '/admin?saved=video-eliminado');
      }

      if (method === 'POST' && pathname === '/admin/news') {
        const body = await readBody(req, 1024 * 1024);
        const f = parseUrlEncoded(body);
        const data = readData();
        data.news.unshift({
          id: genId(),
          title: f.title,
          source: f.source,
          url: f.url,
          summary: f.summary,
          date: f.date || new Date().toISOString().slice(0, 10)
        });
        writeData(data);
        return redirect(res, '/admin?saved=noticia');
      }

      if (method === 'POST' && (m = pathname.match(/^\/admin\/news\/([^/]+)\/delete$/))) {
        const data = readData();
        data.news = data.news.filter((n) => n.id !== m[1]);
        writeData(data);
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
    res.end('Error interno del servidor.');
  }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Panel de administración en http://localhost:${PORT}/admin/login`);
});
