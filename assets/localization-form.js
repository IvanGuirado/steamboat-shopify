/**
 * =========================================================
 * LOCALIZATION FORM
 * ---------------------------------------------------------
 * Selector de idioma / país.
 *
 * Importante:
 * - mantenemos el comportamiento normal de Shopify
 * - NO navegamos manualmente entre ES / EN
 * - el estado de Steamboat Edit se conserva por:
 *   - preview.js
 *   - URL
 *   - sessionStorage
 *
 * Este archivo no debe romper:
 * - otros productos
 * - colecciones
 * - páginas normales
 * =========================================================
 */

if (!customElements.get('localization-form')) {
  customElements.define(
    'localization-form',
    class LocalizationForm extends HTMLElement {
      /**
       * =========================================================
       * CONSTRUCTOR
       * =========================================================
       */
      constructor() {
        super();

        this.mql = window.matchMedia('(min-width: 750px)');
        this.header = document.querySelector('.header-wrapper');

        this.elements = {
          input: this.querySelector('input[name="locale_code"], input[name="country_code"]'),
          button: this.querySelector('button.localization-form__select'),
          panel: this.querySelector('.disclosure__list-wrapper'),
          search: this.querySelector('input[name="country_filter"]'),
          closeButton: this.querySelector('.country-selector__close-button'),
          resetButton: this.querySelector('.country-filter__reset-button'),
          searchIcon: this.querySelector('.country-filter__search-icon'),
          liveRegion: this.querySelector('#sr-country-search-results'),
        };

        this.addEventListener('keyup', this.onContainerKeyUp.bind(this));
        this.addEventListener('keydown', this.onContainerKeyDown.bind(this));
        this.addEventListener('focusout', this.closeSelector.bind(this));

        if (this.elements.button) {
          this.elements.button.addEventListener('click', this.openSelector.bind(this));
        }

        if (this.elements.search) {
          this.elements.search.addEventListener('keyup', this.filterCountries.bind(this));
          this.elements.search.addEventListener('focus', this.onSearchFocus.bind(this));
          this.elements.search.addEventListener('blur', this.onSearchBlur.bind(this));
          this.elements.search.addEventListener('keydown', this.onSearchKeyDown.bind(this));
        }

        if (this.elements.closeButton) {
          this.elements.closeButton.addEventListener('click', this.hidePanel.bind(this));
        }

        if (this.elements.resetButton) {
          this.elements.resetButton.addEventListener('click', this.resetFilter.bind(this));
          this.elements.resetButton.addEventListener('mousedown', (event) => event.preventDefault());
        }

        this.querySelectorAll('a').forEach((item) =>
          item.addEventListener('click', this.onItemClick.bind(this))
        );
      }

      /**
 * =========================================================
 * STEAMBOAT EDIT
 * ---------------------------------------------------------
 * Detecta si estamos en uno de los productos del builder.
 * =========================================================
 */
      isSteamboatEditProduct() {
        const pathname = window.location.pathname;

        return (
          pathname.includes('/products/steamboat-edit-blanca') ||
          pathname.includes('/products/steamboat-edit-negra') ||
          pathname.includes('/products/steamboat-edit-white') ||
          pathname.includes('/products/steamboat-edit-black')
        );
      }

      /**
       * =========================================================
       * STEAMBOAT EDIT
       * ---------------------------------------------------------
       * Guarda el estado actual usando primero la URL y luego el DOM
       * como respaldo. Además marca que estamos haciendo un cambio
       * de idioma, para que en la siguiente carga preview.js dé
       * prioridad a sessionStorage.
       * =========================================================
       */
      saveSteamboatEditStateForLocaleSwitch() {
        try {
          const currentUrl = new URL(window.location.href);

          const urlTalla = currentUrl.searchParams.get('talla') || '';
          const urlUbicacion = currentUrl.searchParams.get('ubicacion') || '';
          const urlDiseno = currentUrl.searchParams.get('diseno') || '';

          const productInfo = document.querySelector('[id^="ProductInfo-"]') || document;

          const tallaInput = productInfo.querySelector(
            '.product-form__input--pill input[type="radio"][data-option-value-id]:checked'
          );;


          const ubicacionInput = document.querySelector(
            '.custom-location-radios input[data-placement-value]:checked'
          );

          const designSelect = document.getElementById('custom-design');
          const quantityInput = document.querySelector('.quantity__input[name="quantity"]');

          let domDiseno = '';

          if (designSelect) {
            const selectedOption = designSelect.options[designSelect.selectedIndex];
            domDiseno = selectedOption
              ? (selectedOption.getAttribute('data-design-key') || '').trim()
              : '';
          }

          const state = {
            talla: (tallaInput ? (tallaInput.value || '').trim() : '') || urlTalla,
            ubicacion: (ubicacionInput ? (ubicacionInput.getAttribute('data-placement-value') || '').trim() : '') || urlUbicacion,
            diseno: domDiseno || urlDiseno || '',
            cantidad: quantityInput ? String(quantityInput.value || '').trim() : '',
          };

          sessionStorage.setItem('steamboat_edit_state', JSON.stringify(state));
          sessionStorage.setItem('steamboat_edit_pending_locale_switch', '1');
        } catch (error) {
          console.warn('No se pudo guardar el estado de Steamboat Edit:', error);
        }
      }

      /**
       * =========================================================
       * CERRAR PANEL
       * =========================================================
       */
      hidePanel() {
        if (this.elements.button) {
          this.elements.button.setAttribute('aria-expanded', 'false');
        }

        if (this.elements.panel) {
          this.elements.panel.setAttribute('hidden', true);
        }

        if (this.elements.search) {
          this.elements.search.value = '';
          this.filterCountries();
          this.elements.search.setAttribute('aria-activedescendant', '');
        }

        document.body.classList.remove('overflow-hidden-mobile');

        const menuDrawer = document.querySelector('.menu-drawer');
        if (menuDrawer) {
          menuDrawer.classList.remove('country-selector-open');
        }

        if (this.header) {
          this.header.preventHide = false;
        }
      }

      /**
       * =========================================================
       * NAVEGACIÓN POR TECLADO
       * =========================================================
       */
      onContainerKeyDown(event) {
        const focusableItems = Array.from(this.querySelectorAll('a')).filter(
          (item) => !item.parentElement.classList.contains('hidden')
        );

        let focusedItemIndex = focusableItems.findIndex((item) => item === document.activeElement);
        let itemToFocus;

        switch (event.code.toUpperCase()) {
          case 'ARROWUP':
            event.preventDefault();
            itemToFocus =
              focusedItemIndex > 0
                ? focusableItems[focusedItemIndex - 1]
                : focusableItems[focusableItems.length - 1];
            itemToFocus.focus();
            break;

          case 'ARROWDOWN':
            event.preventDefault();
            itemToFocus =
              focusedItemIndex < focusableItems.length - 1
                ? focusableItems[focusedItemIndex + 1]
                : focusableItems[0];
            itemToFocus.focus();
            break;
        }

        if (!this.elements.search) return;

        setTimeout(() => {
          focusedItemIndex = focusableItems.findIndex((item) => item === document.activeElement);

          if (focusedItemIndex > -1) {
            this.elements.search.setAttribute('aria-activedescendant', focusableItems[focusedItemIndex].id);
          } else {
            this.elements.search.setAttribute('aria-activedescendant', '');
          }
        });
      }

      /**
       * =========================================================
       * ATAJOS DE TECLADO
       * =========================================================
       */
      onContainerKeyUp(event) {
        event.preventDefault();

        switch (event.code.toUpperCase()) {
          case 'ESCAPE':
            if (this.elements.button && this.elements.button.getAttribute('aria-expanded') === 'false') return;
            this.hidePanel();
            event.stopPropagation();
            if (this.elements.button) {
              this.elements.button.focus();
            }
            break;

          case 'SPACE':
            if (this.elements.button && this.elements.button.getAttribute('aria-expanded') === 'true') return;
            this.openSelector();
            break;
        }
      }

      /**
 * =========================================================
 * CLICK EN IDIOMA / PAÍS
 * ---------------------------------------------------------
 * Comportamiento normal del form, pero en Steamboat Edit
 * guardamos el estado actual y marcamos cambio de idioma.
 * =========================================================
 */
      onItemClick(event) {
        event.preventDefault();

        const form = this.querySelector('form');
        const nextLocale = event.currentTarget.dataset.value || '';

        if (this.elements.input) {
          this.elements.input.value = nextLocale;
        }

        if (this.isSteamboatEditProduct()) {
          this.saveSteamboatEditStateForLocaleSwitch();
        }

        if (form) {
          form.submit();
        }
      }

      /**
       * =========================================================
       * ABRIR PANEL
       * =========================================================
       */
      openSelector() {
        if (this.elements.button) {
          this.elements.button.focus();
        }

        if (this.elements.panel) {
          this.elements.panel.toggleAttribute('hidden');
        }

        if (this.elements.button) {
          this.elements.button.setAttribute(
            'aria-expanded',
            (this.elements.button.getAttribute('aria-expanded') === 'false').toString()
          );
        }

        if (!document.body.classList.contains('overflow-hidden-tablet')) {
          document.body.classList.add('overflow-hidden-mobile');
        }

        if (this.elements.search && this.mql.matches) {
          this.elements.search.focus();
        }

        if (this.hasAttribute('data-prevent-hide') && this.header) {
          this.header.preventHide = true;
        }

        const menuDrawer = document.querySelector('.menu-drawer');
        if (menuDrawer) {
          menuDrawer.classList.add('country-selector-open');
        }
      }

      /**
       * =========================================================
       * CERRAR SI SE SALE EL FOCO / OVERLAY
       * =========================================================
       */
      closeSelector(event) {
        if (
          event.target.classList.contains('country-selector__overlay') ||
          !this.contains(event.target) ||
          !this.contains(event.relatedTarget)
        ) {
          this.hidePanel();
        }
      }

      /**
       * =========================================================
       * NORMALIZAR TEXTO
       * =========================================================
       */
      normalizeString(str) {
        return str
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase();
      }

      /**
       * =========================================================
       * FILTRO DE PAÍSES
       * =========================================================
       */
      filterCountries() {
        if (!this.elements.search) return;

        const searchValue = this.normalizeString(this.elements.search.value);
        const popularCountries = this.querySelector('.popular-countries');
        const allCountries = this.querySelectorAll('a');
        let visibleCountries = allCountries.length;

        if (this.elements.resetButton) {
          this.elements.resetButton.classList.toggle('hidden', !searchValue);
        }

        if (popularCountries) {
          popularCountries.classList.toggle('hidden', searchValue);
        }

        allCountries.forEach((item) => {
          const countryName = this.normalizeString(item.querySelector('.country').textContent);

          if (countryName.indexOf(searchValue) > -1) {
            item.parentElement.classList.remove('hidden');
            visibleCountries++;
          } else {
            item.parentElement.classList.add('hidden');
            visibleCountries--;
          }
        });

        if (this.elements.liveRegion) {
          this.elements.liveRegion.innerHTML = window.accessibilityStrings.countrySelectorSearchCount.replace(
            '[count]',
            visibleCountries
          );
        }

        const selector = this.querySelector('.country-selector');
        const selectorList = this.querySelector('.country-selector__list');

        if (selector) selector.scrollTop = 0;
        if (selectorList) selectorList.scrollTop = 0;
      }

      /**
       * =========================================================
       * RESET DEL FILTRO
       * =========================================================
       */
      resetFilter(event) {
        event.stopPropagation();

        if (!this.elements.search) return;

        this.elements.search.value = '';
        this.filterCountries();
        this.elements.search.focus();
      }

      /**
       * =========================================================
       * SEARCH FOCUS
       * =========================================================
       */
      onSearchFocus() {
        if (this.elements.searchIcon) {
          this.elements.searchIcon.classList.add('country-filter__search-icon--hidden');
        }
      }

      /**
       * =========================================================
       * SEARCH BLUR
       * =========================================================
       */
      onSearchBlur() {
        if (!this.elements.search) return;

        if (!this.elements.search.value && this.elements.searchIcon) {
          this.elements.searchIcon.classList.remove('country-filter__search-icon--hidden');
        }
      }

      /**
       * =========================================================
       * EVITAR ENTER EN SEARCH
       * =========================================================
       */
      onSearchKeyDown(event) {
        if (event.code.toUpperCase() === 'ENTER') {
          event.preventDefault();
        }
      }
    }
  );
}