# Auditoría de mantenibilidad IA — afa-web

Fecha: 2026-08-11 · Rúbrica: plugin `saas-audit` · Commit auditado: `76bdcc7`

Pregunta que responde: **¿es seguro dejar este proyecto a un agente IA para que
se auto-mantenga?**

Nota: **4/10 antes de esta sesión → 7/10 después**. Detalle en la sección 5.

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

248 ficheros `.ts`/`.tsx`, 63 migraciones SQL, 6 Edge Functions.

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

**Ahora:** 8 ficheros, **140 tests**, ~2 s, sin red ni servicios externos.

| Fichero | Qué protege |
|---|---|
| `n43.test.ts` | Parser del extracto bancario Sabadell: columnas, fechas, signo del importe, prefijos del ordenante, ficheros sin saltos de línea |
| `bankReconciliation.test.ts` | Reglas de conciliación: alta confianza solo con importe exacto + familia identificada, alias aprendidos, recibos ya consumidos, pagos combinados |
| `htmlSanitizer.test.ts` | Vectores XSS sobre el contenido del editor (scripts, `onerror`, `javascript:`, iframes) + métricas de lectura |
| `productUtils.test.ts` | Orden de tallas y stock del xandall completo como mínimo de sus piezas |
| `courses.test.ts` | Códigos de curso (clave de datos persistidos), clasificación de grupos, slugs de URL |
| `formatting.test.ts` | Proxy de storage, idioma regional, ida y vuelta de `datetime-local`, textos configurables |
| `eventDates.test.ts` | (existente) rangos de mes sin desfase UTC |
| `inscriptionFilters.test.ts` | (existente) normalización y filtrado de inscripciones |

**Hallazgo de seguridad durante la escritura de tests:** el sanitizador dejaba
pasar contenido peligroso. Al desenvolver una etiqueta no permitida, sus hijos
subían al nivel superior **sin volver a pasar por el saneado**, así que
`<div><img src=... onerror=...></div>` salía intacto — XSS almacenado explotable
desde el editor de noticias. Corregido en
[htmlSanitizer.ts](../src/utils/htmlSanitizer.ts) y fijado con el test
"sanea también lo que había dentro de una etiqueta desenvuelta".

**Qué falta:** mocks de Supabase para probar los servicios (~8% de cobertura),
tests de componente y E2E de los tres recorridos críticos (inscripción, tienda,
login admin).

## 4. Infra y CI/CD

| Pieza | Estado |
|---|---|
| CI | **Nuevo**: [.github/workflows/ci.yml](../.github/workflows/ci.yml) — lint + tipos + tests con cobertura + build en cada push y PR, más job informativo de `npm audit` |
| Actualización de deps | **Nuevo**: [.github/dependabot.yml](../.github/dependabot.yml) — semanal, agrupado por familia, majors críticos excluidos |
| Deploy web | Automático en Vercel al hacer push a `main`. **No espera a CI** |
| Migraciones DB | Versionadas en `supabase/migrations/` (57). **Nuevo**: [supabase.yml](../.github/workflows/supabase.yml) valida nombres en cada PR y las aplica desde cero en un Supabase limpio; el `db push` a producción es manual |
| Edge Functions | `supabase functions deploy` desde el mismo workflow, disparo manual. Política de JWT por función fijada en `supabase/config.toml` |
| Entorno de staging | No hay: se trabaja contra el proyecto Supabase de producción |
| Cabeceras de seguridad | CSP, HSTS, `X-Frame-Options`, Permissions-Policy en `vercel.json` |
| Monitorización de errores | **No hay** |
| Documentación | `docs/architecture.md` correcto; `README.md` sigue siendo la plantilla de Vite |

## 5. Nota

| Criterio | Máx | Antes | Ahora | Por qué |
|---|---|---|---|---|
| Tests unit/integración reales y ejecutables localmente | 3 | 1 | 2 | 140 tests offline sobre parser bancario, conciliación, sanitizador y dominio; faltan servicios mockeados y E2E |
| CI que ejecuta lint + tests + build en cada push/PR | 2 | 0 | 2 | Workflow completo con los cuatro gates |
| Deploy automatizado con gate de tests | 2 | 1 | 1 | Vercel despliega solo, pero no espera al resultado de CI |
| Tipado estricto + linter configurado | 1 | 1 | 1 | `strict: true`, ESLint 9 flat, `tsc -b` limpio |
| Monitorización de errores en producción | 1 | 0 | 0 | Sin Sentry ni equivalente |
| Migraciones DB versionadas + docs de arquitectura | 1 | 1 | 1 | 63 migraciones + `docs/architecture.md` |
| Penalizaciones | — | 0 | 0 | Sin deps locales, sin secretos en el repo, deploy no atado a una máquina |
| **Total** | **10** | **4** | **7** | |

**Lectura de la nota:** con un 7, un agente puede mantener el código y verificar
que no rompe nada (CI se lo dice), pero **no puede confirmar que el despliegue
salió bien**: nada le avisa si la web falla en producción.

## 6. Pasos para llegar al 10

Ordenados por impacto sobre la nota.

| # | Paso | Suma | Esfuerzo | ¿Basta para un 8? |
|---|---|---|---|---|
| 1 | Sentry (plan gratuito) + `ErrorBoundary` global. Cierra el bucle: el agente despliega y sabe si rompió algo | +1 | 1-2 h | **Sí** |
| 2 | En Vercel, Settings → Git → *Wait for CI to pass before deploying*. Un commit rojo deja de publicarse | +1 | 10 min | **Sí** |
| 3 | Mock compartido de `@supabase/supabase-js` en `src/tests/` y tests de `AdminPaymentsService`, `AdminInscriptionsService` y `ConfigService` | +0,5 | 4-6 h | No |
| 4 | E2E con Playwright de los tres recorridos críticos contra un Supabase de staging | +0,5 | 1-2 días | No |
| 5 | Vaciar los 51 avisos de ESLint y subir las reglas a `error` | 0 | Progresivo | No |
| 6 | ~~Workflow de migraciones y Edge Functions~~ — hecho: [supabase.yml](../.github/workflows/supabase.yml). Falta cargar los dos secrets y sanear el histórico (ver [deuda-tecnica.md](./deuda-tecnica.md#7-el-histórico-de-migraciones-no-es-reproducible)) | 0 | — | No |
| 7 | Reescribir `README.md` (variables de entorno, comandos, deploy) y borrar los scripts `gh-pages` | 0 | 30 min | No |

Los pasos **1 y 2 suman 2 puntos en menos de dos horas** y son los que más
cambian lo que un agente puede hacer solo. Los pasos 3 y 4 son los que llevan de
8 a 10, y son los caros.
