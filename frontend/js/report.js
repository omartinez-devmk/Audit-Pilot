const auditData = JSON.parse(localStorage.getItem("auditData") || "null");

if (!auditData) {
  window.location.href = "./projects.html";
  throw new Error("No hay datos de auditoría cargados");
}

document.getElementById("reportUrl").textContent = auditData.url;

const printUrl = document.getElementById("reportUrlPrint");
if (printUrl) {
  printUrl.textContent = auditData.url;
}

const score = Math.round(auditData.score || 0);
const performance = auditData.performance !== null && auditData.performance !== undefined
  ? Math.round(auditData.performance)
  : 0;

const issues = Array.isArray(auditData.issues) ? auditData.issues : [];

const seoScore = calcularSeoScore(auditData.seo || {});
const rgpdScore = calcularRgpdScore(auditData.rgpd?.checks || {});
const performanceScore = performance;
const globalScore = score;

document.getElementById("scoreGlobal").textContent = globalScore;
document.getElementById("scoreGlobalBar").style.width = `${globalScore}%`;

document.getElementById("performanceScore").textContent =
  auditData.performance !== null && auditData.performance !== undefined ? performanceScore : "N/D";
document.getElementById("performanceBar").style.width = `${performanceScore}%`;

document.getElementById("issuesTotal").textContent = issues.length;

renderBarChart({
  seoScore,
  rgpdScore,
  performanceScore,
  globalScore,
});

renderIssues(issues);
renderRecommendations(issues);
renderRgpdChecks(auditData.rgpd?.checks || {});
renderSeoChecks(auditData.seo || {});

lucide.createIcons();

function calcularSeoScore(seo) {
  let score = 100;

  if (!seo.hasTitle) score -= 35;
  if (!seo.hasMetaDescription) score -= 35;
  if (!seo.hasH1) score -= 30;

  return Math.max(0, score);
}

function calcularRgpdScore(checks) {
  let score = 100;

  if (!checks.hasPrivacyPolicy) score -= 20;
  if (!checks.hasLegalNotice) score -= 15;
  if (!checks.hasCookieInfo) score -= 20;
  if (!checks.hasLegalLinks) score -= 15;
  if (!checks.hasControllerInfo) score -= 15;

  if (checks.hasTracking && !checks.hasCookieInfo) score -= 15;

  if (checks.hasForm && (!checks.hasConsentCheckbox || !checks.hasConsentText)) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

function renderBarChart(scores) {
  const container = document.getElementById("barChart");
  container.innerHTML = "";

  const bars = [
    { label: "SEO", value: scores.seoScore },
    { label: "RGPD", value: scores.rgpdScore },
    { label: "Rendimiento", value: scores.performanceScore },
    { label: "Global", value: scores.globalScore },
  ];

  bars.forEach((bar) => {
    const color = getScoreColor(bar.value);

    const div = document.createElement("div");

    div.innerHTML = `
      <div class="flex justify-between text-sm font-bold mb-2">
        <span class="text-slate-300">${bar.label}</span>
        <span style="color:${color}">${bar.value}/100</span>
      </div>

      <div class="h-4 w-full rounded-full bg-white/10 overflow-hidden">
        <div class="h-full rounded-full transition-all duration-700" style="width:${bar.value}%;background:${color}"></div>
      </div>
    `;

    container.appendChild(div);
  });
}

function renderIssues(issues) {
  const container = document.getElementById("issuesList");
  container.innerHTML = "";

  if (issues.length === 0) {
    container.innerHTML = emptyState("No se han detectado incidencias críticas.");
    return;
  }

  issues.forEach((issue) => {
    const color = getSeverityColor(issue.severity);

    const div = document.createElement("div");
    div.className = "flex gap-4 p-4 rounded-lg border";
    div.style.background = `${color}12`;
    div.style.borderColor = `${color}55`;

    div.innerHTML = `
      <i data-lucide="${issue.icon || "alert-triangle"}" style="color:${color};width:24px;height:24px;flex-shrink:0"></i>
      <div class="flex-1">
        <div class="flex flex-wrap gap-2 items-center mb-1">
          <h3 class="font-bold text-sm">${issue.title}</h3>
          <span class="text-[10px] px-2 py-1 rounded uppercase font-bold" style="background:${color}22;color:${color}">
            ${traducirCategoria(issue.category)} · ${traducirSeveridad(issue.severity)}
          </span>
        </div>
        <p class="text-xs text-slate-400">
          Incidencia detectada mediante análisis automático de HTML público, PageSpeed y reglas internas.
        </p>
      </div>
    `;

    container.appendChild(div);
  });
}

function renderRecommendations(issues) {
  const container = document.getElementById("recommendationsList");
  container.innerHTML = "";

  const recs = issues.slice(0, 5);

  if (recs.length === 0) {
    container.innerHTML = emptyState("No hay recomendaciones urgentes.");
    return;
  }

  recs.forEach((issue, index) => {
    const div = document.createElement("div");
    div.className = "flex gap-4";

    div.innerHTML = `
      <div class="flex-shrink-0 w-9 h-9 rounded-full bg-teal-300 text-slate-950 flex items-center justify-center font-bold text-sm">
        ${String(index + 1).padStart(2, "0")}
      </div>
      <div>
        <h3 class="font-bold text-white mb-1">${getActionTitle(issue)}</h3>
        <p class="text-sm text-slate-400 leading-relaxed">${getActionText(issue)}</p>
      </div>
    `;

    container.appendChild(div);
  });
}

function renderRgpdChecks(checks) {
  const container = document.getElementById("rgpdChecks");
  container.innerHTML = "";

  const items = [
    {
      label: "Política de privacidad",
      value: checks.hasPrivacyPolicy,
      text: checks.hasPrivacyPolicy ? "Detectada en el HTML público" : "No detectada"
    },
    {
      label: "Aviso legal",
      value: checks.hasLegalNotice,
      text: checks.hasLegalNotice ? "Referencia legal localizada" : "No visible"
    },
    {
      label: "Cookies / consentimiento",
      value: checks.hasCookieInfo,
      text: checks.hasCookieInfo ? "Señales de cookies detectadas" : "Sin señales claras"
    },
    {
      label: "Tracking",
      value: !checks.hasTracking,
      text: checks.hasTracking
        ? `Detectado: ${(checks.trackers || []).join(", ")}`
        : "No se detecta tracking habitual"
    },
    {
      label: "Responsable",
      value: checks.hasControllerInfo,
      text: checks.hasControllerInfo ? "Información de contacto/responsable detectada" : "Responsable no localizado"
    },
    {
      label: "Formulario",
      value: !checks.hasForm || (checks.hasConsentCheckbox && checks.hasConsentText),
      text: checks.hasForm ? "Formulario localizado" : "No se detectan formularios"
    },
    {
      label: "Checkbox legal",
      value: !checks.hasForm || checks.hasConsentCheckbox,
      text: checks.hasConsentCheckbox ? "Checkbox detectado" : "No requerido o no detectado"
    },
    {
      label: "Gestor CMP",
      value: checks.hasCmp,
      text: checks.hasCmp ? `CMP: ${(checks.cmpVendors || []).join(", ")}` : "Gestor CMP no detectado"
    }
  ];

  items.forEach((item) => {
    const percent = item.value ? 100 : 35;
    const color = item.value ? "#5eead4" : "#f59e0b";

    const div = document.createElement("div");
    div.className = "space-y-3";

    div.innerHTML = `
      <div class="flex justify-between text-xs font-bold">
        <span class="text-slate-400 uppercase">${item.label}</span>
        <span style="color:${color}">${percent}%</span>
      </div>
      <div class="progress-bg">
        <div class="progress-fill" style="width:${percent}%;background:${color}"></div>
      </div>
      <p class="text-[11px] text-slate-500">${item.text}</p>
    `;

    container.appendChild(div);
  });
}

function renderSeoChecks(seo) {
  const container = document.getElementById("seoChecks");
  container.innerHTML = "";

  const items = [
    {
      label: "Title",
      value: seo.hasTitle,
      text: seo.hasTitle ? "Etiqueta title detectada" : "Falta title SEO"
    },
    {
      label: "Meta description",
      value: seo.hasMetaDescription,
      text: seo.hasMetaDescription ? "Meta description detectada" : "Falta meta description"
    },
    {
      label: "H1",
      value: seo.hasH1,
      text: seo.hasH1 ? "Encabezado H1 detectado" : "Falta encabezado H1"
    }
  ];

  items.forEach((item) => {
    const color = item.value ? "#5eead4" : "#ef4444";

    const div = document.createElement("div");
    div.className = "p-4 rounded-lg border";
    div.style.background = "rgba(15, 23, 42, 0.6)";
    div.style.borderColor = `${color}55`;

    div.innerHTML = `
      <div class="flex items-center gap-3 mb-2">
        <i data-lucide="${item.value ? "check-circle-2" : "x-circle"}" style="color:${color};width:22px;height:22px"></i>
        <h3 class="font-bold">${item.label}</h3>
      </div>
      <p class="text-xs text-slate-400">${item.text}</p>
    `;

    container.appendChild(div);
  });
}

function getSeverityColor(severity) {
  if (severity === "high") return "#ef4444";
  if (severity === "med") return "#f59e0b";
  return "#5eead4";
}

function getScoreColor(value) {
  if (value < 50) return "#ef4444";
  if (value < 75) return "#f59e0b";
  return "#5eead4";
}

function traducirCategoria(category) {
  if (category === "Performance") return "Rendimiento";
  return category || "General";
}

function traducirSeveridad(severity) {
  if (severity === "high") return "Alta";
  if (severity === "med") return "Media";
  if (severity === "low") return "Baja";
  return "Info";
}

function getActionTitle(issue) {
  if (issue.category === "SEO") return "Optimizar elemento SEO";
  if (issue.category === "RGPD") return "Revisar cumplimiento RGPD";
  if (issue.category === "Performance") return "Mejorar rendimiento web";
  return "Revisar incidencia";
}

function getActionText(issue) {
  const title = issue.title.toLowerCase();

  if (title.includes("tracking")) {
    return "Verifica que las herramientas de medición no carguen antes del consentimiento del usuario.";
  }

  if (title.includes("privacidad")) {
    return "Incluye una política de privacidad visible y accesible desde zonas comunes de la web.";
  }

  if (title.includes("cookies")) {
    return "Añade información clara sobre cookies y consentimiento antes de activar scripts no necesarios.";
  }

  if (title.includes("h1")) {
    return "Añade un H1 principal coherente con la intención de búsqueda de la página.";
  }

  if (title.includes("description")) {
    return "Redacta una meta description única, clara y orientada a mejorar el CTR orgánico.";
  }

  return "Prioriza esta corrección para mejorar la calidad técnica, legal y comercial de la web.";
}

function emptyState(text) {
  return `
    <div class="p-4 rounded-lg border border-teal-300/20 bg-teal-300/5">
      <p class="text-sm text-slate-300">${text}</p>
    </div>
  `;
}