# Módulo: Inscripciones (Inscriptions)

Módulo encargado de la gestión de alta de alumnos en actividades y servicios del
AFA.

## 👥 Flujos de Usuario

1. **Público:** Formulario de inscripción para familias (`InscriptionPage.tsx`).
2. **Administración:** Gestión de listados, estados de alta/baja y edición de
   datos (`InscriptionsPage.tsx`).
3. **Exportación:** Generación de listados en PDF/Excel para monitores.

## 📡 Servicios y API

- **AdminInscriptionsService.ts**: Nuevo servicio especializado que sustituye la
  lógica de inscripciones del antiguo `AdminService`.
- **AdminPaymentsService.ts**: Gestión de la generación de recibos mensuales
  basados en las inscripciones.

## 🛠️ Tipos de Datos

- `inscription.ts`: Definición de interfaces `InscriptionStudent`, `Inscription`
  y estados.

## ⚠️ Technical Debt & Improvements (Refactored)

### 1. Purgado de `any`

- Se han eliminado los casts a `any` en el modal de edición y en la tabla
  principal.

### 2. Separación de Responsabilidades

- La lógica de pagos se ha separado de la gestión de alumnos.
- El servicio administrativo ahora es atómico y fácil de testear.

### 3. Saneamiento de `@ts-ignore`

- Eliminadas las directivas de ignorado al asegurar que los objetos de Supabase
  cumplen con las interfaces de TypeScript.
