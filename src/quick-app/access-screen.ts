import { escapeHtml } from "./html";

export function quickAccessScreen(message: string, mode: "login" | "retry") {
  const action = mode === "login" ? "login" : "retry-access";
  const label = mode === "login" ? "Entrar con Google" : "Reintentar acceso";
  return `<main class="login"><div class="brand-mark">F<span>↗</span></div><h1>Factu Rápido</h1><p id="notice" role="status">${escapeHtml(message)}</p><button class="primary" data-action="${action}">${label}</button><p class="hint">Persianas Almar · Empresa antigua</p></main>`;
}
