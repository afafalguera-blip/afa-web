# Auth System Mapping & Audit

## 📋 Module Overview

El sistema de autenticación gestiona la sesión del usuario, la recuperación de
perfiles de Supabase y el control de acceso basado en roles.

## 🏗️ Structure & Responsibilities

| File                                | Responsibility                                  | Health Status          |
| :---------------------------------- | :---------------------------------------------- | :--------------------- |
| `src/core/contexts/AuthContext.tsx` | Gestión del estado de sesión, usuario y perfil. | 🟡 Loose Profile Types |
| `src/hooks/useAuth.ts`              | Hook de conveniencia para acceder al contexto.  | ✅ Good                |
| `src/pages/auth/LoginPage.tsx`      | UI y lógica de login (Email/Google).            | ✅ Refactored Catch    |

## 🔍 Technical Debt & Improvements

### 1. Global Profile Types

- La interfaz `Profile` se ha centralizado para su reutilización en servicios.

### 2. Robust Error Handling

- Se han refactorizado los bloques `catch` de `LoginPage.tsx` para eliminar el
  uso de `any` y usar `unknown`.

### 3. Role Logic

- Se ha simplificado la lógica de verificación de roles para escalar a futuros
  perfiles (monitor, familia, etc.).

## 🚀 Future Roadmap

1. **Enhanced Context**: Añadir `isMonitor`, `isFamilia` y un método
   `refreshProfile`.
2. **Senior Standard Compliance**: Continuar la limpieza de residuos de `any` en
   flujos secundarios.
