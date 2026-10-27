
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

  const $ = (tag, attrs = {}, children = []) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "text") el.textContent = value;
      else if (key === "className") el.className = value;
      else if (key === "style") el.style.cssText = value;
      else el.setAttribute(key, value);
    });
    children.forEach(child => el.appendChild(child));
    return el;
  };

  function mostrarPantalla(titulo, mensaje, formulario = null) {
    let overlay = document.getElementById("supabase-auth-overlay");
    if (!overlay) {
      overlay = $("div", { id: "supabase-auth-overlay", style: "position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:24px;background:rgba(8,15,32,.92);font-family:system-ui,sans-serif;color:#172033;" });
      document.body.appendChild(overlay);
    }
    const card = $("section", { style: "box-sizing:border-box;width:min(100%,440px);padding:28px;border-radius:18px;background:#fff;box-shadow:0 24px 80px rgba(0,0,0,.35);" });
    card.appendChild($("h2", { text: titulo, style: "margin:0 0 10px;font-size:1.45rem;" }));
    card.appendChild($("p", { text: mensaje, style: "margin:0 0 18px;line-height:1.55;color:#475569;white-space:pre-line;" }));
    if (formulario) card.appendChild(formulario);
    overlay.replaceChildren(card);
    return overlay;
  }

  function aviso(texto, error = false) {
    let el = document.getElementById("supabase-sync-status");
    if (!el) {
      el = $("div", { id: "supabase-sync-status", style: "position:fixed;right:16px;bottom:16px;z-index:9999;max-width:min(420px,calc(100vw - 32px));padding:10px 14px;border-radius:10px;background:#0f172a;color:#fff;font:13px/1.45 system-ui,sans-serif;box-shadow:0 8px 30px #0002;" });
      document.body.appendChild(el);
    }
    el.style.background = error ? "#991b1b" : "#0f172a";
    el.textContent = texto;
    clearTimeout(aviso.timer);
    aviso.timer = setTimeout(() => el.remove(), error ? 9000 : 3200);
  }

  function esClaveGestionada(key) { return KEYS.includes(key); }

  async function upsertEstado(client, key, value) {
    const { error } = await client.from("app_state").upsert({
      key,
      data: value,
      updated_at: new Date().toISOString()
    }, { onConflict: "key" });
    if (error) throw error;
  }

  async function iniciar() {
    const config = window.COPA_SUPABASE_CONFIG;
    if (!window.supabase?.createClient) {
      mostrarPantalla("No se pudo conectar", "No se cargó la librería de Supabase. Comprueba tu conexión a Internet y vuelve a cargar la página.");
      throw new Error("SDK de Supabase no disponible.");
    }
    if (!config || !config.url?.startsWith("https://") || !config.publishableKey ||
        config.url.includes("PEGA_AQUI") || config.publishableKey.includes("PEGA_AQUI")) {
      mostrarPantalla("Falta configurar Supabase", "Abre js/core/supabase-config.js y pega la Project URL y la Publishable key de tu proyecto. No uses una secret key ni service_role.");
      throw new Error("Faltan credenciales públicas de Supabase.");
    }

    const client = window.supabase.createClient(config.url, config.publishableKey);
    window.copaSupabase = client;

    async function pedirInicioSesion(errorPrevio = "") {
      const form = $("form", { style: "display:grid;gap:12px;" });
      const email = $("input", { type: "email", required: "required", autocomplete: "username", placeholder: "Correo del moderador", style: "box-sizing:border-box;width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:9px;font:inherit;" });
      const password = $("input", { type: "password", required: "required", autocomplete: "current-password", placeholder: "Contraseña", style: "box-sizing:border-box;width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:9px;font:inherit;" });
      const submit = $("button", { type: "submit", text: "Iniciar sesión", style: "padding:12px;border:0;border-radius:9px;background:#1d4ed8;color:white;font-weight:700;font:inherit;cursor:pointer;" });
      const errorText = $("p", { text: errorPrevio, style: "margin:0;color:#b91c1c;font-size:.9rem;" });
      form.append(email, password, submit, errorText);
      form.addEventListener("submit", async event => {
        event.preventDefault();
        submit.disabled = true;
        submit.textContent = "Verificando…";
        errorText.textContent = "";
        const { error } = await client.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
        if (error) {
          errorText.textContent = "No se pudo iniciar sesión. Verifica el correo, la contraseña y el usuario creado en Supabase Auth.";
          submit.disabled = false;
          submit.textContent = "Iniciar sesión";
          return;
        }
        document.getElementById("supabase-auth-overlay")?.remove();
      });
      mostrarPantalla("Copa Ingenium · Acceso", "Inicia sesión con la cuenta de moderador creada en Supabase Authentication para cargar y guardar los datos compartidos.", form);
      await new Promise((resolve, reject) => {
        const check = setInterval(async () => {
          const { data } = await client.auth.getSession();
          if (data.session) { clearInterval(check); resolve(); }
        }, 250);
        setTimeout(() => {
          if (!document.getElementById("supabase-auth-overlay")) { clearInterval(check); resolve(); }
        }, 60 * 60 * 1000);
      });
    }

    let { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) await pedirInicioSesion();
    ({ data: sessionData, error: sessionError } = await client.auth.getSession());
    if (sessionError || !sessionData.session) throw sessionError || new Error("No hay sesión activa.");

    // La tabla compartida es la fuente principal. Si aún está vacía, se migran
    // a ella las claves locales presentes en este navegador, sin borrarlas.
    const { data: remotos, error: loadError } = await client
      .from("app_state").select("key,data").in("key", KEYS);
    if (loadError) {
      mostrarPantalla("No se pudo leer la base de datos", "Verifica que ejecutaste el SQL de configuración y que las políticas RLS permiten acceso a usuarios autenticados.\n\nDetalle: " + loadError.message);
      throw loadError;
    }
    const remotosPorClave = new Map((remotos || []).map(row => [row.key, row.data]));
    for (const key of KEYS) {
      if (remotosPorClave.has(key)) {
        localStorage.setItem(key, JSON.stringify(remotosPorClave.get(key)));
      } else {
        const local = localStorage.getItem(key);
        if (local !== null) {
          try { await upsertEstado(client, key, JSON.parse(local)); }
          catch (error) {
            mostrarPantalla("No se pudo migrar la información", `Falló la migración de ${key}. No se borraron los datos locales.\n\n${error.message}`);
            throw error;
          }
        }
      }
    }

    // Conserva la API síncrona de los módulos existentes y replica las claves
    // administradas en la nube. Los errores se muestran sin ocultar el dato local.
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    let remoteApply = false;
    Storage.prototype.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      if (this !== localStorage || remoteApply || !esClaveGestionada(String(key))) return;
      try {
        const parsed = JSON.parse(value);
        upsertEstado(client, String(key), parsed)
          .then(() => aviso("Cambios guardados en Supabase."))
          .catch(error => aviso("Se guardó localmente, pero falló la nube: " + error.message, true));
      } catch (error) {
        aviso("No se pudo sincronizar un dato inválido: " + error.message, true);
      }
    };
    Storage.prototype.removeItem = function(key) {
      originalRemoveItem.call(this, key);
      if (this !== localStorage || remoteApply || !esClaveGestionada(String(key))) return;
      client.from("app_state").delete().eq("key", String(key))
        .then(({ error }) => { if (error) aviso("No se pudo eliminar el dato de la nube: " + error.message, true); });
    };

    // Escucha actualizaciones de otros navegadores. No sobrescribe el dato local
    // si el JSON ya coincide, evitando ciclos de sincronización innecesarios.
    client.channel("copa-ingenium-app-state")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, payload => {
        const row = payload.new;
        const old = payload.old;
        const key = row?.key || old?.key;
        if (!esClaveGestionada(key)) return;
        remoteApply = true;
        try {
          if (payload.eventType === "DELETE") {
            originalRemoveItem.call(localStorage, key);
          } else {
            const next = JSON.stringify(row.data);
            if (localStorage.getItem(key) !== next) originalSetItem.call(localStorage, key, next);
          }
          window.dispatchEvent(new Event("copaIngenium:actualizar"));
          if (payload.eventType !== "DELETE") aviso("Datos actualizados desde otro equipo.");
        } finally { remoteApply = false; }
      })
      .subscribe();

    const badge = $("div", { style: "position:fixed;left:16px;bottom:16px;z-index:9998;padding:7px 10px;border-radius:999px;background:#dcfce7;color:#166534;font:12px system-ui,sans-serif;box-shadow:0 4px 18px #0001;" , text: "● Supabase conectado" });
    document.body.appendChild(badge);
    window.copaIngeniumSupabaseReady = true;
  }

  window.copaIngeniumIniciarSupabase = iniciar;
})();
