(() => {
  "use strict";
  const KEY = "copaIngenium.v1";
  const $ = id => document.getElementById(id);
  const escapar = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[c]);
  const leer = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || { teams: [], matches: [] }; }
    catch { return { teams: [], matches: [] }; }
  };
  function renderizar() {
    const state = leer();
    const teams = Array.isArray(state.teams) ? state.teams : [];
    const matches = Array.isArray(state.matches) ? state.matches : [];
    const approved = matches.filter(m => m.approved);
    const pending = matches.filter(m => !m.approved && m.teamA && m.teamB);
    const final = matches.find(m => m.id === "FINAL");
    const third = matches.find(m => m.id === "TERCER");
    const nombre = id => teams.find(t => t.id === id)?.name || "Por definir";
    $("scoreboard-teams").textContent = String(teams.length);
    $("scoreboard-approved").textContent = String(approved.length);
    $("scoreboard-pending").textContent = String(pending.length);
    $("scoreboard-status").textContent = state.eventStatus || "En preparación";
    $("scoreboard-champion").textContent = final?.approved && final.winner ? nombre(final.winner) : "—";
    $("scoreboard-runnerup").textContent = final?.approved && final.winner
      ? `Subcampeón: ${nombre(final.winner === final.teamA ? final.teamB : final.teamA)}`
      : "Aún por definir";
    $("scoreboard-updated").textContent = state.updatedAt
      ? `Última actualización registrada: ${new Date(state.updatedAt).toLocaleString("es-CO")}.`
      : "No hay datos de torneo guardados.";

    const container = $("scoreboard-results");
    if (!container) return;
    if (!matches.length) {
      container.innerHTML = '<div class="empty-state"><strong>Aún no hay resultados</strong><p>Importa los equipos y genera la llave para comenzar.</p></div>';
      return;
    }
    const orden = ["CF1","CF2","CF3","CF4","SF1","SF2","TERCER","FINAL"];
    const sorted = [...matches].sort((a,b) => orden.indexOf(a.id) - orden.indexOf(b.id));
    container.innerHTML = sorted.map(m => {
      const a = nombre(m.teamA), b = nombre(m.teamB);
      const resultado = m.approved ? `${m.scoreA} — ${m.scoreB}` : "Pendiente";
      const ganador = m.approved && m.winner ? nombre(m.winner) : "";
      return `<article class="scoreboard-result ${m.approved ? "is-approved" : ""}">
        <div class="scoreboard-result-meta"><span>${escapar(m.stage || m.id)}</span><span class="result-status">${m.approved ? "Validado" : (m.teamA && m.teamB ? "Por jugar" : "Por definir")}</span></div>
        <div class="scoreboard-teams"><strong>${escapar(a)}</strong><span class="score-number">${escapar(resultado)}</span><strong>${escapar(b)}</strong></div>
        ${ganador ? `<p class="scoreboard-winner">Ganador oficial: ${escapar(ganador)}${m.tiebreakMethod ? ` · Desempate: ${escapar(m.tiebreakMethod)}` : ""}</p>` : ""}
        ${m.notes ? `<p class="muted">${escapar(m.notes)}</p>` : ""}
      </article>`;
    }).join("");
  }
  window.addEventListener("storage", event => { if (!event.key || event.key === KEY) renderizar(); });
  window.addEventListener("copaIngenium:actualizar", renderizar);
  renderizar();
})();
