const API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://auditpilot-backend.onrender.com";   

export async function analizarWeb(url) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  try {
    const response = await fetch(`${API_URL}/auditorias`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user.id,
        "x-user-role": user.role,
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error backend:", data);
      throw new Error(data.error || "Error en la API");
    }

    return data;
  } catch (error) {
    console.error("Error API:", error);
    throw error;
  }
}