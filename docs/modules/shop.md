# Módulo: Shop (Tienda)

Módulo encargado de la gestión de productos, inventario y pedidos de la
asociación.

## 👥 Flujos de Usuario

1. **Exploración:** Navegación por el catálogo de productos (uniformes y
   accesorios).
2. **Carrito:** Selección de tallas y gestión de cantidades en el carrito de
   compra.
3. **Reserva:** Finalización del pedido (checkout) con recogida en el despacho
   del AFA.
4. **Gestión Admin:** Creación/edición de productos, control de stock y gestión
   de estados de pedidos y pagos.

## 🖼️ Archivos de UI (Componentes y Páginas)

- `ShopLanding.tsx`: Página principal del catálogo público.
- `ProductModal.tsx`: Vista detallada de un producto para selección de
  variantes.
- `CheckoutModal.tsx`: Formulario de confirmación de reserva.
- `OrderEditModal.tsx`: (Admin) Gestión detallada de un pedido existente.

## 🧠 Hooks y Lógica

- `CartContext.tsx`: Contexto global para la gestión del estado del carrito
  (items, totales, persistencia).

## 📡 Servicios y API

- `ShopService.ts`: Servicio que centraliza las llamadas a Supabase para:
  - CRUD de productos (`shop_products`).
  - CRUD de variantes (`shop_variants`).
  - Gestión de pedidos (`shop_orders` y `shop_order_items`).
  - Sincronización con el servicio de Finanzas al marcar pedidos como pagados.

## 🛠️ Tipos de Datos

- `shop.ts`: Definición de interfaces `ShopProduct`, `ShopVariant` y `CartItem`.

## ⚠️ Technical Debt Identified (Audit)

### 1. Loose Typing in Services

- `ShopService.ts` utilizaba `Record<string, unknown>` en transformaciones de
  órdenes. Se ha mejorado incorporando tipos estrictos.

### 2. Business Logic in UI

- `CheckoutModal.tsx` contenía lógica para la creación de órdenes complejas. Se
  ha centralizado en el servicio.
- `CartContext.tsx` calculaba totales ignorando el estado de membresía
  (corregido).

### 3. Missing Validations

- Se ha reforzado la integridad de datos al cargar el carrito desde
  `sessionStorage`.
