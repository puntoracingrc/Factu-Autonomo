# Preparacion de escala de la autoridad central

## Objetivo

Reducir consultas vacias sin perder recuperacion ante avisos Realtime perdidos y
ampliar la autoridad central solo a cuentas cuyo corte ya este preparado.

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

## Despliegue gradual

1. Mantener `CENTRAL_AUTHORITY_ROLLOUT_PERCENT=0` y su espejo publico al 0.
2. Incluir solo UUID con corte verificado en las listas privada y publica de
   elegibilidad.
3. Subir 1, 5, 10, 25, 50 y 100 por ciento dentro de esa lista, manteniendo las
   allowlists explicitas existentes y sin aproximarse a la cuota Realtime.
4. Detener el avance ante errores centrales, 429 sostenidos, cursores atrasados
   o latencia fuera del objetivo.
5. No usar `*` hasta que el alta de usuarios nuevos nazca central y el corte de
   cuentas antiguas este automatizado y verificado.

El interruptor privado `CENTRAL_AUTHORITY_KILL_SWITCH=true` pausa nuevas
escrituras sin desactivar lectura ni permitir fallback local. El valor publico
debe mantenerse alineado durante el despliegue, pero el servidor es siempre la
autoridad final.

## Altas implicitas

- El cliente escrito dentro de una factura o presupuesto usa la misma cola
  central durable que el alta desde Clientes.
- El proveedor detectado al escanear un gasto se confirma junto al gasto y, si
  existe, su recurrencia en un unico lote atomico.
