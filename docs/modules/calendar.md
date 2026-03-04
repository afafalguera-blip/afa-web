# Public Calendar Page Mapping & Audit

## 📋 Module Overview

`GeneralCalendarPage.tsx` es el centro de eventos para las familias. Combina
eventos del calendario con noticias publicadas que tienen fecha de evento.

## ⚠️ Technical Debt & Identified Issues

### 1. Business Logic in View

- La lógica de `fetchEvents` combina datos de dos tablas (`events` y `news`),
  realiza transformaciones de fechas y mapeos de color, todo dentro del
  componente.

### 2. Deep Component Nesting

- El componente manejaba vistas de cuadrícula, lista y modales en un solo
  archivo de gran tamaño.

### 3. Mixed Responsibility

- La gestión de vistas (`month` | `week` | `day` | `agenda`) añadía complejidad
  innecesaria en el archivo principal.

## 🎯 Final Architecture

1. **Service Layer**: `CalendarService.ts` centraliza la obtención y el mapeo de
   eventos.
2. **Modular UI**:
   - `CalendarHeader.tsx`: Controles de navegación.
   - `MonthView.tsx`: Cuadrícula del calendario.
   - `AgendaView.tsx`: Lista de eventos (foco mobile).
   - `EventDetailModal.tsx`: Detalle extendido.
3. **Internalization**: Saneamiento de cadenas hardcodeadas para nombres de días
   y meses.
