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
