"use strict";

/* ===== CONFIG ===== */
const API_BASE = "https://localhost:7179/api";
const PACIENTES_ENDPOINT = "/pacientes"; // SIN params (traemos todo)
const CITAS_ENDPOINT     = "/citas";     // POST

/* ===== Helpers ===== */
const $ = (id)=>document.getElementById(id);

function readSession(){
  try{
    return JSON.parse(localStorage.getItem("session")||"null");
  }catch{
    return null;
  }
}

function authHeaders(){
  const h={"Accept":"application/json","Content-Type":"application/json"};
  const s=readSession();
  const token = s?.token || s?.accessToken || s?.user?.token || s?.auth?.token;
  if(token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function http(path, opts={}){
  const res = await fetch(`${API_BASE}${path}`, {
    credentials:"include",
    headers: authHeaders(),
    ...opts
  });
  let body=null;
  try{ body=await res.json(); }catch{}
  if(!res.ok) throw new Error(body?.title || body?.message || res.statusText);
  return body ?? {};
}

function showError(msg){
  const b=$("boxError");
  if(!b) return;
  b.textContent=msg;
  b.classList.remove("hidden");
}

function hideError(){
  $("boxError")?.classList.add("hidden");
}

/* ===== Utils Autocomplete ===== */
const norm = s => (s||"").toString()
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu,"")
  .toLowerCase();

function hi(text, q){ // resalta coincidencia
  if(!q) return text;
  const ntext = norm(text), nq = norm(q);
  const i = ntext.indexOf(nq);
  if(i<0) return text;
  const a=text.slice(0,i), b=text.slice(i,i+q.length), c=text.slice(i+q.length);
  return `${a}<mark>${b}</mark>${c}`;
}

/* ===== Estado ===== */
let selectedPaciente = null;
let debounceTimer = null;
let kbdIndex = -1;
let PAC_CACHE = [];   // [{id,name,doc}]

function setUserTopbar(){
  const s = readSession();
  if(!s?.loggedIn || !s?.user){
    window.location.href="../index.html";
    return;
  }
  $("userShort").textContent = `${s.user.nombre} ${s.user.apellido}`;
  $("btnLogout").onclick = ()=>{ localStorage.removeItem("session"); window.location.href="../index.html"; };
}

/* ===== Normalización con TUS campos ===== */
function normalizePacienteForSearch(p){
  const id  = p.pacienteId ?? p.id;

  const nombre   = p.pacienteNombre ?? p.nombres ?? p.nombre ?? "";
  const apellido = p.pacienteApellido ?? p.apellidos ?? p.apellido ?? "";
  const nomFull  = `${(nombre||"").trim()} ${(apellido||"").trim()}`.trim();

  const doc = p.pacienteCedula ?? p.cedula ?? p.documento ?? "";

  return { id, name: nomFull, doc };
}

/* ===== Cargar TODOS los pacientes (una vez) ===== */
async function loadPacientesAll(){
  try{
    const raw = await http(PACIENTES_ENDPOINT);
    const arr = Array.isArray(raw)
      ? raw
      : (raw?.items || raw?.result || raw?.data || raw?.value || []);
    PAC_CACHE = arr.map(normalizePacienteForSearch)
                   .filter(p => p.id != null)  // sólo válidos
                   .sort((a,b)=>a.name.localeCompare(b.name));
  }catch(err){
    showError("No se pudo cargar la lista de pacientes.");
    throw err;
  }
}

/* ===== Dropdown Pacientes ===== */
function renderDrop(list, q){
  const drop = $("dropPac");
  if(!drop) return;

  if(!list.length){
    drop.innerHTML = `<div class="muted" style="padding:10px">Sin resultados</div>`;
    drop.classList.add("show");
    kbdIndex = -1;
    return;
  }
  const top = list.slice(0,20);
  drop.innerHTML = top.map((p,idx)=>`
    <div class="item${idx===kbdIndex?" active":""}"
         data-idx="${idx}"
         data-id="${p.id}"
         data-name="${p.name}">
      <div class="title">${hi(p.name || "(Sin nombre)", q)}</div>
      <div class="sub">${p.doc ? hi(p.doc,q) : ""}</div>
    </div>
  `).join("");
  drop.classList.add("show");
}

function selectIndex(idx){
  const drop = $("dropPac");
  const item = drop.querySelector(`.item[data-idx="${idx}"]`);
  if(!item) return;

  selectedPaciente = {
    id: Number(item.dataset.id),
    name: item.dataset.name
  };

  $("qPaciente").value = selectedPaciente.name;
  $("selInfo").innerHTML =
    `<span class="pill">Paciente: <strong>${selectedPaciente.name}</strong></span>`;

  drop.classList.remove("show");
}

/* ===== Autocomplete (focus, input, teclado) ===== */
function openInitialList(){
  if(!PAC_CACHE.length) return;
  kbdIndex = -1;
  renderDrop(PAC_CACHE, "");
}

function onInputPaciente(e){
  selectedPaciente = null;
  $("selInfo").textContent = "Sin paciente seleccionado";

  const q = e.target.value.trim();
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(()=>{
    const nq = norm(q);
    const list = PAC_CACHE.filter(p =>
      !q ||
      norm(p.name).includes(nq) ||
      norm(p.doc).includes(nq)
    );
    kbdIndex = -1;
    renderDrop(list, q);
  }, 120);
}

function onKeyNav(e){
  const drop = $("dropPac");
  if(!drop.classList.contains("show")) return;
  const items = [...drop.querySelectorAll(".item")];
  if(!items.length) return;

  const current = items.map((it)=>({
    id: Number(it.dataset.id),
    name: it.dataset.name,
    doc: it.querySelector(".sub")?.textContent || ""
  }));
  const q = $("qPaciente").value.trim();

  if(e.key==="ArrowDown"){
    e.preventDefault();
    kbdIndex = Math.min(kbdIndex+1, items.length-1);
    renderDrop(current, q);
    return;
  }
  if(e.key==="ArrowUp"){
    e.preventDefault();
    kbdIndex = Math.max(kbdIndex-1, 0);
    renderDrop(current, q);
    return;
  }
  if(e.key==="Enter"){
    if(kbdIndex>=0){
      e.preventDefault();
      selectIndex(kbdIndex);
    }
    return;
  }
  if(e.key==="Escape"){
    drop.classList.remove("show");
  }
}

/* ===== VALIDACIÓN: conflicto de horario (>= 1 hora) ===== */
async function hayConflictoHorario(fechaHoraIso, toleranciaMinutos = 60) {
  const objetivo = new Date(fechaHoraIso);
  if (isNaN(objetivo)) return false;

  // yyyy-mm-dd
  const soloFecha = fechaHoraIso.slice(0, 10);
  const paramFecha = `${soloFecha}T00:00:00`;

  // usamos /api/citas/dia para traer todas las citas de ese día
  const raw = await http(`/citas/dia?fecha=${encodeURIComponent(paramFecha)}`);
  const arr = Array.isArray(raw)
    ? raw
    : (raw.citas || raw.items || raw.data || raw.value || []);

  return arr.some(c => {
    const f = c.citaFecha || c.CitaFecha || c.fecha;
    if (!f) return false;

    const d = new Date(f);
    if (isNaN(d)) return false;

    const diffMin = Math.abs(d.getTime() - objetivo.getTime()) / 60000;
    // conflicto si hay cita a menos de X minutos
    return diffMin < toleranciaMinutos;
  });
}

/* ===== GUARDAR CITA ===== */
async function guardarCita(e){
  e.preventDefault();

  if(!selectedPaciente){
    showError("Selecciona un paciente de la lista.");
    return;
  }

  const fecha = $("inpFecha").value; // ej: 2025-11-25
  const hora  = $("inpHora").value;  // ej: 12:00

  if(!fecha || !hora){
    showError("Fecha y hora son obligatorias.");
    return;
  }

  // mismo formato que antes
  const fechaHoraIso = `${fecha}T${hora}:00`;

  // 🔴 Validar conflicto antes del POST
  try {
    const conflicto = await hayConflictoHorario(fechaHoraIso, 60);
    if (conflicto) {
      showError(
        "Ya existe una cita con esa fecha y hora (las citas deben tener al menos 1 hora de diferencia)."
      );
      return; // no se guarda
    }
  } catch (err) {
    showError(err.message || "Error al validar el horario de la cita.");
    return;
  }

  const body = {
    pacienteId: selectedPaciente.id,
    citaFecha: fechaHoraIso,
    citaMotivo: $("inpMotivo").value.trim(),
    citaModalidad: $("inpModalidad").value
  };

  try{
    hideError();
    await http(CITAS_ENDPOINT, {
      method:"POST",
      body: JSON.stringify(body)
    });
    window.location.href = "./agenda.html";
  }catch(err){
    showError(err.message || "No se pudo crear la cita.");
  }
}

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", async ()=>{
  setUserTopbar();

  // valores por defecto de fecha/hora
  const now = new Date();
  $("inpFecha").value = now.toISOString().slice(0,10);
  const mm = String(now.getMinutes() - (now.getMinutes()%5)).padStart(2,'0');
  $("inpHora").value  = `${String(now.getHours()).padStart(2,'0')}:${mm}`;

  // Carga inicial de pacientes y activa autocomplete
  try{
    await loadPacientesAll();
  }catch{
    // el error ya se mostró arriba
  }

  $("qPaciente").addEventListener("focus", openInitialList);
  $("qPaciente").addEventListener("input", onInputPaciente);
  $("qPaciente").addEventListener("keydown", onKeyNav);

  // Click en item del dropdown
  $("dropPac").addEventListener("click",(e)=>{
    const it = e.target.closest(".item");
    if(!it) return;
    selectIndex(Number(it.dataset.idx));
  });

  // Cerrar dropdown al hacer click fuera
  document.addEventListener("click",(ev)=>{
    if(!ev.target.closest(".searchbox")){
      $("dropPac").classList.remove("show");
    }
  });

  $("frm").addEventListener("submit", guardarCita);
});
