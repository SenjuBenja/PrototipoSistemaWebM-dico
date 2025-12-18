"use strict";

/* ========================
   CONFIG API
   ======================== */
const API_BASE = "https://localhost:7179/api";
const INFORMES_ENDPOINT = "/informes";

/* ========================
   Helpers sesión / fetch
   ======================== */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function readSession() {
  try {
    return JSON.parse(localStorage.getItem("session") || "null");
  } catch {
    return null;
  }
}

// Obligar a tener sesión en esta página
function requireAuth() {
  const s = readSession();
  if (!s || !s.user) {
    localStorage.removeItem("session");
    window.location.replace("../index.html");
    return null;
  }
  return s;
}

function authHeaders() {
  const h = { Accept: "application/json" };
  const s = readSession();
  const token =
    s?.token ||
    s?.accessToken ||
    s?.user?.token ||
    s?.auth?.token;

  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function http(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...authHeaders(),
      ...(options && options.headers),
    },
    credentials: "include",
    ...options,
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    // puede venir vacío
  }

  if (!res.ok) {
    const msg = body?.title || body?.message || res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return body;
}

function parseDateLoose(s) {
  if (!s) return null;
  const t = typeof s === "string" ? s.replace(" ", "T") : s;
  const d = new Date(t);
  return isNaN(d) ? null : d;
}

function fmtDate(s) {
  const d = parseDateLoose(s);
  if (!d) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ========================
   Estado
   ======================== */
const state = {
  informes: [],
  selected: null,
};

/* ========================
   Referencias DOM
   ======================== */
const viewList   = $("#view-list");
const viewDetail = $("#view-detail");

const listWrapper = $("#listWrapper");
const emptyList   = $("#emptyList");
const listLoading = $("#listLoading");
const listError   = $("#listError");

// Filtros
const fPaciente  = $("#fPaciente");
const fFecha     = $("#fFecha");
const btnBuscar  = $("#btnBuscar");
const btnLimpiar = $("#btnLimpiar");

// Detalle
const dTitulo    = $("#dTitulo");
const dPaciente  = $("#dPaciente");
const dFecha     = $("#dFecha");
const dModalidad = $("#dModalidad");
const dMotivo    = $("#dMotivo");
const dDesc      = $("#dDescripcion");

/* ========================
   Init
   ======================== */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  // 🔐 Verificar sesión primero
  const s = requireAuth();
  if (!s) return;

  // Usuario arriba a la derecha
  const userLabel = $("#userName");
  if (userLabel && s.user) {
    userLabel.textContent = `${s.user.nombre} ${s.user.apellido}`;
  }

  // 🔹 Cerrar sesión
  const btnLogout = $("#btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("session");
      window.location.replace("../index.html");
    });
  }

  // Botones "Cerrar / Volver" en la vista detalle
  $$("[data-action='backToList']").forEach(btn =>
    btn.addEventListener("click", () => show("list"))
  );

  // Imprimir
  const btnPrint = $("[data-action='print']");
  if (btnPrint) {
    btnPrint.addEventListener("click", () => window.print());
  }

  // 🔴 Eliminar informe
  const btnDelete = $("[data-action='delete']");
  if (btnDelete) {
    btnDelete.addEventListener("click", handleDeleteInforme);
  }

  // Buscar
  if (btnBuscar) {
    btnBuscar.addEventListener("click", () => {
      const pac = fPaciente?.value.trim() || "";
      const fec = fFecha?.value || "";
      loadInformes({ paciente: pac, fecha: fec });
    });
  }

  // Limpiar filtros
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      if (fPaciente) fPaciente.value = "";
      if (fFecha) fFecha.value = "";
      loadInformes(); // sin filtros = todos
    });
  }

  // Enter en el campo paciente dispara búsqueda
  if (fPaciente) {
    fPaciente.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        btnBuscar?.click();
      }
    });
  }

  // Cargar datos iniciales (todos los informes)
  await loadInformes();
}

/* ========================
   Eliminar informe
   ======================== */
async function handleDeleteInforme() {
  if (!state.selected) {
    alert("No hay informe seleccionado.");
    return;
  }

  const id = state.selected.informeId;
  const ok = confirm("¿Seguro que deseas eliminar este informe?");
  if (!ok) return;

  try {
    await http(`${INFORMES_ENDPOINT}/${id}`, { method: "DELETE" });

    // Volver a la lista y recargar
    state.selected = null;
    await loadInformes();
    show("list");
  } catch (err) {
    alert("Error eliminando informe: " + (err.message || err));
  }
}

/* ========================
   Carga de informes
   ======================== */
// filters: { paciente?: string, fecha?: "YYYY-MM-DD" }
async function loadInformes(filters) {
  try {
    listError.classList.add("hidden");
    listLoading.classList.remove("hidden");

    let path = INFORMES_ENDPOINT;

    // Si hay filtros, usamos /informes/search
    if (filters && (filters.paciente || filters.fecha)) {
      const qs = new URLSearchParams();
      if (filters.paciente) qs.append("paciente", filters.paciente);

      if (filters.fecha) {
        // backend espera date-time -> YYYY-MM-DDTHH:mm:ss
        const fechaIso = `${filters.fecha}T00:00:00`;
        qs.append("fecha", fechaIso);
      }

      path = `${INFORMES_ENDPOINT}/search?${qs.toString()}`;
    }

    const raw = await http(path);

    state.informes = Array.isArray(raw)
      ? raw
      : raw?.items || raw?.result || raw?.data || raw?.value || [];

    renderList();
  } catch (err) {
    listError.textContent = "Error cargando informes: " + (err.message || err);
    listError.classList.remove("hidden");
    state.informes = [];
    renderList();
  } finally {
    listLoading.classList.add("hidden");
  }
}

/* ========================
   Helpers de mapeo
   ======================== */
function getPacienteNombre(inf) {
  // 1) objeto Paciente directo
  if (inf.paciente && (inf.paciente.pacienteNombre || inf.paciente.pacienteApellido)) {
    return `${inf.paciente.pacienteNombre ?? ""} ${inf.paciente.pacienteApellido ?? ""}`.trim();
  }
  if (inf.paciente && (inf.paciente.nombre || inf.paciente.apellido)) {
    return `${inf.paciente.nombre ?? ""} ${inf.paciente.apellido ?? ""}`.trim();
  }

  // 2) a través de la cita
  const c = inf.cita || {};
  if (c.paciente && (c.paciente.pacienteNombre || c.paciente.pacienteApellido)) {
    return `${c.paciente.pacienteNombre ?? ""} ${c.paciente.pacienteApellido ?? ""}`.trim();
  }
  if (c.pacienteNombre || c.pacienteApellido) {
    return `${c.pacienteNombre ?? ""} ${c.pacienteApellido ?? ""}`.trim();
  }

  // 3) otros nombres posibles
  if (inf.pacienteNombre || inf.pacienteApellido) {
    return `${inf.pacienteNombre ?? ""} ${inf.pacienteApellido ?? ""}`.trim();
  }
  if (typeof inf.paciente === "string") return inf.paciente.trim();

  // fallback
  return "Paciente";
}

function getCitaModalidad(inf) {
  const c = inf.cita || {};
  return c.citaModalidad || c.modalidad || "—";
}

function getCitaMotivo(inf) {
  const c = inf.cita || {};
  return c.citaMotivo || c.motivo || "Informe médico";
}

function getFechaInforme(inf) {
  const c = inf.cita || {};
  return fmtDate(inf.informeFecha || c.citaFecha);
}

/* ========================
   Render lista
   ======================== */
function renderList() {
  if (!state.informes.length) {
    listWrapper.innerHTML = "";
    emptyList.classList.remove("hidden");
    return;
  }
  emptyList.classList.add("hidden");

  const html = state.informes.map(inf => {
    const titulo   = getCitaMotivo(inf);
    const paciente = getPacienteNombre(inf);
    const fecha    = getFechaInforme(inf);
    const modal    = getCitaModalidad(inf);

    return `
      <article class="report-item" data-id="${inf.informeId}">
        <div class="report-main">
          <div class="report-icon">📄</div>
          <div>
            <h3 class="report-title">${titulo}</h3>
            <p class="report-patient">${paciente}</p>
            <p class="report-meta">
              ${fecha}
              &nbsp;•&nbsp;
              <span class="badge">${modal}</span>
            </p>
          </div>
        </div>
        <div class="report-actions">
          <button class="report-eye" data-action="ver" title="Ver informe">👁️</button>
        </div>
      </article>
    `;
  }).join("");

  listWrapper.innerHTML = html;

  // click en "ver"
  $$(".report-item").forEach(card => {
    const btn = card.querySelector("[data-action='ver']");
    if (!btn) return;
    btn.addEventListener("click", () => openDetail(card.dataset.id));
  });
}

/* ========================
   Detalle
   ======================== */
function openDetail(id) {
  const inf = state.informes.find(x => String(x.informeId) === String(id));
  if (!inf) return;

  const titulo   = getCitaMotivo(inf);
  const paciente = getPacienteNombre(inf);
  const fecha    = getFechaInforme(inf);
  const modal    = getCitaModalidad(inf);
  const c        = inf.cita || {};

  dTitulo.textContent    = titulo;
  dPaciente.textContent  = paciente;
  dFecha.textContent     = fecha;
  dModalidad.textContent = modal;
  dMotivo.textContent    = c.citaMotivo || "—";
  dDesc.textContent      = inf.informeDescripcion || "";

  state.selected = inf;
  show("detail");
}

/* ========================
   Cambio de vista
   ======================== */
function show(which) {
  viewList.classList.toggle("hidden", which !== "list");
  viewDetail.classList.toggle("hidden", which !== "detail");
}
