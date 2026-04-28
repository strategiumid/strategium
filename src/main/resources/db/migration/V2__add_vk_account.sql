alter table app_users add column vk_id varchar(64) unique;
alter table app_users add column vk_display_name varchar(120);
alter table app_users add column vk_access_token varchar(1024);
alter table app_users add column vk_token_expires_at timestamp;
