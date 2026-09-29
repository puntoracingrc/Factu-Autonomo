"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Copy,
  MailPlus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useCompany } from "@/context/CompanyContext";
import {
  fetchCompanyAccess,
  inviteAdmin,
  revokeCompanyAccess,
} from "@/lib/companies/client";
import { buildSafeCompanyCopyProfile } from "@/lib/companies/safe-company-copy";
import type { AppCompanyAccessOverview } from "@/lib/companies/types";

export function CompanyManagementCard() {
  const { data } = useAppStore();
  const { activeCompany, companies, createCompany, renameCompany } =
    useCompany();
  const [access, setAccess] = useState<AppCompanyAccessOverview | null>(null);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [copyReusableData, setCopyReusableData] = useState(true);
  const [companyName, setCompanyName] = useState(activeCompany?.name ?? "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadAccess = useCallback(async () => {
    if (!activeCompany) {
      setAccess(null);
      return;
    }
    setBusy("access");
    try {
      setAccess(await fetchCompanyAccess(activeCompany.id));
      setMessage(null);
    } catch {
      setMessage("No se pudieron cargar los accesos de esta empresa.");
    } finally {
      setBusy(null);
    }
  }, [activeCompany]);

  useEffect(() => {
    setCompanyName(activeCompany?.name ?? "");
    void loadAccess();
  }, [activeCompany, loadAccess]);

  const company = activeCompany;
  if (!company) return null;
  const companyId = company.id;
  const currentCompanyName = company.name;
  const companyRole = company.role;

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const name = newCompanyName.replace(/\s+/g, " ").trim();
    if (!name) return;
    setBusy("create");
    setMessage(null);
    try {
      const result = await createCompany(
        name,
        copyReusableData
          ? {
              sourceCompanyId: companyId,
              sourceProfile:
                buildSafeCompanyCopyProfile(data.profile) ?? undefined,
            }
          : undefined,
      );
      setNewCompanyName("");
      if (result.copied) {
        const copied = result.copied;
        setMessage(
          `Empresa «${name}» creada con ${copied.customers} clientes, ${copied.suppliers} proveedores y ${copied.products} productos. Puedes abrirla desde el selector de empresas.`,
        );
      } else {
        setMessage(
          `Empresa «${name}» creada vacía. Puedes abrirla desde el selector de empresas.`,
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "No se pudo crear la empresa.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleRename(event: React.FormEvent) {
    event.preventDefault();
    const name = companyName.replace(/\s+/g, " ").trim();
    if (!name || name === currentCompanyName) return;
    setBusy("rename");
    setMessage(null);
    try {
      await renameCompany(companyId, name);
      setMessage("Nombre de empresa actualizado.");
    } catch {
      setMessage("No se pudo cambiar el nombre de la empresa.");
    } finally {
      setBusy(null);
    }
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setBusy("invite");
    setMessage(null);
    try {
      await inviteAdmin(companyId, email);
      setInviteEmail("");
      await loadAccess();
      setMessage(
        `Acceso preparado para ${email}. Debe entrar en Factu con esa misma cuenta de Google.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "No se pudo preparar la invitación.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function revoke(kind: "invitation" | "member", id: string) {
    if (!window.confirm("¿Retirar este acceso a la empresa?")) return;
    setBusy(`${kind}:${id}`);
    setMessage(null);
    try {
      await revokeCompanyAccess(companyId, kind, id);
      await loadAccess();
      setMessage("Acceso retirado.");
    } catch {
      setMessage("No se pudo retirar el acceso.");
    } finally {
      setBusy(null);
    }
  }

  const pendingInvitations =
    access?.invitations.filter(
      (invitation) => invitation.status === "pending",
    ) ?? [];

  return (
    <Card className="mb-6 space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Building2 className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-black text-slate-950">
            Empresas y accesos
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Tu cuenta puede abrir varias empresas independientes. Cada una
            conserva sus propios clientes, documentos, numeración y ajustes
            fiscales.
          </p>
        </div>
      </div>

      {message ? (
        <p
          role="status"
          className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900"
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <form
          onSubmit={handleRename}
          className="rounded-xl border border-slate-200 p-4"
        >
          <label
            htmlFor="company-current-name"
            className="text-sm font-bold text-slate-900"
          >
            Empresa abierta
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="company-current-name"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              maxLength={120}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm"
            />
            <button
              type="submit"
              disabled={
                busy !== null ||
                !companyName.trim() ||
                companyName.trim() === currentCompanyName
              }
              className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-40"
            >
              Guardar
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Tu acceso:{" "}
            {companyRole === "owner" ? "propietario" : "administrador total"}.
          </p>
        </form>

        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-slate-200 p-4"
        >
          <label
            htmlFor="new-company-name"
            className="text-sm font-bold text-slate-900"
          >
            Crear otra empresa
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="new-company-name"
              value={newCompanyName}
              onChange={(event) => setNewCompanyName(event.target.value)}
              placeholder="Nombre de la nueva empresa"
              maxLength={120}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm"
            />
            <button
              type="submit"
              disabled={busy !== null || !newCompanyName.trim()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Crear
            </button>
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">
            <input
              type="checkbox"
              checked={copyReusableData}
              onChange={(event) => setCopyReusableData(event.target.checked)}
              disabled={busy !== null}
              className="mt-0.5 h-4 w-4 rounded border-emerald-300"
            />
            <span>
              <span className="flex items-center gap-2 font-bold">
                <Copy className="h-4 w-4" />
                Empezar con los datos útiles de «{currentCompanyName}»
              </span>
              <span className="mt-1 block text-xs leading-5 text-emerald-800">
                Copia clientes, proveedores, productos, logo, contacto,
                plantillas y preferencias. No copia facturas, presupuestos,
                recibos, gastos, avisos, NIF, dirección fiscal, impuestos,
                series, numeración ni Veri*Factu.
              </span>
            </span>
          </label>
          <p className="mt-2 text-xs text-slate-500">
            Actualmente puedes abrir {companies.length}{" "}
            {companies.length === 1 ? "empresa" : "empresas"}.
          </p>
        </form>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-black text-slate-950">
              Administradores con acceso total
            </h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Añade el correo exacto de su cuenta de Google. El acceso se activa
              automáticamente cuando esa persona inicia sesión con ese correo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAccess()}
            disabled={busy !== null}
            aria-label="Actualizar accesos"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            <RefreshCw
              className={`h-4 w-4 ${busy === "access" ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <form
          onSubmit={handleInvite}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="socio@gmail.com"
            autoComplete="email"
            required
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm"
          />
          <button
            type="submit"
            disabled={busy !== null || !inviteEmail.trim()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-40"
          >
            <MailPlus className="h-4 w-4" />
            Dar acceso total
          </button>
        </form>

        <div className="mt-5 space-y-2">
          {access?.members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {member.email}
                </p>
                <p className="text-xs text-slate-500">
                  {member.role === "owner"
                    ? "Propietario"
                    : "Administrador total"}
                </p>
              </div>
              {member.role === "admin" ? (
                <button
                  type="button"
                  onClick={() => void revoke("member", member.userId)}
                  disabled={busy !== null}
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Retirar
                </button>
              ) : (
                <ShieldCheck
                  className="h-5 w-5 text-emerald-600"
                  aria-label="Propietario"
                />
              )}
            </div>
          ))}
          {pendingInvitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {invitation.email}
                </p>
                <p className="text-xs text-amber-800">
                  Pendiente de iniciar sesión con Google
                </p>
              </div>
              <button
                type="button"
                onClick={() => void revoke("invitation", invitation.id)}
                disabled={busy !== null}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                Cancelar
              </button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
