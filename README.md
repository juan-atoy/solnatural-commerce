# SolNatural Commerce

[ROL]: Arquitecto de Software Full Stack Senior especializado en Lovable + Supabase, diseño de plataformas eCommerce modernas, PostgreSQL, Row Level Security (RLS), autenticación, almacenamiento de archivos, funciones server-side, analítica de ventas y UX/UI responsive.

[OBJETIVO]: Diseñar e implementar en Lovable una aplicación web eCommerce completa llamada SolNatural´s, orientada a la venta de productos naturales, utilizando Supabase como backend principal para autenticación, base de datos PostgreSQL, almacenamiento, seguridad y lógica server-side.

La aplicación debe permitir a los clientes consultar el catálogo, realizar pedidos y consultar su historial. El administrador debe gestionar productos, inventario, pedidos, clientes, notificaciones y disponer de un dashboard financiero que muestre ventas totales, costos, ganancias y margen de rentabilidad.

[CONTEXTO TÉCNICO]:

Plataforma de desarrollo: Lovable.

Frontend: React + TypeScript generado/mantenido desde Lovable.

Backend/BaaS: Supabase.

Base de datos: PostgreSQL administrado por Supabase.

Autenticación: Supabase Auth.

Autorización: Supabase RLS + roles.

Almacenamiento de imágenes: Supabase Storage.

Lógica server-side: Supabase Edge Functions cuando sea necesario.

Realtime: Supabase Realtime para notificaciones administrativas.

Emails: Supabase Edge Functions + proveedor de correo transaccional configurable.

Diseño: moderno, responsive, mobile-first y orientado a conversión.

Persistencia: completamente basada en Supabase.

Problema actual:
Se requiere construir desde cero una tienda online mantenible para productos naturales, con administración de inventario, pedidos, clientes, notificaciones y métricas financieras.

Código / Query base:
<input_code>
Proyecto nuevo en Lovable. No existe código base.
</input_code>

[REQUERIMIENTOS]:

1. Arquitectura general

Construye la aplicación utilizando Lovable como capa principal de desarrollo frontend e integración.

NO crear un backend tradicional independiente con Node.js/NestJS.

Utilizar Supabase para:

PostgreSQL.

Auth.

Storage.

Realtime.

Row Level Security.

Edge Functions.

Triggers y funciones PostgreSQL cuando estén justificadas.

Separar claramente:

UI.

Hooks.

Servicios Supabase.

Tipos.

Validaciones.

Lógica de negocio.

Componentes reutilizables.

La aplicación debe quedar preparada para crecimiento sin sobreingeniería.

2. Roles

Implementar como mínimo:

admin

customer

No confiar únicamente en validaciones del frontend.

La autorización real debe implementarse mediante:

RLS.

políticas PostgreSQL;

funciones seguras cuando corresponda.

Un cliente nunca debe poder acceder a:

pedidos de otros clientes;

datos administrativos;

costos de productos;

ganancias;

métricas financieras;

auditoría;

movimientos internos de inventario.

3. Catálogo público

Crear catálogo visual moderno con:

productos destacados;

categorías;

búsqueda;

filtros;

ordenamiento;

paginación o carga incremental;

detalle de producto;

productos relacionados.

Cada producto debe tener:

SKU;

nombre;

slug;

descripción corta;

descripción completa;

categoría;

marca opcional;

precio de venta;

costo unitario;

precio promocional opcional;

stock;

stock mínimo;

unidad/presentación;

ingredientes;

beneficios;

modo de uso;

advertencias;

imagen principal;

galería;

estado;

destacado;

timestamps.

IMPORTANTE:

El campo cost_price o costo unitario debe ser estrictamente administrativo y nunca exponerse públicamente.

4. Estados de productos

Implementar:

draft
active
out_of_stock
discontinued
inactive


Reglas:

active: disponible para compra si existe stock.

out_of_stock: visible, pero no permite compra.

discontinued: producto descontinuado.

inactive: oculto.

draft: visible únicamente para administración.

Cuando el stock llegue a cero, actualizar automáticamente el estado o impedir ventas según la estrategia implementada.

5. Categorías

Crear administración completa de categorías:

nombre;

slug;

descripción;

imagen;

estado;

orden;

categoría padre opcional.

Permitir estructura jerárquica.

6. Supabase Storage

Crear bucket para imágenes de productos.

Implementar:

carga;

eliminación controlada;

múltiples imágenes;

imagen principal;

validación de extensión;

validación MIME;

límite de tamaño;

nombres únicos.

Definir políticas de Storage para que:

usuarios públicos puedan consultar imágenes públicas;

solamente administradores puedan cargar, modificar o eliminar archivos.

7. Clientes

Utilizar Supabase Auth.

Permitir:

registro;

login;

logout;

recuperación de contraseña;

actualización de contraseña;

perfil;

direcciones;

historial de pedidos.

Crear una tabla profiles relacionada con auth.users.

Información:

id;

nombre;

apellidos;

teléfono;

documento opcional;

avatar opcional;

created_at;

updated_at.

Crear tabla independiente para direcciones.

8. Carrito

Implementar carrito persistente.

Para usuarios no autenticados:

localStorage.

Para usuarios autenticados:

Supabase.

Permitir:

agregar productos;

modificar cantidades;

eliminar;

vaciar;

consultar subtotal;

descuentos;

envío;

total.

Antes de crear el pedido, volver a consultar desde Supabase:

producto;

estado;

precio;

promoción;

inventario.

Nunca confiar en:

price
cost
discount
total


provenientes del navegador como fuente de verdad.

9. Checkout

Crear flujo:

carrito;

datos personales;

dirección;

método de entrega;

método de pago;

resumen;

confirmación.

Inicialmente soportar:

transferencia bancaria;

contraentrega.

Diseñar la aplicación para integrar posteriormente:

Wompi;

Mercado Pago;

PayU;

Stripe.

No acoplar la estructura de pedidos a un proveedor concreto.

10. Pedidos

Crear tabla orders.

Campos sugeridos:

id
order_number
customer_id
customer_name
customer_email
customer_phone
shipping_address
shipping_city
shipping_region
shipping_country
subtotal
discount_total
shipping_total
total
total_cost
gross_profit
payment_method
payment_status
order_status
notes
created_at
updated_at


Estados:

pending
confirmed
processing
ready
shipped
delivered
cancelled


Estados de pago:

pending
paid
failed
refunded


11. Detalle de pedido

Crear order_items.

Guardar snapshot histórico:

product_id
sku
product_name
quantity
unit_price
unit_cost
discount
line_total
line_cost
line_profit


El pedido histórico NO debe depender de modificaciones futuras realizadas al producto.

12. Cálculo de ganancias

Implementar correctamente las métricas financieras.

Por cada ítem:

line_total = unit_price * quantity
line_cost = unit_cost * quantity
line_profit = line_total - line_cost - discount


Por pedido:

gross_sales = SUM(line_total)
total_cost = SUM(line_cost)
gross_profit = gross_sales - total_cost - discount_total


Si existe costo de envío asumido por la empresa, dejar la arquitectura preparada para almacenar:

shipping_customer_charge
shipping_company_cost


y calcular:

net_profit =
gross_sales
- total_cost
- discounts
+ shipping_customer_charge
- shipping_company_cost


No utilizar valores flotantes para dinero.

En PostgreSQL utilizar:

NUMERIC(12,2)


o precisión superior cuando corresponda.

13. Dashboard administrativo financiero

Crear un dashboard profesional con indicadores.

Mostrar como mínimo:

Ventas

ventas brutas de hoy;

ventas brutas del mes;

ventas brutas del año;

ventas históricas totales.

Costos

costo de mercancía vendida hoy;

costo del mes;

costo histórico.

Ganancias

ganancia bruta de hoy;

ganancia bruta del mes;

ganancia bruta del año;

ganancia acumulada.

Rentabilidad

Mostrar:

Margen bruto (%) =
(ganancia / ventas) * 100


14. Analítica administrativa

Agregar:

número total de pedidos;

pedidos del día;

pedidos pendientes;

pedidos completados;

ticket promedio;

productos vendidos;

producto más vendido;

producto con mayor facturación;

producto con mayor ganancia;

categorías con mayores ventas;

clientes con mayor volumen de compra;

productos agotados;

productos con bajo stock.

15. Gráficas

En el dashboard crear gráficas modernas para:

ventas por día;

ventas por mes;

ganancias por día;

ganancias por mes;

ventas vs costos;

ventas vs ganancias;

pedidos por estado;

productos más vendidos;

categorías con mayor facturación.

Permitir seleccionar rangos:

Hoy
7 días
30 días
Este mes
Mes anterior
Este año
Personalizado


16. Qué pedidos cuentan como venta

No contar cualquier pedido creado como ingreso definitivo.

Definir claramente qué estados contribuyen a métricas.

Por defecto utilizar únicamente pedidos válidos como:

confirmed
processing
ready
shipped
delivered


Excluir:

cancelled


Para indicadores de ingresos realmente cobrados, utilizar adicionalmente:

payment_status = paid


Mostrar separadamente cuando tenga sentido:

ventas registradas;

ventas pagadas;

ventas pendientes de pago.

17. Consultas financieras

Crear funciones PostgreSQL, vistas o RPCs seguras para calcular estadísticas en servidor.

Ejemplos:

get_sales_summary()
get_sales_by_period()
get_profit_summary()
get_top_products()
get_sales_by_category()
get_low_stock_products()


Estas funciones deben:

aceptar rango de fechas;

validar permisos;

ejecutar agregaciones en PostgreSQL;

evitar traer miles de filas al frontend para calcular estadísticas.

Solamente administradores deben poder invocar funciones financieras sensibles.

18. Inventario

Crear inventory_movements.

Tipos:

purchase
sale
return
adjustment
cancellation
manual_entry


Guardar:

product_id;

movement_type;

quantity;

previous_stock;

new_stock;

order_id opcional;

notes;

created_by;

created_at.

Cada pedido confirmado debe descontar inventario de forma segura.

19. Concurrencia

La creación de pedidos debe evitar overselling.

NO implementar este flujo exclusivamente desde React.

Crear una función PostgreSQL o Edge Function transaccional que:

reciba los productos solicitados;

consulte productos reales;

valide estado;

bloquee/controle concurrencia;

valide inventario;

consulte precio actual;

consulte costo actual;

cree pedido;

cree order_items;

descuente inventario;

genere movimientos;

calcule totales;

calcule costos;

calcule ganancia;

confirme la transacción.

Si algún producto no tiene inventario suficiente:

hacer rollback;

retornar error controlado.

20. Seguridad financiera

Los campos:

cost_price
unit_cost
line_cost
line_profit
total_cost
gross_profit
net_profit


NUNCA deben estar disponibles para clientes.

Crear RLS específica para impedirlo.

Si una tabla pública contiene información financiera sensible, evitar exponer directamente dicha tabla.

Utilizar:

vistas;

RPCs;

Edge Functions;

separación de datos;

cuando sea necesario.

21. Panel administrativo

Crear menú administrativo con:

Dashboard
Pedidos
Productos
Categorías
Inventario
Clientes
Notificaciones
Reportes
Configuración


22. Gestión de productos

Permitir:

crear;

editar;

duplicar;

activar;

desactivar;

marcar agotado;

descontinuar;

modificar precio;

modificar costo;

gestionar stock;

gestionar imágenes;

consultar movimientos.

Mostrar:

precio venta;

costo;

ganancia unitaria;

margen.

Calcular:

ganancia_unitaria = precio_venta - costo


y:

margen (%) = ((precio_venta - costo) / precio_venta) * 100


23. Pedidos administrativos

Permitir:

consultar pedidos;

filtrar;

buscar;

cambiar estado;

cambiar estado de pago;

visualizar detalle;

visualizar margen del pedido;

agregar notas;

consultar historial.

Mostrar claramente:

Venta
Costo
Ganancia
Margen


solo para administradores.

24. Notificaciones en la aplicación

Cuando se genere un pedido:

Crear registro en tabla:

notifications


Campos:

id
user_id
type
title
message
entity_type
entity_id
is_read
created_at


El administrador debe recibir inmediatamente:

Nuevo pedido #XXXX por $XXX


Utilizar Supabase Realtime para actualizar las notificaciones sin recargar la página.

Agregar:

badge de pendientes;

dropdown;

listado;

marcar como leída;

marcar todas como leídas;

enlace directo al pedido.

25. Email al administrador

Cuando exista un nuevo pedido, enviar email al administrador.

No enviar directamente desde el frontend.

Utilizar:

Supabase Edge Function


con proveedor de email configurable.

El correo debe contener:

número de pedido;

fecha;

cliente;

teléfono;

productos;

cantidades;

total;

dirección;

método de pago;

enlace al panel.

26. Email al cliente

Enviar confirmación al cliente con:

número de pedido;

productos;

cantidades;

total;

dirección;

método de pago;

estado inicial.

El fallo del correo NO debe eliminar ni invalidar el pedido.

27. Auditoría

Crear audit_logs.

Registrar cambios administrativos:

producto creado;

producto actualizado;

precio actualizado;

costo actualizado;

stock actualizado;

pedido actualizado;

estado modificado;

configuración modificada.

Campos:

id
user_id
action
entity
entity_id
old_values
new_values
created_at


Usar JSONB donde corresponda.

28. Tablas Supabase sugeridas

Diseñar y crear como mínimo:

profiles
user_roles
addresses
categories
products
product_images
carts
cart_items
orders
order_items
order_status_history
inventory_movements
notifications
audit_logs
store_settings


Agregar las tablas auxiliares que técnicamente se requieran.

29. RLS

Activar RLS en todas las tablas sensibles.

Crear políticas explícitas.

Ejemplos:

products

Público:

SELECT solamente productos visibles.


Admin:

CRUD completo.


orders

Cliente:

SELECT solamente WHERE customer_id = auth.uid()


Admin:

SELECT/UPDATE todos.


order_items

Cliente:

solamente registros asociados a sus pedidos.


notifications

solamente el usuario propietario.


inventory_movements

solamente administradores.


audit_logs

solamente administradores.


No crear políticas inseguras del tipo:

USING (true)


para tablas administrativas.

30. Función para determinar administrador

Crear una implementación segura para comprobar roles evitando recursión de políticas RLS.

Ejemplo conceptual:

has_role(auth.uid(), 'admin')


Implementar mediante función PostgreSQL segura cuando corresponda.

31. Migraciones

Todas las modificaciones de base de datos deben generarse como migraciones SQL reproducibles.

No depender exclusivamente de cambios manuales realizados en el dashboard de Supabase.

Cada migración debe incluir:

tablas;

constraints;

índices;

triggers;

funciones;

RLS;

policies.

32. Índices

Crear índices únicamente donde sean útiles.

Considerar:

products.slug
products.sku
products.category_id
products.status
orders.order_number
orders.customer_id
orders.order_status
orders.payment_status
orders.created_at
order_items.order_id
inventory_movements.product_id
notifications.user_id + is_read


Utilizar índices compuestos para filtros administrativos frecuentes cuando estén justificados.

33. UX/UI pública

Diseño visual:

natural;

limpio;

moderno;

premium;

minimalista;

confiable.

Crear:

Home
Catálogo
Categoría
Producto
Carrito
Checkout
Pedido confirmado
Login
Registro
Mi perfil
Mis direcciones
Mis pedidos
Detalle del pedido


34. Home

Incluir:

hero principal;

categorías;

productos destacados;

beneficios de comprar en SolNatural´s;

productos recomendados;

productos nuevos;

llamada a la acción;

información de envíos;

footer profesional.

No sobresaturar la interfaz.

35. Responsive

Optimizar completamente para:

teléfonos;

tablets;

portátiles;

escritorio.

Aplicar enfoque mobile-first.

36. Estados UX

Crear componentes para:

loading
skeleton
empty
error
success
out of stock
discontinued


Agregar toasts para operaciones.

37. SEO

Implementar:

títulos dinámicos;

metadata;

Open Graph;

URLs mediante slug;

sitemap;

robots;

datos estructurados de producto cuando la arquitectura lo permita.

38. Validaciones

Utilizar validaciones client-side como ayuda UX, pero validar reglas críticas en Supabase.

Validar:

emails;

teléfonos;

cantidades;

stock;

precios;

permisos;

UUIDs;

estados;

carga de imágenes.

39. Manejo de errores

Crear mensajes claros.

Ejemplos:

PRODUCT_OUT_OF_STOCK
INSUFFICIENT_STOCK
PRODUCT_NOT_AVAILABLE
ORDER_NOT_FOUND
UNAUTHORIZED
FORBIDDEN
INVALID_ORDER_STATE


No mostrar detalles internos de PostgreSQL al usuario final.

40. Configuración

Crear configuración administrativa para:

nombre tienda;

logo;

email;

teléfono;

WhatsApp;

dirección;

redes sociales;

mensaje de envío;

costo de envío;

monto mínimo para envío gratis;

métodos de pago;

datos bancarios;

moneda.

Inicialmente utilizar moneda:

COP


pero no hardcodearla en toda la aplicación.

41. Reportes

Crear módulo administrativo Reportes.

Permitir consultar:

Reporte de ventas

fecha;

pedido;

cliente;

venta;

costo;

ganancia;

margen.

Productos

unidades vendidas;

facturación;

costo;

ganancia;

margen.

Categorías

ventas;

unidades;

ganancia.

Clientes

cantidad de pedidos;

total comprado;

ticket promedio.

Agregar filtros por fechas.

Preparar opción de exportar CSV sin comprometer seguridad.

42. Dashboard inicial esperado

Construir una pantalla administrativa inicial similar conceptualmente a:

┌───────────────────────────────────────────────────────────┐
│ SolNatural´s                             Administrador     │
├───────────────────────────────────────────────────────────┤
│ Ventas hoy   │ Ganancia hoy │ Pedidos │ Ticket promedio  │
│ $1.250.000   │ $420.000     │ 18      │ $69.444          │
├───────────────────────────────────────────────────────────┤
│ Ventas del mes              │ Ganancia del mes            │
│ $24.500.000                 │ $8.300.000                   │
├───────────────────────────────────────────────────────────┤
│        Gráfica ventas y ganancias últimos 30 días          │
├───────────────────────────────┬───────────────────────────┤
│ Productos más vendidos        │ Stock bajo                │
│ ...                           │ ...                       │
├───────────────────────────────┴───────────────────────────┤
│ Últimos pedidos                                           │
└───────────────────────────────────────────────────────────┘


El diseño final debe ser mucho más moderno y responsive.

43. Precisión financiera

Los indicadores financieros deben calcularse exclusivamente desde datos persistidos en Supabase.

No generar métricas críticas mediante:

localStorage
estado React
datos enviados por cliente


Usar PostgreSQL como fuente de verdad.

44. Optimización

Evitar:

N+1 queries;

consultas completas cuando solo se necesitan columnas específicas;

descargar miles de registros para hacer agregaciones;

múltiples consultas innecesarias;

polling cuando Supabase Realtime resuelva el problema.

Para dashboards utilizar preferentemente:

funciones SQL;

views;

RPC.

45. Mantenibilidad

Utilizar una estructura equivalente a:

src/
├── components/
│   ├── ui/
│   ├── store/
│   └── admin/
├── pages/
├── hooks/
├── services/
│   └── supabase/
├── integrations/
│   └── supabase/
├── lib/
├── types/
├── validations/
└── utils/

supabase/
├── migrations/
├── functions/
│   ├── create-order/
│   └── send-order-notification/
└── config.toml


Adáptala a la estructura generada por Lovable sin romper convenciones de la plataforma.

46. Código

Generar TypeScript estricto.

Evitar:

any


salvo justificación técnica.

Crear tipos reutilizables para:

Product;

Category;

Cart;

Order;

OrderItem;

Profile;

Notification;

SalesSummary;

ProfitSummary.

Utilizar tipos generados desde Supabase cuando sea posible.

47. Restricciones específicas para Lovable

Trabaja directamente sobre el proyecto Lovable.

No reemplaces tecnologías del stack sin necesidad.

Antes de modificar código existente:

analiza la estructura generada;

identifica componentes reutilizables;

conserva estilos compatibles;

evita duplicación;

reutiliza integración Supabase existente.

No crear mocks permanentes si Supabase está disponible.

No dejar datos críticos hardcodeados.

No crear lógica de autorización exclusivamente en React.

Cuando una operación necesite privilegios o integridad transaccional, ejecutarla en:

PostgreSQL RPC
Supabase Edge Function


según corresponda.

[ENTREGABLES]:

Implementa el proyecto por fases:

Auditoría de la estructura actual de Lovable.

Arquitectura propuesta.

Modelo relacional Supabase.

Migraciones SQL.

Enums y constraints.

RLS y policies.

Supabase Auth.

Roles.

Storage.

Catálogo.

Productos.

Categorías.

Carrito.

Checkout.

Función transaccional de creación del pedido.

Inventario.

Notificaciones Realtime.

Edge Function de email.

Panel administrativo.

Dashboard financiero.

Cálculo de ventas.

Cálculo de costos.

Cálculo de ganancias.

Reportes.

Clientes.

Auditoría.

UX/UI.

Seguridad.

Testing.

Documentación.

[FORMATO DE RESPUESTA]:

Antes de modificar o generar código:

inspecciona el proyecto existente;

indica brevemente qué vas a modificar;

realiza los cambios;

valida dependencias entre frontend, Supabase y RLS.

Para código SQL indicar:

// file: supabase/migrations/YYYYMMDDHHMMSS_create_orders.sql


Para Edge Functions:

// file: supabase/functions/create-order/index.ts


Para frontend:

// file: src/pages/admin/Dashboard.tsx


[RESTRICCIONES]:

Ve directo al grano.

Sin saludos.

Sin explicaciones teóricas extensas.

Genera código funcional y mantenible.

Prioriza Supabase como fuente de verdad.

No expongas costos o ganancias a clientes.

No confíes en cálculos enviados por frontend.

Usa RLS obligatoriamente.

Usa transacciones para creación de pedidos.

Evita overselling.

Preserva información histórica.

Usa NUMERIC, nunca float, para dinero.

Evita consultas N+1.

No calcules dashboards descargando todos los pedidos al navegador.

Implementa agregaciones en PostgreSQL.

Utiliza Realtime para notificaciones cuando aporte valor.

No uses Service Role Key en el frontend.

Los secretos deben existir únicamente en Supabase Secrets/variables seguras.

No deshabilites RLS como solución rápida.

No agregues dependencias innecesarias.

No generes pseudocódigo.

No dejes TODOs en funcionalidades críticas.

Antes de dar una funcionalidad por terminada, verifica visualmente y funcionalmente los flujos principales.

[CRITERIOS DE ACEPTACIÓN]:

La implementación se considera completa cuando:

Un cliente puede registrarse e iniciar sesión.

Puede consultar productos.

Puede agregar productos al carrito.

Puede generar un pedido.

El inventario se descuenta correctamente.

No puede comprar productos agotados.

El administrador recibe una notificación Realtime.

El administrador recibe email por nuevo pedido.

El cliente recibe confirmación.

El administrador puede gestionar productos.

Puede marcar productos agotados o descontinuados.

Puede modificar costos y precios.

Los clientes jamás pueden consultar costos.

El administrador puede consultar ventas totales.

Puede consultar costo de mercancía vendida.

Puede consultar ganancias.

Puede consultar margen.

Puede filtrar métricas por fechas.

Los pedidos cancelados no distorsionan las ventas.

RLS protege la información.

La solución funciona correctamente dentro del stack Lovable + Supabase.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/924a327b-90ec-4f59-8571-4d7e7cbe6241).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
