
const STORAGE_KEY = "copaIngeniumPreguntas";

const CATEGORIAS = {
  mecanica: { nombre: "Ingeniería Mecánica", color: "#64748b" },
  electrica: { nombre: "Ingeniería Eléctrica", color: "#ca8a04" },
  electronica: { nombre: "Ingeniería Electrónica", color: "#0891b2" },
  biomedica: { nombre: "Ingeniería Biomédica", color: "#db2777" },
  civil: { nombre: "Ingeniería Civil", color: "#92400e" },
  sistemas: { nombre: "Ingeniería de Sistemas", color: "#2563eb" },
  ambiental: { nombre: "Ingeniería Ambiental", color: "#16a34a" },
  estadistica: { nombre: "Estadística", color: "#7c3aed" },
  industrial: { nombre: "Ingeniería Industrial", color: "#ea580c" },
  ciencias_basicas: { nombre: "Ciencias Básicas", color: "#4f46e5" },
  cultura_general: { nombre: "Cultura General", color: "#0f766e" },
  julio_garavito: { nombre: "Julio Garavito", color: "#b91c1c" }
};

const TIPOS = {
  ordinaria: "Ordinaria",
  desempate: "Desempate rápido",
  reserva: "Reserva"
};

const PUNTOS = { baja: 3, media: 4, alta: 5 };

let preguntas = cargarPreguntas();

function cargarPreguntas() {
  try {
    const datos = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

function guardarEnLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preguntas));
}

function escapar(texto = "") {
  return String(texto).replace(/[&<>"']/g, caracter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[caracter]);
}

function etiquetaCategoria(categoria) {
  return CATEGORIAS[categoria]?.nombre || categoria || "Sin categoría";
}

function etiquetaTipo(tipo) {
  return TIPOS[tipo] || tipo;
}

function etiquetaDificultad(nivel) {
  return {
    baja: "Fácil",
    media: "Intermedia",
    alta: "Difícil"
  }[nivel] || nivel;
}

// NAVEGACIÓN
const titulosPaginas = {
  inicio: "Panel principal",
  preguntas: "Banco de preguntas",
  enfrentamientos: "Enfrentamientos",
  concurso: "Control del concurso",
  marcador: "Marcador",
  configuracion: "Configuración"
};

function showPage(pagina) {
  document.querySelectorAll(".page-section").forEach(seccion => {
    seccion.classList.toggle("hidden", seccion.id !== `page-${pagina}`);
  });

  document.querySelectorAll("[data-page]").forEach(boton => {
    if (boton.classList.contains("nav-item")) {
      boton.classList.toggle("active", boton.dataset.page === pagina);
    }
  });

  const titulo = document.getElementById("page-title");
  if (titulo) titulo.textContent = titulosPaginas[pagina] || "Copa Ingenium";
}

document.querySelectorAll("[data-page]").forEach(boton => {
  boton.addEventListener("click", evento => {
    evento.preventDefault();
    showPage(boton.dataset.page);
  });
});

// FORMULARIO
const formulario = document.getElementById("form-pregunta");

function obtenerFormulario() {
  return {
    enunciado: document.getElementById("enunciado").value.trim(),
    categoria: document.getElementById("categoria").value,
    tipo: document.getElementById("tipo-pregunta").value,
    dificultad: document.getElementById("dificultad").value,
    enfrentamiento: document.getElementById("enfrentamiento").value.trim(),
    opciones: {
      A: document.getElementById("opcion-a").value.trim(),
      B: document.getElementById("opcion-b").value.trim(),
      C: document.getElementById("opcion-c").value.trim(),
      D: document.getElementById("opcion-d").value.trim()
    },
    correcta: document.getElementById("respuesta-correcta").value
  };
}

function limpiarFormulario() {
  formulario.reset();
  document.getElementById("pregunta-id").value = "";
  document.getElementById("form-title").textContent = "Registrar pregunta";
  document.getElementById("guardar-pregunta").textContent = "Guardar pregunta";
  document.getElementById("cancelar-edicion").classList.add("hidden");
}

formulario.addEventListener("submit", evento => {
  evento.preventDefault();

  const datos = obtenerFormulario();
  const idExistente = document.getElementById("pregunta-id").value;

  if (!datos.enunciado || Object.values(datos.opciones).some(opcion => !opcion)) {
    alert("Completa el enunciado y las cuatro opciones.");
    return;
  }

  const pregunta = {
    ...datos,
    id: idExistente || (
      window.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`
    )
  };

  if (idExistente) {
    const indice = preguntas.findIndex(p => p.id === idExistente);
    if (indice !== -1) preguntas[indice] = pregunta;
  } else {
    preguntas.push(pregunta);
  }

  guardarEnLocalStorage();
  limpiarFormulario();
  renderizarPreguntas();
});

document.getElementById("cancelar-edicion").addEventListener("click", limpiarFormulario);

// LISTADO, COLORES Y FILTROS
function renderizarPreguntas() {
  const lista = document.getElementById("lista-preguntas");
  const mensaje = document.getElementById("mensaje-preguntas");

  const busqueda = (
    document.getElementById("buscar-pregunta")?.value || ""
  ).toLowerCase();

  const tipoFiltro = document.getElementById("filtro-tipo")?.value || "";
  const dificultadFiltro =
    document.getElementById("filtro-dificultad")?.value || "";
  const categoriaFiltro =
    document.getElementById("filtro-categoria")?.value || "";

  const filtradas = preguntas.filter(p => {
    const texto = [
      p.enunciado,
      p.opciones?.A,
      p.opciones?.B,
      p.opciones?.C,
      p.opciones?.D,
      p.enfrentamiento
    ].join(" ").toLowerCase();

    return texto.includes(busqueda) &&
      (!tipoFiltro || p.tipo === tipoFiltro) &&
      (!dificultadFiltro || p.dificultad === dificultadFiltro) &&
      (!categoriaFiltro || p.categoria === categoriaFiltro);
  });

  lista.innerHTML = filtradas.map(p => {
    const categoria = CATEGORIAS[p.categoria] || {
      nombre: p.categoria || "Sin categoría",
      color: "#64748b"
    };

    return `
      <article class="question-card"
        style="--category-color:${categoria.color}">
        <div class="question-card-header">
          <span class="category-badge">${escapar(categoria.nombre)}</span>
          <span class="type-badge">${escapar(etiquetaTipo(p.tipo))}</span>
        </div>

        <h3>${escapar(p.enunciado)}</h3>

        <div class="question-options">
          ${["A", "B", "C", "D"].map(letra => `
            <p class="${p.correcta === letra ? "correct-option" : ""}">
              <strong>${letra}.</strong>
              ${escapar(p.opciones?.[letra] || "")}
              ${p.correcta === letra ? '<span aria-label="Correcta"> ✓</span>' : ""}
            </p>
          `).join("")}
        </div>

        <div class="question-meta">
          <span>${escapar(etiquetaDificultad(p.dificultad))}</span>
          <span>${PUNTOS[p.dificultad] ?? 0} puntos base</span>
          ${p.enfrentamiento
            ? `<span>${escapar(p.enfrentamiento)}</span>`
            : ""}
        </div>

        <div class="question-actions">
          <button type="button" data-editar="${escapar(p.id)}">Editar</button>
          <button type="button" class="secondary-btn"
            data-eliminar="${escapar(p.id)}">Eliminar</button>
        </div>
      </article>
    `;
  }).join("");

  if (mensaje) {
    mensaje.classList.toggle("hidden", filtradas.length > 0);
    mensaje.textContent = filtradas.length
      ? ""
      : preguntas.length
        ? "No hay preguntas que coincidan con los filtros."
        : "Todavía no hay preguntas registradas.";
  }

  actualizarContadores();
}

function actualizarContadores() {
  const poner = (id, valor) => {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = valor;
  };

  poner("total-preguntas", preguntas.length);
  poner("total-ordinarias", preguntas.filter(p => p.tipo === "ordinaria").length);
  poner("total-desempate", preguntas.filter(p => p.tipo === "desempate").length);
  poner("total-reserva", preguntas.filter(p => p.tipo === "reserva").length);

  poner("question-count", preguntas.length);

  const enfrentamientos = new Set(
    preguntas.map(p => p.enfrentamiento).filter(Boolean)
  );
  poner("match-count", enfrentamientos.size);
}

document.getElementById("lista-preguntas").addEventListener("click", evento => {
  const botonEditar = evento.target.closest("[data-editar]");
  const botonEliminar = evento.target.closest("[data-eliminar]");

  if (botonEditar) {
    const pregunta = preguntas.find(p => p.id === botonEditar.dataset.editar);
    if (!pregunta) return;

    document.getElementById("pregunta-id").value = pregunta.id;
    document.getElementById("enunciado").value = pregunta.enunciado;
    document.getElementById("categoria").value = pregunta.categoria;
    document.getElementById("tipo-pregunta").value = pregunta.tipo;
    document.getElementById("dificultad").value = pregunta.dificultad;
    document.getElementById("enfrentamiento").value = pregunta.enfrentamiento || "";

    ["A", "B", "C", "D"].forEach(letra => {
      document.getElementById(`opcion-${letra.toLowerCase()}`).value =
        pregunta.opciones?.[letra] || "";
    });

    document.getElementById("respuesta-correcta").value = pregunta.correcta;
    document.getElementById("form-title").textContent = "Editar pregunta";
    document.getElementById("guardar-pregunta").textContent = "Guardar cambios";
    document.getElementById("cancelar-edicion").classList.remove("hidden");

    document.getElementById("form-title").scrollIntoView({ behavior: "smooth" });
  }

  if (botonEliminar) {
    const id = botonEliminar.dataset.eliminar;
    if (!confirm("¿Seguro que quieres eliminar esta pregunta?")) return;

    preguntas = preguntas.filter(p => p.id !== id);
    guardarEnLocalStorage();
    renderizarPreguntas();
  }
});

["buscar-pregunta", "filtro-tipo", "filtro-dificultad", "filtro-categoria"]
  .forEach(id => {
    document.getElementById(id)?.addEventListener("input", renderizarPreguntas);
    document.getElementById(id)?.addEventListener("change", renderizarPreguntas);
  });

// IMPORTAR EXCEL
function normalizar(texto) {
  return String(texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function buscarColumna(fila, posiblesNombres) {
  const entradas = Object.entries(fila);
  for (const nombre of posiblesNombres) {
    const buscada = normalizar(nombre);
    const encontrada = entradas.find(([clave]) => normalizar(clave) === buscada);
    if (encontrada) return encontrada[1];
  }
  return "";
}

function normalizarCategoria(valor) {
  const texto = normalizar(valor);

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

  return equivalencias[texto] || "";
}

function normalizarTipo(valor) {
  const texto = normalizar(valor);
  if (["ordinaria", "ordinarias"].includes(texto)) return "ordinaria";
  if (["desempate", "desempaterapido", "rapida"].includes(texto)) return "desempate";
  if (["reserva", "reservas"].includes(texto)) return "reserva";
  return "";
}

function normalizarDificultad(valor) {
  const texto = normalizar(valor);
  if (["baja", "bajo", "facil"].includes(texto)) return "baja";
  if (["media", "medio", "intermedia", "intermedio"].includes(texto)) return "media";
  if (["alta", "alto", "dificil"].includes(texto)) return "alta";
  return "";
}

document.getElementById("importar-excel").addEventListener("click", async () => {
  const archivo = document.getElementById("archivo-excel").files[0];
  const mensaje = document.getElementById("mensaje-importacion");
  const vistaPrevia = document.getElementById("vista-previa-excel");

  mensaje.textContent = "";
  vistaPrevia.innerHTML = "";

  if (!archivo) {
    mensaje.textContent = "Primero selecciona un archivo Excel.";
    return;
  }

  if (typeof XLSX === "undefined") {
    mensaje.textContent = "No se pudo cargar la biblioteca de Excel. Revisa tu conexión.";
    return;
  }

  try {
    const datosArchivo = await archivo.arrayBuffer();
    const libro = XLSX.read(datosArchivo, { type: "array" });
    const hoja = libro.Sheets[libro.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });

    if (!filas.length) {
      mensaje.textContent = "El archivo no contiene preguntas.";
      return;
    }

    const validas = [];
    const errores = [];

    filas.forEach((fila, indice) => {
      const numeroFila = indice + 2;

      const enunciado = String(buscarColumna(fila, [
        "enunciado", "pregunta"
      ])).trim();

      const categoria = normalizarCategoria(buscarColumna(fila, [
        "categoria", "ingenieria", "area"
      ]));

      const tipo = normalizarTipo(buscarColumna(fila, [
        "tipo", "tipo de pregunta"
      ]));

      const dificultad = normalizarDificultad(buscarColumna(fila, [
        "dificultad", "nivel"
      ]));

      const opciones = {
        A: String(buscarColumna(fila, ["A", "opcion A", "opcionA"])).trim(),
        B: String(buscarColumna(fila, ["B", "opcion B", "opcionB"])).trim(),
        C: String(buscarColumna(fila, ["C", "opcion C", "opcionC"])).trim(),
        D: String(buscarColumna(fila, ["D", "opcion D", "opcionD"])).trim()
      };

      const correcta = String(buscarColumna(fila, [
        "correcta", "respuesta correcta", "respuesta"
      ])).trim().toUpperCase();

      const enfrentamiento = String(buscarColumna(fila, [
        "enfrentamiento", "asignacion", "asignacion enfrentamiento"
      ])).trim();

      const problemas = [];

      if (!enunciado) problemas.push("falta el enunciado");
      if (!categoria) problemas.push("categoría no reconocida");
      if (!tipo) problemas.push("tipo no reconocido");
      if (!dificultad) problemas.push("dificultad no reconocida");
      if (Object.values(opciones).some(opcion => !opcion)) {
        problemas.push("faltan opciones A, B, C o D");
      }
      if (!["A", "B", "C", "D"].includes(correcta)) {
        problemas.push("la respuesta correcta debe ser A, B, C o D");
      }

      if (problemas.length) {
        errores.push(`Fila ${numeroFila}: ${problemas.join(", ")}.`);
      } else {
        validas.push({
          id: window.crypto?.randomUUID?.() ||
            `${Date.now()}-${indice}-${Math.random().toString(16).slice(2)}`,
          enunciado,
          categoria,
          tipo,
          dificultad,
          opciones,
          correcta,
          enfrentamiento
        });
      }
    });

    vistaPrevia.innerHTML = `
      <h4>Vista previa de importación</h4>
      <p>Preguntas válidas: ${validas.length}</p>
      <p>Filas con errores: ${errores.length}</p>
      ${errores.length
        ? `<ul>${errores.slice(0, 15).map(error => `<li>${escapar(error)}</li>`).join("")}</ul>`
        : ""}
      ${errores.length > 15 ? `<p>Y ${errores.length - 15} errores más.</p>` : ""}
    `;

    // Si existen errores, no se importa nada para evitar cargar un banco incompleto.
    if (errores.length) {
      mensaje.textContent = "Corrige las filas indicadas en Excel e inténtalo de nuevo.";
      return;
    }

    preguntas.push(...validas);
    guardarEnLocalStorage();
    renderizarPreguntas();

    mensaje.textContent = `Importación completada: ${validas.length} preguntas agregadas.`;
    document.getElementById("archivo-excel").value = "";
  } catch (error) {
    console.error(error);
    mensaje.textContent = "No se pudo leer el archivo. Comprueba que sea un Excel válido.";
  }
});

// INICIO
renderizarPreguntas();
showPage("inicio");