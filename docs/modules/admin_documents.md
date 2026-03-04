# Admin Documents Manager Mapping & Audit

## 📋 Module Overview

`DocumentsManager.tsx` gestiona el ciclo de vida de los documentos públicos
(actas, normativas, etc.), incluyendo la subida a Storage y el registro en Base
de Datos.

## ⚠️ Technical Debt & Identified Issues

### 1. Infraestructura en la UI

- **Problema**: `supabase.storage` y `supabase.from('documents')` se llaman
  directamente desde el componente.
- **Riesgo**: Dificulta el testing y acopla la UI a la estructura de carpetas de
  Storage.

### 2. Localización Desactivada

- **Problema**: El código tiene `useTranslation` comentado y usa strings
  hardcodeados en catalán.
- **Impacto**: Incoherencia con el resto del backoffice.

### 3. Falta de Modularidad

- **Problema**: Un único archivo de ~300 líneas gestiona la lógica de subida,
  filtrado, borrado y el modal de UI.

### 4. Categorías Hardcodeadas

- **Problema**: `CATEGORIES` está definido como una constante local. Debería ser
  coherente con el sistema de tipos o venir de una configuración global.

## 🛠 Proposed Architecture

### Service Layer

- **AdminDocumentsService.ts**: Manejará `fetch`, `upload` (Storage + DB) y
  `delete` (Storage + DB).

### Components Modulares

1. **DocumentsAdminHeader**: Título y botón de subida.
2. **DocumentsAdminFilters**: Barra de búsqueda.
3. **DocumentsAdminList**: Tabla/Lista de documentos con sus metadatos.
4. **DocumentUploadModal**: Formulario complejo de subida con gestión de
   archivos.

## 🔄 Data Model

```typescript
interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  file_url: string;
  file_path: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
}
```
