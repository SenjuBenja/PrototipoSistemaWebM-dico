"use strict";

/* ===== CONFIG ===== */
const API_BASE = "https://localhost:7179/api";
const CITAS_ENDPOINT = "/citas"; // PUT /citas/{id}, DELETE /citas/{id}

/* ===== Helpers ===== */
const $ = (id) => document.getElementById(id);

function readSession(){
  try{ return JSON.parse(localStorage.getItem("session") || "null"); }
  catch{ return null; }
}

function authHeaders(json = true){
  const h = { Accept: "application/json" };
  if (json) h["Content-Type"] = "application/json";

  const s = readSession();
  const token = s?.token || s?.accessToken || s?.user?.token || s?.auth?.token;
  if (token) h.Authorization = `Bearer ${token}`;
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

  if (!res.ok) {
    throw new Error(body?.title || body?.message || res.statusText);
  }
  return body ?? {};
}

function showError(msg){
  const box = $("boxError");
  box.textContent = msg;
  box.classList.remove("uc-hidden");
}

function hideError(){
  $("boxError").classList.add("uc-hidden");
}

/* ===== Sesión / topbar ===== */
function initSession(){
  const s = readSession();
  if (!s?.loggedIn || !s?.user){
    window.location.href = "../index.html";
    return;
  }
  $("userShort").textContent = `${s.user.nombre} ${s.user.apellido}`;
  $("btnLogout").onclick = ()=>{ localStorage.removeItem("session"); window.location.href="../index.html"; };
}

/* ===== Cargar datos guardados desde agenda ===== */
function loadFromStorage(){
  const raw = localStorage.getItem("editCita");
  if (!raw){
    // si entran directo a esta página sin seleccionar cita
    window.location.href = "./agenda.html";
    return null;
  }

  let data;
  try { data = JSON.parse(raw); }
  catch { window.location.href = "./agenda.html"; return null; }

  // Rellenar UI
  $("lblPaciente").textContent = data.paciente || "Paciente";

  const dt = new Date(data.start);
  // date
  $("ucFecha").value = dt.toISOString().slice(0,10);
  // time HH:MM
  const hh = String(dt.getHours()).padStart(2,"0");
  const mm = String(dt.getMinutes()).padStart(2,"0");
  $("ucHora").value = `${hh}:${mm}`;

  $("ucMotivo").value = data.motivo || "";
  $("ucModalidad").value = data.modalidad || "";

  return data;
}

/* ===== Guardar cambios ===== */
async function onSubmit(e, baseData){
  e.preventDefault();
  hideError();

  const fecha = $("ucFecha").value;
  const hora  = $("ucHora").value;
  const motivo = $("ucMotivo").value.trim();
  const modalidad = $("ucModalidad").value;

  if (!fecha)   return showError("La fecha es obligatoria.");
  if (!hora)    return showError("La hora es obligatoria.");
  if (!modalidad) return showError("La modalidad es obligatoria.");

  const fechaHoraIso = `${fecha}T${hora}:00`;

  const body = {
    citaId: baseData.id ?? baseData.citaId,
    pacienteId: baseData.pacienteId,  // no lo cambiamos
    citaFecha: fechaHoraIso,
    citaMotivo: motivo,
    citaModalidad: modalidad
  };

  try{
    await http(`${CITAS_ENDPOINT}/${body.citaId}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });

    // limpieza y volver a agenda
    localStorage.removeItem("editCita");
    window.location.href = "./agenda.html";
  }catch(err){
    showError(err.message || "No se pudo actualizar la cita.");
  }
}

/* ===== Eliminar cita ===== */
async function onDelete(baseData){
  hideError();

  const confirmDelete = window.confirm("¿Seguro que quieres eliminar la cita?");
  if (!confirmDelete) return;

  const id = baseData.id ?? baseData.citaId;
  if (!id){
    return showError("No se encontró el identificador de la cita.");
  }

  try{
    await http(`${CITAS_ENDPOINT}/${id}`, {
      method: "DELETE",
      noJson: true
    });

    localStorage.removeItem("editCita");
    window.location.href = "./agenda.html";
  }catch(err){
    showError(err.message || "No se pudo eliminar la cita debido a que se tiene un informe asociado a la misma (Primero eliminar el informe).");
  }
}

/* ===== Bootstrap ===== */
document.addEventListener("DOMContentLoaded", () => {
  initSession();

  const data = loadFromStorage();
  if (!data) return;

  $("btnCancelar").onclick = () => {
    window.location.href = "./agenda.html";
  };

  $("frmCita").addEventListener("submit", (e) => onSubmit(e, data));

  const btnEliminar = $("btnEliminar");
  if (btnEliminar){
    btnEliminar.onclick = () => onDelete(data);
  }
});
