const API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://TU-BACKEND.onrender.com";

const loginForm = document.getElementById("loginForm");
const message = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  message.textContent = "Validando credenciales...";
  message.style.color = "#8b9cc4";

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      message.textContent = data.error || "Error al iniciar sesión";
      message.style.color = "#ef4444";
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    message.textContent = "Login correcto. Redirigiendo...";
    message.style.color = "#76fff5";

    setTimeout(() => {
      if (data.user.role === "admin") {
        window.location.href = "./audit.html";
      } else {
        window.location.href = "./audit.html";
      }
    }, 700);

  } catch (error) {
    message.textContent = "No se ha podido conectar con el servidor";
    message.style.color = "#ef4444";
  }
});