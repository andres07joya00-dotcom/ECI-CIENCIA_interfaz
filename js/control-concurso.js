
(() => {
  "use strict";

  const BANK_KEY = "copaIngeniumPreguntas";
  const STATE_KEY = "copaIngeniumEstadoControl";
  const PROGRAM_KEY = "copaIngeniumProgramacion";
  const USED_KEY = "copaIngeniumPreguntasUsadas";
  const PROGRESS_KEY = "copaIngeniumProgresoProgramacion";
  const CHANNEL_NAME = "copaIngeniumConcurso";

  const $ = id => document.getElementById(id);

  const AREAS = {
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

  const TIPOS = {
    ordinaria: "Ordinaria",
    desempate: "Desempate rápido",
    reserva: "Reserva"
  };

  const NIVELES = {
    baja: "Baja",
    media: "Media",
    alta: "Alta"
  };

  const PUNTOS = {
    baja: 3,
    media: 4,
    alta: 5
  };

  const COLORES = {
    mecanica: "#f97316",
    electrica: "#eab308",
    electronica: "#3b82f6",
    biomedica: "#ec4899",
    civil: "#a16207",
    sistemas: "#8b5cf6",
    ambiental: "#22c55e",
    estadistica: "#06b6d4",
    industrial: "#64748b",
    ciencias_basicas: "#14b8a6",
    cultura_general: "#d946ef",
    julio_garavito: "#ef4444"
  };

  let preguntas = [];
  let programa = [];
  let usadas = new Set();
  let indiceBloque = 0;
  let contadorBloque = 0;
  let preguntaActual = null;
  let estado = cargarEstado();
  let temporizador = null;
  let canal = null;

  function leerJSON(clave, alternativa) {
    try {
      const dato = localStorage.getItem(clave);
      return dato ? JSON.parse(dato) : alternativa;
    } catch (error) {
      console.error("No se pudo leer", clave, error);
      return alternativa;
    }
  }

  function cargarEstado() {
    return leerJSON(STATE_KEY, {
      question: null,
      published: false,
      revealed: false,
      seconds: 20,
      remainingMs: 20000,
      deadline: null,
      status: "idle"
    });
  }

  function cargarBanco() {
    const datos = leerJSON(BANK_KEY, []);
    return Array.isArray(datos) ? datos : [];
  }

  function guardarEstado(notificar = false) {
    estado.updatedAt = Math.max(Date.now(), (Number(estado.updatedAt) || 0) + 1);
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(estado));
    } catch (error) {
      mensaje("No se pudo guardar el estado del concurso. Descarga un respaldo y libera espacio en el navegador.", true);
      console.error("Error guardando el estado del concurso:", error);
      return;
    }

    if (notificar && canal) canal.postMessage(estado);
    window.dispatchEvent(new Event("copaIngenium:actualizar"));
    actualizarCronometro();
  }

  function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[caracter]);
  }

  function normalizar(valor) {
    return String(valor ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function normalizarCategoria(valor) {
    const texto = normalizar(valor).replace(/[^a-z0-9]/g, "");

    const equivalencias = {
      mecanica: "mecanica",
      ingenieriamecanica: "mecanica",
      electrica: "electrica",
      ingenieriaelectrica: "electrica",
      electronica: "electronica",
      ingenieriaelectronica: "electronica",
      biomedica: "biomedica",
      ingenieriabiomedica: "biomedica",
      civil: "civil",
      ingenieriacivil: "civil",
      sistemas: "sistemas",
      ingenieriadesistemas: "sistemas",
      ambiental: "ambiental",
      ingenieriaambiental: "ambiental",
      estadistica: "estadistica",
      industrial: "industrial",
      ingenieriaindustrial: "industrial",
      cienciasbasicas: "ciencias_basicas",
      culturageneral: "cultura_general",
      juliogaravito: "julio_garavito"
    };

    return equivalencias[texto] || texto.replace(/ /g, "_");
  }

  function normalizarTipo(valor) {
    const texto = normalizar(valor);

    if (texto.includes("desempate")) return "desempate";
    if (texto.includes("reserva")) return "reserva";
    if (texto.includes("ordinaria")) return "ordinaria";

    return texto;
  }

  function normalizarDificultad(valor) {
    const texto = normalizar(valor);

    if (["baja", "facil", "fácil"].includes(texto)) return "baja";
    if (["media", "intermedia", "medio"].includes(texto)) return "media";
    if (["alta", "dificil", "difícil"].includes(texto)) return "alta";

    return texto;
  }

  function valorCelda(fila, nombres) {
    const claves = Object.keys(fila);

    for (const nombre of nombres) {
      const clave = claves.find(k => normalizar(k) === normalizar(nombre));
      if (clave !== undefined && fila[clave] !== undefined && fila[clave] !== "") {
        return fila[clave];
      }
    }

    return "";
  }

  function convertirProgramacion(filas) {
    const resultado = [];

    filas.forEach((fila, posicion) => {
      const fase = String(valorCelda(fila, [
        "Fase", "Ronda", "Etapa"
      ])).trim();

      const enfrentamiento = String(valorCelda(fila, [
        "Enfrentamiento", "Cruce", "Partido"
      ])).trim();

      const categoriaOriginal = valorCelda(fila, [
        "Categoria", "Categoría", "Area", "Área", "Ingenieria", "Ingeniería"
      ]);

      const dificultadOriginal = valorCelda(fila, [
        "Dificultad", "Nivel"
      ]);

      const tipoOriginal = valorCelda(fila, [
        "Tipo", "Tipo de pregunta"
      ]);

      const cantidadOriginal = valorCelda(fila, [
        "Cantidad", "Numero de preguntas", "Número de preguntas", "Preguntas"
      ]);

      const tiempoOriginal = valorCelda(fila, [
        "Tiempo", "Tiempo segundos", "Segundos"
      ]);

      const ordenOriginal = valorCelda(fila, [
        "Orden", "Orden de ronda", "Orden de bloque"
      ]);

      // Permite ignorar filas completamente vacías.
      const tieneDatos = [
        fase, enfrentamiento, categoriaOriginal,
        dificultadOriginal, tipoOriginal, cantidadOriginal
      ].some(valor => String(valor).trim() !== "");

      if (!tieneDatos) return;

      const categoria = normalizarCategoria(categoriaOriginal);
      const dificultad = normalizarDificultad(dificultadOriginal);
      const tipo = normalizarTipo(tipoOriginal);
      const cantidad = Number(cantidadOriginal);
      const tiempo = Number(tiempoOriginal || 20);
      const orden = Number(ordenOriginal);

      if (!fase || !enfrentamiento) {
        throw new Error(
          `Fila ${posicion + 2}: falta indicar la Fase o el Enfrentamiento.`
        );
      }

      if (!AREAS[categoria]) {
        throw new Error(
          `Fila ${posicion + 2}: categoría no reconocida: "${categoriaOriginal}".`
        );
      }

      if (!NIVELES[dificultad]) {
        throw new Error(
          `Fila ${posicion + 2}: dificultad no válida: "${dificultadOriginal}".`
        );
      }

      if (!TIPOS[tipo]) {
        throw new Error(
          `Fila ${posicion + 2}: tipo no válido: "${tipoOriginal}".`
        );
      }

      if (!Number.isInteger(cantidad) || cantidad < 1) {
        throw new Error(
          `Fila ${posicion + 2}: Cantidad debe ser un entero mayor que cero.`
        );
      }

      if (!Number.isFinite(tiempo) || tiempo < 1) {
        throw new Error(
          `Fila ${posicion + 2}: Tiempo debe ser mayor que cero.`
        );
      }

      resultado.push({
        id: `bloque-${posicion + 1}`,
        filaExcel: posicion + 2,
        fase,
        enfrentamiento,
        categoria,
        dificultad,
        tipo,
        cantidad,
        tiempo,
        orden: Number.isFinite(orden) && orden > 0 ? orden : posicion + 1
      });
    });

    // Orden ascendente. Si el orden coincide, conserva el orden del Excel.
    resultado.sort((a, b) => a.orden - b.orden || a.filaExcel - b.filaExcel);

    if (!resultado.length) {
      throw new Error("El Excel no contiene filas de programación válidas.");
    }

    return resultado;
  }

  function guardarProgreso() {
    const progreso = {
      indiceBloque,
      contadorBloque,
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progreso));
    } catch (error) {
      console.error("No se pudo guardar el progreso de la programación.", error);
      mensaje("No se pudo guardar el progreso. Exporta un respaldo antes de continuar.", true);
    }
  }

  function cantidadPendiente() {
    return programa.reduce((total, bloque, indice) => {
      if (indice < indiceBloque) return total;
      if (indice === indiceBloque) {
        return total + Math.max(0, bloque.cantidad - contadorBloque);
      }
      return total + bloque.cantidad;
    }, 0);
  }

  function actualizarResumen() {
    $("control-bloques").textContent = String(
      Math.max(0, programa.length - indiceBloque)
    );

    $("control-pendientes").textContent = String(cantidadPendiente());

    $("control-total").textContent = String(preguntas.length);

    const bloque = programa[indiceBloque];

    if (!bloque) {
      $("control-fase-actual").textContent =
        programa.length ? "Programación terminada" : "Sin programación";

      $("control-enfrentamiento-actual").textContent = "—";
      $("control-criterios").textContent = programa.length
        ? "Se completaron todos los bloques programados."
        : "Importa un archivo Excel para comenzar.";

      $("control-progreso").textContent = "0 / 0 preguntas";
      $("control-sortear").disabled = true;
      $("control-avanzar-bloque").disabled = true;
      if ($("control-eliminar-programacion")) $("control-eliminar-programacion").disabled = programa.length === 0;
      return;
    }

    $("control-fase-actual").textContent = bloque.fase;
    $("control-enfrentamiento-actual").textContent = bloque.enfrentamiento;

    $("control-criterios").innerHTML = `
      <strong>${escapar(AREAS[bloque.categoria])}</strong><br>
      Dificultad: ${escapar(NIVELES[bloque.dificultad])}<br>
      Tipo: ${escapar(TIPOS[bloque.tipo])}<br>
      Cantidad: ${bloque.cantidad}<br>
      Tiempo por pregunta: ${bloque.tiempo} segundos
    `;

    $("control-progreso").textContent =
      `${contadorBloque} / ${bloque.cantidad} preguntas`;

    $("control-sortear").disabled =
      contadorBloque >= bloque.cantidad || preguntas.length === 0;

    $("control-avanzar-bloque").disabled =
      contadorBloque < bloque.cantidad ||
      indiceBloque >= programa.length - 1;
    if ($("control-eliminar-programacion")) $("control-eliminar-programacion").disabled = false;
  }

  function mensaje(texto, error = false) {
    const elemento = $("control-mensaje");
    elemento.textContent = texto;
    elemento.style.color = error ? "#dc2626" : "";
  }

  function eliminarProgramacion() {
    if (!programa.length) {
      mensaje("No hay una programación cargada para eliminar.", true);
      return;
    }

    const confirmado = confirm(
      "¿Eliminar la programación actual?\n\n" +
      "Se borrarán la programación, su progreso y la lista de preguntas ya utilizadas. " +
      "La pregunta activa se quitará de la proyección. El banco de preguntas no se borra. " +
      "El cambio se sincronizará con los demás equipos conectados."
    );
    if (!confirmado) return;

    detenerTemporizador();
    programa = [];
    indiceBloque = 0;
    contadorBloque = 0;
    preguntaActual = null;
    usadas = new Set();

    localStorage.removeItem(PROGRAM_KEY);
    localStorage.removeItem(USED_KEY);
    localStorage.removeItem(PROGRESS_KEY);

    estado = {
      question: null,
      published: false,
      revealed: false,
      seconds: 20,
      remainingMs: 20000,
      deadline: null,
      status: "idle",
      fase: "",
      enfrentamiento: "",
      updatedAt: Date.now()
    };
    guardarEstado(true);

    $("control-excel").value = "";
    limpiarVistaPrevia();
    actualizarResumen();
    $("estado-control").textContent = "Sin programación";
    mensaje("Programación eliminada. Ya puedes importar un archivo nuevo; el banco de preguntas permanece intacto.");
    const contingenciaMensaje = $("control-contingencia-mensaje");
    if (contingenciaMensaje) contingenciaMensaje.textContent = "La programación está vacía. Puedes sortear preguntas de desempate o reserva cuando las necesites.";
  }

  async function importarProgramacion() {
    const archivo = $("control-excel").files[0];

    if (!archivo) {
      mensaje("Selecciona primero el Excel de programación.", true);
      return;
    }

    if (typeof XLSX === "undefined") {
      mensaje("No se pudo cargar la librería XLSX. Recarga la página.", true);
      return;
    }

    // Recarga siempre el banco para validar contra los datos más recientes.
    preguntas = cargarBanco();

    if (!preguntas.length) {
      mensaje(
        "El banco está vacío. Primero registra o importa las preguntas en el módulo Banco de preguntas.",
        true
      );
      return;
    }

    try {
      const buffer = await archivo.arrayBuffer();
      const libro = XLSX.read(buffer, { type: "array" });
      const primeraHoja = libro.Sheets[libro.SheetNames[0]];

      const filas = XLSX.utils.sheet_to_json(primeraHoja, {
        defval: "",
        raw: false
      });

      const nuevaProgramacion = convertirProgramacion(filas);

      const totalRequerido = nuevaProgramacion.reduce(
        (total, bloque) => total + bloque.cantidad, 0
      );

      // Comprueba si el banco tiene suficientes preguntas para el plan completo.
      const disponiblesPorCriterio = new Map();

      for (const bloque of nuevaProgramacion) {
        const clave = [
          bloque.categoria,
          bloque.dificultad,
          bloque.tipo
        ].join("|");

        if (!disponiblesPorCriterio.has(clave)) {
          disponiblesPorCriterio.set(
            clave,
            preguntas.filter(p =>
              normalizarCategoria(p.categoria) === bloque.categoria &&
              normalizarDificultad(p.dificultad) === bloque.dificultad &&
              normalizarTipo(p.tipo) === bloque.tipo
            ).length
          );
        }
      }

      // El sorteo es global: se requiere revisar acumulados de criterios
      // iguales antes de aceptar la programación.
      const requeridosPorCriterio = new Map();

      for (const bloque of nuevaProgramacion) {
        const clave = [
          bloque.categoria,
          bloque.dificultad,
          bloque.tipo
        ].join("|");

        requeridosPorCriterio.set(
          clave,
          (requeridosPorCriterio.get(clave) || 0) + bloque.cantidad
        );
      }

      const insuficiencias = [];

      for (const [clave, requeridos] of requeridosPorCriterio) {
        const disponibles = disponiblesPorCriterio.get(clave) || 0;

        if (disponibles < requeridos) {
          const [categoria, dificultad, tipo] = clave.split("|");

          insuficiencias.push(
            `${AREAS[categoria]} / ${NIVELES[dificultad]} / ${TIPOS[tipo]}: ` +
            `se necesitan ${requeridos} y hay ${disponibles}.`
          );
        }
      }

      if (insuficiencias.length) {
        mensaje(
          "No se importó la programación porque faltan preguntas compatibles: " +
          insuficiencias.join(" "),
          true
        );
        return;
      }

      if (programa.length && !confirm(
        "Importar esta programación reiniciará el progreso del sorteo actual. ¿Deseas continuar?"
      )) {
        return;
      }

      programa = nuevaProgramacion;
      indiceBloque = 0;
      contadorBloque = 0;
      preguntaActual = null;
      usadas = new Set();

      localStorage.setItem(PROGRAM_KEY, JSON.stringify(programa));
      localStorage.setItem(USED_KEY, JSON.stringify([]));
      guardarProgreso();

      detenerTemporizador();

      estado = {
        question: null,
        published: false,
        revealed: false,
        seconds: programa[0].tiempo,
        remainingMs: programa[0].tiempo * 1000,
        deadline: null,
        status: "idle"
      };

      guardarEstado(true);
      limpiarVistaPrevia();
      actualizarResumen();

      mensaje(
        `Programación importada: ${programa.length} bloques y ${totalRequerido} preguntas previstas.`
      );

      $("estado-control").textContent = "Programación cargada";
    } catch (error) {
      console.error(error);
      mensaje(error.message || "No se pudo leer el archivo Excel.", true);
    }
  }

  function sortearPregunta() {
    const bloque = programa[indiceBloque];

    if (preguntaActual && (estado.status === "running" || estado.published) && !estado.revealed) {
      const continuar = confirm(
        "La pregunta actual todavía está activa o no se ha revelado la respuesta. " +
        "Si sorteas otra, esta pregunta quedará atrás. ¿Continuar?"
      );
      if (!continuar) return;
    }

    if (!bloque) {
      mensaje("La programación ya terminó.", true);
      return;
    }

    if (contadorBloque >= bloque.cantidad) {
      mensaje("Este bloque ya completó todas sus preguntas.", true);
      return;
    }

    preguntas = cargarBanco();

    const disponibles = preguntas.filter(p => {
      const id = String(p.id);

      return !usadas.has(id) &&
        normalizarCategoria(p.categoria) === bloque.categoria &&
        normalizarDificultad(p.dificultad) === bloque.dificultad &&
        normalizarTipo(p.tipo) === bloque.tipo;
    });

    if (!disponibles.length) {
      mensaje(
        "No quedan preguntas compatibles sin utilizar. No se repetirá ninguna pregunta.",
        true
      );
      return;
    }

    const elegida = disponibles[Math.floor(Math.random() * disponibles.length)];

    preguntaActual = elegida;
    usadas.add(String(elegida.id));
    contadorBloque++;

    localStorage.setItem(USED_KEY, JSON.stringify([...usadas]));
    guardarProgreso();

    detenerTemporizador();

    estado = {
      question: elegida,
      published: false,
      revealed: false,
      seconds: bloque.tiempo,
      remainingMs: bloque.tiempo * 1000,
      deadline: null,
      status: "idle",
      enfrentamiento: bloque.enfrentamiento,
      fase: bloque.fase,
      updatedAt: Date.now()
    };

    renderizarVistaPrevia(elegida);
    guardarEstado(true);
    actualizarResumen();

    $("estado-control").textContent = "Pregunta sorteada";

    mensaje(
      `Pregunta sorteada correctamente. Progreso: ${contadorBloque} de ${bloque.cantidad}.`
    );
  }

  function sortearPreguntaContingencia(tipo) {
    if (!["desempate", "reserva"].includes(tipo)) return;

    if (preguntaActual && (estado.status === "running" || estado.published) && !estado.revealed) {
      const continuar = confirm(
        "La pregunta actual sigue activa o no se ha revelado. Si sorteas otra, dejará de ser la pregunta actual. ¿Continuar?"
      );
      if (!continuar) return;
    }

    preguntas = cargarBanco();
    const disponibles = preguntas.filter(p =>
      normalizarTipo(p.tipo) === tipo && !usadas.has(String(p.id))
    );

    if (!disponibles.length) {
      const tipoTexto = TIPOS[tipo].toLowerCase();
      const estadoMensaje = $("control-contingencia-mensaje");
      if (estadoMensaje) estadoMensaje.textContent = `No quedan preguntas de ${tipoTexto} sin utilizar. Revisa el banco o restablece la programación si estás iniciando una nueva competencia.`;
      mensaje(`No hay preguntas de ${TIPOS[tipo].toLowerCase()} disponibles sin repetir.`, true);
      return;
    }

    const elegida = disponibles[Math.floor(Math.random() * disponibles.length)];
    preguntaActual = elegida;
    usadas.add(String(elegida.id));
    localStorage.setItem(USED_KEY, JSON.stringify([...usadas]));

    detenerTemporizador();
    estado = {
      question: elegida,
      published: false,
      revealed: false,
      seconds: 20,
      remainingMs: 20000,
      deadline: null,
      status: "idle",
      fase: tipo === "desempate" ? "Desempate" : "Reserva",
      enfrentamiento: "Pregunta de contingencia",
      updatedAt: Date.now()
    };

    renderizarVistaPrevia(elegida);
    guardarEstado(true);
    actualizarResumen();
    $("estado-control").textContent = tipo === "desempate" ? "Desempate sorteado" : "Reserva sorteada";

    const estadoMensaje = $("control-contingencia-mensaje");
    if (estadoMensaje) estadoMensaje.textContent = `${TIPOS[tipo]} sorteada. Publícala cuando estés listo; la respuesta seguirá oculta hasta revelarla.`;
    mensaje(`${TIPOS[tipo]} sorteada correctamente. No se modificó el progreso de la programación.`);
  }

  function avanzarBloque() {
    const bloque = programa[indiceBloque];

    if (!bloque || contadorBloque < bloque.cantidad) {
      mensaje("Debes completar las preguntas de esta ronda antes de avanzar.", true);
      return;
    }

    if (preguntaActual && (estado.status === "running" || estado.published) && !estado.revealed) {
      if (!confirm("La pregunta actual todavía no tiene respuesta revelada. ¿Quieres cerrar esta pregunta y avanzar de ronda?")) return;
    }

    if (indiceBloque >= programa.length - 1) {
      mensaje("Ya completaste todos los bloques de la programación.");
      actualizarResumen();
      return;
    }

    indiceBloque++;
    contadorBloque = 0;
    preguntaActual = null;
    guardarProgreso();

    detenerTemporizador();
    limpiarVistaPrevia();

    const siguiente = programa[indiceBloque];

    estado = {
      question: null,
      published: false,
      revealed: false,
      seconds: siguiente.tiempo,
      remainingMs: siguiente.tiempo * 1000,
      deadline: null,
      status: "idle"
    };

    guardarEstado(true);
    actualizarResumen();

    mensaje(`Pasaste al bloque: ${siguiente.fase} — ${siguiente.enfrentamiento}.`);
    $("estado-control").textContent = "Nueva ronda";
  }

  function renderizarVistaPrevia(p) {
    if (!p) return;

    const categoria = normalizarCategoria(p.categoria);
    const dificultad = normalizarDificultad(p.dificultad);
    const tipo = normalizarTipo(p.tipo);

    $("control-enunciado").textContent = p.enunciado || "Sin enunciado";

    $("control-area-badge").textContent =
      AREAS[categoria] || p.categoria || "Copa Ingenium";

    $("control-nivel-badge").textContent =
      NIVELES[dificultad] || p.dificultad || "Sin dificultad";

    $("control-tipo-badge").textContent =
      TIPOS[tipo] || p.tipo || "Pregunta";

    $("control-dificultad").textContent =
      NIVELES[dificultad] || "—";

    $("control-puntos").textContent =
      `${PUNTOS[dificultad] || 0} puntos`;

    $("control-puntos-preview").textContent =
      `${PUNTOS[dificultad] || 0} puntos`;

    const bloque = programa[indiceBloque];
    const segundos = Number(estado.seconds) || (bloque ? bloque.tiempo : 20);

    $("control-tiempo-preview").textContent = `${segundos} segundos`;
    $("control-numero").textContent = String(usadas.size);

    $("control-opciones").innerHTML = ["A", "B", "C", "D"].map(letra => `
      <div class="contest-option">
        <b>${letra}</b>
        <span>${escapar(p.opciones?.[letra] || "")}</span>
      </div>
    `).join("");

    const tarjeta = $("control-tarjeta");
    tarjeta.style.borderTop = `5px solid ${COLORES[categoria] || "#64748b"}`;

    $("control-respuesta").textContent = "Respuesta oculta";
  }

  function limpiarVistaPrevia() {
    $("control-enunciado").textContent = "Sortear una pregunta para comenzar";
    $("control-area-badge").textContent = "COPA INGENIUM";
    $("control-nivel-badge").textContent = "SIN DIFICULTAD";
    $("control-tipo-badge").textContent = "Sin pregunta";
    $("control-dificultad").textContent = "—";
    $("control-puntos").textContent = "—";
    $("control-puntos-preview").textContent = "0 puntos";
    $("control-numero").textContent = "—";
    $("control-respuesta").textContent = "Respuesta oculta";

    $("control-opciones").innerHTML = ["A", "B", "C", "D"].map(letra => `
      <div class="contest-option">
        <b>${letra}</b><span>Opción ${letra}</span>
      </div>
    `).join("");

    $("control-tarjeta").style.borderTop = "";
    $("control-tiempo-preview").textContent =
      `${programa[indiceBloque]?.tiempo || 20} segundos`;
  }

  function publicarPregunta() {
    if (!preguntaActual) {
      mensaje("Primero sortea una pregunta.", true);
      return;
    }

    estado.question = preguntaActual;
    estado.published = true;
    estado.revealed = false;
    estado.updatedAt = Date.now();

    guardarEstado(true);

    $("estado-control").textContent = "Pregunta publicada";
    mensaje("Pregunta publicada en la pantalla de concursantes.");
  }

  function revelarRespuesta() {
    if (!preguntaActual) {
      mensaje("Primero sortea una pregunta.", true);
      return;
    }

    estado.question = preguntaActual;
    estado.published = true;
    estado.revealed = true;
    estado.updatedAt = Date.now();

    guardarEstado(true);

    const letra = preguntaActual.correcta;
    const texto = preguntaActual.opciones?.[letra] || "";

    $("control-respuesta").textContent =
      `Respuesta correcta: ${letra}. ${texto}`;

    mensaje("Respuesta oficial revelada.");
  }

  function abrirProyeccion() {
    window.open("proyeccion.html", "CopaIngeniumProyeccion");
  }

  function segundosConfigurados() {
    return Number(estado.seconds) || programa[indiceBloque]?.tiempo || 20;
  }

  function formatoTiempo(ms) {
    const segundos = Math.max(0, Math.ceil(ms / 1000));
    const minutos = Math.floor(segundos / 60);
    const resto = segundos % 60;

    return `${String(minutos).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
  }

  function tiempoRestante() {
    if (estado.status === "running" && estado.deadline) {
      return Math.max(0, estado.deadline - Date.now());
    }

    return Math.max(0, Number(estado.remainingMs) || 0);
  }

  function actualizarCronometro() {
    if (!$("control-cronometro")) return;

    const restante = tiempoRestante();

    $("control-cronometro").textContent = formatoTiempo(restante);

    if (estado.status === "running") {
      $("control-timer-status").textContent = "Cronómetro en marcha";
    } else if (estado.status === "paused") {
      $("control-timer-status").textContent = "Cronómetro pausado";
    } else if (restante <= 0) {
      $("control-timer-status").textContent = "Tiempo finalizado";
    } else {
      $("control-timer-status").textContent = "Cronómetro detenido";
    }

    if (estado.status === "running" && restante <= 0) {
      estado.remainingMs = 0;
      estado.deadline = null;
      estado.status = "finished";
      guardarEstado(true);
      detenerTemporizador();
    }
  }

  function detenerTemporizador() {
    if (temporizador) {
      clearInterval(temporizador);
      temporizador = null;
    }
  }

  function iniciarTiempo() {
    if (!preguntaActual) {
      mensaje("Primero sortea una pregunta.", true);
      return;
    }

    if (estado.status === "running") return;
    if (estado.status === "finished") {
      mensaje("El tiempo terminó. Pulsa «Reiniciar tiempo» antes de iniciar otro conteo.", true);
      return;
    }

    const restante = tiempoRestante();

    if (restante <= 0) {
      estado.remainingMs = segundosConfigurados() * 1000;
    } else {
      estado.remainingMs = restante;
    }

    estado.deadline = Date.now() + estado.remainingMs;
    estado.status = "running";

    guardarEstado(true);
    detenerTemporizador();
    temporizador = setInterval(actualizarCronometro, 200);
  }

  function pausarTiempo() {
    if (estado.status !== "running") return;

    estado.remainingMs = tiempoRestante();
    estado.deadline = null;
    estado.status = "paused";

    detenerTemporizador();
    guardarEstado(true);
  }

  function reiniciarTiempo() {
    estado.remainingMs = segundosConfigurados() * 1000;
    estado.deadline = null;
    estado.status = "idle";

    detenerTemporizador();
    guardarEstado(true);
  }

  function siguientePregunta() {
    // Conserva el botón visible: el sorteo real lo controla la programación.
    if (!preguntaActual) {
      if (!programa.length) {
        mensaje("No hay una programación activa. Importa una programación o utiliza los botones de desempate y reserva.", true);
        return;
      }
      sortearPregunta();
      return;
    }

    const bloque = programa[indiceBloque];

    if (bloque && contadorBloque < bloque.cantidad) {
      sortearPregunta();
      return;
    }

    mensaje(
      programa.length
        ? "Completaste las preguntas de este bloque. Usa «Siguiente ronda» para avanzar."
        : "No hay programación activa. Puedes sortear una pregunta de desempate o reserva."
    );
  }

  function conectarEventos() {
    $("control-excel").addEventListener("change", () => {
      const archivo = $("control-excel").files[0];
      if (archivo) {
        mensaje(`Archivo seleccionado: ${archivo.name}. Pulsa «Importar programación» para procesarlo.`);
      }
    });

    $("control-importar").addEventListener("click", importarProgramacion);
    $("control-eliminar-programacion")?.addEventListener("click", eliminarProgramacion);
    $("control-sortear-desempate")?.addEventListener("click", () => sortearPreguntaContingencia("desempate"));
    $("control-sortear-reserva")?.addEventListener("click", () => sortearPreguntaContingencia("reserva"));
    $("control-sortear").addEventListener("click", sortearPregunta);
    $("control-avanzar-bloque").addEventListener("click", avanzarBloque);

    $("control-proyectar").addEventListener("click", abrirProyeccion);
    $("control-publicar").addEventListener("click", publicarPregunta);
    $("control-iniciar").addEventListener("click", iniciarTiempo);
    $("control-pausar").addEventListener("click", pausarTiempo);
    $("control-reiniciar").addEventListener("click", reiniciarTiempo);
    $("control-revelar").addEventListener("click", revelarRespuesta);
    $("control-siguiente").addEventListener("click", siguientePregunta);

    window.addEventListener("storage", evento => {
      if (evento.key === PROGRAM_KEY) {
        programa = leerJSON(PROGRAM_KEY, []);
        if (!Array.isArray(programa)) programa = [];
        const progreso = leerJSON(PROGRESS_KEY, null);
        indiceBloque = programa.length && progreso && Number.isInteger(progreso.indiceBloque)
          ? Math.min(Math.max(0, progreso.indiceBloque), programa.length) : 0;
        contadorBloque = programa.length && progreso && Number.isInteger(progreso.contadorBloque)
          ? Math.max(0, progreso.contadorBloque) : 0;
        actualizarResumen();
      }

      if (evento.key === PROGRESS_KEY) {
        const progreso = leerJSON(PROGRESS_KEY, null);
        indiceBloque = programa.length && progreso && Number.isInteger(progreso.indiceBloque)
          ? Math.min(Math.max(0, progreso.indiceBloque), programa.length) : 0;
        contadorBloque = programa.length && progreso && Number.isInteger(progreso.contadorBloque)
          ? Math.max(0, progreso.contadorBloque) : 0;
        actualizarResumen();
      }

      if (evento.key === BANK_KEY) {
        preguntas = cargarBanco();
        actualizarResumen();
      }

      if (evento.key === STATE_KEY) {
        estado = cargarEstado();
        actualizarCronometro();
      }

      if (evento.key === USED_KEY) {
        usadas = new Set(leerJSON(USED_KEY, []));
        actualizarResumen();
      }
    });

    if ("BroadcastChannel" in window) {
      canal = new BroadcastChannel(CHANNEL_NAME);

      canal.addEventListener("message", evento => {
        if (evento.data) {
          estado = evento.data;
          actualizarCronometro();
        }
      });
    }
  }

  function iniciar() {
    if (!$("control-importar")) return;

    preguntas = cargarBanco();
    programa = leerJSON(PROGRAM_KEY, []);
    usadas = new Set(leerJSON(USED_KEY, []));

    if (!Array.isArray(programa)) programa = [];

    if (programa.length) {
      // Recupera el progreso exacto para que recargar la página no reinicie la ronda.
      const progreso = leerJSON(PROGRESS_KEY, null);
      if (progreso && Number.isInteger(progreso.indiceBloque) &&
          Number.isInteger(progreso.contadorBloque)) {
        indiceBloque = Math.min(Math.max(0, progreso.indiceBloque), programa.length);
        contadorBloque = Math.max(0, progreso.contadorBloque);
      } else {
        indiceBloque = 0;
        contadorBloque = 0;
      }

      const bloque = programa[indiceBloque];
      if (bloque) {
        contadorBloque = Math.min(contadorBloque, bloque.cantidad);
        const esContingencia = ["Desempate", "Reserva"].includes(estado.fase);
        if (!esContingencia) {
          estado.seconds = bloque.tiempo;
          if (!estado.question) estado.remainingMs = bloque.tiempo * 1000;
        }
      }
    }

    conectarEventos();

    if (estado.question) {
      preguntaActual = estado.question;
      renderizarVistaPrevia(preguntaActual);

      if (estado.revealed) {
        const letra = preguntaActual.correcta;
        $("control-respuesta").textContent =
          `Respuesta correcta: ${letra}. ${preguntaActual.opciones?.[letra] || ""}`;
      }
    } else {
      limpiarVistaPrevia();
    }

    actualizarResumen();
    actualizarCronometro();
    if ($("control-contingencia-mensaje") && !programa.length) {
      $("control-contingencia-mensaje").textContent = "Puedes sortear una pregunta de desempate o reserva sin cargar una programación. Las preguntas deben estar clasificadas con ese tipo en el banco.";
    }

    if (estado.status === "running" && estado.deadline) {
      temporizador = setInterval(actualizarCronometro, 200);
    }
  }

  // El HTML se carga dinámicamente. DOMContentLoaded puede haber ocurrido
  // antes de que este archivo se ejecute; en ese caso, iniciar de inmediato.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
