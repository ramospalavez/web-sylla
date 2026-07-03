// Parser mínimo de multipart/form-data (reemplaza a "multer").
// Suficiente para formularios simples con campos de texto + hasta un archivo.

function getBoundary(contentType) {
  if (!contentType) return null;
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!match) return null;
  return (match[1] || match[2]).trim();
}

function parseMultipart(buffer, boundary) {
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = buffer.indexOf(boundaryBuf);
  if (start === -1) return parts;

  while (true) {
    const next = buffer.indexOf(boundaryBuf, start + boundaryBuf.length);
    if (next === -1) break;

    let partBuf = buffer.slice(start + boundaryBuf.length, next);
    if (partBuf.slice(0, 2).toString('latin1') === '\r\n') {
      partBuf = partBuf.slice(2);
    }
    if (partBuf.slice(-2).toString('latin1') === '\r\n') {
      partBuf = partBuf.slice(0, -2);
    }

    if (partBuf.length > 0) {
      const headerEndIdx = partBuf.indexOf('\r\n\r\n');
      if (headerEndIdx !== -1) {
        const headerStr = partBuf.slice(0, headerEndIdx).toString('utf-8');
        const body = partBuf.slice(headerEndIdx + 4);
        const headers = {};
        headerStr.split('\r\n').forEach((line) => {
          const idx = line.indexOf(':');
          if (idx > -1) {
            headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
          }
        });
        const cd = headers['content-disposition'] || '';
        const nameMatch = /name="([^"]*)"/.exec(cd);
        const filenameMatch = /filename="([^"]*)"/.exec(cd);
        parts.push({
          name: nameMatch ? nameMatch[1] : null,
          filename: filenameMatch ? filenameMatch[1] : null,
          contentType: headers['content-type'] || null,
          data: body
        });
      }
    }
    start = next;
  }
  return parts;
}

module.exports = { getBoundary, parseMultipart };
