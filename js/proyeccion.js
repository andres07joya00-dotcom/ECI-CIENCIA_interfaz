
/* =========================================
   PROYECCIÓN DE CONCURSANTES
========================================= */

(() => {
  const STATE_KEY = "copaIngeniumEstadoControl";
  const CHANNEL_NAME = "copaIngeniumConcurso";

  const $ = id => document.getElementById(id);

  const colores = {
    mecanica: "#64748b",
    electrica: "#ca8a04",
    electronica: "#0891b2",
    biomedica: "#db2777",
    civil: "#92400e",
    sistemas: "#2563eb",
    ambiental: "#16a34a",
    estadistica: "#7c3aed",
    industrial: "#ea580c",
    ciencias_basicas: "#4f46e5",
    cultura_general: "#0f766e",
    julio_garavito: "#b91c1c"
  };

  const areas = {
    mecanica: "Ingeniería Mecánica",
    electrica: "Ingeniería Eléctrica",
    electronica: "Ingeniería Electrónica",
    biomedica: "Ingeniería Biomédica",
    civil: "Ingeniería Civil",
    sistemas: "Ingeniería de Sistemas",
    ambiental: "Ingeniería Ambiental",
    estadistica: "Estadística",
    industrial: "Ingeniería Industrial",
    ciencias_basicas: "Ciencias Básicas",
    cultura_general: "Cultura General",
    julio_garavito: "Julio Garavito"
  };

  const tipos = {
    ordinaria: "ORDINARIA",
    desempate: "DESEMPATE RÁPIDO",
    reserva: "RESERVA"
  };

  const dificultades = {
    baja: "FÁCIL",
    media: "INTERMEDIA",
    alta: "DIFÍCIL"
  };

  const puntos = { baja: 3, media: 4, alta: 5 };

  let estado = {};
  let ultimaVersion = null;

  function leerEstado() {
    try {
      return JSON.parse(localStorage.getItem(STATE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function formatoTiempo(ms) {
    const total = Math.ceil(Math.max(0, ms) / 1000);
    const minutos = Math.floor(total / 60);
    const segundos = total % 60;

    return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
  }

  function restante() {
    if (estado.status === "running" && estado.deadline) {
      return Math.max(0, estado.deadline - Date.now());
    }

    return Math.max(0, Number(estado.remainingMs) || 0);
  }

  function renderizarPregunta() {
    const p = estado.question;

    $("proy-tarjeta").style.setProperty(
      "--projection-color",
      colores[p.categoria] || "#7160df"
    );

    $("proy-area").textContent = areas[p.categoria] || "COPA INGENIUM";
    $("proy-tipo").textContent = tipos[p.tipo] || "CONCURSO ACADÉMICO";
    $("proy-enfrentamiento").textContent =
      estado.enfrentamiento || p.enfrentamiento || "COPA INGENIUM";

    $("proy-pregunta").textContent = p.enunciado || "";

    $("proy-opciones").innerHTML = ["A", "B", "C", "D"].map(letra => {
      const correcta = estado.revealed && p.correcta === letra;

      return `
        <article class="projection-option ${correcta ? "correct-option" : ""}">
          <span>${letra}</span>
          <p>${escapar(p.opciones?.[letra] || "")}</p>
        </article>
      `;
    }).join("");

    $("proy-dificultad").textContent =
      `DIFICULTAD: ${dificultades[p.dificultad] || "—"}`;

    $("proy-puntos").textContent =
      `VALOR: ${puntos[p.dificultad] || 0} PUNTOS`;

    $("proy-tiempo").textContent =
      `TIEMPO: ${estado.seconds || 20} SEGUNDOS`;

    $("proy-estado").textContent = estado.revealed
      ? "RESPUESTA REVELADA"
      : estado.status === "running"
        ? "PREGUNTA EN CURSO"
        : estado.status === "paused"
          ? "TIEMPO PAUSADO"
          : estado.status === "finished"
            ? "TIEMPO FINALIZADO"
            : "PREGUNTA PUBLICADA";
  }

  function escapar(texto = "") {
    return String(texto).replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[c]);
  }

  function actualizar() {
    const nuevoEstado = leerEstado();
    const nuevaVersion = nuevoEstado.updatedAt || null;

    if (nuevaVersion !== ultimaVersion) {
      estado = nuevoEstado;
      ultimaVersion = nuevaVersion;

      if (estado.published && estado.question) {
        renderizarPregunta();
      } else {
        $("proy-estado").textContent = "ESPERANDO AL MODERADOR";
      }
    }

    if (!estado.published || !estado.question) {
      $("proy-cronometro").textContent = "--:--";
      return;
    }

    const ms = restante();
    $("proy-cronometro").textContent = formatoTiempo(ms);

    if (estado.status === "running" && ms <= 0) {
      $("proy-estado").textContent = "TIEMPO FINALIZADO";
    }
  }

  window.addEventListener("storage", evento => {
    if (evento.key === STATE_KEY) actualizar();
  });

  if ("BroadcastChannel" in window) {
    const canal = new BroadcastChannel(CHANNEL_NAME);

    canal.addEventListener("message", evento => {
      estado = evento.data || {};
      ultimaVersion = estado.updatedAt || null;

      if (estado.published && estado.question) {
        renderizarPregunta();
      }

      actualizar();
    });
  }

  actualizar();
  window.setInterval(actualizar, 200);
})();
