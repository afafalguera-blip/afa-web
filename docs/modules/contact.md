# Public Contact Page Mapping & Audit

## 📋 Module Overview

`ContactPage.tsx` permite a los usuarios enviar mensajes al AFA y ver
información de contacto (horarios, email, redes sociales).

## ⚠️ Technical Debt & Identified Issues (Refactored)

### 1. UI Monolith

- **Antes**: Formulario y tarjetas en un solo archivo.
- **Después**: Separado en `ContactInfo.tsx` y `ContactForm.tsx`.

### 2. Form Logic Inlining

- **Acción**: La lógica se ha simplificado delegando en `ContactService` y
  `ConfigService`.

### 3. Translation Safety

- **Acción**: Se han eliminado los `as any` en las llamadas a `t()` para
  asegurar la integridad de las traducciones.

## 🎯 Final Architecture

1. **Modular UI**: Componentes especializados para información y formulario.
2. **Simplified Page**: La página actúa como contenedor sin lógica pesada.
3. **Strict i18n**: Seguridad de tipos total en el sistema de traducción.
