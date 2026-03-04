# Admin Events Manager Mapping & Audit

## 📋 Module Overview

`EventsManager.tsx` es el centro de control del calendario escolar de la AFA.
Permite visualizar eventos en formato mensual y lista, además de gestionar
(crear, editar, borrar) cada entrada.

## ⚠️ Technical Debt & Identified Issues

### 1. Massive Monolith (580+ lines)

- El archivo mezcla lógica de renderizado de calendario (generación de días),
  lógica de negocio (fetch de Supabase) y lógica de formularios complejas.

### 2. Infrastructure Coupling

- Uso directo de `supabase` para todas las operaciones CRUD.
- No hay separación entre la obtención de datos y su representación.

### 3. Redundant Logic

- La generación de días del calendario (`generateCalendarDays`) y la navegación
  de meses están inline.
- Los tipos de eventos (`EVENT_TYPES`) y su lógica de color están definidos como
  constantes locales que podrían ser necesarias en otros sitios (e.g., el
  calendario público).

### 4. Direct i18n Dependencies in Logic

- Uso de `currentMonth.toLocaleDateString('es-ES', ...)` forzado a español,
  ignorando potencialmente la configuración global de i18n si no se maneja con
  cuidado.

## 🎯 Target Architecture

1. **AdminCalendarService**: Centralizar operaciones CRUD y lógica de fechas.
2. **Modular Components**:
   - `CalendarAdminHeader.tsx`: Acciones globales.
   - `CalendarAdminGrid.tsx`: La cuadrícula interactiva.
   - `EventAdminList.tsx`: Listado detallado de bajo el calendario.
   - `EventFormModal.tsx`: Formulario de creación y edición.
3. **Consistency**: Asegurar que los tipos de eventos y colores sean coherentes
   con la parte pública.
