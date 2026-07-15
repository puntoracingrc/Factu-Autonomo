# Corpus de variantes reales v1

Este directorio contiene el esquema público y, en el futuro, únicamente manifiestos y fixtures que hayan superado la política de admisión. En esta entrega no hay PDF reales ni anonimizados disponibles.

Un documento no se considera evidencia real por estar en este directorio. Debe tener `sourceClass` `REAL_ANONYMIZED` u `HOLDOUT`, autorización registrada, revisión humana de todas las capas, dos revisores, hash coincidente y un resultado de admisión sin bloqueos.

Los corpus anteriores bajo `test/fixtures/tax-model-diagnostic/` son sintéticos e inmutables. No se copian ni se reclasifican aquí.

Los holdouts privados no deben publicarse como artefactos de CI ni aparecer en logs. El validador solo informa de identificadores canónicos, hashes y recuentos; nunca de valores extraídos.
