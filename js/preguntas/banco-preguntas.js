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
