# Inventario de deuda técnica

Estado: **2026-08-14**. Se revisa cada vez que CI cambie de color o al cerrar un bloque.

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

## 3. ~~Sin monitorización de errores en producción~~ — resuelto el 2026-08-11

Si una pantalla petaba en el móvil de una familia, nadie se enteraba: la web es
una SPA, el fallo ocurre en su navegador y no deja rastro en ningún log.

Resuelto sobre la infraestructura que ya había, sin servicio externo:

| Pieza | Qué hace |
|---|---|
| [`ErrorBoundary`](../src/core/errors/ErrorBoundary.tsx) | Envuelve la app en `main.tsx`. Sustituye la pantalla en blanco por un mensaje con botón de reintentar |
| [`reporter.ts`](../src/core/errors/reporter.ts) | Captura también `window.onerror` y las promesas rechazadas, que el boundary no ve |
| `client_errors` | Tabla con RLS: escribe cualquiera (las visitas son anónimas), leen solo los admin |
| Admin → Errors | Agrupado por huella, con detalle, marcar resuelto y borrar |

Decisiones que conviene no deshacer sin pensarlo:

- **INSERT abierto a `anon`.** El 95% de las visitas no tienen sesión; un
  reporte que solo funcione con sesión no sirve. El abuso se acota con los
  `CHECK` de tamaño de la tabla y la purga a 90 días, no con la política.
- **Agrupación por huella** normalizando los números: si no, cada despliegue
  cambia las líneas del bundle y el mismo fallo parece uno nuevo.
- **Tope de 20 reportes por carga de página** y ventana de 60 s por huella: un
  bucle de render puede lanzar miles de errores por segundo.
- **El reportero nunca lanza.** Un fallo reportando un fallo no puede tumbar la
  página; hay un test que lo fija.

Aplicado a producción el 2026-08-11 y verificado de extremo a extremo: un
visitante anónimo consigue escribir (HTTP 201), no consigue leer (la política de
SELECT lo deja fuera), la fila llega y la función de resumen la agrupa.

La verificación destapó un fallo del propio resumen: `COUNT(DISTINCT NULL)`
devuelve 0, así que un reporte sin sesión y sin user-agent no contaba como
nadie afectado. Corregido con un `COALESCE` de tres ramas.

Registrada en `schema_migrations` junto con el resto (ver punto 7).

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

## 6. ~~Sin E2E~~ — resuelto el 2026-08-11

16 tests de Playwright contra la app construida y un Supabase limpio levantado
desde el propio repositorio ([.github/workflows/e2e.yml](../.github/workflows/e2e.yml)).
Corren en cada PR y a mano; no en cada push, porque levantar Postgres, GoTrue y
PostgREST en contenedores tarda unos minutos y el gate rápido sigue siendo el
workflow `CI`.

- `e2e/publico.spec.ts`: siete rutas públicas montan, no dejan la pantalla en
  blanco, no disparan el `ErrorBoundary` y no escupen errores de consola.
- `e2e/admin.spec.ts`: el panel no se abre sin sesión, una contraseña mala no
  entra, el admin del seed sí, la sesión sobrevive a un F5.

Se prueba sobre `vite preview` y no sobre el servidor de desarrollo: lo que hay
que validar es el bundle que acaba en producción.

**Lo que encontraron nada más existir** — cuatro cosas que llevaban tiempo ahí y
que ni los tests unitarios ni CI podían ver:

1. **Ninguna migración concedía permisos a `anon` ni `authenticated`.** Un
   entorno nuevo levantaba el esquema correcto y la web no podía leer nada:
   42501 en cada pantalla. Resuelto en `20260810000000_grants_por_defecto.sql`.
2. **`ShopLanding` hacía `shopConfig?.categories.map(...)`.** El `?.` protegía
   `shopConfig`, no `categories`: una configuración de tienda sin ese campo
   tumbaba la botiga entera para todos los visitantes.
3. **No había `<Route path="*">`.** Con el rewrite de `vercel.json`, un enlace
   viejo de una circular o una errata al teclear daban pantalla en blanco, sin
   error y sin forma de volver.
4. **`ConfigService` usaba `.single()`**, que devuelve error cuando la clave no
   tiene fila. Una configuración sin definir no es un error; ahora usa
   `.maybeSingle()`.

**Qué sigue faltando:** los recorridos que *escriben* — enviar una inscripción
de verdad y completar una compra. Necesitan selectores estables (`data-testid`)
en los formularios, porque hoy los campos se localizan por placeholder
traducido y eso se rompe al cambiar un texto.

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

### El registro de migraciones estaba vacío de todo esto

Al ir a marcar las versiones nuevas apareció algo peor de lo esperado: los dos
registros eran **completamente disjuntos**. Producción tenía 55 versiones en
`supabase_migrations.schema_migrations` y **ninguna** coincidía con las 53 del
repositorio.

Es decir: las migraciones de este repo **nunca se habían aplicado con la CLI**.
Todo el esquema se construyó por el panel y por la Management API, y el registro
guardaba otra cosa (versiones que la propia interfaz iba generando).

La consecuencia era una mina: `supabase db push` habría intentado aplicar las 53
de golpe contra producción. Con la pasada de idempotencia la mayoría no habría
roto nada, pero `20260707000000` habría creado el trigger del webhook con el
literal `<SERVICE_ROLE_KEY>` y los correos de confirmación de inscripción
habrían dejado de enviarse.

Resuelto el 2026-08-11: las 53 versiones del repositorio quedan registradas como
aplicadas (`created_by = 'claude-code repair 2026-08-11'`), que es exactamente
lo que hace `supabase migration repair --status applied` pero por la Management
API, sin necesitar la contraseña de Postgres. Comprobado: hoy `db push` no
aplicaría nada.

Las 55 versiones antiguas siguen ahí y son inofensivas — `db push` solo mira
las locales que faltan. Aparecerán como "remote only" en `migration list`.

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

## 9. El histórico de inscripciones estuvo abierto a cualquiera — cerrado el 2026-08-14

`inscripcions_history` guarda en `previous_record` y `new_record` una copia
JSONB entera de la inscripción: nombre del alumno, del padre o la madre,
correo, teléfono y el resto del formulario. La política
`"Allow anonymous select history"` la dejaba con `USING (true)` para `anon`, y
`20260810000000_grants_por_defecto.sql` concede `SELECT` a `anon` sobre todas
las tablas de `public`.

Cualquiera con la anon key —que es pública por diseño y viaja en el bundle de
la web y en el HTML del proyecto de preinscripciones— podía leer el histórico
completo con una petición a `/rest/v1/inscripcions_history`. Sin sesión.

- **Cerrado** en `20260814100000_inscripcions_history_solo_admin.sql`: SELECT
  solo para admin. El INSERT anónimo se mantiene, porque lo escribe el trigger
  dentro de la transacción de la familia que envía la inscripción.
- **Fijado** en [`scripts/check-rls.sql`](../scripts/check-rls.sql): el workflow
  `Supabase` bloquea el merge si vuelve a aparecer una política de lectura
  abierta a `anon` sobre una tabla con datos personales.
- **Aplicado a producción el 2026-08-14** y comprobado desde fuera con la anon
  key: `activities` devuelve datos (la clave vale) e `inscripcions_history`
  devuelve `[]`.

Cómo se comprueba desde fuera, sin credenciales de admin:

```bash
curl -s "https://zaxbtnjkidqwzqsehvld.supabase.co/rest/v1/inscripcions_history?select=id&limit=1" \
  -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>"
```

Debe devolver `[]`, no filas.

## 10. El aviso de cuota puede llevar meses sin llegar

El cron de `usage-alert` (`20260417010000_usage_alert_cron.sql`) manda
`Content-Type` y `x-alert-secret`, y **no manda `Authorization`**. Si la función
se desplegó con `verify_jwt` activo, la plataforma la rechaza con 401 antes de
llegar al código, y el aviso de que Supabase se acerca al límite gratuito no ha
salido nunca.

No se ha tocado porque no se puede verificar desde el repositorio. **Cómo
comprobarlo**: Supabase → Edge Functions → `usage-alert` → Logs, filtrando por
lunes a las 08:00 UTC. Si hay 401, la solución es la misma que lleva
`activity-alert`: `verify_jwt = false` en `supabase/config.toml` y redesplegar.

**Descartada la duda del secreto** (2026-08-14): la prueba de extremo a extremo
`probar-avisos` dispara la llamada igual que el cron, con el valor de `vault`, y
`activity-alert` respondió **200**. Es decir, el secreto de `vault` y el
`USAGE_ALERT_SECRET` de las Edge Functions **coinciden**, y ese no puede ser el
motivo de que `usage-alert` no avise.

Queda solo la hipótesis de `verify_jwt`: si esa función se subió con la
verificación activa, la plataforma la rechaza antes de ejecutar una línea de
código. Los logs de la función lo dirán.

**Cómo probar cualquiera de los dos avisos cuando haga falta**: Actions →
Supabase → Run workflow → `probar-avisos`. Manda un correo real y enseña el
código HTTP que recibió la base de datos.

Es el caso de libro de una comprobación que ha dejado de comprobar: sigue
apareciendo como monitorización montada y no vigila nada.

## 11. ~~La instantánea del esquema no estaba armada~~ — hecho el 2026-08-14

`supabase/schema.snapshot.sql` ya existe: lo generó el propio workflow (4.568
líneas) aplicando las 56 migraciones sobre un Supabase limpio. El job compara
el volcado con la instantánea en cada PR que toque `supabase/`, y desde el
primer run devuelve "Esquema idéntico a la instantánea" — así que el volcado es
determinista y la comparación no va a dar falsos positivos por ruido de orden.

Cuando un cambio de esquema sea intencionado, se actualiza la instantánea en el
mismo PR que la migración. Si no, el job se pone en rojo.

## 11 bis. El despliegue de migraciones estaba bloqueado — resuelto el 2026-08-14

Se descubrió al aplicar de verdad las primeras migraciones desde la CLI:
`supabase db push` se negaba con *"Remote migration versions not found in local
migrations directory"*. El historial remoto tenía 54 versiones creadas desde el
panel que este repositorio no ha tenido nunca.

El punto 7 daba por hecho que eran inofensivas porque "`db push` solo mira las
locales que faltan". No es así: la CLI aborta. Es decir, el despliegue
automatizado de esquema nunca había funcionado, y solo se supo al usarlo.

Retiradas con `migration repair --status reverted` (solo toca la tabla de
metadatos; ni una tabla, función o política cambió). La lista y el porqué están
en [`supabase/legacy-remote-versions.txt`](../supabase/legacy-remote-versions.txt),
y el paso vive en el workflow bajo la opción `reparar-historico`.

## 12. Cinco pantallas hablan con Supabase sin pasar por `services/`

`NotificationBell`, `FeaturedProjects`, `AcollidaPage`, `LoginPage` e
`InscriptionPage` importan el cliente directamente. Consecuencia práctica: sus
consultas no las cubre ningún test —los tests de servicio son los que verifican
qué se manda a PostgREST— y un filtro olvidado devuelve filas de otras familias
sin dar ningún error.

Están inventariadas como excepciones **con motivo** en
[`scripts/check-invariants.mjs`](../scripts/check-invariants.mjs), y el guardián
impide que aparezcan más. **Criterio de cierre**: cuando las cinco tengan su
servicio, borrar las entradas de la lista y esta sección.

## 13. Cosas menores

- `README.md` sigue siendo la plantilla de Vite: no explica variables de
  entorno, cómo levantar el proyecto ni cómo desplegar.
- `package.json` conserva `deploy`/`predeploy` con `gh-pages`, restos de antes de
  Vercel. Confunden sobre cuál es el deploy real.
- No hay entorno de staging: se trabaja siempre contra el proyecto Supabase de
  producción. Por eso el job `desplegar` de `supabase.yml` es manual.

## 14. Borrar una inscripción era demasiado fácil y demasiado definitivo — resuelto el 2026-09-01

Se borró una inscripción del panel creyendo que estaba repetida. Se recuperó de
`audit_logs`, pero la revisión del proceso completo (formulario público →
listado → borrado → pagos) sacó seis cosas encadenadas:

1. **Una fila es una FAMILIA, no una criatura.** El listado enseña padre/madre,
   DNI, correo y teléfono en grande y las criaturas en 13px. Dos envíos de la
   misma familia se ven idénticos aunque tengan hijos distintos, y la única
   diferencia real queda en la columna que menos se mira.
2. **Nada impedía ni señalaba las repeticiones.** El formulario hacía un INSERT
   pelado; una familia que no ve el correo de confirmación reenvía y crea una
   segunda fila. El panel no las marcaba.
3. **`payments.inscripcion_id` no tenía clave ajena.** Borrar una inscripción
   dejaba sus pagos apuntando a un id inexistente, sin avisar.
4. **`remove_baja_payments_for_month` casaba por correo** cuando el pago no
   tenía `inscripcion_id`: una familia con una inscripción de baja y otra de
   alta con el mismo correo perdía también los pagos de la activa.
5. **El filtro y el selector de estado ofrecían «Pendent»**, que
   `inscripcions_status_check` no acepta: filtrar devolvía siempre cero filas y
   guardar reventaba contra la restricción.
6. **La exportación filtrada por actividad arrastraba de más.** El filtro previo
   es por familia (`filterInscriptionList` deja pasar la inscripción si
   *cualquiera* de sus criaturas encaja), así que la «Llista de grups» de una
   actividad salía con hermanos que no la hacen.

Y la red de seguridad no estaba versionada: `trg_audit_inscripcions`, que es lo
único que permite recuperar un borrado, existía solo en producción — creado a
mano, fuera de las migraciones. `inscripcions_history`, que parece el sitio
donde mirar, está vacía: solo la escriben dos RPC que el frontend no llama.

**Qué se hizo**: [`20260901120000_inscripcions_integritat.sql`](../supabase/migrations/20260901120000_inscripcions_integritat.sql)
(trigger de auditoría versionado, freno al duplicado exacto con SQLSTATE P0409,
clave ajena `ON DELETE RESTRICT` en `payments`, arreglo del borrado por correo,
`create_inscripcions_backup()` fuera del alcance de `anon`),
[`src/logic/inscriptionDuplicates.ts`](../src/logic/inscriptionDuplicates.ts)
(distingue «el mismo formulario dos veces» de «la misma familia con otra
criatura», que es toda la decisión) y
[`scripts/recuperar-inscripcio-esborrada.sql`](../scripts/recuperar-inscripcio-esborrada.sql).

**Lo que queda abierto**:

- La clave ajena entró `NOT VALID`: puede haber pagos huérfanos de borrados
  anteriores. El bloque 4 del script los lista; cuando devuelva cero filas, toca
  `VALIDATE CONSTRAINT` en una migración nueva.
- `audit_logs` se purga a los 90 días. Pasado ese plazo, un borrado no se
  recupera. Si algún día importa conservarlos más, hay que decidirlo antes, no
  después.
- `InscriptionStatus` en TypeScript sigue admitiendo `active`, `pending` y
  `suspended`, que la base no guarda. Los desplegables ya no los ofrecen, pero
  el tipo miente. **Criterio de cierre**: reducirlo a `'alta' | 'baja'` y
  arreglar lo que se rompa.
