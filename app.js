(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const vista = $("#vista"), hoja = $("#hoja"), aviso = $("#aviso"), fab = $("#fab");
  const KEY = "bcom:v1";
  const COLORES = ["#7A2E2E", "#2F4F6B", "#3B5B3C", "#8A6A2E", "#4B3A5E", "#2E5A5A", "#8C4A2F", "#3A3F4D", "#6B2F54", "#44502A"];
  const GENEROS = ["Novela", "Cuento", "Poesía", "Ensayo", "Historia", "Biografía", "Ciencia", "Infantil", "Juvenil", "Texto escolar", "Referencia", "Otro"];
  const CONFIG0 = {
    nombre: "Biblioteca comunitaria", dias: 14, maxLibros: 3, pais: "", ultimoRespaldo: "",
    mensaje: 'Hola {socio}, te escribimos de {biblioteca}. El libro "{libro}" debía regresar el {fecha}. ¿Puedes devolverlo cuando puedas? ¡Gracias!'
  };
  let D = { config: { ...CONFIG0 }, libros: [], socios: [], prestamos: [], borrados: {} };
  let modoImport = "sincronizar";
  const ui = { filtro: "todos", q: "", qs: "", modo: "estante", orden: "reciente" };

  // ---------- Datos ----------
  function cargar() {
    try {
      const j = JSON.parse(localStorage.getItem(KEY) || "null");
      if (j) D = { config: { ...CONFIG0, ...(j.config || {}) }, libros: j.libros || [], socios: j.socios || [], prestamos: j.prestamos || [], borrados: j.borrados || {} };
    } catch (_) {}
  }
  function guardar() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (_) { toast("No se pudo guardar en este navegador"); } }
  const tocar = (o) => { o.u = Date.now(); return o; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const hoy = () => new Date().toISOString().slice(0, 10);
  const mas = (n, desde) => { const d = new Date((desde || hoy()) + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const fecha = (s) => s ? new Date(s + "T12:00:00").toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }) : "";
  const libroPor = (id) => D.libros.find((l) => l.id === id);
  const socioPor = (id) => D.socios.find((s) => s.id === id);
  const activos = () => D.prestamos.filter((p) => !p.devuelto);
  const activosDe = (campo, id) => activos().filter((p) => p[campo] === id);
  const disp = (l) => Math.max(0, (l.copias || 1) - activosDe("libroId", l.id).length);
  const vencido = (p) => !p.devuelto && p.hasta && p.hasta < hoy();
  const tituloDe = (p) => (libroPor(p.libroId) || {}).titulo || p.libro || "Libro eliminado";
  const socioDe = (p) => (socioPor(p.socioId) || {}).nombre || p.socio || "Socio eliminado";
  const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

  function ejemplos() {
    const mk = (titulo, autor, genero, copias, paginas) => ({ id: uid(), titulo, autor, genero, copias, paginas, notas: "", color: hash(titulo) % COLORES.length, creado: Date.now(), u: Date.now() });
    const L = [
      mk("Pedro Páramo", "Juan Rulfo", "Novela", 2, 128), mk("Ficciones", "Jorge Luis Borges", "Cuento", 1, 224),
      mk("Cien años de soledad", "Gabriel García Márquez", "Novela", 2, 471), mk("El principito", "Antoine de Saint-Exupéry", "Infantil", 3, 96),
      mk("Como agua para chocolate", "Laura Esquivel", "Novela", 1, 246), mk("El laberinto de la soledad", "Octavio Paz", "Ensayo", 1, 190),
      mk("La casa de los espíritus", "Isabel Allende", "Novela", 1, 433), mk("Diccionario escolar", "Varios autores", "Referencia", 2, 700)
    ];
    const S = ["Ana Torres", "Marcos Ruiz", "Lucía Hernández"].map((n, i) => ({ id: uid(), nombre: n, telefono: ["", "5551234567", ""][i], notas: "", alta: hoy(), u: Date.now() }));
    const pr = (li, si, d, h) => ({ id: uid(), libroId: L[li].id, socioId: S[si].id, libro: L[li].titulo, socio: S[si].nombre, desde: mas(d), hasta: mas(h), devuelto: null, u: Date.now() });
    D.libros.push(...L); D.socios.push(...S);
    D.prestamos.push(pr(4, 0, -25, -11), pr(0, 1, -4, 10), pr(3, 2, -2, 12));
    D.prestamos.push({ ...pr(2, 0, -40, -26), devuelto: mas(-27) });
    guardar();
  }

  // ---------- Utilidades ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const toast = (m) => { aviso.textContent = m; aviso.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => aviso.classList.remove("on"), 2400); };
  function waLink(p) {
    const s = socioPor(p.socioId); if (!s || !s.telefono) return "";
    let n = s.telefono.replace(/\D/g, ""); const cc = (D.config.pais || "").replace(/\D/g, "");
    if (!n) return ""; if (cc && n.length <= 10) n = cc + n;
    const msg = D.config.mensaje.replace(/{socio}/g, s.nombre.split(" ")[0]).replace(/{biblioteca}/g, D.config.nombre).replace(/{libro}/g, tituloDe(p)).replace(/{fecha}/g, fecha(p.hasta));
    return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
  }

  function encabezado() {
    $("#nombre").textContent = D.config.nombre || "Biblioteca comunitaria";
    document.title = D.config.nombre || "Biblioteca comunitaria";
    const a = activos().length, v = activos().filter(vencido).length;
    $("#resumen").textContent = D.libros.length ? `${D.libros.length} títulos · ${D.socios.length} socios · ${a} en préstamo` : "Empieza agregando tus libros y socios";
    $("#vencidos").hidden = !v; $("#vencidos").textContent = v;
  }

  // ---------- Inicio (préstamos) ----------
  function filaPrestamo(p) {
    const wa = vencido(p) ? waLink(p) : "";
    return `<div class="prestamo"><div><h3>${esc(tituloDe(p))}</h3>
      <p><strong>${esc(socioDe(p))}</strong> · desde ${fecha(p.desde)}</p>
      <p class="${vencido(p) ? "tarde" : ""}">${p.hasta ? (vencido(p) ? "Debía volver el " : "Devolución: ") + fecha(p.hasta) : "Sin fecha de devolución"}</p></div>
      <div class="btns"><button class="btn chico principal" data-devolver="${p.id}">Devolver</button>
      <button class="btn chico" data-renovar="${p.id}">Renovar</button>
      ${wa ? `<a class="btn chico" href="${wa}" target="_blank" rel="noopener">Avisar</a>` : ""}</div></div>`;
  }

  function inicio() {
    if (!D.libros.length && !D.socios.length) {
      vista.innerHTML = `<div class="vacio"><h2>Bienvenida a tu biblioteca</h2>
        <p>Registra tus libros y a las personas que los piden prestados. Todo se guarda en este dispositivo y funciona sin internet.</p>
        <div class="acciones"><button class="btn principal" data-nuevo-libro>Agregar un libro</button><button class="btn" data-nuevo-socio>Registrar un socio</button><button class="btn" data-ejemplos>Ver con ejemplos</button></div></div>`;
      return;
    }
    const act = activos(), ven = act.filter(vencido).sort((a, b) => a.hasta.localeCompare(b.hasta));
    const ok = act.filter((p) => !vencido(p)).sort((a, b) => (a.hasta || "9").localeCompare(b.hasta || "9"));
    const libres = D.libros.reduce((n, l) => n + disp(l), 0);
    const ref = [D.config.ultimoRespaldo, D.config.ultimaSync].filter(Boolean).sort().pop();
    const dias = ref ? Math.floor((Date.now() - new Date(ref)) / 864e5) : null;
    const nudge = (dias === null || dias > 14) && (D.libros.length + D.socios.length) > 0
      ? `<div class="aviso-respaldo">${dias === null ? "Aún no has hecho una copia ni sincronizado." : `Tu última copia o sincronización fue hace ${dias} días.`} <button class="link" data-exportar style="all:unset;cursor:pointer;color:var(--acento);text-decoration:underline;font-weight:600">Exportar ahora</button></div>` : "";
    vista.innerHTML = `${nudge}
      <div class="tira"><div><strong>${D.libros.length}</strong><span>títulos</span></div><div><strong>${libres}</strong><span>disponibles</span></div><div><strong>${act.length}</strong><span>prestados</span></div><div class="${ven.length ? "rojo" : ""}"><strong>${ven.length}</strong><span>vencidos</span></div></div>
      <button class="btn principal" data-nuevo-prestamo style="width:100%">Nuevo préstamo</button>
      ${ven.length ? `<h2 class="seccion">Vencidos</h2>${ven.map(filaPrestamo).join("")}` : ""}
      <h2 class="seccion">${ven.length ? "En préstamo" : "Prestados ahora"}</h2>
      ${ok.length ? ok.map(filaPrestamo).join("") : `<p class="info">${ven.length ? "No hay más préstamos vigentes." : "No hay libros prestados. Todo está en el estante."}</p>`}`;
  }

  // ---------- Libros ----------
  function librosFiltrados() {
    const q = norm(ui.q.trim());
    return D.libros.filter((l) => (ui.filtro === "todos" || (ui.filtro === "disponibles" ? disp(l) > 0 : disp(l) < (l.copias || 1))) &&
      (!q || norm(`${l.titulo} ${l.autor} ${l.genero} ${l.notas}`).includes(q)));
  }
  function libros() {
    if (!D.libros.length) { vista.innerHTML = `<div class="vacio"><h2>Aún no hay libros</h2><p>Agrega el primero con el botón dorado.</p><div class="acciones"><button class="btn principal" data-nuevo-libro>Agregar libro</button></div></div>`; return; }
    vista.innerHTML = `<input id="q" class="buscar" type="search" placeholder="Buscar por título, autor o género…" value="${esc(ui.q)}" aria-label="Buscar libros">
      <div style="height:10px"></div>
      <div class="chips" role="group" aria-label="Filtrar">${[["todos", "Todos"], ["disponibles", "Disponibles"], ["prestados", "Con préstamos"]].map(([id, n]) => `<button class="chip" data-filtro="${id}" aria-pressed="${ui.filtro === id}">${n}</button>`).join("")}</div>
      <div class="herramientas"><span id="n" class="info" style="margin:0"></span>
      <div class="seg" role="group" aria-label="Vista"><button data-modo="estante" aria-pressed="${ui.modo === "estante"}">Estante</button><button data-modo="fichas" aria-pressed="${ui.modo === "fichas"}">Fichas</button></div></div>
      <div id="res"></div>`;
    pintarLibros();
    $("#q").addEventListener("input", (e) => { ui.q = e.target.value; pintarLibros(); });
  }
  function pintarLibros() {
    const r = librosFiltrados();
    $("#n").textContent = `${r.length} ${r.length === 1 ? "título" : "títulos"}`;
    if (!r.length) { $("#res").innerHTML = `<div class="vacio"><h2>Sin resultados</h2><p>Prueba otra búsqueda o filtro.</p></div>`; return; }
    if (ui.modo === "estante") {
      const lista = r.slice().sort((a, b) => norm(a.autor).localeCompare(norm(b.autor)));
      $("#res").innerHTML = `<div class="estante">${lista.map((l) => {
        const p = Math.min(Math.max(l.paginas || 120 + (hash(l.titulo) % 380), 80), 800);
        const w = 30 + Math.round((p - 80) / 720 * 26), h = Math.min(196, 138 + Math.round((p - 80) / 720 * 52) + (l.titulo.length % 5) * 4);
        const fuera = disp(l) < (l.copias || 1);
        return `<div class="slot"><button class="lomo ${fuera ? "prestado" : ""}" style="--w:${w}px;--h:${h}px;--c:${COLORES[(l.color ?? 0) % COLORES.length]}" data-libro="${l.id}" aria-label="${esc(l.titulo)}, ${esc(l.autor)}. ${disp(l)} disponibles">${fuera ? "<i></i>" : ""}<span>${esc(l.titulo)}</span></button></div>`;
      }).join("")}</div><p class="leyenda">Ordenados por autor. El punto dorado indica que hay ejemplares prestados.</p>`;
    } else {
      const lista = r.slice().sort((a, b) => norm(a.titulo).localeCompare(norm(b.titulo)));
      $("#res").innerHTML = `<ul class="fichas">${lista.map((l) => `<li><button class="ficha" data-libro="${l.id}"><h2>${esc(l.titulo)}</h2>
        <div class="aut">${esc(l.autor || "Autor desconocido")}${l.genero ? " · " + esc(l.genero) : ""}</div>
        <div class="pie"><span class="estado ${disp(l) ? "leido" : ""}">${disp(l)} de ${l.copias || 1} disponibles</span></div></button></li>`).join("")}</ul>`;
    }
  }

  // ---------- Socios ----------
  function socios() {
    if (!D.socios.length) { vista.innerHTML = `<div class="vacio"><h2>Aún no hay socios</h2><p>Registra a quienes piden libros prestados.</p><div class="acciones"><button class="btn principal" data-nuevo-socio>Registrar socio</button></div></div>`; return; }
    vista.innerHTML = `<input id="qs" class="buscar" type="search" placeholder="Buscar socio por nombre o teléfono…" value="${esc(ui.qs)}" aria-label="Buscar socios"><div id="res" style="margin-top:8px"></div>`;
    pintarSocios();
    $("#qs").addEventListener("input", (e) => { ui.qs = e.target.value; pintarSocios(); });
  }
  function pintarSocios() {
    const q = norm(ui.qs.trim());
    const r = D.socios.filter((s) => !q || norm(`${s.nombre} ${s.telefono}`).includes(q)).sort((a, b) => norm(a.nombre).localeCompare(norm(b.nombre)));
    $("#res").innerHTML = r.length ? r.map((s) => {
      const a = activosDe("socioId", s.id), v = a.filter(vencido).length;
      return `<button class="item" data-socio="${s.id}"><div><h3>${esc(s.nombre)}</h3><p>${esc(s.telefono || "Sin teléfono")}</p></div>
        <span class="insignia ${v ? "rojo" : ""}">${v ? `${v} vencido${v > 1 ? "s" : ""}` : a.length ? `${a.length} prestado${a.length > 1 ? "s" : ""}` : "Sin préstamos"}</span></button>`;
    }).join("") : `<div class="vacio"><h2>Sin resultados</h2></div>`;
  }

  // ---------- Informe ----------
  function informe() {
    if (!D.prestamos.length) { vista.innerHTML = `<div class="vacio"><h2>Todavía no hay movimientos</h2><p>Cuando registres préstamos, aquí verás estadísticas e historial.</p></div>`; return; }
    const meses = []; const base = new Date(); base.setDate(1);
    for (let i = 5; i >= 0; i--) { const d = new Date(base.getFullYear(), base.getMonth() - i, 1); meses.push({ k: d.toISOString().slice(0, 7), n: d.toLocaleDateString("es", { month: "short" }), c: 0 }); }
    D.prestamos.forEach((p) => { const m = meses.find((x) => x.k === (p.desde || "").slice(0, 7)); if (m) m.c++; });
    const max = Math.max(1, ...meses.map((m) => m.c));
    const cuenta = (campo, nombre) => { const o = {}; D.prestamos.forEach((p) => { const k = nombre(p); o[k] = (o[k] || 0) + 1; }); return Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 5); };
    const topL = cuenta("libroId", tituloDe), topS = cuenta("socioId", socioDe);
    const ev = [];
    D.prestamos.forEach((p) => { ev.push({ f: p.desde, t: "Préstamo", p }); if (p.devuelto) ev.push({ f: p.devuelto, t: "Devolución", p }); });
    ev.sort((a, b) => b.f.localeCompare(a.f));
    vista.innerHTML = `<h2 class="seccion">Préstamos por mes</h2>
      <div class="barras">${meses.map((m) => `<div><span>${m.c}</span><i style="height:${(m.c / max) * 78}%"></i></div>`).join("")}</div>
      <div class="etq-mes">${meses.map((m) => `<span>${m.n}</span>`).join("")}</div>
      <h2 class="seccion">Libros más prestados</h2><ul class="top-lista">${topL.map(([n, c]) => `<li><span>${esc(n)}</span><b>${c}</b></li>`).join("")}</ul>
      <h2 class="seccion">Socios más activos</h2><ul class="top-lista">${topS.map(([n, c]) => `<li><span>${esc(n)}</span><b>${c}</b></li>`).join("")}</ul>
      <h2 class="seccion">Movimientos recientes</h2>${ev.slice(0, 30).map((e) => `<div class="mov"><small>${fecha(e.f)}</small><div><strong>${e.t}:</strong> ${esc(tituloDe(e.p))}<br><small>${esc(socioDe(e.p))}</small></div></div>`).join("")}`;
  }

  // ---------- Más (ajustes y respaldo) ----------
  function ajustes() {
    const c = D.config;
    const puedeCompartir = !!(navigator.canShare && navigator.canShare({ files: [new File(["{}"], "a.json", { type: "application/json" })] }));
    vista.innerHTML = `<h2 class="seccion">Tu biblioteca</h2>
      <form id="fc" autocomplete="off">
        <label class="campo"><span>Nombre</span><input name="nombre" maxlength="60" value="${esc(c.nombre)}"></label>
        <div class="fila"><label class="campo"><span>Días de préstamo</span><input name="dias" type="number" min="1" max="365" value="${c.dias}" inputmode="numeric"></label>
        <label class="campo"><span>Máx. libros por socio</span><input name="maxLibros" type="number" min="1" max="50" value="${c.maxLibros}" inputmode="numeric"></label></div>
        <label class="campo"><span>Código de país para WhatsApp (solo números, ej. 52)</span><input name="pais" maxlength="4" value="${esc(c.pais)}" inputmode="numeric"></label>
        <label class="campo"><span>Mensaje de aviso. Usa {socio}, {libro}, {fecha} y {biblioteca}</span><textarea name="mensaje" rows="4" maxlength="400">${esc(c.mensaje)}</textarea></label>
        <button class="btn principal" type="submit">Guardar ajustes</button></form>
      <h2 class="seccion">Sincronizar laptop y teléfono</h2>
      <p class="info">Cada dispositivo guarda sus propios datos. Para que ambos queden iguales:</p>
      <ol class="info" style="padding-left:20px;margin-top:0">
        <li>En un dispositivo toca <strong>${puedeCompartir ? "Enviar copia" : "Exportar copia"}</strong>.</li>
        <li>Pasa el archivo al otro (WhatsApp, correo o la nube).</li>
        <li>En el otro toca <strong>Sincronizar con archivo</strong>.</li>
      </ol>
      <p class="info">La app junta ambos lados y conserva el cambio más reciente de cada libro, socio y préstamo, incluidas devoluciones y borrados. Haz esto cada vez que cambies de dispositivo.</p>
      <div class="acciones" style="margin-top:0">${puedeCompartir ? `<button class="btn principal" data-compartir>Enviar copia</button>` : ""}<button class="btn ${puedeCompartir ? "" : "principal"}" data-exportar>Exportar copia</button><button class="btn principal" data-importar="sincronizar">Sincronizar con archivo</button></div>
      <p class="info" style="margin-top:12px">${c.ultimaSync ? `Última sincronización: ${fecha(c.ultimaSync.slice(0, 10))}. ` : "Aún no has sincronizado. "}${c.ultimoRespaldo ? `Última copia exportada: ${fecha(c.ultimoRespaldo.slice(0, 10))}.` : ""}</p>
      <details style="margin-top:8px"><summary>Restaurar una copia completa</summary><p class="info">Reemplaza todo lo que hay en este dispositivo por el contenido del archivo. Úsalo solo si quieres volver a una copia anterior o empezar en un dispositivo nuevo.</p><button class="btn peligro chico" data-importar="reemplazar">Restaurar (reemplaza todo)</button></details>
      <h2 class="seccion">Datos</h2>
      <div class="acciones" style="margin-top:0"><button class="btn" data-ejemplos>Agregar datos de ejemplo</button><button class="btn peligro" data-borrar-todo>Borrar todo</button></div>
      <p class="info" style="margin-top:22px">Funciona sin conexión. Se puede instalar desde el navegador.</p>`;
    $("#fc").addEventListener("submit", (e) => {
      e.preventDefault(); const f = new FormData(e.target);
      D.config = { ...D.config, nombre: f.get("nombre").trim() || CONFIG0.nombre, dias: +f.get("dias") || 14, maxLibros: +f.get("maxLibros") || 3, pais: f.get("pais").replace(/\D/g, ""), mensaje: f.get("mensaje").trim() || CONFIG0.mensaje, u: Date.now() };
      guardar(); encabezado(); toast("Ajustes guardados");
    });
  }

  // ---------- Diálogos ----------
  function abrirHoja(html, color) {
    hoja.style.setProperty("--c", color || "var(--verde)");
    hoja.innerHTML = `<div class="banda"></div><div class="cuerpo">${html}</div>`;
    if (!hoja.open) hoja.showModal();
  }
  const cerrar = () => hoja.open && hoja.close();
  const refrescar = () => { encabezado(); render(); };

  function detalleLibro(id) {
    const l = libroPor(id); if (!l) return;
    const act = activosDe("libroId", id), hist = D.prestamos.filter((p) => p.libroId === id).sort((a, b) => b.desde.localeCompare(a.desde)).slice(0, 5);
    abrirHoja(`<h2>${esc(l.titulo)}</h2><div class="aut">${esc(l.autor || "Autor desconocido")}</div>
      <div class="datos"><span class="estado ${disp(l) ? "leido" : ""}">${disp(l)} de ${l.copias || 1} disponibles</span>${l.genero ? `<span>${esc(l.genero)}</span>` : ""}${l.paginas ? `<span>${l.paginas} páginas</span>` : ""}</div>
      ${l.notas ? `<div class="nota">${esc(l.notas)}</div>` : ""}
      ${act.length ? `<h3 style="margin:16px 0 4px">Prestado a</h3>${act.map((p) => `<div class="prestamo"><div><strong>${esc(socioDe(p))}</strong><p class="${vencido(p) ? "tarde" : ""}">${vencido(p) ? "Vencido: " : "Hasta "}${fecha(p.hasta)}</p></div><button class="btn chico principal" data-devolver="${p.id}">Devolver</button></div>`).join("")}` : ""}
      ${hist.length ? `<h3 style="margin:16px 0 4px">Historial</h3>${hist.map((p) => `<div class="mov"><small>${fecha(p.desde)}</small><div>${esc(socioDe(p))}${p.devuelto ? `<br><small>devuelto ${fecha(p.devuelto)}</small>` : ""}</div></div>`).join("")}` : ""}
      <div class="acciones">${disp(l) ? `<button class="btn principal" data-prestar-libro="${id}">Prestar</button>` : ""}
      <button class="btn" data-editar-libro="${id}">Editar</button><button class="btn peligro" data-eliminar-libro="${id}">Eliminar</button><button class="btn" data-cerrar>Cerrar</button></div>`,
      COLORES[(l.color ?? 0) % COLORES.length]);
  }

  function detalleSocio(id) {
    const s = socioPor(id); if (!s) return;
    const act = activosDe("socioId", id), hist = D.prestamos.filter((p) => p.socioId === id && p.devuelto).sort((a, b) => b.devuelto.localeCompare(a.devuelto)).slice(0, 5);
    abrirHoja(`<h2>${esc(s.nombre)}</h2><div class="aut">${esc(s.telefono || "Sin teléfono")} · socio desde ${fecha(s.alta)}</div>
      ${s.notas ? `<div class="nota">${esc(s.notas)}</div>` : ""}
      <h3 style="margin:16px 0 4px">Préstamos actuales (${act.length} de ${D.config.maxLibros})</h3>
      ${act.length ? act.map((p) => `<div class="prestamo"><div><strong>${esc(tituloDe(p))}</strong><p class="${vencido(p) ? "tarde" : ""}">${vencido(p) ? "Vencido: " : "Hasta "}${fecha(p.hasta)}</p></div><div class="btns"><button class="btn chico principal" data-devolver="${p.id}">Devolver</button>${vencido(p) && waLink(p) ? `<a class="btn chico" href="${waLink(p)}" target="_blank" rel="noopener">Avisar</a>` : ""}</div></div>`).join("") : `<p class="info">No tiene libros prestados.</p>`}
      ${hist.length ? `<h3 style="margin:16px 0 4px">Devueltos recientemente</h3>${hist.map((p) => `<div class="mov"><small>${fecha(p.devuelto)}</small><div>${esc(tituloDe(p))}</div></div>`).join("")}` : ""}
      <div class="acciones"><button class="btn principal" data-prestar-socio="${id}">Prestar libro</button><button class="btn" data-editar-socio="${id}">Editar</button><button class="btn peligro" data-eliminar-socio="${id}">Eliminar</button><button class="btn" data-cerrar>Cerrar</button></div>`);
  }

  function formLibro(id) {
    const l = id ? libroPor(id) : { titulo: "", autor: "", genero: "Novela", copias: 1, paginas: "", notas: "", color: Math.floor(Math.random() * COLORES.length) };
    abrirHoja(`<h2>${id ? "Editar libro" : "Agregar libro"}</h2><form id="f" style="margin-top:14px" autocomplete="off">
      <label class="campo"><span>Título *</span><input name="titulo" required maxlength="140" value="${esc(l.titulo)}"></label>
      <label class="campo"><span>Autor</span><input name="autor" maxlength="100" value="${esc(l.autor)}"></label>
      <div class="fila"><label class="campo"><span>Género</span><select name="genero">${GENEROS.map((g) => `<option ${g === l.genero ? "selected" : ""}>${g}</option>`).join("")}</select></label>
      <label class="campo"><span>Ejemplares</span><input name="copias" type="number" min="1" max="99" value="${l.copias || 1}" inputmode="numeric"></label></div>
      <label class="campo"><span>Páginas (opcional)</span><input name="paginas" type="number" min="1" max="5000" value="${l.paginas || ""}" inputmode="numeric"></label>
      <label class="campo"><span>Notas</span><textarea name="notas" rows="2" maxlength="400">${esc(l.notas)}</textarea></label>
      <div class="campo"><span>Color del lomo</span><div id="colores">${COLORES.map((c, i) => `<button type="button" data-c="${i}" style="width:28px;height:28px;border-radius:50%;background:${c};border:${i === l.color ? "3px solid var(--laton)" : "2px solid transparent"};padding:0;margin-right:6px;cursor:pointer" aria-label="Color ${i + 1}"></button>`).join("")}</div><input type="hidden" name="color" value="${l.color}"></div>
      <div class="acciones"><button class="btn principal" type="submit">Guardar</button><button class="btn" type="button" data-cerrar>Cancelar</button></div></form>`);
    const f = $("#f");
    f.addEventListener("click", (e) => { const c = e.target.closest("[data-c]"); if (c) { f.elements.color.value = c.dataset.c; f.querySelectorAll("[data-c]").forEach((b) => (b.style.border = b.dataset.c === c.dataset.c ? "3px solid var(--laton)" : "2px solid transparent")); } });
    f.addEventListener("submit", (e) => {
      e.preventDefault(); const d = new FormData(f);
      const datos = { titulo: d.get("titulo").trim(), autor: d.get("autor").trim(), genero: d.get("genero"), copias: Math.max(1, +d.get("copias") || 1), paginas: +d.get("paginas") || 0, notas: d.get("notas").trim(), color: +d.get("color") };
      if (!datos.titulo) return;
      if (id) {
        const out = activosDe("libroId", id).length;
        if (datos.copias < out) return toast(`Hay ${out} ejemplares prestados; no puedes bajar de ${out}`);
        tocar(Object.assign(libroPor(id), datos));
      } else D.libros.push({ id: uid(), creado: Date.now(), u: Date.now(), ...datos });
      guardar(); cerrar(); refrescar(); toast(id ? "Cambios guardados" : "Libro agregado");
    });
    setTimeout(() => f.elements.titulo.focus(), 50);
  }

  function formSocio(id) {
    const s = id ? socioPor(id) : { nombre: "", telefono: "", notas: "" };
    abrirHoja(`<h2>${id ? "Editar socio" : "Registrar socio"}</h2><form id="f" style="margin-top:14px" autocomplete="off">
      <label class="campo"><span>Nombre *</span><input name="nombre" required maxlength="80" value="${esc(s.nombre)}"></label>
      <label class="campo"><span>Teléfono (para avisos por WhatsApp)</span><input name="telefono" type="tel" maxlength="20" value="${esc(s.telefono)}" inputmode="tel"></label>
      <label class="campo"><span>Notas</span><textarea name="notas" rows="2" maxlength="300">${esc(s.notas)}</textarea></label>
      <div class="acciones"><button class="btn principal" type="submit">Guardar</button><button class="btn" type="button" data-cerrar>Cancelar</button></div></form>`);
    const f = $("#f");
    f.addEventListener("submit", (e) => {
      e.preventDefault(); const d = new FormData(f);
      const datos = { nombre: d.get("nombre").trim(), telefono: d.get("telefono").trim(), notas: d.get("notas").trim() };
      if (!datos.nombre) return;
      if (id) tocar(Object.assign(socioPor(id), datos)); else D.socios.push({ id: uid(), alta: hoy(), u: Date.now(), ...datos });
      guardar(); cerrar(); refrescar(); toast(id ? "Cambios guardados" : "Socio registrado");
    });
    setTimeout(() => f.elements.nombre.focus(), 50);
  }

  function formPrestamo(pre = {}) {
    if (!D.socios.length) return abrirHoja(`<h2>Nuevo préstamo</h2><p class="info">Primero registra a un socio.</p><div class="acciones"><button class="btn principal" data-nuevo-socio>Registrar socio</button><button class="btn" data-cerrar>Cerrar</button></div>`);
    if (!D.libros.some((l) => disp(l) > 0)) return abrirHoja(`<h2>Nuevo préstamo</h2><p class="info">No hay ejemplares disponibles para prestar.</p><div class="acciones"><button class="btn principal" data-nuevo-libro>Agregar libro</button><button class="btn" data-cerrar>Cerrar</button></div>`);
    abrirHoja(`<h2>Nuevo préstamo</h2><form id="fp" style="margin-top:12px" autocomplete="off">
      <div class="campo"><span>Socio *</span><input id="fs" type="search" placeholder="Buscar socio…" class="buscar"><select name="socio" id="ss" class="lista-sel" size="4" required></select></div>
      <div class="campo"><span>Libro *</span><input id="fl" type="search" placeholder="Buscar título o autor…" class="buscar"><select name="libro" id="sl" class="lista-sel" size="4" required></select></div>
      <label class="campo"><span>Fecha de devolución</span><input name="hasta" type="date" value="${mas(D.config.dias)}"></label>
      <div class="acciones"><button class="btn principal" type="submit">Registrar préstamo</button><button class="btn" type="button" data-cerrar>Cancelar</button></div></form>`);
    const ss = $("#ss"), sl = $("#sl");
    const llenar = (sel, items, sel0) => { sel.innerHTML = items.map((o) => `<option value="${o.id}" ${o.id === sel0 ? "selected" : ""}>${esc(o.t)}</option>`).join(""); if (!sel.value && items.length === 1) sel.value = items[0].id; };
    const socs = () => { const q = norm($("#fs").value); return D.socios.filter((s) => !q || norm(s.nombre).includes(q)).sort((a, b) => norm(a.nombre).localeCompare(norm(b.nombre))).map((s) => ({ id: s.id, t: s.nombre })); };
    const libs = () => { const q = norm($("#fl").value); return D.libros.filter((l) => disp(l) > 0 && (!q || norm(l.titulo + " " + l.autor).includes(q))).sort((a, b) => norm(a.titulo).localeCompare(norm(b.titulo))).map((l) => ({ id: l.id, t: `${l.titulo}${l.autor ? " — " + l.autor : ""} (${disp(l)} disp.)` })); };
    llenar(ss, socs(), pre.socioId); llenar(sl, libs(), pre.libroId);
    $("#fs").addEventListener("input", () => llenar(ss, socs(), ss.value));
    $("#fl").addEventListener("input", () => llenar(sl, libs(), sl.value));
    $("#fp").addEventListener("submit", (e) => {
      e.preventDefault(); const d = new FormData(e.target);
      const s = socioPor(d.get("socio")), l = libroPor(d.get("libro"));
      if (!s || !l) return toast("Elige un socio y un libro de las listas");
      if (disp(l) < 1) return toast("Ya no hay ejemplares disponibles");
      const n = activosDe("socioId", s.id).length;
      if (n >= D.config.maxLibros && !confirm(`${s.nombre} ya tiene ${n} libro(s) (límite: ${D.config.maxLibros}). ¿Prestar de todos modos?`)) return;
      D.prestamos.push({ id: uid(), libroId: l.id, socioId: s.id, libro: l.titulo, socio: s.nombre, desde: hoy(), hasta: d.get("hasta") || "", devuelto: null, u: Date.now() });
      guardar(); cerrar(); refrescar(); toast(`Prestado a ${s.nombre}`);
    });
  }

  // ---------- Copia y sincronización ----------
  const paquete = () => new Blob([JSON.stringify({ app: "biblioteca-comunitaria", version: 3, ...D }, null, 2)], { type: "application/json" });
  const nombreArchivo = () => `biblioteca-${hoy()}.json`;
  function exportar() {
    D.config.ultimoRespaldo = new Date().toISOString(); guardar();
    const a = document.createElement("a"); a.href = URL.createObjectURL(paquete()); a.download = nombreArchivo(); a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000); render(); toast("Copia exportada");
  }
  async function compartir() {
    D.config.ultimoRespaldo = new Date().toISOString(); guardar();
    const file = new File([paquete()], nombreArchivo(), { type: "application/json" });
    try { await navigator.share({ files: [file], title: `Copia de ${D.config.nombre}` }); render(); }
    catch (err) { if (err && err.name === "AbortError") return; exportar(); }
  }

  // Junta los datos del archivo con los locales: gana el cambio más reciente de cada registro.
  function fusionar(R) {
    const r = { nuevos: 0, actualizados: 0, quitados: 0 };
    const bor = { ...D.borrados };
    Object.entries(R.borrados || {}).forEach(([id, t]) => { if (!(bor[id] >= t)) bor[id] = t; });
    ["libros", "socios", "prestamos"].forEach((k) => {
      const local = new Map(D[k].map((x) => [x.id, x])), m = new Map(local);
      (R[k] || []).forEach((x) => {
        if (!x || !x.id) return;
        const l = m.get(x.id);
        if (!l) m.set(x.id, x);
        else if ((x.u || 0) > (l.u || 0)) m.set(x.id, x);
      });
      const out = [];
      m.forEach((x, id) => {
        const t = bor[id];
        if (t && t > (x.u || 0)) { if (local.has(id)) r.quitados++; return; }
        const l = local.get(id);
        if (!l) r.nuevos++; else if (l !== x) r.actualizados++;
        out.push(x);
      });
      D[k] = out;
    });
    D.borrados = bor;
    if (R.config && (R.config.u || 0) > (D.config.u || 0)) {
      D.config = { ...CONFIG0, ...R.config, ultimoRespaldo: D.config.ultimoRespaldo, ultimaSync: D.config.ultimaSync };
    }
    return r;
  }

  $("#archivo").addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try {
      const R = JSON.parse(await f.text());
      if (!Array.isArray(R.libros) || !Array.isArray(R.socios) || !Array.isArray(R.prestamos)) throw 0;
      if (modoImport === "reemplazar") {
        if (!confirm("Esto reemplaza TODO lo que hay en este dispositivo por el contenido del archivo. ¿Continuar?")) return;
        D = { config: { ...CONFIG0, ...(R.config || {}) }, libros: R.libros, socios: R.socios, prestamos: R.prestamos, borrados: R.borrados || {} };
        D.config.ultimaSync = new Date().toISOString(); guardar(); refrescar(); toast("Copia restaurada"); return;
      }
      const r = fusionar(R);
      D.config.ultimaSync = new Date().toISOString(); guardar(); refrescar();
      const partes = [r.nuevos && `${r.nuevos} nuevos`, r.actualizados && `${r.actualizados} actualizados`, r.quitados && `${r.quitados} eliminados`].filter(Boolean);
      toast(partes.length ? `Sincronizado: ${partes.join(", ")}` : "Ya estaba todo al día");
    } catch (_) { toast("El archivo no es una copia válida"); }
  });

  // ---------- Eventos ----------
  const SEL = "[data-libro],[data-socio],[data-nuevo-libro],[data-nuevo-socio],[data-nuevo-prestamo],[data-filtro],[data-modo],[data-cerrar],[data-ejemplos],[data-devolver],[data-renovar],[data-prestar-libro],[data-prestar-socio],[data-editar-libro],[data-editar-socio],[data-eliminar-libro],[data-eliminar-socio],[data-exportar],[data-compartir],[data-importar],[data-borrar-todo]";
  document.addEventListener("click", (e) => {
    const t = e.target.closest(SEL); if (!t) return; const d = t.dataset, has = (a) => t.hasAttribute(a);
    if (d.libro) detalleLibro(d.libro);
    else if (d.socio) detalleSocio(d.socio);
    else if (has("data-nuevo-libro")) formLibro();
    else if (has("data-nuevo-socio")) formSocio();
    else if (has("data-nuevo-prestamo")) formPrestamo();
    else if (d.filtro) { ui.filtro = d.filtro; render(); }
    else if (d.modo) { ui.modo = d.modo; render(); }
    else if (has("data-cerrar")) cerrar();
    else if (has("data-ejemplos")) { ejemplos(); refrescar(); toast("Datos de ejemplo agregados"); }
    else if (d.devolver) { const p = D.prestamos.find((x) => x.id === d.devolver); p.devuelto = hoy(); tocar(p); guardar(); cerrar(); refrescar(); toast("Libro devuelto"); }
    else if (d.renovar) { const p = D.prestamos.find((x) => x.id === d.renovar); p.hasta = mas(D.config.dias, p.hasta && p.hasta > hoy() ? p.hasta : hoy()); p.renovaciones = (p.renovaciones || 0) + 1; tocar(p); guardar(); refrescar(); toast(`Renovado hasta el ${fecha(p.hasta)}`); }
    else if (d.prestarLibro) formPrestamo({ libroId: d.prestarLibro });
    else if (d.prestarSocio) formPrestamo({ socioId: d.prestarSocio });
    else if (d.editarLibro) formLibro(d.editarLibro);
    else if (d.editarSocio) formSocio(d.editarSocio);
    else if (d.eliminarLibro) { const l = libroPor(d.eliminarLibro); if (activosDe("libroId", l.id).length) return toast("Tiene ejemplares prestados. Registra la devolución primero."); if (confirm(`¿Eliminar "${l.titulo}"? El historial de préstamos se conserva.`)) { D.libros = D.libros.filter((x) => x.id !== l.id); D.borrados[l.id] = Date.now(); guardar(); cerrar(); refrescar(); toast("Libro eliminado"); } }
    else if (d.eliminarSocio) { const s = socioPor(d.eliminarSocio); if (activosDe("socioId", s.id).length) return toast("Tiene libros prestados. Registra la devolución primero."); if (confirm(`¿Eliminar a ${s.nombre}? El historial de préstamos se conserva.`)) { D.socios = D.socios.filter((x) => x.id !== s.id); D.borrados[s.id] = Date.now(); guardar(); cerrar(); refrescar(); toast("Socio eliminado"); } }
    else if (has("data-exportar")) exportar();
    else if (has("data-compartir")) compartir();
    else if (has("data-importar")) { modoImport = d.importar || "sincronizar"; $("#archivo").click(); }
    else if (has("data-borrar-todo")) { if (confirm("Se borrarán todos los libros, socios y préstamos de este dispositivo. ¿Continuar?") && confirm("Esta acción no se puede deshacer. ¿Seguro?")) { const t = Date.now(); [...D.libros, ...D.socios, ...D.prestamos].forEach((x) => (D.borrados[x.id] = t)); D = { config: { ...D.config }, libros: [], socios: [], prestamos: [], borrados: D.borrados }; guardar(); refrescar(); toast("Biblioteca vaciada"); } }
  });
  hoja.addEventListener("click", (e) => { if (e.target === hoja) cerrar(); });

  // ---------- Router ----------
  const TABS = { inicio, libros, socios, informe, mas: ajustes };
  const FAB = { inicio: ["Nuevo préstamo", formPrestamo], libros: ["Agregar libro", () => formLibro()], socios: ["Registrar socio", () => formSocio()] };
  let tabActual = "inicio";
  function render() {
    const h = (location.hash.replace("#/", "") || "inicio").split("/")[0];
    tabActual = TABS[h] ? h : "inicio";
    document.querySelectorAll(".tabs a").forEach((a) => a.dataset.tab === tabActual ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    fab.hidden = !FAB[tabActual]; if (FAB[tabActual]) fab.setAttribute("aria-label", FAB[tabActual][0]);
    TABS[tabActual]();
  }
  fab.addEventListener("click", () => FAB[tabActual] && FAB[tabActual][1]());
  addEventListener("hashchange", () => { render(); scrollTo(0, 0); });

  // ---------- Instalación y service worker ----------
  let dif = null;
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); dif = e; $("#instalar").hidden = false; });
  $("#instalar").addEventListener("click", async () => { if (!dif) return; dif.prompt(); await dif.userChoice; dif = null; $("#instalar").hidden = true; });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
  // Pide al navegador que no borre los datos si hay poco espacio.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  cargar(); encabezado(); render();
})();
