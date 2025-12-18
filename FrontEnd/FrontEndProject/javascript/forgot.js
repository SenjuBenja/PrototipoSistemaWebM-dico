"use strict";

// ===== CONFIG =====
const API_BASE = "https://localhost:7179/api"; // ajusta si tu backend usa http
const MEDICOS_ENDPOINT = `${API_BASE}/medicos`;

// ===== Helpers =====
async function http(url, options = {}) {
  const res = await fetch(url, {
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // puede no haber body
  }

  if (!res.ok) {
    const msg =
      data?.message || data?.title || `Error HTTP ${res.status.toString()}`;
    throw new Error(msg);
  }
  return data;
}

function showMsg(text, type = "error") {
  const msg = document.getElementById("msg");
  msg.textContent = text;
  msg.classList.remove("hidden", "error", "success");
  msg.classList.add(type === "success" ? "success" : "error");
}

function clearMsg() {
  const msg = document.getElementById("msg");
  msg.textContent = "";
  msg.classList.add("hidden");
  msg.classList.remove("error", "success");
}

// ===== Main =====
document.addEventListener("DOMContentLoaded", () => {
  const frm = document.getElementById("frmReset");
  const inpCedula = document.getElementById("cedula");
  const btnBuscar = document.getElementById("btnBuscar");
  const inpNew = document.getElementById("newPass");
  const inpConfirm = document.getElementById("confirmPass");
  const btnGuardar = document.getElementById("btnGuardar");
  const infoMedico = document.getElementById("infoMedico");

  let medicoActual = null;

  function setPasswordEnabled(enabled) {
    inpNew.disabled = !enabled;
    inpConfirm.disabled = !enabled;
    btnGuardar.disabled = !enabled;
    if (!enabled) {
      inpNew.value = "";
      inpConfirm.value = "";
    }
  }

  setPasswordEnabled(false);

  // ===== Buscar médico por cédula =====
  btnBuscar.addEventListener("click", async () => {
    clearMsg();
    infoMedico.classList.add("hidden");
    infoMedico.textContent = "";

    const cedula = inpCedula.value.trim();
    if (!cedula) {
      showMsg("Ingresa la cédula.", "error");
      setPasswordEnabled(false);
      medicoActual = null;
      return;
    }

    btnBuscar.disabled = true;
    btnBuscar.textContent = "Buscando...";

    try {
      const url = `${MEDICOS_ENDPOINT}/by-cedula/${encodeURIComponent(
        cedula
      )}`;
      const medico = await http(url);

      medicoActual = medico;

      const nombreCompleto = `${medico.medicoNombre ?? ""} ${
        medico.medicoApellido ?? ""
      }`.trim();

      infoMedico.textContent = nombreCompleto
        ? `${nombreCompleto} — ${medico.medicoEmail ?? ""}`
        : medico.medicoEmail ?? "Médico encontrado";

      infoMedico.classList.remove("hidden");
      setPasswordEnabled(true);
      showMsg("Médico encontrado. Ahora define la nueva contraseña.", "success");
    } catch (err) {
      medicoActual = null;
      setPasswordEnabled(false);
      showMsg(
        err.message || "No se encontró ningún médico con esa cédula.",
        "error"
      );
    } finally {
      btnBuscar.disabled = false;
      btnBuscar.textContent = "Buscar";
    }
  });

  // ===== Guardar nueva contraseña =====
  frm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg();

    if (!medicoActual) {
      showMsg("Primero busca tu usuario por cédula.", "error");
      return;
    }

    const pass1 = inpNew.value.trim();
    const pass2 = inpConfirm.value.trim();

    if (!pass1 || !pass2) {
      showMsg("Ingresa y confirma la nueva contraseña.", "error");
      return;
    }

    if (pass1 !== pass2) {
      showMsg("Las contraseñas no coinciden.", "error");
      return;
    }

    if (pass1.length < 4) {
      // ajusta a la política que quieras
      showMsg("La contraseña debe tener al menos 4 caracteres.", "error");
      return;
    }

    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";

    try {
      const body = {
        ...medicoActual,
        medicoPassword: pass1,
      };

      await http(`${MEDICOS_ENDPOINT}/${medicoActual.medicoId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      showMsg("Contraseña actualizada correctamente.", "success");
      setPasswordEnabled(false);
      medicoActual = null;
      infoMedico.classList.add("hidden");
      infoMedico.textContent = "";
    } catch (err) {
      showMsg(
        err.message || "Ocurrió un error al actualizar la contraseña.",
        "error"
      );
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = "Guardar nueva contraseña";
    }
  });
});
