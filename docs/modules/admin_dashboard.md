# Admin Dashboard Mapping & Audit

## 📋 Module Overview

El Dashboard es el panel principal para la gestión de inscripciones y
estadísticas financieras para administradores.

## ⚠️ Technical Debt & Identified Issues (Resolved)

### 1. Duplicated Filtering Logic

- Se ha eliminado la lógica de filtrado duplicada en `InscriptionsTable.tsx`,
  delegando la responsabilidad al hook `useInscriptions.ts`.

### 2. Missing Type Safety (`any`)

- Se han definido interfaces estrictas para `InscriptionsTable`, `Filters` y el
  propio `Dashboard`.

### 3. Logic Fragmentation

- La definición de "alumno activo" se ha centralizado en el mapeo de datos del
  servicio.

## 🎯 Final Architecture

1. **Source of Truth**: El hook `useInscriptions` es el único responsable de los
   datos procesados.
2. **UI "Dumb" Components**: Los componentes de visualización no realizan
   transformaciones de datos pesadas.
3. **Strict Props**: Tipado completo en todos los componentes del dashboard.
