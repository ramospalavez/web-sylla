const { escapeHtml: e } = require('../lib/escape');

function renderLoginPage(error) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin | Ingresar</title>
<link rel="stylesheet" href="/css/style.css">
</head>
<body class="admin-body">
  <div class="login-wrap">
    <h2>Panel de administración</h2>
    ${error ? `<div class="error-msg">${e(error)}</div>` : ''}
    <form method="POST" action="/admin/login">
      <div class="form-field" style="margin-bottom:14px;">
        <label>Usuario</label>
        <input type="text" name="username" required autofocus>
      </div>
      <div class="form-field" style="margin-bottom:14px;">
        <label>Contraseña</label>
        <input type="password" name="password" required>
      </div>
      <button class="admin-btn" type="submit" style="width:100%;">Entrar</button>
    </form>
  </div>
</body>
</html>`;
}

module.exports = { renderLoginPage };
