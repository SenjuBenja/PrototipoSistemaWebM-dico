"use strict";

/* ====== CONFIG ====== */
const API_BASE = "https://localhost:7179/api";   // usa http si tu API no tiene https
const ENDPOINT = "/pacientes";                    // POST /api/pacientes

/* ====== helpers ====== */
const $ = (id) => document.getElementById(id);
function readSession(){ try{ return JSON.parse(localStorage.getItem("session")||"null"); }catch{ return null; } }
function authHeaders(){
  const h = { "Accept":"application/json", "Content-Type":"application/json" };
  const s = readSession();
  const token = s?.token || s?.accessToken || s?.user?.token || s?.auth?.token;
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}
function showError(msg){
  const b = $("boxError"); b.textContent = msg; b.classList.remove("hidden");
  $("boxOk").classList.add("hidden");
}
function showOk(msg){
  const b = $("boxOk"); b.textContent = msg; b.classList.remove("hidden");
  $("boxError").classList.add("hidden");
}

/* ====== sesión / navbar ====== */
function initSession(){
  const s = readSession();
  if(!s?.loggedIn || !s?.user){ window.location.href="../index.html"; return; }
  $("userShort").textContent = `${s.user.nombre} ${s.user.apellido}`;
  $("btnLogout").onclick = ()=>{ localStorage.removeItem("session"); window.location.href="../index.html"; };
}

/* ====== validación simple ====== */
function clearFieldErrors(){
  document.querySelectorAll(".field .error").forEach(x=> x.textContent = "");
}
function setFieldError(inputId, message){
  const el = document.querySelector(`#${inputId} + .error`);
  if (el) el.textContent = message || "";
}
function validateForm(){
  clearFieldErrors();
  let ok = true;

  const required = [
    "pacienteNombre","pacienteApellido","pacienteCedula",
    "sexoId","pacienteFechaNacimiento"
  ];
  required.forEach(id=>{
    const v = $(id).value.trim();
    if(!v){ setFieldError(id,"Requerido"); ok = false; }
  });

  // email opcional pero si lo envían, validar formato
  const email = $("pacienteEmail").value.trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email)){
    setFieldError("pacienteEmail","Email inválido");
    ok = false;
  }

  return ok;
}

/* ====== POST ====== */
async function crearPaciente(payload){
  const res = await fetch(`${API_BASE}${ENDPOINT}`, {
    method: "POST",
    credentials: "include",       // quita si no usas cookies de auth
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  let body=null; try{ body = await res.json(); }catch{}
  if(!res.ok){
    const msg = body?.title || body?.message || res.statusText;
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return body;
}

/* ====== submit ====== */
async function onSubmit(ev){
  ev.preventDefault();
  if (!validateForm()) return;

  const payload = {
    sexoId: Number($("sexoId").value),
    pacienteCedula: $("pacienteCedula").value.trim(),
    pacienteNombre: $("pacienteNombre").value.trim(),
    pacienteApellido: $("pacienteApellido").value.trim(),
    pacienteFechaNacimiento: $("pacienteFechaNacimiento").value, // yyyy-mm-dd
    pacienteTelefono: $("pacienteTelefono").value.trim() || null,
    pacienteEmail: $("pacienteEmail").value.trim() || null,
    pacienteDireccion: $("pacienteDireccion").value.trim() || null
  };

  $("btnSave").disabled = true;
  showOk("Guardando…");

  try{
    await crearPaciente(payload);
    showOk("Paciente creado con éxito.");
    // redirige a la lista tras 800 ms
    setTimeout(()=> window.location.href = "./pacientes.html", 800);
  }catch(err){
    console.error(err);
    showError(err.message || "No se pudo guardar.");
  }finally{
    $("btnSave").disabled = false;
  }
}

/* ====== bootstrap ====== */
document.addEventListener("DOMContentLoaded", ()=>{
  initSession();
  $("frmPaciente").addEventListener("submit", onSubmit);
});

$("btnBackHome")?.addEventListener("click", () => {
  window.location.href = "./home.html";
});
$("btnBackPacientes")?.addEventListener("click", () => {
  window.location.href = "./pacientes.html";
});
$("btnCancel")?.addEventListener("click", () => {
  window.location.href = "./pacientes.html";
});
