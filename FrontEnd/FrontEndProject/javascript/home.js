// /pages/js/home.js
"use strict";

/* ===== CONFIG =====
   Cambia solo el host/puerto si tu API es otro.
   Usa el mismo protocolo que la página para evitar mixed content.
*/
const API_BASE = "https://localhost:7179/api";

/* ===== Helpers de DOM ===== */
const $ = (id) => document.getElementById(id);

function toLocal(dtIso) {
  try {
    const d = new Date(dtIso);
    return isNaN(d) ? String(dtIso ?? "") : d.toLocaleString();
  } catch { return String(dtIso ?? ""); }
}

/* ===== Sesión y Auth ===== */
function readSession() {
  const raw = localStorage.getItem("session");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Devuelve headers de autenticación si existen (JWT) y añade Accept
function authHeaders() {
  const h = { "Accept": "application/json" };
  const s = readSession();
  // Soportar varias formas de guardar el token
  const token =
    s?.token ||
    s?.accessToken ||
    s?.user?.token ||
    s?.auth?.token;
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

/* ===== HTTP wrapper =====
   - Incluye credenciales (cookies) por si usas cookie auth.
   - Añade Authorization si hay token en localStorage.
*/
async function http(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",          // si NO usas cookie, puedes quitarlo
    headers: { ...authHeaders(), ...(opts.headers || {}) },
    ...opts,
  });

  let body = null;
  try { body = await res.json(); } catch { /* puede ser 204 o error sin json */ }

  if (!res.ok) {
    const msg = body?.title || body?.message || body?.error || res.statusText || "Error";
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${msg}`);
  }
  return body;
}

/* ===== UI: estado de carga/errores ===== */
function setKpiLoading() {
  $("kpiSemana").textContent    = "Cargando…";
  $("kpiCitas").textContent     = "—";
  $("kpiInformes").textContent  = "—";
  $("kpiPacientes").textContent = "—";
  const ul = $("listCitas");
  if (ul) ul.innerHTML = `<li><span class="muted">Cargando…</span></li>`;
  const boxError = $("boxError");
  if (boxError) { boxError.classList.add("hidden"); boxError.textContent = ""; }
}

function showError(err) {
  console.error("[Dashboard] Error:", err);
  $("kpiCitas").textContent     = "—";
  $("kpiInformes").textContent  = "—";
  $("kpiPacientes").textContent = "—";
  const ul = $("listCitas");
  if (ul) ul.innerHTML = `<li><span class="muted">No se pudo cargar el resumen.</span></li>`;
  const boxError = $("boxError");
  if (boxError) { boxError.classList.remove("hidden"); boxError.textContent = String(err?.message ?? err); }
}

/* ===== Inicializar sesión (bienvenida y logout) ===== */
function initSession() {
  const session = readSession();
  if (!session?.loggedIn || !session?.user) {
    window.location.replace = "../index.html";
    return;
  }


  const u = session.user;
  $("welcome").textContent   = `Bienvenido de nuevo, Dr(a). ${u.nombre} ${u.apellido}`;
  $("userShort").textContent = `${u.nombre} ${u.apellido}`;
  $("btnLogout").onclick = ()=>{ localStorage.removeItem("session"); window.location.href="../index.html"; };
}

/* ===== Cargar dashboard ===== */
async function loadDashboard() {
  setKpiLoading();

  try {
    // Llama a tu API
    const data = await http(`/dashboard/summary`);

    // DEBUG: ver exactamente lo que llega
    console.debug("[Dashboard] /dashboard/summary →", data);

    // Semana (robusto por si llega string en vez de ISO Date)
    const si = new Date(data.semanaInicio);
    const sf = new Date(data.semanaFin);
    const siTxt = isNaN(si) ? String(data.semanaInicio).slice(0,10) : si.toISOString().slice(0,10);
    const sfTxt = isNaN(sf) ? String(data.semanaFin).slice(0,10) : sf.toISOString().slice(0,10);
    $("kpiSemana").textContent = `Semana ${siTxt} a ${sfTxt}`;

    // KPIs
    $("kpiCitas").textContent     = data.citasSemana ?? 0;
    $("kpiInformes").textContent  = data.informesRecientes ?? 0;
    $("kpiPacientes").textContent = await getTotalPacientes();


    // Lista de citas
    const ul = $("listCitas");
    const citas = Array.isArray(data.citasSemanaTop) ? data.citasSemanaTop : [];
    if (!ul) return;

    if (!citas.length) {
      ul.innerHTML = `<li><span class="muted">Sin citas registradas en la semana</span></li>`;
    } else {
      ul.innerHTML = citas.map(c => `
        <li class="list-item">
          <div>
            <strong>${(c.pacienteNombre ?? "").trim()} ${(c.pacienteApellido ?? "").trim()}</strong>
            <div class="muted">${c.pacienteCedula ?? ""}</div>
          </div>
          <div>
            <span class="badge">${c.citaModalidad ?? "—"}</span>
            <div class="muted" style="text-align:right">${toLocal(c.citaFecha)}</div>
          </div>
        </li>
      `).join("");
    }
  } catch (err) {
    showError(err);
  }
}
async function getTotalPacientes() {
  try {
    const arr = await http(`/pacientes`);
    return Array.isArray(arr) ? arr.length : 0;
  } catch (e) {
    console.warn("No se pudo obtener total de pacientes:", e);
    return 0;
  }
}

/* ===== Bootstrap ===== */
document.addEventListener("DOMContentLoaded", () => {
  initSession();
  loadDashboard();
});
