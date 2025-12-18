const API_BASE = "https://localhost:7179/api"; // cambia si tu backend usa otro puerto/HTTP

document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Por favor, completa todos los campos.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error("Credenciales inválidas.");
      throw new Error(`Error: ${res.statusText}`);
    }

    const user = await res.json(); // { medicoId, nombre, apellido, email }

    // Guardar sesión en localStorage
    localStorage.setItem("session", JSON.stringify({
      loggedIn: true,
      user
    }));

    // Redirigir al Home
    window.location.href = "pages/Home.html";
  } catch (err) {
    alert(err.message || "No se pudo iniciar sesión.");
  }
});



