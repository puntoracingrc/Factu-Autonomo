# Privacidad de los extractores fiscales

- El archivo, sus bytes, texto nativo, OCR, coordenadas y nombre permanecen en
  memoria del dispositivo y no se envían ni se guardan.
- El nombre del archivo no forma parte del contrato persistible: puede contener
  NIF o nombres.
- NIF/NIE, nombres y referencias solo pueden mostrarse enmascarados en el sobre
  efímero.
- CSV impreso, NRC, cuentas bancarias, direcciones, contrapartes y texto fiscal
  completo no se persisten como evidencia del diagnóstico.
- Solo los hechos mínimos seleccionados y confirmados por el usuario pueden
  atravesar la frontera de persistencia.
- Las métricas aceptan tipos cerrados y contadores, nunca contenido, nombre de
  archivo, OCR, importes, coordenadas ni mensajes derivados del documento.
- No se usan documentos reales como fixtures. Las pruebas son sintéticas.
- Los recursos de OCR se sirven desde la propia aplicación y el reconocimiento
  se ejecuta en el navegador; no se llama a un servicio OCR externo.

El navegador puede conservar hechos confirmados en el perfil local y, si el
usuario tiene sincronización, incorporarlos a sus copias. Por eso el adaptador
de persistencia debe ser una allowlist mínima y separada del resultado bruto.
