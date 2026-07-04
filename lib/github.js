// Guarda y lee archivos directamente en el repositorio de GitHub del proyecto,
// usando la API de contenidos de GitHub. Reemplaza al disco local (que se borra
// en hostings sin disco persistente como Vercel o Render gratis).
// Usa "fetch" nativo de Node (18+), sin dependencias externas.

const GITHUB_API = 'https://api.github.com';

function config() {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    throw new Error(
      'Faltan variables de entorno de GitHub (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO). Revisá el archivo .env.'
    );
  }
  return {
    token: GITHUB_TOKEN,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    branch: GITHUB_BRANCH || 'main'
  };
}

async function githubRequest(path, options = {}) {
  const { token } = config();
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'web-jugador-app',
      ...(options.headers || {})
    }
  });
  return res;
}

// Devuelve { content: Buffer, sha } o null si el archivo no existe todavía.
async function getFile(filePath) {
  const { owner, repo, branch } = config();
  const res = await githubRequest(
    `/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub: no se pudo leer ${filePath} (HTTP ${res.status})`);
  }
  const json = await res.json();
  return { content: Buffer.from(json.content, 'base64'), sha: json.sha };
}

// Crea o actualiza un archivo en el repo.
async function putFile(filePath, buffer, message) {
  const { owner, repo, branch } = config();
  const existing = await getFile(filePath);
  const body = {
    message,
    content: buffer.toString('base64'),
    branch
  };
  if (existing) body.sha = existing.sha;

  const res = await githubRequest(`/repos/${owner}/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`GitHub: no se pudo guardar ${filePath} (HTTP ${res.status}) ${errText}`);
  }
  return res.json();
}

async function deleteFile(filePath, message) {
  const { owner, repo, branch } = config();
  const existing = await getFile(filePath);
  if (!existing) return;
  const res = await githubRequest(`/repos/${owner}/${repo}/contents/${filePath}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sha: existing.sha, branch })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`GitHub: no se pudo borrar ${filePath} (HTTP ${res.status}) ${errText}`);
  }
}

// URL pública para servir el archivo vía CDN (jsDelivr), requiere repo público.
function publicUrl(filePath) {
  const { owner, repo, branch } = config();
  return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${filePath}`;
}

module.exports = { getFile, putFile, deleteFile, publicUrl };
