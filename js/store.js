// Datos y cuentas del sistema. Todo se guarda en este navegador (localStorage).
// Es un script común (sin módulos) para que funcione igual abriendo los HTML con doble clic.
const LS = 'sgic2', SES = 'sgic2_sesion';
const CODIGO = 'escuela2026'; // código institucional para crear cuentas de Regencia
const ROLES = { ALUMNO: 'Alumno', PROFESOR: 'Profesor', PRECEPTOR: 'Preceptor/DOE', REGENTE: 'Regencia/Directivo' };
// Materias sugeridas al asignar cursos a un profesor (Regencia puede escribir otras).
const MATERIAS = ['Matemática', 'Lengua y Literatura', 'Inglés', 'Física', 'Química', 'Historia', 'Geografía', 'Educación Física', 'Taller', 'Automotores', 'Computación', 'Programación', 'Dibujo Técnico'];
// Cursos: año (1ro a 6to), división (1ra a 4ta) y, de 4to a 6to, especialidad.
// Ej.: "1ro 1ra", "3ro 4ta", "4to 1ra Computación".
const ESPECIALIDADES = ['Computación', 'Automotores'];
const ANIOS = ['1ro', '2do', '3ro', '4to', '5to', '6to'];
const DIVISIONES = ['1ra', '2da', '3ra', '4ta'];
const CURSOS = [];
for (let a = 0; a < 6; a++) {
  if (a < 3) for (const d of DIVISIONES) CURSOS.push(`${ANIOS[a]} ${d}`);
  else for (const e of ESPECIALIDADES) for (const d of DIVISIONES) CURSOS.push(`${ANIOS[a]} ${d} ${e}`);
}

let D = { users: [], informes: [] };
try { D = Object.assign(D, JSON.parse(localStorage.getItem(LS)) || {}); } catch (e) { /* datos vacíos */ }
// Migra cursos de formatos anteriores ("3° 2ª", "3° A", "4° A Computación") al actual ("3ro 2da", "4to 1ra Computación").
const DIV_POR_LETRA = { A: '1ra', B: '2da', C: '3ra', D: '4ta', 1: '1ra', 2: '2da', 3: '3ra', 4: '4ta' };
const migrarCurso = (c) => {
  if (typeof c !== 'string' || CURSOS.includes(c)) return c;
  const m = c.match(/^(\d)°\s*([A-D1-4])(?:ª)?(?:\s+(.+))?$/);
  const anio = m && ANIOS[+m[1] - 1];
  return anio ? `${anio} ${DIV_POR_LETRA[m[2]]}${m[3] ? ' ' + m[3].trim() : ''}` : c;
};
let migrado = false;
D.users.forEach((u) => {
  if (u.curso) { const n = migrarCurso(u.curso); if (n !== u.curso) { u.curso = n; migrado = true; } }
  (u.asign || []).forEach((a) => { a.cursos = a.cursos.map(migrarCurso).filter((c) => CURSOS.includes(c)); });
});
D.informes.forEach((i) => { const n = migrarCurso(i.alCurso); if (n !== i.alCurso) { i.alCurso = n; migrado = true; } });
delete D.notas; delete D.faltas; // las calificaciones y faltas ya no son parte del sistema
const guardar = () => { try { localStorage.setItem(LS, JSON.stringify(D)); } catch (e) { /* sin almacenamiento */ } };
if (migrado) guardar();
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

async function hash(pass, sal) {
  const enc = new TextEncoder();
  if (window.crypto && crypto.subtle) {
    const k = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(sal), iterations: 100000, hash: 'SHA-256' }, k, 256);
    return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381; // navegador sin crypto.subtle
  for (const c of sal + pass) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return 'x' + h;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EDU = /@([a-z0-9-]+\.)*edu\.ar$/;
const GMAIL = /@gmail\.com$/;

const Auth = {
  actual() {
    const id = localStorage.getItem(SES);
    return D.users.find((u) => u.id === id) || null;
  },
  esRegencia: (u) => !!u && (u.rol === 'REGENTE' || u.rol === 'PRECEPTOR'),

  // Crea una cuenta validando las reglas de cada rol. Lo usa Regencia (profesores y alumnos) y el registro de Regencia.
  async crear(d) {
    const nombre = (d.nombre || '').trim(), email = (d.email || '').trim().toLowerCase(), pass = d.password || '';
    if (nombre.length < 3) throw new Error('Ingresá nombre y apellido.');
    if (!EMAIL.test(email)) throw new Error('El correo no es válido.');
    if (!ROLES[d.rol]) throw new Error('Elegí un rol.');
    if (d.rol === 'PROFESOR' && !EDU.test(email)) throw new Error('El correo del profesor tiene que terminar en edu.ar (por ejemplo nombre@bue.edu.ar).');
    if (d.rol === 'ALUMNO' && !GMAIL.test(email)) throw new Error('El correo del alumno tiene que ser @gmail.com.');
    if (pass.length < 8 || pass.length > 72) throw new Error('La contraseña debe tener entre 8 y 72 caracteres.');
    if (D.users.some((u) => u.email === email)) throw new Error('Ya existe una cuenta con ese correo.');
    const u = { id: uid(), nombre, email, rol: d.rol, creado: new Date().toISOString() };
    if (d.rol === 'ALUMNO') {
      if (!CURSOS.includes(d.curso)) throw new Error('Elegí el curso del alumno.');
      u.curso = d.curso; u.dni = (d.dni || '').trim();
      // Responsables a quienes llega el mensaje del informe (opcional)
      u.familia = (d.familia || []).filter((f) => f.email || f.nombre).map((f) => {
        const em = (f.email || '').trim().toLowerCase();
        if (!EMAIL.test(em)) throw new Error('El correo del responsable no es válido.');
        return { nombre: (f.nombre || '').trim() || 'Responsable', vinculo: f.vinculo || 'Responsable', email: em };
      });
    }
    if (d.rol === 'PROFESOR') {
      const mapa = {};
      for (const a of d.asign || []) {
        const m = (a.materia || '').trim();
        if (!m) continue;
        mapa[m] = [...new Set([...(mapa[m] || []), ...(a.cursos || [])])];
      }
      const asign = Object.entries(mapa).map(([materia, cursos]) => ({ materia, cursos: CURSOS.filter((c) => cursos.includes(c)) }));
      if (!asign.length) throw new Error('Agregá al menos una materia con sus cursos.');
      if (asign.some((a) => !a.cursos.length)) throw new Error('Cada materia necesita al menos un curso.');
      u.asign = asign;
    }
    u.sal = uid();
    u.hash = await hash(pass, u.sal);
    D.users.push(u);
    guardar();
    return u;
  },

  // portal: 'comunidad' (alumnos y profesores) o 'regencia' (regencia y superiores)
  async login(email, password, portal) {
    const u = D.users.find((x) => x.email === (email || '').trim().toLowerCase());
    if (!u || (await hash(password || '', u.sal)) !== u.hash) throw new Error('Correo o contraseña incorrectos.');
    const reg = Auth.esRegencia(u);
    if (portal === 'regencia' && !reg) throw new Error('Esta entrada es solo para Regencia y superiores. Usá «Alumnos y profesores».');
    if (portal !== 'regencia' && reg) throw new Error('Tu cuenta es de Regencia o superiores. Usá la entrada «Regencia y superiores».');
    localStorage.setItem(SES, u.id);
    return u;
  },

  logout() {
    localStorage.removeItem(SES);
    location.replace('index.html');
  },
};
