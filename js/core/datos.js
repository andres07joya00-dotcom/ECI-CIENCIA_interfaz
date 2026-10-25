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
