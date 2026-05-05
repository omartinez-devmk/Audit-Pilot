require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const pool = require("./models/db");
const authRoutes = require("./routes/auth");

const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);

app.use("/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("API funcionando 🚀");
});

app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("select now()");
    res.json({
      message: "Conexión con Supabase OK",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Error DB:", error);
    res.status(500).json({ error: "Error conectando con Supabase" });
  }
});

app.get("/projects", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];

    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const result = await pool.query(
      `
      select
        p.id,
        p.name,
        p.url,
        p.created_at,
        a.id as audit_id,
        a.score,
        a.performance,
        a.created_at as last_audit_at,
        a.result_json
      from projects p
      left join lateral (
        select *
        from audits a
        where a.project_id = p.id
        order by a.created_at desc
        limit 1
      ) a on true
      where p.user_id = $1
      order by p.created_at desc
      `,
      [userId]
    );

    res.json({
      projects: result.rows,
    });
  } catch (error) {
    console.error("Error obteniendo proyectos:", error);
    res.status(500).json({ error: "Error obteniendo proyectos" });
  }
});

app.delete("/projects/:id", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const projectId = req.params.id;

    if (!userId) {
    return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // Borramos el proyecto SOLO si es del usuario
    const result = await pool.query(
      `delete from projects
       where id = $1 and user_id = $2
       returning id`,
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    res.json({
      message: "Proyecto eliminado correctamente",
      projectId,
    });

  } catch (error) {
    console.error("Error eliminando proyecto:", error);
    res.status(500).json({ error: "Error eliminando proyecto" });
  }
});

app.put("/projects/:id", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const projectId = req.params.id;
    const { name } = req.body;

    if (!userId) {
    return res.status(401).json({ error: "Usuario no autenticado" });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "El nombre debe tener al menos 2 caracteres" });
    }

    const result = await pool.query(
      `update projects
       set name = $1
       where id = $2 and user_id = $3
       returning id, name, url`,
      [name.trim(), projectId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    res.json({
      message: "Proyecto actualizado correctamente",
      project: result.rows[0],
    });
  } catch (error) {
    console.error("Error actualizando proyecto:", error);
    res.status(500).json({ error: "Error actualizando proyecto" });
  }
});

app.post("/auditorias", async (req, res) => {
  try {
    const { url } = req.body;
    const userId = req.headers["x-user-id"];
  
    if (!userId) {
        return res.status(401).json({ error: "Usuario no autenticado" });
    }
    

    if (!url) {
      return res.status(400).json({ error: "URL requerida" });
    }

    const normalizedUrl = normalizeUrl(url);

    const htmlData = await analizarHtml(normalizedUrl);
    const pageSpeedData = await analizarPageSpeed(normalizedUrl);

    const seoIssues = generarIssuesSeo(htmlData);
    const rgpdAnalysis = analizarRgpd(htmlData.html);
    const performanceIssues = generarIssuesPerformance(pageSpeedData.performance);

    const issues = [...seoIssues, ...rgpdAnalysis.issues, ...performanceIssues];

    const score = calcularScore({
      htmlData,
      performance: pageSpeedData.performance,
      issues,
    });

    const resultado = {
      url: normalizedUrl,
      seo: {
        hasTitle: htmlData.hasTitle,
        hasMetaDescription: htmlData.hasMetaDescription,
        hasH1: htmlData.hasH1,
      },
      rgpd: {
        checks: rgpdAnalysis.checks,
        issues: rgpdAnalysis.issues,
        count: rgpdAnalysis.issues.length,
      },
      performance: pageSpeedData.performance,
      score,
      recomendaciones: issues.map((issue) => issue.title),
      issues,
      highlights: issues.slice(0, 4).map((issue) => issue.title),
    };

    console.log("RESULTADO FINAL:", JSON.stringify(resultado, null, 2));

    let project = await pool.query(
      "select id from projects where url = $1 and user_id = $2",
      [normalizedUrl, userId]
    );

    let projectId;

    if (project.rows.length === 0) {
      const newProject = await pool.query(
        `insert into projects (user_id, name, url)
         values ($1, $2, $3)
         returning id`,
        [userId, normalizedUrl, normalizedUrl]
      );

      projectId = newProject.rows[0].id;
    } else {
      projectId = project.rows[0].id;
    }

    await pool.query(
      `insert into audits (project_id, url, score, performance, result_json)
       values ($1, $2, $3, $4, $5)`,
      [projectId, normalizedUrl, score, pageSpeedData.performance, resultado]
    );

    res.json(resultado);
  } catch (error) {
    console.error("ERROR GLOBAL:", error);
    res.status(500).json({ error: "Error analizando la web" });
  }
});

function normalizeUrl(url) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

async function analizarHtml(url) {
  let html = "";
  let hasTitle = false;
  let hasMetaDescription = false;
  let hasH1 = false;

  try {
    const htmlResponse = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    html = await htmlResponse.text();

    hasTitle = /<title>.*<\/title>/is.test(html);
    hasMetaDescription = /<meta[^>]+name=["']description["'][^>]*>/i.test(html);
    hasH1 = /<h1[\s>]/i.test(html);

    console.log("HTML OK:", hasTitle, hasMetaDescription, hasH1);
  } catch (err) {
    console.log("Error analizando HTML:", err);
  }

  return { html, hasTitle, hasMetaDescription, hasH1 };
}

async function analizarPageSpeed(url) {
  const apiKey = process.env.PAGESPEED_API_KEY;

  if (!apiKey) {
    console.log("No hay API key de PageSpeed configurada");
    return { performance: null };
  }

  let performance = null;

  try {
    const psRes = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
        url
      )}&key=${apiKey}`
    );

    if (!psRes.ok) {
      console.log("Error PageSpeed status:", psRes.status);
      return { performance: null };
    }

    const pageSpeedData = await psRes.json();

    if (pageSpeedData?.lighthouseResult?.categories?.performance) {
      performance = Math.round(
        pageSpeedData.lighthouseResult.categories.performance.score * 100
      );
    }
  } catch (err) {
    console.log("Error PageSpeed:", err);
  }

  return { performance };
}

function generarIssuesSeo(data) {
  const issues = [];

  if (!data.hasTitle) {
    issues.push({
      title: "Añade una etiqueta title optimizada para SEO",
      category: "SEO",
      severity: "high",
      icon: "file-text",
    });
  }

  if (!data.hasMetaDescription) {
    issues.push({
      title: "Incluye una meta description clara y persuasiva",
      category: "SEO",
      severity: "med",
      icon: "text-search",
    });
  }

  if (!data.hasH1) {
    issues.push({
      title: "Añade un encabezado H1 principal",
      category: "SEO",
      severity: "med",
      icon: "heading-1",
    });
  }

  return issues;
}

function analizarRgpd(html = "") {
  const issues = [];

  if (!html || html.length < 300) {
    return {
      checks: {
        canAnalyze: false,
        hasPrivacyPolicy: false,
        hasLegalNotice: false,
        hasCookieInfo: false,
        hasLegalLinks: false,
        hasControllerInfo: false,
        hasForm: false,
        hasConsentCheckbox: false,
        hasConsentText: false,
        hasCmp: false,
        cmpVendors: [],
        hasTracking: false,
        trackers: [],
      },
      issues: [
        {
          title: "No se ha podido verificar completamente el cumplimiento RGPD",
          category: "RGPD",
          severity: "med",
          icon: "alert-triangle",
        },
      ],
    };
  }

  const lower = html.toLowerCase();

  const hasPrivacyPolicy =
    /privacidad|privacy|protección de datos|proteccion de datos/i.test(lower);

  const hasLegalNotice =
    /aviso legal|legal notice|terms|términos|terminos|condiciones/i.test(lower);

  const hasCookieInfo =
    /cookie|cookies|consentimiento|consent|cookiebot|onetrust|didomi|iubenda|cookieyes/i.test(lower);

  const hasLegalLinks =
    /href=["'][^"']*(privacy|privacidad|cookies|legal|terms|aviso|condiciones)[^"']*["']/i.test(html);

  const hasControllerInfo =
    /responsable|data controller|titular|mailto:|contacto@|info@/i.test(lower);

  const hasForm = /<form[\s>]/i.test(html);
  const hasConsentCheckbox = /type=["']checkbox["']/i.test(html);
  const hasConsentText =
    /acepto|consiento|he leído|he leido|i agree|consent|privacidad|protección de datos|proteccion de datos/i.test(lower);

  const cmpVendors = [];
  if (lower.includes("onetrust")) cmpVendors.push("OneTrust");
  if (lower.includes("cookiebot")) cmpVendors.push("Cookiebot");
  if (lower.includes("didomi")) cmpVendors.push("Didomi");
  if (lower.includes("iubenda")) cmpVendors.push("Iubenda");
  if (lower.includes("cookieyes")) cmpVendors.push("CookieYes");

  const hasCmp = cmpVendors.length > 0;

  const trackers = [];
  if (lower.includes("googletagmanager")) trackers.push("Google Tag Manager");
  if (lower.includes("google-analytics") || lower.includes("gtag(")) trackers.push("Google Analytics");
  if (lower.includes("facebook.com/tr") || lower.includes("fbq(")) trackers.push("Meta Pixel");
  if (lower.includes("hotjar")) trackers.push("Hotjar");
  if (lower.includes("clarity.ms")) trackers.push("Microsoft Clarity");
  if (lower.includes("linkedin.com/px")) trackers.push("LinkedIn Insight Tag");

  const hasTracking = trackers.length > 0;

  const checks = {
    canAnalyze: true,
    hasPrivacyPolicy,
    hasLegalNotice,
    hasCookieInfo,
    hasLegalLinks,
    hasControllerInfo,
    hasForm,
    hasConsentCheckbox,
    hasConsentText,
    hasCmp,
    cmpVendors,
    hasTracking,
    trackers,
  };

  if (!hasLegalLinks) {
    issues.push({
      title: "No se detectan enlaces legales visibles en el HTML público",
      category: "RGPD",
      severity: "med",
      icon: "file-x",
    });
  }

  if (!hasPrivacyPolicy) {
    issues.push({
      title: "Política de privacidad no detectada",
      category: "RGPD",
      severity: "high",
      icon: "shield-off",
    });
  }

  if (!hasLegalNotice) {
    issues.push({
      title: "Aviso legal o términos no visibles",
      category: "RGPD",
      severity: "med",
      icon: "scale",
    });
  }

  if (!hasCookieInfo) {
    issues.push({
      title: "No se detecta información visible sobre cookies",
      category: "RGPD",
      severity: "high",
      icon: "cookie",
    });
  }

  if (hasTracking && !hasCookieInfo) {
    issues.push({
      title: `Se detecta tracking (${trackers.join(", ")}) sin señal clara de consentimiento de cookies`,
      category: "RGPD",
      severity: "high",
      icon: "eye-off",
    });
  } else if (hasTracking) {
    issues.push({
      title: `Tracking detectado: ${trackers.join(", ")}. Debe verificarse que no cargue antes del consentimiento`,
      category: "RGPD",
      severity: "med",
      icon: "eye-off",
    });
  }

  if (hasCmp) {
    issues.push({
      title: `Gestor de consentimiento detectado: ${cmpVendors.join(", ")}`,
      category: "RGPD",
      severity: "low",
      icon: "cookie",
    });
  }

  if (hasForm && (!hasConsentCheckbox || !hasConsentText)) {
    issues.push({
      title: "Formulario detectado sin aceptación legal clara",
      category: "RGPD",
      severity: "high",
      icon: "file-warning",
    });
  }

  if (!hasControllerInfo) {
    issues.push({
      title: "No se detecta información clara del responsable del tratamiento",
      category: "RGPD",
      severity: "med",
      icon: "user-x",
    });
  }

  return { checks, issues };
}

function generarIssuesPerformance(performance) {
  const issues = [];

  if (performance === null) {
    issues.push({
      title: "No se ha podido obtener el rendimiento desde PageSpeed",
      category: "Performance",
      severity: "low",
      icon: "gauge",
    });
    return issues;
  }

  if (performance < 50) {
    issues.push({
      title: "Rendimiento bajo según Google PageSpeed",
      category: "Performance",
      severity: "high",
      icon: "gauge",
    });
  } else if (performance < 75) {
    issues.push({
      title: "Rendimiento mejorable según Google PageSpeed",
      category: "Performance",
      severity: "med",
      icon: "gauge",
    });
  }

  return issues;
}

function calcularScore({ htmlData, performance, issues }) {
  let score = 100;

  if (!htmlData.hasTitle) score -= 15;
  if (!htmlData.hasMetaDescription) score -= 12;
  if (!htmlData.hasH1) score -= 8;

  issues.forEach((issue) => {
    if (issue.category === "RGPD") {
      if (issue.severity === "high") score -= 12;
      if (issue.severity === "med") score -= 7;
      if (issue.severity === "low") score -= 3;
    }

    if (issue.category === "Performance") {
      if (issue.severity === "high") score -= 10;
      if (issue.severity === "med") score -= 5;
    }
  });

  if (performance !== null) {
    score = Math.round(score * 0.65 + performance * 0.35);
  }

  return Math.max(0, Math.min(100, score));
}

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});