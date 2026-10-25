// Navegación entre las secciones de la plataforma.
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
    seccion.classList.remove("fade-in");
  });

  document.querySelectorAll(".nav-item[data-page]").forEach(boton => {
    boton.classList.toggle("active", boton.dataset.page === pagina);
  });

  const titulo = document.getElementById("page-title");
  if (titulo) titulo.textContent = titulosPaginas[pagina] || "Copa Ingenium";

  const paginaActiva = document.getElementById(`page-${pagina}`);
  if (paginaActiva) {
    void paginaActiva.offsetWidth;
    paginaActiva.classList.add("fade-in");
  }
}

document.querySelectorAll("[data-page]").forEach(boton => {
  boton.addEventListener("click", evento => {
    evento.preventDefault();
    showPage(boton.dataset.page);
  });
});
