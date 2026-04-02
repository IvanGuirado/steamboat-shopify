/**
 * =========================================================
 * STEAMBOAT EDIT - PREVIEW JS
 * ---------------------------------------------------------
 * Este archivo controla el comportamiento visual y de estado
 * del builder de Steamboat Edit.
 *
 * OBJETIVOS:
 * 1. Desde BASES:
 *    - mostrar mockup
 *    - no mostrar diseño
 *    - dejar el select vacío
 *
 * 2. Desde DISEÑOS:
 *    - mostrar mockup
 *    - mostrar imagen del diseño
 *    - dejar el nombre del diseño seleccionado en el select
 *
 * 3. En cambio de idioma y refresh:
 *    - recuperar estado desde sessionStorage cuando toca
 *
 * NOTAS:
 * - No depende de "Talla" o "Size"
 * - La talla se detecta por data-option-value-id
 * - La ubicación se detecta por data-placement-value
 * =========================================================
 */

document.addEventListener('DOMContentLoaded', function () {
  /**
   * =========================================================
   * DETECCIÓN DE PRODUCTO STEAMBOAT EDIT
   * =========================================================
   */
  const leftMockup = document.getElementById('custom-left-mockup');
  const leftDesign = document.getElementById('custom-left-design');
  const leftDesignWrapper = document.getElementById('custom-left-design-wrapper');
  const mockupPreview = document.getElementById('mockup-preview');
  const previewDataElement = document.getElementById('SteamboatEditPreviewData');

  const isSteamboatEdit =
    leftMockup || leftDesign || previewDataElement || document.getElementById('custom-design');

  if (!isSteamboatEdit) return;

  /**
   * Clase visual:
   * - steamboat-edit-ready: la ficha ya terminó de inicializar
   * - steamboat-location-loading: oculta temporalmente ubicación
   */
  document.documentElement.classList.remove('steamboat-edit-ready');
  document.documentElement.classList.add('steamboat-location-loading');

  /**
   * =========================================================
   * CLAVE DE SESSION STORAGE
   * =========================================================
   */
  const STORAGE_KEY = 'steamboat_edit_state';

  /**
   * =========================================================
   * CONTENEDORES PRINCIPALES
   * =========================================================
   */
  function getProductInfoContainer() {
    return document.querySelector('[id^="ProductInfo-"]') || document;
  }

  /**
   * =========================================================
   * INPUTS Y CAMPOS DEL CONFIGURADOR
   * =========================================================
   */

  /**
   * Radios de talla reales de Shopify.
   * No dependemos de nombres traducidos como Talla / Size.
   */
  function getTallaInputs() {
    return Array.from(
      getProductInfoContainer().querySelectorAll(
        '.product-form__input--pill input[type="radio"][data-option-value-id]'
      )
    );
  }

  /**
   * Radios de ubicación custom: front / back.
   */
  function getUbicacionInputs() {
    return Array.from(
      getProductInfoContainer().querySelectorAll(
        '.custom-location-radios input[data-placement-value]'
      )
    );
  }

  /**
   * Enlaces de color/base del builder.
   */
  function getColorLinks() {
    return Array.from(document.querySelectorAll('.js-color-link'));
  }

  /**
   * Select del diseño.
   */
  function getDesignSelect() {
    return document.getElementById('custom-design');
  }

  /**
   * =========================================================
   * DATOS DEL PREVIEW
   * =========================================================
   */
  let designImages = {};
  let mockupMap = {};
  let normalizedMockupMap = {};

  /**
   * =========================================================
   * UTILIDADES
   * =========================================================
   */

  /**
   * Normaliza texto:
   * - quita tildes
   * - pasa a minúsculas
   * - recorta espacios
   */
  function normalizeText(text) {
    return (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  /**
   * Normaliza una clave del mockupMap para comparar
   * variantes como White|front, Blanco|front, etc.
   */
  function normalizeMockupKey(key) {
    return normalizeText(key).replace(/\s+/g, '');
  }

  /**
   * Espera corta útil para dejar a Dawn re-renderizar.
   */
  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * =========================================================
   * CARGA DE DATOS DESDE EL SCRIPT JSON
   * =========================================================
   */
  if (previewDataElement) {
    try {
      const previewData = JSON.parse(previewDataElement.textContent.trim());
      const designs = previewData.designs || [];
      mockupMap = previewData.mockupMap || {};

      designs.forEach(function (design) {
        if (design.key && design.image) {
          designImages[design.key] = design.image;
        }
      });

      Object.keys(mockupMap).forEach(function (key) {
        normalizedMockupMap[normalizeMockupKey(key)] = mockupMap[key];
      });
    } catch (error) {
      console.error('Error leyendo SteamboatEditPreviewData:', error);
    }
  }

  /**
   * =========================================================
   * URL Y STORAGE
   * =========================================================
   */

  /**
   * Lee parámetros técnicos de la URL.
   */
  function getUrlState() {
    const params = new URLSearchParams(window.location.search);

    return {
      talla: params.get('talla') || '',
      ubicacion: params.get('ubicacion') || '',
      diseno: params.get('diseno') || ''
    };
  }

  function hasVariantInUrl() {
    const params = new URLSearchParams(window.location.search);
    return !!params.get('variant');
  }

  /**
   * Detecta si entramos desde la página de bases.
   */
  function shouldResetBuilder() {
    const params = new URLSearchParams(window.location.search);
    return params.get('reset_builder') === '1';
  }

  /**
   * Limpia el estado guardado del builder.
   */
  function clearSteamboatEditState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('No se pudo limpiar steamboat_edit_state:', error);
    }
  }

  /**
   * Guarda el estado actual.
   */
  function saveStateToSession(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('No se pudo guardar Steamboat Edit en sessionStorage:', error);
    }
  }

  /**
   * Lee el estado guardado.
   */
  function getStateFromSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.warn('No se pudo leer Steamboat Edit de sessionStorage:', error);
      return null;
    }
  }

  /**
   * Limpia el select del diseño.
   * Requiere que exista una opción vacía:
   * <option value="" data-design-key=""></option>
   */
  function clearDesignSelection() {
    const designSelect = getDesignSelect();
    if (!designSelect) return;

    designSelect.value = '';

    const emptyOption = designSelect.querySelector('option[value=""]');
    if (emptyOption) {
      emptyOption.selected = true;
    }
  }

  /**
   * Limpia la URL del flujo bases.
   * Mantiene solo la talla si existe.
   */
  function syncCleanBaseUrl() {
    const url = new URL(window.location.href);
    const talla = getSelectedTalla();

    url.searchParams.delete('reset_builder');
    url.searchParams.delete('ubicacion');
    url.searchParams.delete('diseno');

    if (talla) url.searchParams.set('talla', talla);
    else url.searchParams.delete('talla');

    window.history.replaceState({}, '', url.pathname + url.search);
  }

  /**
   * =========================================================
   * ESTADO EFECTIVO
   * ---------------------------------------------------------
   * Prioridades:
   * 1. Cambio de idioma => sessionStorage primero
   * 2. Flujo bases => limpio
   * 3. Flujo diseños => diseño de URL, sin arrastrar talla
   * 4. Flujo normal => URL o session
   * =========================================================
   */
  function getEffectiveState() {
    const urlState = getUrlState();
    const storedState = getStateFromSession() || {};
    const pendingLocaleSwitch =
      sessionStorage.getItem('steamboat_edit_pending_locale_switch') === '1';

    /**
     * 1. CAMBIO DE IDIOMA
     * No borramos el flag aquí; se limpia al final de initFromState().
     */
    if (pendingLocaleSwitch) {
      return {
        talla: storedState.talla || urlState.talla || '',
        ubicacion: storedState.ubicacion || urlState.ubicacion || '',
        diseno: storedState.diseno || urlState.diseno || '',
      };
    }

    /**
     * 2. FLUJO BASES
     */
    if (shouldResetBuilder()) {
      clearSteamboatEditState();

      return {
        talla: '',
        ubicacion: '',
        diseno: ''
      };
    }

    /**
     * 3. FLUJO DISEÑOS
     * Si la URL trae diseño pero no talla ni ubicación,
     * no arrastramos talla/ubicación viejas.
     */
    if (urlState.diseno && !urlState.talla && !urlState.ubicacion) {
      return {
        talla: '',
        ubicacion: '',
        diseno: urlState.diseno
      };
    }

    /**
     * 4. FLUJO NORMAL
     */
    return {
      talla: urlState.talla || storedState.talla || '',
      ubicacion: urlState.ubicacion || storedState.ubicacion || '',
      diseno: urlState.diseno || storedState.diseno || ''
    };
  }

  /**
   * =========================================================
   * LECTURA DE VALORES ACTUALES
   * =========================================================
   */

  function getSelectedTalla() {
    const checked = getTallaInputs().find((input) => input.checked);
    return checked ? (checked.value || '').trim() : '';
  }

  function getSelectedUbicacion() {
    const checked = getUbicacionInputs().find((input) => input.checked);
    return checked ? (checked.getAttribute('data-placement-value') || '').trim() : '';
  }

  function getSelectedDiseno() {
    const designSelect = getDesignSelect();
    if (!designSelect) return '';

    if (designSelect.selectedIndex < 0) return '';

    const selectedOption = designSelect.options[designSelect.selectedIndex];
    return selectedOption ? (selectedOption.getAttribute('data-design-key') || '').trim() : '';
  }



  /**
   * Detecta color actual para elegir el mockup base.
   */
  function getSelectedColorMockup() {
    const checkedRadios = getProductInfoContainer().querySelectorAll('input[type="radio"]:checked');

    for (const radio of checkedRadios) {
      const value = (radio.value || '').trim();
      if (value === 'Blanco' || value === 'Negro' || value === 'White' || value === 'Black') {
        return value;
      }
    }

    const selectedSpans = getProductInfoContainer().querySelectorAll('[data-selected-value]');
    for (const span of selectedSpans) {
      const value = (span.textContent || '').trim();
      if (value === 'Blanco' || value === 'Negro' || value === 'White' || value === 'Black') {
        return value;
      }
    }

    /**
     * Fallback por handle/ruta.
     */
    const pathname = window.location.pathname.toLowerCase();
    if (pathname.includes('negra') || pathname.includes('black')) return 'Black';
    return 'White';
  }

  /**
   * =========================================================
   * ENLACES DE COLOR
   * =========================================================
   */
  function updateColorLinks() {
    const talla = getSelectedTalla();
    const ubicacion = getSelectedUbicacion();
    const diseno = getSelectedDiseno();

    getColorLinks().forEach(function (link) {
      const baseUrl = link.getAttribute('data-base-url');
      if (!baseUrl) return;

      const url = new URL(baseUrl, window.location.origin);

      if (talla) url.searchParams.set('talla', talla);
      else url.searchParams.delete('talla');

      if (ubicacion) url.searchParams.set('ubicacion', ubicacion);
      else url.searchParams.delete('ubicacion');

      if (diseno) url.searchParams.set('diseno', diseno);
      else url.searchParams.delete('diseno');

      link.href = url.pathname + url.search;
    });
  }

  /**
   * =========================================================
   * PREVIEW DEL DISEÑO
   * =========================================================
   */
  function updatePreview(selectedDesign) {
    if (!leftDesign || !leftDesignWrapper) return;

    const imageUrl = designImages[selectedDesign];

    /**
     * Sin diseño:
     * ocultamos completamente la ilustración.
     */
    if (!imageUrl) {
      leftDesign.src = '';
      leftDesign.alt = '';
      leftDesign.style.display = 'none';
      leftDesign.style.visibility = 'hidden';

      leftDesignWrapper.classList.remove('is-loaded');
      leftDesignWrapper.style.display = 'none';
      return;
    }

    /**
     * Igual que el mockup:
     * no enseñamos nada hasta que la imagen haya cargado.
     */
    const tempImg = new Image();

    tempImg.onload = function () {
      leftDesign.src = imageUrl;
      leftDesign.alt = selectedDesign;
      leftDesign.style.display = 'block';
      leftDesign.style.visibility = 'visible';

      leftDesignWrapper.style.display = 'block';
      leftDesignWrapper.classList.add('is-loaded');
    };

    tempImg.onerror = function () {
      leftDesign.src = '';
      leftDesign.alt = '';
      leftDesign.style.display = 'none';
      leftDesign.style.visibility = 'hidden';

      leftDesignWrapper.classList.remove('is-loaded');
      leftDesignWrapper.style.display = 'none';
    };

    tempImg.src = imageUrl;
  }

  /**
   * =========================================================
   * MOCKUP BASE
   * =========================================================
   */

  /**
   * Aplica la imagen base del mockup una vez cargada.
   */
  function setMockupImage(url) {
    if (!url) return;

    const tempImg = new Image();

    tempImg.onload = function () {
      if (leftMockup) {
        leftMockup.src = url;
        leftMockup.style.display = 'block';
        leftMockup.style.visibility = 'visible';
      }

      if (mockupPreview) {
        mockupPreview.src = url;
        mockupPreview.style.display = 'block';
        mockupPreview.style.visibility = 'visible';
      }
    };

    tempImg.src = url;
  }

  /**
   * Busca una URL válida del mockup usando varias claves
   * posibles para soportar ES/EN.
   */
  function findMockupUrl(color, ubicacion) {
    const keys = [
      `${color} | ${ubicacion}`,
      `${color} | front`,
      `${normalizeText(color) === 'blanco' ? 'White' : color}| ${ubicacion}`,
      `${normalizeText(color) === 'negro' ? 'Black' : color}| ${ubicacion}`,
      `${normalizeText(color) === 'white' ? 'Blanco' : color}| ${ubicacion}`,
      `${normalizeText(color) === 'black' ? 'Negro' : color}| ${ubicacion}`,
      `White | ${ubicacion}`,
      `Black | ${ubicacion}`,
      `Blanco | ${ubicacion}`,
      `Negro | ${ubicacion}`,
      'White|front',
      'Black|front',
      'Blanco|front',
      'Negro|front'
    ];

    for (const key of keys) {
      const normalized = normalizeMockupKey(key);
      if (normalizedMockupMap[normalized]) return normalizedMockupMap[normalized];
    }

    return '';
  }

  /**
   * Actualiza el mockup base según color y ubicación.
   */
  function updateMockupOnly() {
    const color = getSelectedColorMockup();
    const ubicacion = getSelectedUbicacion() || 'front';
    const imageUrl = findMockupUrl(color, ubicacion);

    if (!imageUrl) return;
    setMockupImage(imageUrl);
  }

  /**
   * Reintenta cargar el mockup varias veces por si Shopify/Dawn
   * todavía no ha terminado de pintar el DOM.
   */
  async function forceMockupLoad(retries = 8, delay = 120) {
    for (let i = 0; i < retries; i += 1) {
      updateMockupOnly();

      const hasSrc =
        (leftMockup && leftMockup.getAttribute('src')) ||
        (mockupPreview && mockupPreview.getAttribute('src'));

      if (hasSrc) return true;
      await wait(delay);
    }

    return false;
  }

  /**
   * Reintenta aplicar el diseño varias veces por si el select
   * todavía no está del todo listo.
   */
  async function forceDesignLoad(state, retries = 8, delay = 120) {
    if (!state.diseno) return false;

    for (let i = 0; i < retries; i += 1) {
      const applied = applyDiseno(state);

      if (applied) {
        updatePreview(getSelectedDiseno());
        return true;
      }

      await wait(delay);
    }

    return false;
  }

  /**
   * =========================================================
   * URL + SESSION
   * =========================================================
   */

  /**
 * Devuelve el id de la variante actualmente seleccionada
 * desde el JSON que deja Dawn en el DOM.
 */
  function getSelectedVariantId() {
    const variantScript = getProductInfoContainer().querySelector(
      'script[type="application/json"][data-selected-variant]'
    );

    if (!variantScript) return '';

    try {
      const variantData = JSON.parse(variantScript.textContent.trim());
      return variantData && variantData.id ? String(variantData.id) : '';
    } catch (error) {
      console.warn('No se pudo leer data-selected-variant:', error);
      return '';
    }
  }

  function syncUrlWithSelections() {
    const url = new URL(window.location.href);
    url.searchParams.delete('reset_builder');

    const talla = getSelectedTalla();
    const ubicacion = getSelectedUbicacion();
    const diseno = getSelectedDiseno();
    const variantId = getSelectedVariantId();


    if (talla) url.searchParams.set('talla', talla);
    else url.searchParams.delete('talla');

    if (ubicacion) url.searchParams.set('ubicacion', ubicacion);
    else url.searchParams.delete('ubicacion');

    if (diseno) url.searchParams.set('diseno', diseno);
    else url.searchParams.delete('diseno');

    if (variantId) url.searchParams.set('variant', variantId);
    else url.searchParams.delete('variant');

    window.history.replaceState({}, '', url.pathname + url.search);

    saveStateToSession({
      talla: talla,
      ubicacion: ubicacion,
      diseno: diseno
    });

    updateColorLinks();
  }

  /**
   * =========================================================
   * APLICAR ESTADO DESDE URL / SESSION
   * =========================================================
   */

  /**
 * Marca visualmente la talla correcta sin disparar change.
 * Sirve para evitar el flash inicial del borde gris.
 */
  function applyTallaVisual(state) {
    if (!state.talla) return false;

    let applied = false;

    getTallaInputs().forEach(function (input) {
      if (normalizeText(input.value) === normalizeText(state.talla)) {
        input.checked = true;
        applied = true;
      }
    });

    return applied;
  }

  function applyTalla(state) {
    if (!state.talla) return false;

    let applied = false;

    getTallaInputs().forEach(function (input) {
      if (normalizeText(input.value) === normalizeText(state.talla)) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        applied = true;
      }
    });

    return applied;
  }

  function applyUbicacionVisual(state) {
    if (!state.ubicacion) return false;

    let applied = false;

    getUbicacionInputs().forEach(function (input) {
      const value = input.getAttribute('data-placement-value') || '';
      if (normalizeText(value) === normalizeText(state.ubicacion)) {
        input.checked = true;
        applied = true;
      }
    });

    return applied;
  }

  function applyUbicacion(state) {
    if (!state.ubicacion) return false;

    let applied = false;

    getUbicacionInputs().forEach(function (input) {
      const value = input.getAttribute('data-placement-value') || '';
      if (normalizeText(value) === normalizeText(state.ubicacion)) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        applied = true;
      }
    });

    return applied;
  }

  function applyDiseno(state) {
    const designSelect = getDesignSelect();
    if (!state.diseno || !designSelect) return false;

    let applied = false;

    for (const option of designSelect.options) {
      const value = option.getAttribute('data-design-key') || '';
      if (normalizeText(value) === normalizeText(state.diseno)) {
        designSelect.value = option.value;
        option.selected = true;
        applied = true;
        break;
      }
    }

    return applied;
  }

  /**
   * =========================================================
   * INICIALIZACIÓN
   * =========================================================
   */
  async function initFromState() {
    const pendingLocaleSwitch =
      sessionStorage.getItem('steamboat_edit_pending_locale_switch') === '1';

    const state = getEffectiveState();

    try {
      /**
       * FLUJO BASES
       * Solo entramos limpios si venimos de bases y NO estamos
       * en un cambio de idioma.
       */
      if (shouldResetBuilder() && !pendingLocaleSwitch) {
        clearSteamboatEditState();
        clearDesignSelection();

        updatePreview('');
        await forceMockupLoad();
        syncCleanBaseUrl();

        document.documentElement.classList.add('steamboat-edit-ready');
        return;
      }

      /**
       * FLUJO NORMAL / CAMBIO DE IDIOMA / ENTRADA DESDE DISEÑOS
       */
      applyUbicacionVisual(state);
      applyTallaVisual(state);

      await wait(220);

      applyUbicacion(state);

      await wait(60);

      if (state.diseno) {
        applyDiseno(state);
        updatePreview(state.diseno);
      } else {
        updatePreview('');
      }

      await forceMockupLoad();
      syncUrlWithSelections();

      /**
       * Refuerzo final por si Dawn re-renderiza tarde
       */
      await wait(250);

      if (!hasVariantInUrl()) {
        applyTalla(state);
      }

      applyUbicacion(state);

      if (state.diseno) {
        applyDiseno(state);
        updatePreview(state.diseno);
      } else {
        updatePreview('');
      }

      await forceMockupLoad();
      syncUrlWithSelections();

      document.documentElement.classList.add('steamboat-edit-ready');
    } finally {
      /**
       * Aquí sí limpiamos el flag del cambio de idioma,
       * una vez que ya hemos terminado de usarlo.
       */
      if (pendingLocaleSwitch) {
        sessionStorage.removeItem('steamboat_edit_pending_locale_switch');
      }

      document.documentElement.classList.remove('steamboat-location-loading');
    }
  }

  initFromState();

  /**
   * =========================================================
   * EVENTOS DELEGADOS
   * =========================================================
   */
  document.addEventListener('change', function (event) {
    const target = event.target;
    if (!target) return;

    /**
     * Cambio de talla
     */
    if (target.matches('.product-form__input--pill input[type="radio"][data-option-value-id]')) {
      setTimeout(function () {
        syncUrlWithSelections();
      }, 150);
      return;
    }

    /**
     * Cambio de ubicación
     */
    if (target.matches('.custom-location-radios input[data-placement-value]')) {
      syncUrlWithSelections();
      updateMockupOnly();
      return;
    }

    /**
     * Cambio de diseño
     */
    if (target.matches('#custom-design')) {
      updatePreview(getSelectedDiseno());
      syncUrlWithSelections();
      return;
    }
  });

  /**
   * =========================================================
   * OBSERVADOR
   * =========================================================
   */
  const observer = new MutationObserver(function () {
    updateColorLinks();
  });

  observer.observe(getProductInfoContainer(), {
    childList: true,
    subtree: true
  });

  updateColorLinks();
});