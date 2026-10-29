(function () {
const ME = Auth.actual();
if (!ME) { location.replace('login.html'); return; }
const R = ME.rol;

const CATS = ['Disciplina', 'Vestimenta', 'Rendimiento', 'Salud', 'Sociofamiliar'];
const EST = { ACTIVO: 'Activo', EN_SUSPENSO: 'En suspenso', RESUELTO: 'Resuelto' };

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fd = (t) => (t ? new Date(t).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const byName = (a, b) => a.nombre.localeCompare(b.nombre, 'es');

// ---------- consultas sobre los datos ----------
const usuario = (id) => D.users.find((u) => u.id === id);
const alumnos = () => D.users.filter((u) => u.rol === 'ALUMNO').sort(byName);
const asigDe = (u) => u.asign || [];
const alumnosDeCurso = (c) => alumnos().filter((a) => a.curso === c);
const cursosProfe = () => [...new Set(asigDe(ME).flatMap((a) => a.cursos))];

// ---------- estado ----------
const S = {
  v: R === 'ALUMNO' ? 'lista' : R === 'PROFESOR' ? 'mat' : 'lista',
  f: 'TODOS', sel: null, ret: null, ct: 'prof', err: '',
  nav: { mat: null, cur: null, al: null },
  fp: { nombre: '', email: '', pass: '', asig: [{ materia: '', cursos: [] }] },
  fa: { nombre: '', email: '', pass: '', dni: '', curso: '' },
};
let tt;
const toast = (m) => { const t = $('#t'); t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => (t.hidden = true), 3200); };
const badge = (e) => `<span class="b ${e}">${EST[e]}</span>`;

// ---------- cabecera ----------
function tabs() {
  if (R === 'ALUMNO') return [['lista', 'Mis informes']];
  if (R === 'PROFESOR') return [['mat', 'Mis materias'], ['lista', 'Informes']];
  const t = [['lista', 'Informes'], ['alu', 'Alumnos'], ['nuevo', 'Nuevo informe']];
  if (R === 'REGENTE') t.push(['cuentas', 'Cuentas']);
  return t;
}
function head() {
  const act = (k) => S.v === k || (k === 'lista' && S.v === 'det');
  return `<header class="top np"><div class="bar"><div class="logo"><img src="img/escudo.png" alt="Escudo de la escuela"><h1>Mensajería de informes</h1></div></div>
 <div class="bar"><span class="rol">${esc(ME.nombre)} · ${ROLES[R]}${R === 'ALUMNO' ? ' · ' + esc(ME.curso) : ''}</span><button class="btn g" data-a="salir">Cerrar sesión</button></div>
 ${tabs().length > 1 ? `<nav>${tabs().map(([k, t]) => `<button data-a="tab" data-v="${k}"${act(k) ? ' aria-current="page"' : ''}>${t}</button>`).join('')}</nav>` : ''}</header>`;
}

// ---------- informes ----------
const nextId = () => 'INF-' + String(Math.max(0, ...D.informes.map((x) => +x.id.slice(4))) + 1).padStart(4, '0');
function visibles() {
  let l = D.informes;
  if (R === 'ALUMNO') l = l.filter((i) => i.alId === ME.id);
  else if (R === 'PROFESOR') { const cs = cursosProfe(); l = l.filter((i) => i.autorId === ME.id || cs.includes((usuario(i.alId) || {}).curso)); }
  return l.filter((i) => S.f === 'TODOS' || i.estado === S.f).sort((a, b) => b.ts.localeCompare(a.ts));
}
const lectura = (r) => (r.leidoEn ? `Leído por el alumno el ${fd(r.leidoEn)}` : 'Sin leer por el alumno');
function filas(l) {
  return l.length ? l.map((r) => `<button class="row ${r.estado}" data-a="open" data-id="${r.id}"><b>${esc(r.alNombre)} · ${esc(r.alCurso)}</b><span class="mu">${r.id} · ${esc(r.cat)} · ${fd(r.ts)} · por ${esc(r.autorNombre)}</span><div>${badge(r.estado)} ${R === 'ALUMNO' ? (r.leidoEn ? '' : '<span class="b ACTIVO">Nuevo</span>') : `<span class="mu">${r.leidoEn ? 'Leído' : 'Sin leer'}</span>`}</div></button>`).join('') : '<p class="mu">No hay informes para mostrar.</p>';
}
function lista() {
  return `<div class="chips" role="group" aria-label="Filtrar por estado">${['TODOS', ...Object.keys(EST)].map((k) => `<button data-a="f" data-v="${k}" aria-pressed="${S.f === k}">${k === 'TODOS' ? 'Todos' : EST[k]}</button>`).join('')}</div>` + filas(visibles());
}
function formInforme(fijo) {
  const ahora = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  let sel;
  if (fijo) sel = `<input type="hidden" id="ial" value="${fijo.id}"><p><b>${esc(fijo.nombre)}</b> · ${esc(fijo.curso)}</p>`;
  else {
    const lista = R === 'PROFESOR' ? alumnos().filter((a) => cursosProfe().includes(a.curso)) : alumnos();
    const grupos = [...new Set(lista.map((a) => a.curso))].sort((x, y) => CURSOS.indexOf(x) - CURSOS.indexOf(y));
    sel = lista.length ? `<label for="ial">Alumno</label><select id="ial">${grupos.map((c) => `<optgroup label="${c}">${lista.filter((a) => a.curso === c).map((a) => `<option value="${a.id}">${esc(a.nombre)}</option>`).join('')}</optgroup>`).join('')}</select>` : '<p class="mu">Todavía no hay alumnos cargados.</p>';
  }
  return `${sel}<label for="ica">Categoría</label><select id="ica">${CATS.map((c) => `<option>${c}</option>`).join('')}</select><label for="its">Fecha y hora del hecho</label><input id="its" type="datetime-local" value="${ahora}"><label for="ihe">Descripción del hecho</label><textarea id="ihe" placeholder="Qué ocurrió, dónde y quiénes estaban presentes."></textarea><p><button class="btn" data-a="crearI">Guardar informe</button></p><p class="mu">Se envía al alumno: lo ve en su cuenta y queda registrado cuándo lo leyó.</p>`;
}
function nuevo() {
  return `<div class="pan"><h3>Nuevo informe</h3>${formInforme()}</div>`;
}
function acta(r) {
  const al = usuario(r.alId) || {};
  const ciclo = new Date(r.ts).getFullYear();
  const texto = (t) => esc(t) || '<span class="acta-vacio">Sin intervención registrada.</span>';
  return `<article id="acta" class="acta">
 <header class="acta-cab"><img class="escudo-acta" src="img/escudo.png" alt="Escudo de la escuela"><div class="acta-esc"><h2>Escuela Técnica N° 35 D.E. 18</h2><p class="acta-sub">Ing. Eduardo Latzina · Av. Lope de Vega 2150 · Tel. 4567-5838</p></div><div class="acta-nro"><span>Informe</span><b>${r.id}</b></div></header>
 <div class="acta-tit"><h3>Informe de conducta escolar</h3><span>Ciclo lectivo ${ciclo}</span></div>
 <section class="acta-datos">
  <div><span>Alumno</span><b>${esc(r.alNombre)}</b></div>
  <div><span>DNI</span><b>${esc(al.dni || '—')}</b></div>
  <div><span>Curso y división</span><b>${esc(r.alCurso)}</b></div>
  <div><span>Fecha y hora del hecho</span><b>${fd(r.ts)}</b></div>
  <div class="ancho"><span>Realizado por</span><b>${esc(r.autorNombre)} · ${ROLES[r.autorRol]}</b></div>
 </section>
 <section class="acta-bloque"><h4>Hecho o situación</h4><p>${esc(r.hecho)}</p></section>
 <section class="acta-bloque"><h4>Intervenciones</h4><p><b>${esc(r.autorNombre)}:</b> ${texto(r.int.AUTOR)}</p><p><b>Regencia:</b> ${texto(r.int.REGENTE)}</p></section>
 <section class="acta-bloque"><h4>Acuse de recibo</h4><p>${lectura(r)}</p></section>
 <div class="acta-estado"><span>Estado del informe</span>${badge(r.estado)}</div>
 <div class="firmas"><div>Docente</div><div>Regencia</div><div>Dirección</div></div>
 <p class="acta-pie">Documento generado por el Sistema de Informes · Escuela Técnica N° 35 D.E. 18</p>
 </article>`;
}
function det() {
  const r = D.informes.find((x) => x.id === S.sel);
  if (!r) return '<p class="mu">Ese informe ya no existe.</p>';
  const cEst = R === 'REGENTE' || R === 'PRECEPTOR', cDel = R === 'REGENTE';
  const intAutor = ME.id === r.autorId, intReg = R === 'REGENTE';
  const bloque = (titulo, k, puede) => `<div class="pan"><h3>${titulo}</h3>${puede ? `<textarea data-t="${k}" aria-label="${titulo}">${esc(r.int[k])}</textarea><p><button class="btn" data-a="int" data-k="${k}">Guardar intervención</button></p>` : `<p>${esc(r.int[k]) || '<span class="mu">Sin texto todavía.</span>'}</p>`}</div>`;
  return `<p class="np"><button class="btn g" data-a="back">Volver</button></p><div class="split"><div class="np">
 <div class="pan"><h3>${r.id} · ${esc(r.alNombre)}</h3><p>${badge(r.estado)}</p>
 <p class="mu">Realizado por ${esc(r.autorNombre)} (${ROLES[r.autorRol]}) · ${fd(r.ts)}<br>${lectura(r)}</p>
 ${cEst ? `<label for="es">Estado</label><select id="es" data-a="est">${Object.entries(EST).map(([k, v]) => `<option value="${k}"${k === r.estado ? ' selected' : ''}>${v}</option>`).join('')}</select>` : ''}
 <p><button class="btn" data-a="pdf">Imprimir / Guardar PDF</button>${cDel ? ' <button class="btn g" data-a="delI">Eliminar informe</button>' : ''}</p></div>
 ${bloque('Intervención de ' + esc(r.autorNombre), 'AUTOR', intAutor)}${bloque('Intervención de Regencia', 'REGENTE', intReg)}
 </div><div class="acw">${acta(r)}</div></div>`;
}

// ---------- panel de un alumno (profesor, preceptor, regencia) ----------
function panelAlumno(al) {
  let h = `<div class="pan"><h3>${esc(al.nombre)}</h3><p class="mu">${esc(al.curso)} · ${esc(al.email)}${al.dni ? ' · DNI ' + esc(al.dni) : ''}</p></div>`;
  const inf = D.informes.filter((i) => i.alId === al.id).sort((a, b) => b.ts.localeCompare(a.ts));
  h += `<div class="pan"><h3>Informes de ${esc(al.nombre)}</h3>${filas(inf)}</div>`;
  h += `<div class="pan"><h3>Enviar un informe a este alumno</h3>${formInforme(al)}</div>`;
  return h;
}
const cantInf = (id) => D.informes.filter((i) => i.alId === id).length;
const subAl = (x) => `${cantInf(x.id)} informe${cantInf(x.id) === 1 ? '' : 's'}`;

// ---------- profesor: materias → cursos → alumnos → alumno ----------
function crumbs(items) {
  return `<p class="crumbs np">${items.map(([t, a]) => (a ? `<button data-a="nav" data-n="${a}">${esc(t)}</button>` : `<span>${esc(t)}</span>`)).join(' › ')}</p>`;
}
function materias() {
  const n = S.nav, mats = asigDe(ME);
  if (!mats.length) return '<div class="pan"><h3>Todavía no tenés materias asignadas</h3><p class="mu">Regencia las asigna al crear tu cuenta.</p></div>';
  if (!n.mat) return `<h2 class="tit">Mis materias</h2><div class="tiles">${mats.map((a) => `<button class="tile" data-a="pick" data-k="mat" data-v="${esc(a.materia)}"><b>${esc(a.materia)}</b><span>${a.cursos.length} curso${a.cursos.length > 1 ? 's' : ''}</span></button>`).join('')}</div>`;
  const a = mats.find((x) => x.materia === n.mat);
  if (!a) { n.mat = null; return materias(); }
  if (!n.cur) return `${crumbs([['Materias', 'mat0'], [n.mat]])}<h2 class="tit">${esc(n.mat)}</h2><div class="tiles">${a.cursos.map((c) => `<button class="tile" data-a="pick" data-k="cur" data-v="${c}"><b>${c}</b><span>${alumnosDeCurso(c).length} alumnos</span></button>`).join('')}</div>`;
  if (!n.al) {
    const l = alumnosDeCurso(n.cur);
    return `${crumbs([['Materias', 'mat0'], [n.mat, 'cur0'], [n.cur]])}<h2 class="tit">${esc(n.mat)} · ${n.cur}</h2>${l.length ? l.map((x) => `<button class="row" data-a="pick" data-k="al" data-v="${x.id}"><b>${esc(x.nombre)}</b><span class="mu">${subAl(x)}</span></button>`).join('') : '<p class="mu">Este curso todavía no tiene alumnos.</p>'}`;
  }
  const al = usuario(n.al);
  if (!al) { n.al = null; return materias(); }
  return `${crumbs([['Materias', 'mat0'], [n.mat, 'cur0'], [n.cur, 'al0'], [al.nombre]])}${panelAlumno(al)}`;
}

// ---------- preceptor / regencia: cursos → alumnos → alumno ----------
function alumnosTab() {
  const n = S.nav;
  if (!n.cur) {
    const cs = CURSOS.filter((c) => alumnosDeCurso(c).length);
    return `<h2 class="tit">Alumnos por curso</h2>${cs.length ? `<div class="tiles">${cs.map((c) => `<button class="tile" data-a="pick" data-k="cur" data-v="${c}"><b>${c}</b><span>${alumnosDeCurso(c).length} alumnos</span></button>`).join('')}</div>` : `<div class="pan"><p class="mu">Todavía no hay alumnos.${R === 'REGENTE' ? ' Creá las cuentas en la pestaña Cuentas.' : ''}</p></div>`}`;
  }
  if (!n.al) return `${crumbs([['Cursos', 'cur0'], [n.cur]])}<h2 class="tit">${n.cur}</h2>${alumnosDeCurso(n.cur).map((x) => `<button class="row" data-a="pick" data-k="al" data-v="${x.id}"><b>${esc(x.nombre)}</b><span class="mu">${subAl(x)}</span></button>`).join('')}`;
  const al = usuario(n.al);
  if (!al) { n.al = null; return alumnosTab(); }
  return `${crumbs([['Cursos', 'cur0'], [n.cur, 'al0'], [al.nombre]])}${panelAlumno(al)}`;
}

// ---------- regencia: cuentas ----------
const ck = (i, c, on) => `<label class="ck"><input type="checkbox" data-k="fp.asig.${i}.cursos" data-c="${c}"${on ? ' checked' : ''}>${c.split(' ')[1]}</label>`;
const GRUPOS = [...new Set(CURSOS.map((c) => { const p = c.split(' '); return p[0] + (p[2] ? ' ' + p[2] : ''); }))];
const cursosDeGrupo = (g) => CURSOS.filter((c) => { const p = c.split(' '); return p[0] + (p[2] ? ' ' + p[2] : '') === g; });
function formProfe() {
  const f = S.fp;
  return `<datalist id="matl">${MATERIAS.map((m) => `<option value="${m}">`).join('')}</datalist>
 <div class="g2"><div><label for="pn">Nombre y apellido</label><input id="pn" data-k="fp.nombre" value="${esc(f.nombre)}"></div><div><label for="pe">Correo (edu.ar)</label><input id="pe" type="email" data-k="fp.email" value="${esc(f.email)}" placeholder="nombre@bue.edu.ar"></div><div><label for="pp">Contraseña inicial</label><input id="pp" data-k="fp.pass" value="${esc(f.pass)}" placeholder="8 o más caracteres"></div></div>
 <h4 class="sp">Materias y cursos que va a dar</h4>
 ${f.asig.map((a, i) => `<div class="asig"><label for="pm${i}">Materia</label><input id="pm${i}" list="matl" data-k="fp.asig.${i}.materia" value="${esc(a.materia)}" placeholder="Elegí o escribí la materia">
 <div class="cgrid">${GRUPOS.map((g) => `<div class="cano"><span>${g}</span>${cursosDeGrupo(g).map((c) => ck(i, c, a.cursos.includes(c))).join('')}</div>`).join('')}</div>
 ${f.asig.length > 1 ? `<button class="btn g" data-a="delasig" data-i="${i}">Quitar esta materia</button>` : ''}</div>`).join('')}
 <p><button class="btn g" data-a="addasig">+ Agregar otra materia</button></p>
 ${S.err && S.ct === 'prof' ? `<p class="err">${esc(S.err)}</p>` : ''}
 <p><button class="btn" data-a="crearP">Crear cuenta de profesor</button></p>`;
}
function formAlumno() {
  const f = S.fa;
  return `<div class="g2"><div><label for="an">Nombre y apellido</label><input id="an" data-k="fa.nombre" value="${esc(f.nombre)}"></div><div><label for="ae">Correo (@gmail.com)</label><input id="ae" type="email" data-k="fa.email" value="${esc(f.email)}" placeholder="nombre@gmail.com"></div><div><label for="ad">DNI (opcional)</label><input id="ad" data-k="fa.dni" value="${esc(f.dni)}" inputmode="numeric"></div><div><label for="ac">Curso</label><select id="ac" data-k="fa.curso"><option value="">Elegí…</option>${CURSOS.map((c) => `<option${c === f.curso ? ' selected' : ''}>${c}</option>`).join('')}</select></div><div><label for="ap">Contraseña inicial</label><input id="ap" data-k="fa.pass" value="${esc(f.pass)}" placeholder="8 o más caracteres"></div></div>
 ${S.err && S.ct === 'alu' ? `<p class="err">${esc(S.err)}</p>` : ''}
 <p><button class="btn" data-a="crearA">Crear cuenta de alumno</button></p>`;
}
function cuentas() {
  const sub = [['prof', 'Profesores'], ['alu', 'Alumnos'], ['reg', 'Regencia y preceptores']];
  let h = `<div class="chips">${sub.map(([k, t]) => `<button data-a="ct" data-v="${k}" aria-pressed="${S.ct === k}">${t}</button>`).join('')}</div>`;
  if (S.ct === 'prof') {
    const l = D.users.filter((u) => u.rol === 'PROFESOR').sort(byName);
    h += `<div class="pan"><h3>Crear cuenta de profesor</h3>${formProfe()}</div>`;
    h += `<h4 class="sec">Profesores (${l.length})</h4>`;
    h += l.length ? l.map((u) => `<div class="pan"><div class="fl"><div><b>${esc(u.nombre)}</b> <span class="pill pill-prof">${ROLES[u.rol] || u.rol}</span><br><span class="mu">${esc(u.email)}</span></div><button class="btn g" data-a="delU" data-id="${u.id}">Eliminar</button></div>${asigDe(u).map((a) => `<p class="asl"><b>${esc(a.materia)}:</b> ${a.cursos.join(', ')}</p>`).join('')}</div>`).join('') : '<p class="mu">Todavía no hay profesores.</p>';
  } else if (S.ct === 'alu') {
    const l = alumnos();
    h += `<div class="pan"><h3>Crear cuenta de alumno</h3>${formAlumno()}</div>`;
    h += `<h4 class="sec">Alumnos (${l.length})</h4>`;
    h += l.length ? l.map((u) => `<div class="pan fl"><div><b>${esc(u.nombre)}</b> <span class="pill pill-alu">${ROLES[u.rol] || u.rol}</span> · ${esc(u.curso)}<br><span class="mu">${esc(u.email)}${u.dni ? ' · DNI ' + esc(u.dni) : ''}</span></div><button class="btn g" data-a="delU" data-id="${u.id}">Eliminar</button></div>`).join('') : '<p class="mu">Todavía no hay alumnos.</p>';
  } else {
    const l = D.users.filter((u) => Auth.esRegencia(u)).sort(byName);
    h += `<h4 class="sec">Regencia y preceptores (${l.length})</h4>`;
    h += l.map((u) => `<div class="pan fl"><div><b>${esc(u.nombre)}</b> <span class="pill pill-reg">${ROLES[u.rol] || u.rol}</span><br><span class="mu">${esc(u.email)}</span></div>${u.id === ME.id ? '<span class="mu">Tu cuenta</span>' : `<button class="btn g" data-a="delU" data-id="${u.id}">Eliminar</button>`}</div>`).join('');
  }
  if (D.users.some((u) => u.demo)) h += `<div class="pan"><h3>Datos de ejemplo</h3><p class="mu">Hay cuentas de ejemplo cargadas (alumnos, docentes y preceptora de Nexus). Si vas a cargar tus propios alumnos, podés borrarlas todas juntas.</p><p><button class="btn g" data-a="undemo">Eliminar datos de ejemplo</button></p></div>`;
  if (!D.users.some((u) => u.rol === 'ALUMNO' || u.rol === 'PROFESOR')) h += `<div class="pan"><h3>¿Querés probar el sistema?</h3><p class="mu">Carga los 12 alumnos, los docentes y las materias de la base de ejemplo de Nexus, con algunos informes de muestra. Todas las cuentas usan la contraseña <code>demo12345</code>; los correos son del tipo <code>nombre.apellido.demo@gmail.com</code> (alumnos) y <code>…demo@bue.edu.ar</code> (profesores). Después se pueden eliminar.</p><p><button class="btn g" data-a="demo">Cargar datos de ejemplo</button></p></div>`;
  h += `<div class="pan"><h3>Respaldo de datos</h3><p class="mu">Los datos se guardan en este navegador. Descargá un respaldo antes de borrar los datos del navegador, para pasar el sistema a otra computadora o para tener una copia de seguridad.</p><p class="fl"><button class="btn" data-a="backup">Descargar respaldo</button><button class="btn g" data-a="restaurar">Restaurar respaldo</button><input id="fres" type="file" accept="application/json,.json" hidden></p></div>`;
  return h;
}

// ---------- render ----------
function render() {
  const v = S.v;
  const cuerpo = v === 'lista' ? lista() : v === 'nuevo' ? nuevo() : v === 'det' ? det() : v === 'mat' ? materias() : v === 'alu' ? alumnosTab() : cuentas();
  $('#app').innerHTML = head() + `<main>${cuerpo}</main>`;
}

// ---------- acciones ----------
// Datos de ejemplo tomados del seed de Nexus (github.com/Hung-Nicolas/Nexus, db/seed-test.sql):
// sus 12 alumnos con sus cursos, su personal docente y las materias que dicta cada uno.
// Los correos son inventados (.demo) y la distribución de materias por curso es solo de ejemplo.
const NEXUS_ALUMNOS = [
  ['Lucía', 'González', 45000001, '3ro 1ra'], ['Mateo', 'Fernández', 45000002, '3ro 1ra'],
  ['Sofía', 'Martínez', 45000003, '4to 1ra Computación'], ['Benjamín', 'López', 45000004, '4to 1ra Computación'],
  ['Valentina', 'Pérez', 45000005, '5to 2da Computación'], ['Thiago', 'Ramírez', 45000006, '5to 2da Computación'], ['Emma', 'Torres', 45000007, '5to 2da Computación'],
  ['Bautista', 'Sosa', 45000008, '6to 1ra Automotores'], ['Isabella', 'Acosta', 45000009, '6to 1ra Automotores'],
  ['Gaspar', 'Benítez', 45000010, '2do 2da'], ['Catalina', 'Medina', 45000011, '2do 2da'], ['Lorenzo', 'Vega', 45000012, '1ro 1ra'],
];
const T = ['1ro 1ra', '2do 2da', '3ro 1ra', '4to 1ra Computación', '5to 2da Computación', '6to 1ra Automotores'];
const COMP = ['4to 1ra Computación', '5to 2da Computación'];
const NEXUS_DOCENTES = [
  ['Ana', 'Ríos', [['Matemática', T], ['Física', T.slice(2)]]],
  ['Pablo', 'Herrera', [['Lengua', T], ['Inglés', T]]],
  ['Carolina', 'Molina', [['Historia', T], ['Geografía', T]]],
  ['Jorge', 'Castillo', [['Programación', COMP], ['Base de Datos', COMP]]],
  ['Diego', 'Ortiz', [['Sistemas Operativos', COMP], ['Taller', T.slice(0, 3)]]],
  ['Florencia', 'Campos', [['Química', T.slice(2)], ['Taller', T.slice(3)]]],
];
const slug = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
async function demo() {
  const pass = 'demo12345';
  const antes = new Set(D.users.map((u) => u.id));
  const profes = [];
  for (const [n, a, asign] of NEXUS_DOCENTES)
    profes.push(await Auth.crear({ nombre: `${n} ${a}`, email: `${slug(n)}.${slug(a)}.demo@bue.edu.ar`, password: pass, rol: 'PROFESOR', asign: asign.map(([materia, cursos]) => ({ materia, cursos })) }));
  await Auth.crear({ nombre: 'María Delgado', email: 'maria.delgado.demo@bue.edu.ar', password: pass, rol: 'PRECEPTOR' }); // preceptora del seed de Nexus
  const al = [];
  for (const [n, a, dni, curso] of NEXUS_ALUMNOS) al.push(await Auth.crear({ nombre: `${n} ${a}`, email: `${slug(n)}.${slug(a)}.demo@gmail.com`, password: pass, rol: 'ALUMNO', curso, dni: String(dni) }));
  const inf = (a, cat, ts, hecho, estado, aut) => D.informes.push({ id: nextId(), alId: a.id, alNombre: a.nombre, alCurso: a.curso, autorId: aut.id, autorNombre: aut.nombre, autorRol: aut.rol, cat, ts, hecho, estado, int: { AUTOR: '', REGENTE: '' } });
  inf(al[1], 'Disciplina', '2026-10-21T09:40', 'Interrumpió la clase en forma reiterada y no atendió las indicaciones.', 'ACTIVO', profes[0]);
  inf(al[9], 'Rendimiento', '2026-10-14T10:15', 'No entregó los trabajos prácticos de los últimos dos trimestres.', 'EN_SUSPENSO', ME);
  inf(al[4], 'Vestimenta', '2026-10-19T08:05', 'Se presentó sin el equipo de taller reglamentario.', 'RESUELTO', profes[4]);
  D.users.filter((u) => !antes.has(u.id)).forEach((u) => { u.demo = true; });
  guardar();
}
function pick(k, v) { S.nav[k] = v; if (k === 'mat') { S.nav.cur = null; S.nav.al = null; } if (k === 'cur') S.nav.al = null; }
const setPath = (o, path, val) => { const p = path.split('.'); let c = o; for (let i = 0; i < p.length - 1; i++) c = c[p[i]]; c[p[p.length - 1]] = val; };

// ---------- respaldo ----------
function respaldar() {
  const datos = { app: 'sgic2', version: 1, exportado: new Date().toISOString(), users: D.users, informes: D.informes };
  const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  a.download = 'respaldo-informes-' + fecha + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Respaldo descargado');
}
async function importar(file) {
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!d || !Array.isArray(d.users) || !Array.isArray(d.informes))
      throw new Error('El archivo no es un respaldo del sistema.');
    const usuariosOk = d.users.every((u) => u && typeof u.id === 'string' && typeof u.email === 'string' && ROLES[u.rol]);
    const informesOk = d.informes.every((i) => i && typeof i.id === 'string' && typeof i.alId === 'string' && i.int);
    if (!usuariosOk || !informesOk) throw new Error('El respaldo está incompleto o dañado.');
    if (!confirm(`Se reemplazan los datos actuales (${D.users.length} cuentas y ${D.informes.length} informes) por los del respaldo (${d.users.length} cuentas y ${d.informes.length} informes). ¿Continuar?`)) return;
    D.users = d.users; D.informes = d.informes; guardar();
    if (!Auth.actual()) { location.replace('login.html'); return; }
    toast('Respaldo restaurado');
    render();
  } catch (e) {
    alert('No se pudo restaurar el respaldo: ' + e.message);
  }
}

async function act(a, b) {
  const r = D.informes.find((x) => x.id === S.sel);
  switch (a) {
    case 'salir': Auth.logout(); return;
    case 'tab': S.v = b.dataset.v; S.nav = { mat: null, cur: null, al: null }; S.err = ''; break;
    case 'f': S.f = b.dataset.v; break;
    case 'ct': S.ct = b.dataset.v; S.err = ''; break;
    case 'open': {
      S.ret = { v: S.v, nav: { ...S.nav } }; S.sel = b.dataset.id; S.v = 'det';
      const x = D.informes.find((i) => i.id === b.dataset.id);
      if (R === 'ALUMNO' && x && x.alId === ME.id && !x.leidoEn) { x.leidoEn = new Date().toISOString(); guardar(); } // acuse de recibo
      break;
    }
    case 'back': if (S.ret) { S.v = S.ret.v; S.nav = S.ret.nav; } else S.v = 'lista'; break;
    case 'nav': { const n = b.dataset.n; if (n === 'mat0') S.nav = { mat: null, cur: null, al: null }; else if (n === 'cur0') S.nav = { ...S.nav, cur: null, al: null }; else if (n === 'al0') S.nav.al = null; break; }
    case 'pick': pick(b.dataset.k, b.dataset.v); break;
    case 'est': r.estado = b.value; guardar(); toast('Estado actualizado'); break;
    case 'int': r.int[b.dataset.k] = $(`[data-t=${b.dataset.k}]`).value; guardar(); toast('Intervención guardada'); break;
    case 'pdf': try { print(); } catch (e) { /* sin impresión */ } toast('En el diálogo de impresión elegí «Guardar como PDF»'); return;
    case 'delI': if (!confirm('¿Eliminar este informe? No se puede deshacer.')) return; D.informes = D.informes.filter((x) => x.id !== r.id); guardar(); S.v = S.ret ? S.ret.v : 'lista'; if (S.ret) S.nav = S.ret.nav; toast('Informe eliminado'); break;
    case 'crearI': {
      const al = usuario($('#ial') && $('#ial').value), hecho = ($('#ihe').value || '').trim();
      if (!al) { toast('Elegí un alumno'); return; }
      if (!hecho) { toast('Describí el hecho antes de guardar'); return; }
      const x = { id: nextId(), alId: al.id, alNombre: al.nombre, alCurso: al.curso, autorId: ME.id, autorNombre: ME.nombre, autorRol: R, cat: $('#ica').value, ts: $('#its').value, hecho, estado: 'ACTIVO', int: { AUTOR: '', REGENTE: '' } };
      D.informes.push(x); guardar(); toast('Informe guardado');
      if (S.v === 'nuevo') { S.sel = x.id; S.ret = { v: 'lista', nav: { ...S.nav } }; S.v = 'det'; }
      break;
    }
    case 'addasig': S.fp.asig.push({ materia: '', cursos: [] }); break;
    case 'delasig': S.fp.asig.splice(+b.dataset.i, 1); break;
    case 'crearP': case 'crearA': {
      const prof = a === 'crearP', f = prof ? S.fp : S.fa;
      try {
        const u = await Auth.crear(prof ? { nombre: f.nombre, email: f.email, password: f.pass, rol: 'PROFESOR', asign: f.asig } : { nombre: f.nombre, email: f.email, password: f.pass, rol: 'ALUMNO', curso: f.curso, dni: f.dni });
        if (prof) S.fp = { nombre: '', email: '', pass: '', asig: [{ materia: '', cursos: [] }] }; else S.fa = { nombre: '', email: '', pass: '', dni: '', curso: '' };
        S.err = ''; toast(`Cuenta creada: ${u.email}`);
      } catch (e) { S.err = e.message; }
      break;
    }
    case 'delU': {
      const u = usuario(b.dataset.id);
      if (!u || !confirm(u.rol === 'ALUMNO' ? `¿Eliminar a ${u.nombre}? Se borran también sus informes.` : `¿Eliminar la cuenta de ${u.nombre}?`)) return;
      D.users = D.users.filter((x) => x.id !== u.id);
      if (u.rol === 'ALUMNO') D.informes = D.informes.filter((i) => i.alId !== u.id);
      guardar(); toast('Cuenta eliminada'); break;
    }
    case 'undemo': {
      const ids = new Set(D.users.filter((u) => u.demo).map((u) => u.id));
      if (!ids.size || !confirm('¿Eliminar todos los datos de ejemplo? Se borran las cuentas de ejemplo con sus informes. Lo que cargaste a mano se conserva.')) return;
      D.informes = D.informes.filter((i) => !ids.has(i.alId) && !ids.has(i.autorId));
      D.users = D.users.filter((u) => !ids.has(u.id)); guardar(); toast('Datos de ejemplo eliminados'); break;
    }
    case 'demo': try { await demo(); toast('Datos de ejemplo cargados. Contraseña de todas las cuentas: demo12345'); } catch (e) { toast(e.message); } break;
    case 'backup': respaldar(); return;
    case 'restaurar': $('#fres').click(); return;
    default: return;
  }
  render();
  if (['tab', 'open', 'back', 'nav', 'pick', 'delI', 'crearI', 'ct'].includes(a)) window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b && b.tagName !== 'SELECT') act(b.dataset.a, b); });
document.addEventListener('change', (e) => {
  const b = e.target;
  if (b.type === 'file' && b.id === 'fres') { importar(b.files[0]); b.value = ''; return; }
  if (b.tagName === 'SELECT' && b.dataset.a) { act(b.dataset.a, b); return; }
  if (b.dataset.k && b.type === 'checkbox') {
    const arr = b.dataset.k.split('.').reduce((o, p) => o[p], S);
    const c = b.dataset.c, i = arr.indexOf(c);
    if (b.checked && i < 0) arr.push(c); else if (!b.checked && i >= 0) arr.splice(i, 1);
  } else if (b.dataset.k && b.tagName === 'SELECT') setPath(S, b.dataset.k, b.value);
});
document.addEventListener('input', (e) => { const b = e.target; if (b.dataset.k && b.type !== 'checkbox' && b.tagName !== 'SELECT') setPath(S, b.dataset.k, b.value); });
// Si otra pestaña modifica los datos, recargamos para no pisarlos.
window.addEventListener('storage', (e) => { if (e.key === LS) location.reload(); });
render();
})();
