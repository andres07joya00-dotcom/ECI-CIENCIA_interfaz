
const pageNames = {
  inicio: "Panel principal",
  preguntas: "Banco de preguntas",
  enfrentamientos: "Enfrentamientos",
  concurso: "Control del concurso",
  marcador: "Marcador",
  configuracion: "Configuración",
};

function showPage(page) {
  // Comprobar que la página solicitada existe.
  if (!pageNames[page]) {
    return;
  }

  // Ocultar todas las secciones.
  document.querySelectorAll(".page-section").forEach((section) => {
    section.classList.add("hidden");
  });

  // Mostrar la sección seleccionada.
  const selectedSection = document.getElementById(`page-${page}`);

  if (selectedSection) {
    selectedSection.classList.remove("hidden");
  }

  // Actualizar el título.
  document.getElementById("page-title").textContent = pageNames[page];

  // Actualizar el botón activo del menú.
  document.querySelectorAll(".nav-item").forEach((button) => {
    const isActive = button.dataset.page === page;

    button.classList.toggle("active", isActive);

    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

// Activar los botones que tengan el atributo data-page.
document.querySelectorAll("[data-page]").forEach((element) => {
  element.addEventListener("click", (event) => {
    event.preventDefault();
    showPage(element.dataset.page);
  });
});

// Abrir el panel principal al iniciar.
showPage("inicio");
