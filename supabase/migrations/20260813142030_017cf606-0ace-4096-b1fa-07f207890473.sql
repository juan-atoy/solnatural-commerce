
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.claim_admin() from public, anon;
revoke execute on function public.adjust_stock(uuid,integer,text) from public, anon;
revoke execute on function public.set_order_status(uuid,public.order_status,text) from public, anon;
revoke execute on function public.get_sales_summary(timestamptz,timestamptz) from public, anon;
revoke execute on function public.get_sales_by_period(timestamptz,timestamptz,text) from public, anon;
revoke execute on function public.get_top_products(timestamptz,timestamptz,integer) from public, anon;
revoke execute on function public.get_sales_by_category(timestamptz,timestamptz) from public, anon;
revoke execute on function public.get_orders_by_status(timestamptz,timestamptz) from public, anon;
revoke execute on function public.get_low_stock_products() from public, anon;
revoke execute on function public.get_top_customers(timestamptz,timestamptz,integer) from public, anon;
revoke execute on function public.get_sales_report(timestamptz,timestamptz) from public, anon;
revoke execute on function public.audit_row() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.create_order(jsonb,text,text,text,text,text,text,text,public.payment_method,text) from public;
grant execute on function public.create_order(jsonb,text,text,text,text,text,text,text,public.payment_method,text) to anon, authenticated;
alter view public.my_order_items set (security_invoker = off);
