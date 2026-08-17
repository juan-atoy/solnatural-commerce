-- Complete product media, shipping configuration and independent admin reports.

-- ============================ PRODUCT MEDIA ============================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.product_images add column if not exists storage_path text;
with duplicate_primaries as (
  select id, row_number() over (
    partition by product_id order by sort_order, created_at, id
  ) as position
  from public.product_images
  where is_primary
)
update public.product_images pi
set is_primary = false
from duplicate_primaries duplicate
where pi.id = duplicate.id and duplicate.position > 1;

create unique index if not exists uq_product_images_primary
  on public.product_images(product_id) where is_primary;

create or replace function public.prepare_product_image()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_primary then
    update public.product_images
      set is_primary = false
      where product_id = new.product_id and id <> new.id and is_primary;
  end if;
  return new;
end $$;

create or replace function public.sync_product_media()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_product_id uuid := case when tg_op = 'DELETE' then old.product_id else new.product_id end;
  v_primary text;
  v_gallery text[];
begin
  select pi.url into v_primary
  from public.product_images pi
  where pi.product_id = v_product_id
  order by pi.is_primary desc, pi.sort_order, pi.created_at
  limit 1;

  select coalesce(array_agg(pi.url order by pi.is_primary desc, pi.sort_order, pi.created_at), '{}')
    into v_gallery
  from public.product_images pi
  where pi.product_id = v_product_id;

  update public.products
    set image_url = v_primary, gallery = v_gallery
    where id = v_product_id;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

create trigger trg_prepare_product_image
  before insert or update of is_primary, product_id on public.product_images
  for each row execute function public.prepare_product_image();
create trigger trg_sync_product_media
  after insert or update or delete on public.product_images
  for each row execute function public.sync_product_media();

revoke all on function public.prepare_product_image() from public, anon, authenticated;
revoke all on function public.sync_product_media() from public, anon, authenticated;

drop policy if exists "product_images_admin_insert" on storage.objects;
drop policy if exists "product_images_admin_update" on storage.objects;
drop policy if exists "product_images_admin_delete" on storage.objects;
drop policy if exists "product_images_admin_select" on storage.objects;

create policy "product_images_admin_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and public.has_role(auth.uid(), 'admin')
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
  );
create policy "product_images_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'))
  with check (
    bucket_id = 'product-images'
    and public.has_role(auth.uid(), 'admin')
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
  );
create policy "product_images_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));
create policy "product_images_admin_select" on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

-- ============================ SHIPPING ============================
alter table public.store_settings
  add column if not exists default_shipping_method text not null default 'standard',
  add column if not exists shipping_methods jsonb not null default
    '[
      {"code":"standard","name":"Envío estándar","type":"delivery","enabled":true,"customer_cost":12000,"company_cost":9000,"free_from":150000,"estimated_days":"2 a 5 días hábiles"},
      {"code":"express","name":"Envío exprés","type":"delivery","enabled":false,"customer_cost":22000,"company_cost":18000,"free_from":0,"estimated_days":"1 a 2 días hábiles"},
      {"code":"pickup","name":"Recoger en tienda","type":"pickup","enabled":true,"customer_cost":0,"company_cost":0,"free_from":0,"estimated_days":"Disponible el siguiente día hábil"}
    ]'::jsonb;

alter table public.orders
  add column if not exists shipping_method_code text not null default 'standard',
  add column if not exists shipping_method_name text not null default 'Envío estándar';

create or replace function public.create_order_v2(
  p_items jsonb,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_region text default null,
  p_shipping_country text default 'Colombia',
  p_payment_method public.payment_method default 'bank_transfer',
  p_notes text default null,
  p_shipping_method text default 'standard'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
  v_order_id uuid;
  v_order public.orders;
  v_settings public.store_settings;
  v_method jsonb;
  v_customer_cost numeric(12,2);
  v_company_cost numeric(12,2);
begin
  select * into v_settings from public.store_settings where id = true;
  select value into v_method
    from jsonb_array_elements(v_settings.shipping_methods)
    where value->>'code' = p_shipping_method
      and coalesce((value->>'enabled')::boolean, false)
    limit 1;
  if v_method is null then raise exception 'INVALID_SHIPPING_METHOD'; end if;

  v_result := public.create_order(
    p_items, p_customer_name, p_customer_email, p_customer_phone,
    p_shipping_address, p_shipping_city, p_shipping_region, p_shipping_country,
    p_payment_method, p_notes
  );
  v_order_id := (v_result->>'id')::uuid;
  select * into v_order from public.orders where id = v_order_id for update;

  if v_method->>'type' = 'pickup' then
    v_customer_cost := 0;
    v_company_cost := 0;
  else
    v_customer_cost := coalesce((v_method->>'customer_cost')::numeric, 0);
    if coalesce((v_method->>'free_from')::numeric, 0) > 0
       and v_order.subtotal >= (v_method->>'free_from')::numeric then
      v_customer_cost := 0;
    end if;
    v_company_cost := coalesce((v_method->>'company_cost')::numeric, 0);
  end if;

  update public.orders set
    shipping_method_code = p_shipping_method,
    shipping_method_name = v_method->>'name',
    shipping_total = v_customer_cost,
    shipping_customer_charge = v_customer_cost,
    shipping_company_cost = v_company_cost,
    total = subtotal - discount_total + v_customer_cost
  where id = v_order_id
  returning * into v_order;

  return v_result || jsonb_build_object(
    'shipping_total', v_order.shipping_total,
    'total', v_order.total,
    'shipping_method_code', v_order.shipping_method_code,
    'shipping_method_name', v_order.shipping_method_name
  );
end $$;

revoke all on function public.create_order_v2(jsonb,text,text,text,text,text,text,text,public.payment_method,text,text) from public;
grant execute on function public.create_order_v2(jsonb,text,text,text,text,text,text,text,public.payment_method,text,text) to anon, authenticated;

-- ============================ ADMIN REPORTS ============================
create or replace function public.get_product_sales_report(p_from timestamptz default null, p_to timestamptz default null)
returns table (product_id uuid, sku text, product_name text, units bigint, revenue numeric, cost numeric, profit numeric, margin numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  return query
  select oi.product_id, max(oi.sku), oi.product_name, sum(oi.quantity)::bigint,
    sum(oi.line_total)::numeric(12,2), sum(oi.line_cost)::numeric(12,2),
    sum(oi.line_profit)::numeric(12,2),
    case when sum(oi.line_total) > 0 then round(sum(oi.line_profit) * 100 / sum(oi.line_total), 2) else 0 end
  from public.order_items oi join public.orders o on o.id = oi.order_id
  where o.order_status in ('confirmed','processing','ready','shipped','delivered')
    and (p_from is null or o.created_at >= p_from) and (p_to is null or o.created_at < p_to)
  group by oi.product_id, oi.product_name order by 5 desc;
end $$;

create or replace function public.get_category_sales_report(p_from timestamptz default null, p_to timestamptz default null)
returns table (category_id uuid, category_name text, units bigint, revenue numeric, cost numeric, profit numeric, margin numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  return query
  select c.id, coalesce(c.name, 'Sin categoría'), sum(oi.quantity)::bigint,
    sum(oi.line_total)::numeric(12,2), sum(oi.line_cost)::numeric(12,2),
    sum(oi.line_profit)::numeric(12,2),
    case when sum(oi.line_total) > 0 then round(sum(oi.line_profit) * 100 / sum(oi.line_total), 2) else 0 end
  from public.order_items oi join public.orders o on o.id = oi.order_id
  left join public.products p on p.id = oi.product_id left join public.categories c on c.id = p.category_id
  where o.order_status in ('confirmed','processing','ready','shipped','delivered')
    and (p_from is null or o.created_at >= p_from) and (p_to is null or o.created_at < p_to)
  group by c.id, c.name order by 4 desc;
end $$;

create or replace function public.get_customer_sales_report(p_from timestamptz default null, p_to timestamptz default null)
returns table (customer_id uuid, customer_email text, customer_name text, orders_count bigint, total_spent numeric, avg_ticket numeric, last_order_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  return query
  select o.customer_id, o.customer_email, max(o.customer_name), count(*)::bigint,
    sum(o.total)::numeric(12,2), (sum(o.total) / count(*))::numeric(12,2), max(o.created_at)
  from public.orders o
  where o.order_status in ('confirmed','processing','ready','shipped','delivered')
    and (p_from is null or o.created_at >= p_from) and (p_to is null or o.created_at < p_to)
  group by o.customer_id, o.customer_email order by 5 desc;
end $$;

revoke execute on function public.get_product_sales_report(timestamptz,timestamptz) from public, anon;
revoke execute on function public.get_category_sales_report(timestamptz,timestamptz) from public, anon;
revoke execute on function public.get_customer_sales_report(timestamptz,timestamptz) from public, anon;
grant execute on function public.get_product_sales_report(timestamptz,timestamptz) to authenticated;
grant execute on function public.get_category_sales_report(timestamptz,timestamptz) to authenticated;
grant execute on function public.get_customer_sales_report(timestamptz,timestamptz) to authenticated;
