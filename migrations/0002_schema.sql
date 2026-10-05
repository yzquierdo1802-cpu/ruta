-- Ruta language-learning catalog (unowned CMS rows; no user_id)

create table if not exists languages (
  id          serial primary key,
  code        text not null unique,
  name        text not null,
  native_name text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true
);

create table if not exists categories (
  id          serial primary key,
  language_id int not null references languages(id) on delete cascade,
  name        text not null,
  description text not null default '',
  color       text not null default '#0E7C74',
  icon        text not null default 'book-open',
  sort_order  int not null default 0,
  is_active   boolean not null default true
);

create index if not exists categories_language_idx on categories (language_id, sort_order);

create table if not exists lessons (
  id                 serial primary key,
  category_id        int not null references categories(id) on delete cascade,
  name               text not null,
  description        text not null default '',
  lesson_type        text not null default 'vocabulary',
  sort_order         int not null default 0,
  estimated_minutes  int not null default 5,
  is_active          boolean not null default true
);

create index if not exists lessons_category_idx on lessons (category_id, sort_order);

create table if not exists questions (
  id             serial primary key,
  lesson_id      int not null references lessons(id) on delete cascade,
  prompt         text not null,
  prompt_native  text not null default '',
  question_type  text not null default 'multiple_choice',
  points         int not null default 10,
  sort_order     int not null default 0,
  explanation    text not null default '',
  audio_text     text not null default '',
  is_active      boolean not null default true
);

create index if not exists questions_lesson_idx on questions (lesson_id, sort_order);

create table if not exists answers (
  id          serial primary key,
  question_id int not null references questions(id) on delete cascade,
  answer_text text not null,
  is_correct  boolean not null default false,
  sort_order  int not null default 0
);

create index if not exists answers_question_idx on answers (question_id, sort_order);

create table if not exists vocabulary (
  id                   serial primary key,
  language_id          int not null references languages(id) on delete cascade,
  category_id          int references categories(id) on delete set null,
  lesson_id            int references lessons(id) on delete set null,
  term                 text not null,
  translation          text not null,
  phonetic             text not null default '',
  example              text not null default '',
  example_translation  text not null default '',
  sort_order           int not null default 0,
  is_active            boolean not null default true
);

create index if not exists vocabulary_language_idx on vocabulary (language_id, sort_order);
create index if not exists vocabulary_category_idx on vocabulary (category_id);
