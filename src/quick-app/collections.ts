import type { QuickCollection, QuickCollectionIntent, QuickCollectionInvoice } from "@/lib/quick-invoicing/collections-model";
import { parseQuickCollection } from "@/lib/quick-invoicing/collections-model";
import { stripeCheckoutUrl } from "@/lib/quick-invoicing/payments-model";
import type { QuickReceipt } from "@/lib/quick-invoicing/model";
import type { QuickLocalState } from "./storage";
import { quickCardPaymentPanel } from "./payments";
import { escapeHtml as escape } from "./html";

interface Options {
  api<T>(action: string, body?: unknown): Promise<T>;
  active(): boolean;
  render(): void;
  local(): QuickLocalState;
  persist(): Promise<void>;
  invoice(collection: QuickCollection, receipt: QuickReceipt | null): Promise<void>;
  home(): void;
}
const money = (amount: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount / 100);
const status = (row: QuickCollection) => row.payment?.status === "paid" ? row.payment.testMode ? "Prueba confirmada" : "Cobrado"
  : row.payment?.status === "review" ? "En revisión" : "Pendiente de pago";

export function createQuickCollections(options: Options) {
  let rows: QuickCollection[] = [], next: string | undefined, selected: QuickCollection | undefined;
  let mode: "list" | "new" | "detail" = "list", busy = false, message = "", qr: string | undefined, serial = 0;
  let invoiceQuery = "", invoices: QuickCollectionInvoice[] = [], searched = false;
  let draft = options.local().collectionPending ?? options.local().collectionDraft ?? { id: crypto.randomUUID(), amount: 0, description: "", customerName: "" };
  const render = () => { if (options.active()) options.render(); };
  const button = (action: string, text: string, primary = false, id?: string) => `<button class="${primary ? "primary" : "secondary"}" data-collection-action="${action}" ${id ? `data-id="${escape(id)}"` : ""} ${busy ? "disabled" : ""}>${text}</button>`;
  async function run(work: (current: () => boolean) => Promise<void>) {
    if (busy) return;
    const attempt = ++serial, current = () => options.active() && attempt === serial;
    busy = true; message = ""; render();
    try { await work(current); }
    catch (error) { if (current()) message = error instanceof Error ? error.message : "No se pudo confirmar el cobro."; }
    finally { if (attempt === serial) { busy = false; render(); } }
  }
  async function show(collection: QuickCollection, current: () => boolean) {
    if (!current()) return;
    selected = collection; mode = "detail"; qr = undefined;
    const url = stripeCheckoutUrl(collection.payment?.url);
    if (url && collection.payment?.status === "open") {
      const { default: code } = await import("qrcode");
      const image = await code.toDataURL(url, { width: 256, margin: 4, errorCorrectionLevel: "M" });
      if (current()) qr = image;
    }
  }
  async function load(more = false) {
    await run(async current => {
      const result = await options.api<{ collections: QuickCollection[]; next?: string }>(`collection${more && next ? `?before=${encodeURIComponent(next)}` : ""}`);
      if (!current()) return;
      rows = more ? [...rows, ...result.collections] : result.collections; next = result.next; mode = "list";
    });
  }
  function html() {
    const pending = options.local().collectionPending;
    return `<section id="quick-collections"><div class="form-title"><h1>${mode === "new" ? "Nuevo cobro" : mode === "detail" ? "Cobro" : "Cobrar"}</h1></div>
      ${message ? `<p role="status" class="notice">${escape(message)}</p>` : ""}
      ${mode === "list" ? `<p class="hint">Cobra ahora con enlace o QR y prepara la factura después. Cada cobro queda guardado aquí.</p>
        ${button("new", "Nuevo cobro", true)}${pending ? button("recover", "Recuperar cobro pendiente de confirmar") : ""}
        <h2>Cobros guardados</h2>${busy ? '<p role="status">Cargando…</p>' : !rows.length ? '<p>Todavía no hay cobros guardados.</p>' : ""}
        <div class="collection-list">${rows.map(row => `<button class="collection-item" data-collection-action="open" data-id="${escape(row.id)}" ${busy ? "disabled" : ""}><strong>${money(row.amount)} · ${escape(row.description)}</strong><span>${escape(row.customerName || "Sin cliente indicado")}</span><small>${status(row)} · ${row.invoiceLinked ? "Factura vinculada" : "Pendiente de factura"}</small></button>`).join("")}</div>
        ${next ? button("more", "Cargar más cobros") : ""}${button("refresh", "Actualizar lista")}` : mode === "new" ? `
        <p class="hint">Indica el total que debe pagar el cliente. Puedes hacer la factura después en Factu.</p>
        <fieldset class="collection-form" ${busy || pending ? "disabled" : ""}>
          <label>Importe total (IVA incluido)<input id="collection-amount" type="number" inputmode="decimal" min="0.50" max="999999.99" step="0.01" value="${draft.amount ? escape((draft.amount / 100).toFixed(2)) : ""}"></label>
          <label>Concepto<input id="collection-description" maxlength="500" value="${escape(draft.description)}" placeholder="Ej. Reparación de persiana"></label>
          <label>Cliente (opcional)<input id="collection-customer" maxlength="200" value="${escape(draft.customerName)}"></label>
        </fieldset>${button("save", pending ? "Comprobar y recuperar cobro" : "Guardar y preparar enlace o QR", true)}` : selected ? `
        <div class="collection-summary"><strong>${money(selected.amount)}</strong><h2>${escape(selected.description)}</h2><p>${escape(selected.customerName)}</p>
          <p>${selected.invoiceLinked ? `Factura ${escape(selected.invoiceNumber || "")} vinculada a este cobro.` : "Sin factura vinculada. Puedes hacerla después en Factu. Este cobro no es una factura."}</p></div>
        ${quickCardPaymentPanel(selected.payment, busy, qr, !selected.invoiceLinked)}
        ${selected.invoiceLinked && selected.invoiceUrl ? `<a class="secondary collection-invoice-link" href="${escape(selected.invoiceUrl)}" target="_blank" rel="noopener">Abrir factura en Factu ↗</a>`
          : selected.invoiceOperationId ? button("invoice", "Continuar o recuperar factura") : `
          <section class="collection-link"><h2>Vincular factura de Factu</h2><p class="hint">Cuando la tengas hecha en Factu, búscala aquí. Si este cobro ya está confirmado, la factura aparecerá cobrada en Factu; si todavía no, seguirá pendiente.</p>
          <label>Número de factura<input id="collection-invoice-search" maxlength="100" value="${escape(invoiceQuery)}" placeholder="Ej. F-2026-0123"></label>
          ${button("invoice-search", "Buscar factura")}
          ${searched && !invoices.length ? '<p>No se encontraron facturas pendientes con ese número.</p>' : ""}
          ${invoices.map((invoice, index) => `<div class="collection-candidate"><strong>${escape(invoice.number)} · ${money(invoice.amount)}</strong><p>${escape(invoice.customerName)}</p>${invoice.amount === selected!.amount ? `<button class="secondary" data-collection-action="invoice-link" data-index="${index}" ${busy ? "disabled" : ""}>Vincular ${escape(invoice.number)}</button>` : '<p class="hint">El importe no coincide con este cobro.</p>'}</div>`).join("")}</section>
          <details><summary>También puedes hacer la factura aquí</summary>${button("invoice", "Preparar factura en Fast")}</details>`}
        ${button("list", "Volver a cobros")}` : ""}
      ${button("home", "Inicio")}</section>`;
  }
  function mount(root: HTMLElement) {
    const host = root.querySelector<HTMLElement>("#quick-collections");
    if (!host) return;
    host.addEventListener("input", event => {
      const input = event.target as HTMLInputElement;
      if (input.id === "collection-invoice-search") { invoiceQuery = input.value; return; }
      if (busy || options.local().collectionPending) return;
      if (input.id === "collection-amount") draft.amount = Math.round(Number(input.value) * 100);
      else if (input.id === "collection-description") draft.description = input.value;
      else if (input.id === "collection-customer") draft.customerName = input.value;
      else return;
      options.local().collectionDraft = structuredClone(draft);
      void options.persist().catch(error => { message = error.message; render(); });
    });
    host.addEventListener("click", event => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
      if (!target || target.disabled) return;
      const action = target.dataset.collectionAction ?? target.dataset.action;
      if (action === "home") { options.home(); return; }
      if (action === "new" || action === "recover") {
        if (options.local().collectionPending) draft = options.local().collectionPending!;
        else if (mode !== "new") draft = options.local().collectionDraft ?? { id: crypto.randomUUID(), amount: 0, description: "", customerName: "" };
        mode = "new"; message = ""; render(); return;
      }
      if (action === "refresh" || action === "list" || action === "more") { void load(action === "more"); return; }
      void run(async current => {
        if (action === "save") {
          const intent: QuickCollectionIntent = options.local().collectionPending ?? parseQuickCollection(draft);
          options.local().collectionPending = structuredClone(intent); await options.persist();
          if (!current()) return;
          const saved = await options.api<{ collection: QuickCollection }>("collection", { action: "create", ...intent });
          if (!current()) return;
          delete options.local().collectionPending; delete options.local().collectionDraft; await options.persist();
          await show(saved.collection, current); render();
          const prepared = await options.api<{ collection: QuickCollection }>("collection", { action: "prepare", id: intent.id });
          await show(prepared.collection, current);
        } else if (action === "open") {
          invoices = []; invoiceQuery = ""; searched = false;
          const result = await options.api<{ collection: QuickCollection }>(`collection?id=${encodeURIComponent(target.dataset.id!)}`);
          await show(result.collection, current);
        } else if ((action === "payment-create" || action === "payment-check") && selected) {
          const id = selected.id;
          const result = action === "payment-create" ? await options.api<{ collection: QuickCollection }>("collection", { action: "prepare", id })
            : await options.api<{ collection: QuickCollection }>(`collection?id=${encodeURIComponent(id)}`);
          await show(result.collection, current);
        } else if ((action === "payment-copy" || action === "payment-share") && selected?.payment?.status === "open") {
          const url = stripeCheckoutUrl(selected.payment.url); if (!url) return;
          if (action === "payment-share" && navigator.share) {
            try { await navigator.share({ title: selected.description, url }); }
            catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) throw error; }
          } else if (navigator.clipboard) { await navigator.clipboard.writeText(url); message = "Enlace de pago copiado."; }
          else { const input = document.querySelector<HTMLInputElement>("#card-payment-url"); input?.focus(); input?.select(); }
        } else if (action === "invoice" && selected) {
          const result = await options.api<{ collection: QuickCollection; receipt: QuickReceipt | null }>("collection", { action: "invoice", id: selected.id });
          if (current()) await options.invoice(result.collection, result.receipt);
        } else if (action === "invoice-search") {
          if (!invoiceQuery.trim()) throw new Error("Escribe el número de la factura de Factu.");
          const result = await options.api<{ invoices: QuickCollectionInvoice[] }>(`collection?action=invoices&q=${encodeURIComponent(invoiceQuery.trim())}`);
          if (current()) { invoices = result.invoices; searched = true; }
        } else if (action === "invoice-link" && selected) {
          const invoice = invoices[Number(target.dataset.index)];
          if (!invoice || invoice.amount !== selected.amount) return;
          const result = await options.api<{ collection: QuickCollection }>("collection", { action: "link", id: selected.id, invoiceId: invoice.id, version: invoice.version });
          await show(result.collection, current);
        }
      });
    });
  }
  return { html, mount, open: load };
}
