const fs = require('fs');

// Cargador mínimo de archivos .env (reemplaza al paquete "dotenv",
// que no está disponible porque este entorno no tiene acceso a npm).
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  content.split('\n').forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

module.exports = { loadEnv };
