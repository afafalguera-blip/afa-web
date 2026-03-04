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
