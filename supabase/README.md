# SQL en Supabase — orden y qué ejecutar

## Instalación nueva (proyecto vacío)

1. `schema.sql`
2. `billing.sql`

## Si ya tenías la app funcionando

**No vuelvas a ejecutar** `schema.sql` ni `billing.sql` enteros.

Solo la migración que falte, por ejemplo:

- **Escáner de gastos:** `billing-scans.sql`
- **Veri*Factu (registros servidor):** `verifactu.sql`

## Errores tipo «policy already exists»

Significa que ese script ya se aplicó. Usa el archivo de migración pequeño (`billing-scans.sql`), no el script completo.
