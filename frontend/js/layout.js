const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "{}");

if (!token || !user.id) {
  window.location.href = "./login.html";
}

const currentPage = document.body.dataset.page;

const sidebar = document.getElementById("appSidebar");

if (sidebar) {
  sidebar.innerHTML = `
    <button id="mobileMenuBtn" class="mobile-menu-btn">
      <i data-lucide="menu" class="w-5 h-5"></i>
    </button>

    <div id="mobileSidebarOverlay" class="mobile-sidebar-overlay"></div>

    <aside id="appSidebarPanel" class="app-sidebar">
          <div class="px-6 mb-8">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-[#5EEAD4] rounded flex items-center justify-center">
                <i data-lucide="radar" style="width:20px;height:20px;color:#021627"></i>
              </div>
              <div>
                <h2 class="font-display text-[#5EEAD4] text-lg font-bold leading-none">AuditPilot</h2>
                <p class="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">SEO · RGPD · Rendimiento</p>
              </div>
            </div>
          </div>

      <nav class="flex-1 px-4 space-y-1">
        ${navItem("audit", "./audit.html", "search", "Nuevo análisis")}
        ${navItem("projects", "./projects.html", "folder", "Proyectos")}
        ${
          user.role === "admin"
            ? navItem("admin", "./admin.html", "shield", "Admin")
            : ""
        }
      </nav>

      <div class="px-6 mt-auto">
        <button onclick="window.location.href='./index.html'" class="w-full py-3 bg-[#5EEAD4] text-[#021627] font-bold text-sm rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
          <i data-lucide="plus" class="w-4 h-4"></i>
          Nueva auditoría
        </button>

        <div class="mt-5 text-xs text-slate-500 truncate">
          ${user.email || ""}
        </div>

        <button id="logoutBtn" class="mt-4 w-full py-2 text-slate-400 hover:text-red-400 transition-colors text-sm text-left">
          Cerrar sesión
        </button>
      </div>
    </aside>
  `;
}

function navItem(page, href, icon, label) {
  const active =
  currentPage === page ||
  (currentPage === "report" && page === "projects");

  return `
    <a href="${href}" class="flex items-center gap-3 px-4 py-3 transition-all font-display text-sm font-medium ${
      active
        ? "bg-teal-400/10 text-teal-400 border-r-2 border-teal-400"
        : "text-slate-400 hover:bg-slate-800/50"
    }">
      <i data-lucide="${icon}" class="w-4 h-4"></i>
      ${label}
    </a>
  `;
}

document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "logoutBtn") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("auditData");
    localStorage.removeItem("prefillUrl");
    window.location.href = "./login.html";
  }
});

document.addEventListener("click", (e) => {
  const menuBtn = e.target.closest("#mobileMenuBtn");
  const overlay = e.target.closest("#mobileSidebarOverlay");
  const navLink = e.target.closest("#appSidebarPanel a");

  const sidebarPanel = document.getElementById("appSidebarPanel");
  const sidebarOverlay = document.getElementById("mobileSidebarOverlay");

  if (menuBtn) {
    sidebarPanel.classList.add("is-open");
    sidebarOverlay.classList.add("is-open");
  }

  if (overlay || navLink) {
    sidebarPanel.classList.remove("is-open");
    sidebarOverlay.classList.remove("is-open");
  }
});

lucide.createIcons();