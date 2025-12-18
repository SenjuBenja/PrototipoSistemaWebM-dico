"use strict";

/* ===== CONFIG ===== */
const API_BASE = "https://localhost:7179/api"; // cambia a http si tu API no usa https
// Suponemos un endpoint típico de citas por rango:
const CITAS_ENDPOINT = "/citas"; // GET /citas?start=YYYY-MM-DD&end=YYYY-MM-DD

// Horas visibles (puedes ajustar)
const START_HOUR = 8;
const END_HOUR   = 21;
const ROW_HEIGHT = 56; // debe coincidir con grid-auto-rows del CSS

/* ===== Helpers ===== */
const $ = (id) => document.getElementById(id);

function readSession(){
  try{
    return JSON.parse(localStorage.getItem("session")||"null");
  }catch{
    return null;
  }
}

function authHeaders(){
  const h={Accept:"application/json"};
  const s=readSession();
  const token = s?.token || s?.accessToken || s?.user?.token || s?.auth?.token;
  if(token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function http(path){
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
    credentials: "include"
  });
  let body=null;
  try{ body = await res.json(); }catch{}
  if(!res.ok) throw new Error(body?.title || body?.message || res.statusText);
  return body;
}

// Fechas
function mondayOf(d){
  const x = new Date(d);
  const dow = (x.getDay()+6)%7; // lunes=0
  x.setHours(0,0,0,0);
  x.setDate(x.getDate()-dow);
  return x;
}
function addDays(d, n){
  const x = new Date(d);
  x.setDate(x.getDate()+n);
  return x;
}
function isoDate(d){ return d.toISOString().slice(0,10); }

function niceMonthRange(monday){
  const sun = addDays(monday,6);
  const fm = monday.toLocaleDateString(undefined,{month:"long", year:"numeric"});
  const sm = sun.toLocaleDateString(undefined,{month:"long", year:"numeric"});
  return (fm===sm)? fm : `${fm} – ${sm}`;
}
function hhmm(dateIso){
  const dt = new Date(dateIso);
  return dt.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
}

/* ===== Estado ===== */
const state = {
  monday: mondayOf(new Date()),
  citas: [], // objetos normalizados
};

/* Normalización, usando tus campos reales */
function normalizeCita(c){
  const id    = c.citaId ?? c.id;
  const start = c.citaFecha ?? c.fecha ?? c.start ?? c.inicio;

  const modalidad = c.citaModalidad ?? c.modalidad ?? c.tipo ?? null;

  // ===== OBTENER NOMBRE DEL PACIENTE =====
  let nombrePaciente = "";

  if (c.pacienteNombre || c.pacienteApellido) {
    nombrePaciente = `${c.pacienteNombre ?? ""} ${c.pacienteApellido ?? ""}`.trim();
  } else if (c.paciente && (c.paciente.pacienteNombre || c.paciente.pacienteApellido)) {
    nombrePaciente = `${c.paciente.pacienteNombre ?? ""} ${c.paciente.pacienteApellido ?? ""}`.trim();
  } else if (c.paciente && (c.paciente.nombre || c.paciente.apellido)) {
    nombrePaciente = `${c.paciente.nombre ?? ""} ${c.paciente.apellido ?? ""}`.trim();
  } else if (c.nombrePaciente || c.apellidoPaciente) {
    nombrePaciente = `${c.nombrePaciente ?? ""} ${c.apellidoPaciente ?? ""}`.trim();
  } else if (c.nombre || c.apellido) {
    nombrePaciente = `${c.nombre ?? ""} ${c.apellido ?? ""}`.trim();
  } else if (typeof c.paciente === "string") {
    nombrePaciente = c.paciente.trim();
  }

  if (!nombrePaciente) nombrePaciente = "Paciente";

  // pacienteId (útil para PUT)
  const pacienteId =
    c.pacienteId ?? c.PacienteId ??
    c.paciente?.pacienteId ?? c.paciente?.PacienteId ?? null;

  // motivo
  const motivo = c.citaMotivo ?? c.motivo ?? c.motivoConsulta ?? "";

  return {
    id,
    start,
    pacienteId,
    paciente: nombrePaciente,
    modalidad,
    motivo
  };
}

/* ===== UI ===== */
function setUser(){
  const s = readSession();
  if(!s?.loggedIn || !s?.user){
    window.location.href="../index.html";
    return;
  }
  $("userShort").textContent = `${s.user.nombre} ${s.user.apellido}`;
  $("btnLogout").onclick = ()=>{ localStorage.removeItem("session"); window.location.href="../index.html"; };
}

function paintHeaders(){
  $("lblMes").textContent = niceMonthRange(state.monday);
  for(let i=0;i<7;i++){
    const d = addDays(state.monday,i);
    const el = $(`d${i}`);
    el.innerHTML = `
      <div class="dow" style="text-transform:uppercase;font-size:11px;color:#94a3b8">
        ${d.toLocaleDateString(undefined,{weekday:"short"})}
      </div>
      <div style="font-weight:700;font-size:18px">${d.getDate()}</div>
    `;
  }
}

function buildGrid(){
  const grid = $("grid");
  // Limpiar filas previas dejando cabecera
  grid.querySelectorAll(".hour, .cell").forEach(n=>n.remove());

  for(let h=START_HOUR; h<END_HOUR; h++){
    // Columna de hora
    const hr = document.createElement("div");
    hr.className="hour";
    hr.textContent = `${String(h).padStart(2,"0")}:00`;
    grid.appendChild(hr);

    // 7 celdas de días
    for(let d=0; d<7; d++){
      const cell = document.createElement("div");
      cell.className="cell";
      cell.dataset.hour = String(h);
      cell.dataset.dayIndex = String(d);
      grid.appendChild(cell);
    }
  }
}

function clearAppointments(){
  document.querySelectorAll(".cell .appt").forEach(n=>n.remove());
}

function placeAppointments(){
  clearAppointments();

  const cells = new Map();
  document.querySelectorAll(".cell").forEach(c=>{
    const dIndex = Number(c.dataset.dayIndex);
    const h = Number(c.dataset.hour);
    const date = addDays(state.monday,dIndex);
    const key = `${isoDate(date)}-${String(h).padStart(2,"0")}`;
    cells.set(key, c);
  });

  state.citas.forEach(c=>{
    const dt = new Date(c.start);
    const key = `${isoDate(dt)}-${String(dt.getHours()).padStart(2,"0")}`;
    const cell = cells.get(key);
    if(!cell) return;

    // === Offset dentro de la hora según los minutos ===
    const minutes = dt.getMinutes();               // 0..59
    const offset  = Math.round((minutes/60) * ROW_HEIGHT); // px dentro de la celda

    // Altura de la tarjeta (mantenerla dentro de la celda)
    const CARD_H = 44; // puedes ajustar (<= ROW_HEIGHT - margen)
    const topPx  = Math.min(ROW_HEIGHT - CARD_H - 4, offset); // no salir de la celda

    const div = document.createElement("div");
    div.className = "appt";
    div.style.top = `${topPx}px`;
    div.style.left = "6px";
    div.style.right = "6px";
    div.style.height = `${CARD_H}px`;

    div.innerHTML = `
      <div class="title">${c.paciente || "Paciente"}</div>
      <div class="meta">
        ${hhmm(c.start)}
        ${c.modalidad ? `<span class="badge">${c.modalidad}</span>` : ""}
      </div>
    `;

    // Tooltip con detalle de la cita
    const tooltipParts = [
      c.paciente || "",
      c.motivo ? `Motivo: ${c.motivo}` : "",
      `Hora: ${hhmm(c.start)}`,
      c.modalidad ? `Modalidad: ${c.modalidad}` : ""
    ].filter(Boolean);
    div.title = tooltipParts.join("\n");

    // Al hacer click, guardar datos y navegar a update-cita.html
    div.addEventListener("click", () => {
      localStorage.setItem("editCita", JSON.stringify(c));
      window.location.href = "./update-cita.html";
    });

    cell.classList.add("has-appt");
    cell.appendChild(div);
  });
}

/* ===== Data ===== */
async function loadWeek(){
  const start = isoDate(state.monday);
  const end   = isoDate(addDays(state.monday,6));
  try{
    $("boxError").classList.add("hidden");
    const raw = await http(`${CITAS_ENDPOINT}?start=${start}&end=${end}`);
    const list = Array.isArray(raw)
      ? raw
      : (raw?.items || raw?.result || raw?.data || raw?.value || []);
    state.citas = list.map(normalizeCita);
    placeAppointments();
  }catch(err){
    $("boxError").textContent = err.message || "No se pudo cargar la semana.";
    $("boxError").classList.remove("hidden");
    state.citas = [];
    clearAppointments();
  }
}

/* ===== Navegación ===== */
function goPrev(){
  state.monday = addDays(state.monday,-7);
  paintHeaders();
  buildGrid();
  loadWeek();
}
function goNext(){
  state.monday = addDays(state.monday, 7);
  paintHeaders();
  buildGrid();
  loadWeek();
}
function goToday(){
  state.monday = mondayOf(new Date());
  paintHeaders();
  buildGrid();
  loadWeek();
}

/* ===== Bootstrap ===== */
document.addEventListener("DOMContentLoaded", ()=>{
  setUser();
  paintHeaders();
  buildGrid();
  loadWeek();

  $("btnPrev").onclick  = goPrev;
  $("btnNext").onclick  = goNext;
  $("btnToday").onclick = goToday;

  $("btnNew").onclick = ()=> window.location.href = "./cita-nueva.html";
});
// Comprueba si ya existe una cita exactamente en ese horario.
// currentId es opcional (para UPDATE, para ignorar la misma cita).
async function existeCitaMismoHorario(fechaHoraIso, currentId = null) {
  // Llamamos a /api/citas/search?fecha=2025-11-27T10:00:00
  const raw = await http(`/citas/search?fecha=${encodeURIComponent(fechaHoraIso)}`);

  const arr = Array.isArray(raw)
    ? raw
    : (raw.citas || raw.items || raw.data || []);

  return arr.some(c => {
    const id    = c.citaId ?? c.id;
    const fecha = c.citaFecha ?? c.citaFecha; // según tu modelo

    const mismaFechaHora = fecha === fechaHoraIso;
    const mismoRegistro  =
      currentId != null && String(id) === String(currentId);

    // si hay otra cita diferente con la misma fecha/hora → conflicto
    return mismaFechaHora && !mismoRegistro;
  });
}
