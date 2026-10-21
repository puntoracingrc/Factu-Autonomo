import { escapeHtml } from "./html";

export interface QuickInstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function quickInstallUrl(origin: string): string {
  const mainHosts = new Set([
    "facturacion-autonomos.app",
    "factu-autonomo.vercel.app",
    "factu-autonomo-persianas-almar-web-s-projects.vercel.app",
    "factu-autonomo-git-main-persianas-almar-web-s-projects.vercel.app",
  ]);
  const target = mainHosts.has(new URL(origin).hostname)
    ? "https://fast.facturacion-autonomos.app"
    : origin;
  return new URL("/rapido/index.html", target).href;
}

export function quickInstaller(changed: () => void) {
  let deferred: QuickInstallPrompt | undefined;
  let busy = false;
  let requested = false;
  let help = false;
  return {
    snapshot: () => ({ busy, requested, help }),
    offer(event: QuickInstallPrompt) {
      event.preventDefault();
      if (!requested) deferred = event;
    },
    requested() { requested = true; deferred = undefined; changed(); },
    closeHelp() { help = false; changed(); },
    async install() {
      if (busy || requested) return;
      const prompt = deferred;
      deferred = undefined; // The browser permits each prompt to be used once.
      if (!prompt) { help = !help; changed(); return; }
      busy = true; help = false; changed();
      try {
        // No await before prompt(): preserve the button's user activation.
        await prompt.prompt();
        if ((await prompt.userChoice).outcome === "accepted") requested = true;
      } catch { help = true; }
      finally { busy = false; changed(); }
    },
  };
}

export function mountQuickInstall(host: HTMLElement) {
  // Never copy OAuth fragments, document identifiers, or the current query.
  const url = quickInstallUrl(location.origin);
  const separateOrigin = new URL(url).origin !== location.origin;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  host.innerHTML = `<button type="button" class="quick-install-button" aria-controls="quick-install-help" aria-expanded="false"><span aria-hidden="true">↓</span><span class="quick-install-label">Instalar en el móvil</span></button>
    <section id="quick-install-help" class="quick-install-help" aria-label="Cómo instalar Factu Rápido" hidden>
      <h2>Poner el icono de Factu Rápido</h2>
      ${separateOrigin ? `<p>Abre la dirección propia de Factu Rápido para instalarla por separado.</p><a class="quick-install-open" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Abrir para instalar</a>` : ""}
      <p>${ios ? "En Safari, toca Compartir → Añadir a la pantalla de inicio." : "En Android, abre este enlace en Chrome y toca ⋮ → Añadir a pantalla de inicio → Instalar."}</p>
      <p>Si no ves el menú del navegador, copia el enlace y ábrelo en ${ios ? "Safari" : "Chrome"}. Si ya tienes el icono de Factu Rápido, no necesitas instalarlo otra vez.</p>
      <label>Enlace de Factu Rápido<input class="quick-install-url" readonly value="${escapeHtml(url)}"></label>
      <div class="quick-install-actions"><button type="button" class="quick-install-copy">Copiar enlace</button><button type="button" class="quick-install-close">Cerrar</button></div>
      <p class="quick-install-status" role="status"></p>
    </section>`;
  const button = host.querySelector<HTMLButtonElement>(".quick-install-button")!;
  const label = host.querySelector<HTMLElement>(".quick-install-label")!;
  const help = host.querySelector<HTMLElement>(".quick-install-help")!;
  const status = host.querySelector<HTMLElement>(".quick-install-status")!;
  const installer = quickInstaller(() => {
    const state = installer.snapshot();
    host.hidden = state.requested;
    button.disabled = state.busy;
    button.setAttribute("aria-expanded", String(state.help));
    label.textContent = state.busy ? "Abriendo instalación…" : "Instalar en el móvil";
    help.hidden = !state.help;
  });
  button.addEventListener("click", () => { void installer.install(); });
  host.querySelector(".quick-install-close")!.addEventListener("click", () => {
    installer.closeHelp(); button.focus();
  });
  host.querySelector(".quick-install-copy")!.addEventListener("click", () => {
    void (async () => {
      try { await navigator.clipboard.writeText(url); status.textContent = "Enlace copiado."; }
      catch { status.textContent = "Selecciona el enlace para copiarlo."; }
    })();
  });
  window.addEventListener("beforeinstallprompt", event => {
    // The main app already encloses /rapido/. Never offer its installation
    // as if it were the independent quick app; leave the current editor intact.
    if (separateOrigin) event.preventDefault();
    else installer.offer(event as QuickInstallPrompt);
  });
  window.addEventListener("appinstalled", () => {
    if (!separateOrigin) installer.requested();
  });
  // Standalone mode alone is not proof this particular PWA is installed:
  // Android may have opened /rapido/ inside the main Factu app's window.
  // Keep manual installation help available in that case too.
}
