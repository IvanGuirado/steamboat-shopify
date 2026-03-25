/**
 * =========================================================
 * STEAMBOAT EDIT - PREVIEW JS
 * ---------------------------------------------------------
 * Este archivo controla:
 * 1. Leer selección actual (talla, ubicación, diseño)
 * 2. Aplicar selección desde la URL
 * 3. Actualizar la imagen del diseño
 * 4. Actualizar el mockup según color + ubicación
 * 5. Mantener sincronizada la URL
 * 6. Mantener actualizados los enlaces de color
 * =========================================================
 */

document.addEventListener('DOMContentLoaded', function () {
  /**
   * Detecta si estamos en una ficha de Steamboat Edit.
   * Si no existe el preview personalizado, no hace nada.
   */
  const isSteamboatEdit =
    document.getElementById('custom-left-mockup') ||
    document.getElementById('custom-left-design');

  if (!isSteamboatEdit) return;

  /**
   * Parámetros actuales de la URL
   * - talla
   * - ubicacion
   * - diseno
   */
  const params = new URLSearchParams(window.location.search);

  const tallaFromUrl = params.get('talla');
  const ubicacionFromUrl = params.get('ubicacion');
  const designFromUrl = params.get('diseno');

  /**
   * Elementos del DOM que vamos a usar
   */
  const designSelect = document.getElementById('custom-design');
  const leftDesign = document.getElementById('custom-left-design');
  const mockupPreview = document.getElementById('mockup-preview');
  const leftMockup = document.getElementById('custom-left-mockup');

  /**
   * Mapa de imágenes de diseño
   * La clave técnica (ej: el_vigilante) apunta a la imagen PNG del diseño.
   */
  const designImages = {
    pa_amb_sobrassada:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/Pa_amb_sobrassada.png?v=1773930526',
    yokai: 'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/Yokai.png?v=1773931299',
    zoltar: 'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/Zoltar.png?v=1773930797',
    manzana_maldita:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/Manzana_Maldita.png?v=1773930849',
    el_vigilante:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/El_vigilante.png?v=1773930605',
    nina_calabaza:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/Ni_a_Calabaza.png?v=1773930825',
    dead_tide:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/Dead_Tide.png?v=1774285550',
    steamboat:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/Steamboat.png?v=1773930493',
    sunset_octopus:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/Octosurf.png?v=1773930969',
    beach_break:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/Melting-ice.png?v=1773931002',
    ice_scream:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/ice-scream.png?v=1773930659',
    honey_bones:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/Spring_bees.png?v=1773930580',
    moon_surfers:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/Moon_surfers.png?v=1773930711',
    skull_mermaid:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/Skull_mermaid.png?v=1773931024',
    night_blooms:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/night_bloom.png?v=1773930752',
    steam_dragon:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/white-dragon.png?v=1773930778',
    eolo:
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/eolo.png?v=1773930926',
  };

  /**
   * Mapa de mockups
   * Combina color + ubicación para decidir qué mockup cargar.
   */
  const mockupMap = {
    'Blanco|front':
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/camiseta_blanca-disenofront.webp?v=1774024437',
    'Blanco|back':
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/camiseta_blanca-disenoback.webp?v=1774024437',
    'Negro|front':
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/camiseta_negra-disenofront.webp?v=1774024437',
    'Negro|back':
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/camiseta_negra-disenoback.webp?v=1774024437',
    'White|front':
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/camiseta_blanca-disenofront.webp?v=1774024437',
    'White|back':
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/camiseta_blanca-disenoback.webp?v=1774024437',
    'Black|front':
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/camiseta_negra-disenofront.webp?v=1774024437',
    'Black|back':
      'https://cdn.shopify.com/s/files/1/0891/7205/0264/files/camiseta_negra-disenoback.webp?v=1774024437',
  };

  /**
   * Normaliza texto:
   * - quita tildes
   * - pasa a minúsculas
   * - recorta espacios
   * Sirve para comparar valores de forma segura.
   */
  function normalizeText(text) {
    return (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  /**
   * Devuelve la talla seleccionada actualmente.
   * Busca la opción radio activa del selector de talla.
   */
  function getSelectedTalla() {
    const checkedPill = document.querySelector('.product-form__input--pill input[type="radio"]:checked');
    return checkedPill ? checkedPill.value.trim() : '';
  }

  /**
   * Devuelve la ubicación técnica seleccionada:
   * - front
   * - back
   */
  function getSelectedUbicacion() {
    const checked = document.querySelector('input[data-placement-value]:checked');
    return checked ? checked.getAttribute('data-placement-value').trim() : '';
  }

  /**
   * Devuelve la key técnica del diseño seleccionado.
   * La obtiene del atributo data-design-key del option activo.
   */
  function getSelectedDiseno() {
    if (!designSelect) return '';
    const selectedOption = designSelect.options[designSelect.selectedIndex];
    return selectedOption ? (selectedOption.getAttribute('data-design-key') || '').trim() : '';
  }

  /**
   * Detecta el color actualmente seleccionado.
   * Intenta leerlo desde radios, spans con valor seleccionado o selects.
   */
  function getSelectedColorMockup() {
    const checkedRadios = document.querySelectorAll('input[type="radio"]:checked');

    for (const radio of checkedRadios) {
      const value = (radio.value || '').trim();
      if (value === 'Blanco' || value === 'Negro' || value === 'White' || value === 'Black') return value;
    }

    const selectedSpans = document.querySelectorAll('[data-selected-value]');
    for (const span of selectedSpans) {
      const value = (span.textContent || '').trim();
      if (value === 'Blanco' || value === 'Negro' || value === 'White' || value === 'Black') return value;
    }

    const selects = document.querySelectorAll('select');
    for (const select of selects) {
      const value = (select.value || '').trim();
      if (value === 'Blanco' || value === 'Negro' || value === 'White' || value === 'Black') return value;
    }

    return 'White';
  }

  /**
   * Actualiza los enlaces de color (.js-color-link)
   * para que mantengan:
   * - talla
   * - ubicacion
   * - diseno
   * al cambiar entre productos blanco/negro.
   */
  function updateColorLinks() {
    const colorLinks = document.querySelectorAll('.js-color-link');
    const talla = getSelectedTalla();
    const ubicacion = getSelectedUbicacion();
    const diseno = getSelectedDiseno();

    colorLinks.forEach(function (link) {
      const baseUrl = link.getAttribute('data-base-url');
      if (!baseUrl) return;

      const url = new URL(baseUrl, window.location.origin);

      if (talla) url.searchParams.set('talla', talla);
      if (ubicacion) url.searchParams.set('ubicacion', ubicacion);
      if (diseno) url.searchParams.set('diseno', diseno);

      link.href = url.pathname + url.search;
    });
  }

  /**
   * Actualiza la imagen del diseño en el preview izquierdo.
   * Carga primero la imagen en memoria y luego la muestra.
   */
  function updatePreview(selectedDesign) {
    if (!leftDesign) return;

    const imageUrl = designImages[selectedDesign];

    if (!imageUrl) {
      leftDesign.src = '';
      leftDesign.style.display = 'none';
      leftDesign.alt = '';
      updateColorLinks();
      return;
    }

    const tempImg = new Image();

    tempImg.onload = function () {
      leftDesign.src = imageUrl;
      leftDesign.alt = selectedDesign;
      leftDesign.style.display = 'block';
    };

    tempImg.onerror = function () {
      leftDesign.src = '';
      leftDesign.alt = '';
      leftDesign.style.display = 'none';
    };

    tempImg.src = imageUrl;
    updateColorLinks();
  }

  /**
   * Asigna la imagen del mockup a los elementos de preview.
   */
  function setMockupImage(url) {
    if (!url) return;

    if (leftMockup) leftMockup.style.display = 'none';
    if (mockupPreview) mockupPreview.style.display = 'none';

    const tempImg = new Image();

    tempImg.onload = function () {
      if (leftMockup) {
        leftMockup.src = url;
        leftMockup.style.display = 'block';
      }

      if (mockupPreview) {
        mockupPreview.src = url;
        mockupPreview.style.display = 'block';
      }
    };

    tempImg.src = url;
  }

  /**
   * Recalcula el mockup según:
   * - color actual
   * - ubicación actual
   */
  function updateMockupOnly() {
    const color = getSelectedColorMockup();
    const ubicacion = getSelectedUbicacion() || 'front';
    const key = color + '|' + ubicacion;
    const imageUrl = mockupMap[key];

    if (!imageUrl) return;
    setMockupImage(imageUrl);
  }

  /**
   * Aplica la talla que venga en la URL.
   */
  function applyTallaFromUrl() {
    if (!tallaFromUrl) return;

    const tallaInputs = document.querySelectorAll('.product-form__input--pill input[type="radio"]');

    tallaInputs.forEach(function (input) {
      if (normalizeText(input.value) === normalizeText(tallaFromUrl)) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  /**
   * Aplica la ubicación que venga en la URL.
   */
  function applyUbicacionFromUrl() {
    if (!ubicacionFromUrl) return;

    const ubicacionInputs = document.querySelectorAll('input[data-placement-value]');

    ubicacionInputs.forEach(function (input) {
      const technicalValue = input.getAttribute('data-placement-value') || '';
      if (normalizeText(technicalValue) === normalizeText(ubicacionFromUrl)) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  /**
   * Aplica el diseño que venga en la URL.
   */
  function applyDesignFromUrl() {
    if (!designFromUrl || !designSelect) return;

    for (const option of designSelect.options) {
      const technicalValue = option.getAttribute('data-design-key') || '';
      if (normalizeText(technicalValue) === normalizeText(designFromUrl)) {
        designSelect.value = option.value;
        break;
      }
    }
  }

  /**
   * Reescribe la URL actual con las selecciones activas.
   * Así el usuario puede cambiar color o recargar sin perder estado.
   */
  function syncUrlWithSelections() {
    const cleanBaseUrl = window.location.origin + window.location.pathname;
    const url = new URL(cleanBaseUrl);

    const talla = getSelectedTalla();
    const ubicacion = getSelectedUbicacion();
    const diseno = getSelectedDiseno();

    if (talla) url.searchParams.set('talla', talla);
    if (ubicacion) url.searchParams.set('ubicacion', ubicacion);
    if (diseno) url.searchParams.set('diseno', diseno);

    window.history.replaceState({}, '', url.toString());
    updateColorLinks();
  }

  /**
   * 1. Recupera selecciones desde la URL
   * 2. Actualiza previews iniciales
   */
  applyTallaFromUrl();
  applyUbicacionFromUrl();
  applyDesignFromUrl();

  if (designSelect) {
    updatePreview(getSelectedDiseno());

    /**
     * Cuando cambia el diseño:
     * - actualiza preview del diseño
     * - sincroniza la URL
     */
    designSelect.addEventListener('change', function () {
      updatePreview(getSelectedDiseno());
      syncUrlWithSelections();
    });
  }

  updateMockupOnly();
  updateColorLinks();

  /**
   * Escucha cambios generales del formulario:
   * - talla
   * - ubicación
   * - selects
   *
   * y refresca:
   * - URL
   * - mockup
   */
  document.addEventListener('change', function (event) {
    const target = event.target;
    if (!target) return;

    if (
      target.matches('.product-form__input--pill input[type="radio"]') ||
      target.matches('input[data-placement-value]') ||
      target.matches('select')
    ) {
      syncUrlWithSelections();
      setTimeout(updateMockupOnly, 50);
    }
  });
});