document.addEventListener("DOMContentLoaded", function () {
  function setupVideos() {
    const videos = document.querySelectorAll("video");

    videos.forEach((video) => {
      // Configurar atributos esenciales
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.removeAttribute("controls");
      video.removeAttribute("poster"); // Eliminar previsualización estática

      // Asegurar que el video se reproduce automáticamente
      video.play().catch((error) => {
        console.log("Autoplay bloqueado, intentando de nuevo...");
        setTimeout(() => {
          video.play().catch((e) => console.log("No se pudo iniciar el video", e));
        }, 500);
      });

      // Ocultar el botón de play si existe
      const parent = video.closest(".deferred-media");
      if (parent) {
        const posterButton = parent.querySelector(".deferred-media__poster");
        if (posterButton) {
          posterButton.style.display = "none";
        }
      }

      // Ocultar el botón de zoom en móviles
      const mediaToggle = video.closest(".product__media-container")?.querySelector(".product__media-toggle");
      if (mediaToggle) {
        mediaToggle.style.display = "none";
      }
    });
  }

  // Ejecutar la función inmediatamente
  setupVideos();

  // Observar cambios en el DOM (para cargar videos dinámicos)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        setupVideos();
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // También ejecutarlo después de que la página haya cargado completamente
  window.addEventListener("load", setupVideos);
});
