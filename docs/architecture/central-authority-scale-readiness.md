# Preparacion de escala de la autoridad central

## Objetivo

Reducir consultas vacias sin perder recuperacion ante avisos Realtime perdidos y
ampliar la autoridad central a las cuentas con plan cloud despues de verificar
su bootstrap seguro.

## Plan de lectura

- Realtime despierta al dispositivo cuando existe un cambio.
- Con el canal suscrito queda un sondeo de seguridad cada 3 minutos, mas hasta
  15 segundos de dispersion por dispositivo.
- Si Realtime se degrada, el respaldo baja temporalmente a 30 segundos, tambien
  disperso.
- Inicio de sesion, foco, reconexion y `pageshow` siguen provocando una lectura
  inmediata.
- Cinco dispositivos degradados generan como maximo 100 peticiones por cuenta
  en 10 minutos antes de dispersion, por debajo de los limites actuales de 120
  para facturas y 180 para datos operativos.

## Modelo sintetico

`npm run test:central-sync-load` simula 10 minutos, una rampa de 120 segundos,
cinco dispositivos por cuenta y 0,1 cambios por dispositivo y minuto. No envia
trafico a produccion ni mide la capacidad real de Vercel o Supabase.

| Dispositivos | Modo | Media pulls/s | p95 pulls/s | Pico pulls/s | Maximo por cuenta/10 min |
| ---: | --- | ---: | ---: | ---: | ---: |
| 100 | Realtime | 1,13 | 5 | 16 | 42 |
| 100 | Respaldo | 2,52 | 5 | 8 | 79 |
| 500 | Realtime | 6,14 | 16 | 26 | 43 |
| 500 | Respaldo | 12,60 | 19 | 23 | 80 |
| 1.000 | Realtime | 12,27 | 25 | 51 | 44 |
| 1.000 | Respaldo | 25,20 | 36 | 44 | 82 |
| 5.000 | Realtime | 61,55 | 105 | 131 | 45 |
| 5.000 | Respaldo | 125,99 | 156 | 188 | 83 |

Estas cifras sirven para dimensionar demanda y rate limits. Cada escalon real
debe observar latencia p95, respuestas 429/5xx, conexiones PostgreSQL, entrega
Realtime y retraso del cursor antes de ampliar el siguiente.

Comprobacion operativa del 3 de agosto de 2026: el proyecto esta sano y la
organizacion usa Supabase Pro. La cuota publicada de Pro es 500 conexiones
Realtime simultaneas; Pro sin limite de gasto y Team publican 10.000. Antes de
probar 500 o mas dispositivos abiertos debe verificarse y, si corresponde,
elevar el limite especifico del proyecto. La simulacion de 1.000 y 5.000 no
autoriza por si sola esos escalones.

## Despliegue general

1. Mantener `CENTRAL_AUTHORITY_ROLLOUT_PERCENT=0` y su espejo publico al 0.
2. Incluir dos cuentas sinteticas en las listas privada y publica, asignarles
   plan cloud y comprobar todos los tipos operativos, facturas, rectificativas,
   recibos y aislamiento en dos dispositivos.
3. Eliminar las cuentas sinteticas y sus sesiones despues del readback.
4. Si toda la aceptacion es verde, configurar porcentaje 100 y elegibilidad
   `*` en servidor y navegador. Gratis continua local por la compuerta de plan.
5. Detener o revertir el rollout ante errores centrales, 429 sostenidos,
   cursores atrasados o latencia fuera del objetivo.

El interruptor privado `CENTRAL_AUTHORITY_KILL_SWITCH=true` pausa nuevas
escrituras sin desactivar lectura ni permitir fallback local. El valor publico
debe mantenerse alineado durante el despliegue, pero el servidor es siempre la
autoridad final.

## Altas implicitas

- El cliente escrito dentro de una factura o presupuesto usa la misma cola
  central durable que el alta desde Clientes.
- El proveedor detectado al escanear un gasto se confirma junto al gasto y, si
  existe, su recurrencia en un unico lote atomico.
- Altas, ediciones, borrados, escaneos, resumenes de proveedor y gastos
  recurrentes usan el mismo contrato central. Ninguna ocurrencia de gasto fijo
  conserva un atajo local para cuentas cloud seleccionadas.
