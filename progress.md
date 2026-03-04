# Progress Report - AFA Web

## 🏗️ Diagnóstico Arquitectónico

- **Framework Principal:** React 19 + Vite 7 (TypeScript).
- **Estilos:** Tailwind CSS v3.
- **Backend:** Supabase (Auth, DB, Edge Functions).
- **Arquitectura:** **Screaming Architecture** (Modular por Features e
  Infraestructura de Servicios).
- **Documentación Central:** Ver [Guía de Arquitectura](docs/architecture.md).

## 🧩 Módulos Documentados (`docs/modules/`)

Hemos completado el mapeo y auditoría de todos los módulos del sistema:

1. **Shop (Tienda):** Gestión de existencias y pedidos.
2. **Inscriptions (Inscripciones):** Flujos públicos y gestión admin de alumnos.
3. **Finance (Administración):** Balance, transacciones y facturación.
4. **Calendar/Events:** Agenda escolar pública y administrativa.
5. **Documents:** Gestor de actas y recursos con integración a Storage.
6. **News:** Sistema de noticias y publicaciones.
7. **Auth:** Control de acceso y perfiles.
8. **Observability:** Logs de auditoría de base de datos.
9. **Otros:** Contacto, Dashboard Admin, Home, Cuotas.

## 🩺 Technical Health (Clean Code Status)

- **Build Status:** ✅ PASSED (0 errors).
- **Lint Status:** ✅ PASSED (0 errors).
- **Hitos de Calidad:**
  - Migración a **Servicios Especializados** (Sustitución del antiguo
    `AdminService`).
  - Eliminación masiva de tipos `any` en componentes críticos.
  - Saneamiento de directivas `@ts-ignore` mediante tipado fuerte.
  - Modularización de componentes monolíticos (>200 líneas).

## 🗺️ Mapa de Módulos

Todos los mapas detallados de infraestructura y deuda técnica se encuentran
disponibles en la carpeta [docs/modules/](docs/modules/).
