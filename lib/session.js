const crypto = require('crypto');

// Sesiones en memoria (reemplaza a "express-session").
// Suficiente para un panel de admin de un solo usuario. Si el servidor
// se reinicia, las sesiones activas se pierden (hay que volver a loguearse).
const sessions = new Map();

function createSession(data, maxAgeMs) {
  const id = crypto.randomBytes(24).toString('hex');
  sessions.set(id, { data, expires: Date.now() + maxAgeMs });
  return id;
}

function getSession(id) {
  if (!id) return null;
  const s = sessions.get(id);
  if (!s) return null;
  if (Date.now() > s.expires) {
    sessions.delete(id);
    return null;
  }
  return s.data;
}

function destroySession(id) {
  sessions.delete(id);
}

module.exports = { createSession, getSession, destroySession };
