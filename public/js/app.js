/* =========================================================
   Octagon Manager - Frontend (HTML + CSS + JavaScript puro)
   Toda la información viene de la API FastAPI (/api/...),
   que a su vez la lee/escribe en SQLite.
   ========================================================= */

const API = '/api';
const $ = (sel, el = document) => el.querySelector(sel);

const ESTILOS = ['Boxeo', 'Muay Thai', 'Kickboxing', 'Jiu-Jitsu', 'Lucha', 'Judo', 'Capoeira', 'Karate', 'Otro'];
const METODOS = ['KO/TKO', 'Sumisión', 'Decisión unánime', 'Decisión dividida', 'Empate', 'Sin resultado'];
const ESTADOS = ['Programado', 'Finalizado', 'Cancelado'];

/* ---------- Utilidades ---------- */

// Escapa texto para evitar inyección de HTML (XSS) al mostrar datos de la BD.
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function edad(iso) {
  const hoy = new Date(), n = new Date(iso);
  let e = hoy.getFullYear() - n.getFullYear();
  if (hoy < new Date(hoy.getFullYear(), n.getMonth(), n.getDate())) e--;
  return e;
}

let toastTimer;
function toast(msg, error = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show' + (error ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ''), 3200);
}

// Convierte el error devuelto por FastAPI en un texto legible.
function textoError(data, status) {
  if (!data || !data.detail) return `Error ${status}`;
  if (typeof data.detail === 'string') return data.detail;
  return data.detail.map((e) => {
    const campo = (e.loc || []).filter((x) => x !== 'body').join('.');
    const msg = String(e.msg || '').replace(/^Value error, /, '');
    return campo ? `${campo}: ${msg}` : msg;
  }).join(' · ');
}

// Función única para hablar con la API.
async function api(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(API + path, opts);
  } catch {
    throw new Error('No se pudo conectar con el servidor.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(textoError(data, res.status));
  return data;
}

/* ---------- Formularios en ventana modal ---------- */

function openForm({ title, fields, values = {}, onSubmit, setup }) {
  const form = $('#modal-form');
  const campo = (f) => {
    const v = values[f.name];
    const full = f.full ? ' full' : '';
    if (f.type === 'checkbox') {
      return `<label class="field check${full}"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}> ${esc(f.label)}</label>`;
    }
    let control;
    if (f.type === 'select') {
      const opts = f.options.map((o) => {
        const val = typeof o === 'object' ? o.value : o;
        const lbl = typeof o === 'object' ? o.label : o;
        return `<option value="${esc(val)}" ${String(v ?? '') === String(val) ? 'selected' : ''}>${esc(lbl)}</option>`;
      }).join('');
      control = `<select name="${f.name}">${opts}</select>`;
    } else {
      control = `<input name="${f.name}" type="${f.type || 'text'}" value="${esc(v ?? '')}"
        ${f.step ? `step="${f.step}"` : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}
        ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''}>`;
    }
    return `<label class="field${full}">${esc(f.label)}${f.required ? ' *' : ''}${control}</label>`;
  };

  form.innerHTML = `
    <div class="dlg-head"><h3>${esc(title)}</h3><button type="button" class="btn-ghost btn-sm" data-close>✕</button></div>
    <div class="dlg-body"><div class="fields">${fields.map(campo).join('')}<div class="form-error" id="form-error"></div></div></div>
    <div class="dlg-foot">
      <button type="button" class="btn-ghost" data-close>Cancelar</button>
      <button type="submit" class="btn-primary">Guardar</button>
    </div>`;

  // Lee los valores del formulario y los convierte al tipo correcto.
  const leer = () => {
    const data = {};
    for (const f of fields) {
      const el = form.elements[f.name];
      if (f.type === 'checkbox') data[f.name] = el.checked;
      else if (f.type === 'number' || f.num) data[f.name] = el.value === '' ? null : Number(el.value);
      else data[f.name] = el.value.trim() === '' ? (f.required ? '' : null) : el.value.trim();
    }
    return data;
  };

  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const err = $('#form-error');
    err.textContent = '';
    try {
      await onSubmit(leer());
      $('#modal').close();
    } catch (e) {
      err.textContent = e.message;
    }
  };
  form.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => $('#modal').close()));
  if (setup) setup(form);
  $('#modal').showModal();
}

function openInfo(html) {
  $('#info-body').innerHTML = `<div class="dlg-head"><h3>${html.title}</h3><button class="btn-ghost btn-sm" data-close>✕</button></div>
    <div class="dlg-body">${html.body}</div>`;
  $('#info-body').querySelector('[data-close]').onclick = () => $('#info').close();
  $('#info').showModal();
}

async function confirmarEliminar(mensaje, accion, recargar) {
  if (!confirm(mensaje)) return;
  try {
    await accion();
    toast('Registro eliminado correctamente.');
    recargar();
  } catch (e) {
    toast(e.message, true);
  }
}

/* ---------- Pantallas ---------- */

const view = () => $('#view');

function vacio(texto) { return `<div class="empty">${esc(texto)}</div>`; }

/* === Panel (dashboard) === */
async function renderDashboard() {
  const s = await api('GET', '/estadisticas');
  const max = (arr) => Math.max(1, ...arr.map((x) => x.total));
  const barras = (arr, key) => arr.length
    ? arr.map((x) => `<div class="bar-row"><span>${esc(x[key])}</span>
        <div class="bar"><span style="width:${(x.total / max(arr)) * 100}%"></span></div>
        <span class="n">${x.total}</span></div>`).join('')
    : vacio('Sin datos');

  const prox = s.proximo_evento;
  view().innerHTML = `
    <div class="page-head"><div><h2>Panel de control</h2><p>Resumen general de la promoción</p></div></div>
    <div class="grid stats">
      <div class="card stat"><div class="num">${s.total_peleadores}</div><div class="lbl">Peleadores</div></div>
      <div class="card stat"><div class="num">${s.total_eventos}</div><div class="lbl">Eventos</div></div>
      <div class="card stat"><div class="num">${s.total_peleas}</div><div class="lbl">Peleas</div></div>
      <div class="card stat"><div class="num">${s.peleas_disputadas}</div><div class="lbl">Peleas disputadas</div></div>
    </div>
    <div class="grid two" style="margin-top:1rem">
      <div class="card">
        <h3>Próximo evento</h3>
        ${prox ? `<div style="font-size:1.3rem;font-weight:700">${esc(prox.nombre)}</div>
          <div class="sub">${fmtFecha(prox.fecha)} · ${esc(prox.sede)}, ${esc(prox.ciudad)} (${esc(prox.pais)})</div>
          <p><a href="#/eventos" class="btn btn-primary btn-sm" style="text-decoration:none;display:inline-block">Ver eventos</a></p>`
          : vacio('No hay eventos programados')}
      </div>
      <div class="card">
        <h3>Más victorias</h3>
        ${s.top_peleadores.length ? s.top_peleadores.map((p, i) => `
          <div class="rank"><span class="pos">${i + 1}</span>
            <div class="grow"><b>${esc(p.nombre)}</b><div class="sub">${esc(p.apodo ? `"${p.apodo}"` : '')}</div></div>
            <span class="badge gold">${p.victorias} V</span></div>`).join('') : vacio('Aún no hay resultados')}
      </div>
      <div class="card"><h3>Peleas por método de resultado</h3>${barras(s.por_metodo, 'metodo')}</div>
      <div class="card"><h3>Peleadores por categoría</h3>${barras(s.por_categoria, 'nombre')}</div>
    </div>`;
}

/* === Peleadores === */
async function renderPeleadores() {
  const categorias = await api('GET', '/categorias');
  view().innerHTML = `
    <div class="page-head">
      <div><h2>Peleadores</h2><p>Atletas registrados y su récord</p></div>
      <div class="toolbar">
        <input id="buscar" type="search" placeholder="Buscar nombre, apodo o país...">
        <select id="f-cat"><option value="">Todas las categorías</option>
          ${categorias.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('')}</select>
        <button class="btn-primary" id="nuevo">+ Nuevo peleador</button>
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Peleador</th><th>País</th><th>Categoría</th><th>Estilo</th><th>Récord (V-D-E)</th><th>Estado</th><th></th></tr></thead>
      <tbody id="tbody"></tbody></table></div>`;

  const cargar = async () => {
    const q = new URLSearchParams();
    if ($('#buscar').value.trim()) q.set('buscar', $('#buscar').value.trim());
    if ($('#f-cat').value) q.set('categoria_id', $('#f-cat').value);
    const filas = await api('GET', '/peleadores' + (q.toString() ? '?' + q : ''));
    $('#tbody').innerHTML = filas.length ? filas.map((p) => `
      <tr>
        <td><b>${esc(p.nombre)}</b><div class="sub">${p.apodo ? `"${esc(p.apodo)}" · ` : ''}${edad(p.fecha_nacimiento)} años${p.altura_cm ? ` · ${p.altura_cm} cm` : ''}</div></td>
        <td>${esc(p.pais)}</td>
        <td>${esc(p.categoria)}</td>
        <td>${esc(p.estilo)}</td>
        <td class="record"><b class="w">${p.victorias}</b>-<b class="l">${p.derrotas}</b>-<b class="d">${p.empates}</b></td>
        <td>${p.activo ? '<span class="badge green">Activo</span>' : '<span class="badge">Inactivo</span>'}</td>
        <td class="actions">
          <button class="btn-ghost btn-sm" data-act="historial" data-id="${p.id}">Historial</button>
          <button class="btn-ghost btn-sm" data-act="editar" data-id="${p.id}">Editar</button>
          <button class="btn-danger btn-sm" data-act="borrar" data-id="${p.id}" data-nombre="${esc(p.nombre)}">Eliminar</button>
        </td></tr>`).join('') : `<tr><td colspan="7">${vacio('No se encontraron peleadores')}</td></tr>`;
    return filas;
  };

  let datos = await cargar();
  const refrescar = async () => { datos = await cargar(); };
  $('#buscar').oninput = debounce(refrescar, 250);
  $('#f-cat').onchange = refrescar;

  const campos = () => [
    { name: 'nombre', label: 'Nombre completo', required: true, full: true },
    { name: 'apodo', label: 'Apodo' },
    { name: 'pais', label: 'País', required: true },
    { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date', required: true },
    { name: 'estilo', label: 'Estilo', type: 'select', options: ESTILOS, required: true },
    { name: 'categoria_id', label: 'Categoría de peso', type: 'select', num: true, required: true,
      options: categorias.map((c) => ({ value: c.id, label: c.nombre })) },
    { name: 'altura_cm', label: 'Altura (cm)', type: 'number', min: 120, max: 250 },
    { name: 'alcance_cm', label: 'Alcance (cm)', type: 'number', min: 120, max: 260 },
    { name: 'activo', label: 'Peleador activo', type: 'checkbox', full: true },
  ];

  $('#nuevo').onclick = () => {
    if (!categorias.length) return toast('Primero cree una categoría de peso.', true);
    openForm({
      title: 'Nuevo peleador', fields: campos(), values: { activo: true, estilo: ESTILOS[0], categoria_id: categorias[0].id },
      onSubmit: async (d) => { await api('POST', '/peleadores', d); toast('Peleador creado.'); await refrescar(); },
    });
  };

  $('#tbody').onclick = async (ev) => {
    const b = ev.target.closest('button[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    if (b.dataset.act === 'editar') {
      const p = datos.find((x) => x.id === id);
      openForm({
        title: 'Editar peleador', fields: campos(), values: p,
        onSubmit: async (d) => { await api('PUT', `/peleadores/${id}`, d); toast('Peleador actualizado.'); await refrescar(); },
      });
    } else if (b.dataset.act === 'borrar') {
      confirmarEliminar(`¿Eliminar a ${b.dataset.nombre}?`, () => api('DELETE', `/peleadores/${id}`), refrescar);
    } else if (b.dataset.act === 'historial') {
      const p = datos.find((x) => x.id === id);
      try {
        const h = await api('GET', `/peleadores/${id}/peleas`);
        const color = { Victoria: 'green', Derrota: 'red', Empate: '', Pendiente: 'blue' };
        openInfo({
          title: `Historial · ${esc(p.nombre)}`,
          body: h.length ? `<div class="table-wrap"><table><thead><tr><th>Evento</th><th>Rival</th><th>Resultado</th></tr></thead><tbody>
            ${h.map((x) => `<tr><td>${esc(x.evento)}<div class="sub">${fmtFecha(x.fecha)}</div></td><td>${esc(x.oponente)}</td>
              <td><span class="badge ${color[x.resultado]}">${x.resultado}</span>
              <div class="sub">${x.metodo ? esc(x.metodo) : ''}${x.round_final ? ` · R${x.round_final} ${esc(x.tiempo || '')}` : ''}</div></td></tr>`).join('')}
            </tbody></table></div>` : vacio('Este peleador aún no tiene peleas'),
        });
      } catch (e) { toast(e.message, true); }
    }
  };
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* === Eventos === */
async function renderEventos() {
  view().innerHTML = `
    <div class="page-head">
      <div><h2>Eventos</h2><p>Carteleras de la promoción</p></div>
      <button class="btn-primary" id="nuevo">+ Nuevo evento</button>
    </div>
    <div class="grid cards" id="lista"></div>`;

  let datos = [];
  const cargar = async () => {
    datos = await api('GET', '/eventos');
    const color = { Programado: 'blue', Finalizado: 'green', Cancelado: 'red' };
    $('#lista').innerHTML = datos.length ? datos.map((e) => `
      <div class="card event">
        <span class="badge ${color[e.estado]}">${esc(e.estado)}</span>
        <h3 style="margin-top:.5rem">${esc(e.nombre)}</h3>
        <div class="meta">📅 ${fmtFecha(e.fecha)}<br>📍 ${esc(e.sede)}, ${esc(e.ciudad)} (${esc(e.pais)})</div>
        <div class="sub">${e.total_peleas} pelea(s) en cartelera</div>
        <div class="foot">
          <button class="btn-primary btn-sm" data-act="cartelera" data-id="${e.id}">Ver cartelera</button>
          <button class="btn-ghost btn-sm" data-act="editar" data-id="${e.id}">Editar</button>
          <button class="btn-danger btn-sm" data-act="borrar" data-id="${e.id}" data-nombre="${esc(e.nombre)}">Eliminar</button>
        </div></div>`).join('') : vacio('No hay eventos registrados');
  };
  await cargar();

  const campos = [
    { name: 'nombre', label: 'Nombre del evento', required: true, full: true },
    { name: 'fecha', label: 'Fecha', type: 'date', required: true },
    { name: 'estado', label: 'Estado', type: 'select', options: ESTADOS },
    { name: 'sede', label: 'Sede / Arena', required: true },
    { name: 'ciudad', label: 'Ciudad', required: true },
    { name: 'pais', label: 'País', required: true, full: true },
  ];

  $('#nuevo').onclick = () => openForm({
    title: 'Nuevo evento', fields: campos, values: { estado: 'Programado', pais: 'Costa Rica' },
    onSubmit: async (d) => { await api('POST', '/eventos', d); toast('Evento creado.'); await cargar(); },
  });

  $('#lista').onclick = async (ev) => {
    const b = ev.target.closest('button[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    if (b.dataset.act === 'editar') {
      openForm({
        title: 'Editar evento', fields: campos, values: datos.find((x) => x.id === id),
        onSubmit: async (d) => { await api('PUT', `/eventos/${id}`, d); toast('Evento actualizado.'); await cargar(); },
      });
    } else if (b.dataset.act === 'borrar') {
      confirmarEliminar(`¿Eliminar "${b.dataset.nombre}"? También se eliminarán sus peleas.`,
        () => api('DELETE', `/eventos/${id}`), cargar);
    } else if (b.dataset.act === 'cartelera') {
      try {
        const e = datos.find((x) => x.id === id);
        const p = await api('GET', `/eventos/${id}/peleas`);
        openInfo({
          title: esc(e.nombre),
          body: p.length ? p.map((x) => `
            <div class="card" style="margin-bottom:.6rem">
              <div class="sub">${esc(x.categoria)} · ${x.rounds} rounds ${x.es_titulo ? '<span class="badge gold">TÍTULO</span>' : ''}</div>
              <div class="vs"><span class="corner-r ${x.ganador === x.rojo ? 'winner' : ''}">${esc(x.rojo)}</span><i>VS</i>
                <span class="corner-b ${x.ganador === x.azul ? 'winner' : ''}">${esc(x.azul)}</span></div>
              <div class="sub">${x.metodo ? `${esc(x.metodo)}${x.round_final ? ` · R${x.round_final} ${esc(x.tiempo || '')}` : ''}` : 'Pendiente'}</div>
            </div>`).join('') : vacio('Este evento aún no tiene peleas'),
        });
      } catch (err) { toast(err.message, true); }
    }
  };
}

/* === Peleas === */
async function renderPeleas() {
  const [eventos, peleadores, categorias] = await Promise.all([
    api('GET', '/eventos'), api('GET', '/peleadores'), api('GET', '/categorias'),
  ]);
  view().innerHTML = `
    <div class="page-head">
      <div><h2>Peleas</h2><p>Combates y resultados</p></div>
      <div class="toolbar">
        <select id="f-evento"><option value="">Todos los eventos</option>
          ${eventos.map((e) => `<option value="${e.id}">${esc(e.nombre)}</option>`).join('')}</select>
        <button class="btn-primary" id="nuevo">+ Nueva pelea</button>
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Evento</th><th>Categoría</th><th>Combate</th><th>Resultado</th><th></th></tr></thead>
      <tbody id="tbody"></tbody></table></div>`;

  let datos = [];
  const cargar = async () => {
    const ev = $('#f-evento').value;
    datos = await api('GET', '/peleas' + (ev ? `?evento_id=${ev}` : ''));
    $('#tbody').innerHTML = datos.length ? datos.map((p) => `
      <tr>
        <td>${esc(p.evento)}<div class="sub">${fmtFecha(p.fecha_evento)}</div></td>
        <td>${esc(p.categoria)}<div class="sub">${p.rounds} rounds ${p.es_titulo ? '<span class="badge gold">TÍTULO</span>' : ''}</div></td>
        <td><div class="vs"><span class="corner-r ${p.ganador_id === p.peleador_rojo_id ? 'winner' : ''}">${esc(p.rojo)}</span><i>VS</i>
          <span class="corner-b ${p.ganador_id === p.peleador_azul_id ? 'winner' : ''}">${esc(p.azul)}</span></div></td>
        <td>${p.metodo
          ? `<b>${p.ganador ? esc(p.ganador) : esc(p.metodo)}</b><div class="sub">${p.ganador ? esc(p.metodo) : ''}${p.round_final ? ` · R${p.round_final} ${esc(p.tiempo || '')}` : ''}</div>`
          : '<span class="badge blue">Pendiente</span>'}</td>
        <td class="actions">
          <button class="btn-ghost btn-sm" data-act="editar" data-id="${p.id}">Editar</button>
          <button class="btn-danger btn-sm" data-act="borrar" data-id="${p.id}">Eliminar</button>
        </td></tr>`).join('') : `<tr><td colspan="5">${vacio('No hay peleas registradas')}</td></tr>`;
  };
  await cargar();
  $('#f-evento').onchange = cargar;

  const opts = (arr, lbl = 'nombre') => arr.map((x) => ({ value: x.id, label: x[lbl] }));
  const campos = () => [
    { name: 'evento_id', label: 'Evento', type: 'select', num: true, required: true, full: true, options: opts(eventos) },
    { name: 'peleador_rojo_id', label: 'Esquina roja', type: 'select', num: true, required: true, options: opts(peleadores) },
    { name: 'peleador_azul_id', label: 'Esquina azul', type: 'select', num: true, required: true, options: opts(peleadores) },
    { name: 'categoria_id', label: 'Categoría', type: 'select', num: true, required: true, options: opts(categorias) },
    { name: 'rounds', label: 'Rounds', type: 'select', num: true, options: [3, 5] },
    { name: 'es_titulo', label: 'Pelea por el título', type: 'checkbox', full: true },
    { name: 'ganador_id', label: 'Ganador', type: 'select', num: true, options: [{ value: '', label: '— Sin resultado —' }] },
    { name: 'metodo', label: 'Método', type: 'select', options: [{ value: '', label: '—' }, ...METODOS] },
    { name: 'round_final', label: 'Round final', type: 'number', min: 1, max: 5 },
    { name: 'tiempo', label: 'Tiempo (m:ss)', placeholder: '3:41' },
  ];

  // El selector de ganador solo ofrece a los dos peleadores elegidos.
  const ligarGanador = (form) => {
    const rojo = form.elements.peleador_rojo_id, azul = form.elements.peleador_azul_id, gan = form.elements.ganador_id;
    const nombre = (id) => (peleadores.find((p) => p.id === Number(id)) || {}).nombre || '';
    const actualizar = () => {
      const previo = gan.value;
      gan.innerHTML = `<option value="">— Sin resultado —</option>
        <option value="${rojo.value}">${esc(nombre(rojo.value))} (rojo)</option>
        <option value="${azul.value}">${esc(nombre(azul.value))} (azul)</option>`;
      gan.value = [rojo.value, azul.value].includes(previo) ? previo : '';
    };
    const inicial = gan.dataset.inicial;
    rojo.onchange = azul.onchange = actualizar;
    actualizar();
    if (inicial) gan.value = inicial;
  };

  const abrir = (titulo, valores, enviar) => {
    if (peleadores.length < 2 || !eventos.length || !categorias.length) {
      return toast('Se necesitan al menos 2 peleadores, 1 evento y 1 categoría.', true);
    }
    openForm({
      title: titulo, fields: campos(), values: valores, onSubmit: enviar,
      setup: (form) => {
        form.elements.ganador_id.dataset.inicial = valores.ganador_id ?? '';
        ligarGanador(form);
      },
    });
  };

  $('#nuevo').onclick = () => abrir('Nueva pelea', {
    evento_id: eventos[0].id, peleador_rojo_id: peleadores[0].id, peleador_azul_id: peleadores[1].id,
    categoria_id: categorias[0].id, rounds: 3,
  }, async (d) => { await api('POST', '/peleas', d); toast('Pelea creada.'); await cargar(); });

  $('#tbody').onclick = (ev) => {
    const b = ev.target.closest('button[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    if (b.dataset.act === 'editar') {
      abrir('Editar pelea', datos.find((x) => x.id === id),
        async (d) => { await api('PUT', `/peleas/${id}`, d); toast('Pelea actualizada.'); await cargar(); });
    } else {
      confirmarEliminar('¿Eliminar esta pelea?', () => api('DELETE', `/peleas/${id}`), cargar);
    }
  };
}

/* === Categorías de peso === */
async function renderCategorias() {
  view().innerHTML = `
    <div class="page-head">
      <div><h2>Categorías de peso</h2><p>Divisiones de la promoción</p></div>
      <button class="btn-primary" id="nuevo">+ Nueva categoría</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Nombre</th><th>Límite (lb)</th><th>Límite (kg)</th><th></th></tr></thead>
      <tbody id="tbody"></tbody></table></div>`;

  let datos = [];
  const cargar = async () => {
    datos = await api('GET', '/categorias');
    $('#tbody').innerHTML = datos.length ? datos.map((c) => `
      <tr><td><b>${esc(c.nombre)}</b></td><td>${c.limite_lb}</td><td>${c.limite_kg}</td>
        <td class="actions">
          <button class="btn-ghost btn-sm" data-act="editar" data-id="${c.id}">Editar</button>
          <button class="btn-danger btn-sm" data-act="borrar" data-id="${c.id}" data-nombre="${esc(c.nombre)}">Eliminar</button>
        </td></tr>`).join('') : `<tr><td colspan="4">${vacio('No hay categorías')}</td></tr>`;
  };
  await cargar();

  const campos = [
    { name: 'nombre', label: 'Nombre', required: true, full: true },
    { name: 'limite_lb', label: 'Límite (lb)', type: 'number', step: '0.1', min: 1, required: true },
    { name: 'limite_kg', label: 'Límite (kg)', type: 'number', step: '0.1', min: 1, required: true },
  ];

  $('#nuevo').onclick = () => openForm({
    title: 'Nueva categoría', fields: campos,
    onSubmit: async (d) => { await api('POST', '/categorias', d); toast('Categoría creada.'); await cargar(); },
  });

  $('#tbody').onclick = (ev) => {
    const b = ev.target.closest('button[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    if (b.dataset.act === 'editar') {
      openForm({
        title: 'Editar categoría', fields: campos, values: datos.find((x) => x.id === id),
        onSubmit: async (d) => { await api('PUT', `/categorias/${id}`, d); toast('Categoría actualizada.'); await cargar(); },
      });
    } else {
      confirmarEliminar(`¿Eliminar "${b.dataset.nombre}"?`, () => api('DELETE', `/categorias/${id}`), cargar);
    }
  };
}

/* ---------- Navegación (por hash: #/peleadores, etc.) ---------- */

const rutas = {
  dashboard: renderDashboard, peleadores: renderPeleadores, eventos: renderEventos,
  peleas: renderPeleas, categorias: renderCategorias,
};

async function navegar() {
  const nombre = (location.hash.replace('#/', '') || 'dashboard');
  const ruta = rutas[nombre] ? nombre : 'dashboard';
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === ruta));
  view().innerHTML = '<div class="empty">Cargando…</div>';
  try {
    await rutas[ruta]();
  } catch (e) {
    view().innerHTML = `<div class="card"><h3>No se pudo cargar</h3><p>${esc(e.message)}</p></div>`;
  }
}

window.addEventListener('hashchange', navegar);
navegar();
