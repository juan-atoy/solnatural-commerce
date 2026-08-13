
-- ENUMS
create type public.app_role as enum ('admin','customer');
create type public.product_status as enum ('draft','active','out_of_stock','discontinued','inactive');
create type public.order_status as enum ('pending','confirmed','processing','ready','shipped','delivered','cancelled');
create type public.payment_status as enum ('pending','paid','failed','refunded');
create type public.payment_method as enum ('bank_transfer','cash_on_delivery');
create type public.movement_type as enum ('purchase','sale','return','adjustment','cancellation','manual_entry');

-- UTIL
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  document text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;
grant execute on function public.is_admin() to authenticated, anon;

create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "roles_select_own_or_admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- first user can claim admin (only while no admin exists)
create or replace function public.claim_admin() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then return false; end if;
  insert into public.user_roles(user_id, role) values (auth.uid(),'admin')
    on conflict do nothing;
  return true;
end $$;
grant execute on function public.claim_admin() to authenticated;

-- ADDRESSES
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  recipient_name text not null,
  phone text not null,
  address_line text not null,
  city text not null,
  region text,
  country text not null default 'Colombia',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.addresses to authenticated;
grant all on public.addresses to service_role;
alter table public.addresses enable row level security;
create policy "addresses_own" on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index idx_addresses_user on public.addresses(user_id);
create trigger trg_addresses_updated before update on public.addresses
  for each row execute function public.set_updated_at();

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  parent_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories_public_read" on public.categories for select to anon, authenticated
  using (is_active = true or public.has_role(auth.uid(),'admin'));
create policy "categories_admin_write" on public.categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();

-- PRODUCTS
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  brand text,
  price numeric(12,2) not null check (price >= 0),
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  sale_price numeric(12,2) check (sale_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 5,
  unit text not null default 'unidad',
  ingredients text,
  benefits text,
  usage_mode text,
  warnings text,
  image_url text,
  gallery text[] not null default '{}',
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
-- no anon grant: public reads go through the safe view below
create policy "products_admin_all" on public.products for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create index idx_products_slug on public.products(slug);
create index idx_products_sku on public.products(sku);
create index idx_products_category on public.products(category_id);
create index idx_products_status on public.products(status);
create index idx_products_status_featured on public.products(status, is_featured);
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- public catalog view (no cost data, runs as owner so RLS on products is not needed publicly)
create view public.products_public as
  select p.id, p.sku, p.name, p.slug, p.short_description, p.description,
         p.category_id, c.name as category_name, c.slug as category_slug,
         p.brand, p.price, p.sale_price, p.stock, p.unit,
         p.ingredients, p.benefits, p.usage_mode, p.warnings,
         p.image_url, p.gallery, p.status, p.is_featured, p.created_at
  from public.products p
  left join public.categories c on c.id = p.category_id
  where p.status in ('active','out_of_stock','discontinued');
grant select on public.products_public to anon, authenticated;

-- PRODUCT IMAGES
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;
grant all on public.product_images to service_role;
alter table public.product_images enable row level security;
create policy "product_images_public_read" on public.product_images for select to anon, authenticated using (true);
create policy "product_images_admin_write" on public.product_images for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create index idx_product_images_product on public.product_images(product_id);

-- CART
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);
grant select, insert, update, delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;
alter table public.cart_items enable row level security;
create policy "cart_items_own" on public.cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index idx_cart_items_user on public.cart_items(user_id);
create trigger trg_cart_items_updated before update on public.cart_items
  for each row execute function public.set_updated_at();

-- ORDERS
create sequence public.order_number_seq start 1000;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_region text,
  shipping_country text not null default 'Colombia',
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  shipping_total numeric(12,2) not null default 0,
  shipping_customer_charge numeric(12,2) not null default 0,
  shipping_company_cost numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  total_cost numeric(12,2) not null default 0,
  gross_profit numeric(12,2) not null default 0,
  payment_method public.payment_method not null default 'bank_transfer',
  payment_status public.payment_status not null default 'pending',
  order_status public.order_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders_select_own_or_admin" on public.orders for select to authenticated
  using (customer_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "orders_admin_update" on public.orders for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create index idx_orders_number on public.orders(order_number);
create index idx_orders_customer on public.orders(customer_id);
create index idx_orders_status on public.orders(order_status);
create index idx_orders_payment_status on public.orders(payment_status);
create index idx_orders_created on public.orders(created_at);
create index idx_orders_status_created on public.orders(order_status, created_at);
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- ORDER ITEMS (historical snapshot)
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  unit_cost numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  line_total numeric(12,2) not null,
  line_cost numeric(12,2) not null default 0,
  line_profit numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
-- customers can read their own items but sensitive columns are stripped by the client-safe view
create policy "order_items_admin_select" on public.order_items for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create index idx_order_items_order on public.order_items(order_id);
create index idx_order_items_product on public.order_items(product_id);

create view public.my_order_items as
  select oi.id, oi.order_id, oi.product_id, oi.sku, oi.product_name,
         oi.quantity, oi.unit_price, oi.discount, oi.line_total, oi.created_at
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.customer_id = auth.uid();
grant select on public.my_order_items to authenticated;

-- ORDER STATUS HISTORY
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert on public.order_status_history to authenticated;
grant all on public.order_status_history to service_role;
alter table public.order_status_history enable row level security;
create policy "osh_select_own_or_admin" on public.order_status_history for select to authenticated
  using (public.has_role(auth.uid(),'admin')
     or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy "osh_admin_insert" on public.order_status_history for insert to authenticated
  with check (public.has_role(auth.uid(),'admin'));
create index idx_osh_order on public.order_status_history(order_id);

-- INVENTORY MOVEMENTS
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type public.movement_type not null,
  quantity integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  order_id uuid references public.orders(id) on delete set null,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert on public.inventory_movements to authenticated;
grant all on public.inventory_movements to service_role;
alter table public.inventory_movements enable row level security;
create policy "inv_admin_all" on public.inventory_movements for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create index idx_inv_product on public.inventory_movements(product_id);
create index idx_inv_created on public.inventory_movements(created_at);

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications_own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications_own_update" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_own_delete" on public.notifications for delete to authenticated using (user_id = auth.uid());
create index idx_notifications_user_read on public.notifications(user_id, is_read);
alter publication supabase_realtime add table public.notifications;

-- AUDIT LOGS
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "audit_admin_select" on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create index idx_audit_created on public.audit_logs(created_at);

create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(user_id, action, entity, entity_id, old_values, new_values)
  values (auth.uid(), lower(tg_op), tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old)->>'id' else to_jsonb(new)->>'id' end)::uuid, null),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end);
  return null;
end $$;

create trigger trg_audit_products after insert or update or delete on public.products
  for each row execute function public.audit_row();
create trigger trg_audit_orders after update on public.orders
  for each row execute function public.audit_row();
create trigger trg_audit_categories after insert or update or delete on public.categories
  for each row execute function public.audit_row();

-- STORE SETTINGS
create table public.store_settings (
  id boolean primary key default true check (id),
  store_name text not null default 'SolNatural´s',
  logo_url text,
  email text,
  phone text,
  whatsapp text,
  address text,
  instagram text,
  facebook text,
  shipping_message text,
  shipping_cost numeric(12,2) not null default 12000,
  free_shipping_min numeric(12,2) not null default 150000,
  shipping_company_cost numeric(12,2) not null default 9000,
  payment_methods text[] not null default '{bank_transfer,cash_on_delivery}',
  bank_details text,
  currency text not null default 'COP',
  updated_at timestamptz not null default now()
);
grant select on public.store_settings to anon, authenticated;
grant insert, update on public.store_settings to authenticated;
grant all on public.store_settings to service_role;
alter table public.store_settings enable row level security;
create policy "settings_public_read" on public.store_settings for select to anon, authenticated using (true);
create policy "settings_admin_write" on public.store_settings for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.store_settings (id, email, phone, whatsapp, address, instagram, facebook, shipping_message, bank_details)
values (true, 'hola@solnaturals.co', '+57 300 123 4567', '+57 300 123 4567',
  'Cra 45 #12-30, Bogotá, Colombia', 'solnaturals', 'solnaturals',
  'Envíos a todo el país en 2 a 5 días hábiles. Envío gratis por compras superiores a $150.000.',
  'Bancolombia Ahorros 123-456789-00 a nombre de SolNatural´s SAS. NIT 901.234.567-8');

-- =====================  TRANSACTIONAL ORDER CREATION  =====================
create or replace function public.create_order(
  p_items jsonb,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_region text default null,
  p_shipping_country text default 'Colombia',
  p_payment_method public.payment_method default 'bank_transfer',
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_product public.products;
  v_qty integer;
  v_price numeric(12,2);
  v_cost numeric(12,2);
  v_line_total numeric(12,2);
  v_line_cost numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_cost_total numeric(12,2) := 0;
  v_shipping numeric(12,2) := 0;
  v_ship_cost numeric(12,2) := 0;
  v_settings public.store_settings;
  v_order public.orders;
  v_number text;
  v_admin uuid;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if coalesce(trim(p_customer_name),'') = '' or coalesce(trim(p_customer_email),'') = ''
     or coalesce(trim(p_customer_phone),'') = '' or coalesce(trim(p_shipping_address),'') = ''
     or coalesce(trim(p_shipping_city),'') = '' then
    raise exception 'INVALID_CUSTOMER_DATA';
  end if;
  if p_customer_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_EMAIL';
  end if;

  select * into v_settings from public.store_settings where id = true;
  v_number := 'SN-' || to_char(nextval('public.order_number_seq'), 'FM000000');

  insert into public.orders (order_number, customer_id, customer_name, customer_email, customer_phone,
    shipping_address, shipping_city, shipping_region, shipping_country, payment_method, notes)
  values (v_number, auth.uid(), trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone),
    trim(p_shipping_address), trim(p_shipping_city), p_shipping_region, coalesce(p_shipping_country,'Colombia'),
    p_payment_method, p_notes)
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'INVALID_QUANTITY'; end if;

    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid for update;
    if not found then raise exception 'PRODUCT_NOT_AVAILABLE'; end if;
    if v_product.status <> 'active' then
      raise exception 'PRODUCT_NOT_AVAILABLE: %', v_product.name;
    end if;
    if v_product.stock < v_qty then
      raise exception 'INSUFFICIENT_STOCK: %', v_product.name;
    end if;

    v_price := coalesce(v_product.sale_price, v_product.price);
    v_cost := v_product.cost_price;
    v_line_total := v_price * v_qty;
    v_line_cost := v_cost * v_qty;
    v_subtotal := v_subtotal + v_line_total;
    v_cost_total := v_cost_total + v_line_cost;

    insert into public.order_items (order_id, product_id, sku, product_name, quantity,
      unit_price, unit_cost, discount, line_total, line_cost, line_profit)
    values (v_order.id, v_product.id, v_product.sku, v_product.name, v_qty,
      v_price, v_cost, 0, v_line_total, v_line_cost, v_line_total - v_line_cost);

    update public.products
      set stock = stock - v_qty,
          status = case when stock - v_qty = 0 then 'out_of_stock'::public.product_status else status end
      where id = v_product.id;

    insert into public.inventory_movements (product_id, movement_type, quantity, previous_stock,
      new_stock, order_id, notes, created_by)
    values (v_product.id, 'sale', -v_qty, v_product.stock, v_product.stock - v_qty, v_order.id,
      'Pedido ' || v_number, auth.uid());
  end loop;

  if v_subtotal < v_settings.free_shipping_min then
    v_shipping := v_settings.shipping_cost;
    v_ship_cost := v_settings.shipping_company_cost;
  else
    v_shipping := 0;
    v_ship_cost := v_settings.shipping_company_cost;
  end if;

  update public.orders set
    subtotal = v_subtotal,
    total_cost = v_cost_total,
    shipping_total = v_shipping,
    shipping_customer_charge = v_shipping,
    shipping_company_cost = v_ship_cost,
    total = v_subtotal + v_shipping,
    gross_profit = v_subtotal - v_cost_total
  where id = v_order.id
  returning * into v_order;

  insert into public.order_status_history (order_id, to_status, note, created_by)
  values (v_order.id, 'pending', 'Pedido creado', auth.uid());

  for v_admin in select user_id from public.user_roles where role = 'admin' loop
    insert into public.notifications (user_id, type, title, message, entity_type, entity_id)
    values (v_admin, 'new_order', 'Nuevo pedido ' || v_number,
      'Nuevo pedido ' || v_number || ' por $' || to_char(v_order.total, 'FM999G999G999') || ' de ' || v_order.customer_name,
      'order', v_order.id);
  end loop;

  return jsonb_build_object(
    'id', v_order.id, 'order_number', v_order.order_number,
    'subtotal', v_order.subtotal, 'shipping_total', v_order.shipping_total,
    'total', v_order.total, 'payment_method', v_order.payment_method,
    'order_status', v_order.order_status
  );
end $$;
revoke all on function public.create_order(jsonb,text,text,text,text,text,text,text,public.payment_method,text) from public;
grant execute on function public.create_order(jsonb,text,text,text,text,text,text,text,public.payment_method,text) to anon, authenticated;

-- admin stock adjustment
create or replace function public.adjust_stock(p_product_id uuid, p_new_stock integer, p_notes text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_prev integer;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  if p_new_stock < 0 then raise exception 'INVALID_QUANTITY'; end if;
  select stock into v_prev from public.products where id = p_product_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  update public.products set stock = p_new_stock where id = p_product_id;
  insert into public.inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, notes, created_by)
  values (p_product_id, 'adjustment', p_new_stock - v_prev, v_prev, p_new_stock, p_notes, auth.uid());
  return p_new_stock;
end $$;
grant execute on function public.adjust_stock(uuid,integer,text) to authenticated;

-- admin order status change (restores stock on cancellation)
create or replace function public.set_order_status(p_order_id uuid, p_status public.order_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_prev public.order_status; v_item record; v_stock integer;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  select order_status into v_prev from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_prev = p_status then return; end if;
  if v_prev = 'cancelled' then raise exception 'INVALID_ORDER_STATE'; end if;

  update public.orders set order_status = p_status where id = p_order_id;

  if p_status = 'cancelled' then
    for v_item in select product_id, quantity from public.order_items where order_id = p_order_id and product_id is not null loop
      select stock into v_stock from public.products where id = v_item.product_id for update;
      update public.products set stock = v_stock + v_item.quantity,
        status = case when status = 'out_of_stock' then 'active'::public.product_status else status end
        where id = v_item.product_id;
      insert into public.inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, order_id, notes, created_by)
      values (v_item.product_id, 'cancellation', v_item.quantity, v_stock, v_stock + v_item.quantity, p_order_id, 'Pedido cancelado', auth.uid());
    end loop;
  end if;

  insert into public.order_status_history (order_id, from_status, to_status, note, created_by)
  values (p_order_id, v_prev, p_status, p_note, auth.uid());
end $$;
grant execute on function public.set_order_status(uuid,public.order_status,text) to authenticated;

-- =====================  FINANCIAL REPORTING (admin only)  =====================
create or replace function public.get_sales_summary(p_from timestamptz default null, p_to timestamptz default null)
returns table (orders_count bigint, gross_sales numeric, total_cost numeric, gross_profit numeric,
  net_profit numeric, paid_sales numeric, unpaid_sales numeric, avg_ticket numeric, margin numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  return query
  with valid as (
    select * from public.orders o
    where o.order_status in ('confirmed','processing','ready','shipped','delivered')
      and (p_from is null or o.created_at >= p_from)
      and (p_to is null or o.created_at < p_to)
  )
  select count(*)::bigint,
    coalesce(sum(v.subtotal),0)::numeric(12,2),
    coalesce(sum(v.total_cost),0)::numeric(12,2),
    coalesce(sum(v.subtotal - v.total_cost - v.discount_total),0)::numeric(12,2),
    coalesce(sum(v.subtotal - v.total_cost - v.discount_total + v.shipping_customer_charge - v.shipping_company_cost),0)::numeric(12,2),
    coalesce(sum(case when v.payment_status = 'paid' then v.total else 0 end),0)::numeric(12,2),
    coalesce(sum(case when v.payment_status <> 'paid' then v.total else 0 end),0)::numeric(12,2),
    case when count(*) > 0 then (coalesce(sum(v.total),0)/count(*))::numeric(12,2) else 0 end,
    case when coalesce(sum(v.subtotal),0) > 0
      then round(coalesce(sum(v.subtotal - v.total_cost - v.discount_total),0) * 100 / sum(v.subtotal), 2)
      else 0 end
  from valid v;
end $$;
grant execute on function public.get_sales_summary(timestamptz,timestamptz) to authenticated;

create or replace function public.get_sales_by_period(p_from timestamptz, p_to timestamptz, p_bucket text default 'day')
returns table (bucket date, sales numeric, cost numeric, profit numeric, orders_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  if p_bucket not in ('day','month') then raise exception 'INVALID_BUCKET'; end if;
  return query
  select date_trunc(p_bucket, o.created_at)::date,
    coalesce(sum(o.subtotal),0)::numeric(12,2),
    coalesce(sum(o.total_cost),0)::numeric(12,2),
    coalesce(sum(o.subtotal - o.total_cost - o.discount_total),0)::numeric(12,2),
    count(*)::bigint
  from public.orders o
  where o.order_status in ('confirmed','processing','ready','shipped','delivered')
    and o.created_at >= p_from and o.created_at < p_to
  group by 1 order by 1;
end $$;
grant execute on function public.get_sales_by_period(timestamptz,timestamptz,text) to authenticated;

create or replace function public.get_top_products(p_from timestamptz default null, p_to timestamptz default null, p_limit integer default 10)
returns table (product_id uuid, product_name text, units bigint, revenue numeric, cost numeric, profit numeric, margin numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  return query
  select oi.product_id, oi.product_name, sum(oi.quantity)::bigint,
    sum(oi.line_total)::numeric(12,2), sum(oi.line_cost)::numeric(12,2), sum(oi.line_profit)::numeric(12,2),
    case when sum(oi.line_total) > 0 then round(sum(oi.line_profit)*100/sum(oi.line_total),2) else 0 end
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.order_status in ('confirmed','processing','ready','shipped','delivered')
    and (p_from is null or o.created_at >= p_from)
    and (p_to is null or o.created_at < p_to)
  group by oi.product_id, oi.product_name
  order by sum(oi.quantity) desc
  limit greatest(p_limit, 1);
end $$;
grant execute on function public.get_top_products(timestamptz,timestamptz,integer) to authenticated;

create or replace function public.get_sales_by_category(p_from timestamptz default null, p_to timestamptz default null)
returns table (category_name text, units bigint, revenue numeric, profit numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  return query
  select coalesce(c.name,'Sin categoría'), sum(oi.quantity)::bigint,
    sum(oi.line_total)::numeric(12,2), sum(oi.line_profit)::numeric(12,2)
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  left join public.products p on p.id = oi.product_id
  left join public.categories c on c.id = p.category_id
  where o.order_status in ('confirmed','processing','ready','shipped','delivered')
    and (p_from is null or o.created_at >= p_from)
    and (p_to is null or o.created_at < p_to)
  group by 1 order by 3 desc;
end $$;
grant execute on function public.get_sales_by_category(timestamptz,timestamptz) to authenticated;

create or replace function public.get_orders_by_status(p_from timestamptz default null, p_to timestamptz default null)
returns table (status text, orders_count bigint, total numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  return query
  select o.order_status::text, count(*)::bigint, coalesce(sum(o.total),0)::numeric(12,2)
  from public.orders o
  where (p_from is null or o.created_at >= p_from) and (p_to is null or o.created_at < p_to)
  group by 1 order by 2 desc;
end $$;
grant execute on function public.get_orders_by_status(timestamptz,timestamptz) to authenticated;

create or replace function public.get_low_stock_products()
returns table (id uuid, name text, sku text, stock integer, min_stock integer, status text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  return query
  select p.id, p.name, p.sku, p.stock, p.min_stock, p.status::text
  from public.products p
  where p.stock <= p.min_stock and p.status <> 'inactive'
  order by p.stock asc;
end $$;
grant execute on function public.get_low_stock_products() to authenticated;

create or replace function public.get_top_customers(p_from timestamptz default null, p_to timestamptz default null, p_limit integer default 10)
returns table (customer_email text, customer_name text, orders_count bigint, total_spent numeric, avg_ticket numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  return query
  select o.customer_email, max(o.customer_name), count(*)::bigint,
    sum(o.total)::numeric(12,2), (sum(o.total)/count(*))::numeric(12,2)
  from public.orders o
  where o.order_status in ('confirmed','processing','ready','shipped','delivered')
    and (p_from is null or o.created_at >= p_from) and (p_to is null or o.created_at < p_to)
  group by o.customer_email order by 4 desc limit greatest(p_limit,1);
end $$;
grant execute on function public.get_top_customers(timestamptz,timestamptz,integer) to authenticated;

create or replace function public.get_sales_report(p_from timestamptz default null, p_to timestamptz default null)
returns table (created_at timestamptz, order_number text, customer_name text, order_status text,
  payment_status text, sales numeric, cost numeric, profit numeric, margin numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  return query
  select o.created_at, o.order_number, o.customer_name, o.order_status::text, o.payment_status::text,
    o.subtotal, o.total_cost, (o.subtotal - o.total_cost - o.discount_total),
    case when o.subtotal > 0 then round((o.subtotal - o.total_cost - o.discount_total)*100/o.subtotal,2) else 0 end
  from public.orders o
  where (p_from is null or o.created_at >= p_from) and (p_to is null or o.created_at < p_to)
  order by o.created_at desc;
end $$;
grant execute on function public.get_sales_report(timestamptz,timestamptz) to authenticated;

-- =====================  DEMO DATA  =====================
insert into public.categories (name, slug, description, sort_order, image_url) values
 ('Suplementos','suplementos','Vitaminas y suplementos naturales de origen vegetal',1,'/images/cat-suplementos.jpg'),
 ('Infusiones','infusiones','Tés e infusiones artesanales',2,'/images/cat-infusiones.jpg'),
 ('Aceites esenciales','aceites-esenciales','Aceites puros prensados en frío',3,'/images/cat-aceites.jpg'),
 ('Cuidado de la piel','cuidado-piel','Cosmética natural libre de crueldad',4,'/images/cat-piel.jpg'),
 ('Superalimentos','superalimentos','Semillas, polvos y proteínas naturales',5,'/images/cat-superalimentos.jpg'),
 ('Miel y endulzantes','miel','Miel pura y endulzantes naturales',6,'/images/cat-miel.jpg');

insert into public.products (sku,name,slug,short_description,description,category_id,brand,price,cost_price,sale_price,stock,min_stock,unit,ingredients,benefits,usage_mode,warnings,image_url,status,is_featured)
select v.sku, v.name, v.slug, v.short_desc, v.descr, c.id, v.brand, v.price, v.cost, v.sale, v.stock, 5, v.unit,
       v.ingredients, v.benefits, v.usage_mode, 'Mantener fuera del alcance de los niños. No excede la dosis recomendada. Este producto no es un medicamento.',
       v.img, 'active', v.featured
from (values
 ('SN-001','Cúrcuma con Pimienta Negra','curcuma-pimienta-negra','Antiinflamatorio natural en cápsulas','Cúrcuma orgánica estandarizada con pimienta negra para potenciar la absorción de curcumina.','suplementos','SolNatural´s',68000,31000,59000,40,'frasco x 60 cápsulas','Curcuma longa 500mg, Piper nigrum 5mg','Reduce la inflamación, apoya la salud articular y antioxidante.','1 cápsula con el almuerzo.','/images/p-curcuma.jpg',true),
 ('SN-002','Magnesio Quelado','magnesio-quelado','Relajación muscular y sueño reparador','Bisglicinato de magnesio de alta absorción, sin efectos laxantes.','suplementos','SolNatural´s',82000,38000,null,32,'frasco x 90 cápsulas','Bisglicinato de magnesio 400mg','Mejora el descanso, reduce calambres y apoya el sistema nervioso.','2 cápsulas antes de dormir.','/images/p-magnesio.jpg',true),
 ('SN-003','Ashwagandha KSM-66','ashwagandha-ksm66','Adaptógeno para el estrés','Raíz de ashwagandha estandarizada al 5% de witanólidos.','suplementos','Herbal Roots',95000,44000,null,25,'frasco x 60 cápsulas','Withania somnifera 600mg','Reduce el cortisol, mejora la energía y el enfoque.','1 cápsula en la mañana.','/images/p-ashwagandha.jpg',false),
 ('SN-004','Té Verde Matcha Ceremonial','matcha-ceremonial','Energía limpia y antioxidantes','Matcha japonés grado ceremonial molido en piedra.','infusiones','Kyoto Leaf',72000,33000,64000,50,'lata x 100g','Camellia sinensis en polvo','Energía sostenida, antioxidantes y metabolismo activo.','1 cucharadita en 200ml de agua a 80°C.','/images/p-matcha.jpg',true),
 ('SN-005','Infusión Digestiva de Hierbas','infusion-digestiva','Alivio digestivo después de comer','Mezcla artesanal de manzanilla, hinojo, menta y jengibre.','infusiones','SolNatural´s',34000,14000,null,80,'caja x 20 sobres','Manzanilla, hinojo, menta, jengibre','Alivia la hinchazón y favorece la digestión.','1 sobre en agua caliente después de las comidas.','/images/p-infusion.jpg',false),
 ('SN-006','Aceite Esencial de Lavanda','aceite-lavanda','Calma y descanso profundo','Aceite esencial 100% puro de lavanda francesa.','aceites-esenciales','Pure Drops',48000,20000,null,60,'frasco x 10ml','Lavandula angustifolia 100%','Relaja, mejora el sueño y calma la piel.','3 gotas en difusor o diluido en aceite portador.','/images/p-lavanda.jpg',true),
 ('SN-007','Aceite de Coco Extra Virgen','aceite-coco','Prensado en frío, sin refinar','Aceite de coco orgánico extra virgen para cocina y piel.','aceites-esenciales','Tropic Life',52000,23000,45000,45,'frasco x 500ml','Cocos nucifera 100%','Hidrata la piel, energía saludable y cocción estable.','Uso culinario o tópico.','/images/p-coco.jpg',false),
 ('SN-008','Serum Facial de Vitamina C','serum-vitamina-c','Luminosidad y firmeza','Serum con 15% de vitamina C estabilizada y ácido hialurónico.','cuidado-piel','Botánica Viva',115000,52000,99000,20,'frasco x 30ml','Ácido ascórbico 15%, ácido hialurónico, vitamina E','Unifica el tono, ilumina y estimula el colágeno.','3 gotas en la noche sobre piel limpia.','/images/p-serum.jpg',true),
 ('SN-009','Jabón Artesanal de Caléndula','jabon-calendula','Piel sensible y calmada','Jabón saponificado en frío con caléndula y avena.','cuidado-piel','Botánica Viva',22000,8500,null,120,'barra x 110g','Aceite de oliva, caléndula, avena','Calma irritaciones y limpia sin resecar.','Uso diario en rostro y cuerpo.','/images/p-jabon.jpg',false),
 ('SN-010','Proteína Vegetal de Arveja','proteina-arveja','24g de proteína por porción','Proteína aislada de arveja amarilla, sabor cacao natural.','superalimentos','Green Fuel',148000,72000,null,18,'bolsa x 1kg','Aislado de proteína de arveja, cacao, stevia','Recuperación muscular y saciedad.','1 medida en 300ml de bebida vegetal.','/images/p-proteina.jpg',true),
 ('SN-011','Semillas de Chía Orgánica','chia-organica','Fibra y omega 3','Chía orgánica certificada, cosecha reciente.','superalimentos','Andes Harvest',28000,11000,null,0,'bolsa x 500g','Salvia hispanica 100%','Fibra, omega 3 y saciedad.','1 cucharada en agua, yogurt o batidos.','/images/p-chia.jpg',false),
 ('SN-012','Miel de Abejas Pura','miel-pura','Cosecha artesanal sin procesar','Miel cruda de flores silvestres, sin pasteurizar.','miel','Apiario del Sol',45000,19000,null,4,'frasco x 500g','Miel de abejas 100%','Endulzante natural con propiedades antibacterianas.','1 cucharada al día.','/images/p-miel.jpg',false)
) as v(sku,name,slug,short_desc,descr,cat,brand,price,cost,sale,stock,unit,ingredients,benefits,usage_mode,img,featured)
join public.categories c on c.slug = v.cat;

update public.products set status = 'out_of_stock' where stock = 0;

-- demo historical orders
do $$
declare
  v_i integer;
  v_order_id uuid;
  v_prod record;
  v_qty integer;
  v_sub numeric(12,2);
  v_cost numeric(12,2);
  v_days integer;
  v_status public.order_status;
  v_pay public.payment_status;
  v_names text[] := array['Laura Gómez','Andrés Pérez','Camila Rojas','Julián Torres','Marcela Díaz','Sebastián Ruiz','Valentina Mora','Felipe Castro'];
begin
  for v_i in 1..8 loop
    v_sub := 0; v_cost := 0;
    v_days := (v_i * 3) % 28;
    v_status := (array['delivered','delivered','shipped','confirmed','processing','delivered','ready','cancelled']::public.order_status[])[v_i];
    v_pay := (array['paid','paid','paid','pending','paid','paid','pending','pending']::public.payment_status[])[v_i];
    insert into public.orders (order_number, customer_name, customer_email, customer_phone, shipping_address,
      shipping_city, shipping_region, payment_method, payment_status, order_status, created_at,
      shipping_total, shipping_customer_charge, shipping_company_cost)
    values ('SN-' || to_char(nextval('public.order_number_seq'),'FM000000'), v_names[v_i],
      'cliente' || v_i || '@example.com', '+57 30' || v_i || ' 555 12' || v_i,
      'Calle ' || (10 + v_i) || ' # 4' || v_i || '-2' || v_i, 'Bogotá', 'Cundinamarca',
      'bank_transfer', v_pay, v_status, now() - (v_days || ' days')::interval, 12000, 12000, 9000)
    returning id into v_order_id;

    for v_prod in select * from public.products order by md5(id::text || v_i::text) limit 3 loop
      v_qty := 1 + (v_i % 3);
      insert into public.order_items (order_id, product_id, sku, product_name, quantity, unit_price, unit_cost,
        line_total, line_cost, line_profit)
      values (v_order_id, v_prod.id, v_prod.sku, v_prod.name, v_qty,
        coalesce(v_prod.sale_price, v_prod.price), v_prod.cost_price,
        coalesce(v_prod.sale_price, v_prod.price) * v_qty, v_prod.cost_price * v_qty,
        (coalesce(v_prod.sale_price, v_prod.price) - v_prod.cost_price) * v_qty);
      v_sub := v_sub + coalesce(v_prod.sale_price, v_prod.price) * v_qty;
      v_cost := v_cost + v_prod.cost_price * v_qty;
    end loop;

    update public.orders set subtotal = v_sub, total_cost = v_cost, total = v_sub + 12000,
      gross_profit = v_sub - v_cost where id = v_order_id;
  end loop;
end $$;
