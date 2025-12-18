"use strict";

/* ===== CONFIG ===== */
const API_BASE = "https://localhost:7179/api";   // cambia a http si tu API está en http
const PATIENTS_ENDPOINT = "/pacientes";

/* ===== Helpers ===== */
const $ = (id) => document.getElementById(id);
function fmtDate(d){
  if(!d) return "—";
  const x=new Date(d);
  return isNaN(x)? String(d).slice(0,10): x.toLocaleDateString();
}
function initials(n,a){
  const x=(n||"").trim().charAt(0).toUpperCase();
  const y=(a||"").trim().charAt(0).toUpperCase();
  return (x+y)||"—";
}
function badgeSexo(t){
  if(!t) return `<span class="badge">—</span>`;
  const cls=String(t).toLowerCase().startsWith("f")?"badge f":"badge m";
  return `<span class="${cls}">${t}</span>`;
}

/* ===== Sesión/Auth ===== */
function readSession(){
  try{ return JSON.parse(localStorage.getItem("session")||"null"); }
  catch{ return null; }
}
function authHeaders(){
  const h={Accept:"application/json"};
  const s=readSession();
  const t=s?.token||s?.accessToken||s?.user?.token||s?.auth?.token;
  if(t) h.Authorization=`Bearer ${t}`;
  return h;
}

/* ===== HTTP ===== */
async function http(path, opts={}){
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { ...authHeaders(), ...(opts.headers||{}) },
    ...opts
  });
  let body=null; try{ body=await res.json(); }catch{}
  if(!res.ok) throw new Error(`HTTP ${res.status}: ${body?.title||body?.message||res.statusText}`);
  return body;
}

/* ===== Normalización ===== */
function normalizePaciente(p){
  return {
    pacienteId: p.pacienteId,
    nombre: p.pacienteNombre ?? "",
    apellido: p.pacienteApellido ?? "",
    cedula: p.pacienteCedula ?? "—",

    sexoId: p.sexoId ?? null,

    sexo: (p.sexoId===1||p.sexoId==="1") ? "Masculino"
        : (p.sexoId===2||p.sexoId==="2") ? "Femenino"
        : (p.sexo ?? "—"),

    telefono: p.pacienteTelefono ?? "—",
    email: p.pacienteEmail ?? "—",
    direccion: p.pacienteDireccion ?? "—",
    fechaNacimiento: p.pacienteFechaNacimiento ?? null
  };
}

/* ===== UI ===== */
function setLoading(on=true){
  $("loading")?.classList.toggle("hidden", !on);
  if(on){
    $("rows").innerHTML = "";
    $("empty")?.classList.add("hidden");
    $("boxError")?.classList.add("hidden");
  }
}
function showError(err){
  console.error("[Pacientes]", err);
  $("boxError")?.classList.remove("hidden");
  if ($("boxError")) $("boxError").textContent = err?.message ?? String(err);
  $("loading")?.classList.add("hidden");
}
function render(list){
  const tbody = $("rows"); if(!tbody) return;
  tbody.innerHTML = "";
  if(!list.length){ $("empty")?.classList.remove("hidden"); return; }
  $("empty")?.classList.add("hidden");

  tbody.innerHTML = list.map(p => `
    <tr class="row" data-id="${p.pacienteId}">
      <td>
        <div class="flex">
          <div class="id-badge">${initials(p.nombre, p.apellido)}</div>
          <div><div style="font-weight:600">${p.nombre} ${p.apellido}</div></div>
        </div>
      </td>
      <td>${p.cedula}</td>
      <td>${badgeSexo(p.sexo)}</td>
      <td>${p.telefono}</td>
      <td class="email">${p.email}</td>
      <td class="dir">${p.direccion}</td>
      <td>${fmtDate(p.fechaNacimiento)}</td>
      <td>
        <button class="btn btn-sm btn-edit" data-id="${p.pacienteId}">
          Editar
        </button>
      </td>
    </tr>
  `).join("");
}

/* ===== Estado + filtros ===== */
const state = { all: [], filtered: [] };

function refresh() {
  const qEl = document.getElementById("q");
  const sEl = document.getElementById("fSexo");

  const q = (qEl?.value || "").trim().toLowerCase();
  const v = (sEl?.value || "").trim();          // "", "1" o "2"
  const filtraSexo = v === "1" || v === "2";

  let list = state.all;

  if (filtraSexo) list = list.filter(p => String(p.sexoId) === v);
  if (q) {
    list = list.filter(p =>
      (p.nombre||"").toLowerCase().includes(q) ||
      (p.apellido||"").toLowerCase().includes(q) ||
      (p.email||"").toLowerCase().includes(q) ||
      (p.cedula||"").toLowerCase().includes(q)
    );
  }

  state.filtered = list;
  render(state.filtered);
}

/* ===== Carga inicial ===== */
async function loadPatients() {
  setLoading(true);
  try {
    const raw = await http(PATIENTS_ENDPOINT);
    const arr = Array.isArray(raw)
      ? raw
      : (raw?.items || raw?.result || raw?.data || raw?.value || []);

    state.all = arr.map(normalizePaciente);
    refresh();
  } catch (err) {
    showError(err);
  } finally {
    setLoading(false);
  }
}

/* ===== Sesión + bootstrap ===== */
function initSession(){
  const s = readSession();
  if(!s?.loggedIn || !s?.user){ window.location.href="../index.html"; return; }
  if ($("userShort")) $("userShort").textContent = `${s.user.nombre} ${s.user.apellido}`;
  $("btnLogout").onclick = ()=>{ localStorage.removeItem("session"); window.location.href="../index.html"; };
}

document.addEventListener("DOMContentLoaded", ()=>{
  initSession();

  if ($("fSexo")) $("fSexo").selectedIndex = 0;
  if ($("q")) $("q").value = "";

  // Filtros
  $("q")?.addEventListener("input", refresh);
  $("fSexo")?.addEventListener("change", refresh);

  // Click en botón Editar (delegado en tbody)
  $("rows")?.addEventListener("click", (e)=>{
    const btn = e.target.closest(".btn-edit");
    if(!btn) return;
    const id = btn.dataset.id || btn.closest("tr")?.dataset.id;
    if(!id) return;
    window.location.href = `./update-paciente.html?id=${encodeURIComponent(id)}`;
  });

  loadPatients().then(() => refresh());

  // Botón "Nuevo Paciente"
  $("btnNew")?.addEventListener("click", () => {
    window.location.href = "./paciente-nuevo.html";
  });
});
