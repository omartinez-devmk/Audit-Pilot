const API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://auditpilot-backend.onrender.com";

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "{}");

if (!token || !user.id) {
  window.location.href = "./login.html";
}

const userEmailEl = document.getElementById("userEmail");
if (userEmailEl) {
  userEmailEl.textContent = user.email || "";
}

async function cargarProyectos() {
  try {
    const response = await fetch(`${API_URL}/projects`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user.id,
        "x-user-role": user.role,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error cargando proyectos");
    }

    pintarResumen(data.projects || []);
    pintarTabla(data.projects || []);
  } catch (error) {
    console.error(error);
    document.getElementById("projectsTable").innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center text-red-400">
          No se han podido cargar los proyectos.
        </td>
      </tr>
    `;
  }
}

function pintarResumen(projects) {
  const total = projects.length;
  const urgent = projects.filter((p) => Number(p.score) < 75).length;

  const scores = projects
    .map((p) => Number(p.score))
    .filter((score) => !Number.isNaN(score));

  const avg = scores.length
    ? Math.round(scores.reduce((acc, n) => acc + n, 0) / scores.length)
    : 0;

  document.getElementById("totalProjects").textContent = total;
  document.getElementById("urgentAudits").textContent = urgent;
  document.getElementById("avgScore").textContent = avg;
  document.getElementById("tableSummary").textContent = `Mostrando ${total} proyecto${total === 1 ? "" : "s"}`;
}

function pintarTabla(projects) {
  const table = document.getElementById("projectsTable");
  table.innerHTML = "";

  if (projects.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-10 text-center text-slate-400">
          Todavía no tienes proyectos. Lanza tu primera auditoría.
        </td>
      </tr>
    `;
    return;
  }

  projects.forEach((project) => {
    const score = Number(project.score || 0);
    const color = getScoreColor(score);
    const estado = getEstado(score);

    const tr = document.createElement("tr");
    tr.className = "hover:bg-white/[0.02] transition-colors group";

    tr.innerHTML = `
      <td class="px-6 py-5">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-slate-800 rounded flex items-center justify-center" style="color:${color}">
            <i data-lucide="globe" class="w-4 h-4"></i>
          </div>
          <div>
            <div class="font-display font-bold text-white">
                ${project.name || limpiarUrl(project.url)}
            </div>
            <div class="text-[11px] text-slate-500 uppercase tracking-tighter">
                ${limpiarUrl(project.url)}
            </div>
          </div>
        </div>
      </td>

      <td class="px-6 py-5">
        <div class="text-sm text-slate-300">${formatearFecha(project.last_audit_at)}</div>
        <div class="text-[11px] text-slate-500">${formatearHora(project.last_audit_at)}</div>
      </td>

      <td class="px-6 py-5">
        <div class="flex items-center gap-3">
          <div class="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
            <div class="h-full" style="width:${score}%;background:${color}"></div>
          </div>
          <span class="font-mono font-bold text-sm" style="color:${color}">${score}</span>
        </div>
      </td>

      <td class="px-6 py-5">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
          style="background:${color}18;color:${color};border:1px solid ${color}44">
          ${estado}
        </span>
      </td>

      <td class="px-6 py-5 text-right">
        <div class="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="view-report-btn p-2 hover:bg-white/10 rounded text-slate-400 transition-colors" title="Ver informe">
            <i data-lucide="file-text" class="w-5 h-5"></i>
          </button>

          <button class="rescan-btn p-2 hover:bg-teal-400/10 rounded text-teal-400 transition-colors" title="Nueva auditoría">
            <i data-lucide="refresh-cw" class="w-5 h-5"></i>
          </button>

          <button class="edit-project-btn p-2 hover:bg-amber-400/10 rounded text-amber-400 transition-colors" title="Editar proyecto">
            <i data-lucide="pencil" class="w-5 h-5"></i>
          </button>

          <button class="delete-project-btn p-2 hover:bg-red-500/10 rounded text-red-400 transition-colors" title="Eliminar proyecto">
            <i data-lucide="trash-2" class="w-5 h-5"></i>
          </button>
        </div>
      </td>
    `;

    tr.querySelector(".view-report-btn").addEventListener("click", () => {
      localStorage.setItem("auditData", JSON.stringify(project.result_json));
      window.location.href = "./report.html";
    });

    
    tr.querySelector(".rescan-btn").addEventListener("click", () => {
      localStorage.setItem("prefillUrl", project.url);
      window.location.href = "./index.html";
    });

    tr.querySelector(".edit-project-btn").addEventListener("click", () => {
      document.getElementById("editProjectId").value = project.id;
      document.getElementById("editProjectName").value =
        project.name || limpiarUrl(project.url);

      document.getElementById("editModal").classList.remove("hidden");
    });

    tr.querySelector(".delete-project-btn").addEventListener("click", () => {
      document.getElementById("deleteProjectId").value = project.id;
      document.getElementById("deleteProjectName").textContent =
        project.name || limpiarUrl(project.url);

      document.getElementById("deleteModal").classList.remove("hidden");
    });
    

    table.appendChild(tr);
  });

  lucide.createIcons();
}

const editModal = document.getElementById("editModal");
const editProjectForm = document.getElementById("editProjectForm");
const closeEditModal = document.getElementById("closeEditModal");
const cancelEditProject = document.getElementById("cancelEditProject");

function cerrarModalEdicion() {
  editModal.classList.add("hidden");
}

closeEditModal.addEventListener("click", cerrarModalEdicion);
cancelEditProject.addEventListener("click", cerrarModalEdicion);

editModal.addEventListener("click", (e) => {
  if (e.target === editModal) {
    cerrarModalEdicion();
  }
});

editProjectForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const projectId = document.getElementById("editProjectId").value;
  const name = document.getElementById("editProjectName").value.trim();

  if (!name || name.length < 2) return;

  try {
    const response = await fetch(`${API_URL}/projects/${projectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user.id,
        "x-user-role": user.role,
      },
      body: JSON.stringify({ name }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error actualizando proyecto");
    }

    cerrarModalEdicion();
    await cargarProyectos();
  } catch (error) {
    console.error(error);
    alert("No se ha podido actualizar el proyecto.");
  }
});

const deleteModal = document.getElementById("deleteModal");
const deleteProjectId = document.getElementById("deleteProjectId");
const closeDeleteModal = document.getElementById("closeDeleteModal");
const cancelDeleteProject = document.getElementById("cancelDeleteProject");
const confirmDeleteProject = document.getElementById("confirmDeleteProject");

function cerrarModalBorrado() {
  deleteModal.classList.add("hidden");
  deleteProjectId.value = "";
}

closeDeleteModal.addEventListener("click", cerrarModalBorrado);
cancelDeleteProject.addEventListener("click", cerrarModalBorrado);

deleteModal.addEventListener("click", (e) => {
  if (e.target === deleteModal) {
    cerrarModalBorrado();
  }
});

confirmDeleteProject.addEventListener("click", async () => {
  const projectId = deleteProjectId.value;

  if (!projectId) return;

  try {
    const response = await fetch(`${API_URL}/projects/${projectId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user.id,
        "x-user-role": user.role,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error eliminando proyecto");
    }

    cerrarModalBorrado();
    await cargarProyectos();
  } catch (error) {
    console.error(error);
    alert("No se ha podido eliminar el proyecto.");
  }
});

function getScoreColor(score) {
  if (score < 50) return "#ef4444";
  if (score < 75) return "#f59e0b";
  return "#5eead4";
}

function getEstado(score) {
  if (score < 50) return "Crítico";
  if (score < 75) return "Revisar";
  return "Correcto";
}

function limpiarUrl(url = "") {
  return url
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

function formatearFecha(dateString) {
  if (!dateString) return "Sin auditoría";
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatearHora(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

cargarProyectos();
lucide.createIcons();