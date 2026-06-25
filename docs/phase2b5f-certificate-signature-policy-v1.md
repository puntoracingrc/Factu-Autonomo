# Politica documental de certificados y firma VeriFactu 2B.5F

Fase:

`PHASE2B5F_CERTIFICATE_SIGNATURE_POLICY_V1`

Estado:

`POLITICA DOCUMENTAL / NO IMPLEMENTACION`

Base previa:

- `docs/phase2b5a-official-xml-qr-research-v1.md`
- `docs/phase2b5e-official-artifacts-registry-v1.md`
- `docs/phase2b5d-xml-source-schema-canonicalization-v1.md`
- `docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md`

## Objetivo

Este documento define una politica documental futura para certificados y firma.
No autoriza ni implementa ninguna operacion criptografica real.

Este documento confirma:

- no se usan certificados reales;
- no se cargan PFX/PKCS#12 reales;
- no se firma nada;
- no se crea firma XAdES real;
- no se almacenan claves privadas;
- no se imprimen secretos;
- no se conecta AEAT.

La finalidad es fijar una frontera de seguridad antes de cualquier fase futura
que valore firma, certificados, custodia, secretos o entornos autorizados.

## 1. Frontera de seguridad

Cualquier uso de firma o certificado queda fuera de la implementacion actual.
La existencia de fuentes oficiales sobre firma no permite:

- cargar certificados en desarrollo;
- guardar claves privadas;
- firmar XML candidato;
- generar XAdES real;
- probar contra AEAT;
- mezclar entornos test y produccion;
- imprimir material sensible en logs;
- tratar un mock, digest o payload candidato como firma oficial.

El bloque 2B.4 es local/staging y no transportable. Los documentos 2B.5A-D y
2B.5E son investigacion, contrato, plan y registro documental. Ninguno de ellos
habilita firma real.

## 2. Riesgos

| Riesgo | Impacto | Mitigacion documental | Bloquea implementacion |
| ------ | ------- | --------------------- | ---------------------- |
| Exposicion de clave privada | Compromiso irreversible de identidad o capacidad de firma. | No cargar ni almacenar claves reales; definir custodia segura antes de codigo. | SI |
| Carga de certificado real en desarrollo | Uso accidental en entorno no autorizado. | Prohibir PFX/PKCS#12 reales en local; usar solo mocks o certificados ficticios aprobados en fase futura. | SI |
| Uso de certificado sin autorizacion | Firma atribuible sin aprobacion del titular o responsable. | Exigir autorizacion explicita, control de acceso y trazabilidad. | SI |
| Logs con material sensible | Exposicion de secretos, claves, certificados, XML completo o respuestas. | Politica de no impresion; usar digests y resumenes minimos. | SI |
| Mezcla de entorno test/produccion | Envio, firma o credencial en entorno equivocado. | Separacion estricta local/staging/test/produccion y etiquetas de entorno. | SI |
| Firma de XML no definitivo | Crear evidencia criptografica sobre estructura incorrecta. | Bloquear firma hasta XML, esquema, canonicalizacion y validaciones fijadas. | SI |
| Custodia sin control | Acceso excesivo, copia no trazada o perdida de material. | Definir almacenamiento seguro, permisos minimos y auditoria. | SI |
| Rotacion no definida | Persistencia de credenciales antiguas o comprometidas. | Documentar proceso de rotacion antes de usar certificados. | SI |
| Revocacion no contemplada | Continuidad de uso tras baja, fuga o cambio de responsable. | Definir revocacion, bloqueo y reconciliacion operativa. | SI |

## 3. Politica futura de custodia

Una fase futura de custodia debera definir como minimo:

- almacenamiento seguro de certificados y claves;
- cifrado en reposo y en transito cuando aplique;
- permisos minimos por rol y entorno;
- separacion entre local, staging autorizado, test autorizado y produccion;
- control de acceso por responsable autorizado;
- auditoria de acceso y uso;
- rotacion programada y rotacion por incidente;
- revocacion y bloqueo de material comprometido;
- no exposicion en cliente;
- no logs de secrets, certificados, claves privadas, passphrases, XML completo
  ni respuestas externas reales;
- procedimiento de alta/baja de responsables;
- procedimiento de recuperacion sin copiar claves a ubicaciones no controladas;
- inventario versionado de decisiones, sin adjuntar secretos.

Esta politica futura debera tratar los certificados como material sensible de
alto riesgo. No debera depender de convenciones informales ni de archivos
locales sin control.

## 4. Criterios antes de implementar firma

Antes de cualquier codigo de firma debe existir:

- revision legal/fiscal;
- revision de especificacion oficial;
- politica de certificados aprobada;
- entorno de test autorizado;
- mecanismo de secretos aprobado;
- pruebas con certificado ficticio o mock, nunca real;
- XML definitivo validado para el alcance de la prueba;
- canonicalizacion y esquema fijados;
- estrategia de no impresion de XML completo ni material sensible;
- aprobacion explicita.

Si cualquiera de estos puntos falta, la firma queda bloqueada.

## 5. Limites

Este documento confirma:

- no certificado real;
- no firma real;
- no XML definitivo;
- no transporte;
- no AEAT real;
- no produccion.

Tambien confirma:

- no PFX/PKCS#12 real;
- no clave privada;
- no passphrase;
- no XAdES real;
- no service role impreso;
- no secreto impreso;
- no respuesta AEAT real.

2B.5F solo cierra una politica documental de frontera. No desbloquea firma,
certificados, XML final, transporte, AEAT real ni produccion fiscal.
