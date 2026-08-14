# Instalación local en WSL 2 y Docker

Esta guía levanta el stack completo: React/TanStack Start, PostgreSQL, Auth, Storage, Realtime, Studio y Edge Functions. Supabase CLI administra sus contenedores; `compose.yaml` construye únicamente la aplicación, igual que el patrón usado en `doable-dates`.

## 1. Preparar Windows (una sola vez)

Abra **PowerShell como administrador**:

```powershell
wsl --install -d Ubuntu
wsl --update
wsl --set-default-version 2
```

Reinicie Windows si se solicita. Compruebe:

```powershell
wsl -l -v
```

Ubuntu debe aparecer en versión `2`. Instale Docker Desktop, active **Use the WSL 2 based engine** y habilite Ubuntu en **Settings > Resources > WSL Integration**. No instale otro Docker Engine dentro de Ubuntu si utiliza Docker Desktop.

> En la auditoría de este equipo, WSL 2 está habilitado pero **no hay ninguna distribución instalada**, y el comando `docker` no está disponible. El siguiente paso real es ejecutar `wsl --install -d Ubuntu` desde PowerShell como administrador, reiniciar si Windows lo solicita e instalar Docker Desktop.

## 2. Preparar Ubuntu

Abra Ubuntu y ejecute:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates build-essential
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node --version
npm --version
docker version
docker compose version
```

Mantenga el repositorio dentro del filesystem Linux (`~/code`) para evitar la penalización de E/S de `/mnt/c`:

```bash
mkdir -p ~/code
cd ~/code
git clone <URL_DEL_REPOSITORIO> solnatural-commerce
cd solnatural-commerce
npm ci
```

Si ya tiene cambios locales sólo en la copia de Windows, cópielos o haga commit antes de clonar. No rebase ni fuerce el historial publicado: esta rama sincroniza con Lovable.

## 3. Levantar Supabase local

Inicie Docker Desktop y, desde la raíz del repositorio:

```bash
npm run supabase:start
npm run supabase:status
```

La primera ejecución descarga las imágenes. Supabase aplica automáticamente `supabase/migrations` en orden. Los puertos predeterminados son:

| Servicio                        | Dirección                |
| ------------------------------- | ------------------------ |
| API/Auth/Storage                | `http://localhost:54321` |
| PostgreSQL                      | `localhost:54322`        |
| Studio                          | `http://localhost:54323` |
| Inbucket (correo local de Auth) | `http://localhost:54324` |

Si una migración falla o necesita reconstruir sólo la base local:

```bash
npm run supabase:reset
```

Este comando elimina los datos **locales** y reaplica las migraciones. Nunca añada `--linked` contra producción.

## 4. Configurar variables

```bash
cp .env.local.example .env.local
npm run supabase:status
```

Copie del resultado:

- `anon key` a `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` y `ANON_KEY`.
- `service_role key` a `SUPABASE_SERVICE_ROLE_KEY` y `SERVICE_ROLE_KEY`.

No publique `.env.local`. La clave `service_role` sólo se usa en SSR/Edge Functions; nunca tiene prefijo `VITE_`.

Para probar correos de pedidos:

```bash
cp supabase/functions/.env.example supabase/functions/.env.local
```

Complete `EMAIL_API_KEY`, `EMAIL_FROM` y `ADMIN_EMAIL`. El endpoint es compatible con la API HTTP de Resend y puede cambiarse con `EMAIL_API_URL`.

## 5A. Desarrollo con recarga en caliente (recomendado)

Use tres terminales WSL en la raíz:

```bash
# Terminal 1, si todavía no está iniciado
npm run supabase:start

# Terminal 2, Edge Function de correo
npm run supabase:functions

# Terminal 3, frontend
npm run dev
```

Abra la URL mostrada por Vite. Studio queda en `http://localhost:54323`.

## 5B. Ejecutar la aplicación en Docker

Con Supabase local ya iniciado:

```bash
docker compose --env-file .env.local up -d --build
docker compose ps
docker compose logs -f app
```

Abra `http://localhost:3000`. El navegador llega a Supabase por `localhost:54321`; el SSR del contenedor usa `host.docker.internal:54321`.

Para detener sólo la aplicación:

```bash
docker compose down
```

Para detener también Supabase conservando sus datos:

```bash
npm run supabase:stop
```

## 6. Crear el primer administrador local

1. Registre una cuenta desde `/auth`.
2. Abra Studio (`http://localhost:54323`) y copie el UUID en **Authentication > Users**.
3. En **SQL Editor**, ejecute reemplazando el UUID:

```sql
insert into public.user_roles (user_id, role)
values ('UUID_DEL_USUARIO', 'admin')
on conflict (user_id, role) do nothing;
```

Cierre sesión, vuelva a ingresar y abra `/admin`. La asignación es deliberadamente administrativa; el RPC inseguro de “el primer usuario reclama admin” quedó revocado.

## 7. Prueba funcional mínima

1. En `/admin`, cree o active un producto, defina precio, costo y stock.
2. En una ventana privada, agréguelo al carrito y complete `/checkout`.
3. Compruebe en Studio que se crearon `orders`, `order_items`, `inventory_movements`, `notifications` y `order_email_dispatches`.
4. Confirme que el stock disminuyó y que un segundo pedido sin inventario devuelve `INSUFFICIENT_STOCK`.
5. Cambie el pedido a cancelado desde `/admin`; el inventario debe restaurarse una sola vez.
6. Revise los correos del proveedor y el estado `sent` en `order_email_dispatches`.

## 8. Validaciones antes de entregar cambios

```bash
npm run typecheck
npm run lint
npm run build
docker compose --env-file .env.local config
```

Para verificar todas las migraciones desde cero, después de respaldar cualquier dato local útil:

```bash
npm run supabase:reset
```

## 9. Aplicar a Supabase remoto (cuando corresponda)

Esto modifica el proyecto conectado; no es necesario para trabajar localmente:

```bash
npx supabase login
npx supabase link --project-ref jrsuowpkfxlxbfxljcho
npx supabase db push --dry-run
npx supabase db push
npx supabase secrets set --env-file supabase/functions/.env.local
npx supabase functions deploy send-order-notification --no-verify-jwt
```

No use `db reset --linked` ni incluya datos demo en producción sin revisar el destino.

## Solución rápida de problemas

- `docker: command not found`: inicie Docker Desktop y habilite la integración para Ubuntu.
- WSL indica que no hay distribuciones: ejecute `wsl --install -d Ubuntu` desde PowerShell como administrador y reinicie.
- `E_ACCESSDENIED` al usar WSL desde una herramienta restringida: confirme el estado en una consola PowerShell normal o elevada con `wsl --status`.
- Puerto ocupado: cambie `APP_PORT` para la aplicación; para Supabase ajuste puertos en `supabase/config.toml`.
- La app abre pero no consulta datos: revise que las tres variables de clave pública tengan exactamente el `anon key` local.
- SSR no conecta desde Compose: mantenga `SUPABASE_INTERNAL_URL=http://host.docker.internal:54321`.
- No llegan correos: ejecute `npm run supabase:functions`, revise su terminal y `order_email_dispatches.last_error`.
