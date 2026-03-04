# Admin News Manager Mapping & Audit

## 📋 Module Overview

`NewsManager.tsx` permite gestionar el ciclo de vida de las noticias (listar,
buscar, publicar/despublicar, eliminar y navegar a edición).

## ⚠️ Technical Debt & Identified Issues

### 1. Direct Infrastructure Dependency

- El componente importa `supabase` y realiza consultas directas
  (`.from('news').select('*')`).
- Las acciones de mutación (`delete`, `update`) también están inline.

### 2. Monolithic Component

- El renderizado de la cabecera, búsqueda y tarjetas de noticias está acoplado.
- La lógica de filtrado por texto está inline (`articles.filter(...)`).

### 3. Redundant Types

- Define su propia interfaz `NewsArticle`, que es casi idéntica a la que usamos
  en el servicio público.

### 4. Logic Duplication

- La lógica de publicación (`handleTogglePublish`) debería estar centralizada en
  un servicio para asegurar que los campos como `published_at` se gestionen de
  forma consistente.

## 🎯 Target Architecture

1. **AdminNewsService**: Crear un servicio para las operaciones de
   administración (obtener todas, eliminar, cambiar estado).
2. **Modular UI**:
   - `NewsAdminHeader.tsx`: Título y acciones globales (refrescar, crear).
   - `NewsAdminFilters.tsx`: Barra de búsqueda.
   - `NewsAdminCard.tsx`: Tarjeta con acciones de gestión (publicar, editar,
     borrar).
3. **Consistency**: Usar el tipo `NewsArticle` unificado.
