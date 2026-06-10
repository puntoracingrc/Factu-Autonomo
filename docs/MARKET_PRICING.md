# Análisis de precios — mercado español (2026)

## Competidores consultados

| Producto | Plan gratis | Plan de pago (autónomo) | Qué incluye de más |
|----------|-------------|-------------------------|-------------------|
| **Contasimple** | 50 registros/año, 10 clientes | 12,95–17,95 €/mes | Modelos fiscales, Verifactu |
| **Quipu** | Prueba 15 días | ~16 €/mes (13 € anual) | Modelos 303/130, banca, OCR gastos |
| **Holded** | Prueba 14 días | ~7,50–15 €/mes promo | ERP, CRM, inventario |
| **FacturaDirecta / Anfix** | Limitado | 10–25 €/mes | Contabilidad completa |

Fuentes: declarando.es, guiafiscal.es, rankiabusiness.com (comparativas 2026).

## Mantenimiento de la comparativa en la app

Los datos que alimentan `/precios` viven en `src/lib/billing/competitor-pricing.ts`.

**Revisión trimestral (o al cambiar nuestro precio):**

1. Comprobar tarifas en las URLs de `COMPARABLE_COMPETITORS`.
2. Actualizar `referenceMonthlyEur`, promos y `PRICING_REVIEW.lastVerified`.
3. Ejecutar tests (`competitor-pricing.test.ts` falla si `lastVerified` > 90 días).
4. Actualizar esta tabla si cambia el posicionamiento.

Criterio de inclusión: facturación ligera para autónomos (facturas, presupuestos, gastos). Excluir ERP, banca, nóminas y contabilidad completa.

## Posicionamiento de Factura Autónomo

**Qué somos:** facturación sencilla (facturas, presupuestos, recibos, gastos, resumen fiscal).  
**Qué no somos:** banca, nóminas, modelos AEAT automáticos (303/130).
**Veri*Factu:** implementado (modo pruebas; certificado producción pendiente de configurar).

Por tanto el precio debe estar **por debajo** de Quipu/Contasimple ilimitado, pero con un **gratis útil** para captar usuarios.

## Precios elegidos

| Plan | Precio | Límites |
|------|--------|---------|
| **Gratis** | 0 € | 10 docs/mes, 15 clientes, local, resumen acumulado |
| **Pro mensual** | **5,99 €/mes** (+ IVA) | Ilimitado, nube, trimestral, CSV, logo |
| **Pro anual** | **49 €/año** (+ IVA) | ~32 % ahorro vs 12 meses |
| **Trial** | 14 días | Pro completo al crear cuenta |

### Por qué 5,99 €/mes

- Un 25–40 % más barato que Quipu (~16 €) y Contasimple ilimitado (~18 €).
- Competitivo con promos de Holded (~7,50 €) pero sin funciones que no ofrecemos.
- Psicológicamente por debajo de 6 € antes de IVA.
- Anual 49 € ≈ 4,08 €/mes efectivo — incentiva compromiso.

## Roadmap de precio

- **Verifactu obligatorio (2027):** subir Pro a 8,99–9,99 €/mes cuando esté certificado.
- **Plan Gestor:** 39–59 €/mes (fase posterior).
