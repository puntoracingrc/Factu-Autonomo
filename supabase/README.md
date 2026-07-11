# SQL en Supabase - orden, migraciones y rollbacks

## Convención definitiva de migraciones

`supabase/migrations` contiene solo migraciones **up** autoejecutables por Supabase CLI.

- No debe haber archivos `*.down.sql` dentro de `supabase/migrations`.
- Cada migración debe llamarse `YYYYMMDDHHMMSS_slug.sql`.
- La versión numérica inicial debe ser única.
- El orden es siempre:
  1. baseline/base schema;
  2. migraciones incrementales;
  3. hardening o cambios posteriores.

`supabase/rollbacks` contiene rollbacks manuales.

- Cada rollback debe llamarse `YYYYMMDDHHMMSS_slug.down.sql`.
- El prefijo numérico debe coincidir con la migración que revierte.
- Supabase CLI no ejecuta esta carpeta automáticamente; los rollbacks se aplican manualmente y solo con un procedimiento de incidencia o staging.

Comprobación local:

```bash
npm run check:migrations
```

Esta comprobación falla si:

- hay un `*.down.sql` dentro de `supabase/migrations`;
- dos migraciones comparten versión numérica;
- un nombre no sigue la convención;
- un rollback no apunta a una versión de migración existente.

## Migraciones versionadas actuales

### Supabase limpio o staging nuevo

Aplicar en orden automático:

1. `supabase/migrations/20260623000000_base_schema.sql`
2. `supabase/migrations/20260624000100_phase1_hardening.sql`
3. `supabase/migrations/20260624000200_phase1_rpc_search_path_hardening.sql`

### Producción ya existente

No aplicar la baseline a ciegas si producción ya tiene tablas creadas manualmente.

Procedimiento seguro:

1. comprobar en solo lectura qué tablas existen;
2. si el esquema base ya existe, tratar `20260623000000_base_schema.sql` como baseline/historial;
3. aplicar primero en staging clonado o equivalente;
4. aplicar solo las migraciones incrementales necesarias;
5. verificar RLS, GRANT/REVOKE, RPC y rutas servidor después.

Producción no está marcada como lista hasta validar este procedimiento fuera de local.

## Instalación soportada en Supabase limpio/staging

La única instalación soportada para un Supabase limpio o staging nuevo es mediante las migraciones versionadas de `supabase/migrations`, aplicadas en orden automático por Supabase CLI.

No ejecutes manualmente `schema.sql`, `billing.sql` ni los scripts históricos en una instalación nueva.

## Scripts históricos/legacy

Estos archivos quedan como referencia histórica de cómo se creó el esquema antes de adoptar migraciones versionadas:

- `schema.sql`
- `billing.sql`
- `billing-profile.sql`
- `billing-scans.sql`
- `billing-scan-credits.sql`
- `billing-ai-units.sql`
- `referrals.sql`
- `verifactu.sql`

No deben ejecutarse manualmente en:

- instalaciones nuevas;
- staging limpio;
- producción existente;
- cualquier entorno con historial de migraciones activo.

Si producción ya tiene tablas creadas manualmente, primero debe tratarse la migración base como baseline/historial y después aplicar solo las migraciones incrementales validadas en staging.

## Auth — confirmación de email

Si **Confirm email** está activado en Supabase → Authentication → Providers → Email:

1. El usuario recibe **dos correos**: confirmación (Supabase) y bienvenida (Factu). El de Factu **no** activa la cuenta.
2. En Supabase → **Authentication** → **URL Configuration**  
   (enlace directo: `https://supabase.com/dashboard/project/TU_PROJECT_REF/auth/url-configuration`)
   - **Site URL:** `https://facturacion-autonomos.app` (no dejes `localhost` en producción)
   - **Redirect URLs** (añadir una por línea):
     - `https://facturacion-autonomos.app/auth/callback`
     - `http://localhost:3000/auth/callback` (solo desarrollo local)
     - `http://localhost:3001/auth/callback` (solo desarrollo local)
3. Tras confirmar, la app redirige a Configuración con sesión lista.

**Importante:** la URL de callback debe coincidir **exactamente** con `NEXT_PUBLIC_APP_URL` + `/auth/callback` en Vercel.
No añadas `factu-autonomo.vercel.app`: es un dominio retirado que redirige al
canónico y no debe actuar como origen o callback de autenticación.

Si en local ves `Cannot find module './611.js'`, para el servidor y ejecuta `npm run dev:clean`.

Para entrar sin confirmar email (solo desarrollo): desactiva **Confirm email** en el mismo panel.

## Errores tipo «policy already exists»

Significa que un script histórico ya se aplicó o que se está intentando mezclar SQL manual con migraciones. Detén el cambio y revisa el historial de migraciones antes de continuar.
