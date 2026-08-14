-- Reliable, idempotent email dispatch for newly-created orders.
create table public.order_email_dispatches (
  order_id uuid primary key references public.orders(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  admin_sent_at timestamptz,
  customer_sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.order_email_dispatches enable row level security;
grant select on public.order_email_dispatches to authenticated;
grant all on public.order_email_dispatches to service_role;

create policy "order_email_dispatches_admin_select"
  on public.order_email_dispatches for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger trg_order_email_dispatches_updated
  before update on public.order_email_dispatches
  for each row execute function public.set_updated_at();

create or replace function public.enqueue_order_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.order_email_dispatches(order_id) values (new.id)
  on conflict (order_id) do nothing;
  return new;
end $$;

create trigger trg_enqueue_order_email
  after insert on public.orders
  for each row execute function public.enqueue_order_email();

revoke all on function public.enqueue_order_email() from public, anon, authenticated;

-- Bootstrap administrators through Studio/SQL with the service role. A public
-- "first user wins" RPC is unsafe on an internet-facing store.
revoke execute on function public.claim_admin() from authenticated;

