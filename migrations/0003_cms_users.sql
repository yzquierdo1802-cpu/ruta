-- CMS roster (unowned catalog personas for admin + leaderboard; no emails/passwords)

create table if not exists cms_users (
  id          serial primary key,
  alias       text not null,
  role        text not null default 'aprendiz',
  language_id int references languages(id) on delete set null,
  xp          int not null default 0,
  streak      int not null default 0,
  is_active   boolean not null default true,
  notes       text not null default '',
  sort_order  int not null default 0
);

create index if not exists cms_users_sort_idx on cms_users (sort_order, id);
