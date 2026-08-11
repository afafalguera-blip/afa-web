# Inventario de deuda técnica

Estado: **2026-08-11**. Se revisa cada vez que CI cambie de color o al cerrar un bloque.

Regla: nada entra aquí sin fecha y sin criterio de cierre. Si un punto se queda
sin dueño más de un curso escolar, o se paga o se decide explícitamente vivir
con él.

---

## 1. Avisos de ESLint (51, ninguno bloqueante)

`react-hooks` v7 trajo reglas nuevas (las del React Compiler) que marcan patrones
que el proyecto usa en casi todas las pantallas. Están en `warn` en
[eslint.config.js](../eslint.config.js) para que CI bloquee **regresiones
nuevas** sin quedarse en rojo permanente por la deuda heredada.

| Regla | Avisos | Qué significa | Cómo se paga |
|---|---|---|---|
| `react-hooks/set-state-in-effect` | 39 | `useEffect(() => { fetchX() }, [])` que hace `setState` en cascada: doble render y datos que parpadean | Mover la carga a un hook con `useSyncExternalStore`/TanStack Query, o al menos extraer un `useFetch` común |
| `react-hooks/exhaustive-deps` | 5 | Dependencias incompletas: el efecto no se re-ejecuta cuando debería | Caso a caso; varios ya llevan `eslint-disable` deliberado |
| `react-hooks/immutability` | 5 | Se usa una función/`setState` antes de declararla (hoisting dentro del componente) | Reordenar: declarar antes del `useEffect` |
| `react-hooks/incompatible-library` | 2 | Librería externa que el compilador no puede analizar | Sin acción; informativo |

**Criterio de cierre:** cuando `set-state-in-effect` e `immutability` lleguen a 0,
subir ambas a `error` en `eslint.config.js` y borrar esta sección.

Para ver el listado vivo: `npx eslint . -f json` o simplemente `npm run lint`.

## 2. `xlsx` con vulnerabilidad alta sin parche en npm

`npm audit --omit=dev` reporta 1 vulnerabilidad alta en `xlsx@0.18.5` (la última
publicada en el registro npm). SheetJS dejó de publicar en npm: las versiones
corregidas se distribuyen solo desde `cdn.sheetjs.com`.

- **Uso actual:** exportaciones de inscripciones y pagos en
  [ExportService.ts](../src/services/ExportService.ts). Solo se **escriben**
  ficheros; no se parsea XLSX subido por terceros, que es el vector del aviso.
- **Riesgo real:** bajo mientras no se importen hojas de cálculo de fuera.
- **Cómo se paga:** apuntar la dependencia al tarball del CDN de SheetJS, o
  cambiar a `exceljs`. Ninguna de las dos es urgente.
- CI lo muestra en cada PR (job `audit`) pero **no bloquea**, precisamente por
  esto.

Las otras dos (`dompurify`, `nanoid`) son transitivas de dependencias de
desarrollo y se cierran con `npm audit fix` cuando toque tocar el lockfile.

## 3. Sin monitorización de errores en producción

No hay Sentry ni equivalente. Si una pantalla revienta en el móvil de una
familia, nadie se entera hasta que alguien lo cuenta por WhatsApp.

`AdminObservability` mide consumo de Supabase (filas, storage, funciones), no
errores de frontend.

**Cómo se paga:** Sentry con plan gratuito + `ErrorBoundary` global. Es el único
punto que impide cerrar el ciclo "el agente edita → CI valida → deploy →
monitorización confirma".

## 4. ~~El deploy no espera a CI~~ — resuelto el 2026-08-11

Vercel construía y publicaba en paralelo a GitHub Actions, así que un commit que
rompía los tests se publicaba igual.

Resuelto por la vía más simple: `vercel.json` pasa de `"buildCommand": "npm run
build"` a `"buildCommand": "npm run ci"`, que encadena lint → tipos → tests →
nombres de migración → build. Si algo falla, **el build de Vercel falla y no se
publica nada**: la versión anterior sigue en línea.

Ventaja sobre desplegar desde el workflow: no hace falta ningún token de Vercel
guardado en GitHub, y la regla vive en el repositorio en vez de en un ajuste del
panel que nadie recuerda. Coste: cada build de Vercel tarda ~1 minuto más.

Descartado el camino de la CLI de Vercel dentro del workflow: exige un token
*personal*, y los tokens de equipo (`vcp_...`) no le valen — la CLI necesita un
usuario y devuelve "User not found".

Pendiente menor: GitHub Actions corre sobre Node 22 y Vercel sobre Node 24. Si
algún día divergen en comportamiento, el aviso llegaría por el lado de Vercel.

## 5. Cobertura desigual

`npm run test:coverage` sobre `utils` + `logic` + `constants` + `services`:

| Zona | Líneas cubiertas | Comentario |
|---|---|---|
| `src/logic` | 100% | Filtros de inscripciones |
| `src/utils` | 74% | Falta `imageCompression` (Canvas), `CategoryUtils` (i18n) |
| `src/services/admin` | 37% | Pagos e inscripciones cubiertos; el resto no |
| `src/services` | 4% | `ConfigService` cubierto en su parte de caché; el resto es I/O fino |
| **Total medido** | **~32%** | Era 19% |

No hay umbral configurado a propósito: poner uno hoy solo generaría tests de
relleno.

**Cómo se sigue:** el doble de Supabase ya existe
([`src/tests/helpers/supabaseMock.ts`](../src/tests/helpers/supabaseMock.ts)),
así que cubrir un servicio más es escribir el test, no montar andamiaje.
Siguientes por valor: `AdminMenjadorService`, `AdminDocumentsService` y
`ExportService`.

## 6. Sin E2E

Ya hay tests de componente (`modal.test.tsx` cubre foco, Escape y scroll del
diálogo que usa todo el panel), pero los tres recorridos completos que no pueden
romperse — inscripción pública, checkout de la tienda, login de admin — siguen
sin red de seguridad automática de punta a punta.

**Cómo se paga:** Playwright contra un Supabase limpio. Desde que el punto 7
está resuelto, ese entorno se levanta con `supabase start` desde el propio
repositorio, así que ya no hay nada que lo bloquee.

## 7. ~~El histórico de migraciones no es reproducible~~ — resuelto el 2026-08-11

Punto de partida: `supabase start` moría en la segunda migración, y detrás
había mucho más que un fallo suelto. El repositorio solo contenía parches
incrementales sobre un esquema construido a mano en el panel de Supabase.

Lo que faltaba, y ya está capturado:

| Qué | Detalle |
|---|---|
| 15 tablas | `payments`, `inscripcions`, `site_config`, `profiles`, `admin_users` y las cuatro de la tienda, entre otras |
| 51 funciones | Incluidas `dar_de_alta_inscripcion`, `fn_create_payments_for_inscription` y `record_payment_received` |
| 25 columnas de `activities` | La migración declaraba 18; producción tiene 43 |
| 14 triggers, 30 políticas, 25 índices | |

Todo en [`20240101000000_esquema_base.sql`](../supabase/migrations/20240101000000_esquema_base.sql)
y [`20240131000000_activities_columnas_reales.sql`](../supabase/migrations/20240131000000_activities_columnas_reales.sql),
generados con [`scripts/dump-schema.mjs`](../scripts/dump-schema.mjs) leyendo el
catálogo de producción (solo `SELECT`). Idempotente: contra una base que ya lo
tiene, no hace nada.

Además hizo falta:

1. **Fusionar las versiones duplicadas.** Seis versiones repartidas en trece
   ficheros chocaban contra la clave primaria de `schema_migrations`. Ahora hay
   un fichero por versión, que es exactamente lo que consta aplicado en
   producción. La lista `LEGACY` de la guarda baja de 20 entradas a 12.

2. **Hacer idempotentes las migraciones antiguas** (48 sentencias en 8 ficheros):
   `CREATE POLICY` y `CREATE TRIGGER` con su `DROP ... IF EXISTS` delante,
   `CREATE INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`.

3. **Dos stubs documentados** para funciones que las migraciones invocan antes
   de que existan: `log_audit_change()` (que no existe en producción — tres
   ficheros de 2025 nunca se aplicaron tal cual) y `handle_audit_log()`, que
   no audita mientras `audit_logs` no exista y se sustituye después.

4. **`SET check_function_bodies = off`** al principio del esquema base, como
   hace `pg_dump`.

El job `esquema` **ya bloquea**: si alguien vuelve a dejar el repositorio en un
estado del que no se pueda reconstruir el proyecto, CI se pone en rojo.

Queda pendiente, y no es automático: la primera vez que se lance el workflow de
despliegue habrá que comprobar con `supabase migration list --linked` que
producción ya da por aplicadas las versiones nuevas (`20240101000000`,
`20240131000000`) o marcarlas con `supabase migration repair --status applied`.
Si no, `db push` intentará aplicarlas — son idempotentes, así que no romperían
nada, pero es mejor saberlo antes que después.

## 8. El service_role vive dentro de dos triggers

Los webhooks `send-inscription-email-webhook` (en `inscripcions`) y
`send-order-email-webhook` (en `shop_orders`) llevan el JWT de `service_role` —
y uno de ellos, además, un `x-webhook-secret` — escritos en texto plano dentro
de su propia definición, porque `supabase_functions.http_request` recibe las
cabeceras como literal.

- **No es alcanzable desde la API**: PostgREST solo expone el esquema `public`,
  no `pg_catalog`. Hace falta conexión directa a Postgres para leerlo.
- **Pero sí importa**: la clave está duplicada dentro de la base, y rotarla
  obliga a recrear los dos triggers a mano o los correos dejan de enviarse en
  silencio.
- Por eso `dump-schema.mjs` los detecta y los excluye del volcado: si no,
  acabarían versionados en el repositorio.

**Cómo se paga:** mover el secreto a `vault` de Supabase y leerlo desde una
función `SECURITY DEFINER`, en vez de incrustarlo en la definición del trigger.

## 9. Cosas menores

- `README.md` sigue siendo la plantilla de Vite: no explica variables de
  entorno, cómo levantar el proyecto ni cómo desplegar.
- `package.json` conserva `deploy`/`predeploy` con `gh-pages`, restos de antes de
  Vercel. Confunden sobre cuál es el deploy real.
- No hay entorno de staging: se trabaja siempre contra el proyecto Supabase de
  producción. Por eso el job `desplegar` de `supabase.yml` es manual.
