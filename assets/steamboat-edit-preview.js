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
  const variantsDataElement = document.getElementById('SteamboatEditVariantsData');

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
   * HELPERS BASE
   * =========================================================
   */
  function getProductInfoContainer() {
    return document.querySelector('[id^="ProductInfo-"]') || document;
  }

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
  let productVariants = [];

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
 * DATOS DE VARIANTES DEL PRODUCTO ACTUAL
 * ---------------------------------------------------------
 * Aquí cargamos todas las variantes del producto actual
 * para poder encontrar la variant correcta a partir de
 * la talla elegida dentro de esta misma ficha.
 * =========================================================
 */
  if (variantsDataElement) {
    try {
      const parsedVariants = JSON.parse(variantsDataElement.textContent.trim());
      productVariants = Array.isArray(parsedVariants) ? parsedVariants : [];
    } catch (error) {
      console.error('Error leyendo SteamboatEditVariantsData:', error);
      productVariants = [];
    }
  }

  /**
   * =========================================================
   * URL / SESSION / FLUJO
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

  function isFromDesignsEntry() {
    const params = new URLSearchParams(window.location.search);
    return params.get('from_designs') === '1';
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
     * Entrada desde la página de diseños:
     * respetamos diseño y ubicación,
     * pero no arrastramos talla previa de bases.
     */
    if (isFromDesignsEntry()) {
      return {
        talla: '',
        ubicacion: urlState.ubicacion || '',
        diseno: urlState.diseno || ''
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
        diseno: urlState.diseno || ''
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
   * LECTURA DEL ESTADO ACTUAL
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

  /**
 * =========================================================
 * COMPROBACIÓN DE ALINEACIÓN TALLA / VARIANT
 * ---------------------------------------------------------
 * Devuelve true solo si la variant que Dawn tiene en el DOM
 * coincide realmente con la talla visible del builder.
 * =========================================================
 */
  function doesSelectedVariantMatchTalla(talla) {
    const variantScript = getProductInfoContainer().querySelector(
      'script[type="application/json"][data-selected-variant]'
    );

    if (!variantScript) return false;

    try {
      const variantData = JSON.parse(variantScript.textContent.trim());

      if (!variantData) return false;

      if (normalizeText(variantData.option2 || '') === normalizeText(talla || '')) {
        return true;
      }

      if (Array.isArray(variantData.options)) {
        return variantData.options.some(function (optionValue) {
          return normalizeText(optionValue || '') === normalizeText(talla || '');
        });
      }

      return false;
    } catch (error) {
      console.warn('No se pudo comprobar alineación variant/talla:', error);
      return false;
    }
  }

  /**
   * =========================================================
   * SINCRONIZACIÓN
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
 * VARIANT CORRECTA SEGÚN TALLA DEL PRODUCTO ACTUAL
 * ---------------------------------------------------------
 * Busca dentro de las variantes del producto actual la
 * variante cuya talla coincida con la talla elegida.
 *
 * Como Steamboat Edit tiene un producto por base/color,
 * dentro de esta ficha basta con resolver por talla.
 * =========================================================
 */
  function getVariantIdForCurrentTalla(talla) {
    if (!talla || !Array.isArray(productVariants) || !productVariants.length) return '';

    const normalizedTalla = normalizeText(talla);

    const matchedVariant = productVariants.find(function (variant) {
      if (!variant) return false;

      if (normalizeText(variant.option2 || '') === normalizedTalla) {
        return true;
      }

      if (Array.isArray(variant.options)) {
        return variant.options.some(function (optionValue) {
          return normalizeText(optionValue || '') === normalizedTalla;
        });
      }

      return false;
    });

    return matchedVariant && matchedVariant.id ? String(matchedVariant.id) : '';
  }

  /**
 * =========================================================
 * URL + SESSION
 * ---------------------------------------------------------
 * Sincroniza la URL con el estado actual del builder.
 *
 * Regla importante:
 * - la variant no se toma de Dawn "tal cual"
 * - la resolvemos a partir de la talla actual y del JSON
 *   de variantes del producto actual
 *
 * Así evitamos guardar una variant vieja o desalineada
 * con la talla visible.
 * =========================================================
 */
  function syncUrlWithSelections() {
    const url = new URL(window.location.href);
    url.searchParams.delete('reset_builder');
    url.searchParams.delete('from_designs');

    const talla = getSelectedTalla();
    const ubicacion = getSelectedUbicacion();
    const diseno = getSelectedDiseno();
    const resolvedVariantId = getVariantIdForCurrentTalla(talla);

    if (talla) url.searchParams.set('talla', talla);
    else url.searchParams.delete('talla');

    if (ubicacion) url.searchParams.set('ubicacion', ubicacion);
    else url.searchParams.delete('ubicacion');

    if (diseno) url.searchParams.set('diseno', diseno);
    else url.searchParams.delete('diseno');

    /**
     * Si conseguimos resolver la variant correcta para la talla
     * actual dentro de este producto, la guardamos en la URL.
     * Si no, la eliminamos para no dejar una variant incorrecta.
     */
    if (resolvedVariantId) {
      url.searchParams.set('variant', resolvedVariantId);
    } else {
      url.searchParams.delete('variant');
    }

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
   * PREVIEW ACTUAL
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
   * APLICACIÓN DE ESTADO AL FORMULARIO
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
 * FLUJO BASES / RESET CONTROLADO
 * ---------------------------------------------------------
 * Limpia el builder cuando entramos desde bases
 * y no estamos en un cambio de idioma.
 * =========================================================
 */
  async function runBaseResetFlow() {
    clearSteamboatEditState();
    clearDesignSelection();

    updatePreview('');
    await forceMockupLoad();
    syncCleanBaseUrl();

    document.documentElement.classList.add('steamboat-edit-ready');
  }

  /**
 * =========================================================
 * APLICACIÓN VISUAL INICIAL DE UBICACIÓN
 * ---------------------------------------------------------
 * Decide si en el primer pase conviene marcar visualmente
 * la ubicación guardada antes de aplicar la ubicación real.
 *
 * Regla actual:
 * - si no hay ubicación en el estado, no hacemos nada
 * - si existe ubicación, sí la marcamos visualmente
 *
 * Dejamos esta decisión aislada para poder afinar después
 * el comportamiento del salto front -> back sin tocar
 * todo el primer pase de hidratación.
 * =========================================================
 */
  function shouldApplyInitialUbicacionVisual(state) {
    if (!state.ubicacion) return false;
    return true;
  }

  /**
 * =========================================================
 * APLICACIÓN VISUAL INICIAL DE TALLA
 * ---------------------------------------------------------
 * Decide si en el primer pase conviene marcar visualmente
 * la talla guardada antes de aplicar la talla real.
 *
 * Regla actual:
 * - si no hay talla en el estado, no hacemos nada
 * - si existe talla, sí la marcamos visualmente
 *
 * Dejamos esta decisión aislada para poder afinar después
 * el comportamiento del salto de talla sin tocar
 * todo el primer pase de hidratación.
 * =========================================================
 */
  function shouldApplyInitialTallaVisual(state) {
    if (!state.talla) return false;
    return true;
  }

  /**
 * =========================================================
 * PRIMER PASE DE HIDRATACIÓN
 * ---------------------------------------------------------
 * Aplica el estado inicial y deja margen a Dawn/Shopify
 * para terminar parte del render antes del refuerzo final.
 * =========================================================
 */
  async function runInitialHydrationPass(state) {
  
    if (shouldApplyInitialUbicacionVisual(state)) {
      applyUbicacionVisual(state);
    }

    if (shouldApplyInitialTallaVisual(state)) {
      applyTallaVisual(state);
    }

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
  }

  /**
 * =========================================================
 * REAPLICACIÓN FINAL DE TALLA
 * ---------------------------------------------------------
 * Decide si en el refuerzo final conviene volver a aplicar
 * la talla guardada al formulario.
 *
 * Regla actual:
 * - si la URL ya trae variant, no forzamos talla otra vez
 * - si no hay variant en URL, sí la reaplicamos
 *
 * Dejamos esta decisión aislada para poder afinar después
 * el comportamiento de los saltos sin tocar toda la
 * hidratación final.
 * =========================================================
 */
  function shouldApplyFinalTalla(state) {
    if (!state.talla) return false;
    if (hasVariantInUrl()) return false;
    return true;
  }

  /**
 * =========================================================
 * REAPLICACIÓN FINAL DE UBICACIÓN
 * ---------------------------------------------------------
 * Decide si en el refuerzo final conviene volver a aplicar
 * la ubicación guardada al formulario.
 *
 * Regla actual:
 * - si no hay ubicación en el estado, no hacemos nada
 * - si existe ubicación, la reaplicamos
 *
 * Dejamos esta decisión aislada para poder afinar después
 * el comportamiento del salto front -> back sin tocar
 * toda la hidratación final.
 * =========================================================
 */
  function shouldApplyFinalUbicacion(state) {
    if (!state.ubicacion) return false;
    return true;
  }


  /**
 * =========================================================
 * REFUERZO FINAL DE HIDRATACIÓN
 * ---------------------------------------------------------
 * Reaplica el estado tras el posible re-render tardío
 * de Dawn para dejar la ficha consistente al final.
 * =========================================================
 */
  async function runFinalHydrationPass(state) {
    await wait(250);

    if (shouldApplyFinalTalla(state)) {
      applyTalla(state);
    }

    if (shouldApplyFinalUbicacion(state)) {
      applyUbicacion(state);
    }

    if (state.diseno) {
      applyDiseno(state);
      updatePreview(state.diseno);
    } else {
      updatePreview('');
    }

    await forceMockupLoad();
    syncUrlWithSelections();

    document.documentElement.classList.add('steamboat-edit-ready');
  }

  /**
* =========================================================
* FLUJO NORMAL DE HIDRATACIÓN
* ---------------------------------------------------------
* Orquesta el arranque estándar del builder
* en dos fases:
* - pase inicial
* - refuerzo final
* =========================================================
*/
  async function runHydrationFlow(state) {
    await runInitialHydrationPass(state);
    await runFinalHydrationPass(state);
  }

  /**
   * =========================================================
   * INICIALIZACIÓN
   * =========================================================
   */
  async function initFromState() {

    /**
 * =========================================================
 * RESOLUCIÓN DE ESTADO INICIAL
 * ---------------------------------------------------------
 * Aquí resolvemos:
 * - si venimos de cambio de idioma
 * - si venimos de bases
 * - si venimos de diseños
 * - o si restauramos desde URL / session
 * =========================================================
 */
    const pendingLocaleSwitch =
      sessionStorage.getItem('steamboat_edit_pending_locale_switch') === '1';

    const state = getEffectiveState();

    try {
      /**
 * =========================================================
 * RAMA: ENTRADA DESDE BASES
 * ---------------------------------------------------------
 * Si venimos desde bases y no estamos restaurando
 * por cambio de idioma, arrancamos en limpio.
 * =========================================================
 */
      if (shouldResetBuilder() && !pendingLocaleSwitch) {
        await runBaseResetFlow();
        return;
      }

      /**
 * =========================================================
 * RAMA: HIDRATACIÓN NORMAL
 * ---------------------------------------------------------
 * Aquí entran:
 * - flujo normal
 * - cambio de idioma
 * - entrada desde diseños
 * =========================================================
 */

      await runHydrationFlow(state);
    } finally {

      /**
 * =========================================================
 * LIMPIEZA FINAL
 * ---------------------------------------------------------
 * Al terminar:
 * - eliminamos el flag temporal de idioma
 * - quitamos la clase de carga de ubicación
 * =========================================================
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
   * EVENTOS Y OBSERVADOR
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

  const observer = new MutationObserver(function () {
    updateColorLinks();
  });

  observer.observe(getProductInfoContainer(), {
    childList: true,
    subtree: true
  });

  updateColorLinks();
});