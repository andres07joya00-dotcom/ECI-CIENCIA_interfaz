(() => {
  "use strict";
  const safeRead = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch { return fallback; }
  };
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  function actualizarPanel() {
    const questions = safeRead("copaIngeniumPreguntas", []);
    const tournament = safeRead("copaIngenium.v1", {});
    const control = safeRead("copaIngeniumEstadoControl", {});
    const matches = Array.isArray(tournament.matches) ? tournament.matches : [];
    const teams = Array.isArray(tournament.teams) ? tournament.teams : [];
    const approved = matches.filter(match => match.approved).length;
    const questionCount = Array.isArray(questions) ? questions.length : 0;

    set("question-count", questionCount);
    set("dashboard-match-count", matches.length ? `${approved}/${matches.length}` : "0");
    set("dashboard-team-count", `${teams.length}/8`);
    set("dashboard-next", matches.find(match => !match.approved && match.teamA && match.teamB)?.id
      || (tournament.drawDone ? "Esperando resultados" : "Por configurar"));
    set("dashboard-status", tournament.eventStatus || (questionCount ? "Datos cargados" : "En preparación"));
    set("active-question", control.question ? (control.published ? "Publicada" : "Seleccionada") : "—");
    set("dashboard-question-note", questionCount ? "Preguntas listas para validar" : "Importa el banco de preguntas");
    set("dashboard-question-note-active", control.question
      ? (control.status === "running" ? "Cronómetro en marcha" : control.published ? "Visible en proyección" : "Aún no publicada")
      : "Concurso sin iniciar");
  }
  window.addEventListener("storage", actualizarPanel);
  window.addEventListener("copaIngenium:actualizar", actualizarPanel);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) actualizarPanel(); });
  actualizarPanel();
  window.setInterval(actualizarPanel, 2500);
})();
