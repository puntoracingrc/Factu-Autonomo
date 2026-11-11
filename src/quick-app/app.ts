import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseQuickIntent, QUICK_METHODS, quickPaymentTerms, quickTotals, type QuickBootstrap, type QuickIntent, type QuickReceipt } from "@/lib/quick-invoicing/model";
import type { Client, LineItem } from "@/lib/types";
import { readLocal, saveLocal, type QuickLocalState } from "./storage";
import { escapeHtml as escape } from "./html";
import { quickAccessScreen } from "./access-screen";
import { quickCustomer, quickCustomerCard, type QuickCustomer } from "./customer";
import { quickCompanyRequestHeaders } from "@/lib/quick-invoicing/request-scope";
import { mountQuickInstall } from "./install";
import { mountQuickAiFill } from "./ai-fill";
import { quickCardPaymentPanel } from "./payments";
import { createQuickCollections } from "./collections";
import type { QuickCollection } from "@/lib/quick-invoicing/collections-model";
import { stripeCheckoutUrl, type QuickCardPayment } from "@/lib/quick-invoicing/payments-model";
import { quickTerminalIntent } from "@/lib/quick-invoicing/terminal-model";
import { applyQuickAiSuggestion, quickAiReplacesData } from "@/lib/quick-invoicing/ai-fill";
import "./app.css";

const root = document.querySelector<HTMLDivElement>("#app")!;
const money = (amount: number) => new Intl.NumberFormat("es-ES",{ style:"currency",currency:"EUR" }).format(amount);
const labels = { pendiente: "Cobrar más tarde", efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia", bizum: "Bizum", stripe: "Enlace o QR" };
let auth: SupabaseClient;
let bootstrap: QuickBootstrap;
let localKey = "";
let deviceToken = "";
let state: QuickLocalState = {};
let view: "home" | "form" | "result" | "customers" | "collections" = "home";
let collections: ReturnType<typeof createQuickCollections> | undefined;
let collectionGeneration = 0;
let busy = false;
let notice = "";
let saveChain = Promise.resolve();
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let searchSerial = 0;
let suggestions: Array<Record<string, unknown>> = [];
let pdf: Awaited<ReturnType<(typeof import("./pdf"))["quickPdf"]>> | undefined;
let pdfLoading = false;
let pdfModulePromise: Promise<typeof import("./pdf")> | undefined;
let accessBusy = false;
let customerRows: Array<Record<string,unknown>> = [];
let selectedCustomer: QuickCustomer | undefined;
let customerQuery = "";
let customerLoading = false;
let customerError = "";
let customerSerial = 0;
let customerTimer: ReturnType<typeof setTimeout> | undefined;
let unmountAi: (() => void) | undefined;
let sessionActive = false;
let cardPayment: QuickCardPayment | undefined;
let cardQr: string | undefined;
let cardBusy = false;
let nfcIntent: string | undefined;
const nfcAvailable = () => bootstrap?.nfcPaymentsEnabled === true && /Android/i.test(navigator.userAgent);
let cardSerial = 0;
const loadPdfModule = () => pdfModulePromise ??= import("./pdf").catch(error => { pdfModulePromise = undefined; throw error; });

class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
async function api<T>(action: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const companyHeaders = quickCompanyRequestHeaders(action, bootstrap?.companyId);
  const { data, error } = await auth.auth.getSession();
  if (error || !data.session) throw new ApiError(401,"SIGN_IN_REQUIRED","Inicia sesión para continuar. Tu borrador no se ha borrado.");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(),30_000);
  try {
    const response = await fetch(`/api/factu-rapido/${action}`, {
      method: body === undefined ? "GET" : "POST", cache: "no-store", signal: controller.signal,
      headers: { Authorization: `Bearer ${data.session.access_token}`, "X-Factu-Device-Token": deviceToken, ...companyHeaders,
        ...(body === undefined ? {} : { "Content-Type":"application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json();
    if (!response.ok || result.ok === false) throw new ApiError(response.status,result.code ?? "UNCONFIRMED",result.message ?? "No se pudo confirmar la operación.");
    return result as T;
  } finally { clearTimeout(timeout); signal?.removeEventListener("abort", abort); }
}
function persist() {
  const captured = structuredClone(state);
  const capturedKey = localKey;
  // Serial writes preserve the newest keystroke, including while backgrounded.
  const next = saveChain.catch(() => undefined).then(() => saveLocal(capturedKey,captured));
  saveChain = next;
  return next;
}
function saveDraft() {
  void persist().catch(error => {
    notice = error.message;
    const node = document.querySelector("#notice");
    if (node) { node.textContent = notice; node.classList.remove("empty"); }
  });
}
function header() {
  return `<header class="topbar"><button class="wordmark" data-action="home" aria-label="Volver al inicio">Factu<span>Rápido ↗</span></button><span class="pilot">ACCESO PRIVADO</span></header>
    <div class="company"><span class="dot"></span>${escape(bootstrap.companyName)}</div>`;
}
function status() { return `<p id="notice" role="status" class="notice ${notice ? "" : "empty"}">${escape(notice)}</p>`; }
function field(label: string, key: keyof Client, options: { required?: boolean; type?: string; autocomplete?: string } = {}) {
  return `<label>${label}${options.required ? '<span class="required"> *</span>' : ""}<input data-client="${key}" name="${key}" value="${escape(state.intent?.client[key])}" type="${options.type ?? "text"}" autocomplete="${options.autocomplete ?? "off"}" maxlength="${key === "name" ? 200 : key === "address" ? 250 : 100}"></label>`;
}
function renderHome() {
  return `<h1 class="sr-only">Crear documento</h1>
    <div class="home-actions"><button data-action="new-invoice" class="hero-button invoice"><span class="button-symbol" aria-hidden="true">↗</span><span>Crear factura</span><b aria-hidden="true">→</b></button>
    <button data-action="new-quote" class="hero-button quote"><span class="button-symbol" aria-hidden="true">≡</span><span>Crear presupuesto</span><b aria-hidden="true">→</b></button>
    ${bootstrap.cardPaymentsEnabled ? '<button data-action="collections" class="hero-button invoice"><span class="button-symbol" aria-hidden="true">€</span><span>Cobrar</span><b aria-hidden="true">→</b></button>' : ""}
    <button data-action="customers" class="hero-button quote"><span class="button-symbol" aria-hidden="true">⌕</span><span>Buscar cliente</span><b aria-hidden="true">→</b></button></div>
    ${state.intent ? `<button class="resume" data-action="resume">${state.pending ? "Comprobar emisión pendiente" : "Continuar documento sin terminar"}<span>→</span></button>` : ""}
    ${state.receipt ? `<button class="resume" data-action="last">Abrir ${escape(state.receipt.document.number)}<span>↗</span></button>` : ""}`;
}
function customerContent() {
  if (selectedCustomer) return quickCustomerCard(selectedCustomer);
  if (customerQuery.trim().length < 2) return "";
  if (customerError) return `<p role="alert">${escape(customerError)}</p><button class="secondary" data-action="customer-retry">Reintentar búsqueda</button>`;
  return `<div class="customer-list">${customerRows.map((row,index) => `<button class="customer-item" data-action="customer-select" data-index="${index}"><strong>${escape(row.name || "Sin nombre")}</strong>${row.nif ? `<span>${escape(row.nif)}</span>` : ""}</button>`).join("")}</div>
    ${customerLoading ? '<p role="status">Buscando clientes…</p>' : !customerRows.length ? '<p>No se encontraron clientes.</p>' : ""}`;
}
function customersScreen() {
  return `<div class="form-title"><h1>Buscar cliente</h1></div><label>Nombre o NIF<input id="directory-search" type="search" value="${escape(customerQuery)}" autocomplete="off" placeholder="Buscar cliente"></label><div id="customer-content" class="customer-content">${customerContent()}</div><button class="secondary customer-home" data-action="home">Inicio</button>`;
}
function updateCustomerContent() {
  const content = document.querySelector("#customer-content");
  if (content) content.innerHTML = customerContent();
}
async function loadCustomers() {
  const serial = ++customerSerial;
  const query = customerQuery.trim();
  selectedCustomer = undefined; customerError = ""; customerRows = []; customerLoading = query.length >= 2;
  updateCustomerContent();
  if (query.length < 2) return;
  try {
    const result = await api<{results:Array<Record<string,unknown>>}>(`search?kind=customer&q=${encodeURIComponent(query)}`);
    if (serial !== customerSerial || view !== "customers") return;
    customerRows = result.results;
  } catch (error) {
    if (serial !== customerSerial || view !== "customers") return;
    customerError = error instanceof Error ? error.message : "No se pudieron cargar los clientes.";
  } finally { if (serial === customerSerial) { customerLoading = false; updateCustomerContent(); } }
}
function clientStep() {
  const full = state.intent?.kind === "factura";
  return `<section class="panel"><label class="search-label">Buscar un cliente existente<input id="customer-search" type="search" placeholder="Nombre o NIF…" autocomplete="off"></label><div id="suggestions" class="suggestions" aria-live="polite"></div>
    <div class="section-label">${state.intent?.customerId ? "Cliente seleccionado" : "O introduce sus datos"}</div>
    ${field("Nombre o razón social","name",{ required:true, autocomplete:"name" })}
    <div class="two">${field("NIF / CIF","nif",{ required:full })}${field("Teléfono","phone",{ type:"tel",autocomplete:"tel" })}</div>
    ${field("Dirección","address",{ required:full, autocomplete:"street-address" })}
    <div class="two postal">${field("C. postal","postalCode",{ required:full,autocomplete:"postal-code" })}${field("Población","city",{ required:full,autocomplete:"address-level2" })}</div>
    ${field("Email (opcional)","email",{ type:"email",autocomplete:"email" })}
    <p class="hint">El cliente nuevo se guarda en la agenda después de confirmar el documento.</p></section>`;
}
function vatOptions(value: number) {
  return [...new Set([...bootstrap.vatRates,value])].sort((a,b) => a-b).map(rate => `<option value="${escape(rate)}" ${rate === value ? "selected" : ""}>${escape(rate)}%</option>`).join("");
}
function line(item: LineItem, index: number) {
  return `<article class="line-card" data-line="${escape(item.id)}"><div class="line-heading"><span>CONCEPTO ${index+1}</span><button type="button" class="remove-line" data-action="remove-line" data-id="${escape(item.id)}" aria-label="Eliminar concepto ${index+1}">×</button></div>
    <label class="sr-only" for="description-${escape(item.id)}">Descripción del concepto ${index+1}</label><textarea id="description-${escape(item.id)}" data-item="description" rows="2" maxlength="2000" placeholder="Ej. Cambio de cinta de persiana">${escape(item.description)}</textarea>
    <div class="line-values"><label>Cantidad<input data-item="quantity" type="number" inputmode="decimal" min="0.0001" step="any" value="${escape(item.quantity)}"></label><label>Precio sin IVA<input data-item="unitPrice" type="number" inputmode="decimal" min="0" step="any" value="${escape(item.unitPrice)}"></label><label>IVA<select data-item="ivaPercent" ${bootstrap.vatExempt ? "disabled" : ""}>${vatOptions(item.ivaPercent)}</select></label></div>
    <div class="line-bottom"><span>Unidad: ${escape(item.unit ?? "ud")}</span><strong data-line-total="${escape(item.id)}"></strong></div></article>`;
}
function conceptsStep() {
  return `<section><label class="search-label product-search">Añadir desde productos<input id="product-search" type="search" placeholder="Referencia o nombre…" autocomplete="off"></label><div id="suggestions" class="suggestions" aria-live="polite"></div>
    ${state.intent!.items.map(line).join("")}<button class="add-line" data-action="add-line">＋ Añadir concepto libre</button>
    <details class="notes" ${state.intent!.notes ? "open" : ""}><summary>Notas (opcional)<span>＋</span></summary><label class="sr-only" for="notes">Notas del documento</label><textarea id="notes" rows="3" maxlength="4000" placeholder="Información adicional para el cliente…">${escape(state.intent!.notes)}</textarea></details></section>`;
}
function paymentStep() {
  const intent = state.intent!;
  const fromCollection = state.collectionInvoice?.operationId === intent.operationId;
  return `<section class="panel"><label>Fecha del documento<input id="date" type="date" value="${escape(intent.date)}" min="2000-01-01" max="2099-12-31"></label>
    ${fromCollection ? `<p class="hint">Cobro asociado: ${money(state.collectionInvoice!.amount / 100)}. Revisa que el total coincida. La factura se emitirá aunque el cliente todavía no haya pagado.</p>` : `<fieldset class="payment-methods"><legend>Forma de pago</legend><div class="method-grid">${QUICK_METHODS.filter(method => method !== "stripe" || (bootstrap.cardPaymentsEnabled && intent.kind === "factura")).map(method => `<label class="method"><input type="radio" name="payment" value="${method}" ${method === intent.paymentMethod ? "checked" : ""}><span>${labels[method]}</span></label>`).join("")}</div></fieldset>`}
    ${intent.paymentMethod === "stripe" ? `<p class="hint">Al emitir prepararemos el enlace y el QR. Puedes enviarlos ahora y cobrar más tarde. La factura queda emitida aunque el cliente no pague.${bootstrap.cardPaymentsTestMode ? " Modo de prueba: no se cobra dinero real." : ""}</p>` : intent.paymentMethod === "pendiente" ? '<p class="hint">La factura se emitirá pendiente de pago. Puedes enviarla ahora y cobrarla después.</p>' : intent.kind === "factura" ? `<label class="paid-check"><input id="paid" type="checkbox" ${intent.paid ? "checked" : ""}><span>Pagado<small>Márcalo solo si ya has recibido el dinero.</small></span></label>` : ""}
    <div class="payment-preview"><span>ASÍ APARECERÁ EN EL DOCUMENTO</span><p id="payment-preview-text">${escape(quickPaymentTerms(intent.paymentMethod,intent.paid,bootstrap.iban))}</p></div>
    <div class="review-client"><span>CLIENTE</span><strong>${escape(intent.client.name)}</strong><small>${intent.items.length} concepto${intent.items.length === 1 ? "" : "s"}</small></div></section>`;
}
function renderForm() {
  const intent = state.intent!;
  const step = state.step ?? 1;
  return `<div class="form-title"><p class="eyebrow">${intent.kind === "factura" ? "NUEVA FACTURA" : "NUEVO PRESUPUESTO"}</p><h1>${["","Cliente","Conceptos y notas","Pago"][step]}</h1></div>
    <nav class="steps" aria-label="Pasos del documento">${["Cliente","Conceptos","Pago"].map((name,i) => `<span class="${step === i+1 ? "current" : step > i+1 ? "complete" : ""}" ${step === i+1 ? 'aria-current="step"' : ""}><b>${step > i+1 ? "✓" : i+1}</b>${name}</span>`).join("")}</nav>
    ${!state.pending && !busy ? '<div id="quick-ai-fill"></div>' : ""}
    <form id="document-form"><fieldset class="form-content" ${state.pending || busy ? "disabled" : ""}>${step === 1 ? clientStep() : step === 2 ? conceptsStep() : paymentStep()}</fieldset></form>
    <footer class="form-footer">${step > 1 ? `<div class="totals"><span>Base <b id="base-total"></b></span><span>IVA <b id="vat-total"></b></span><strong>Total <b id="grand-total"></b></strong></div>` : ""}
    ${state.pending ? '<p class="pending-info">Esta operación está guardada en el móvil. Comprobaremos si el servidor ya la emitió antes de reintentar.</p>' : ""}
    <div class="footer-buttons"><button class="secondary" data-action="back" ${busy ? "disabled" : ""}>${step === 1 ? "Inicio" : "Atrás"}</button><button class="primary" data-action="next" ${busy ? "disabled" : ""}>${busy ? "Confirmando…" : state.pending ? "Comprobar y reintentar" : step < 3 ? "Siguiente →" : intent.kind === "factura" ? intent.paymentMethod === "stripe" ? "Emitir y preparar cobro ↗" : "Emitir factura ↗" : "Crear presupuesto ↗"}</button></div>
    ${state.pending ? '<button class="text-button" data-action="check-edit">Volver a editar (comprobar primero)</button>' : ""}</footer>`;
}
function renderResult() {
  const receipt = state.receipt!;
  return `<section class="result-head"><div class="success-mark">✓</div><p class="eyebrow">Documento guardado</p><h1>${escape(receipt.document.number)}</h1><p>${escape(receipt.document.client.name)}</p><strong>${money(quickTotals(receipt.document.items,receipt.profile.vatExempt).total)}</strong></section>
    ${receipt.document.type === "factura" && bootstrap.cardPaymentsEnabled && (cardPayment || receipt.document.paymentStatus !== "paid") ? quickCardPaymentPanel(cardPayment,cardBusy,cardQr,false,nfcAvailable(),nfcIntent) : ""}
    <div class="pdf-actions"><button data-action="share" class="primary" ${pdf ? "" : "disabled"}>Compartir PDF ↗</button><button data-action="open-pdf" class="secondary" ${pdf ? "" : "disabled"}>Abrir PDF</button></div>
    <div id="pdf-view" class="pdf-view">${pdf ? `<iframe title="PDF del documento confirmado" src="${escape(pdf.url)}"></iframe>` : `<p>${pdfLoading ? "Preparando tu PDF…" : "El documento ya está guardado. Puedes volver a generar el PDF sin emitirlo otra vez."}</p><button class="secondary" data-action="retry-pdf">Preparar PDF</button>`}</div>
    <button class="resume" data-action="home">Volver al inicio<span>→</span></button>`;
}
function render() {
  unmountAi?.(); unmountAi = undefined;
  root.innerHTML = `${header()}<main class="main">${status()}${view === "home" ? renderHome() : view === "form" ? renderForm() : view === "customers" ? customersScreen() : view === "collections" ? collections?.html() ?? "" : renderResult()}</main>`;
  if (view === "collections") collections?.mount(root);
  if (view === "form") updateTotals();
  const host = root.querySelector<HTMLElement>("#quick-ai-fill");
  if (host && state.intent) unmountAi = mountQuickAiFill(host, {
    basis: { scope: localKey, operationId: state.intent.operationId, snapshot: JSON.stringify(state.intent), target: "document" },
    readBasis: () => ({ scope: localKey, operationId: state.intent!.operationId, snapshot: JSON.stringify(state.intent), target: "document" }),
    kind: state.intent.kind, request: (body, signal) => api("autofill", body, signal),
    apply: (suggestion, basis, explicit) => {
      if (!sessionActive || localKey !== basis.scope || view !== "form" || !state.intent || state.intent.operationId !== basis.operationId || state.pending || busy) return false;
      const changed = JSON.stringify(state.intent) !== basis.snapshot;
      const replaces = quickAiReplacesData(state.intent, suggestion, basis.target);
      if (!explicit && (changed || replaces)) return false;
      if (explicit && (changed || replaces) && !confirm("Se sustituirán los campos detectados por la IA. Revisa después el cliente y los conceptos. ¿Continuar?")) return false;
      state.intent = applyQuickAiSuggestion(state.intent, suggestion, basis.target, bootstrap, () => crypto.randomUUID());
      saveDraft(); return true;
    }, renderForm: render,
  });
}
function updateTotals() {
  if (!state.intent) return;
  const amounts = quickTotals(state.intent.items,bootstrap.vatExempt);
  for (const [id,amount] of [["base-total",amounts.subtotal],["vat-total",amounts.iva],["grand-total",amounts.total]] as const) {
    const node = document.getElementById(id); if (node) node.textContent = money(amount);
  }
  for (const item of state.intent.items) {
    const node = document.querySelector(`[data-line-total="${CSS.escape(item.id)}"]`);
    if (node) node.textContent = money(quickTotals([item],bootstrap.vatExempt).total);
  }
}
function emptyLine(): LineItem {
  return { id: crypto.randomUUID(), description:"",quantity:1,unitPrice:0,ivaPercent:bootstrap.vatExempt ? 0 : bootstrap.defaultVat,unit:"ud" };
}
function start(kind: QuickIntent["kind"], customer?: QuickCustomer) {
  if (state.pending) { view = "form"; state.step = 3; notice = "Comprueba primero el documento pendiente; no se creará otro con un número distinto."; render(); return; }
  if (state.intent && !confirm("Hay un documento sin terminar. ¿Quieres descartarlo y empezar otro?")) return;
  delete state.collectionInvoice;
  state.intent = { operationId:crypto.randomUUID(),kind,date:new Date().toLocaleDateString("sv-SE"),client:{name:""},items:[emptyLine()],notes:"",paymentMethod:"pendiente",paid:false };
  if (customer) { state.intent.client = structuredClone(customer.client); state.intent.customerId = customer.id; }
  state.step = 1; view = "form"; notice = ""; saveDraft(); render(); window.scrollTo(0,0);
}
async function invoiceFromCollection(collection: QuickCollection, receipt: QuickReceipt | null) {
  if (state.pending && state.pending.operationId !== collection.invoiceOperationId) {
    view = "form"; notice = "Comprueba primero la emisión pendiente. El cobro sigue guardado en Cobrar."; render(); return;
  }
  if (receipt) {
    if (state.intent && state.intent.operationId !== receipt.operationId && !confirm("Hay un documento sin terminar. ¿Quieres abrir esta factura?")) return;
    await acceptReceipt(receipt);
    await requestCardPayment(false, true); return;
  }
  if (state.intent?.operationId === collection.invoiceOperationId) { view = "form"; render(); return; }
  const previous = state.intent;
  start("factura");
  if (!state.intent || state.intent === previous || view !== "form") return;
  state.intent.operationId = collection.invoiceOperationId!;
  state.intent.client.name = collection.customerName;
  const rate = bootstrap.vatExempt ? 0 : bootstrap.defaultVat;
  state.intent.items = [{ ...emptyLine(), description: collection.description, unitPrice: Number((collection.amount / 100 / (1 + rate / 100)).toFixed(6)), ivaPercent: rate }];
  state.collectionInvoice = { operationId: collection.invoiceOperationId!, amount: collection.amount };
  await persist(); render();
}
function validateStep() {
  const intent = state.intent!;
  if (state.step === 1) {
    const fields: Array<keyof Client> = intent.kind === "factura" ? ["name","nif","address","postalCode","city"] : ["name"];
    const missing = fields.find(key => !String(intent.client[key] ?? "").trim());
    if (missing) {
      const input = document.querySelector<HTMLInputElement>(`[data-client="${missing}"]`);
      input?.focus(); throw new Error("Completa los datos del cliente marcados con *.");
    }
  }
  if (state.step === 2 && (!intent.items.length || intent.items.some(item => !item.description.trim() || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0))) throw new Error("Revisa la descripción, cantidad y precio de cada concepto.");
}
async function preparePdf() {
  if (pdfLoading || !state.receipt) return;
  pdfLoading = true; render();
  try {
    const pdfModule = await loadPdfModule();
    const created = await pdfModule.quickPdf(state.receipt);
    if (pdf) URL.revokeObjectURL(pdf.url);
    pdf = created;
  } catch { notice = "El documento está emitido. No se pudo preparar el PDF; puedes intentarlo de nuevo aquí sin emitir otra factura."; }
  finally { pdfLoading = false; render(); }
}
async function acceptReceipt(receipt: QuickReceipt) {
  if (state.receipt?.operationId !== receipt.operationId) { cardSerial++; cardPayment = undefined; cardQr = undefined; nfcIntent=undefined; cardBusy = false; }
  state.receipt = receipt; delete state.intent; delete state.pending; delete state.step;
  delete state.collectionInvoice;
  view = "result"; notice = "";
  if (receipt.collectionLinkPending) notice = "La factura está emitida. Revisa la vinculación con su cobro desde Cobrar; no hace falta emitir otra.";
  try { await persist(); } catch { notice = "Documento confirmado en el servidor. No se pudo guardar su acceso reciente en este móvil; conserva el PDF."; }
  if (pdf) URL.revokeObjectURL(pdf.url);
  pdf = undefined; render(); await preparePdf();
}
async function emit() {
  if (busy) return;
  if (!navigator.onLine) { notice = "Necesitas conexión para recibir el número definitivo. Tu documento sigue aquí."; render(); return; }
  busy = true; notice = "";
  let attempted = false;
  try {
    const retrying = Boolean(state.pending);
    if (!state.pending) {
      const parsed = parseQuickIntent(state.intent);
      if (new TextEncoder().encode(JSON.stringify(parsed)).byteLength > 60 * 1024) throw new Error("El documento es demasiado largo para la pantalla rápida. Acorta las notas o los conceptos antes de emitir.");
      state.intent = parsed; state.pending = structuredClone(parsed);
    }
    await persist(); // Also retry persistence if a previous local write failed.
    render();
    attempted = true;
    const recovered = retrying ? await api<{receipt:QuickReceipt | null}>(`document?operationId=${encodeURIComponent(state.pending!.operationId)}`) : null;
    const collect = state.pending?.paymentMethod === "stripe";
    const receipt = recovered?.receipt ?? (await api<{receipt:QuickReceipt}>("issue",state.pending)).receipt;
    busy = false;
    await acceptReceipt(receipt);
    if (collect) await requestCardPayment(true);
  } catch (error) {
    busy = false;
    if (error instanceof ApiError && error.code === "DOCUMENT_REMOVED") {
      delete state.pending; delete state.intent; view = "home"; saveDraft();
    }
    notice = error instanceof Error ? error.message : "No se pudo confirmar. Conservamos tus datos.";
    if (attempted && !(error instanceof ApiError)) notice = "No se pudo confirmar todavía. Conservamos tus datos; pulsa Comprobar y reintentar para recuperar la misma operación.";
    render();
  }
}
async function checkBeforeEdit() {
  if (!state.pending || busy) return;
  busy = true; render();
  try {
    const result = await api<{cancelled:boolean;receipt:QuickReceipt|null}>("cancel",state.pending);
    if (result.receipt) { busy = false; await acceptReceipt(result.receipt); return; }
    if (result.cancelled) {
      // The server holds the same operation lock as issuance and has recorded
      // a cancellation marker. A delayed old request can no longer commit.
      delete state.pending; state.intent!.operationId = crypto.randomUUID(); state.step = 1;
      await persist(); notice = "Puedes editar. El servidor ha confirmado que la operación anterior no emitirá un documento.";
    }
  } catch (error) { notice = error instanceof Error ? error.message : "No se pudo comprobar."; }
  finally { busy = false; render(); }
}
function search(input: HTMLInputElement, kind: "customer" | "product") {
  clearTimeout(searchTimer);
  const serial = ++searchSerial;
  const box = document.querySelector<HTMLDivElement>("#suggestions")!;
  if (input.value.trim().length < 2) { box.innerHTML = ""; return; }
  searchTimer = setTimeout(() => { void (async () => {
    try {
      const response = await api<{results:Array<Record<string,unknown>>}>(`search?kind=${kind}&q=${encodeURIComponent(input.value)}`);
      if (serial !== searchSerial || !box.isConnected) return;
      suggestions = response.results;
      box.innerHTML = suggestions.length ? suggestions.map((item,index) => `<button type="button" data-action="suggestion" data-kind="${kind}" data-index="${index}"><strong>${escape(kind === "product" && item.sku ? `${item.sku} · ${item.name}` : item.name)}</strong><small>${escape(kind === "customer" ? item.nif ?? "" : typeof item.unitPrice === "number" ? `${money(item.unitPrice)} sin IVA` : "Sin precio de venta · introdúcelo tú")}</small></button>`).join("") : '<p class="hint">Sin coincidencias. Puedes introducirlo directamente.</p>';
    } catch { if (serial === searchSerial && box.isConnected) box.textContent = "No se pudo buscar ahora. Puedes escribir los datos directamente."; }
  })(); },400);
}
root.addEventListener("input",event => {
  const input = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  if (input.closest("#quick-ai-fill")) return;
  if (input.id === "directory-search") {
    customerQuery = input.value; selectedCustomer = undefined; customerSerial++; clearTimeout(customerTimer);
    customerRows = []; customerError = ""; customerLoading = customerQuery.trim().length >= 2; updateCustomerContent();
    customerTimer = setTimeout(() => { if (view === "customers") void loadCustomers(); },400); return;
  }
  if (input.id === "customer-search" || input.id === "product-search") { search(input as HTMLInputElement,input.id === "customer-search" ? "customer" : "product"); return; }
  if (!state.intent || state.pending || busy) return;
  if (input.dataset.client) {
    state.intent.client[input.dataset.client as keyof Client] = input.value as never;
    delete state.intent.customerId;
  } else if (input.dataset.item) {
    const id = input.closest<HTMLElement>("[data-line]")?.dataset.line;
    const item = state.intent.items.find(item => item.id === id);
    if (item) {
      if (input.dataset.item === "description") item.description = input.value;
      else Object.assign(item,{ [input.dataset.item]: input.value === "" ? NaN : Number(input.value) });
      updateTotals();
    }
  } else if (input.id === "notes") state.intent.notes = input.value;
  else if (input.id === "date") state.intent.date = input.value;
  else if (input.name === "payment") {
    state.intent.paymentMethod = input.value as QuickIntent["paymentMethod"];
    if (state.intent.paymentMethod === "stripe" || state.intent.paymentMethod === "pendiente") state.intent.paid = false;
    saveDraft(); render(); return;
  }
  else if (input.id === "paid") state.intent.paid = (input as HTMLInputElement).checked;
  const preview = document.querySelector("#payment-preview-text");
  if (preview) preview.textContent = quickPaymentTerms(state.intent.paymentMethod,state.intent.paid,bootstrap.iban);
  saveDraft();
});
root.addEventListener("submit",event => event.preventDefault());
root.addEventListener("click",event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  void (async () => {
    try {
      if (action === "login") { await login(); return; }
      if (action === "retry-access") { await startAccess(); return; }
      if (!bootstrap || busy) return;
      if (view === "collections" && button.closest("#quick-collections")) return;
      if (action === "collections" && collections) { view = "collections"; notice = ""; render(); await collections.open(); return; }
      if (action === "payment-nfc" || action === "payment-link") {
        if (cardBusy || !state.receipt) return;
        const operationId=state.receipt.operationId, serial=++cardSerial;
        cardBusy=true; notice=""; render();
        try {
          const result=await api<{grant?:string;payment?:QuickCardPayment}>("terminal",{action:action === "payment-nfc" ? "prepare" : "cancel",operationId});
          if (state.receipt?.operationId!==operationId || serial!==cardSerial) return;
          nfcIntent=result.grant ? quickTerminalIntent(result.grant) : undefined;
          cardPayment=result.payment; cardQr=undefined;
        } catch(error) { if (serial===cardSerial) notice=error instanceof Error ? error.message : "No se pudo confirmar el cobro NFC."; }
        finally {if(serial===cardSerial) {cardBusy=false;render();}}
        if(action === "payment-link" && !notice) await requestCardPayment(true);
        return;
      }
      if (action === "payment-create" || action === "payment-check") { await requestCardPayment(action === "payment-create"); return; }
      if (action === "payment-copy" || action === "payment-share") {
        const url = stripeCheckoutUrl(cardPayment?.url);
        if (!url || cardPayment?.status !== "open") return;
        if (action === "payment-share" && navigator.share) {
          try { await navigator.share({ title: `Pago de factura ${state.receipt!.document.number}`, url }); }
          catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) throw error; }
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(url); notice = "Enlace de pago copiado."; render();
        } else { const input = document.querySelector<HTMLInputElement>("#card-payment-url"); input?.focus(); input?.select(); }
        return;
      }
      if (action === "customers") {
        customerSerial++; clearTimeout(customerTimer); customerQuery = ""; selectedCustomer = undefined; customerRows = []; customerError = ""; customerLoading = false;
        view = "customers"; notice = ""; render(); window.scrollTo(0,0); return;
      }
      if (action === "customer-retry") { if (!customerLoading) await loadCustomers(); return; }
      if (action === "customer-select") {
        const row = customerRows[Number(button.dataset.index)]; if (!row) return;
        customerSerial++; customerLoading = false; selectedCustomer = quickCustomer(row); updateCustomerContent();
        document.querySelector<HTMLInputElement>("#directory-search")?.blur(); window.scrollTo(0,0); return;
      }
      if (action === "customer-change") { selectedCustomer = undefined; updateCustomerContent(); return; }
      if (action === "customer-invoice" || action === "customer-quote") {
        if (selectedCustomer) start(action === "customer-invoice" ? "factura" : "presupuesto",selectedCustomer); return;
      }
      if (action === "new-invoice" || action === "new-quote") { start(action === "new-invoice" ? "factura" : "presupuesto"); return; }
      if (action === "home") { view = "home"; notice = ""; render(); window.scrollTo(0,0); return; }
      if (action === "resume") { view = "form"; state.step = state.pending ? 3 : state.step ?? 1; notice = ""; render(); return; }
      if (action === "last") {
        const current = await api<{receipt:QuickReceipt|null}>(`document?operationId=${encodeURIComponent(state.receipt!.operationId)}`);
        if (!current.receipt) throw new Error("No se encontró este documento en el servidor.");
        await acceptReceipt(current.receipt);
        if (bootstrap.cardPaymentsEnabled && current.receipt.document.type === "factura") await requestCardPayment(false, true);
        return;
      }
      if (action === "back") { if ((state.step ?? 1) <= 1) view = "home"; else if (!state.pending) state.step!--; else { notice = "Comprueba primero la emisión pendiente."; } saveDraft(); render(); window.scrollTo(0,0); return; }
      if (action === "next") {
        if (state.pending || state.step === 3) { await emit(); return; }
        validateStep(); state.step = (state.step ?? 1)+1; notice = ""; saveDraft(); render(); window.scrollTo(0,0);
        // Warm only the PDF generator while the user writes the concepts; it
        // neither reads the history nor creates anything before confirmation.
        void loadPdfModule().catch(() => undefined); return;
      }
      if (action === "add-line") { if (state.intent!.items.length >= 20) throw new Error("Esta pantalla rápida admite hasta 20 conceptos."); state.intent!.items.push(emptyLine()); saveDraft(); render(); return; }
      if (action === "remove-line") { state.intent!.items = state.intent!.items.filter(item => item.id !== button.dataset.id); if (!state.intent!.items.length) state.intent!.items.push(emptyLine()); saveDraft(); render(); return; }
      if (action === "suggestion") {
        const item = suggestions[Number(button.dataset.index)]; if (!item) return;
        if (button.dataset.kind === "customer") {
          const client: Client = { name:String(item.name ?? "") };
          for (const key of ["nif","address","postalCode","city","email","phone","streetType","addressExtra"] as const) client[key] = String(item[key] ?? "");
          state.intent!.client = client; state.intent!.customerId = String(item.id);
        } else {
          const next = emptyLine(); next.description = String(item.description || item.name || "");
          next.unitPrice = typeof item.unitPrice === "number" ? item.unitPrice : 0;
          next.ivaPercent = bootstrap.vatExempt ? 0 : typeof item.ivaPercent === "number" ? item.ivaPercent : bootstrap.defaultVat;
          next.unit = String(item.unit ?? "ud");
          if (state.intent!.items.length === 1 && !state.intent!.items[0].description.trim()) state.intent!.items = [next];
          else { if (state.intent!.items.length >= 20) throw new Error("Máximo 20 conceptos."); state.intent!.items.push(next); }
        }
        saveDraft(); render(); return;
      }
      if (action === "retry-pdf") { await preparePdf(); return; }
      if (action === "open-pdf" && pdf) { window.open(pdf.url,"_blank","noopener"); return; }
      if (action === "share" && pdf) {
        const file = new File([pdf.blob],pdf.name,{type:"application/pdf"});
        if (navigator.canShare?.({files:[file]})) {
          try { await navigator.share({ files:[file],title:state.receipt!.document.number }); } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) throw error; }
        } else {
          const link = document.createElement("a"); link.href = pdf.url; link.download = pdf.name; link.click();
        }
        return;
      }
      if (action === "check-edit") await checkBeforeEdit();
    } catch (error) {
      notice = error instanceof Error ? error.message : "No se pudo completar.";
      const element = document.querySelector("#notice"); if (element) { element.textContent = notice; element.classList.remove("empty"); element.scrollIntoView({block:"nearest"}); }
    }
  })();
});
async function login() {
  const { error } = await auth.auth.signInWithOAuth({ provider:"google",options:{ redirectTo:`${location.origin}/rapido/index.html`,queryParams:{prompt:"select_account"} } });
  if (error) throw error;
}
function loginScreen(message = "Inicia sesión para continuar.") {
  collectionGeneration++;
  collections = undefined;
  cardSerial++; cardPayment = undefined; cardQr = undefined; nfcIntent=undefined; cardBusy = false;
  sessionActive = false; unmountAi?.(); unmountAi = undefined;
  root.innerHTML = quickAccessScreen(message,"login");
}
async function requestCardPayment(create: boolean, quiet = false) {
  if (cardBusy || !state.receipt || !sessionActive || view !== "result" || state.intent) return;
  const operationId = state.receipt.operationId, scope = localKey, serial = ++cardSerial;
  const current = () => sessionActive && localKey === scope && state.receipt?.operationId === operationId && serial === cardSerial && view === "result" && !state.intent;
  cardBusy = true; notice = ""; render();
  try {
    const result = create ? await api<{payment:QuickCardPayment}>("payment", { operationId })
      : await api<{payment:QuickCardPayment|null}>(`payment?operationId=${encodeURIComponent(operationId)}`);
    if (!current()) return;
    cardPayment = result.payment ?? undefined; cardQr = undefined;
    if (!cardPayment && !quiet) notice = "Todavía no se ha preparado un enlace para esta factura.";
    const url = stripeCheckoutUrl(cardPayment?.url);
    if (url && cardPayment?.status === "open") {
      const { default: qr } = await import("qrcode");
      const image = await qr.toDataURL(url,{width:256,margin:4,errorCorrectionLevel:"M"});
      if (!current()) return;
      cardQr = image;
    }
    if (cardPayment?.status === "paid") {
      const refreshed = await api<{receipt:QuickReceipt|null}>(`document?operationId=${encodeURIComponent(operationId)}`);
      if (!current()) return;
      if (refreshed.receipt) await acceptReceipt(refreshed.receipt);
    }
  } catch (error) { if (current()) notice = error instanceof Error ? error.message : "No se pudo comprobar el cobro."; }
  finally { if (serial === cardSerial && localKey === scope && sessionActive) { cardBusy = false; render(); } }
}
async function initialize() {
  if (!auth) {
    const config = await fetch("/api/factu-rapido/config",{cache:"no-store"}).then(response => response.json());
    if (!config.url || !config.anonKey) throw new Error("El acceso rápido aún no está configurado.");
    auth = createClient(config.url,config.anonKey,{ auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true} });
  }
  const storedDevice = (await readLocal("__device__"))?.deviceToken;
  deviceToken = storedDevice || crypto.randomUUID();
  if (!storedDevice) await saveLocal("__device__",{deviceToken});
  const session = await auth.auth.getSession();
  if (!session.data.session) { loginScreen(); return; }
  bootstrap = await api<QuickBootstrap>("bootstrap");
  sessionActive = true;
  localKey = `${bootstrap.actorId}:${bootstrap.companyId}`;
  state = await readLocal(localKey) ?? {};
  const collectionScope = localKey, generation = ++collectionGeneration;
  collections = createQuickCollections({ api, local: () => state, persist, nfcEnabled:nfcAvailable(),
    active: () => sessionActive && localKey === collectionScope && generation === collectionGeneration && view === "collections",
    render, invoice: invoiceFromCollection, home: () => { view = "home"; notice = ""; render(); window.scrollTo(0, 0); } });
  if (state.pending) { view = "form"; state.intent = state.pending; state.step = 3; notice = "Hay una emisión pendiente de confirmar. Recuperaremos la misma operación."; }
  if (navigator.locks) {
    // A second quick window must not overwrite the first window's pending
    // operation. This lock never touches the main application's storage.
    const claimed = await new Promise<boolean>(resolve => {
      void navigator.locks.request(`factu-quick-editor:${localKey}`,{ifAvailable:true},async lock => {
        resolve(Boolean(lock));
        if (lock) await new Promise<void>(() => { /* Released by destruction of this browsing context, never by a focus change. */ });
      });
    });
    if (!claimed) throw new Error("Ya hay otra ventana de Factu Rápido abierta. Continúa allí o ciérrala antes de abrir esta.");
  }
  render();
  auth.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") { notice = "La sesión ha terminado. Tu documento sigue guardado en este dispositivo."; loginScreen(notice); }
  });
}
async function startAccess() {
  if (accessBusy) return;
  accessBusy = true;
  const retryButton = root.querySelector<HTMLButtonElement>('[data-action="retry-access"]');
  if (retryButton) retryButton.disabled = true;
  try { await initialize(); }
  catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo preparar tu acceso.";
    // A temporary device lease, connection error or another open quick window
    // is not a request for another Google session. Keep the verified session.
    if (error instanceof ApiError && (error.status === 401 || error.code === "PILOT_ONLY")) loginScreen(message);
    else root.innerHTML = quickAccessScreen(message,"retry");
  } finally { accessBusy = false; }
}
mountQuickInstall(document.querySelector<HTMLElement>("#quick-install")!);
if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/rapido/sw.js",{scope:"/rapido/"}).catch(() => undefined);
void startAccess();
