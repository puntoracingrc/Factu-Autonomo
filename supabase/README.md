# SQL en Supabase — orden y qué ejecutar

## Instalación nueva (proyecto vacío)

1. `schema.sql`
2. `billing.sql`

## Si ya tenías la app funcionando

**No vuelvas a ejecutar** `schema.sql` ni `billing.sql` enteros.

Solo la migración que falte, por ejemplo:

- **Escáner de gastos:** `billing-scans.sql`
- **Unidades IA (rellenar clientes consume 1/10 escaneo):** `billing-ai-units.sql`
- **Veri*Factu (registros servidor):** `verifactu.sql`

## Auth — confirmación de email

Si **Confirm email** está activado en Supabase → Authentication → Providers → Email:

1. El usuario recibe **dos correos**: confirmación (Supabase) y bienvenida (Factu). El de Factu **no** activa la cuenta.
2. En Supabase → **Authentication** → **URL Configuration**  
   (enlace directo: `https://supabase.com/dashboard/project/TU_PROJECT_REF/auth/url-configuration`)
   - **Site URL:** `https://facturacion-autonomos.app` (no dejes `localhost` en producción)
   - **Redirect URLs** (añadir una por línea):
     - `https://facturacion-autonomos.app/auth/callback`
     - `http://localhost:3000/auth/callback` (solo desarrollo local)
     - `https://factu-autonomo.vercel.app/auth/callback` (opcional, URL Vercel legacy)
3. Tras confirmar, la app redirige a Configuración con sesión lista.

**Importante:** la URL de callback debe coincidir **exactamente** con `NEXT_PUBLIC_APP_URL` + `/auth/callback` en Vercel.

Si en local ves `Cannot find module './611.js'`, para el servidor y ejecuta `npm run dev:clean`.

Para entrar sin confirmar email (solo desarrollo): desactiva **Confirm email** en el mismo panel.

## Errores tipo «policy already exists»

Significa que ese script ya se aplicó. Usa el archivo de migración pequeño (`billing-scans.sql`), no el script completo.
