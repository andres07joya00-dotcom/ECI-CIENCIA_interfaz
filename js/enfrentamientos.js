

(() => {
  "use strict";

  const STORAGE_KEY = "copaIngenium.v1";
  const $ = (id) => document.getElementById(id);

  const estadoInicial = () => ({
    teams: [],
    matches: [],
    drawDone: false,
    eventStatus: "En preparación",
    updatedAt: new Date().toISOString()
  });

  let state;

  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || estadoInicial();
  } catch {
    state = estadoInicial();
  }

  function guardarEstado() {
    state.updatedAt = new Date().toISOString();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderizar();
    } catch (error) {
      alert("No se pudieron guardar los datos: " + error.message);
    }
  }

  function escapar(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, caracter => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[caracter]);
  }

  function normalizar(texto) {
    return String(texto ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function generarId() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  }

  function obtenerEquipo(id) {
    return state.teams.find(equipo => equipo.id === id);
  }

  function nombreEquipo(id) {
    if (!id) return "Por definir";
    return obtenerEquipo(id)?.name || "Equipo no encontrado";
  }

  function obtenerEnfrentamiento(id) {
    return state.matches.find(enfrentamiento =>
      enfrentamiento.id === id
    );
  }

  function crearEnfrentamiento(id, etapa, equipoA = null, equipoB = null) {
    return {
      id,
      stage: etapa,
      teamA: equipoA,
      teamB: equipoB,
      scoreA: 0,
      scoreB: 0,
      status: "Pendiente",
      winner: null,
      approved: false,
      tiebreakMethod: "",
      notes: "",
      createdAt: new Date().toISOString()
    };
  }


  async function importarEquipos() {
    const archivo = $("archivo-equipos")?.files?.[0];
    const mensaje = $("mensaje-equipos");

    if (!archivo) {
      if (mensaje) {
        mensaje.textContent = "Selecciona un archivo Excel primero.";
      }
      return;
    }

    if (!window.XLSX) {
      if (mensaje) {
        mensaje.textContent =
          "No se encontró XLSX. Revisa la conexión de la librería Excel.";
      }
      return;
    }

    try {
      const buffer = await archivo.arrayBuffer();
      const libro = XLSX.read(buffer);
      const hoja = libro.Sheets[libro.SheetNames[0]];

      const filas = XLSX.utils.sheet_to_json(hoja, {
        defval: "",
        raw: false
      });

      if (!filas.length) {
        throw new Error("La primera hoja del Excel está vacía.");
      }

      const columnas = Object.keys(filas[0]);

      const columnaNombre = columnas.find(columna =>
        ["equipo", "nombre", "nombre equipo", "nombre del equipo", "team"]
          .includes(normalizar(columna))
      );

      const columnaCapitan = columnas.find(columna =>
        ["capitan", "vocero", "representante"]
          .includes(normalizar(columna))
      );

      if (!columnaNombre) {
        throw new Error(
          "Debe existir una columna llamada Equipo o Nombre."
        );
      }

      const filasValidas = filas.filter(fila =>
        String(fila[columnaNombre] ?? "").trim()
      );

      const nombres = filasValidas.map(fila =>
        String(fila[columnaNombre]).trim()
      );

      const nombresNormalizados = nombres.map(normalizar);

      if (new Set(nombresNormalizados).size !== nombres.length) {
        throw new Error("El archivo contiene nombres de equipos repetidos.");
      }

      if (nombres.length !== 8) {
        throw new Error(
          `Se requieren 8 equipos para generar la llave. ` +
          `El archivo contiene ${nombres.length}.`
        );
      }

      if (
        state.drawDone &&
        !confirm(
          "Ya existe una llave de enfrentamientos. " +
          "¿Quieres reemplazar los equipos y borrar los resultados?"
        )
      ) {
        return;
      }

      state.teams = filasValidas.map(fila => ({
        id: generarId(),
        name: String(fila[columnaNombre]).trim(),
        captain: columnaCapitan
          ? String(fila[columnaCapitan] ?? "").trim()
          : ""
      }));

      state.matches = [];
      state.drawDone = false;
      state.drawOrder = [];
      state.eventStatus = "Equipos cargados";

      guardarEstado();

      if (mensaje) {
        mensaje.textContent =
          "Importación correcta: 8 equipos. " +
          "Revisa la lista antes de realizar el sorteo.";
      }
    } catch (error) {
      if (mensaje) {
        mensaje.textContent = "Error al importar: " + error.message;
      }
    }
  }


  function generarLlave() {
    if (state.teams.length !== 8) {
      alert("Primero debes importar exactamente 8 equipos.");
      return;
    }

    if (
      state.drawDone &&
      !confirm(
        "Ya existe una llave. Si continúas, se perderán " +
        "los resultados registrados. ¿Deseas continuar?"
      )
    ) {
      return;
    }

    const equiposSorteados = [...state.teams];

    // Mezcla aleatoria para un sorteo inicial.
    for (let i = equiposSorteados.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [equiposSorteados[i], equiposSorteados[j]] =
        [equiposSorteados[j], equiposSorteados[i]];
    }

    const cuartos = [
      crearEnfrentamiento(
        "CF1", "Cuartos de final",
        equiposSorteados[0].id, equiposSorteados[1].id
      ),
      crearEnfrentamiento(
        "CF2", "Cuartos de final",
        equiposSorteados[2].id, equiposSorteados[3].id
      ),
      crearEnfrentamiento(
        "CF3", "Cuartos de final",
        equiposSorteados[4].id, equiposSorteados[5].id
      ),
      crearEnfrentamiento(
        "CF4", "Cuartos de final",
        equiposSorteados[6].id, equiposSorteados[7].id
      )
    ];

    const semifinales = [
      crearEnfrentamiento("SF1", "Semifinal"),
      crearEnfrentamiento("SF2", "Semifinal")
    ];

    const final = crearEnfrentamiento("FINAL", "Final");
    const tercerPuesto = crearEnfrentamiento(
      "TERCER", "Tercer puesto"
    );

    state.matches = [
      ...cuartos,
      ...semifinales,
      final,
      tercerPuesto
    ];

    state.drawOrder = equiposSorteados.map((equipo, indice) => ({
      position: indice + 1,
      teamId: equipo.id
    }));

    state.drawDone = true;
    state.eventStatus = "Llave sorteada";

    guardarEstado();
  }


  function perdedor(enfrentamiento) {
    if (!enfrentamiento?.approved || !enfrentamiento.winner) {
      return null;
    }

    return enfrentamiento.winner === enfrentamiento.teamA
      ? enfrentamiento.teamB
      : enfrentamiento.teamA;
  }

  function sincronizarLlave() {
    if (!state.drawDone) return;

    const reglasAvance = [
      { destino: "SF1", origenA: "CF1", origenB: "CF2" },
      { destino: "SF2", origenA: "CF3", origenB: "CF4" },
      { destino: "FINAL", origenA: "SF1", origenB: "SF2" }
    ];

    for (const regla of reglasAvance) {
      const destino = obtenerEnfrentamiento(regla.destino);
      const origenA = obtenerEnfrentamiento(regla.origenA);
      const origenB = obtenerEnfrentamiento(regla.origenB);

      if (!destino || destino.approved) continue;

      destino.teamA = origenA?.winner || null;
      destino.teamB = origenB?.winner || null;

      destino.status =
        destino.teamA && destino.teamB ? "Listo" : "Pendiente";
    }

    const tercerPuesto = obtenerEnfrentamiento("TERCER");
    const semifinal1 = obtenerEnfrentamiento("SF1");
    const semifinal2 = obtenerEnfrentamiento("SF2");

    if (tercerPuesto && !tercerPuesto.approved) {
      tercerPuesto.teamA = perdedor(semifinal1);
      tercerPuesto.teamB = perdedor(semifinal2);

      tercerPuesto.status =
        tercerPuesto.teamA && tercerPuesto.teamB
          ? "Listo"
          : "Pendiente";
    }
  }


  function validarResultado(id) {
    const enfrentamiento = obtenerEnfrentamiento(id);

    if (!enfrentamiento) {
      alert("No se encontró el enfrentamiento.");
      return;
    }

    if (!enfrentamiento.teamA || !enfrentamiento.teamB) {
      alert("Este enfrentamiento todavía no tiene dos equipos definidos.");
      return;
    }

    if (enfrentamiento.approved) {
      alert("Este resultado ya está validado.");
      return;
    }

    const entradaA = $(`score-a-${id}`);
    const entradaB = $(`score-b-${id}`);

    const puntajeA = Number(entradaA?.value);
    const puntajeB = Number(entradaB?.value);

    if (
      entradaA?.value === "" ||
      entradaB?.value === "" ||
      !Number.isInteger(puntajeA) ||
      !Number.isInteger(puntajeB) ||
      puntajeA < 0 ||
      puntajeB < 0
    ) {
      alert("Introduce dos puntajes enteros válidos.");
      return;
    }

    let ganador = null;
    let criterioDesempate = "";

    if (puntajeA > puntajeB) {
      ganador = enfrentamiento.teamA;
    } else if (puntajeB > puntajeA) {
      ganador = enfrentamiento.teamB;
    } else {
      const selector = $(`desempate-${id}`);

      if (!selector?.value) {
        alert(
          "El marcador está empatado. Selecciona el ganador " +
          "según el acta oficial de desempate."
        );
        return;
      }

      criterioDesempate = selector.value;

      const ganadorEsA = criterioDesempate.endsWith("A");

      ganador = ganadorEsA
        ? enfrentamiento.teamA
        : enfrentamiento.teamB;
    }

    const resumen =
      `${nombreEquipo(enfrentamiento.teamA)} ${puntajeA} - ` +
      `${puntajeB} ${nombreEquipo(enfrentamiento.teamB)}\n\n` +
      `Ganador propuesto: ${nombreEquipo(ganador)}\n\n` +
      "¿Confirmas el resultado como moderador?";

    if (!confirm(resumen)) return;

    enfrentamiento.scoreA = puntajeA;
    enfrentamiento.scoreB = puntajeB;
    enfrentamiento.winner = ganador;
    enfrentamiento.tiebreakMethod = criterioDesempate;
    enfrentamiento.status = "Resultado validado";
    enfrentamiento.approved = true;
    enfrentamiento.approvedAt = new Date().toISOString();
    enfrentamiento.approvedBy = "Moderador";

    state.eventStatus = "En competencia";

    sincronizarLlave();
    guardarEstado();
  }


  function renderizarEquipos() {
    const contenedor = $("lista-equipos");
    const contador = $("team-count");

    if (contador) {
      contador.textContent = `${state.teams.length}/8`;
    }

    if (!contenedor) return;

    if (!state.teams.length) {
      contenedor.innerHTML =
        '<p class="empty-message">Aún no hay equipos importados.</p>';
      return;
    }

    contenedor.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>N.º</th>
              <th>Equipo</th>
              <th>Capitán/vocero</th>
            </tr>
          </thead>
          <tbody>
            ${state.teams.map((equipo, indice) => `
              <tr>
                <td>${indice + 1}</td>
                <td>${escapar(equipo.name)}</td>
                <td>${escapar(equipo.captain || "—")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }


  function renderizarEnfrentamiento(enfrentamiento) {
    const id = enfrentamiento.id;
    const disponible =
      Boolean(enfrentamiento.teamA && enfrentamiento.teamB);

    const bloqueado =
      !disponible || enfrentamiento.approved;

    const opcionesDesempate = [
      ["turnoA", "Pregunta rápida: gana equipo A"],
      ["turnoB", "Pregunta rápida: gana equipo B"],
      ["altosA", "Criterio final: nivel alto, equipo A"],
      ["altosB", "Criterio final: nivel alto, equipo B"],
      ["bonosA", "Criterio final: bonos de velocidad, equipo A"],
      ["bonosB", "Criterio final: bonos de velocidad, equipo B"],
      ["sorteoA", "Sorteo público: gana equipo A"],
      ["sorteoB", "Sorteo público: gana equipo B"]
    ];

    return `
      <article class="panel match-card">
        <div class="panel-title">
          <h3>${escapar(id)} · ${escapar(enfrentamiento.stage)}</h3>
          <span class="status-pill">${escapar(enfrentamiento.status)}</span>
        </div>

        <div class="match-teams">
          <div>
            <strong>${escapar(nombreEquipo(enfrentamiento.teamA))}</strong>
            <label for="score-a-${id}">Puntaje</label>
            <input
              id="score-a-${id}"
              type="number"
              min="0"
              step="1"
              value="${enfrentamiento.scoreA}"
              ${bloqueado ? "disabled" : ""}
            >
          </div>

          <span class="versus">VS</span>

          <div>
            <strong>${escapar(nombreEquipo(enfrentamiento.teamB))}</strong>
            <label for="score-b-${id}">Puntaje</label>
            <input
              id="score-b-${id}"
              type="number"
              min="0"
              step="1"
              value="${enfrentamiento.scoreB}"
              ${bloqueado ? "disabled" : ""}
            >
          </div>
        </div>

        ${disponible && !enfrentamiento.approved ? `
          <label for="desempate-${id}">
            Criterio oficial, únicamente si hay empate
          </label>
          <select id="desempate-${id}">
            <option value="">Seleccionar si hay empate</option>
            ${opcionesDesempate.map(([valor, etiqueta]) => `
              <option value="${valor}">${escapar(etiqueta)}</option>
            `).join("")}
          </select>

          <button
            type="button"
            class="primary-button"
            data-validar-enfrentamiento="${id}"
          >
            Revisar y validar resultado
          </button>
        ` : ""}

        ${enfrentamiento.approved ? `
          <p class="muted">
            Resultado confirmado por moderación.
            Ganador:
            <strong>${escapar(nombreEquipo(enfrentamiento.winner))}</strong>
          </p>
        ` : ""}

        ${!disponible ? `
          <p class="muted">
            Esperando la validación de los enfrentamientos anteriores.
          </p>
        ` : ""}
      </article>
    `;
  }


  function renderizarLlave() {
    const contenedor = $("llave-enfrentamientos");

    if (!contenedor) return;

    if (!state.drawDone) {
      contenedor.innerHTML = `
        <p class="empty-message">
          Importa los ocho equipos y genera el sorteo para construir la llave.
        </p>
      `;
      return;
    }

    const sorteo = `
      <div class="panel">
        <h3>Orden del sorteo</h3>
        <ol>
          ${(state.drawOrder || []).map(item => `
            <li>${escapar(nombreEquipo(item.teamId))}</li>
          `).join("")}
        </ol>
        <p class="muted">
          Conserva el registro del sorteo para el acta de la competencia.
        </p>
      </div>
    `;

    const enfrentamientos = state.matches
      .map(renderizarEnfrentamiento)
      .join("");

    contenedor.innerHTML = `
      ${sorteo}
      <div class="matches-grid">${enfrentamientos}</div>
    `;
  }

  function renderizarPanel() {
    const ponerTexto = (id, texto) => {
      const elemento = $(id);
      if (elemento) elemento.textContent = texto;
    };

    const validados = state.matches.filter(
      enfrentamiento => enfrentamiento.approved
    ).length;

    ponerTexto(
      "match-count",
      state.matches.length
        ? `${validados}/${state.matches.length}`
        : "0"
    );

    ponerTexto("estado-torneo", state.eventStatus);
    ponerTexto("dashboard-team-count", `${state.teams.length}/8`);

    const siguiente = state.matches.find(enfrentamiento =>
      !enfrentamiento.approved &&
      enfrentamiento.teamA &&
      enfrentamiento.teamB
    );

    ponerTexto(
      "dashboard-next",
      siguiente?.id ||
        (state.drawDone ? "Esperando resultados" : "Importar equipos")
    );

    ponerTexto(
      "dashboard-last-update",
      new Date(state.updatedAt).toLocaleString("es-CO")
    );
  }

  function renderizar() {
    sincronizarLlave();
    renderizarEquipos();
    renderizarLlave();
    renderizarPanel();
  }


  document.addEventListener("click", event => {
    const botonPagina = event.target.closest("[data-page]");

    if (botonPagina) {
      const pagina = botonPagina.dataset.page;

      document.querySelectorAll(".page-section").forEach(seccion => {
        seccion.classList.add("hidden");
      });

      document.querySelectorAll("[data-page]").forEach(boton => {
        boton.classList.remove("active");
      });

      $(`page-${pagina}`)?.classList.remove("hidden");

      document.querySelectorAll(`[data-page="${pagina}"]`).forEach(boton => {
        boton.classList.add("active");
      });

      const titulos = {
        inicio: "Panel principal",
        preguntas: "Banco de preguntas",
        enfrentamientos: "Enfrentamientos",
        concurso: "Control del concurso",
        marcador: "Marcador",
        configuracion: "Configuración"
      };

      if ($("page-title")) {
        $("page-title").textContent =
          titulos[pagina] || "Copa Ingenium";
      }

      return;
    }

    const botonValidar = event.target.closest(
      "[data-validar-enfrentamiento]"
    );

    if (botonValidar) {
      validarResultado(botonValidar.dataset.validarEnfrentamiento);
    }
  });

  $("importar-equipos")?.addEventListener("click", importarEquipos);
  $("generar-llave")?.addEventListener("click", generarLlave);

  $("reiniciar-torneo")?.addEventListener("click", () => {
    if (!confirm(
      "Esto borrará la llave y los resultados guardados en este navegador. ¿Continuar?"
    )) {
      return;
    }

    state = estadoInicial();
    guardarEstado();
  });

  // Inicializar el módulo.
  renderizar();

})();
