# SQL en Supabase — orden y qué ejecutar

## Instalación nueva (proyecto vacío)

1. `schema.sql`
2. `billing.sql`

## Si ya tenías la app funcionando

**No vuelvas a ejecutar** `schema.sql` ni `billing.sql` enteros.

Solo la migración que falte, por ejemplo:

- **Escáner de gastos:** `billing-scans.sql`
- **Veri*Factu (registros servidor):** `verifactu.sql`

## Auth — confirmación de email

Si **Confirm email** está activado en Supabase → Authentication → Providers → Email:

1. El usuario recibe **dos correos**: confirmación (Supabase) y bienvenida (Factu). El de Factu **no** activa la cuenta.
2. En Supabase → Authentication → **URL Configuration**:
   - **Site URL:** `https://factu-autonomo.vercel.app` (no dejes `localhost` si pruebas en producción)
   - **Redirect URLs:**
     - `https://factu-autonomo.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback` (solo desarrollo local)
3. Tras confirmar, la app redirige a Configuración con sesión lista.

Si en local ves `Cannot find module './611.js'`, para el servidor y ejecuta `npm run dev:clean`.

Para entrar sin confirmar email (solo desarrollo): desactiva **Confirm email** en el mismo panel.

## Errores tipo «policy already exists»

Significa que ese script ya se aplicó. Usa el archivo de migración pequeño (`billing-scans.sql`), no el script completo.
