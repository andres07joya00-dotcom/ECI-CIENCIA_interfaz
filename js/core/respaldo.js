(() => {
  "use strict";
  const KEYS = [
    "copaIngeniumPreguntas",
    "copaIngeniumProgramacion",
    "copaIngeniumPreguntasUsadas",
    "copaIngeniumProgresoProgramacion",
    "copaIngeniumEstadoControl",
    "copaIngenium.v1",
    "copaIngeniumChecklist"
  ];
  const $ = id => document.getElementById(id);
  const mensaje = (text, error = false) => {
    const el = $("backup-message");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("message-error", error);
    el.classList.toggle("message-success", !error);
  };
  const leer = key => {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  };
  function exportar() {
    const data = {};
    KEYS.forEach(key => {
      const value = leer(key);
      if (value !== null) data[key] = value;
    });
    const backup = {
      app: "Copa Ingenium",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      data
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `copa-ingenium-respaldo-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    mensaje("Respaldo descargado. Comprueba que el archivo aparezca en Descargas y guárdalo fuera de este equipo.");
  }
  function validar(data) {
    if (!data || typeof data !== "object" || data.app !== "Copa Ingenium" ||
        data.formatVersion !== 1 || !data.data || typeof data.data !== "object") {
      throw new Error("El archivo no tiene el formato de respaldo de Copa Ingenium.");
    }
    const d = data.data;
    if (d.copaIngeniumPreguntas !== undefined && !Array.isArray(d.copaIngeniumPreguntas)) {
      throw new Error("El banco de preguntas del respaldo no tiene un formato válido.");
    }
    if (d.copaIngeniumProgramacion !== undefined && !Array.isArray(d.copaIngeniumProgramacion)) {
      throw new Error("La programación del respaldo no tiene un formato válido.");
    }
    if (d.copaIngeniumPreguntasUsadas !== undefined && !Array.isArray(d.copaIngeniumPreguntasUsadas)) {
      throw new Error("El registro de preguntas usadas no tiene un formato válido.");
    }
    if (d["copaIngenium.v1"] !== undefined) {
      const t = d["copaIngenium.v1"];
      if (!t || typeof t !== "object" || !Array.isArray(t.teams) || !Array.isArray(t.matches)) {
        throw new Error("Los datos del torneo no tienen un formato válido.");
      }
    }
    Object.keys(d).forEach(key => {
      if (!KEYS.includes(key)) throw new Error(`El respaldo contiene una clave no reconocida: ${key}`);
    });
    return d;
  }
  async function importar() {
    const file = $("backup-import-file")?.files?.[0];
    if (!file) { mensaje("Selecciona primero un archivo .json de respaldo.", true); return; }
    if (file.size > 15 * 1024 * 1024) { mensaje("El respaldo supera el límite de 15 MB.", true); return; }
    let payload;
    try {
      payload = JSON.parse(await file.text());
      const data = validar(payload);
      const presentKeys = Object.keys(data);
      if (!presentKeys.length) throw new Error("El respaldo no contiene datos para restaurar.");
      const summary = [
        `Preguntas: ${Array.isArray(data.copaIngeniumPreguntas) ? data.copaIngeniumPreguntas.length : "sin incluir"}`,
        `Bloques: ${Array.isArray(data.copaIngeniumProgramacion) ? data.copaIngeniumProgramacion.length : "sin incluir"}`,
        `Equipos: ${Array.isArray(data["copaIngenium.v1"]?.teams) ? data["copaIngenium.v1"].teams.length : "sin incluir"}`
      ].join("\n");
      if (!confirm(`Vas a reemplazar los datos guardados en este navegador por el respaldo del ${payload.exportedAt || "fecha desconocida"}.\n\n${summary}\n\nDescarga un respaldo de los datos actuales antes de continuar. ¿Restaurar ahora?`)) return;

      const anteriores = {};
      KEYS.forEach(key => { anteriores[key] = localStorage.getItem(key); });
      try {
        // El respaldo reemplaza de forma explícita las claves del sistema.
        KEYS.forEach(key => localStorage.removeItem(key));
        presentKeys.forEach(key => localStorage.setItem(key, JSON.stringify(data[key])));
      } catch (error) {
        KEYS.forEach(key => {
          try {
            if (anteriores[key] === null) localStorage.removeItem(key);
            else localStorage.setItem(key, anteriores[key]);
          } catch {}
        });
        throw new Error("El navegador no pudo guardar todos los datos; se intentó restaurar el estado anterior. " + error.message);
      }
      mensaje("Respaldo restaurado correctamente. La página se recargará para cargar los datos restaurados.");
      setTimeout(() => location.reload(), 1000);
    } catch (error) {
      mensaje(error.message || "No se pudo leer el archivo de respaldo.", true);
    }
  }
  function conectarChecklist() {
    const saved = leer("copaIngeniumChecklist") || {};
    document.querySelectorAll("[data-checklist]").forEach(input => {
      const key = input.dataset.checklist;
      input.checked = Boolean(saved[key]);
      input.addEventListener("change", () => {
        const current = leer("copaIngeniumChecklist") || {};
        current[key] = input.checked;
        try {
          localStorage.setItem("copaIngeniumChecklist", JSON.stringify(current));
        } catch { mensaje("No se pudo guardar la lista de preparación.", true); }
      });
    });
  }
  $("backup-export")?.addEventListener("click", exportar);
  $("backup-import")?.addEventListener("click", importar);
  $("backup-import-file")?.addEventListener("change", () => {
    const file = $("backup-import-file").files?.[0];
    if (file) mensaje(`Archivo seleccionado: ${file.name}. Pulsa «Validar y restaurar».`);
  });
  conectarChecklist();
})();
