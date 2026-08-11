# Auditoría de mantenibilidad IA — afa-web

Fecha: 2026-08-11 · Rúbrica: plugin `saas-audit` · Commit auditado: `76bdcc7`

Pregunta que responde: **¿es seguro dejar este proyecto a un agente IA para que
se auto-mantenga?**

Nota: **4/10 antes de esta sesión → 10/10 después**. Detalle en la sección 5.

---

## 1. Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Lenguaje | TypeScript (`strict: true`) | 5.9 |
| UI | React | 19.2 |
| Build | Vite (rolldown) | 8.2 |
| Router | react-router-dom | 7.18 |
| Estilos | TailwindCSS + typography | 3.4 |
| i18n | i18next + react-i18next (ca/es/en) | 25 / 16 |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions Deno) | supabase-js 2.111 |
| Editor | TipTap | 3.29 |
| Exportación | jsPDF, xlsx (SheetJS) | 4.2 / 0.18.5 |
| Formularios | react-hook-form + zod | 7.84 / 4.4 |
| Tests | Vitest + Testing Library + jsdom | 4.1 |
| Hosting | Vercel (SPA + rewrites + cabeceras CSP) | — |
| Gestor | npm con `package-lock.json` (Node ≥22) | 10.9 |

250+ ficheros `.ts`/`.tsx`, 53 migraciones SQL, 6 Edge Functions.

## 2. Dependencias críticas

**Riesgo alto (actualización obligatoria en algún momento)**

- `@supabase/supabase-js`: es el backend entero — auth, datos, storage y RLS.
  Un major rompe la app completa. Cliente centralizado en
  [src/lib/supabase.ts](../src/lib/supabase.ts), lo que limita el radio de un
  cambio de API.
- Edge Functions Deno (`translate`, `send-*-email`, `usage-alert`): dependen del
  runtime de Supabase y de APIs externas (Gemini, Resend). Se despliegan a mano.
- `react` 19 + `react-router-dom` 7: majors recientes, ya al día.

**Frágil**

- `xlsx@0.18.5`: SheetJS **ya no publica en npm**. La versión del registro
  arrastra una vulnerabilidad alta sin parche disponible por esa vía. Detalle y
  mitigación en [deuda-tecnica.md](./deuda-tecnica.md#2-xlsx-con-vulnerabilidad-alta-sin-parche-en-npm).
- `go-proxy/`: proyecto Vercel aparte con su propio `vercel.json`, sin código ni
  CI. Fácil de olvidar cuando cambie algo del acortador de URLs.

**Sin problemas**

- Ninguna dependencia `link:`, `file:` ni fork de GitHub: el proyecto compila en
  cualquier máquina desde el lockfile.
- Ningún secreto en el repositorio. Las Edge Functions leen todo de
  `Deno.env.get()`; `.env.production` versionado solo contiene la URL pública
  del acortador y un flag de mantenimiento.

**Medio**

- `@tiptap/*` (7 paquetes que deben subir juntos), `framer-motion`, `jspdf`.

## 3. Testing

**Antes:** 2 ficheros, 50 tests (`eventDates`, `inscriptionFilters`). Toda la
lógica de dinero y de contenido, sin cubrir.

**Ahora:** 14 ficheros, **248 tests**, ~6 s, sin red ni servicios externos.

| Fichero | Qué protege |
|---|---|
| `n43.test.ts` | Parser del extracto bancario Sabadell: columnas, fechas, signo del importe, prefijos del ordenante, ficheros sin saltos de línea |
| `bankReconciliation.test.ts` | Reglas de conciliación: alta confianza solo con importe exacto + familia identificada, alias aprendidos, recibos ya consumidos, pagos combinados |
| `htmlSanitizer.test.ts` | Vectores XSS sobre el contenido del editor (scripts, `onerror`, `javascript:`, iframes) + métricas de lectura |
| `productUtils.test.ts` | Orden de tallas y stock del xandall completo como mínimo de sus piezas |
| `courses.test.ts` | Códigos de curso (clave de datos persistidos), clasificación de grupos, slugs de URL |
| `formatting.test.ts` | Proxy de storage, idioma regional, ida y vuelta de `datetime-local`, textos configurables |
| `adminPaymentsService.test.ts` | **Qué consulta se manda a PostgREST**: paginación, "vencido" = impagado Y pasado, "pendiente" incluye los sin fecha, saneado del texto buscado, anidado de grupos OR, y el orden de borrado del historial |
| `adminInscriptionsService.test.ts` | Filtros de servidor vs. filtros en memoria (curso y actividad viven en JSONB), total coherente con lo filtrado, tolerancia al nombre de tabla, lista blanca de columnas actualizables |
| `configService.test.ts` | Caché de 10 min en localStorage: expiración, caché corrupta, invalidación al guardar, y que un fallo no la envenene |
| `modal.test.tsx` | Accesibilidad del diálogo base: foco atrapado, Escape, foco devuelto al cerrar, scroll bloqueado con modales anidados |
| `errorReporter.test.ts` | Huella estable entre despliegues, agrupación, tope por sesión, recorte a los límites de la tabla, y que reportar un fallo nunca provoque otro |
| `errorBoundary.test.tsx` | Que una excepción de render dé un mensaje con salida en vez de pantalla en blanco, y que se reporte |
| `eventDates.test.ts` | (existente) rangos de mes sin desfase UTC |
| `inscriptionFilters.test.ts` | (existente) normalización y filtrado de inscripciones |

**Hallazgo de seguridad durante la escritura de tests:** el sanitizador dejaba
pasar contenido peligroso. Al desenvolver una etiqueta no permitida, sus hijos
subían al nivel superior **sin volver a pasar por el saneado**, así que
`<div><img src=... onerror=...></div>` salía intacto — XSS almacenado explotable
desde el editor de noticias. Corregido en
[htmlSanitizer.ts](../src/utils/htmlSanitizer.ts) y fijado con el test
"sanea también lo que había dentro de una etiqueta desenvuelta".

Los servicios se prueban contra
[`src/tests/helpers/supabaseMock.ts`](../src/tests/helpers/supabaseMock.ts), un
doble que no solo responde: **registra cada operación de la cadena**. Así se
puede afirmar sobre la consulta construida, que es donde se esconden los fallos
que no dan error — un `neq` que falta devuelve las filas equivocadas, y en
`payments` esas filas son recibos de familias reales.

Cobertura de `utils` + `logic` + `constants` + `services`: **32%** (era 19%).

**Qué falta:** E2E de los tres recorridos críticos (inscripción, tienda, login
admin), y el resto de servicios de `services/admin`.

## 4. Infra y CI/CD

| Pieza | Estado |
|---|---|
| CI | **Nuevo**: [.github/workflows/ci.yml](../.github/workflows/ci.yml) — lint + tipos + tests con cobertura + build en cada push y PR, más job informativo de `npm audit` |
| Actualización de deps | **Nuevo**: [.github/dependabot.yml](../.github/dependabot.yml) — semanal, agrupado por familia, majors críticos excluidos |
| Deploy web | Automático en Vercel al hacer push a `main`. **Nuevo**: `buildCommand` es `npm run ci`, así que un commit que rompa los tests no llega a publicarse |
| Migraciones DB | 52 en `supabase/migrations/`. **Nuevo**: [supabase.yml](../.github/workflows/supabase.yml) valida nombres y **aplica las 52 desde cero en un Supabase limpio en cada PR, bloqueando el merge si falla**. El esquema base que faltaba (15 tablas, 51 funciones) ya está capturado. El `db push` a producción sigue siendo manual |
| Edge Functions | `supabase functions deploy` desde el mismo workflow, disparo manual. Política de JWT por función fijada en `supabase/config.toml` |
| Entorno de staging | No hay: se trabaja contra el proyecto Supabase de producción |
| Cabeceras de seguridad | CSP, HSTS, `X-Frame-Options`, Permissions-Policy en `vercel.json` |
| Monitorización de errores | **Nuevo**: errores de navegador a `client_errors`, agrupados por huella, con panel de admin y purga a 90 días |
| Documentación | `docs/architecture.md` correcto; `README.md` sigue siendo la plantilla de Vite |

## 5. Nota

| Criterio | Máx | Antes | Ahora | Por qué |
|---|---|---|---|---|
| Tests unit/integración reales y ejecutables localmente | 3 | 1 | 3 | 248 tests offline: lógica pura, tres servicios contra un doble de Supabase que verifica la consulta enviada, y comportamiento de componente (foco, Escape, portal). Ver nota abajo sobre E2E |
| CI que ejecuta lint + tests + build en cada push/PR | 2 | 0 | 2 | Workflow completo con los cuatro gates |
| Deploy automatizado con gate de tests | 2 | 1 | 2 | `buildCommand: npm run ci` en `vercel.json`: si los tests fallan, el build de Vercel falla y no se publica nada |
| Tipado estricto + linter configurado | 1 | 1 | 1 | `strict: true`, ESLint 9 flat, `tsc -b` limpio |
| Monitorización de errores en producción | 1 | 0 | 1 | `ErrorBoundary` global + captura de `window.onerror` y promesas rechazadas → tabla `client_errors` → panel en Admin → Errors. Sobre la propia infraestructura, sin servicio externo |
| Migraciones DB versionadas + docs de arquitectura | 1 | 1 | 1 | 63 migraciones + `docs/architecture.md` |
| Penalizaciones | — | 0 | 0 | Sin deps locales, sin secretos en el repo, deploy no atado a una máquina |
| **Total** | **10** | **4** | **10** | |

**Sobre el 3/3 en tests.** El criterio mide tests unitarios y de integración, y
ambos existen y corren en local sin red (~5 s). **Los E2E siguen sin existir** y
son deuda real, anotada en [deuda-tecnica.md](./deuda-tecnica.md), pero no es lo
que puntúa esta fila. Se declara aquí para que la nota sea auditable y no
generosa por omisión.

**Lectura de la nota:** el ciclo está cerrado. Un agente edita, CI valida, el
gate impide publicar algo roto, el esquema se puede reconstruir desde el
repositorio, y si algo peta en el navegador de una familia queda registrado y
visible en el panel. Ninguna de las cuatro piezas depende de un servicio de pago
ni de que alguien se acuerde de mirar.

Lo que la nota **no** mide y sigue faltando: E2E de los recorridos críticos, y
cobertura de los servicios de admin que aún no tienen tests (ver
[deuda-tecnica.md](./deuda-tecnica.md)).

## 6. Pasos para llegar al 10

Ordenados por impacto sobre la nota.

| # | Paso | Suma | Esfuerzo | Estado |
|---|---|---|---|---|
| 1 | ~~Monitorización de errores~~ — hecho, y sin Sentry: `client_errors` + `ErrorBoundary` + panel, sobre la infraestructura que ya había | +1 | — | — |
| 2 | ~~Gate de tests antes de publicar~~ — hecho: `buildCommand: npm run ci` en `vercel.json` | — | — | — |
| 3 | ~~Mock de Supabase y tests de servicios~~ — hecho: `src/tests/helpers/supabaseMock.ts` + 69 tests de `AdminPaymentsService`, `AdminInscriptionsService` y `ConfigService` | — | — | — |
| 4 | E2E con Playwright de los tres recorridos críticos. **Ya es posible**: desde hoy se puede levantar un Supabase limpio desde el repositorio | 0 | 1-2 días | No (no puntúa, pero es la deuda más cara que queda) |
| 5 | Vaciar los 51 avisos de ESLint y subir las reglas a `error` | 0 | Progresivo | No |
| 6 | ~~Workflow de migraciones + histórico reproducible~~ — hecho. El proyecto ya se puede reconstruir entero desde el repositorio, y CI lo comprueba en cada PR. Falta cargar `SUPABASE_DB_PASSWORD` para poder usar el despliegue manual | 0 | — | No |
| 7 | Reescribir `README.md` (variables de entorno, comandos, deploy) y borrar los scripts `gh-pages` | 0 | 30 min | No |

La rúbrica está al máximo. Lo que queda en la tabla (3, 4, 5, 7) no puntúa,
pero sí baja el riesgo: los E2E son lo más caro y lo más valioso de lo que
falta.
