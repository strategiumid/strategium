create table factions (
  id uuid primary key,
  name varchar(120) not null,
  tag varchar(12) not null,
  theme varchar(16) not null default 'hoi4',
  created_at timestamp not null,
  constraint ux_factions_tag unique (tag)
);

create table faction_members (
  id uuid primary key,
  faction_id uuid not null references factions (id) on delete cascade,
  user_id uuid not null references app_users (id) on delete cascade,
  role varchar(24) not null,
  joined_at timestamp not null
);

create unique index ux_faction_members_user on faction_members (user_id);
create index idx_faction_members_faction on faction_members (faction_id);
