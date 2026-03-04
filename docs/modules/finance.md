# Admin Finance Dashboard Mapping & Audit

## 📋 Module Overview

El `FinanceDashboard.tsx` es el centro de control económico del AFA. Permite ver
el balance, ingresos (incluyendo pagos de inscripciones) y despeses, además de
gestionar transacciones manuales con adjuntos (facturas/rebus).

## ⚠️ Technical Debt & Identified Issues

### 1. Monolito en UI

- **Problema**: `FinanceDashboard.tsx` gestionaba el estado de estadísticas, la
  lista de transacciones, el modal de creación y la lógica de subida de archivos
  en un solo archivo.
- **Acción**: Modularizado en `FinanceHeader`, `FinanceStats` y `FinanceTable`.

### 2. "God Service" (AdminService.ts)

- **Problema**: `AdminService.ts` mezclaba lógica de inscripciones con lógica de
  generación de pagos mensuales.
- **Acción**: Dividido en `AdminInscriptionsService.ts`,
  `AdminPaymentsService.ts` y `FinanceService.ts`.

### 3. Falta de Feedback en UI

- **Problema**: El diseño era funcional pero básico.
- **Acción**: Actualizado a una interfaz premium consistente con el resto del
  backoffice.

## 🎯 Final Architecture

1. **Service Split**: Servicios especializados para cada dominio.
2. **Modular UI**: Componentes pequeños y testeables.
3. **Consistency**: Uso de un sistema de diseño común.

## 🔄 Data Model (finance_transactions)

```typescript
interface FinanceTransaction {
  id?: string;
  date: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  payment_method: string;
  status: "paid" | "pending";
  attachment_url?: string;
}
```
