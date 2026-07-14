# Reconciliación temporal y documental

La reconciliación conserva todas las fuentes. No aplana documentos a un único
valor ni elimina la evidencia anterior.

Prioridad para situación actual:

1. certificado oficial actual;
2. vistas actuales de Mis datos censales;
3. 036 presentado con fecha posterior;
4. documento TGSS actual para Seguridad Social;
5. confirmación expresa de cambios posteriores;
6. declaración del periodo;
7. resumen anual;
8. declaración histórica;
9. borrador;
10. inferencia.

Una fuente más reciente puede añadir `supersededBy` a otra anterior. Dos
fuentes contemporáneas incompatibles se conservan con `CONFLICT` y generan una
pregunta de resolución. Las reconciliaciones blandas avisan; no rechazan el
documento.

La situación censada y la realidad confirmada se conservan separadas. Si no
coinciden, el resultado es `CENSUS.MISMATCH`, nunca una corrección silenciosa.
