/**
 * =========================================================
 * STEAMBOAT EDIT - PREVIEW JS
 * ---------------------------------------------------------
 * Responsabilidades:
 * 1. Detectar si estamos en una ficha de Steamboat Edit
 * 2. Leer y aplicar selección actual (talla, ubicación, diseño)
 * 3. Aplicar selección desde la URL
 * 4. Actualizar la imagen del diseño
 * 5. Cambiar mockup entre 4 imágenes fijas:
 *    - white/front
 *    - white/back
 *    - black/front
 *    - black/back
 * 6. Mantener sincronizada la URL
 * 7. Mantener actualizados los enlaces de color
 * 8. Mantener actualizados los enlaces/cambio de idioma
 * 9. Construir y controlar el selector visual de diseños (V2)
 * 10. Bloquear add to cart si no hay diseño seleccionado
 * 11. Ocultar el builder mientras se restaura el estado
 * 12. Evitar flashes visuales al cambiar idioma / front / back
 * =========================================================
 */

document.addEventListener('DOMContentLoaded', function () {
    /**
     * ---------------------------------------------------------
     * 1. DETECCIÓN DE PÁGINA
     * ---------------------------------------------------------
     */
    const isSteamboatEdit =
        document.getElementById('custom-left-mockup-wrapper') ||
        document.getElementById('custom-left-design');

    if (!isSteamboatEdit) return;

    /**
     * ---------------------------------------------------------
     * 2. PARÁMETROS DE URL
     * ---------------------------------------------------------
     */
    const params = new URLSearchParams(window.location.search);
    const tallaFromUrl = params.get('talla');
    const ubicacionFromUrl = params.get('ubicacion');
    const designFromUrl = params.get('diseno');

    /**
     * ---------------------------------------------------------
     * 3. REFERENCIAS DEL DOM
     * ---------------------------------------------------------
     */
    const designSelect = document.getElementById('custom-design');
    const designPicker = document.getElementById('steamboat-edit-design-picker');
    const designToggle = document.getElementById('steamboat-edit-design-toggle');
    const designField = document.querySelector('.custom-design-field');
    const designError = document.getElementById('custom-design-error');

    const leftDesign = document.getElementById('custom-left-design');
    const summaryColor = document.getElementById('custom-summary-color');
    const summaryPlacement = document.getElementById('custom-summary-placement');
    const summaryDesign = document.getElementById('custom-summary-design');

    const previewDataElement = document.getElementById('SteamboatEditPreviewData');
    const mockupStage = document.getElementById('custom-left-mockup-wrapper');

    const productFormElement =
        document.querySelector('form[action*="/cart/add"]') ||
        document.querySelector('.product-form form');

    const submitButton =
        document.querySelector('button[type="submit"][name="add"], .product-form__submit');

    /**
     * ---------------------------------------------------------
     * 4. ESTADO BASE
     * ---------------------------------------------------------
     */
    const INITIAL_VISIBLE_DESIGNS = 6;
    let designsExpanded = false;
    let designImages = {};
    let mockupMap = {};
    let isRestoringState = false;
    let mockupSwitchToken = 0;

    window.steamboatEditDesigns = [];

    /**
     * ---------------------------------------------------------
     * 5. DATOS INYECTADOS DESDE LIQUID
     * ---------------------------------------------------------
     */
    if (previewDataElement) {
        try {
            const previewData = JSON.parse(previewDataElement.textContent.trim());

            const designs = previewData.designs || [];
            mockupMap = previewData.mockupMap || {};
            window.steamboatEditDesigns = designs;

            designs.forEach(function (design) {
                if (!design || !design.key || !design.image) return;
                designImages[design.key] = design.image;
            });
        } catch (error) {
            window.steamboatEditDesigns = [];
        }
    }

    /**
     * ---------------------------------------------------------
     * 6. HELPERS
     * ---------------------------------------------------------
     */

    function normalizeText(text) {
        return (text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    function normalizeMockupColorKey(colorValue) {
        const clean = (colorValue || '').trim().toLowerCase();

        if (clean === 'blanco' || clean === 'white') return 'white';
        if (clean === 'negro' || clean === 'black') return 'black';

        return clean;
    }

    function getSelectedDesignOption() {
        if (!designSelect) return null;
        return designSelect.options[designSelect.selectedIndex] || null;
    }

    function hasRealDesignSelected() {
        const selectedOption = getSelectedDesignOption();
        if (!selectedOption) return false;

        const designKey = (selectedOption.dataset.designKey || '').trim();
        const designValue = (selectedOption.value || '').trim();

        return !!designKey && !!designValue;
    }

    function persistSelectionState(state) {
        try {
            sessionStorage.setItem(
                'steamboatEditState',
                JSON.stringify({
                    talla: state.talla || '',
                    ubicacion: state.ubicacion || '',
                    disenoKey: state.disenoKey || '',
                    colorMockup: state.colorMockup || ''
                })
            );
        } catch (error) { }
    }

    function getPersistedSelectionState() {
        try {
            const raw = sessionStorage.getItem('steamboatEditState');
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function clearPersistedSelectionState() {
        try {
            sessionStorage.removeItem('steamboatEditState');
        } catch (error) { }
    }

    // function hideBuilderUntilReady() {
    //     //No ocultamos el builder completo.
    //     //El mockup correcto ya viene decidido desde el Liquid.
    // }

    function showBuilderWhenReady() {
        document.documentElement.classList.remove('steamboat-edit-restoring');
    }

    function getAllMockupImages() {
        return [
            document.getElementById('mockup-white-front'),
            document.getElementById('mockup-white-back'),
            document.getElementById('mockup-black-front'),
            document.getElementById('mockup-black-back')
        ].filter(Boolean);
    }

    function getTargetMockup(state) {
        const currentState = state || getCurrentSelectionState();
        const ubicacion = currentState.ubicacion || 'front';
        const normalizedColor = normalizeMockupColorKey(currentState.colorMockup);

        if (normalizedColor === 'white' && ubicacion === 'front') return document.getElementById('mockup-white-front');
        if (normalizedColor === 'white' && ubicacion === 'back') return document.getElementById('mockup-white-back');
        if (normalizedColor === 'black' && ubicacion === 'front') return document.getElementById('mockup-black-front');
        if (normalizedColor === 'black' && ubicacion === 'back') return document.getElementById('mockup-black-back');

        return null;
    }

    function waitForImageReady(img) {
        return new Promise(function (resolve) {
            if (!img) {
                resolve();
                return;
            }

            if (img.complete && img.naturalWidth > 0) {
                if (typeof img.decode === 'function') {
                    img.decode().then(resolve).catch(resolve);
                } else {
                    resolve();
                }
                return;
            }

            const done = function () {
                if (typeof img.decode === 'function') {
                    img.decode().then(resolve).catch(resolve);
                } else {
                    resolve();
                }
            };

            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', resolve, { once: true });
        });
    }

    function preloadAllMockups() {
        return Promise.all(getAllMockupImages().map(waitForImageReady));
    }

    /**
     * ---------------------------------------------------------
     * 7. LECTURA DE ESTADO ACTUAL
     * ---------------------------------------------------------
     */

    function getSelectedTalla() {
        const checkedInputs = Array.from(
            document.querySelectorAll('.product-form__input--pill input[type="radio"]:checked')
        );

        if (!checkedInputs.length) return '';

        const visibleChecked = checkedInputs.find(function (input) {
            return input.offsetParent !== null;
        });

        return (visibleChecked || checkedInputs[checkedInputs.length - 1]).value.trim();
    }

    function getSelectedUbicacion() {
        const checkedInputs = Array.from(
            document.querySelectorAll('input[data-placement-value]:checked')
        );

        if (!checkedInputs.length) return '';

        const visibleChecked = checkedInputs.find(function (input) {
            return input.offsetParent !== null;
        });

        const selectedInput = visibleChecked || checkedInputs[checkedInputs.length - 1];
        return (selectedInput.getAttribute('data-placement-value') || '').trim();
    }

    function getSelectedDiseno() {
        if (!hasRealDesignSelected()) return '';

        const selectedOption = getSelectedDesignOption();
        return (selectedOption.dataset.designKey || '').trim();
    }

    function getSelectedDesignLabel() {
        if (!hasRealDesignSelected()) return '';

        const selectedOption = getSelectedDesignOption();
        return selectedOption ? selectedOption.textContent.trim() : '';
    }

    function getSelectedColorMockup() {
        const checkedRadios = document.querySelectorAll('input[type="radio"]:checked');

        for (const radio of checkedRadios) {
            const value = (radio.value || '').trim();
            if (value === 'Blanco' || value === 'Negro' || value === 'White' || value === 'Black') {
                return value;
            }
        }

        const selectedSpans = document.querySelectorAll('[data-selected-value]');
        for (const span of selectedSpans) {
            const value = (span.textContent || '').trim();
            if (value === 'Blanco' || value === 'Negro' || value === 'White' || value === 'Black') {
                return value;
            }
        }

        const selects = document.querySelectorAll('select');
        for (const select of selects) {
            const value = (select.value || '').trim();
            if (value === 'Blanco' || value === 'Negro' || value === 'White' || value === 'Black') {
                return value;
            }
        }

        const path = window.location.pathname.toLowerCase();

        if (path.includes('steamboat-edit-black') || path.includes('steamboat-edit-negra')) {
            return 'Black';
        }

        if (path.includes('steamboat-edit-white') || path.includes('steamboat-edit-blanca')) {
            return 'White';
        }

        const persistedState = getPersistedSelectionState();
        if (persistedState && persistedState.colorMockup) {
            return persistedState.colorMockup;
        }

        return '';
    }

    function getSelectedColorLabel() {
        const isEnglish = document.documentElement.lang === 'en';

        const normalizeColor = function (value) {
            const clean = (value || '').trim().toLowerCase();

            if (clean === 'blanco' || clean === 'white') {
                return isEnglish ? 'White' : 'Blanco';
            }

            if (clean === 'negro' || clean === 'black') {
                return isEnglish ? 'Black' : 'Negro';
            }

            return '';
        };

        const checkedRadios = document.querySelectorAll('input[type="radio"]:checked');
        for (const radio of checkedRadios) {
            const translated = normalizeColor(radio.value);
            if (translated) return translated;
        }

        const selectedSpans = document.querySelectorAll('[data-selected-value]');
        for (const span of selectedSpans) {
            const translated = normalizeColor(span.textContent);
            if (translated) return translated;
        }

        const path = window.location.pathname.toLowerCase();

        if (path.includes('steamboat-edit-black') || path.includes('steamboat-edit-negra')) {
            return isEnglish ? 'Black' : 'Negro';
        }

        if (path.includes('steamboat-edit-white') || path.includes('steamboat-edit-blanca')) {
            return isEnglish ? 'White' : 'Blanco';
        }

        return '';
    }

    function getSelectedPlacementLabel() {
        const checked = document.querySelector('input[data-placement-value]:checked');
        if (!checked) return '';

        const siblingText = checked.closest('label')?.querySelector('span');
        return siblingText ? siblingText.textContent.trim() : checked.value.trim();
    }

    function getCurrentSelectionState() {
        return {
            talla: getSelectedTalla(),
            ubicacion: getSelectedUbicacion(),
            disenoKey: getSelectedDiseno(),
            disenoLabel: getSelectedDesignLabel(),
            colorMockup: getSelectedColorMockup(),
            colorLabel: getSelectedColorLabel(),
            placementLabel: getSelectedPlacementLabel(),
            hasRealDesign: hasRealDesignSelected()
        };
    }

    /**
     * ---------------------------------------------------------
     * 8. UI / RENDER
     * ---------------------------------------------------------
     */

    function updateSelectionSummary(state) {
        const currentState = state || getCurrentSelectionState();

        if (summaryColor) {
            summaryColor.textContent = currentState.colorLabel || '—';
        }

        if (summaryPlacement) {
            summaryPlacement.textContent = currentState.placementLabel || '—';
        }

        if (summaryDesign) {
            summaryDesign.textContent = currentState.disenoLabel || '—';
        }
    }

    function showDesignError() {
        if (designError) {
            const fallbackMessage = document.documentElement.lang === 'en'
                ? 'Please select a design before adding to cart.'
                : 'Selecciona un diseño antes de añadir al carrito.';

            designError.textContent = designError.dataset.errorMessage || fallbackMessage;
            designError.hidden = false;
            designError.style.display = 'block';
        }

        if (designField) {
            designField.classList.add('has-error');
        }

        if (designPicker) {
            designPicker.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function clearDesignError() {
        if (designError) {
            designError.textContent = '';
            designError.hidden = true;
            designError.style.display = 'none';
        }

        if (designField) {
            designField.classList.remove('has-error');
        }
    }

    function updatePreview(designKey) {
        if (!leftDesign) return Promise.resolve();

        const imageUrl = designImages[designKey];

        if (!imageUrl) {
            leftDesign.src = '';
            leftDesign.style.display = 'none';
            leftDesign.alt = '';
            return Promise.resolve();
        }

        const currentSrc = leftDesign.getAttribute('src') || '';

        if (currentSrc === imageUrl && leftDesign.style.display !== 'none') {
            return waitForImageReady(leftDesign);
        }

        return new Promise(function (resolve) {
            const tempImg = new Image();

            tempImg.onload = function () {
                leftDesign.src = imageUrl;
                leftDesign.alt = designKey;
                leftDesign.style.display = 'block';
                waitForImageReady(leftDesign).finally(resolve);
            };

            tempImg.onerror = function () {
                leftDesign.src = '';
                leftDesign.alt = '';
                leftDesign.style.display = 'none';
                resolve();
            };

            tempImg.src = imageUrl;
        });
    }

    function updateMockupOnly(state) {
        const currentState = state || getCurrentSelectionState();
        const targetMockup = getTargetMockup(currentState);
        const allMockups = getAllMockupImages();

        if (!targetMockup) return Promise.resolve();

        if (mockupStage) {
            mockupStage.classList.remove('is-front', 'is-back');
            mockupStage.classList.add(currentState.ubicacion === 'back' ? 'is-back' : 'is-front');
        }

        allMockups.forEach(function (img) {
            img.classList.remove('is-active');
        });

        targetMockup.classList.add('is-active');

        return Promise.resolve();
    }
    
    function updateDesignCardsState(state) {
        if (!designPicker || !designSelect) return;

        const designCards = designPicker.querySelectorAll('.steamboat-edit-design-card');
        if (!designCards.length) return;

        const currentState = state || getCurrentSelectionState();

        designCards.forEach(function (card) {
            const cardKey = (card.getAttribute('data-design-key') || '').trim();
            const isActive = cardKey === currentState.disenoKey && currentState.disenoKey !== '';

            card.classList.toggle('is-active', isActive);
            card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function updateDesignCardsVisibility() {
        if (!designPicker || !designToggle) return;

        const designCards = designPicker.querySelectorAll('.steamboat-edit-design-card');
        if (!designCards.length) return;

        const shouldCollapse = designCards.length > INITIAL_VISIBLE_DESIGNS;

        if (!shouldCollapse) {
            designToggle.hidden = true;

            designCards.forEach(function (card) {
                card.classList.remove('is-hidden');
            });
            return;
        }

        designToggle.hidden = false;

        designCards.forEach(function (card, index) {
            const mustHide = !designsExpanded && index >= INITIAL_VISIBLE_DESIGNS;
            card.classList.toggle('is-hidden', mustHide);
        });

        const moreLabel = designToggle.dataset.labelMore || '';
        const lessLabel = designToggle.dataset.labelLess || '';
        designToggle.textContent = designsExpanded ? lessLabel : moreLabel;
    }

    function renderDesignCards() {
        if (!designPicker || !designSelect) return;

        const availableDesigns = Array.isArray(window.steamboatEditDesigns)
            ? window.steamboatEditDesigns
            : [];

        if (!availableDesigns.length) return;

        designPicker.innerHTML = '';

        availableDesigns.forEach(function (design) {
            if (!design || !design.key || !design.label || !design.image) return;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'steamboat-edit-design-card';
            button.setAttribute('data-design-key', design.key);
            button.setAttribute('data-design-label', design.label);
            button.setAttribute('aria-pressed', 'false');

            button.innerHTML = `
        <span class="steamboat-edit-design-card__image-wrap">
          <img
            class="steamboat-edit-design-card__image"
            src="${design.image}"
            alt="${design.label}"
            loading="lazy"
          >
        </span>
        <span class="steamboat-edit-design-card__label">${design.label}</span>
      `;

            button.addEventListener('click', function () {
                let matchedValue = '';

                for (const option of designSelect.options) {
                    const optionKey = (option.getAttribute('data-design-key') || '').trim();
                    if (optionKey === design.key) {
                        matchedValue = option.value;
                        break;
                    }
                }

                if (!matchedValue) return;

                designSelect.value = matchedValue;
                designSelect.dispatchEvent(new Event('change', { bubbles: true }));
            });

            designPicker.appendChild(button);
        });

        updateDesignCardsState();
        updateDesignCardsVisibility();
    }

    /**
     * ---------------------------------------------------------
     * 9. URL / ENLACES
     * ---------------------------------------------------------
     */

    function updateColorLinks(state) {
        const colorLinks = document.querySelectorAll('.js-color-link');
        const currentState = state || getCurrentSelectionState();

        colorLinks.forEach(function (link) {
            const baseUrl = link.getAttribute('data-base-url');
            if (!baseUrl) return;

            const url = new URL(baseUrl, window.location.origin);

            if (currentState.talla) url.searchParams.set('talla', currentState.talla);
            if (currentState.ubicacion) url.searchParams.set('ubicacion', currentState.ubicacion);
            if (currentState.disenoKey) url.searchParams.set('diseno', currentState.disenoKey);

            link.href = url.pathname + url.search;
        });
    }

    function updateLanguageLinks(state) {
        const currentState = state || getCurrentSelectionState();

        const languageLinks = document.querySelectorAll('a[href*="/en/"], a[href*="/products/"], a[href*="/es/"]');

        languageLinks.forEach(function (link) {
            const href = link.getAttribute('href');
            if (!href) return;

            try {
                const url = new URL(href, window.location.origin);

                if (currentState.talla) url.searchParams.set('talla', currentState.talla);
                if (currentState.ubicacion) url.searchParams.set('ubicacion', currentState.ubicacion);
                if (currentState.disenoKey) url.searchParams.set('diseno', currentState.disenoKey);

                link.setAttribute('href', url.pathname + url.search);
            } catch (error) { }
        });
    }

    function syncUrlWithSelections(state) {
        const currentState = state || getCurrentSelectionState();
        const cleanBaseUrl = window.location.origin + window.location.pathname;
        const url = new URL(cleanBaseUrl);

        if (currentState.talla) url.searchParams.set('talla', currentState.talla);
        if (currentState.ubicacion) url.searchParams.set('ubicacion', currentState.ubicacion);
        if (currentState.disenoKey) url.searchParams.set('diseno', currentState.disenoKey);

        window.history.replaceState({}, '', url.toString());
    }

    function refreshBuilderUI() {
        if (isRestoringState) return Promise.resolve();

        const state = getCurrentSelectionState();

        updateSelectionSummary(state);
        updateDesignCardsState(state);
        updateColorLinks(state);
        updateLanguageLinks(state);

        return updateMockupOnly(state).then(function () {
            return updatePreview(state.disenoKey);
        });
    }

    /**
     * ---------------------------------------------------------
     * 10. APLICAR ESTADO DESDE URL / SESSION
     * ---------------------------------------------------------
     */

    function applyTallaFromUrl() {
        if (!tallaFromUrl) return;

        const tallaInputs = document.querySelectorAll('.product-form__input--pill input[type="radio"]');

        tallaInputs.forEach(function (input) {
            if (normalizeText(input.value) === normalizeText(tallaFromUrl)) {
                input.checked = true;
            }
        });
    }

    function applyUbicacionFromUrl() {
        if (!ubicacionFromUrl) return;

        const ubicacionInputs = document.querySelectorAll('input[data-placement-value]');

        ubicacionInputs.forEach(function (input) {
            const technicalValue = input.getAttribute('data-placement-value') || '';
            if (normalizeText(technicalValue) === normalizeText(ubicacionFromUrl)) {
                input.checked = true;
            }
        });
    }

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

    function applyPersistedState() {
        const savedState = getPersistedSelectionState();

        if (!savedState) {
            return refreshBuilderUI().finally(function () {
                requestAnimationFrame(function () {
                    showBuilderWhenReady();
                });
            });
        }

        isRestoringState = true;

        const talla = savedState.talla || '';
        const ubicacion = savedState.ubicacion || '';
        const disenoKey = savedState.disenoKey || '';

        if (talla) {
            const tallaInputs = document.querySelectorAll('.product-form__input--pill input[type="radio"]');
            tallaInputs.forEach(function (input) {
                if (normalizeText(input.value) === normalizeText(talla)) {
                    input.checked = true;
                }
            });
        }

        if (ubicacion) {
            const ubicacionInputs = document.querySelectorAll('input[data-placement-value]');
            ubicacionInputs.forEach(function (input) {
                const technicalValue = input.getAttribute('data-placement-value') || '';
                if (normalizeText(technicalValue) === normalizeText(ubicacion)) {
                    input.checked = true;
                }
            });
        }

        if (disenoKey && designSelect) {
            for (const option of designSelect.options) {
                const technicalValue = option.getAttribute('data-design-key') || '';
                if (normalizeText(technicalValue) === normalizeText(disenoKey)) {
                    designSelect.value = option.value;
                    break;
                }
            }
        }

        isRestoringState = false;

        const state = getCurrentSelectionState();

        syncUrlWithSelections(state);

        return refreshBuilderUI().finally(function () {
            clearPersistedSelectionState();

            requestAnimationFrame(function () {
                showBuilderWhenReady();
            });
        });
    }

    /**
     * ---------------------------------------------------------
     * 11. VALIDACIÓN
     * ---------------------------------------------------------
     */

    function validateDesignSelection() {
        const isValid = hasRealDesignSelected();

        if (!isValid) {
            showDesignError();
            return false;
        }

        clearDesignError();
        return true;
    }

    /**
     * ---------------------------------------------------------
     * 12. BIND DE EVENTOS
     * ---------------------------------------------------------
     */

    function bindDesignSelectEvents() {
        if (!designSelect) return;

        designSelect.addEventListener('change', function () {
            clearDesignError();

            setTimeout(function () {
                const state = getCurrentSelectionState();
                persistSelectionState(state);
                syncUrlWithSelections(state);
                refreshBuilderUI();
            }, 0);
        });
    }

    function bindToggleEvents() {
        if (!designToggle) return;

        designToggle.addEventListener('click', function () {
            designsExpanded = !designsExpanded;
            updateDesignCardsVisibility();
        });
    }

    function bindSelectionChangeEvents() {
        document.addEventListener('change', function (event) {
            const target = event.target;
            if (!target) return;

            const isTallaChange = target.matches('.product-form__input--pill input[type="radio"]');
            const isUbicacionChange = target.matches('input[data-placement-value]');

            if (!isTallaChange && !isUbicacionChange) return;

            requestAnimationFrame(function () {
                const state = getCurrentSelectionState();

                persistSelectionState(state);
                syncUrlWithSelections(state);
                refreshBuilderUI();
            });
        });
    }

    function bindLocalizationPersistence() {
        const localizationForms = document.querySelectorAll('form[action*="/localization"], .localization-form');

        localizationForms.forEach(function (form) {
            form.addEventListener(
                'submit',
                function () {
                    persistSelectionState(getCurrentSelectionState());
                },
                true
            );
        });
    }

    function bindFormValidation() {
        if (productFormElement) {
            productFormElement.addEventListener(
                'submit',
                function (event) {
                    if (!validateDesignSelection()) {
                        event.preventDefault();
                        event.stopPropagation();
                        event.stopImmediatePropagation();
                        return false;
                    }
                },
                true
            );
        }

        if (submitButton) {
            submitButton.addEventListener(
                'click',
                function (event) {
                    if (!validateDesignSelection()) {
                        event.preventDefault();
                        event.stopPropagation();
                        event.stopImmediatePropagation();
                        return false;
                    }
                },
                true
            );
        }
    }

    /**
     * ---------------------------------------------------------
     * 13. INICIALIZACIÓN
     * ---------------------------------------------------------
     */

    // hideBuilderUntilReady();

    applyTallaFromUrl();
    applyUbicacionFromUrl();
    applyDesignFromUrl();

    renderDesignCards();

    applyPersistedState();
    preloadAllMockups();

    bindDesignSelectEvents();
    bindToggleEvents();
    bindSelectionChangeEvents();
    bindLocalizationPersistence();
    bindFormValidation();
});