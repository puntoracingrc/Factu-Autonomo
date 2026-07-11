# Inventario de cobertura del manual — 2026-07-10

## Propósito y estado

Este inventario es la fuente de trabajo para llevar `/ayuda` al 100% sin obligar a una persona autónoma a adivinar qué hace un campo o si un cambio altera su histórico.

- Código funcional inventariado exhaustivamente: `af6088c4fbf24cd7d027b53e1eab5723175ee7bd`; integrado sobre `origin/main` `d893be9`. Los deltas posteriores de documentación y scheduler/observabilidad de alertas se revisaron de forma dirigida.
- Rutas UI: 54.
- Secciones actuales del manual: 14.
- Capturas actuales: 32 PNG, todas generadas para un único viewport lógico de 720 px y tema claro.
- Cobertura visual autenticada de esta ejecución: pendiente por indisponibilidad de la herramienta de navegador integrada.
- Este documento describe el comportamiento observado en código/tests; **no convierte en correcto un comportamiento marcado como hallazgo en el informe principal**.

## Leyenda

| Código | Significado |
|---|---|
| R | obligatorio |
| O | opcional |
| C | obligatorio solo bajo una condición |
| Local/AppData | clave principal del workspace; se guarda en navegador y puede sincronizarse con nube |
| Local/RR | clave local específica de Rentabilidad Real; no forma parte de AppData |
| Sesión | `sessionStorage`; se pierde al cerrar la sesión/pestaña según el navegador |
| Servidor | Supabase, Stripe, Resend, OpenAI, Google o endpoint propio |
| Derivado | no se persiste; se recalcula |
| PDF | afecta al documento/PDF |
| Lista | afecta a listados/búsqueda/filtros |
| Fiscal | afecta a IVA/IRPF/exportación; revisar P1 del informe principal |
| RR | afecta a Rentabilidad Real |

Ejemplos de este inventario son sintéticos: “Cliente Demo”, `B00000000`, `demo@example.test`, importes redondos y documentos `AUDIT-*`.

### Convención de ejemplos por campo

Para evitar repetir datos largos en cientos de filas, cada campo usa el ejemplo explícito de su columna “Efecto/ejemplo” o, si no aparece allí, el ejemplo determinista de esta tabla según su semántica. Esto forma parte del inventario y debe trasladarse a la futura entrada del manual.

| Semántica/tipo | Ejemplo sintético |
|---|---|
| persona/empresa/proveedor/producto/proyecto | `Cliente Demo`, `Empresa Demo`, `Proveedor Demo`, `Servicio Demo`, `Proyecto AUDIT` |
| NIF/VAT | `B00000000`, `ESB00000000` — marcadores sintéticos, nunca afirmar validación oficial |
| email/teléfono/web | `demo@example.test`, `600 000 000`, `https://example.test` |
| dirección/CP/ciudad/país | `Calle Demo 1`, `00000`, `Ciudad Demo`, `España` |
| IBAN | `ES00 0000 0000 0000 0000 0000` — deliberadamente no operativo |
| fecha/hora/periodo | `2030-01-15`, `10:30`, `T1 2030` |
| importe/porcentaje/cantidad | `100,00 €`, `21%`, `2 ud` |
| documento/referencia/SKU | `AUDIT-F-001`, `AUDIT-P-001`, `SKU-AUDIT-1` |
| concepto/nota/motivo | `Servicio de prueba`, `Nota sintética`, `Corrección AUDIT` |
| archivo | `AUDIT-FIXTURE.pdf`, creado sin datos reales |
| booleano/opción | alternar ambas ramas; la opción inicial es la indicada en cada fila |
| contraseña/código MFA/token | valor enmascarado o secreto efímero de entorno de pruebas; nunca imprimirlo ni capturarlo |
| búsqueda/filtro | `AUDIT`, con coincidencia y sin coincidencia |

## Cobertura ruta por ruta

Las 52 filas siguientes cubren las 54 rutas: los cuatro aliases de privacidad/términos se agrupan en dos filas. En la columna visual, `pendiente/pendiente` significa **claro/oscuro pendientes**; cada tema debe cubrir 1440, 1024, 768 y 390 px, además de los estados aplicables del contrato visual inferior.

| Ruta | Pantalla/estado | Manual actual | Sección objetivo | Matriz 4 anchos × claro/oscuro | Prioridad |
|---|---|---|---|---|---|
| `/` | portada o panel según sesión/datos | parcial (`inicio`) | inicio + variantes | pendiente/pendiente | alta |
| `/inicio` | portada pública | indirecto | primeros pasos | pendiente/pendiente | media |
| `/demo` | entrada/reinicio demo | sí, básico | demo | pendiente/pendiente | media |
| `/avisos` | tareas y automáticos | mezclado en inicio | avisos propia | pendiente/pendiente | alta |
| `/precios` | planes, trial, packs, portal | no | precios | pendiente/pendiente | media |
| `/cuenta` | acceso, MFA, plan, sync, Drive, backup, legal | parcial | cuenta ampliada | pendiente/pendiente | alta |
| `/auth/callback` | confirmación/error | no | cuenta/callbacks | pendiente/pendiente | baja |
| `/google-auth/callback` | Google login | no | cuenta/callbacks | pendiente/pendiente | baja |
| `/drive/callback` | Drive upload/error | no | cuenta/Drive | pendiente/pendiente | media |
| `/clientes` | listado, ficha, duplicados/fusión | parcial | clientes | pendiente/pendiente | alta |
| `/clientes/nuevo` | alta independiente | parcial | clientes | pendiente/pendiente | alta |
| `/proveedores` | listado, ficha, fusión | parcial | proveedores | pendiente/pendiente | alta |
| `/proveedores/nuevo` | alta independiente | parcial | proveedores | pendiente/pendiente | media |
| `/productos` | catálogo/familias/masivo/selector | muy parcial | productos | pendiente/pendiente | alta |
| `/productos/nuevo` | alta/retorno documento | no detallado | productos | pendiente/pendiente | alta |
| `/facturas` | listado/acciones/estados | parcial | facturas | pendiente/pendiente | alta |
| `/facturas/nuevo` | formulario | parcial | facturas/campos | pendiente/pendiente | alta |
| `/facturas/[id]` | lectura o borrador | parcial | facturas/estados | pendiente/pendiente | alta |
| `/facturas/[id]/rectificar` | anulación/corrección | mínimo | rectificativas propia | pendiente/pendiente | crítica |
| `/presupuestos` | listado/aceptación/conversión | parcial | presupuestos | pendiente/pendiente | alta |
| `/presupuestos/nuevo` | formulario | parcial | presupuestos/campos | pendiente/pendiente | alta |
| `/presupuestos/[id]` | lectura/borrador | parcial | presupuestos/estados | pendiente/pendiente | media |
| `/recibos` | manual/automático | parcial | recibos | pendiente/pendiente | alta |
| `/recibos/nuevo` | formulario | parcial | recibos/campos | pendiente/pendiente | media |
| `/recibos/[id]` | lectura/borrador | parcial | recibos/estados | pendiente/pendiente | media |
| `/gastos` | resumen/filtros/inbox/proveedor | parcial | gastos/listado | pendiente/pendiente | crítica |
| `/gastos/nuevo` | alta/edición/escaneo/lote/inbox | muy parcial | gastos/alta/escaneo | pendiente/pendiente | crítica |
| `/gastos/fijos` | regla/segmentación/próximos | parcial | gastos fijos | pendiente/pendiente | alta |
| `/impuestos` | periodos/IVA/IRPF/exports | parcial y debe corregirse | impuestos | pendiente/pendiente | crítica |
| `/configuracion` | negocio/facturación/fiscal/preferencias | parcial | configuración | pendiente/pendiente | alta |
| `/configuracion/plantillas` | diseñador/preview | no detallado | plantillas | pendiente/pendiente | media |
| `/importar` | orígenes/análisis/review/aplicar | muy parcial | importación | pendiente/pendiente | alta |
| `/rentabilidad-real` | hub/módulos | no | RR inicio | pendiente/pendiente | alta |
| `/rentabilidad-real/test` | test guiado | no | RR test | pendiente/pendiente | alta |
| `/rentabilidad-real/validar-configuracion` | resumen/gestor | no | RR validación | pendiente/pendiente | media |
| `/rentabilidad-real/calculadora/trabajo` | documento/gastos/fijos/ajustes | no | RR trabajo | pendiente/pendiente | alta |
| `/rentabilidad-real/calculadora/horas` | horas/proyecto/iguala | no | RR horas | pendiente/pendiente | alta |
| `/rentabilidad-real/simulador-precio-minimo` | objetivo/precio | no | RR simulador | pendiente/pendiente | alta |
| `/rentabilidad-real/informes` | filtros/tablas/calidad | no | RR informes | pendiente/pendiente | alta |
| `/rentabilidad-real/evolucion` | agrupación/tabla | no | RR evolución | pendiente/pendiente | alta |
| `/ayuda` | índice | n/a | ayuda | pendiente/pendiente | media |
| `/ayuda/[slug]` | sección/404 | n/a | ayuda | pendiente/pendiente | media |
| `/admin` | estados/capacidades/operación | no | manual interno admin | pendiente/pendiente | alta interna |
| `/legal/aviso-legal` | texto público | no | legal | pendiente/pendiente | media |
| `/legal/cookies` | texto público | no | legal | pendiente/pendiente | media |
| `/legal/encargo-tratamiento` | texto público | no | legal | pendiente/pendiente | media |
| `/legal/privacidad` | texto público | no | legal | pendiente/pendiente | alta |
| `/legal/terminos` | texto público | no | legal | pendiente/pendiente | alta |
| `/legal/verifactu` | límites/fuentes | no | legal/VeriFactu | pendiente/pendiente | crítica |
| `/legal/declaracion-responsable` | declaración generada | no | no documentar como válida hasta P1 | pendiente/pendiente | crítica |
| `/privacidad`, `/privacy` | alias | no | redirigir a legal | pendiente/pendiente | baja |
| `/terminos`, `/terms` | alias | no | redirigir a legal | pendiente/pendiente | baja |

## Estados transversales que cada sección debe explicar

| Estado | Qué debe ver/entender la persona |
|---|---|
| carga | qué se está recuperando y si puede salir sin perder datos |
| primer uso/vacío | siguiente acción recomendada y ejemplo sintético |
| datos locales sin cuenta | dónde se guardan, riesgo al borrar navegador y cómo exportar |
| sesión nube | qué sincroniza, estado pendiente/error y último éxito |
| demo | banner inequívoco, datos ficticios, reinicio y salida |
| límite de plan | límite concreto, alternativa sin pago y efecto de mejorar plan |
| email sin confirmar | acciones bloqueadas, reenvío y recuperación |
| sin permiso/admin | por qué no puede entrar y cómo volver |
| error recuperable | dato conservado, reintento/cancelación y contacto si aplica |
| éxito | qué se creó/cambió, dónde verlo y si se puede deshacer |
| dato largo | truncado con acceso al valor completo, sin overflow |
| claro/oscuro | mismo significado/contraste, no depender solo del color |
| móvil | controles ≥44 px cuando corresponda, scroll anunciado y acciones accesibles |

## Inventario de campos

### Panel y Avisos

| Pantalla/campo | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto/ejemplo |
|---|---|---|---|---|---|---|
| Panel · periodo | select | O | todo, mes, trimestre, año | opción conocida | Derivado | filtra tarjetas/gráfico/lista |
| Avisos · pestaña | botones | O | mis tareas / automáticos | una activa | estado UI | cambia panel; debe anunciarse como tab |
| Avisos · texto | texto/voz | R | vacío | no guardar vacío | Local/AppData | tarea “Revisar AUDIT-F-1” |
| Avisos · fecha | fecha | O | vacío | ISO válida | Local/AppData | orden/estado de vencimiento |
| Avisos · hora | hora | O | vacío | HH:mm | Local/AppData | recordatorio visible |
| Avisos · destino | radio visual | R | propio; propio/equipo | opción conocida | Local/AppData | visibilidad en cuenta compartida |
| Avisos · vínculo | select | O | ninguno, cliente, documento, rectificar, nuevo documento/gasto | entidad existente cuando aplica | Local/AppData | abre ruta contextual |
| Avisos · búsqueda de vínculo | texto | C | vacío | coincidencia por nombre/número | Derivado | no cambia entidad hasta seleccionar |
| Avisos · dictado | micrófono | O | apagado | permiso, sesión y disponibilidad | Servidor + estado UI | transcribe; nunca guardar audio como tarea sin revisión |

#### Acciones de Panel y Avisos

| Acción | Aparece cuando | Consecuencia | Confirmación | Deshacer | Error |
|---|---|---|---|---|---|
| Cambiar periodo | siempre en Panel | recalcula tarjetas/gráfico/lista | no | elegir otro/todo | estado sin datos, no cero engañoso |
| Abrir acceso rápido/tarjeta | destino disponible | navega al módulo/filtro | no | volver navegador | ruta no disponible/límite |
| Instalar PWA | navegador instalable | abre prompt del navegador | prompt externo | cancelar | no soportado/ya instalada |
| Cambiar Mis tareas/Automáticos | `/avisos` | cambia colección visible | no | cambiar pestaña | debe conservar borrador |
| Crear/Guardar recordatorio | texto válido | alta/actualización AppData | no | editar o completar; no historial de edición | texto vacío, fecha/hora inválida, sync |
| Dictar/Detener | cuenta/plan/micrófono | obtiene transcripción en borrador | permiso navegador | editar/descartar texto | permiso, cuota, sesión, red |
| Vincular/Quitar vínculo | editor abierto | asocia o limpia entidad/acción | no | quitar/volver a elegir | entidad obsoleta |
| Marcar hecho/Reabrir | recordatorio activo/completado | cambia estado y fecha | no | acción inversa | sync |
| Borrar completado | historial visible | elimina recordatorio | hoy sin confirmación visible | no | sync/error persistente |
| Seguir vínculo | recordatorio enlazado | navega a cliente/documento/alta/rectificación | no | volver | destino borrado/inseguro |

### Portada pública, demo y precios

| Pantalla/control | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto/ejemplo |
|---|---|---|---|---|---|---|
| `/inicio` navegación | enlaces | — | producto/precios/ayuda/privacidad | URL interna conocida | ninguno | desplaza o navega |
| Empezar gratis | enlace | — | alta de Cuenta | retorno seguro | ninguno | abre `/cuenta?modo=crear` |
| Iniciar sesión | enlace | — | Cuenta | interno | ninguno | abre acceso |
| Demo sin registro | enlace | — | `/demo` | interno | activa al cargar demo | no toca workspace real autenticado |
| Ver precios | enlace | — | `/precios` | interno | ninguno | compara planes |
| `/demo` preparación | estado automático | R | cargando→redirección a `/` | AppStore listo; si hay usuario sale de demo | localStorage demo separado | crea/reinicia empresa ficticia |
| Demo · Reiniciar | botón en banner | C modo demo | disponible | confirmación/copy inequívoco | reemplaza solo workspace demo | vuelve a fixture inicial |
| Demo · Salir/Crear cuenta | botones | C modo demo | disponibles | decisión sobre datos demo | desactiva demo/navega | nunca mezclar con cuenta real |
| Plan actual/trial | estado | O | usuario/anon; free/trial/pro/pro+ | BillingContext | servidor | etiqueta y días restantes |
| Plan | tarjeta | — | Gratis/Pro/Pro+ IA | catálogo servidor/cliente alineado | ninguno hasta checkout | límites/precio/funciones |
| Intervalo | botones de compra | C plan pagado | anual/mensual | precio configurado | Stripe al continuar | checkout correspondiente |
| Resultado checkout | query/aviso | O | success/cancel | valor conocido | ninguno | éxito obliga refrescar plan; cancel no cobra |

Acciones de Precios: Crear cuenta y Probar demo solo navegan; Contratar mensual/anual exige sesión confirmada y crea checkout Stripe; Gestionar plan abre el portal para una suscripción propia; cancelar checkout conserva la app; errores de Stripe/configuración deben quedar inline y nunca simular éxito. Los claims VeriFactu deben enlazar la limitación legal junto al CTA.

### Ayuda, callbacks y páginas legales

| Pantalla/control | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Ayuda · búsqueda | search | O | vacío | texto normalizado | estado UI | filtra secciones; sin resultado útil |
| Ayuda rápida | 4 enlaces | — | negocio/factura/demo/cuenta | rutas conocidas | ninguno | sección o demo |
| Sección manual | contenido + anterior/siguiente | — | slug válido | slug en registro; si no, 404 | ninguno | lectura/navegación |
| `from`/Volver | enlace contextual | O | ruta saneada | solo retorno interno permitido | query | vuelve a pantalla origen |
| `/auth/callback` | estado automático | R | confirmed/pending/recovery/error | código/OTP/sesión Supabase | sesión | vuelve a Cuenta; recovery habilita nueva contraseña |
| `/google-auth/callback` | estado automático | R | procesando/éxito/error | code/state/token y Supabase | sesión | volver a Cuenta en error |
| `/drive/callback` | estado automático | R | procesando/éxito/error | state, code, sesión y token | token/ajustes Drive | enlaces a carpeta/archivo y reintento desde Cuenta |
| Legal | texto/enlaces | — | aviso/cookies/DPA/privacidad/términos/VeriFactu/declaración | contenido versionado | ninguno | informa; no sustituye consentimiento específico |
| Alias privacidad/términos | página/redirect objetivo | — | ES/EN alias | canonical único | ninguno | debe redirigir 308; hoy P2 |

Acciones: buscar/limpiar, abrir sección, anterior/siguiente y volver no mutan datos; los callbacks no deben aceptar destinos externos y siempre deben ofrecer salida/reintento; enlaces oficiales legales abren con `noopener`; la declaración responsable no debe ofrecerse como válida hasta resolver P1.

### Cliente — alta/edición y selector documental

| Campo | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto/ejemplo |
|---|---|---|---|---|---|---|
| Tipo | select | R | particular / empresa | opción conocida | Local/AppData | cambia etiquetas y composición de nombre |
| Nombre / razón social | texto | R | vacío | mínimo y sin identidad duplicada insegura | maestro + snapshot al emitir | PDF, Lista; “Cliente Demo” |
| Apellidos | texto | C particular | vacío | longitud mínima si se informa | maestro + snapshot | PDF, búsqueda |
| Persona de contacto | texto | O empresa | vacío | texto | maestro + snapshot | ficha/contacto; no sustituye razón social |
| NIF/CIF | texto | C al emitir factura | vacío | presencia; duplicados; no se consulta AEAT | maestro + snapshot | fiscal/PDF; `B00000000` |
| Teléfono | tel | O | vacío | texto normalizado | maestro + snapshot | WhatsApp si hay sesión confirmada |
| Email | email | O | vacío | formato básico | maestro + snapshot | envío/recordatorio |
| Tipo de vía | select | O | sin tipo; catálogo de vías | opción conocida | maestro + snapshot | compone dirección PDF |
| Dirección/vía y número | texto + Places | C al emitir factura | vacío | presencia si factura; suggestion opcional | maestro + snapshot | PDF/lista |
| Tipo de inmueble | select | O | vacío; vivienda/local/oficina/nave/etc. | opción conocida | maestro + snapshot | controla complemento |
| Piso/puerta/complemento | texto | C por inmueble | vacío | se oculta/borra si no aplica | maestro + snapshot | dirección PDF |
| Código postal | texto | C al emitir factura | vacío | presencia; formato no validado externamente | maestro; integrado en snapshot de dirección | PDF/fiscal |
| Ciudad | texto | C al emitir factura | vacío | presencia | maestro; integrado en snapshot de dirección | PDF/fiscal |
| Notas | textarea | O | vacío | texto | solo maestro | nunca PDF; dato interno |
| Rellenar con IA | texto/archivo + consentimiento | O | desactivado hasta aceptar | plan/cuota/consentimiento; revisar resultado | servidor para análisis; campos solo al aceptar | rellena borrador, no guarda solo |
| Lista rápida | select | O | 10 recientes ordenados | customer existente | estado del formulario | copia maestro al formulario |
| Búsqueda rápida | combobox visual | O | vacío | coincidencia nombre/apellidos/NIF | Derivado | seleccionar evita duplicado |

#### Acciones de clientes

| Acción | Aparece cuando | Consecuencia | Confirmación | Deshacer | Error |
|---|---|---|---|---|---|
| Nuevo/Guardar | siempre/formulario válido | crea o actualiza maestro; puede retornar al documento | no | editar; borrar tiene riesgo | required, duplicado, sync |
| Rellenar con IA | consentimiento + plan | analiza texto/archivo y rellena borrador | consentimiento antes de envío | revisar/editar/cancelar | cuota, red, parse, baja confianza |
| Seleccionar en documento | coincidencia visible | copia maestro y `customerId` seguro | no | limpiar/cambiar | cliente obsoleto |
| Crear factura/presupuesto | ficha existente | abre documento preasignado | no | cancelar borrador | límite de plan |
| WhatsApp/email | dato disponible | abre app externa | navegador/app externa | cancelar externo | formato/popup |
| Editar | maestro visible | abre panel precargado | no | cancelar conserva | validación/sync |
| Borrar | maestro visible | elimina maestro; hoy deja referencias posibles | `confirm` | no | debe bloquear/explicar documentos asociados |
| Unificar sugeridos/manual | ≥2 candidatos y maestro elegido | mueve borradores según opción, preserva snapshots emitidos, elimina duplicados | `confirm` con resumen | no automático | selección, conflicto, sync parcial |
| Cargar más | quedan ocultos | amplía lote de lista | no | no necesario | rendimiento |

### Proveedor

| Campo | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto/ejemplo |
|---|---|---|---|---|---|---|
| Nombre | texto | R | vacío | no vacío; deduplicación normalizada/NIF en flujos de scan | Local/AppData | Lista, gastos, productos |
| NIF/CIF | texto | O | vacío | texto; coincidencia normalizada | Local/AppData | evita proveedor fantasma |
| Teléfono | tel | O | vacío | texto | Local/AppData | contacto |
| Email | email | O en modelo, **sin campo UI actual** | — | pendiente de implementar | Local/AppData/importación | recordatorio de originales |
| Web | texto/url | O | vacío | se normaliza al abrir; no hay error formal | Local/AppData | enlace externo |
| Tipo de vía | select | O | catálogo | opción conocida | Local/AppData | ficha |
| Dirección | texto | O | vacío | texto | Local/AppData | ficha |
| Código postal | texto | O | vacío | texto | Local/AppData | ficha |
| Ciudad | texto | O | vacío | texto | Local/AppData | ficha |
| Categoría | texto | O en modelo/import | sin campo consistente | texto | Local/AppData | clasificación |
| Notas | textarea | O | vacío | texto | Local/AppData | interno |

#### Acciones de proveedores

| Acción | Aparece cuando | Consecuencia | Confirmación | Deshacer | Error |
|---|---|---|---|---|---|
| Nuevo/Guardar | siempre/formulario válido | crea/actualiza maestro y retorna si procede | no | editar | nombre requerido, duplicado, sync |
| Ver compras/productos | maestro con relaciones | abre/filtra entidades vinculadas | no | limpiar filtro/volver | referencia obsoleta |
| Abrir web/contacto | dato disponible | navegador/app externa | externo | cancelar | URL/formato |
| Editar | maestro visible | panel precargado | no | cancelar | validación |
| Borrar | maestro visible | hoy elimina maestro aunque haya relaciones | `confirm` | no | debe bloquear/soft-delete y preservar NIF histórico |
| Unificar sugeridos/manual | ≥2 candidatos | mueve gastos/productos al canónico y elimina duplicados | `confirm` | no automático | conflicto/sync parcial |

### Producto — alta/editor

| Campo | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto/ejemplo |
|---|---|---|---|---|---|---|
| Nombre interno | texto | R | vacío/detectado | no vacío; aviso de duplicado | Local/AppData | Lista/búsqueda; “Servicio Demo” |
| Nombre del proveedor | texto | O | detectado/vacío | texto | Local/AppData `purchase.description`/alias | reconoce futuras facturas |
| Código / SKU | texto | O | vacío | texto | Local/AppData | búsqueda/listado |
| Referencia proveedor | texto | O | vacío/detectada | texto | Local/AppData | matching de compra |
| Alias | lista de textos | O | detectados | normalizados, sin repetición | Local/AppData | búsqueda/matching; no cambia facturas antiguas |
| Familia | select + gestión | O | sin familia | familia existente | Local/AppData | filtros y regla de incremento |
| Subfamilia | select + gestión | O | sin subfamilia | debe pertenecer a familia elegida | Local/AppData | filtros; nunca huérfana |
| Unidad general | select | O | unidad por defecto | unidad habilitada | Local/AppData | sugerencia de venta/compra |
| Tipo de cálculo | select | R | directo; directo/superficie | opción conocida | Local/AppData | habilita ancho/alto al usar producto |
| Redondeo | número/select | O | configuración por defecto | entero permitido | Local/AppData | cantidad m² derivada |
| Venta activada | checkbox | O | según origen | booleano | Local/AppData | producto seleccionable en documento |
| Descripción de venta | texto | O | nombre interno | texto | Local/AppData | texto inicial de línea; editable sin perder vínculo |
| Unidad de venta | select | O | unidad general | habilitada | Local/AppData | línea/PDF |
| PVP sin IVA | moneda | O | vacío/0 | número finito ≥0; hoy algunos inválidos se silencian | Local/AppData | precio de línea y margen |
| IVA venta | select/número | O | IVA perfil | tipo permitido | Local/AppData | línea/PDF/fiscal |
| Compra activada | checkbox | O | sí si detectado | booleano | Local/AppData | coste y métricas |
| Proveedor | selector | O | detectado/vacío | maestro existente | Local/AppData | filtros/matching |
| Unidad compra | select | O | unidad general | opción conocida | Local/AppData | cantidad comprada |
| Tarifa sin IVA | moneda | O | vacío | número finito ≥0 | Local/AppData | base de coste |
| Descuento proveedor % | porcentaje | O | 0 | 0–100 | Local/AppData | coste neto automático |
| Coste real | moneda | O | tarifa×(1-descuento) | número finito ≥0; no aprender de abono | Local/AppData | margen/RR |
| IVA compra | porcentaje | O | IVA perfil | tipo permitido | Local/AppData | referencia de compra |
| Factor compra/venta | número | O | 1 | >0 | Local/AppData | conversión de unidades |
| Atributo · clave/etiqueta/valor/unidad | filas | O | vacío | texto; clave única por producto | Local/AppData | ficha/búsqueda futura |
| Notas | textarea | O | vacío | texto | Local/AppData | interno |
| Oculto | checkbox/acción | O | falso | booleano | Local/AppData | oculta catálogo sin borrar histórico |

### Gestión de familias y catálogo

| Campo/control | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Búsqueda | texto | O | vacío | texto normalizado | Derivado | nombre, proveedor, código, alias |
| Filtro familia | select | O | todas | familia/sin familia | estado UI | filtra tarjetas |
| Filtro subfamilia | select | O | toda familia | concreta/sin subfamilia | coherente con familia | filtra sin confundir “todas” y “ninguna” |
| Filtro proveedor | select | O | todos | maestro existente | estado UI | catálogo por proveedor |
| Orden | select | O | reciente/nombre/etc. | opción conocida | estado UI | incluir cantidad realmente comprada |
| Nombre familia/subfamilia | texto modal/panel | R | vacío/actual | no vacío, sin duplicado; subfamilia requiere familia | Local/AppData | filtros/productos |
| Selección masiva | checkboxes | O | ninguna | IDs visibles/existentes | estado UI | mover familia/subfamilia |
| Modo selector documento | query/checkboxes | C | petición de sesión | documento/retorno válido | Sesión | devuelve líneas seleccionadas |

#### Acciones de productos y familias

| Acción | Aparece cuando | Consecuencia | Confirmación | Deshacer | Error |
|---|---|---|---|---|---|
| Nuevo/Guardar/Cancelar | formulario/editor | crea/actualiza o descarta borrador | no | editar; Cancelar no guarda | nombre, números, plan, duplicado |
| Elegir para documento | modo selector | devuelve producto(s) como líneas vía sesión | no | borrar líneas/cancelar selector | retorno inválido |
| Editar/Duplicar | tarjeta | abre editor o crea copia editable | no | cancelar/borrar copia | límite/validación |
| Ocultar | producto con compras/histórico | lo saca del catálogo sin borrar relaciones | `confirm` | mostrar/editar si UI lo permite | sync |
| Eliminar | producto eliminable | borra producto | `confirm` | no | relaciones/límite |
| Unificar producto | editor con candidato | combina identidad/aliases/histórico según regla | confirmación contextual necesaria | no automático | conflicto de proveedor/unidades |
| Ver estructura/filtros | siempre | expande árbol o filtra | no | cerrar/limpiar | vacío |
| Crear familia/subfamilia | gestor | crea marcador/estructura | no | borrar con confirm | vacío, duplicado, subfamilia sin familia |
| Renombrar familia/subfamilia | entidad elegida | mueve productos/marcadores | no | renombrar de nuevo | duplicado; regla de margen hoy no migra |
| Borrar familia | familia existente | deja productos sin familia y retira subfamilias relacionadas | `confirm` con recuento | reasignar manualmente | sync parcial |
| Borrar subfamilia | subfamilia existente | deja productos en familia sin subfamilia | `confirm` con recuento | reasignar | sync parcial |
| Seleccionar visibles/Limpiar | edición masiva | cambia selección UI | no | acción inversa | ninguna selección |
| Mover seleccionados | selección válida | asigna familia/subfamilia | confirmación/resumen recomendable | volver a mover | varias familias incompatibles |
| Crear factura/presupuesto/recibo | selección masiva | abre documento con líneas | no | cancelar borrador | límites/retorno |
| Cargar más | quedan productos | añade 30 a la vista | no | no | rendimiento |

### Documento común — factura, presupuesto y recibo

| Campo | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto/ejemplo |
|---|---|---|---|---|---|---|
| Tipo documental | contexto | R | según ruta | factura/presupuesto/recibo | Local/AppData | numeración, estados, PDF |
| Cliente | selector + ficha | C | vacío/cliente origen | factura emitida exige identidad completa | maestro + snapshot al emitir | PDF/Lista/Fiscal |
| Fecha | fecha | R | hoy | ISO válida | documento + snapshot | periodo fiscal/PDF |
| Vencimiento | fecha | O/C | vacío/derivado | no anterior según flujo | documento + snapshot | estado vencido/PDF |
| Validez presupuesto | días/fecha | O | perfil (30) | entero ≥0 | perfil para futuros; fecha en documento | vencimiento presupuesto |
| Número | derivado/configurable solo por ajustes/import | C al emitir | BORRADOR o siguiente formato | único por clase/año | documento + snapshot | Lista/PDF/Fiscal |
| Estado solicitado | botones/select | R | borrador | permitido por tipo/ciclo | documento | acciones y etiquetas |
| IVA del documento | select | R si no exento | tipo por defecto del perfil | tasa habilitada | se copia a cada línea | fiscal/PDF; hoy impide IVA mixto (P1) |
| Frase | select | O | predeterminada por tipo | frase existente | se copia a notas/snapshot | PDF |
| Forma de pago | select/texto | O | predeterminada | texto | documento + snapshot | PDF |
| Notas | textarea | O | vacío/frase | texto | documento + snapshot | PDF |
| Calculadora rápida | panel flotante | O | cerrada | expresión/teclas soportadas | estado UI | no modifica documento automáticamente; cierra al guardar |

#### Línea documental

| Campo | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Producto vinculado | selector/búsqueda | O | libre | producto existente | solo `lineProductPricing`/draft de sesión; `LineItem` no conserva `productId` | rellena descripción/precio/unidad/coste, pero el vínculo se pierde al reabrir (P2) |
| Descripción comercial | texto | C | vacío/producto | requerida si hay importe | documento + snapshot | PDF; editar no debe romper matching de producto |
| Cantidad | número | R con concepto | 1 | finita y >0 | documento + snapshot | base |
| Unidad | select | O | perfil/producto | habilitada; ud, m, m2, h, kg, serv. y custom | documento + snapshot | PDF |
| Ancho | número | C m² | 0 | >0 para calcular | solo estado/draft de sesión; al guardar pasa a texto | cantidad m²; no se recupera estructurado al reabrir (P2) |
| Alto | número | C m² | 0 | >0 para calcular | solo estado/draft de sesión; al guardar pasa a texto | cantidad m²; al reabrir y recalcular puede duplicar el sufijo (P2) |
| Metros lineales | número | C ml/m | 0 | >0 para calcular | solo estado/draft de sesión; al guardar pasa a texto | cantidad lineal; no se recupera estructurado (P2) |
| Precio sin IVA | moneda | R con concepto | 0/producto | finito; ≥0 en formulario normal | documento + snapshot | base/margen |
| Coste | moneda derivada, sin campo directo | O | producto/0 | finito ≥0 | solo estado de formulario; no `LineItem` | margen temporal; se pierde al reabrir junto al vínculo (P2) |
| Margen | porcentaje/derivado | O | regla familia/manual | finito | precio final persiste; vínculo/coste/margen no | indicador temporal, no PDF/RR persistente |
| IVA % de línea | valor almacenado, sin control individual en formulario normal | R | IVA global del documento | tasa habilitada; 0 si exento | documento + snapshot | fiscal/PDF; abrir un borrador mixto lo aplana hoy (P1) |
| Descuento de venta | **sin control/modelo actual** | — | — | pendiente de diseño | no persiste | obliga a alterar PVP y pierde tarifa/descuento (P2) |
| Orden | arrastre/flechas | O | inserción | no salir de lista | documento | orden PDF |

### Rectificativa

| Campo | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Original | solo lectura | R | factura de ruta | rectificable y no supersedida | referencia | cadena/fiscal |
| Tipo | botones | R | anulación; anulación/corrección | opción conocida | `rectification.type` | anulación genera líneas negativas; corrección clona editable |
| Motivo | select | R | primer motivo | catálogo u “Otros” | snapshot/rectification | PDF/registro |
| Motivo personalizado | texto | C “Otros” | vacío | no vacío | snapshot | PDF/registro |
| Fecha | fecha | R | hoy | fecha válida; falta política explícita de periodo | documento | fiscal/PDF |
| Cliente completo | ficha | R al emitir | original | debe conservar/validar NIF, dirección, CP y ciudad; hoy hay P1 | documento/snapshot | fiscal/PDF |
| Líneas | mismas que factura | R | negativas o clon | coherencia con tipo | documento/snapshot | ajuste fiscal |
| Notas/forma de pago/frase | texto/select | O | original/perfil | texto | documento/snapshot | PDF |

### Estados y acciones documentales

| Acción | Aparece cuando | Consecuencia | Confirmación/deshacer | Error que debe explicar el manual |
|---|---|---|---|---|
| Vista previa borrador | formulario válido básico | abre PDF sin emitir/numerar | cerrar popup; no persiste | popup bloqueado/generación |
| Guardar borrador | editable y límite permitido | persiste editable sin número fiscal final | se puede editar/borrar | validación/límite/sync |
| Emitir | datos fiscales completos | número final, snapshot, bloqueo, registro opcional | no deshacer; rectificar | datos faltantes/VeriFactu |
| Emitir y descargar | igual que emitir | además descarga PDF | no deshacer emisión | popup/descarga |
| Editar | borrador/desbloqueado | actualiza | guardar/cancelar | conflicto/sync |
| Marcar enviada | emitida no enviada | delivery sent | normalmente no revertir en UI | sesión/envío no equivalen |
| Marcar cobrada | factura pendiente | paid y fecha; recibo solo mediante acción explícita | política de reversión debe indicarse | estado no permitido |
| Crear recibo | factura cobrada sin recibo | crea documento enlazado | recibo sigue sus reglas | duplicado |
| Aceptar/rechazar presupuesto | pendiente | cambia acceptance | indicar si se puede revertir | estado incompatible |
| Convertir a factura | presupuesto convertible | crea factura borrador enlazada | presupuesto se conserva | ya convertido |
| Recordar pago | factura pendiente + sesión/email confirmado | modal y envío/compartir | cancelar antes; externo después no deshacer | contacto/sesión/cuota |
| Compartir email/WhatsApp | contacto + sesión confirmada | genera PDF y usa método elegido | chooser cancelable | popup/share/API |
| Vincular | pares permitidos | añade relación, no cambia PDF/importes | desvincular | incompatibilidad/duplicado |
| Rectificar | factura emitida rectificable | crea cadena | no borrar original | P1 actuales |
| Reparar cliente | mismatch + maestro | hoy reescribe snapshot emitido | confirmación nativa; sin undo/audit | debe bloquearse/rediseñarse |
| Borrar | política permite | elimina y puede renumerar borradores | confirmación/checkbox legal | emitida bloqueada |
| Duplicar | documento compatible | nuevo borrador | borrar borrador | límites |

### Gasto manual, factura recibida, ticket y escaneo

| Campo | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto/ejemplo |
|---|---|---|---|---|---|---|
| Tipo de gasto | botones | R | material/servicio para trabajo; factura recibida/material o servicio/ticket/fijo | opción cerrada | gasto; fijo también plantilla | cambia campos y circuito |
| Proveedor/tienda | texto + datalist | O | vacío | trim; reutiliza coincidencia | `supplierName`/`supplierId` | ficha, filtros, fiscal |
| Guardar proveedor | checkbox | O | activo | booleano; deduplicar antes de crear | maestro si no existe | evita reescribirlo después |
| Nº factura proveedor | texto | O | vacío | con proveedor participa en detección de duplicado | `purchaseDocument` | trazabilidad |
| NIF/CIF proveedor | texto | O | vacío/maestro/scan | normalización básica | snapshot de compra/maestro si se crea | exportación fiscal |
| Fecha de factura | fecha | O | vacío/scan | ISO válida | compra | evidencia |
| Vencimiento | fecha | O | vacío | ISO válida | compra | aviso/pago |
| CP/ciudad/dirección proveedor | texto | O | vacío/scan | texto | compra/maestro nuevo | identidad de proveedor |
| Condiciones de pago | texto | O | vacío | texto | compra | referencia interna |
| Relacionar con trabajo | buscador + selector | O | ninguno | factura/presupuesto existente | `workDocumentId` | Rentabilidad Real |
| Fecha de gasto | fecha | R | hoy | no vacía | gasto | periodo fiscal/lista |
| Qué compraste | texto | R | vacío/scan | trim no vacío | `description` | búsqueda/lista |
| Importe sin IVA | moneda | R | 0/scan | número finito distinto de 0; admite abono negativo controlado | `amount` | base/fiscal/caja |
| Importe con IVA | moneda calculada/editable | C | base × IVA | coherencia numérica | se convierte a base | total mostrado |
| IVA % | select | R | perfil; 0 si exento | tasa configurada | `ivaPercent` | fiscal; revisar IVA mixto P1 |
| Categoría | select | R | Material; Material/Suministros/Transporte/Alquiler/Seguros/Profesionales/Otros | opción conocida | gasto | filtro/informe |
| Forma de pago | select | R | Efectivo; Efectivo/Tarjeta/Transferencia/Bizum/Domiciliación | opción conocida | gasto | lista/control |
| Notas | textarea | O | vacío | texto | gasto | interno |
| Línea · producto/servicio | texto | C si se añade línea | vacío/scan | trim si hay importes | `purchaseLines` | detalle y matching de catálogo |
| Línea · cantidad | número | C | 1 | finita | línea | total de línea |
| Línea · unidad | texto | O | `ud` | texto | línea | detalle |
| Línea · precio | moneda | C | 0/scan | finito; signo coherente con abono | línea | base/coste aprendido |
| Línea · descuento % | porcentaje | O | 0 | finito; 0–100 | línea | total de línea |
| Línea · IVA % | porcentaje | O | tasa cabecera/scan | 0–100 | línea | desglose; hoy no gobierna el cálculo fiscal global |
| Añadir al catálogo | checkbox por línea | O | falso; scan puede sugerirlo | línea apta; no aprender de abono | crea/actualiza producto | coste histórico/matching |
| Archivo de escaneo | file/cámara múltiple | C para scan | ninguno; imagen/PDF; lote hasta límite de plan | sesión confirmada, consentimiento, cuota, MIME/tamaño; máximo normal 10 | no persiste hasta guardar revisión | extrae borrador, nunca debe emitir |
| Consentimiento IA | aceptación | C para scan | no aceptado | obligatorio antes de enviar | preferencia de consentimiento | habilita análisis remoto |
| Revisión por archivo | tarjeta/estado | R antes de guardar scan | `ready/review/blocked` | descripción/importe y avisos bloqueantes resueltos | al guardar, gasto/proveedor/producto; inbox marcado | conservar archivo y motivo de bloqueo |
| Periodo de lista | selects | O | mes actual; mes/trimestre/año + subperiodo | años derivados de datos | estado UI | filtro de tarjetas/gráfico/CSV |
| Filtro gasto | select | O | todos; proveedores/categorías/fijos | opción derivada | estado UI | lista/gráfico/CSV |
| Resumen de proveedor | file | O | PDF/TXT | parser y revisión de filas | solo al guardar todos | crea gastos; no guarda el archivo |

#### Acciones de gastos

| Acción | Aparece cuando | Consecuencia | Confirmación/deshacer/error |
|---|---|---|---|
| Guardar/actualizar | formulario válido | crea o actualiza gasto y, según selección, proveedor/productos/plantilla | errores inline; sin undo global |
| Escanear | archivo + gates cumplidos | consume cuota IA y crea revisiones | no guarda gasto; error por archivo y reintento |
| Guardar uno/todos | revisiones aptas | crea las entidades seleccionadas | omite bloqueados con explicación; no undo por lote |
| Quitar revisión | tarjeta no guardada | descarta ese borrador | reversible volviendo a subir |
| Abrir/ver líneas/editar | fila existente | panel o formulario con datos | cancelar conserva original |
| Eliminar | fila permitida | borra gasto | `confirm`; sin papelera; una ocurrencia recurrente puede reaparecer (P2) |
| Exportar CSV | vista con datos | descarga el filtro actual | no muta; explicar encoding/columnas |
| Seleccionar gráfico | sector visible | filtra lista | limpiar filtro deshace |
| Importar resumen/Guardar todos | parser con filas | crea lote | preview obligatorio; errores por fila |

### Buzón inteligente de gastos

| Campo/estado | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto/ejemplo |
|---|---|---|---|---|---|---|
| Sesión | estado | R | sin sesión/con sesión | bearer vigente | servidor | sin sesión solo invita a entrar |
| Alias de recepción | email readonly | C sesión/config | generado por servidor | pertenece al usuario; estado MX/entrega | servidor; token no visible | dirección para proveedores |
| Uso IA | indicador | O | calculando/porcentaje restante | respuesta de cuota | Derivado | anticipa límite |
| Entrega | estado | O | ready/degradado | hosts/servicio | Derivado | explica si llegarán adjuntos |
| Item recibido | fila | O | hasta 5 visibles; pendiente/error/procesado | dueño, adjunto y scan asociados | servidor | remitente, fecha, importe/título sintéticos |
| Adjuntos por correo | límite informado | R | primeros 10 | tipo/tamaño/seguridad antes de IA | servidor | resto debe quedar explicado, no desaparecer silenciosamente |

Acciones: Actualizar vuelve a consultar buzón/cuota; Copiar usa portapapeles; Generar nuevo pide confirmación, invalida el alias anterior para entradas futuras y conserva pendientes; Revisar abre `/gastos/nuevo?inbox=<id>` y no guarda el gasto hasta aceptar; error de scan debe permitir reintento o descarte seguro. El manual debe explicar basura, permisos caducados, entrega degradada y que no se publique el alias.

### Gastos fijos

| Campo | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Tratamiento | botones | R | deducible; deducible/no deducible | opción cerrada | plantilla | no deducible fuerza IVA 0; hoy fiscalidad tiene P1 |
| Aplicar cambios desde | botones + fecha al editar | C | hoy/fecha concreta | fecha válida | segmenta versión | cierra tramo anterior y conserva histórico |
| Proveedor | texto | R | vacío | trim no vacío | plantilla/ocurrencias | lista/filtro |
| Concepto | texto | R | vacío | trim no vacío | plantilla/ocurrencias | descripción |
| Importe base/total | moneda | R | 0 | >0 | plantilla | ocurrencias previstas/reales |
| IVA | select | R | perfil/0 | tasa configurada; 0 si no deducible | plantilla | ocurrencias |
| Categoría/forma de pago | selects | R | valores de gasto normal | opción conocida | plantilla | ocurrencias |
| Frecuencia | select | R | mensual; mensual/trimestral/anual | opción conocida | plantilla | calendario |
| Cuándo vence | select | R | fin de mes; inicio/mitad/fin/día concreto | opción coherente; anual fuerza día | plantilla | fecha de cada cargo |
| Mes anual | select | C anual | enero | 1–12 | plantilla | calendario anual |
| Día | número | C día concreto/anual | 1 | 1–31 | plantilla | calendario; meses cortos deben documentarse |
| Desde | fecha | R | hoy | no vacía | plantilla | primera vigencia |
| Duración | select | R | indefinida; nº cargos/hasta fecha | opción conocida | plantilla | fin de vigencia |
| Nº de cargos | número | C por ocurrencias | 12 | entero positivo | plantilla | fin calculado |
| Hasta | fecha | C por fecha | vacío | ≥ inicio | plantilla | fin de vigencia |
| Notas | textarea | O | vacío | texto | plantilla/ocurrencia | interno |

Acciones: Guardar crea/segmenta la plantilla y genera ocurrencias; Pausar/Activar es reversible; Editar con fecha efectiva no debe cambiar cargos anteriores; Eliminar pide confirmación, borra la plantilla y no ofrece papelera.

### Impuestos

| Campo/control | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Periodo | botones | O | Trimestre; Trimestre/Año/Todo | opción cerrada | estado UI, no persiste | limita documentos y gastos por fecha |
| Trimestre | select | C modo Trimestre | actual; T1–T4 | opción cerrada | estado UI, no persiste | resumen/CSV |
| Año | select | C Trimestre/Año | actual; años con datos | año derivado | estado UI, no persiste | resumen/exports |
| Régimen IVA | solo lectura/enlace | R | sujeto/exento desde Configuración | perfil normalizado | AppData perfil | IVA repercutido/soportado |
| IRPF estimado % | solo lectura/enlace | R | perfil, 20% inicial | 0–100 en Configuración | AppData perfil | provisión orientativa |
| Ventas base/IVA | tarjetas derivadas | — | 0 | documentos fiscales del periodo | Derivado | informe; rectificativas P1 |
| Gastos base/IVA | tarjetas derivadas | — | 0 | gastos del periodo/deducibilidad | Derivado | informe; no deducible/mixto P1 |
| IVA a pagar/favor | tarjeta derivada | — | diferencia | signo y etiqueta coherentes | Derivado | orientación fiscal |
| Beneficio/IRPF/neto | tarjetas derivadas | — | ventas − gastos | definición separada de IVA/caja | Derivado | hoy “neto” tiene P1 |
| Resumen completo | panel | C permiso `quarterlySummary` | visible/bloqueado | plan vigente | Derivado | sin permiso muestra acceso a planes |
| Exportar trimestre CSV | acción | C modo Trimestre + `quarterlyExport` | filtro actual | datos disponibles; límite plan | descarga | libro de ventas/gastos |
| Exportar resumen anual PDF | acción | C modo Año + `quarterlyExport` | año actual | año/datos válidos | descarga | asesoría; no declaración oficial |

El manual debe advertir que las cifras son orientativas y mantener bloqueada su publicación como resultado fiable hasta resolver AUD-P1-01/05/06/07/13. Cada export debe enumerar inclusiones, signo, redondeo, exentos, no deducibles y rectificativas.

### Configuración del negocio y facturación

| Campo | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Autorrelleno Google | checkbox | O | desactivado | gate Pro/configuración | estado formulario | sugiere dirección; no guarda solo |
| Nombre comercial | texto | O | vacío | trim | perfil | cabecera/listas/PDF según plantilla |
| Nombre fiscal/razón social | texto | R para emitir | vacío | no vacío | perfil + snapshot al emitir | emisor fiscal/PDF |
| NIF/CIF | texto | R para emitir | vacío | presencia/formato básico; no consulta AEAT | perfil + snapshot | fiscal/VeriFactu |
| VAT/VIES | texto | O | vacío | texto normalizado | perfil + snapshot | operaciones UE/PDF si aplica |
| Teléfono/email/web | tel/email/url | O | vacío | formato básico donde existe | perfil + snapshot | contacto/PDF |
| Dirección fiscal/CP/ciudad | texto | R para emitir | vacío | presencia | perfil + snapshot | emisor fiscal/PDF |
| Provincia/país | texto | O | vacío/España | texto | perfil + snapshot | dirección |
| IBAN | texto | O | vacío | normalización básica | perfil + snapshot | forma de pago/PDF |
| Logo | file | O | ninguno; PNG/JPG/WebP ≤2 MB | MIME/tamaño | perfil, guardado inmediato | PDFs futuros; borrar no cambia snapshots emitidos |
| Validez presupuesto | número | O | 30; 0–365 | entero/rango | perfil | fecha automática futura; 0 desactiva |
| Métodos de pago por tipo | textos repetibles + default | O | catálogo normalizado | no vacío; default existente | perfil | selector y PDF de documentos futuros |
| Frases/notas por tipo | textos repetibles + default | O | catálogo normalizado | trim | perfil | autorrelleno de futuros documentos |
| Unidades | checkboxes + default | R al menos una | catálogo base | no dejar conjunto vacío; default habilitada | perfil | líneas futuras |
| Familia con incremento | texto/datalist | O | vacío | familia existente/revisable | perfil | precio sugerido; renombrado tiene P2 |
| Incremento % | número | C regla | 0; 0–300 | rango | perfil | PVP sugerido |
| Año numeración | número | R | año actual; 2000–2100 | rango | perfil | contadores/formato |
| Formato por documento | texto | R | plantilla por tipo | debe contener `{num}`; `{year}` opcional | perfil | número visible futuro |
| Último número usado | entero | R | máximo detectado/0 | 0–999999; no colisionar | perfil | siguiente número |
| Exento de IVA | checkbox | O | falso | booleano | perfil | fuerza IVA 0 en documentos/gastos futuros |
| Tipos IVA | lista numérica | R si no exento | 0/4/10/21; default 21 | 0–100, sin duplicados, mínimo uno | perfil | selectores/cálculo |
| Tipo IVA predeterminado | acción/radio | R | 21 | debe existir | perfil | nuevas líneas |
| IRPF estimado % | número | R | 20 | 0–100 | perfil | resumen/RR orientativos |
| VeriFactu activo/entorno | checkbox/select | O | desactivado/pruebas | entorno producción gated; cadena válida | perfil + servidor al registrar | emisión; revisar P1 de seguridad/legal |
| Tema | botones | O | sistema; claro/oscuro/sistema | opción cerrada | preferencia AppData | apariencia |
| Densidad | botones | O | cómoda; cómoda/compacta | opción cerrada | preferencia AppData | espaciado |
| Pantalla inicial | select | O | panel; destinos soportados | opción cerrada | preferencia AppData | logo/carga autenticada |
| Método email/WhatsApp | selects | O | preguntar | opción cerrada | preferencia AppData | compartir documentos |
| Reducir animaciones | checkbox | O | falso | booleano | preferencia AppData | transiciones/scroll |

Acciones: Guardar configuración normaliza y persiste todos los bloques salvo logo/diseñador, que guardan de inmediato; añadir/quitar IVA, unidad, método, frase o regla debe explicar errores y confirmar una eliminación con efecto global; cambiar perfil solo afecta documentos futuros salvo los fallbacks legacy marcados como P1.

### Diseñador de plantillas

| Campo/control | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Estilo | botones | R | Clásico/Editorial/Futuro | gate Pro; opción cerrada | perfil inmediato | maquetación PDF futura |
| Color de marca | botones | R | azul/esmeralda/carbón/coral | opción cerrada | perfil | PDF |
| Fuente | botones | R | moderna/limpia/clásica/técnica | opción cerrada | perfil | PDF |
| Tamaño texto general/títulos/emisor/total | botones por bloque | R | pequeño/normal/grande | opción cerrada | perfil | jerarquía PDF |
| Densidad | botones | R | compacta/normal/amplia | opción cerrada | perfil | filas/espacio PDF |
| Mostrar logo | checkbox | O | activo | booleano | perfil | PDF si existe logo |
| Caja para emisor | checkbox | O | activo | booleano | perfil | PDF |
| Caja forma de pago | checkbox | O | activo | booleano | perfil | PDF |
| Vista previa grande | acción/overlay | O | cerrada | no persiste; debe ser diálogo accesible | estado UI | preview sintética, no documento real |

Acciones: cada selector guarda inmediatamente para PDFs futuros; Activar Pro abre upgrade sin cambiar plantilla; Vista previa grande abre/cierra un overlay y debe aceptar Escape, click fuera y restaurar foco; cerrar no deshace los cambios ya auto-guardados. Error de persistencia debe dejar visible el último estado confirmado y ofrecer reintento.

### Cuenta, nube, copias y plan

| Campo/control | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Modo acceso | tabs/botones | O | entrar; entrar/crear/restablecer | opción conocida | estado UI | cambia formulario |
| Email | email | R | vacío | trim/formato/backend | identidad Supabase | sesión/confirmación |
| Contraseña | password | R salvo OAuth/reset email | vacío | alta/nueva ≥12; login valida backend | solo proveedor de identidad | acceso; nunca AppData |
| Repetir contraseña | password | C recuperación | vacío | igualdad exacta | identidad | actualiza credencial |
| Código invitación | texto | O | vacío/mayúsculas | backend, una vez por cuenta | backend | bono/referido |
| Aceptar términos/privacidad | checkbox | C alta | desmarcado | obligatorio | consentimiento de alta | crea cuenta |
| CAPTCHA | widget | C si configurado | vacío | token vigente | efímero | autoriza petición |
| Código MFA | texto numérico | C enrolar/verificar | vacío | 6 dígitos/backend | factor Supabase | eleva sesión |
| Frecuencia Drive | select | O | manual; manual/diaria/documentos o gastos/cada cambio | sesión y email confirmados, permiso Google | ajustes/token locales | programa copia cuando app abierta |
| Archivo restauración | file JSON | C restaurar | ninguno | parse/esquema compatible | reemplaza AppData | restauración total |
| Confirmo sustituir local | checkbox | C restaurar | desmarcado | obligatorio | estado UI | habilita restauración |
| Confirmo copia previa | checkbox | C restaurar | desmarcado | obligatorio | estado UI | evidencia preventiva |

#### Acciones de cuenta

| Acción | Consecuencia | Confirmación/deshacer/error |
|---|---|---|
| Crear/entrar/Google/restablecer/reenviar confirmación | cambia identidad/sesión; reset envía enlace | CAPTCHA/legal/política; errores inline; OAuth cancelable |
| Elegir destino de datos locales tras login | subir a cuenta, descargar antes o mantener local | elección explícita; no borrar datos silenciosamente |
| Sincronizar ahora | push/pull del workspace | estado pendiente/éxito/error y conflicto explicados |
| Reparar desde nube | sobrescribe copia local | confirmación fuerte; backup previo; sin undo automático |
| Cerrar sesión | termina sesión | no borra datos locales |
| Activar/verificar/desactivar MFA | añade o elimina factor | secreto/QR y códigos de recuperación; desactivar requiere sesión elevada/confirmación |
| Exportar JSON | descarga AppData | no muta; aclarar que preferencias RR locales no están incluidas |
| Restaurar JSON | reemplaza AppData | dos checks + backup previo; sin undo automático |
| Conectar/reconectar/guardar Drive | OAuth o sube copia | cuenta confirmada; warning de limpieza; no modifica AppData |
| Desconectar Drive | borra token local y pasa a manual; remotos permanecen | reversible reconectando; no debe sugerir que borra Drive |
| Gestionar plan/tarjeta | abre portal Stripe | pago solo en Stripe; cancelación externa no cambia datos de producto |
| Copiar/compartir/canjear invitación | portapapeles/share o bono | compartir cancelable; backend explica usado/inválido |

### Importación de otros programas

| Campo/control | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Programa de origen | select | R | auto; PC Facturación 3/FacturaDirecta/Holded en validación/documentos genéricos; PrestaShop y CSV deshabilitados | plan Pro; opción disponible | estado UI | selecciona parser y limpia preview |
| Pack FacturaDirecta | file múltiple | C origen | CSV/XLS(X)/PDF/XSIG/XML/DAT/ZIP | ≥1; parser/avisos | no hasta aplicar | preview de entidades/unsupported |
| Documentos genéricos | file múltiple | C origen | XLS(X)/DOCX/PDF | ≥1; confianza; no replica adjunto/maquetación | no hasta aplicar | preview documental |
| Excel Holded | file | C origen | XLS(X) | compatibilidad declarada en validación | no hasta aplicar | preview contactos/productos/docs/gastos |
| Archivo principal PCF/auto | file | C origen | MDB | requerido/legible | no hasta aplicar | preview |
| Auxiliar PCF | file | O | DWI | legible; fallo no bloquea principal | no hasta aplicar | numeración detectada |
| Incluir clientes sin documentos | checkbox | O PCF | falso | booleano | opción de importación | amplía clientes |
| Facturas impagadas | radio | C si detectadas | mantener; mantener/marcar pagadas | elegir una | opción de importación | estados de facturas |
| Aplicar ajustes detectados vacíos | checkbox | C si hay sugerencia | falso | nunca pisar valor existente; IVA sin duplicar | mezcla perfil al aplicar | empresa/fiscalidad futura |
| Consentimiento revisión IA | aceptación | C para IA | no aceptado | cuenta/plan/cuota | preferencia + request | permite segunda revisión, no aplica cambios |

Acciones: seleccionar o pulsar Analizar recalcula el preview sin persistir; Mejorar con IA consume una unidad y no aplica datos; Importar a esta cuenta usa el resultado revisado, reemplaza importaciones previas del mismo origen y conserva manuales según el parser, pero actualmente no ofrece modal de confirmación ni undo. El manual debe pedir backup sintético previo y explicar exactamente qué colección se sustituye.

### Rentabilidad Real — marketplace, test y validación

Todo lo marcado `Local/RR` se guarda solo en claves propias del navegador; no forma parte de AppData, nube ni backup JSON general. Activar/desactivar módulos no borra facturas, gastos o impuestos.

| Pregunta/control | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| ¿Qué eres? | opción única | O | sin respuesta; autónomo/S.L.-S.L.U./comunidad de bienes/sociedad civil/no sé | una opción | Local/RR | scoring, perfil, casos futuros |
| Cómo cobras/presupuestas | multi | O | ninguna; horas/trabajo cerrado/proyecto/visitas/iguala/instalación con material/solo mano de obra | conjunto conocido | Local/RR | recomienda calculadora trabajo/horas |
| Empleados en nómina | opción única | O | sin respuesta; sí/no/no sé | una opción | Local/RR | scoring/módulo futuro |
| Local/oficina/taller | opción única | O | sin respuesta; sí/no | una opción | Local/RR | fijos/activos sugeridos |
| Materiales/productos/stock | multi | O | ninguna; ninguno/por trabajo/cliente compra/comprar e instalar/material habitual/stock/tienda/e-commerce | “ninguno” excluye el resto | Local/RR | separa materiales de stock futuro |
| Vehículos de trabajo | multi | O | ninguna; ninguno/furgoneta/coche/moto/renting/camión/taxi-VTC | “ninguno” excluye el resto | Local/RR | scoring/aviso fiscal/activos |
| Herramientas/equipos relevantes | opción única | O | sin respuesta; sí/no | una opción | Local/RR | módulo de activos |
| Régimen de módulos | opción única | O | sin respuesta; sí/no/no sé | una opción | Local/RR | advertencias/fase futura |
| IVA normal | opción única | O | sin respuesta; sí/no/no sé | una opción | Local/RR | perfil orientativo |
| Retención en facturas | opción única | O | sin respuesta; sí/no/no sé | una opción | Local/RR | perfil orientativo |
| Qué quiere analizar | multi | O | ninguna; trabajos/horas/proyectos/clientes/documentos/servicios/precio mínimo | conjunto conocido | Local/RR | recomendaciones |
| Estado de revisión con gestor | botones | O | pendiente; pendiente/validado/corregido/sin validar | opción conocida | Local/RR | estado informativo, no valida fiscalidad |

#### Acciones del hub/test

| Acción | Consecuencia | Confirmación/deshacer/error |
|---|---|---|
| Ver resultado | normaliza respuestas, calcula nivel/recomendaciones y guarda Local/RR | permite test incompleto; rehacer sobrescribe |
| Activar recomendados/módulo | activa Base y capacidades permitidas | gate Pro+/próximamente; confirmar si deshabilita dependencias; no borra AppData |
| Desactivar módulo | cambia capacidades visibles | Base no se apaga con dependientes; confirmación solo si hay impacto; histórico local permanece |
| Restablecer configuración | borra test, módulos, ajustes y preferencias RR locales | `confirm`; sin undo; no toca documentos/gastos/impuestos |
| Copiar resumen para gestor | copia texto orientativo | no muta; debe informar fallo de portapapeles |
| Marcar validado/corregido/sin validar | actualiza estado local | reversible eligiendo otro estado; no equivale a aprobación profesional |

### Rentabilidad Real — calculadora de trabajo/obra

| Campo/control | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Origen | botones | R | presupuesto si existe; presupuesto/factura | debe existir documento | memoria de pantalla | fuente de ingreso/líneas |
| Buscar documento | search | O | vacío; número/cliente/estado/importe | máximo 8 visibles | Derivado | filtra selector |
| Documento | listbox | R | primero disponible | no obsoleto/rectificado | memoria | cálculo reactivo |
| Modo de análisis | select | R | auto; obra/instalación/visita/simple | opción cerrada | Local/RR por `documentId` | informes/evolución |
| Reparto de fijos | botones | R | no imputar; no/manual/facturación mensual/trabajos/horas | opción cerrada | Local/RR | gasto fijo imputado, nunca contabilidad |
| Importe manual | moneda | C método manual | vacío | finito ≥0 | Local/RR | fijo imputado |
| Facturación mensual sin IVA | moneda | C método facturación | vacío | >0 para reparto | Local/RR | denominador |
| Trabajos del mes | número | C método trabajos | vacío | >0 | Local/RR | denominador |
| Horas del trabajo/mes | números | C método horas | vacío | ambos >0 | Local/RR | denominador |
| Provisión IRPF % | número | O | 20 | finito ≥0; vacío vuelve a 20 | Local/RR | reserva orientativa |
| Fijos candidatos | checkboxes | O | todos si nunca se eligió | IDs existentes | Local/RR | incluye/excluye solo del cálculo |
| Buscar producto/línea | texto | O | vacío | texto | estado UI | filtra candidatos de gasto |
| Proveedor candidato | select | O | todos | proveedor derivado | estado UI | filtra candidatos |
| Importe aplicado por gasto | moneda | O | base completa | 0…base; redondeo; inválido→0 | Local/RR override | reparto parcial; no cambia gasto |
| Ajuste interno · concepto | texto | O | “Ajuste interno no fiscal” al guardar vacío | trim/fallback | Local/RR ligado a fuente | etiqueta |
| Ajuste interno · importe | moneda | R si ajuste | vacío | >0 | Local/RR | resta solo rentabilidad interna |
| Ajuste interno · categoría | select | R | otro; ayuda/no deducible/salida caja/merma/otro | opción cerrada | Local/RR | advertencia; nunca libros/IVA/IRPF |
| Ajuste interno · nota | textarea | O | vacío | texto | Local/RR | contexto |

Acciones: seleccionar/reclasificar recalcula sin guardar un resultado; Asignar/Desvincular gasto pide confirmación y sí cambia `Expense.workDocumentId` en AppData, aunque no importe/IVA/proveedor; ocultar/recuperar candidatos es reversible y local; Aplicar todo quita el override; añadir/editar ajustes guarda Local/RR y eliminar actualmente no confirma ni ofrece undo.

### Rentabilidad Real — calculadora de horas/proyecto

| Campo/control | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Fuente | botones | R | documento; documento/manual local | fuente válida | Local/RR | manual no crea AppData |
| Factura/presupuesto | select | C documento | primero disponible | entidad vigente | Local/RR selección | ingreso/coste inicial |
| Cómo analizar | select | R | horas/proyecto; horas/iguala/simple | opción cerrada | Local/RR por documento | informes |
| Modelo de cobro | botones | R | por horas; horas/proyecto cerrado/iguala | opción cerrada | Local/RR | fórmula/etiquetas |
| Nombre proyecto | texto | O manual | vacío | texto | Local/RR | etiqueta |
| Cliente opcional | texto | O manual | vacío | texto | Local/RR | agrupación visual |
| Ingreso sin IVA | moneda | C manual | vacío | finito ≥0 | Local/RR | cálculo |
| IVA aplicado % | porcentaje | O manual | perfil/vacío | finito ≥0 | Local/RR | posición IVA orientativa |
| Costes directos manuales | filas moneda | O manual | ninguna | >0 conserva fila; ≤0 la elimina | Local/RR | margen |
| Horas facturadas | número | O | vacío | finito ≥0 | Local/RR | tarifa efectiva |
| Horas reales trabajadas/totales | números | O | vacío | finito ≥0; total puede sobrescribir suma | Local/RR | rentabilidad/hora |
| Horas no facturables/reuniones/revisiones/administración | números | O | vacío | finito ≥0 | Local/RR | coste temporal real |
| Provisión IRPF % | número | O | 20 | vacío→20; finito ≥0 | Local/RR | reserva |
| Regla de fijos | botones | R | por horas; no/manual/horas/facturación | opción cerrada | Local/RR | fijo imputado |
| Importe manual/horas mensuales/facturación mensual | números | C según regla | vacío | ≥0; faltante avisa y usa 0 | Local/RR | reparto |
| Fijos del proyecto | checkboxes | O | ninguno | IDs existentes | Local/RR | incluye en cálculo |

Todos los cálculos son reactivos y se auto-guardan como ajustes; no existe “Guardar resultado”. Seleccionar todos/ninguno es reversible; los ajustes internos siguen las mismas reglas que en trabajo/obra.

### Rentabilidad Real — informes

| Campo/control | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Periodo | select | O | todo; todo/mes/trimestre/personalizado | opción cerrada | Local/RR | filtro |
| Tipo documental | select | O | ambos; ambos/facturas/presupuestos | opción cerrada | Local/RR | unidades de análisis |
| Reparto de fijos | select | O | no imputar; no/configuración/facturación periodo | opción cerrada; avisa si falta regla | Local/RR | métricas |
| Modo de análisis | select | O | todos; todos + modos + no definido | opción cerrada | Local/RR | filtro |
| Desde/Hasta | fechas | C personalizado | vacías | ISO; falta validación visible de orden | Local/RR | filtro |
| Incluir presupuestos sin factura | checkbox | O | activo | booleano | Local/RR | unidades previstas |
| Incluir ajustes internos | checkbox | O | activo | booleano | Local/RR | métricas internas |
| Umbral margen bajo % | número | O | 15 | finito ≥0; vacío→15 | Local/RR | calidad/alertas |
| Provisión IRPF % | número | O | 20 | finito ≥0; vacío→20 | Local/RR | estimación |
| Modo para visibles sin definir | select + acción | C si hay filas | obra; modos conocidos | solo documentos visibles | Local/RR por documento | asignación masiva |
| Modo por fila | select | O | actual/no definido | opción cerrada | Local/RR por documento | recalcula informes |

Filtros y modos se guardan localmente; los resultados no. Asignar a visibles no pide confirmación, pero es reversible; enlaces Calcular/Revisar/Clientes solo navegan.

### Rentabilidad Real — evolución

| Campo/control | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Agrupar | select | O | mensual; mensual/trimestral/cliente/modo | opción cerrada | estado UI | filas/gráfico |
| Desde/Hasta | fechas | O | vacías | fecha inválida se descarta | estado UI | filtro |
| Modo | select | O | todos | opción conocida | estado UI | filtro |
| Cliente | select | O | todos | ID existente | estado UI | filtro |
| Gastos fijos | select | O | hereda informes; no/configurada/facturación | opción cerrada | estado UI | cálculo |
| Incluir presupuestos/ajustes/solo margen bajo | checkboxes | O | sí/sí/no | booleanos | estado UI | filtro |

“Ver todo” limpia fechas; el cálculo es reactivo y no persiste filtros/resultados ni modifica documentos. La tabla requiere alternativa móvil documentada.

### Rentabilidad Real — simulador de precio mínimo

| Campo/control | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Tipo de simulación | botones | R | trabajo; hora/trabajo/proyecto/mensual | opción cerrada | Local/RR | unidad de resultado |
| Datos de partida | botones | R | manual; manual/documento | opción cerrada | Local/RR | documento solo precarga |
| Factura/presupuesto | select | C documento | primero válido | entidad vigente | Local/RR | ingreso/costes/IVA iniciales |
| Objetivo | select | R | por trabajo; trabajo/hora/mensual | opción cerrada | Local/RR | unidad de beneficio |
| Beneficio objetivo | moneda | R | 300 | NaN/≤0→0 | Local/RR | precio recomendado |
| Costes directos estimados | moneda | O | 0 | ≥0 | Local/RR | precio mínimo |
| Ajustes internos previstos | moneda | O | 0 | ≥0 | Local/RR | coste interno, no fiscal |
| Horas reales estimadas | número | C por hora | 8 | >0 para cálculo | Local/RR | precio/hora |
| Trabajos previstos al mes | número | C reparto/mensual | 10 | >0 | Local/RR | reparto/volumen |
| Gastos fijos mensuales | moneda | O | detectado o 0 | ≥0 | Local/RR | estructura |
| Cuota autónomo manual | moneda | O | 0 | ≥0 | Local/RR | estructura |
| Cuota ya incluida | checkbox | O | activo | booleano | Local/RR | evita doble conteo |
| Regla reparto fijos | botones | R | sin reparto; no/manual/trabajos/horas/facturación | opción cerrada | Local/RR | fijo por unidad |
| Fijo imputado/horas facturables/facturación prevista | números | C por regla | 0/120/0 | >0 donde es denominador | Local/RR | reparto |
| Margen deseado % | número | O | 15 | ≥0 | Local/RR | precio |
| Provisión IRPF % | número | O | 20 | ≥0; fórmula limita <100 | Local/RR | reserva |
| IVA aplicable % | número | O | 21 | ≥0 | Local/RR | total con IVA |
| Precio medio por trabajo/costes directos mensuales | números | C mensual | 0 | ≥0; precio 0 avisa | Local/RR | trabajos necesarios/objetivo |

“Usar detectados” copia fijos a los campos locales; cada cambio recalcula y auto-guarda. No existe Guardar resultado ni mutación de AppData.

### Admin — manual interno

El acceso exige nube, sesión y capacidades devueltas por servidor. `fullAdmin` habilita Panel, Usuarios, Supabase, Vercel, Seguridad y Errores; una cuenta limitada a aprendizaje solo ve IA. Cuando MFA admin es obligatorio, las operaciones sensibles deben quedar bloqueadas hasta AAL2.

**Actualización AUD-P1-20 (2026-07-11):** crear copias y obtener su vista
previa siguen disponibles. La aplicación está retirada de la UI y bloqueada en
la API; todo el perímetro exige AAL2 y un intento directo termina fail-closed
sin mutar la cuenta.

| Pantalla/campo | Tipo | Req. | Inicial/permitidos | Validación | Persistencia | Efecto |
|---|---|---|---|---|---|---|
| Sección | 7 botones/query | O | Panel; Panel/Usuarios/Supabase/Vercel/Seguridad/Errores/IA | solo capacidad autorizada | vista; alerta vista en localStorage | cambia dashboard sin mutar servidor |
| Log para soporte/Codex | textarea readonly | — | texto saneado | omitir tokens/IP y PII innecesaria | ninguno | seleccionar/copiar diagnóstico |
| Buscar usuario | search | O | vacío; email/plan/estado/proveedor | trim/minúsculas | estado UI | filtra hasta 100 cargados |
| Plan | select por usuario | R | actual; free/trial/pro/pro_plus | servidor normaliza inválido | suscripción servidor al guardar | límites/acceso |
| Estado | select por usuario | R | actual; inactive/trialing/active/past_due/canceled | opción conocida; inválido→inactive | suscripción | acceso/copy |
| Fin de prueba | fecha | O | actual/vacío | fecha válida o null | suscripción | trial |
| Fin de periodo | fecha | O | actual/vacío | fecha válida o null | suscripción | ciclo |
| Escaneos de prueba | entero | O | actual | floor, ≥0; inválido→0 | suscripción/uso | cuota |
| Créditos IA extra | entero | O | actual | floor, ≥0 | suscripción/uso | saldo extra |
| Sin límite IA/scan | checkbox | O | según centinela | booleano; ignora créditos al activar | centinela servidor | elimina bloqueo y permite lotes >10 |
| Motivo de baneo | texto | O | vacío/actual | trim, vacío→null | solo al banear | audit/control |
| Nombre de copia restore | texto | R para crear | “Copia soporte admin” | no vacío, normalizado, ≤120 | snapshot privado | etiqueta |
| Motivo restore | texto | O | vacío | trim, ≤500 | snapshot privado | contexto interno de la copia |
| Copia disponible | select | R preview | primera de hasta 20 | pertenece al usuario | selección UI | fuente de vista previa |
| Aplicar restore | bloque informativo | — | bloqueado | AAL2 primero; después fail-closed | ninguna | requiere futura transacción/RPC o saga segura |
| Código MFA del usuario | texto numérico | R para quitar factor | vacío | 6 dígitos, TTL 15 min, máx. 5 intentos | challenge de soporte | autoriza borrado factor |
| Confirmar email MFA | texto | R para quitar | vacío | igualdad exacta | no se guarda | segunda guardia |
| Código MFA admin | texto numérico | R enrolar/verificar | vacío | TOTP/challenge backend | factor Supabase/sesión AAL2 | habilita administración |
| Archivo IA aprendizaje | file/scan | R para lectura | imagen/PDF + consentimiento | gates/tamaño/tipo/cuota | estado UI/request | no crea gasto; puede consumir IA |
| Qué está mal | textarea | R para corregir | vacío | trim; request acotada | request/estado UI | guía corrección estructural |

#### Acciones Admin

| Acción | Aparece cuando | Consecuencia | Confirmación/deshacer/error |
|---|---|---|---|
| Actualizar usuarios | sección Usuarios | recarga hasta 100 y descarta edición no guardada | sin confirm; error visible |
| Guardar suscripción | tarjeta usuario | upsert plan/estado/fechas/cuotas y `updated_by` | sin confirm ni undo UI; normalización servidor |
| Rellenar IA mensual 100% | tarjeta usuario | reinicia consumo mensual, no créditos extra | sin confirm/undo; auditar actor |
| Banear/Quitar baneo | tarjeta usuario | ban largo o reactivación y metadata | sin confirm; reversible; motivo opcional |
| Crear copia actual | restore abierto | snapshot privado desde nube | no cambia cuenta; error visible |
| Ver preview restore | copia elegida | diff por colección | solo lectura; no aplica cambios |
| Aplicar restauración | no aparece como acción | ninguna; API bloqueada | requiere AAL2 y devuelve `admin_restore_transaction_required` sin escrituras |
| Ver factores/Enviar código | soporte MFA | lista factores o envía challenge al usuario | requiere AAL2; TTL/rate limit/error |
| Quitar factor | factor + código + email | elimina MFA y audita | sin modal/undo; usuario debe reenrolar |
| Actualizar operaciones | panel operativo | carga errores/salud/Vercel/GitHub/dominio/WAF | solo lectura; degradación parcial explicada |
| Copiar log | panel | portapapeles o selección fallback | no muta; feedback temporal |
| Preparar/activar TOTP propio | admin sin AAL2 | enrola QR/secreto y verifica | pendiente hasta código correcto; no muestra borrado propio |
| Escanear prueba | IA autorizada | obtiene payload original/copia | no AppData; gates del scan |
| Corregir con IA | original + instrucción | devuelve payload corregido | no persiste aún; errores/rate limit |
| Guardar aprendizaje limpio | original + corregido | persiste patrón estructural si tabla activa | `saved:false` debe decir preparado, no guardado; sin undo UI |

Paneles de control, Supabase, Vercel, Seguridad y Errores son de solo lectura. Deben documentar fuente/frescura, estados parciales, redacción de usuarios, significado de cada nivel y que Errores no ofrece resolver/borrar.

## Relaciones entre módulos que el manual debe hacer explícitas

| Origen | Destino/relación | Regla que debe explicarse |
|---|---|---|
| Cliente | factura/presupuesto/recibo | el maestro rellena el borrador; al emitir queda snapshot y editar el maestro no debe cambiar el histórico |
| Proveedor | gasto/producto | `supplierId` enlaza; el gasto debe conservar identidad fiscal aunque el maestro se oculte/borre |
| Producto | línea documental | rellena descripción, unidad, precio, IVA y coste; editar texto comercial no debería perder el vínculo |
| Línea de compra | producto | puede aprender alias/coste solo con consentimiento por línea y nunca desde un abono |
| Presupuesto | factura | conversión crea borrador enlazado; no borra ni transforma el presupuesto |
| Factura cobrada | recibo | recibo se crea solo mediante acción explícita y no duplica ingreso |
| Factura emitida | rectificativa | conserva original y cadena; el periodo/signo deben quedar explicados tras corregir P1 |
| Gasto | documento de trabajo | `workDocumentId` afecta Rentabilidad Real; vincular/desvincular no cambia el valor fiscal del gasto |
| Gasto fijo | ocurrencias | plantilla genera gastos; editar con fecha efectiva crea tramo y no reescribe pasado |
| Configuración | documentos | la mayoría de cambios afectan futuros; un snapshot emitido debe permanecer congelado |
| Impuestos | documentos/gastos | consume solo entidades fiscales elegibles del periodo; no es una fuente independiente |
| Rentabilidad Real | AppData + Local/RR | lee documentos/gastos, pero modos, overrides y ajustes internos son locales y no fiscales |
| Importación | todas las colecciones | preview primero; reemplaza solo la importación previa del origen según parser y conserva manuales declarados |
| Cuenta/nube | AppData | sesión decide sincronización; cerrar sesión no equivale a borrar local |
| Backup JSON/Drive | AppData | copia el workspace general; hoy no incluye todas las claves Local/RR |

## Cobertura actual del manual y delta necesario

| Sección actual | Estado | Qué sí cubre | Delta obligatorio |
|---|---|---|---|
| `primeros-pasos` | parcial | entrada, ajustes, IVA/IRPF, navegación, PWA, cuenta | campos exactos, estados local/nube, accesibilidad móvil |
| `demo` | básica | entrar, recorrido, reiniciar/salir | aislamiento, límites, error/reinicio, datos sintéticos visibles |
| `inicio` | parcial | accesos, recordatorios, centro de avisos, resumen | periodo, tareas/equipo/voz/vínculos, todos los estados |
| `clientes` | parcial | alta, IA, buscar, unificar, selector | cada campo, duplicados, snapshots, borrar/reparar histórico |
| `facturas` | parcial | alta, borrador/emisión, lista, enviar, cobrar, recordar, rectificar | líneas/unidades, estados, vínculos, integridad, errores y rectificación propia |
| `presupuestos` | parcial | crear/enviar, aceptar, convertir, buscar | todos los estados, validez, rechazo/vencido, relaciones |
| `recibos` | parcial | automático y manual | formulario completo, estados, vínculo/borrado/PDF |
| `gastos` | parcial | alta básica, filtros, CSV, fijos | cuatro tipos, factura recibida, líneas, abono, scan/lote/inbox/resumen/fijos completos |
| `productos` | muy escasa | origen, revisar, editar, uso | todos los campos, familias/subfamilias, selector, masivo, matching, negativos |
| `impuestos` | bloqueada por P1 | resumen y exports | reescribir tras corrección fiscal con definiciones/casos por periodo |
| `proveedores` | escasa | alta/unificación | campos, compras/productos, email pendiente, borrado/referencias |
| `cuenta` | parcial | alta, confirmación, datos locales, sync, JSON, Drive | contraseña 12, MFA, plan/cuotas, conflictos, restore fuerte, referencias/privacidad |
| `configuracion` | parcial | navegación, frases, plantillas, numeración, VeriFactu, preferencias, copia | inventario completo y efecto futuro/histórico; no duplicar Copias antiguas |
| `importacion` | parcial | origen/archivo/auxiliar/aplicar | todos los orígenes, preview, unsupported, IA, reemplazo/backup/rollback |

Secciones nuevas mínimas: Avisos; Precios/planes/cuotas; Rectificativas; Escáner e inbox de gastos; Diseñador de plantillas; las ocho rutas de Rentabilidad Real; callbacks de autenticación/Drive; legal/VeriFactu; y un manual interno Admin separado del manual público.

## Auditoría de capturas existentes

| Captura | Estado observado | Acción |
|---|---|---|
| `cuenta-nube.png` | muestra mínimo de contraseña de 6; la política actual exige 12 | regenerar con copy actual y estado alta/reset |
| `ajustes-copia.png` | enseña exportación dentro de Ajustes; ahora Copias vive en Cuenta | sustituir y corregir enlace/contexto |
| `proveedores-nuevo.png` | el script no entra realmente en “Nuevo”; captura el listado | hacer click verificable y aserción de título/formulario |
| `proveedores-unificar.png` | prácticamente solo contiene el encabezado | preparar duplicados sintéticos y modal/panel completo |
| `clientes-seleccion.png` | prácticamente solo contiene el encabezado | abrir el selector con opciones sintéticas y foco visible |
| `facturas-recordatorio.png` | puede proceder del fallback de página completa | prohibir fallback silencioso y exigir modal visible |
| restantes 26 PNG | existencia confirmada, contenido no validado por test | revalidar ruta, estado, fecha, viewport, tema y texto antes de conservar |

El generador actual usa un único viewport lógico de 720×1280 y tema claro. La cobertura objetivo por pantalla/estado canónico es:

| Matriz | Requisito |
|---|---|
| escritorio | 1440×900 claro y oscuro |
| portátil/tablet horizontal | 1024×768 claro y oscuro cuando cambie layout |
| tablet vertical | 768×1024 claro y oscuro cuando cambie layout |
| móvil | 390×844 claro y oscuro |
| datos | vacío, ejemplo sintético, dato largo, error, sin permiso/límite cuando aplique |
| interacción | foco visible, overlay abierto, scroll/tablas y teclado donde cambie la comprensión |

## Contrato de cada entrada futura del manual

Una pantalla no cuenta como cubierta hasta que su entrada contenga:

1. objetivo, ruta y requisitos previos;
2. todos los campos con etiqueta, tipo, obligatoriedad, valor inicial/opciones, validación y ejemplo sintético;
3. persistencia exacta: AppData/nube, servidor, Local/RR, sesión o solo derivado;
4. efecto sobre listas, otras pantallas, PDF, fiscalidad, caja y Rentabilidad Real;
5. todas las acciones con condición de aparición, consecuencia, confirmación, deshacer y error;
6. estados de carga, vacío, éxito, error, límite, sin permiso, demo, claro/oscuro y móvil;
7. relaciones y excepciones históricas: borrador frente a emitido, snapshot, rectificación y borrado;
8. capturas verificadas para los breakpoints aplicables y datos únicamente sintéticos;
9. enlace contextual ida/vuelta desde la pantalla;
10. test que falle si desaparece el control, cambia el contrato o la captura no representa el estado anunciado.

## Criterio de cobertura automatizada

El verificador futuro debe fallar, no solo avisar, si ocurre cualquiera de estos casos:

- una ruta UI no tiene sección o exclusión motivada;
- un campo/acción inventariado no tiene ancla estable en el manual;
- una captura falta, tiene dimensiones inesperadas, es demasiado uniforme/pequeña, usa fallback o no contiene el marcador de estado esperado;
- se regenera con otra ruta, tema o viewport sin actualizar metadata;
- el manual afirma un valor inicial/validación distinto al contrato probado;
- una sección fiscal se publica mientras el test de regresión del P1 asociado no pasa;
- aparece texto, email, NIF, token o documento no sintético.
