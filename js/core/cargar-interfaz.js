// Compone la interfaz HTML antes de cargar los módulos que usan sus elementos.
// Ejecuta el proyecto mediante Live Server o un servidor web local (no file://).

async function cargarFragmento(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar ${ruta} (${respuesta.status})`);
  }
  return respuesta.text();
}

async function cargarScript(ruta) {
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = ruta;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`No se pudo cargar el script ${ruta}`));
    document.body.appendChild(script);
  });
}

async function iniciarInterfaz() {
  const shell = document.getElementById("app-shell");
  const [sidebar, mainShell] = await Promise.all([
    cargarFragmento("components/sidebar.html"),
    cargarFragmento("components/main-shell.html")
  ]);

  shell.innerHTML = sidebar + mainShell;

  const [topbar, footer, ...paginas] = await Promise.all([
    cargarFragmento("components/topbar.html"),
    cargarFragmento("components/footer.html"),
    cargarFragmento("pages/inicio.html"),
    cargarFragmento("pages/preguntas.html"),
    cargarFragmento("pages/enfrentamientos.html"),
    cargarFragmento("pages/concurso.html"),
    cargarFragmento("pages/marcador.html"),
    cargarFragmento("pages/configuracion.html")
  ]);

  document.getElementById("topbar-container").innerHTML = topbar;
  document.getElementById("pages-container").innerHTML = paginas.join("\n");
  document.getElementById("footer-container").innerHTML = footer;

  // El orden es importante: dependencias compartidas y navegación primero;
  // después preguntas, enfrentamientos, control del concurso y finalmente app.
  const scripts = [
    "js/core/datos.js",
    "js/core/navegacion.js",
    "js/preguntas/banco-preguntas.js",
    "js/preguntas/importar-excel.js",
    "js/enfrentamientos.js",
    "js/control-concurso.js",
    "js/core/panel-principal.js",
    "js/core/respaldo.js",
    "js/marcador.js",
    "js/app.js"
  ];

  for (const ruta of scripts) await cargarScript(ruta);
}

document.addEventListener("DOMContentLoaded", () => {
  iniciarInterfaz().catch(error => {
    console.error("Error al iniciar Copa Ingenium:", error);
    document.getElementById("app-shell").innerHTML =
      '<p style="padding:2rem">No se pudo cargar la interfaz. Abre el proyecto con Live Server y revisa la consola del navegador.</p>';
  });
});
