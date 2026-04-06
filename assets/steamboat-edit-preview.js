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

(function () {
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
  * ÚLTIMO ESTADO SINCRONIZADO
  * ---------------------------------------------------------
  * Sirve para no reescribir URL/session si talla, ubicación,
  * diseño y variant siguen exactamente igual.
  */
  let lastSyncedStateKey = '';

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
  * UTILIDAD DE ESTADO / URL
  * ---------------------------------------------------------
  * Lee los parámetros técnicos del builder desde la URL:
  * - talla
  * - ubicación
  * - diseño
  *
  * No renderiza preview ni modifica el DOM visual.
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
  * UTILIDAD DE ESTADO / SESSION
  * ---------------------------------------------------------
  * Elimina el estado guardado del builder en sessionStorage.
  * No toca preview ni DOM visual.
  */

  function clearSteamboatEditState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('No se pudo limpiar steamboat_edit_state:', error);
    }
  }
  /**
* UTILIDAD DE ESTADO / SESSION
* ---------------------------------------------------------
* Guarda en sessionStorage el estado actual del builder.
* No renderiza ni modifica visualmente el preview.
*
* Importante:
* evitamos usar console.warn aquí porque ahora mismo está
* provocando un error y cortando el guardado del estado.
*/
  function saveStateToSession(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      if (window.console && typeof window.console.log === 'function') {
        window.console.log('No se pudo guardar Steamboat Edit en sessionStorage:', error);
      }
    }
  }

  /**
* UTILIDAD DE ESTADO / SESSION
* ---------------------------------------------------------
* Lee el estado guardado del builder desde sessionStorage.
* No renderiza preview ni modifica el DOM visual.
*/
  function getStateFromSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      if (window.console && typeof window.console.log === 'function') {
        window.console.log('No se pudo leer Steamboat Edit de sessionStorage:', error);
      }
      return null;
    }
  }

  /**
  * UTILIDAD DE ESTADO
  * ---------------------------------------------------------
  * Limpia la selección del diseño en el <select> real.
  * No renderiza preview por sí misma.
  *
  * Se usa sobre todo en flujos como:
  * - entrada desde bases
  * - estados sin diseño
  * - reseteos controlados del builder
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
  * ESTADO FUENTE DE VERDAD
  * ---------------------------------------------------------
  * Esta función sí sigue siendo parte estable del builder.
  * Decide el estado efectivo a partir de:
  * - URL
  * - sessionStorage
  * - cambio de idioma
  * - entrada desde bases
  * - entrada desde diseños
  *
  * Esta parte pertenece a la lógica de estado,
  * no al render visual del preview.
  */
  function getEffectiveState() {
    const urlState = getUrlState();
    const storedState = getStateFromSession() || {};
    /**
    * Flag temporal para saber si venimos
    * de un cambio de idioma.
    */
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
 * CLASIFICACIÓN DEL ARRANQUE
 * ---------------------------------------------------------
 * Define en qué tipo de entrada estamos para no mezclar:
 *
 * - base_reset:
 *   venimos desde bases con reset_builder=1
 *   -> arranque limpio, sin arrastrar estado previo
 *
 * - design_entry:
 *   venimos desde diseños con from_designs=1
 *   -> respetamos diseño y ubicación, pero no talla vieja
 *
 * - locale_restore:
 *   cambio de idioma
 *   -> restauramos desde session/URL lo que toque
 *
 * - hydrated:
 *   hay estado útil en URL o session
 *   -> la ficha debe rehidratarse
 *
 * - base_default:
 *   no hay estado previo útil
 *   -> mostramos la base por defecto
 */
  function getInitMode(state, pendingLocaleSwitch) {
    if (pendingLocaleSwitch) return 'locale_restore';
    if (shouldResetBuilder()) return 'base_reset';
    if (isFromDesignsEntry()) return 'design_entry';
    if (state.talla || state.ubicacion || state.diseno) return 'hydrated';
    return 'base_default';
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
 * ESTADO / ENLACES DE COLOR
 * ---------------------------------------------------------
 * Esta función pertenece a la lógica estable del builder.
 * Mantiene los enlaces entre bases/colores conservando:
 * - talla
 * - ubicación
 * - diseño
 *
 * No debería encargarse del render visual del preview.
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
  * LEGACY ACTIVA - PREVIEW ÚNICO
  * ---------------------------------------------------------
  * Esta función renderiza el diseño con el sistema antiguo:
  * - un solo <img> de diseño
  * - un solo wrapper de diseño
  *
  * Sigue activa porque todavía participa en flujos como:
  * - entrada desde diseños
  * - cambios del select de diseño
  * - parte del restore inicial
  *
  * Objetivo futuro:
  * mover el render visual al sistema nuevo front/back
  * y dejar este archivo solo para estado (URL/session).
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
   *
   * Regla:
   * - si NO hay ubicación elegida, usamos mockup neutral
   * - si hay ubicación, usamos front/back
   */
  function findMockupUrl(color, ubicacion) {
    const normalizedUbicacion = normalizeText(ubicacion || '');

    /**
     * BASES / ESTADO SIN UBICACIÓN
     * ---------------------------------------------------------
     * Si todavía no se ha elegido front/back, cargamos
     * el mockup neutro del color actual.
     */
    if (!normalizedUbicacion) {
      const neutralKeys = [
        `${color}|neutral`,
        `${normalizeText(color) === 'blanco' ? 'White' : color}|neutral`,
        `${normalizeText(color) === 'negro' ? 'Black' : color}|neutral`,
        `${normalizeText(color) === 'white' ? 'Blanco' : color}|neutral`,
        `${normalizeText(color) === 'black' ? 'Negro' : color}|neutral`,
        'White|neutral',
        'Black|neutral',
        'Blanco|neutral',
        'Negro|neutral'
      ];

      for (const key of neutralKeys) {
        const normalized = normalizeMockupKey(key);
        if (normalizedMockupMap[normalized]) return normalizedMockupMap[normalized];
      }

      return '';
    }

    /**
     * ESTADO CON UBICACIÓN ELEGIDA
     * ---------------------------------------------------------
     * Si ya existe front/back, usamos el mockup correspondiente.
     */
    const keys = [
      `${color} | ${ubicacion}`,
      `${normalizeText(color) === 'blanco' ? 'White' : color}| ${ubicacion}`,
      `${normalizeText(color) === 'negro' ? 'Black' : color}| ${ubicacion}`,
      `${normalizeText(color) === 'white' ? 'Blanco' : color}| ${ubicacion}`,
      `${normalizeText(color) === 'black' ? 'Negro' : color}| ${ubicacion}`,
      `White | ${ubicacion}`,
      `Black | ${ubicacion}`,
      `Blanco | ${ubicacion}`,
      `Negro | ${ubicacion}`
    ];

    for (const key of keys) {
      const normalized = normalizeMockupKey(key);
      if (normalizedMockupMap[normalized]) return normalizedMockupMap[normalized];
    }

    return '';
  }

  /**
   * MOCKUP BASE
   * ---------------------------------------------------------
   * - Si no hay ubicación elegida, usamos mockup neutral
   * - Si hay ubicación, usamos front/back
   */
  function updateMockupOnly() {
    const color = getSelectedColorMockup();
    const ubicacion = getSelectedUbicacion();
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
   * =========================================================
   * URL + SESSION
   * =========================================================
   */

  /**
  * VARIANTE SELECCIONADA REAL
  * ---------------------------------------------------------
  * Para sincronizar la URL del builder intentamos leer primero
  * la variante real que usa el formulario de producto
  * (input.product-variant-id), porque suele reflejar antes
  * el estado actual que el script JSON de Dawn.
  *
  * Fallback:
  * - script[data-selected-variant]
  */
  function getSelectedVariantId() {
    const productInfo = getProductInfoContainer();

    /**
    * Fuente principal:
    * input hidden real del formulario de producto.
    */
    const variantInput = productInfo.querySelector('input.product-variant-id[name="id"]');
    const inputValue = variantInput ? String(variantInput.value || '').trim() : '';

    if (inputValue) {
      return inputValue;
    }

    /**
    * Fallback:
    * JSON que deja Dawn en el DOM.
    */
    const variantScript = productInfo.querySelector(
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
 * ESTADO / SINCRONIZACIÓN DE URL
 * ---------------------------------------------------------
 * Esta función forma parte de la lógica estable del builder.
 * Se encarga de:
 * - mantener talla, ubicación y diseño en la URL
 * - guardar el estado en sessionStorage
 * - actualizar los enlaces de color
 *
 * No debería pintar preview directamente.
 */

  function syncUrlWithSelections() {
    const url = new URL(window.location.href);
    url.searchParams.delete('reset_builder');
    url.searchParams.delete('from_designs');

    const talla = getSelectedTalla();
    const ubicacion = getSelectedUbicacion();
    const diseno = getSelectedDiseno();
    const variantId = getSelectedVariantId();

    /**
    * CLAVE DE ESTADO ACTUAL
    * ---------------------------------------------------------
    * Si no cambia, no volvemos a sincronizar para evitar
    * repeticiones y repintados innecesarios.
    */
    const currentStateKey = JSON.stringify({
      talla,
      ubicacion,
      diseno,
      variantId
    });

    if (currentStateKey === lastSyncedStateKey) {
      return;
    }

    lastSyncedStateKey = currentStateKey;

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
 * ESTADO / PUENTE VISUAL DE TALLA
 * ---------------------------------------------------------
 * Marca visualmente la talla correcta sin disparar change.
 * Se usa en la fase inicial para reducir flashes
 * antes de aplicar la talla real.
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

  /**
 * ESTADO / PUENTE VISUAL DE UBICACIÓN
 * ---------------------------------------------------------
 * Marca visualmente la ubicación correcta (front/back)
 * sin disparar change.
 * Se usa en la fase inicial para reducir flashes
 * antes de aplicar la ubicación real.
 */

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
  /**
   * ESTADO / PUENTE DE UBICACIÓN
   * ---------------------------------------------------------
   * Esta función no decide el render final del preview.
   * Solo deja marcada la ubicación correcta (front/back)
   * en los inputs del builder.
   *
   * Después, otros bloques reaccionan a ese cambio para:
   * - sincronizar URL
   * - actualizar mockup
   * - mantener coherente el estado visual
   */

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

  /**
 * ESTADO / PUENTE DE DISEÑO
 * ---------------------------------------------------------
 * Esta función no pinta el preview.
 * Solo deja seleccionado el diseño correcto en el <select>.
 *
 * Después, otros bloques reaccionan a ese cambio para:
 * - sincronizar URL
 * - renderizar el diseño visualmente
 */

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
 * UTILIDAD PUENTE DE MIGRACIÓN
 * ---------------------------------------------------------
 * Fuerza el evento change del <select> de diseño para que
 * otros scripts reaccionen y hagan el render visual.
 *
 * Se usa mientras conviven:
 * - lógica de estado en este archivo
 * - lógica visual en el otro script
 */

  function triggerDesignSelectChange() {
    const designSelect = getDesignSelect();
    if (!designSelect) return;

    designSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }



  /**
   * PRIMER PASE DE HIDRATACIÓN
   * ---------------------------------------------------------
   * Aplica el estado inicial y deja margen a Dawn/Shopify
   * para terminar parte del render antes del refuerzo final.
   */
  async function runInitialHydrationPass(state) {

    applyUbicacionVisual(state);
    applyUbicacion(state);
    applyTallaVisual(state);

    await wait(220);

    applyUbicacion(state);

    await wait(60);

    if (state.diseno) {
      applyDiseno(state);
    } else {
      clearDesignSelection();
    }

    triggerDesignSelectChange();

    await forceMockupLoad();
    syncUrlWithSelections();
  }

  async function runFinalHydrationPass(state) {
    await wait(250);

    /**
     * REAPLICACIÓN FINAL DE TALLA
     * ---------------------------------------------------------
     * En cambio de idioma, si la URL ya trae variant,
     * dejamos que Dawn resuelva la talla y no la forzamos
     * otra vez desde el builder para evitar:
     * - salto visual
     * - doble selección
     * - halo gris en la pill
     *
     * En el resto de casos, solo aplicamos la talla si no
     * hay variant en URL.
     */
    const pendingLocaleSwitch =
      sessionStorage.getItem('steamboat_edit_pending_locale_switch') === '1';

    if (!pendingLocaleSwitch && !hasVariantInUrl() && state.talla) {
      applyTalla(state);
    }

    applyUbicacion(state);

    if (state.diseno) {
      applyDiseno(state);
    } else {
      clearDesignSelection();
    }

    triggerDesignSelectChange();

    await forceMockupLoad();
    syncUrlWithSelections();
  }

  /**
 * FLUJO BASES / RESET CONTROLADO
 * ---------------------------------------------------------
 * Limpia el builder cuando entramos desde bases
 * y no estamos en un cambio de idioma.
 */
  async function runBaseResetFlow() {
    clearSteamboatEditState();
    clearDesignSelection();
    triggerDesignSelectChange();

    await forceMockupLoad();
    syncCleanBaseUrl();

    document.documentElement.classList.add('steamboat-edit-ready');
  }

  /**
  * FLUJO NORMAL DE HIDRATACIÓN
  * ---------------------------------------------------------
  * Orquesta la inicialización estándar del builder
  * cuando no estamos en el flujo bases/reset.
  *
  * Ejecuta:
  * - primer pase de hidratación
  * - refuerzo final de hidratación
  */
  async function runHydrationFlow(state) {
    await runInitialHydrationPass(state);
    await runFinalHydrationPass(state);
  }

  /**
   * INIT DEL BUILDER
   * ---------------------------------------------------------
   * Orquesta el arranque completo del builder:
   * - detecta flags de idioma
   * - calcula el estado efectivo
   * - ejecuta flujo bases o flujo normal
   * - marca el builder como listo
   */
  async function initFromState() {
    const pendingLocaleSwitch =
      sessionStorage.getItem('steamboat_edit_pending_locale_switch') === '1';

    const state = getEffectiveState();

    /**
     * PUENTE VISUAL TEMPRANO DE TALLA
     * ---------------------------------------------------------
     * Si ya hay una talla guardada, la marcamos visualmente
     * lo antes posible para reducir el salto inicial del picker
     * antes de los pases normales de hidratación.
     */
    applyTallaVisual(state);

    const initMode = getInitMode(state, pendingLocaleSwitch);

    /**
    * CLASES DE ARRANQUE EN <html>
    * ---------------------------------------------------------
    * Dejamos marcado el tipo de entrada actual para que el CSS
    * pueda decidir qué enseñar inmediatamente y qué esperar
    * a que termine la hidratación.
    *
    * Importante:
    * - limpiamos primero cualquier clase previa
    * - luego añadimos solo la clase del arranque actual
    */
    document.documentElement.classList.remove(
      'steamboat-init-base-default',
      'steamboat-init-base-reset',
      'steamboat-init-design-entry',
      'steamboat-init-locale-restore',
      'steamboat-init-hydrated'
    );

    document.documentElement.classList.add('steamboat-init-' + initMode.replace(/_/g, '-'));
    /**
    * Secuencia principal de inicialización.
    */
    try {

      /**
    * Flujo bases:
    * si entramos desde bases y no estamos
    * en cambio de idioma, hacemos reset limpio
    * y salimos del init aquí.
    */
      if (shouldResetBuilder() && !pendingLocaleSwitch) {
        await runBaseResetFlow();
        return;
      }

      /**
 * FLUJO NORMAL / CAMBIO DE IDIOMA / ENTRADA DESDE DISEÑOS
 * ---------------------------------------------------------
 * Ejecutamos los dos pases de hidratación
 * en el flujo normal del builder.
 */
      await runHydrationFlow(state);

      /**
 * El builder ya puede mostrarse como listo
 * una vez completados ambos pases de hidratación.
 */
      document.documentElement.classList.add('steamboat-edit-ready');
      /**
 * Limpieza final del arranque, ocurra lo que ocurra.
 */
    } finally {

      if (pendingLocaleSwitch) {
        sessionStorage.removeItem('steamboat_edit_pending_locale_switch');
      }

      document.documentElement.classList.remove('steamboat-location-loading');
    }
  }

  initFromState();

  /**
 * EVENTOS DELEGADOS
 * ---------------------------------------------------------
 * Aquí conviven dos tipos de lógica:
 *
 * 1. Estado estable:
 *    - talla
 *    - ubicación
 *    - sincronización de URL/session
 *
 * 2. Preview legacy:
 *    - cambio del select de diseño todavía llama a updatePreview()
 *
 * Objetivo futuro:
 * dejar este bloque solo para sincronización de estado
 * y mover todo el render visual del diseño al sistema nuevo.
 */

  document.addEventListener('change', function (event) {
    const target = event.target;
    if (!target) return;

    if (target.matches('.product-form__input--pill input[type="radio"][data-option-value-id]')) {
      /**
       * SINCRONIZACIÓN DIFERIDA DE TALLA
       * ---------------------------------------------------------
       * Dawn no siempre actualiza la variante real inmediatamente
       * al cambiar la talla. Si sincronizamos demasiado pronto,
       * la URL puede guardar:
       * - talla nueva
       * - pero variant viejo
       *
       * Por eso reintentamos varias veces hasta dar tiempo a que
       * el input hidden de variante se actualice.
       */
      setTimeout(syncUrlWithSelections, 120);
      setTimeout(syncUrlWithSelections, 260);
      setTimeout(syncUrlWithSelections, 420);
      setTimeout(syncUrlWithSelections, 650);
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
 * LEGACY ACTIVA:
 * El cambio del select de diseño sigue usando
 * el render visual antiguo (updatePreview).
 * No tocar hasta migrar completamente el preview.
 */
    if (target.matches('#custom-design')) {
      updatePreview(getSelectedDiseno());
      syncUrlWithSelections();
      return;
    }
  });

  /**
 * OBSERVADOR DE ESTADO VISUAL
 * ---------------------------------------------------------
 * Se usa para volver a sincronizar enlaces de color
 * cuando Dawn o Shopify re-renderizan partes del DOM.
 *
 * Esta parte pertenece al mantenimiento del estado visible,
 * no al render directo del preview del diseño.
 */
  const observer = new MutationObserver(function () {
    updateColorLinks();
  });

  observer.observe(getProductInfoContainer(), {
    childList: true,
    subtree: true
  });

  updateColorLinks();
})();