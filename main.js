/* =============================================
   main.js — Portafolio Académico
   Para agregar tareas o ejercicios, solo añade
   un nuevo objeto al array correspondiente.
   ============================================= */

// ─── TECNOLOGÍAS (sección "Sobre mí") ────────────────────────────────────────
// Para agregar o quitar una tecnología, edita este array.
const tecnologias = [
  "Java",
  "Spring Boot",
  "MySQL",
  "AWS",
  "Python"
];

// ─── DATOS DE TAREAS ─────────────────────────────────────────────────────────
// Para agregar una tarea nueva, agrega un objeto con esta estructura:
// {
//   title: "Nombre de la tarea",
//   description: "Breve descripción",
//   image: "URL de imagen o ruta relativa (dejar en '' si no hay)",
//   link: "URL de la tarea o repositorio"
// }
const tareas = [
  {
    title: "Primeros Pasos en Python",
    description: "Introducción a Python: variables, tipos de datos y operaciones básicas.",
    image: "",
    link: "Tareas/tarea1.html"
  },
  {
    title: "Primeros Pasos en Pandas",
    description: "Introducción a Pandas: DataFrames y manipulación de datos.",
    image: "",
    link: "Tareas/tarea_2.html"
  },
  {
    title: "Análisis de Datos del Titanic",
    description: "Análisis del dataset Titanic: filtrado, estadísticas y manipulación con Pandas.",
    image: "",
    link: "Tareas/tarea_3_Titanic_data.html"
  }
];

// ─── DATOS DE EJERCICIOS EN CLASE ────────────────────────────────────────────
// Misma estructura que tareas.
const ejercicios = [
  {
    title: "Ejercicio 1",
    description: "Práctica realizada en clase sobre el tema X.",
    image: "",
    link: "#"
  },
  {
    title: "Ejercicio 2",
    description: "Práctica realizada en clase sobre el tema Y.",
    image: "",
    link: "#"
  }
];

// ─── DATOS DEL PROYECTO FINAL ────────────────────────────────────────────────
// Modifica los valores para personalizar la sección del proyecto final.
const proyectoFinal = {
  title: "Nombre del Proyecto Final",
  description:
    "Aquí va la descripción de tu proyecto final. Explica qué problema resuelve, qué tecnologías usaste y qué aprendiste.",
  image: "",          // URL o ruta a una captura del proyecto (dejar '' para ocultarla)
  link: "#",          // URL del proyecto o repositorio
  tags: ["HTML", "CSS", "JavaScript", "GitHub Pages"]
};

// ─── RENDERIZADO DE TECNOLOGÍAS ──────────────────────────────────────────────
function renderizarTecnologias() {
  const container = document.getElementById('tecnologias-badges');
  if (!container) return;
  container.innerHTML = tecnologias
    .map(tech => `<span class="badge">${tech}</span>`)
    .join('');
}



/**
 * Crea el HTML de una tarjeta de proyecto.
 * @param {Object} item  - Objeto con title, description, image, link
 * @param {number} index - Número de la tarjeta (1-based)
 * @returns {string} HTML de la tarjeta
 */
function crearCard(item, index) {
  const imagenHTML = item.image
    ? `<img src="${item.image}" alt="${item.title}" loading="lazy" />`
    : `<div class="card-placeholder">
         <i class="fa-regular fa-image"></i>
         <span>Sin imagen</span>
       </div>`;

  return `
    <a class="card" href="${item.link}" target="_blank" rel="noopener noreferrer">
      <div class="card-image-wrapper">
        ${imagenHTML}
      </div>
      <div class="card-body">
        <span class="card-number">#${String(index).padStart(2, '0')}</span>
        <h3 class="card-title">${item.title}</h3>
        <p class="card-desc">${item.description}</p>
        <span class="card-link-label">
          Ver proyecto <i class="fa-solid fa-arrow-right"></i>
        </span>
      </div>
    </a>
  `;
}

/**
 * Renderiza un array de items dentro de un contenedor del DOM.
 * @param {string} containerId - ID del elemento contenedor
 * @param {Array}  items       - Array de objetos de tarjetas
 */
function renderizarGrid(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<p class="empty-msg">Próximamente...</p>`;
    return;
  }

  container.innerHTML = items.map((item, i) => crearCard(item, i + 1)).join('');
}

// ─── RENDERIZADO DEL PROYECTO FINAL ──────────────────────────────────────────
function renderizarProyectoFinal() {
  const pf = proyectoFinal;

  document.getElementById('pf-title').textContent       = pf.title;
  document.getElementById('pf-description').textContent = pf.description;
  document.getElementById('pf-link').href               = pf.link;

  // Tags
  const tagsContainer = document.getElementById('pf-tags');
  tagsContainer.innerHTML = pf.tags
    .map(tag => `<span class="pf-tag">${tag}</span>`)
    .join('');

  // Imagen del proyecto final (funciona como hipervínculo)
  const pfImage    = document.getElementById('pf-image');
  const pfImgLink  = document.getElementById('pf-image-link');

  if (pf.image) {
    pfImage.src       = pf.image;
    pfImage.alt       = pf.title;
    pfImgLink.href    = pf.link;
  } else {
    pfImgLink.style.display = 'none';
  }
}

// ─── AÑO ACTUAL EN EL FOOTER ─────────────────────────────────────────────────
function actualizarAnio() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

// ─── NAVBAR: resaltar sección activa al hacer scroll ─────────────────────────
function iniciarNavActiva() {
  const secciones = document.querySelectorAll('section[id], header[id]');
  const navLinks  = document.querySelectorAll('.nav-links a');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => {
            link.classList.toggle(
              'active',
              link.getAttribute('href') === `#${entry.target.id}`
            );
          });
        }
      });
    },
    { threshold: 0.4 }
  );

  secciones.forEach((sec) => observer.observe(sec));
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderizarTecnologias();
  renderizarGrid('tareas-grid', tareas);
  renderizarGrid('ejercicios-grid', ejercicios);
  renderizarProyectoFinal();
  actualizarAnio();
  iniciarNavActiva();
});
