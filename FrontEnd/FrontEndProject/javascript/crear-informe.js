"use strict";

/* ===== CONFIG ===== */
const API_BASE = "https://localhost:7179/api";

const EP = {
  SEMANA : "/citas/semana",   // GET /citas/semana?desde=YYYY-MM-DDTHH:mm:ss
  SEARCH : "/citas/search",   // GET /citas/search?paciente=Benj
  REPORTS: "/informes"        // GET/POST informes
};

/* ===== HELPERS ===== */
const $   = id => document.getElementById(id);
const iso = d  => d.toISOString().slice(0,10);

function readSession(){
  try { return JSON.parse(localStorage.getItem("session") || "null"); }
  catch { return null; }
}

function authHeaders(json = true){
  const h = { Accept: "application/json" };
  if (json) h["Content-Type"] = "application/json";
  const s = readSession();
  const t = s?.token || s?.accessToken || s?.user?.token || s?.auth?.token;
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

async function http(path, opts = {}){
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: authHeaders(!opts.noJson),
    ...opts
  });
  let body = null;
  try { body = await res.json(); } catch {}
  if (!res.ok) throw new Error(body?.title || body?.message || res.statusText);
  return body ?? {};
}

/* ===== NORMALIZAR CITA SEGÚN TU JSON ===== */
function normCita(c){
  // puede venir plano o con objeto Paciente/paciente
  const p = c.paciente || c.Paciente || {};

  const nombre   = c.pacienteNombre   ?? p.pacienteNombre   ?? "";
  const apellido = c.pacienteApellido ?? p.pacienteApellido ?? "";
  const cedula   = c.pacienteCedula   ?? p.pacienteCedula   ?? "";

  return {
    id:      c.citaId,
    fecha:   c.citaFecha,
    paciente:`${nombre} ${apellido}`.trim() || "Paciente",
    cedula,
    modalidad: c.citaModalidad ?? ""
  };
}

/* ===== ESTADO ===== */
const state = {
  citasSemana: [],  // citas de la semana (base)
  citas: [],        // listado actual mostrado (semana o búsqueda)
  selected: null
};

/* ===== UI ===== */
function showError(msg){
  const b = $("boxError");
  if (!b) return;
  b.textContent = msg;
  b.classList.remove("hidden");
}
function hideError(){
  $("boxError")?.classList.add("hidden");
}

function renderCitas(list = state.citas){
  const sel = $("repCita");
  if (!sel) return;

  sel.innerHTML =
    `<option value="">Seleccionar cita (paciente • modalidad • fecha)</option>` +
    list.map(c => `
      <option value="${c.id}">
        ${c.paciente}${c.cedula ? ` • ${c.cedula}` : ""} • ${c.modalidad || "—"} • ${new Date(c.fecha).toLocaleDateString()} (${new Date(c.fecha).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})})
      </option>
    `).join("");

  if (!list.length){
    sel.innerHTML += `<option disabled>(no hay citas para mostrar)</option>`;
  }
}

/* ===== DATA: citas de la semana ===== */
async function loadCitasSemana(){
  hideError();
  try{
    const nowIso = new Date().toISOString();
    const raw = await http(`${EP.SEMANA}?desde=${encodeURIComponent(nowIso)}`);

    const arr = Array.isArray(raw) ? raw : (raw.citas || []);

    state.citasSemana = arr.map(normCita)
                           .sort((a,b) => new Date(a.fecha) - new Date(b.fecha));

    state.citas = state.citasSemana;
    renderCitas();
  }catch(err){
    showError(err.message || "No se pudieron cargar las citas de la semana.");
    state.citasSemana = [];
    state.citas = [];
    renderCitas([]);
  }
}

/* ===== DATA: búsqueda por nombre de paciente ===== */
let searchTimer = null;

function scheduleSearchCitas(term){
  // si está vacío, volvemos a las citas de la semana
  if (!term.trim()){
    state.citas = state.citasSemana;
    renderCitas();
    return;
  }

  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => searchCitas(term.trim()), 300);
}

async function searchCitas(term){
  try{
    hideError();
    const raw = await http(`${EP.SEARCH}?paciente=${encodeURIComponent(term)}`);
    const arr = Array.isArray(raw) ? raw : (raw.citas || raw.items || []);
    state.citas = arr.map(normCita)
                     .sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
    renderCitas();
  }catch(err){
    showError(err.message || "No se pudieron buscar las citas.");
    // en error, no vaciamos las de la semana para no dejar el select muerto
  }
}

/* ===== SAVE ===== */
async function guardarInforme(e){
  e.preventDefault();
  try{
    hideError();

    if(!$("repCita").value)
      return showError("Selecciona una cita.");

    if(!$("repDescripcion").value.trim())
      return showError("La descripción es obligatoria.");

    // Fecha/hora del informe SIEMPRE = ahora
    const nowIso = new Date().toISOString();

    const body = {
      citaId: Number($("repCita").value),
      informeFecha: nowIso,
      informeDescripcion: $("repDescripcion").value.trim()
    };

    await http(EP.REPORTS, {
      method: "POST",
      body: JSON.stringify(body)
    });

    window.location.href = "../pages/informes.html";
  }catch(err){
    showError(err.message || "No se pudo guardar el informe.");
  }
}

/* ===== BOOTSTRAP ===== */
document.addEventListener("DOMContentLoaded", () => {
  // Sesión
  const s = readSession();
  if (!s?.loggedIn || !s?.user){
    window.location.href = "../index.html";
    return;
  }
  $("userName").textContent = `${s.user.nombre} ${s.user.apellido}`;
  $("btnLogout").onclick = ()=>{ localStorage.removeItem("session"); window.location.href="../index.html"; };

  // Fecha del informe = hoy (solo muestra, el backend recibe nowIso)
  const repFecha = $("repFecha");
  if (repFecha) {
    repFecha.value = iso(new Date());
    repFecha.disabled = true;
  }

  // Buscar cita por nombre
  const qCita = $("qCita");
  if (qCita){
    // Al hacer focus, aseguramos que se muestren las citas de la semana
    qCita.addEventListener("focus", () => {
      state.citas = state.citasSemana;
      renderCitas();
    });

    // Al escribir, buscamos por nombre (paciente)
    qCita.addEventListener("input", (e) => {
      scheduleSearchCitas(e.target.value);
    });
  }

  $("frmReport").addEventListener("submit", guardarInforme);

  // Cargar citas de la semana (base)
  loadCitasSemana().catch(err => showError(err.message));
});
