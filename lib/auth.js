// Autenticación sin estado del servidor (reemplaza a "express-session").
// Necesario porque en hostings serverless (Vercel) cada visita puede caer en
// una instancia distinta del servidor, así que no podemos guardar la sesión
// en memoria (se perdería). En cambio, firmamos la cookie con una clave
// secreta: el propio cookie contiene todo lo necesario para validarse.

const crypto = require('crypto');

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function createToken(maxAgeMs, secret) {
  const expires = Date.now() + maxAgeMs;
  const payload = `admin:${expires}`;
  const sig = sign(payload, secret);
  return Buffer.from(`${payload}:${sig}`, 'utf-8').toString('base64url');
}

function verifyToken(token, secret) {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;
    const [role, expiresStr, sig] = parts;
    const payload = `${role}:${expiresStr}`;
    const expected = sign(payload, secret);
    if (sig.length !== expected.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    if (Date.now() > Number(expiresStr)) return false;
    return role === 'admin';
  } catch (err) {
    return false;
  }
}

module.exports = { createToken, verifyToken };
