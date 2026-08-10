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

**Cómo se paga:** Playwright contra un Supabase de staging. Bloqueado de hecho
por el punto 7: hoy no se puede levantar ese staging desde el repositorio.

## 7. El histórico de migraciones no es reproducible

Tres problemas encontrados al montar el workflow de Supabase:

1. **18 migraciones con versión de 8 dígitos** (`20260130_...`) en vez de los 14
   que genera `supabase migration new`. Cinco parejas comparten versión, y para
   la CLI la versión es la identidad de la migración: dos ficheros con la misma
   son ambiguos y el orden entre ellos lo decide el alfabeto.
   Renombrarlos rompería `supabase_migrations.schema_migrations` en producción,
   así que quedan congelados en la lista `LEGACY` de
   [scripts/check-migrations.mjs](../scripts/check-migrations.mjs). La guarda
   (`npm run check:migrations`, y job `nombres` en CI) impide que crezcan.

2. **`20260707000000_inscription_confirmation_email_webhook.sql` es un
   marcador de posición**: contiene literalmente `<SERVICE_ROLE_KEY>` porque el
   trigger real se aplicó por la Management API. Si esa migración no consta como
   aplicada en remoto, un `supabase db push` crearía el trigger con la cadena
   literal y los correos de confirmación de inscripción dejarían de enviarse.
   **Comprobar con `supabase migration list --linked` antes del primer push.**

3. **Las migraciones NO aplican desde cero.** El job `esquema` lo comprobó en el
   primer run y falla en la segunda migración:

   ```
   Applying migration 20250130_create_events_table.sql...
   ERROR: relation "public.profiles" does not exist (SQLSTATE 42P01)
   ```

   `20250130_create_events_table.sql` crea políticas RLS que consultan
   `public.profiles`, y **ninguna migración del repo crea esa tabla**: existe en
   producción porque se creó a mano en su día. La consecuencia práctica es que
   hoy no se puede levantar un entorno nuevo (ni staging, ni una copia local
   para depurar) desde el repositorio.

   Arreglo: una migración inicial que cree `public.profiles` (y cualquier otro
   objeto huérfano que aparezca al reintentar), colocada con una versión
   anterior a `20250130`. Se saca el DDL real con
   `supabase db dump --linked --schema public`.

   Hasta entonces el job queda en `continue-on-error`: informa en cada PR sin
   bloquear.

## 8. Cosas menores

- `README.md` sigue siendo la plantilla de Vite: no explica variables de
  entorno, cómo levantar el proyecto ni cómo desplegar.
- `package.json` conserva `deploy`/`predeploy` con `gh-pages`, restos de antes de
  Vercel. Confunden sobre cuál es el deploy real.
- No hay entorno de staging: se trabaja siempre contra el proyecto Supabase de
  producción. Por eso el job `desplegar` de `supabase.yml` es manual.
