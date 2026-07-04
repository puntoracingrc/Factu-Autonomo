# Auditoria de costes operativos e IA

Fecha: 2026-07-04

## Resumen ejecutivo

El gasto actual de Factu no es preocupante todavia. La captura de OpenAI muestra 0,61 USD en 360 peticiones desde el 19/06/2026 al 04/07/2026: una media aproximada de 0,0017 USD por peticion. El problema no es el gasto actual, sino que hoy no queda trazado por funcion: no sabemos cuanto cuesta exactamente cada escaneo, cada autorrelleno, cada correccion o cada factura recibida por email.

El CSV de Vercel tampoco dice que Factu cueste 45 USD: en el periodo 2026-06-15 a 2026-07-14, `factu-autonomo` suma 0,127235 USD de consumo variable. El grueso del CSV corresponde a otros proyectos o a coste de equipo sin asignar.

Decision recomendada:

- Mantener Pro actual, pero medir coste real por usuario y por funcion antes de aumentar cupos.
- Separar mental y tecnicamente "escaneos de documentos" de "usos pequenos de IA" y "direcciones Google".
- Anadir un plan superior tipo Pro IA/Taller para usuarios intensivos.
- Registrar coste real de OpenAI por endpoint antes de tocar precios definitivos.

## Datos observados

### OpenAI

Captura del panel:

- Gasto total: 0,61 USD.
- Periodo: 2026-06-19 a 2026-07-04.
- Julio: 0,35 USD de 100 USD de limite.
- Peticiones: 360.
- Tokens: 1.320.345.
- Media simple: 0,0017 USD por peticion.

Lectura: ahora mismo el uso real es bajo. Aun asi, una media global mezcla tareas baratas con tareas pesadas. Una factura PDF grande con vision puede costar bastante mas que un autorrelleno de cliente desde texto.

### Vercel

CSV `/Users/macbookpro14/Desktop/vercel-costs.csv`, periodo 2026-06-15 a 2026-07-14:

| Proyecto | Coste USD |
|---|---:|
| regionatlas | 23,001216 |
| sin asignar/equipo | 21,473902 |
| pal-es-market | 0,919970 |
| factu-autonomo | 0,127235 |
| puntoracing-web | 0,055193 |
| persianas-almar | 0,045038 |

Desglose de `factu-autonomo`:

| Concepto | Coste USD |
|---|---:|
| Observability Events | 0,064374 |
| Build CPU Minutes | 0,020920 |
| Fluid Active CPU | 0,014438 |
| Fluid Provisioned Memory | 0,014343 |
| Fast Origin Transfer | 0,004842 |
| ISR Reads | 0,004370 |
| Function Invocations | 0,003112 |
| Otros menores | 0,000836 |

Lectura: Vercel no es el riesgo variable inmediato de Factu. El fijo de Vercel Pro si debe repartirse como coste de plataforma, pero el consumo propio de Factu hoy es casi cero.

## Limites actuales de la app

En `origin/main`:

- Pro incluye 30 escaneos de gastos al mes.
- Gratis incluye 2 escaneos de prueba.
- 1 escaneo de documento = 10 unidades IA internas.
- Rellenar cliente con IA consume 1 unidad.
- Revisar importacion con IA consume 1 unidad.
- Pack extra: 10 escaneos por 1,99 EUR + IVA.
- Buzon inteligente: procesa hasta 10 adjuntos por email.

Esto explica por que el porcentaje de IA baja rapido: un adjunto recibido por el buzon consume como escaneo completo, no como uso pequeno.

## Estimacion OpenAI por funcion

Precios oficiales consultados:

- GPT-4o: 2,50 USD / 1M tokens de entrada y 10,00 USD / 1M tokens de salida.
- GPT-4o mini: 0,15 USD / 1M tokens de entrada y 0,60 USD / 1M tokens de salida.

### Escaneo de gasto con GPT-4o

| Caso | Tokens entrada | Tokens salida | Coste estimado |
|---|---:|---:|---:|
| Ligero | 3.000 | 800 | 0,0155 USD |
| Normal | 8.000 | 1.200 | 0,0320 USD |
| Pesado | 25.000 | 1.800 | 0,0805 USD |

30 escaneos/mes:

- Ligero: 0,47 USD.
- Normal: 0,96 USD.
- Pesado: 2,42 USD.

### Escaneo de gasto con GPT-4o mini

| Caso | Tokens entrada | Tokens salida | Coste estimado |
|---|---:|---:|---:|
| Ligero | 3.000 | 800 | 0,00093 USD |
| Normal | 8.000 | 1.200 | 0,00192 USD |
| Pesado | 25.000 | 1.800 | 0,00483 USD |

30 escaneos/mes:

- Ligero: 0,028 USD.
- Normal: 0,058 USD.
- Pesado: 0,145 USD.

Lectura: si la calidad lo permite, mover escaneos simples a mini cambia totalmente el margen. No conviene cambiarlo a ciegas: hay que probarlo con PDFs reales de persianas, gastos fijos, tickets y facturas con muchas lineas.

### Autorrelleno de cliente

Ejemplo: 1.500 tokens de entrada + 400 de salida.

| Modelo | Coste estimado |
|---|---:|
| GPT-4o | 0,00775 USD |
| GPT-4o mini | 0,000465 USD |

Decision recomendada: el autorrelleno de texto deberia ir siempre con modelo barato, salvo casos excepcionales.

## Google Places

Google Places no deberia mezclarse con la bolsa de IA. Segun la tarifa oficial, Autocomplete Requests incluye 10.000 usos gratis al mes y despues cuesta 2,83 USD por 1.000. Geocoding y Place Details Essentials tienen tambien tramo gratuito de 10.000 al mes y despues 5,00 USD por 1.000.

Decision recomendada:

- Mantener Google Places solo en Pro.
- Cobrar internamente como "direccion aplicada", no como IA.
- Asegurar uso de session tokens y campos minimos.
- Mostrarlo como ventaja Pro, no como escaneo IA.

## Resend

Resend cuenta emails enviados y recibidos. Plan gratis: 3.000 emails/mes y limite diario de 100. Plan Pro: 20 USD/mes con 50.000 emails/mes y 0,90 USD por 1.000 extra.

Impacto del buzon inteligente:

- 1 factura reenviada al buzon = 1 email recibido.
- Si reenviamos copia al usuario = +1 email enviado.
- El coste importante no es el email: es la IA de cada adjunto procesado.

Decision recomendada:

- Mantener aviso de "usa este correo solo para facturas/tickets".
- Mantener maximo 10 adjuntos por email.
- Guardar historico de aliases usados para no reutilizarlos.
- No activar reenvio automatico de copia por defecto; que sea una opcion Pro.

## Stripe

Stripe en Espana cobra, para tarjetas estandar del EEE, 1,5% + 0,25 EUR por transaccion. En un pago mensual de 5,99 EUR + IVA, el fijo de 0,25 EUR pesa bastante. El plan anual mejora margen porque el fijo se paga una vez al ano.

Decision recomendada:

- Empujar plan anual.
- Mantener packs extra, pero revisar precio si el escaneo sigue en GPT-4o.
- Para usuarios intensivos, mejor plan superior que muchos micropagos.

## GitHub

La captura indica 6,72 USD de uso medido, pero cubierto por uso incluido/descuentos. GitHub Actions muestra 21 minutos usados de 2.000 incluidos. No parece coste real inmediato.

Decision recomendada: monitorizar si se activan workflows pesados, pero hoy no es un foco.

## Supabase e IONOS

Supabase: revisar factura real del proyecto. El plan Free oficial incluye API ilimitada y limites de base de datos/egress/almacenamiento, pero produccion puede necesitar Pro por backups, estabilidad y margen operativo.

IONOS: coste fijo anual de dominio/DNS/correo. Debe dividirse entre 12 y meterse como coste fijo de plataforma, aunque sea pequeno.

## Propuesta de planes

### Gratis

- Documentos limitados.
- 2 escaneos de prueba.
- Sin buzon inteligente.
- Sin Google Places o muy limitado.

### Pro actual

Precio actual: 5,99 EUR/mes + IVA o 49 EUR/ano + IVA.

Mantener:

- 30 escaneos/mes.
- Autorrelleno IA de clientes.
- Google Places.
- Buzon inteligente con limites.

Condicion: medir coste real por usuario. Si un usuario agota 30 escaneos pesados en GPT-4o, puede costar hasta ~2,42 USD solo en OpenAI, antes de Stripe y soporte. Sigue pudiendo salir, pero el margen se estrecha.

### Pro IA / Taller

Precio orientativo: 11,99-14,99 EUR/mes + IVA.

Incluir:

- 120-150 escaneos/mes.
- Buzon inteligente completo.
- Correcciones/aprendizaje por usuario.
- Procesado por lotes.
- Mejor soporte.

Este plan protege margen y evita que un usuario muy intensivo consuma demasiado dentro del Pro barato.

### Packs extra

Actual: 10 escaneos por 1,99 EUR + IVA.

Recomendacion:

- Si los escaneos van con modelo barato y medido: mantener 1,99 EUR.
- Si muchos escaneos siguen usando GPT-4o: subir a 2,99-3,99 EUR o crear pack de 50 escaneos.

## Cambios tecnicos recomendados

1. Crear registro interno de costes IA:
   - usuario
   - empresa
   - endpoint
   - modelo
   - input tokens
   - output tokens
   - coste estimado USD
   - tipo: `expense_scan`, `expense_inbox`, `customer_autofill`, `import_review`, `scan_correction`
   - origen: manual, buzon, importacion
   - tamano/paginas/mime del archivo

2. Crear panel admin de costes:
   - coste OpenAI por usuario/mes
   - escaneos por usuario/mes
   - coste medio por escaneo
   - ingresos Stripe netos aproximados
   - margen por usuario

3. Separar contadores en producto:
   - escaneos de documentos
   - usos pequenos de IA
   - direcciones Google
   - emails de buzon

4. Probar modelos:
   - Autorrelleno cliente: modelo barato por defecto.
   - Escaneo simple: probar modelo barato con PDFs reales.
   - Facturas complejas: mantener modelo fuerte si el barato falla.

5. Meter protecciones:
   - maximo adjuntos/email: 10.
   - maximo peso por archivo.
   - deduplicado por hash antes de consumir credito.
   - decision explicita del usuario para crear productos desde un gasto.

## Fuentes consultadas

- OpenAI GPT-4o: https://developers.openai.com/api/docs/models/gpt-4o
- OpenAI GPT-4o mini: https://developers.openai.com/api/docs/models/gpt-4o-mini
- Google Maps Platform pricing: https://developers.google.com/maps/billing-and-pricing/pricing
- Resend pricing: https://resend.com/docs/knowledge-base/what-is-resend-pricing
- Resend quotas: https://resend.com/docs/knowledge-base/account-quotas-and-limits
- Vercel pricing: https://vercel.com/docs/pricing
- Stripe Espana pricing: https://stripe.com/es/pricing
- GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- Supabase pricing: https://supabase.com/pricing
