# Admin Observability Mapping & Audit

## 📋 Module Overview

`AdminObservability.tsx` muestra los logs de auditoría del sistema
(`audit_logs`), permitiendo a los administradores rastrear cambios en las tablas
de la base de datos.

## ⚠️ Technical Debt & Identified Issues

### 1. Acoplamiento de Datos

- **Problema**: El componente realiza la consulta a Supabase directamente en un
  `useEffect`.
- **Riesgo**: Dificulta el cambio de la estructura de logs o la adición de
  filtros complejos en el futuro.

### 2. Lógica de Presentación Mezclada

- **Problema**: La función `getActionColor` y el mapeo de filas de la tabla
  están dentro del componente principal.
- **Impacto**: Menor legibilidad a medida que el componente crezca (ej. si se
  añaden detalles del JSON de cambios).

### 3. Falta de Modularidad

- **Problema**: No hay separación entre la cabecera, la tabla y los estados de
  carga.

## 🛠 Proposed Architecture

### Service Layer

- **AdminObservabilityService.ts**: Encapsulará la consulta a `audit_logs` con
  la unión a `profiles`.

### Components Modulares

1. **ObservabilityHeader**: Título y descripción.
2. **ObservabilityLogTable**: Tabla estilizada para mostrar los logs.
3. **ObservabilityActionBadge**: Componente pequeño para mostrar la acción
   (INSERT/UPDATE/DELETE) con el color correcto.

## 🔄 Data Model

```typescript
interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}
```
