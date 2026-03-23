# Progress Report - AFA Web

## Diagnóstico Arquitectónico

- **Framework Principal:** React 19 + Vite 7 (TypeScript).
- **Estilos:** Tailwind CSS v3.
- **Backend:** Supabase (Auth, DB, Edge Functions).
- **Arquitectura:** **Screaming Architecture** (Modular por Features e
  Infraestructura de Servicios).
- **Documentación Central:** Ver [Guía de Arquitectura](docs/architecture.md).

## Estado de Módulos

| Módulo | Service Layer | UI Modular | i18n | Estado |
|--------|:---:|:---:|:---:|--------|
| Shop (Tienda) | ✅ ShopService | ✅ | ✅ | **Completado** |
| Inscriptions | ✅ AdminInscriptionsService | ✅ | ✅ | **Completado** |
| Finance | ✅ FinanceService | ✅ | ✅ | **Completado** |
| Calendar/Events (Admin) | ✅ AdminCalendarService | ✅ | ✅ | **Completado** |
| Calendar (Público) | ✅ CalendarService | ✅ | ✅ | **Completado** |
| Documents (Admin) | ✅ AdminDocumentsService | ✅ | ✅ | **Completado** |
| Documents (Público) | ✅ DocumentsService | ✅ | ✅ | **Completado** |
| News (Admin List) | ✅ AdminNewsService | ✅ | ✅ | **Completado** |
| News (Editor) | ✅ AdminNewsEditorService | ✅ EditorToolbar + Sidebar + Preview | ✅ | **Completado** |
| Activities (Admin) | ✅ ActivityService | ✅ | ✅ | **Completado** |
| Observability | ✅ AdminObservabilityService | ✅ | ✅ | **Completado** |
| Auth | ✅ AuthContext | ✅ | ✅ | **Completado** |
| Contact | ✅ | ✅ | ✅ | **Completado** |
| Dashboard Admin | ✅ useInscriptions | ✅ | ✅ | **Completado** |
| Cuotas | — | ✅ | ✅ | **Completado** |
| Tasks Manager | ✅ AdminTasksService | ✅ TaskCard + Filters + Modal + Stats | ✅ | **Completado** |
| Projects Manager | ❌ | ❌ 520 líneas | ❌ | **Pendiente** |

## Archivos con Deuda Técnica (>300 líneas)

| Archivo | Líneas | Problema |
|---------|--------|----------|
| `pages/admin/NewsEditorPage.tsx` | ~~883~~ → 309 | ✅ Refactorizado: EditorToolbar, NewsEditorSidebar, NewsPreview, AdminNewsEditorService |
| `pages/admin/TasksManager.tsx` | ~~871~~ → 254 | ✅ Refactorizado: TaskCard, TaskFilters, TaskFormModal, TaskStatsBar |
| `pages/InscriptionPage.tsx` | 568 | Formulario público largo |
| `pages/admin/ProjectsManager.tsx` | 520 | Manager sin service layer |
| `services/ExportService.ts` | 459 | Service grande (aceptable) |
| `components/admin/ActivityEditorModal.tsx` | 441 | Modal editor extenso |
| `pages/admin/NotificationManager.tsx` | 436 | Manager sin modularizar |
| `components/layout/AdminLayout.tsx` | 400 | Layout complejo |
| `components/admin/ProductEditorModal.tsx` | 394 | Modal editor extenso |

## Technical Health

- **Build Status:** ✅ PASSED (0 errors).
- **Lint Status:** ✅ PASSED (0 errors).
- **Hitos Completados:**
  - Migración a Servicios Especializados (eliminación del antiguo `AdminService`).
  - Eliminación masiva de tipos `any` en componentes críticos.
  - Saneamiento de directivas `@ts-ignore` mediante tipado fuerte.
  - Modularización de 15/17 módulos principales.

## Próximos Pasos (por prioridad)

1. ~~**Refactorizar NewsEditorPage.tsx**~~ — ✅ Completado (883 → 309 líneas).
2. ~~**Refactorizar TasksManager.tsx**~~ — ✅ Completado (871 → 254 líneas).
3. **Refactorizar ProjectsManager.tsx** — Crear service layer y modularizar UI.
4. **Revisar modals grandes** — ActivityEditorModal, ProductEditorModal, NotificationManager.

## Mapa de Módulos

Mapas detallados en [docs/modules/](docs/modules/).
