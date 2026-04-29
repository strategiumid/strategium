create table steam_user_game_stats (
  id uuid primary key,
  user_id uuid not null references app_users (id) on delete cascade,
  steam_id varchar(64) not null,
  app_id integer not null,
  playtime_minutes integer not null,
  unlocked_count integer not null,
  total_count integer not null,
  progress_percent integer not null,
  available boolean not null,
  updated_at timestamp not null
);

create unique index idx_steam_user_game_stats_user_app on steam_user_game_stats (user_id, app_id);
create index idx_steam_user_game_stats_app_id on steam_user_game_stats (app_id);
create index idx_steam_user_game_stats_steam_id on steam_user_game_stats (steam_id);
