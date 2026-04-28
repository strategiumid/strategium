create table app_users (
  id uuid primary key,
  username varchar(120) not null unique,
  display_name varchar(120) not null,
  steam_id varchar(64) unique,
  role varchar(32) not null,
  created_at timestamp not null
);

create table news_items (
  id uuid primary key,
  title varchar(255) not null,
  text text not null,
  tag varchar(64) not null,
  source_name varchar(160) not null,
  source_url varchar(600) not null,
  published_at date not null
);

create index idx_news_items_published_at on news_items (published_at desc);

create table division_templates (
  id uuid primary key,
  owner_id uuid not null references app_users (id) on delete cascade,
  name varchar(120) not null,
  line_slots text not null,
  support_slots text not null,
  combat_width integer not null,
  hp integer not null,
  organization integer not null,
  soft_attack integer not null,
  hard_attack integer not null,
  battalion_count integer not null,
  support_count integer not null,
  xp_cost integer not null,
  created_at timestamp not null,
  updated_at timestamp not null
);

create index idx_division_templates_owner_id on division_templates (owner_id);
