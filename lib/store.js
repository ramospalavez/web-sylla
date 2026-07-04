const fs = require('fs');
const path = require('path');
const { getFile, putFile } = require('./github');

const DATA_REPO_PATH = 'data/data.json';
const LOCAL_FALLBACK = path.join(__dirname, '..', 'data', 'data.json');

// Lee los datos del sitio. Si hay credenciales de GitHub configuradas, lee
// directamente del repositorio (así funciona en Vercel/Render sin disco
// persistente). Si no hay credenciales (por ejemplo corriendo local sin
// .env completo), usa el archivo data/data.json local como respaldo.
async function readData() {
  if (hasGithubConfig()) {
    const file = await getFile(DATA_REPO_PATH);
    if (!file) throw new Error('No se encontró data/data.json en el repositorio de GitHub.');
    return JSON.parse(file.content.toString('utf-8'));
  }
  return JSON.parse(fs.readFileSync(LOCAL_FALLBACK, 'utf-8'));
}

async function writeData(data) {
  const json = JSON.stringify(data, null, 2);
  if (hasGithubConfig()) {
    await putFile(DATA_REPO_PATH, Buffer.from(json), 'Actualizar datos del sitio desde /admin');
    return;
  }
  fs.writeFileSync(LOCAL_FALLBACK, json, 'utf-8');
}

function hasGithubConfig() {
  return !!(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

module.exports = { readData, writeData, genId, hasGithubConfig };
