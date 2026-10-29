if (Auth.actual()) location.replace('app.html');

const f = document.getElementById('f');
const err = document.getElementById('err');
const ok = document.getElementById('ok');
const btn = f.querySelector('button[type=submit]');

document.querySelectorAll('[data-ojo]').forEach((b) => b.addEventListener('click', () => {
  const i = document.getElementById(b.dataset.ojo);
  i.type = i.type === 'password' ? 'text' : 'password';
  b.textContent = i.type === 'password' ? 'Mostrar' : 'Ocultar';
}));

const fallo = (msg) => {
  err.textContent = msg;
  err.hidden = false;
  btn.disabled = false;
  btn.textContent = 'Crear cuenta';
};

f.addEventListener('submit', async (e) => {
  e.preventDefault();
  err.hidden = true;
  if (f.password.value !== f.repetir.value) return fallo('Las contraseñas no coinciden.');
  if (f.codigo.value.trim() !== CODIGO) return fallo('El código institucional no es correcto.');
  btn.disabled = true;
  btn.textContent = 'Creando cuenta…';
  try {
    await Auth.crear({ nombre: f.nombre.value, email: f.email.value, password: f.password.value, rol: f.rol.value });
    const destino = 'login.html?portal=regencia&registrado=' + encodeURIComponent(f.email.value.trim());
    f.querySelectorAll('input,select,button').forEach((el) => (el.disabled = true));
    btn.textContent = 'Cuenta creada';
    ok.hidden = false;
    document.getElementById('ir').href = destino;
    setTimeout(() => location.assign(destino), 2500);
  } catch (x) {
    fallo(x.message);
  }
});
