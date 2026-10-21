import { QUICK_AI_CONSENT_VERSION, QUICK_AI_TEXT_LIMIT, normalizeQuickAiSuggestion, quickAiHasTargetFields, type QuickAiSuggestion, type QuickAiTarget } from "@/lib/quick-invoicing/ai-fill";
import { escapeHtml as escape } from "./html";

export interface QuickAiBasis { scope: string; operationId: string; snapshot: string; target: QuickAiTarget }
interface QuickAiOptions {
  basis: QuickAiBasis;
  readBasis: () => QuickAiBasis;
  kind: "factura" | "presupuesto";
  request: (body: unknown, signal: AbortSignal) => Promise<{ suggestion: unknown }>;
  apply: (suggestion: QuickAiSuggestion, basis: QuickAiBasis, explicit: boolean) => boolean;
  renderForm: () => void;
}
interface AiPanelState {
  key: string; open: boolean; text: string; target: QuickAiTarget; consent: boolean; message: string;
  image?: { mimeType: string; base64: string; preview: string };
  suggestion?: QuickAiSuggestion; basis?: QuickAiBasis;
}
let panel: AiPanelState | undefined;
function consentKey(scope: string) { return `factu-quick-ai-consent:${scope}`; }
function accepted(scope: string) { try { return localStorage.getItem(consentKey(scope)) === QUICK_AI_CONSENT_VERSION; } catch { return false; } }

/** Only temporary input lives here; neither pictures nor source text enter drafts. */
export function mountQuickAiFill(host: HTMLElement, options: QuickAiOptions): () => void {
  const key = `${options.basis.scope}:${options.basis.operationId}`;
  if (panel?.key !== key) panel = { key, open: false, text: "", target: options.basis.target, consent: accepted(options.basis.scope), message: "" };
  const state = panel;
  let disposed = false, loading = false, imageSerial = 0, controller: AbortController | undefined;
  function paint() {
    if (disposed) return;
    host.innerHTML = `<details class="ai-fill" ${state.open ? "open" : ""}><summary><span aria-hidden="true">✦</span> Rellenar con IA<span class="ai-toggle" aria-hidden="true">＋</span></summary>
      <div class="ai-fill-body"><label>Qué rellenar<select id="quick-ai-target" ${loading ? "disabled" : ""}><option value="document" ${state.target === "document" ? "selected" : ""}>Todo el documento</option><option value="client" ${state.target === "client" ? "selected" : ""}>Solo el cliente</option><option value="concepts" ${state.target === "concepts" ? "selected" : ""}>Conceptos y notas</option></select></label>
      <label for="quick-ai-text">Pega los datos o añade una foto</label><textarea id="quick-ai-text" rows="4" maxlength="${QUICK_AI_TEXT_LIMIT}" placeholder="" ${loading ? "disabled" : ""}>${escape(state.text)}</textarea>
      <div class="ai-image-actions"><button type="button" class="secondary" data-ai="choose" ${loading ? "disabled" : ""}>Añadir imagen</button><button type="button" class="secondary" data-ai="camera" ${loading ? "disabled" : ""}>Hacer foto</button></div>
      <input id="quick-ai-file" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp"><input id="quick-ai-camera" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment">
      ${state.image ? `<div class="ai-image-preview"><img src="${escape(state.image.preview)}" alt="Imagen que se analizará"><button type="button" class="text-button" data-ai="remove" ${loading ? "disabled" : ""}>Quitar imagen</button></div>` : ""}
      ${!state.consent ? `<label class="ai-consent"><input id="quick-ai-consent" type="checkbox"><span>Acepto enviar este texto o imagen a OpenAI para rellenar los campos.</span></label>` : '<p class="ai-privacy">El contenido se envía a OpenAI. Revisa los campos antes de emitir.</p>'}
      <a class="ai-privacy" href="https://facturacion-autonomos.app/legal/privacidad" target="_blank" rel="noopener noreferrer">Privacidad</a>
      <button type="button" class="primary ai-submit" data-ai="fill" ${loading ? "disabled" : ""}>${loading ? "Interpretando…" : "Rellenar"}</button>
      <p class="ai-message" role="status">${escape(state.message)}</p>
      ${state.suggestion ? `<button type="button" class="secondary ai-apply" data-ai="apply">Aplicar resultado a los campos</button>` : ""}</div></details>`;
    host.querySelector("details")?.addEventListener("toggle", event => { state.open = (event.target as HTMLDetailsElement).open; });
  }
  function apply(suggestion: QuickAiSuggestion, basis: QuickAiBasis, explicit: boolean) {
    if (options.apply(suggestion, basis, explicit)) {
      state.suggestion = undefined;
      state.image = undefined;
      state.message = ["Campos rellenados. Revísalos antes de continuar.", ...suggestion.warnings].join("\n");
      options.renderForm();
    } else {
      state.suggestion = suggestion; state.basis = basis;
      state.message = "Hay datos escritos o cambios posteriores al análisis. No se han sustituido. Puedes aplicar el resultado si quieres reemplazarlos.";
      paint();
    }
  }
  async function image(file: File) {
    if (loading) return;
    const serial = ++imageSerial;
    loading = true; state.image = undefined; state.message = "Preparando imagen…"; state.suggestion = undefined; paint();
    try {
      const { prepareQuickAiImage } = await import("./ai-image");
      const prepared = await prepareQuickAiImage(file);
      if (disposed || serial !== imageSerial) return;
      state.image = prepared; state.message = "Imagen preparada. Pulsa Rellenar para analizarla.";
    } catch (error) { if (!disposed && serial === imageSerial) state.message = error instanceof Error ? error.message : "No se pudo preparar la imagen."; }
    finally { if (!disposed && serial === imageSerial) { loading = false; paint(); } }
  }
  async function fill() {
    if (loading) return;
    if (!state.consent) { state.message = "Acepta primero el envío del contenido a OpenAI."; paint(); return; }
    if (state.text.trim().length < 8 && !state.image) { state.message = "Pega los datos o añade una foto o captura."; paint(); return; }
    const basis = { ...options.readBasis(), target: state.target };
    controller = new AbortController(); loading = true; state.suggestion = undefined; state.message = ""; paint();
    try {
      const result = await options.request({ text: state.text, ...(state.image ? { image: { mimeType: state.image.mimeType, base64: state.image.base64 } } : {}), kind: options.kind, target: state.target, consent: QUICK_AI_CONSENT_VERSION }, controller.signal);
      if (disposed) return;
      loading = false;
      const suggestion = normalizeQuickAiSuggestion(result.suggestion);
      if (!quickAiHasTargetFields(suggestion, basis.target)) throw new Error("No se han encontrado campos para el apartado seleccionado. Prueba otro texto o una foto más clara.");
      apply(suggestion, basis, false);
    } catch (error) {
      if (disposed) return;
      loading = false; state.message = error instanceof DOMException && error.name === "AbortError" ? "El análisis tardó demasiado. Tus campos siguen intactos; puedes reintentar." : error instanceof Error ? error.message : "No se pudo interpretar. Tus campos siguen intactos."; paint();
    }
  }
  const onInput = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.id === "quick-ai-text") { state.text = input.value; state.suggestion = undefined; }
    if (input.id === "quick-ai-target") { state.target = input.value as QuickAiTarget; state.suggestion = undefined; }
    if (input.id === "quick-ai-consent") {
      state.consent = input.checked;
      if (state.consent) try { localStorage.setItem(consentKey(options.basis.scope), QUICK_AI_CONSENT_VERSION); } catch { /* Explicit consent is valid for this open form. */ }
    }
  };
  const onChange = (event: Event) => { const input = event.target as HTMLInputElement; if (input.type === "file" && input.files?.[0]) void image(input.files[0]); };
  const onClick = (event: Event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-ai]");
    if (!button || button.disabled) return;
    const action = button.dataset.ai;
    if (action === "choose" || action === "camera") host.querySelector<HTMLInputElement>(action === "camera" ? "#quick-ai-camera" : "#quick-ai-file")?.click();
    if (action === "remove") { state.image = undefined; state.message = ""; state.suggestion = undefined; paint(); }
    if (action === "fill") void fill();
    if (action === "apply" && state.suggestion && state.basis) apply(state.suggestion, state.basis, true);
  };
  const onPaste = (event: ClipboardEvent) => {
    const item = Array.from(event.clipboardData?.items ?? []).find(item => item.kind === "file");
    const file = item?.getAsFile();
    if (file) { event.preventDefault(); void image(file); }
  };
  host.addEventListener("input", onInput); host.addEventListener("change", onChange); host.addEventListener("click", onClick); host.addEventListener("paste", onPaste);
  paint();
  return () => {
    if (loading) state.message = "El análisis se interrumpió al cambiar de pantalla. Tus campos siguen intactos; puedes reintentar.";
    disposed = true; imageSerial++; controller?.abort(); host.removeEventListener("input", onInput); host.removeEventListener("change", onChange); host.removeEventListener("click", onClick); host.removeEventListener("paste", onPaste);
  };
}
