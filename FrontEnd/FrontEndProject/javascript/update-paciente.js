"use strict";

/* ===== CONFIG ===== */
const API_BASE = "https://localhost:7179/api";
const PATIENTS_ENDPOINT = "/pacientes";

/* ===== Helpers ===== */
const $ = id => document.getElementById(id);

function readSession(){
  try { return JSON.parse(localStorage.getItem("session") || "null"); }
  catch { return null; }
}
function authHeaders(json = true){
  const h = { Accept: "application/json" };
  const s = readSession();
  const t = s?.token || s?.accessToken || s?.user?.token || s?.auth?.token;
  if (t) h.Authorization = `Bearer ${t}`;
  if (json) h["Content-Type"] = "application/json";
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

function isoDateOrNull(value){
  if(!value) return null;
  const d = new Date(value);
  if (!isNaN(d)) return d.toISOString().slice(0,10);
  // si viene como "yyyy-mm-ddThh:mm:ss"
  return String(value).slice(0,10);
}

function showError(msg){
  const box = $("boxError");
  if(!box) return;
  box.textContent = msg;
  box.classList.remove("hidden");
}
function hideError(){
  $("boxError")?.classList.add("hidden");
}

/* ===== Sesión ===== */
function initSession(){
  const s = readSession();
  if(!s?.loggedIn || !s?.user){
    window.location.href = "../index.html";
    return;
  }
  $("userShort") && ($("userShort").textContent = `${s.user.nombre} ${s.user.apellido}`);
  $("btnLogout").onclick = ()=>{ localStorage.removeItem("session"); window.location.href="../index.html"; };
}

/* ===== Cargar paciente ===== */
async function loadPaciente(id){
  const p = await http(`${PATIENTS_ENDPOINT}/${id}`);

  $("inpNombre").value    = p.pacienteNombre   ?? "";
  $("inpApellido").value  = p.pacienteApellido ?? "";
  $("inpCedula").value    = p.pacienteCedula   ?? "";
  $("inpSexo").value      = p.sexoId != null ? String(p.sexoId) : "";
  $("inpTelefono").value  = p.pacienteTelefono ?? "";
  $("inpEmail").value     = p.pacienteEmail    ?? "";
  $("inpDireccion").value = p.pacienteDireccion?? "";
  $("inpFechaNac").value  = isoDateOrNull(p.pacienteFechaNacimiento);
}

/* ===== Guardar paciente (PUT) ===== */
async function savePaciente(id, e){
  e.preventDefault();
  hideError();

  const body = {
    pacienteId: Number(id),
    pacienteNombre:   $("inpNombre").value.trim(),
    pacienteApellido: $("inpApellido").value.trim(),
    pacienteCedula:   $("inpCedula").value.trim(),
    sexoId:           $("inpSexo").value ? Number($("inpSexo").value) : null,
    pacienteTelefono: $("inpTelefono").value.trim() || null,
    pacienteEmail:    $("inpEmail").value.trim() || null,
    pacienteDireccion:$("inpDireccion").value.trim() || null,
    pacienteFechaNacimiento: $("inpFechaNac").value || null
  };

  if(!body.pacienteNombre || !body.pacienteApellido || !body.pacienteCedula || !body.sexoId){
    showError("Nombre, apellido, cédula y sexo son obligatorios.");
    return;
  }

  await http(`${PATIENTS_ENDPOINT}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body)
  });

  // volver a la lista
  window.location.href = "./pacientes.html";
}

/* ===== Eliminar paciente (DELETE) ===== */
async function deletePaciente(id){
  hideError();

  const ok = window.confirm(
    "¿Seguro que quieres eliminar este paciente? Esta acción no se puede deshacer."
  );
  if (!ok) return;

  try {
    await http(`${PATIENTS_ENDPOINT}/${id}`, {
      method: "DELETE",
      noJson: true
    });

    // volver a la lista después de eliminar
    window.location.href = "./pacientes.html";
  } catch (err) {
    showError(err.message || "No se pudo eliminar el paciente debido a que el paciente tiene una o varias citas asignadas (Eliminar primero las citas).");
  }
}

/* ===== Bootstrap ===== */
document.addEventListener("DOMContentLoaded", async ()=>{
  initSession();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if(!id){
    // si no hay id, regresa a la lista
    window.location.href = "./pacientes.html";
    return;
  }

  try{
    await loadPaciente(id);
  }catch(err){
    showError(err.message || "No se pudo cargar el paciente.");
  }

  $("frmPaciente").addEventListener("submit", (e)=> savePaciente(id, e));
  $("btnCancelar").addEventListener("click", ()=>{
    window.location.href = "./pacientes.html";
  });

  const btnEliminar = $("btnEliminar");
  if (btnEliminar){
    btnEliminar.addEventListener("click", () => deletePaciente(id));
  }
});
