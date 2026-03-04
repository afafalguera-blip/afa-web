# Public Documents Page Mapping & Audit

## 📋 Module Overview

La página de documentos permite a las familias descargar actas, normativas y
otros recursos.

## ⚠️ Technical Debt & Identified Issues (Resolved)

### 1. Hardcoded Texts

- Se han movido todos los textos en catalán/español hardcodeados a los archivos
  de traducción.

### 2. Monolithic Component

- La lógica de obtención de datos se ha extraído al servicio correspondiente.
- Se han creado componentes para `DocumentCard` y `DocumentFilters`.

### 3. Missing Service Layer

- Las llamadas directas a Supabase se han reemplazado por el uso de
  `DocumentsService.ts`.

## 🎯 Final Architecture

1. **Service Layer**: `DocumentsService.ts` gestiona la lógica de datos.
2. **Modular UI**: Componentes independientes para tarjetas y filtros.
3. **i18n**: Integración total con el sistema de internacionalización.
