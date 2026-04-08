/**
 * =========================================================
 * STEAMBOAT EDIT - UI JS
 * ---------------------------------------------------------
 * Este archivo se reservará para la capa VISUAL del builder.
 *
 * Aquí irán después:
 * - mockup
 * - overlay / diseño visible
 * - front / back visual
 * - helpers de carga de imágenes
 *
 * De momento solo dejamos la base preparada,
 * sin mover todavía comportamiento.
 * =========================================================
 */

document.addEventListener('DOMContentLoaded', function () {
  /**
   * =========================================================
   * DETECCIÓN DE STEAMBOAT EDIT
   * ---------------------------------------------------------
   * Solo ejecutamos este archivo si estamos realmente
   * dentro de la ficha personalizada.
   * =========================================================
   */
  const leftMockup = document.getElementById('custom-left-mockup');
  const leftDesign = document.getElementById('custom-left-design');
  const leftDesignWrapper = document.getElementById('custom-left-design-wrapper');
  const mockupPreview = document.getElementById('mockup-preview');
  const previewDataElement = document.getElementById('SteamboatEditPreviewData');

  const isSteamboatEdit =
    leftMockup || leftDesign || leftDesignWrapper || mockupPreview || previewDataElement;

  if (!isSteamboatEdit) return;

  /**
   * =========================================================
   * ESPACIO RESERVADO PARA FUNCIONES VISUALES
   * ---------------------------------------------------------
   * Aquí moveremos poco a poco funciones como:
   * - updatePreview()
   * - setMockupImage()
   * - findMockupUrl()
   * - updateMockupOnly()
   * =========================================================
   */
  
});