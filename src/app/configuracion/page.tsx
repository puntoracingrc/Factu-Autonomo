"use client";

import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { useState, useEffect } from "react";

export default function ConfiguracionPage() {
  const { data, updateProfile } = useAppStore();
  const [form, setForm] = useState(data.profile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(data.profile);
  }, [data.profile]);

  function handleSave() {
    updateProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Tus datos aparecerán en facturas y recibos"
      />

      <Card className="mb-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre o razón social *">
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Ej: Juan Pérez Fontanería"
            />
          </Field>
          <Field label="NIF / CIF *">
            <Input
              value={form.nif}
              onChange={(e) => update("nif", e.target.value)}
              placeholder="12345678A"
            />
          </Field>
          <Field label="Teléfono">
            <Input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>
          <Field label="Dirección">
            <Input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </Field>
          <Field label="Código postal">
            <Input
              value={form.postalCode}
              onChange={(e) => update("postalCode", e.target.value)}
            />
          </Field>
          <Field label="Ciudad">
            <Input
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </Field>
          <Field label="IBAN" hint="Para que te paguen las facturas">
            <Input
              value={form.iban ?? ""}
              onChange={(e) => update("iban", e.target.value)}
              placeholder="ES00 0000 0000..."
            />
          </Field>
        </div>
        <Button fullWidth onClick={handleSave}>
          Guardar datos
        </Button>
        {saved && (
          <p className="text-center text-sm font-medium text-green-600">
            Datos guardados correctamente
          </p>
        )}
      </Card>

      <Card className="bg-slate-100">
        <h2 className="font-bold text-slate-900">Cómo usar la app</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>1. Rellena tus datos arriba (solo una vez).</li>
          <li>2. Crea facturas, presupuestos o recibos desde el inicio.</li>
          <li>3. Anota tus gastos en «Gastos».</li>
          <li>4. Pregunta al asistente si tienes dudas.</li>
          <li>5. En el móvil: menú del navegador → «Añadir a pantalla de inicio».</li>
        </ul>
      </Card>
    </div>
  );
}
