# Admin Activities Manager Mapping & Audit

## 📋 Module Overview

`ActivitiesManager.tsx` permite a los administradores listar, crear, editar y
eliminar actividades extraescolares.

## ⚠️ Technical Debt & Identified Issues

### 1. Hardcoded Category Display

- Al igual que en la parte pública, las categorías se muestran tal cual vienen
  de la base de datos, sin pasar por el sistema de traducción centralizado.

### 2. UI Monolith (Grid & Cards)

- El renderizado de la cuadrícula y de cada tarjeta de actividad está dentro del
  mismo archivo.
- La lógica de colores dinámicos (`${activity.color}`) está acoplada al
  renderizado.

### 3. Price Display Logic

- La lógica de visualización de precios es más simple que en la parte pública
  (solo muestra `activity.price`), lo cual podría ser inconsistente si el
  administrador quiere ver ambos precios (socio/no socio).

## 🎯 Target Architecture

1. **Reuse Public Utils**: Integrar `CategoryUtils.ts` para que las categorías
   en el administrador coincidan con las de la web pública.
2. **Modular UI**:
   - `ActivityAdminCard.tsx`: Componente para la tarjeta de administración con
     acciones de edición/borrado.
   - `ActivityAdminGrid.tsx`: Orquestador de la visualización de la lista.
3. **Saneamiento**: Limpiar `ActivitiesManager.tsx` para que actúe como un
   controlador de alto nivel.
