# Diagnóstico de modelos tributarios

## Objetivo y ubicación

El configurador vive en `/consultor-fiscal/diagnostico` y es la primera opción del menú interno de **Asesoría fiscal** cuando `NEXT_PUBLIC_TAX_MODEL_DIAGNOSTIC_ENABLED=true`. La entrada general de Asesoría fiscal también abre esta ruta mientras el módulo está habilitado; con el flag cerrado conserva `/consultor-fiscal/modelos` como fallback.

Su objetivo es orientar qué modelos puede necesitar una persona, sociedad o entidad a partir de hechos confirmados. No presenta declaraciones, no modifica el censo, no calcula cuotas y no sustituye a un profesional.

## Alcance de la primera versión

- Ejercicios 2025 y 2026.
- Territorio común AEAT.
- Persona física, sociedad, comunidad de bienes, sociedad civil y otras entidades diferenciadas.
- Actividad personal y actividad de sociedad separadas.
- IRPF, IVA, retenciones, operaciones UE/OSS, operaciones con terceros y obligaciones personales complementarias.
- Códigos: 035, 036, 100, 111, 115, 123, 130, 131, 180, 184, 190, 193, 200, 202, 216, 296, 303, 308, 309, 341, 347, 349, 369, 390, 714, 720 y 721.

Canarias, Navarra, País Vasco, Ceuta, Melilla y no residentes fallan cerrado: no reciben una lista estatal de IVA. Deben contar con reglas territoriales propias antes de habilitarse.

## Flujo de uso

1. La persona responde los bloques A–N. `No lo sé` es una respuesta explícita y nunca se convierte en `No`.
2. Opcionalmente añade un certificado de situación censal o modelo 036 con texto nativo. El PDF se procesa localmente y no se conserva.
3. Revisa cada propuesta documental y confirma identidad, vigencia y campos elegidos.
4. Confirma expresamente el conjunto de respuestas.
5. El motor puro genera una decisión por cada código, separando sujeto, estado, motivo, evidencia, datos pendientes, períodos, próxima acción y fuentes.

## Estados internos

- `CONFIRMED_BY_CENSUS`: los hechos y el censo confirmado coinciden.
- `DERIVED`: los hechos confirmados activan la regla.
- `CONDITIONAL`: existe un indicio, pero la conclusión depende de condiciones adicionales.
- `NOT_APPLICABLE`: hay una exclusión explícita y trazable.
- `NEEDS_INFORMATION`: faltan hechos.
- `NEEDS_PROFESSIONAL_REVIEW`: el supuesto necesita clasificación o umbrales fuera del alcance automático.
- `CENSUS_MISMATCH`: hechos y situación censal confirmada no concuerdan.
- `TERRITORY_NOT_SUPPORTED`: no existe un ruleset territorial compatible.

Las reglas están en estado `PENDING_FISCAL_REVIEW`. El flag de producción debe permanecer cerrado hasta que todas las reglas del ejercicio estén aprobadas y el QA de dominio de producción sea verde.

