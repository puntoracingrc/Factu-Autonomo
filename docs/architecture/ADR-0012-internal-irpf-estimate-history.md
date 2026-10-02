# ADR-0012: historial interno de porcentajes para la estimación de IRPF

- Estado: aceptado
- Versión: 1
- Fecha: 2026-10-02
- Responsables: Producto e Integridad fiscal

## Contexto

El porcentaje configurable de IRPF es una estimación orientativa sobre el
resultado, no una retención incluida en una factura. Aplicar siempre el valor
vigente del perfil hacía que un cambio futuro recalculase periodos anteriores.
Guardar ese dato dentro de la factura también confundiría una preferencia
interna con el contenido fiscal y documental emitido.

## Decisión

Cada empresa conserva en su perfil una cronología interna V1. El porcentaje
vigente antes del primer cambio se guarda como `baselinePercent`; cada cambio
posterior añade el nuevo porcentaje y su instante de entrada en vigor. La
factura, el recibo o el gasto solo aportan su referencia temporal al cálculo:
no reciben campos nuevos ni se reescriben.

Para documentos emitidos por Factu se usa `issuedAt` y, si falta, `createdAt`.
Para históricos importados se usa su fecha fiscal porque su instante de alta no
representa la operación original. Los gastos manuales usan `createdAt` y los
importados su fecha fiscal. Los informes agrupan bases de ventas y gastos por
porcentaje interno y calculan cada tramo por separado.

La primera vez que se cambia el porcentaje, el valor que ya tenía esa empresa
se convierte en su baseline. Por tanto, una empresa existente al 20 % conserva
20 % para sus movimientos anteriores, mientras otra empresa que empezó al 15 %
conserva 15 % para los suyos. El aislamiento existente por empresa del perfil
impide compartir la cronología.

## Invariantes

- La cronología nunca forma parte de `Document`, `DocumentSnapshot`, PDF,
  importes, QR, registro Veri*Factu ni contenido visible al cliente.
- Guardar otros ajustes no crea cambios de IRPF.
- Cambiar el porcentaje añade un tramo; nunca modifica ni elimina los previos.
- Un perfil legacy sin cronología usa su porcentaje actual como baseline hasta
  el primer cambio, sin mutar documentos al cargar.
- La cronología se normaliza y sincroniza dentro del perfil de esa empresa por
  la autoridad central ya existente. Los conflictos mantienen el control de
  versión del perfil y no se resuelven por sobrescritura silenciosa.
- Un informe con varios tramos los muestra explícitamente; no presenta un único
  porcentaje como si fuera aplicable a todo el periodo.

## Consecuencias

El historial ocupa solo unos pocos cambios por empresa y no crea una fila por
factura. Los informes ya necesitan recorrer los movimientos para sumar bases;
resolver un tramo de una cronología pequeña no añade una consulta remota ni
modifica la evidencia histórica.

## Regresiones obligatorias

- `src/lib/irpf-estimate-policy.test.ts`
- `src/lib/irpf-estimate-storage.test.ts`
- `src/lib/taxes.test.ts`
- `src/lib/central-business-authority/settings-profile-wiring.test.ts`
- `src/lib/central-business-authority/expense-profile-mutation-canary.test.ts`
- `src/lib/protected-system-invariants-contract.test.ts`

