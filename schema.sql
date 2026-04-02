create table creator_wallets (
  user_id uuid primary key,
  balance numeric default 0
);

create table payouts (
  id bigint generated always as identity primary key,
  user_id uuid,
  amount numeric,
  status text,
  order_id text,
  created_at timestamp default now()
);
