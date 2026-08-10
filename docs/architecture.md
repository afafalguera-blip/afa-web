# Arquitectura del Proyecto AFA Web

Este documento describe la arquitectura técnica, los patrones de diseño y los
estándares de código implementados en el proyecto.

## 🏗️ Patrón Arquitectónico

Seguimos una **Screaming Architecture** (Arquitectura Chillona) que prioriza la
visibilidad de las funcionalidades del negocio sobre los detalles técnicos del
framework.

### Estructura de Carpetas

- `src/features/`: Contiene módulos de negocio completos (ej. `shop`). Cada
  feature encapsula sus componentes, tipos y lógica específica.
- `src/services/`: Capa de infraestructura que centraliza las llamadas a APIs
  (Supabase).
- `src/pages/`: Orquestadores de alto nivel que componen features y componentes
  comunes.
- `src/components/`: Componentes genéricos y compartidos (UI kit).
- `src/core/`: Contextos globales, configuraciones y utilidades transversales.

## 🛠️ Estándares de "Clean Code"

Aplicamos un estándar de código senior para asegurar la mantenibilidad a largo
plazo:

1. **Saneamiento de Tipos (Anti-Any)**: El uso de `any` está prohibido.
   Definimos interfaces estrictas para cada dato que fluye por la aplicación.
2. **Servicios Especializados**: Hemos dividido el antiguo `AdminService.ts`
   monolítico en servicios atómicos por dominio (`AdminInscriptionsService`,
   `AdminNewsService`, etc.).
3. **UI Modular**: Si un componente supera las 100-200 líneas o tiene
   responsabilidades mixtas (lógica y renderizado pesado), se descompone en
   sub-componentes.
4. **Early Returns & Guard Clauses**: Preferimos el retorno temprano para evitar
   anidamientos innecesarios (`if/else`).
5. **i18n First**: Todos los strings de la aplicación deben pasar por el sistema
   de internacionalización (`react-i18next`).

## 📡 Comunicación con Backend

Utilizamos **Supabase** como backend-as-a-service. La capa de `services/` es la
única responsable de interactuar con el cliente de Supabase, proporcionando una
interfaz limpia a los componentes de React.

## 🩺 Mantenimiento de Salud

El proyecto mantiene un ciclo de auditoría constante mediante:

- **Linting**: Reglas estrictas de ESLint para detectar deuda técnica.
- **TypeScript**: Chequeo de tipos en build time (`tsc --noEmit`).
- **Tests**: Vitest sobre la lógica pura (`src/utils`, `src/logic`, y la lógica
  de negocio de `src/services`). Viven en `src/tests/` y no tocan la red: los
  servicios que importan Supabase funcionan con las variables falsas declaradas
  en `vitest.config.ts`.
- **CI**: `.github/workflows/ci.yml` ejecuta lint, tipos, tests con cobertura y
  build en cada push y pull request.
- **Gate de publicación**: el `buildCommand` de `vercel.json` es `npm run ci`,
  no `npm run build`. Si lint, tipos, tests o la guarda de migraciones fallan,
  el build de Vercel falla y **no se publica nada**: sigue en línea la versión
  anterior.
- **Supabase**: `.github/workflows/supabase.yml` valida los nombres de las
  migraciones y las aplica desde cero en un Supabase limpio. El despliegue a
  producción (`db push` + `functions deploy`) es **manual**, desde
  Actions → Supabase → Run workflow, porque no hay entorno de staging.
- **Dependencias**: Dependabot semanal agrupado por familia
  (`.github/dependabot.yml`).

### Comandos

```bash
npm run lint          # ESLint (0 errores; los avisos son deuda inventariada)
npm run typecheck     # tsc -b
npm test              # Vitest, una pasada
npm run test:watch    # Vitest en modo watch
npm run test:coverage # Vitest + informe de cobertura en coverage/
npm run check:migrations # nombres de supabase/migrations
npm run ci            # todos los gates, igual que en GitHub Actions
```

### Secrets que espera CI

| Secret | Dónde se usa | Cómo se obtiene |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | job `desplegar` | Supabase → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | job `desplegar` | Contraseña de Postgres del proyecto |

```bash
gh secret set SUPABASE_ACCESS_TOKEN --repo afafalguera-blip/afa-web
gh secret set SUPABASE_DB_PASSWORD  --repo afafalguera-blip/afa-web
```

Estado y deuda conocida: [auditoria-mantenibilidad-2026-08.md](./auditoria-mantenibilidad-2026-08.md)
y [deuda-tecnica.md](./deuda-tecnica.md).
