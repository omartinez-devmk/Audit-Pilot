const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "./login.html";
}

const user = JSON.parse(localStorage.getItem("user") || "{}");
console.log("Usuario activo:", user);

import { analizarWeb } from "./api.js";

const scanForm = document.getElementById("scanForm");
const urlInput = document.getElementById("urlInput");
const scanBtn = document.getElementById("scanBtn");

const scanStatuses = [
  "Conectando con la web...",
  "Leyendo HTML público...",
  "Analizando SEO técnico...",
  "Revisando señales RGPD...",
  "Consultando Google PageSpeed...",
  "Generando diagnóstico..."
];

scanForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const url = urlInput.value.trim();
  if (!url) return;

  mostrarLoading();

  let si = 0;
  const statusInterval = setInterval(() => {
    si++;
    if (si < scanStatuses.length) {
      document.getElementById("scanStatus").textContent = scanStatuses[si];
    }
  }, 700);

  try {
    const data = await analizarWeb(url);
    console.log("DATA RECIBIDA:", data);
    clearInterval(statusInterval);
    mostrarResultados(data);
  } catch (error) {
    clearInterval(statusInterval);
    mostrarError("No se ha podido analizar la web. Revisa la URL o inténtalo de nuevo.");
  }
});

function mostrarLoading() {
  document.getElementById("scanningSection").classList.remove("hidden");
  document.getElementById("resultsSection").classList.add("hidden");
  document.getElementById("errorSection").classList.add("hidden");

  scanBtn.disabled = true;
  document.getElementById("scanStatus").textContent = scanStatuses[0];
  document.getElementById("scanningSection").scrollIntoView({ behavior: "smooth" });
}

function mostrarResultados(data) {
  scanBtn.disabled = false;

  document.getElementById("scanningSection").classList.add("hidden");
  document.getElementById("errorSection").classList.add("hidden");

  const score = Math.round(data.score || 0);
  const performance = data.performance !== null && data.performance !== undefined
    ? Math.round(data.performance)
    : null;

  const issues = Array.isArray(data.issues) ? data.issues : [];

  document.getElementById("resultUrl").textContent = data.url;
  document.getElementById("globalScore").textContent = score;
  document.getElementById("performanceScore").textContent = performance !== null ? performance : "N/D";
  document.getElementById("issuesCount").textContent = issues.length;

  setProgress("globalScoreBar", score);
  setProgress("performanceBar", performance !== null ? performance : 0);

  pintarBadge(score);
  pintarChecklist(data.seo);
  pintarRecomendacionesPorCategoria(issues);

  localStorage.setItem("auditData", JSON.stringify(data));
  document.getElementById("resultsSection").classList.remove("hidden");
  document.getElementById("resultsSection").scrollIntoView({ behavior: "smooth" });

  lucide.createIcons();

}

function setProgress(id, value) {
  const el = document.getElementById(id);
  el.style.width = `${Math.max(0, Math.min(100, value))}%`;
}

function pintarBadge(score) {
  const badge = document.getElementById("riskBadge");

  let label = "Salud digital alta";
  let className = "risk-badge-low";

  if (score < 50) {
    label = "Riesgo alto";
    className = "risk-badge-high";
  } else if (score < 75) {
    label = "Riesgo medio";
    className = "risk-badge-med";
  }

  badge.textContent = label;
  badge.className = `px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wider whitespace-nowrap ${className}`;
}

function pintarChecklist(seo = {}) {
  const checklist = document.getElementById("seoChecklist");
  checklist.innerHTML = "";

  const items = [
    {
      label: "Etiqueta <title>",
      ok: seo.hasTitle,
      help: seo.hasTitle ? "La web tiene título SEO detectable." : "No se ha detectado una etiqueta title clara."
    },
    {
      label: "Meta description",
      ok: seo.hasMetaDescription,
      help: seo.hasMetaDescription ? "La web incluye descripción SEO." : "No se ha detectado meta description."
    },
    {
      label: "Encabezado H1",
      ok: seo.hasH1,
      help: seo.hasH1 ? "La web tiene al menos un H1." : "No se ha detectado encabezado H1."
    }
  ];

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "flex gap-4 items-start p-4 rounded-2xl";
    div.style.background = "rgba(26,58,82,0.45)";
    div.style.border = "1px solid rgba(118,255,245,0.12)";

    div.innerHTML = `
      <i data-lucide="${item.ok ? "check-circle-2" : "x-circle"}"
         style="width:24px;height:24px;color:${item.ok ? "#76fff5" : "#ef4444"};flex-shrink:0"></i>
      <div>
        <p class="font-bold">${item.label}</p>
        <p class="text-sm mt-1" style="color:var(--text2)">${item.help}</p>
      </div>
    `;

    checklist.appendChild(div);
  });
}

function pintarRecomendacionesPorCategoria(issues) {
  const list = document.getElementById("issuesList");
  list.innerHTML = "";

  const categorias = {
    SEO: issues.filter(i => i.category === "SEO"),
    RGPD: issues.filter(i => i.category === "RGPD"),
    Performance: issues.filter(i => i.category === "Performance")
  };

  crearBloqueCategoria(list, "SEO", "search-check", categorias.SEO);
  crearBloqueCategoria(list, "RGPD", "shield-alert", categorias.RGPD);
  crearBloqueCategoria(list, "Performance", "gauge", categorias.Performance);
}

function crearBloqueCategoria(container, titulo, icono, items) {
  const wrapper = document.createElement("div");
  wrapper.className = "mb-5";

  wrapper.innerHTML = `
    <div class="flex items-center gap-2 mb-3">
      <i data-lucide="${icono}" style="width:20px;height:20px;color:#76fff5"></i>
      <h4 class="font-bold text-lg">${titulo}</h4>
      <span class="text-xs px-2 py-1 rounded-full" style="background:rgba(118,255,245,0.1);color:#76fff5">
        ${items.length}
      </span>
    </div>
  `;

  if (items.length === 0) {
    const ok = document.createElement("div");
    ok.className = "flex gap-4 items-start p-4 rounded-2xl";
    ok.style.background = "rgba(26,58,82,0.45)";
    ok.style.border = "1px solid rgba(118,255,245,0.12)";
    ok.innerHTML = `
      <i data-lucide="check-circle-2" style="width:24px;height:24px;color:#76fff5;flex-shrink:0"></i>
      <div>
        <p class="font-bold">Sin incidencias básicas detectadas</p>
        <p class="text-sm mt-1" style="color:var(--text2)">
          No se han encontrado señales críticas en este bloque durante el análisis automático.
        </p>
      </div>
    `;
    wrapper.appendChild(ok);
  }

  items.forEach((issue, index) => {
    const color = issue.severity === "high" ? "#ef4444" : issue.severity === "med" ? "#f59e0b" : "#76fff5";

    const div = document.createElement("div");
    div.className = "flex gap-4 items-start p-4 rounded-2xl animate-fade-up mb-3";
    div.style.background = "rgba(26,58,82,0.45)";
    div.style.border = `1px solid ${color}40`;
    div.style.animationDelay = `${index * 0.06}s`;

    div.innerHTML = `
      <i data-lucide="${issue.icon || "alert-triangle"}" style="width:24px;height:24px;color:${color};flex-shrink:0"></i>
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <p class="font-bold">${issue.title}</p>
          <span class="text-xs px-2 py-1 rounded-full" style="background:${color}20;color:${color};border:1px solid ${color}40">
            ${issue.severity || "info"}
          </span>
        </div>
        <p class="text-sm mt-1" style="color:var(--text2)">
          Prioridad recomendada para mejorar cumplimiento, posicionamiento o calidad técnica.
        </p>
      </div>
    `;

    wrapper.appendChild(div);
  });

  container.appendChild(wrapper);
}

function mostrarError(msg) {
  scanBtn.disabled = false;

  document.getElementById("scanningSection").classList.add("hidden");
  document.getElementById("resultsSection").classList.add("hidden");
  document.getElementById("errorSection").classList.remove("hidden");
  document.getElementById("errorMessage").textContent = msg;

  document.getElementById("errorSection").scrollIntoView({ behavior: "smooth" });
}

lucide.createIcons();

const viewReportBtn = document.getElementById("viewReportBtn");

if (viewReportBtn) {
  viewReportBtn.addEventListener("click", () => {
    window.location.href = "./report.html";
  });
}