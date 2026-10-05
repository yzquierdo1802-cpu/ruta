import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { seedIfEmpty } from "@/lib/server/seed";
import type {
  Answer,
  Category,
  CmsUser,
  DashboardStats,
  Language,
  Lesson,
  LessonPlay,
  Question,
  VocabItem,
} from "@/lib/types";

function mapLang(r: Record<string, unknown>): Language {
  return {
    id: Number(r.id),
    code: String(r.code),
    name: String(r.name),
    nativeName: String(r.native_name),
    sortOrder: Number(r.sort_order),
    isActive: Boolean(r.is_active),
  };
}

function mapCat(r: Record<string, unknown>): Category {
  return {
    id: Number(r.id),
    languageId: Number(r.language_id),
    name: String(r.name),
    description: String(r.description ?? ""),
    color: String(r.color),
    icon: String(r.icon),
    sortOrder: Number(r.sort_order),
    isActive: Boolean(r.is_active),
    lessonCount: r.lesson_count != null ? Number(r.lesson_count) : undefined,
    questionCount: r.question_count != null ? Number(r.question_count) : undefined,
    languageName: r.language_name != null ? String(r.language_name) : undefined,
  };
}

function mapLesson(r: Record<string, unknown>): Lesson {
  return {
    id: Number(r.id),
    categoryId: Number(r.category_id),
    name: String(r.name),
    description: String(r.description ?? ""),
    lessonType: String(r.lesson_type),
    sortOrder: Number(r.sort_order),
    estimatedMinutes: Number(r.estimated_minutes),
    isActive: Boolean(r.is_active),
    questionCount: r.question_count != null ? Number(r.question_count) : undefined,
    categoryName: r.category_name != null ? String(r.category_name) : undefined,
  };
}

function mapQuestion(r: Record<string, unknown>): Question {
  return {
    id: Number(r.id),
    lessonId: Number(r.lesson_id),
    prompt: String(r.prompt),
    promptNative: String(r.prompt_native ?? ""),
    questionType: String(r.question_type),
    points: Number(r.points),
    sortOrder: Number(r.sort_order),
    explanation: String(r.explanation ?? ""),
    audioText: String(r.audio_text ?? ""),
    isActive: Boolean(r.is_active),
    lessonName: r.lesson_name != null ? String(r.lesson_name) : undefined,
    categoryName: r.category_name != null ? String(r.category_name) : undefined,
    answerCount: r.answer_count != null ? Number(r.answer_count) : undefined,
  };
}

function mapAnswer(r: Record<string, unknown>): Answer {
  return {
    id: Number(r.id),
    questionId: Number(r.question_id),
    answerText: String(r.answer_text),
    isCorrect: Boolean(r.is_correct),
    sortOrder: Number(r.sort_order),
  };
}

function mapVocab(r: Record<string, unknown>): VocabItem {
  return {
    id: Number(r.id),
    languageId: Number(r.language_id),
    categoryId: r.category_id == null ? null : Number(r.category_id),
    lessonId: r.lesson_id == null ? null : Number(r.lesson_id),
    term: String(r.term),
    translation: String(r.translation),
    phonetic: String(r.phonetic ?? ""),
    example: String(r.example ?? ""),
    exampleTranslation: String(r.example_translation ?? ""),
    sortOrder: Number(r.sort_order),
    isActive: Boolean(r.is_active),
    categoryName: r.category_name != null ? String(r.category_name) : undefined,
  };
}

export const listLanguages = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  await seedIfEmpty(sql);
  const rows = await sql`select * from languages order by sort_order, id`;
  return rows.map(mapLang);
});

export const saveLanguage = createServerFn({ method: "POST" })
  .validator((input: {
    id?: number;
    code: string;
    name: string;
    nativeName: string;
    sortOrder: number;
    isActive: boolean;
  }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    if (data.id) {
      await sql`
        update languages set
          code = ${data.code}, name = ${data.name}, native_name = ${data.nativeName},
          sort_order = ${data.sortOrder}, is_active = ${data.isActive}
        where id = ${data.id}
      `;
      return { id: data.id };
    }
    const rows = await sql<{ id: number }>`
      insert into languages (code, name, native_name, sort_order, is_active)
      values (${data.code}, ${data.name}, ${data.nativeName}, ${data.sortOrder}, ${data.isActive})
      returning id
    `;
    return { id: rows[0]!.id };
  });

export const deleteLanguage = createServerFn({ method: "POST" })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from languages where id = ${data.id}`;
    return { ok: true };
  });

export const listCategories = createServerFn({ method: "GET" })
  .validator((input?: { languageId?: number; includeInactive?: boolean }) => input ?? {})
  .handler(async ({ data }) => {
    const sql = await getSql();
    await seedIfEmpty(sql);
    const languageId = data.languageId;
    const includeInactive = Boolean(data.includeInactive);
    const rows = languageId
      ? await sql`
          select c.*,
            lang.name as language_name,
            (select count(*)::int from lessons l where l.category_id = c.id) as lesson_count
          from categories c
          join languages lang on lang.id = c.language_id
          where c.language_id = ${languageId}
            and (${includeInactive} or c.is_active = true)
          order by c.sort_order, c.id
        `
      : await sql`
          select c.*,
            lang.name as language_name,
            (select count(*)::int from lessons l where l.category_id = c.id) as lesson_count
          from categories c
          join languages lang on lang.id = c.language_id
          where (${includeInactive} or c.is_active = true)
          order by lang.sort_order, c.sort_order, c.id
        `;
    return rows.map(mapCat);
  });

export const saveCategory = createServerFn({ method: "POST" })
  .validator((input: {
    id?: number;
    languageId: number;
    name: string;
    description: string;
    color: string;
    icon: string;
    sortOrder: number;
    isActive: boolean;
  }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    if (data.id) {
      await sql`
        update categories set
          language_id = ${data.languageId}, name = ${data.name}, description = ${data.description},
          color = ${data.color}, icon = ${data.icon}, sort_order = ${data.sortOrder}, is_active = ${data.isActive}
        where id = ${data.id}
      `;
      return { id: data.id };
    }
    const rows = await sql<{ id: number }>`
      insert into categories (language_id, name, description, color, icon, sort_order, is_active)
      values (${data.languageId}, ${data.name}, ${data.description}, ${data.color}, ${data.icon}, ${data.sortOrder}, ${data.isActive})
      returning id
    `;
    return { id: rows[0]!.id };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from categories where id = ${data.id}`;
    return { ok: true };
  });

export const listLessons = createServerFn({ method: "GET" })
  .validator((input?: { categoryId?: number; includeInactive?: boolean }) => input ?? {})
  .handler(async ({ data }) => {
    const sql = await getSql();
    await seedIfEmpty(sql);
    const categoryId = data.categoryId;
    const includeInactive = Boolean(data.includeInactive);
    const rows = categoryId
      ? await sql`
          select l.*, c.name as category_name,
            (select count(*)::int from questions q where q.lesson_id = l.id) as question_count
          from lessons l
          join categories c on c.id = l.category_id
          where l.category_id = ${categoryId}
            and (${includeInactive} or l.is_active = true)
          order by l.sort_order, l.id
        `
      : await sql`
          select l.*, c.name as category_name,
            (select count(*)::int from questions q where q.lesson_id = l.id) as question_count
          from lessons l
          join categories c on c.id = l.category_id
          where (${includeInactive} or l.is_active = true)
          order by c.sort_order, l.sort_order, l.id
        `;
    return rows.map(mapLesson);
  });

export const saveLesson = createServerFn({ method: "POST" })
  .validator((input: {
    id?: number;
    categoryId: number;
    name: string;
    description: string;
    lessonType: string;
    sortOrder: number;
    estimatedMinutes: number;
    isActive: boolean;
  }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    if (data.id) {
      await sql`
        update lessons set
          category_id = ${data.categoryId}, name = ${data.name}, description = ${data.description},
          lesson_type = ${data.lessonType}, sort_order = ${data.sortOrder},
          estimated_minutes = ${data.estimatedMinutes}, is_active = ${data.isActive}
        where id = ${data.id}
      `;
      return { id: data.id };
    }
    const rows = await sql<{ id: number }>`
      insert into lessons (category_id, name, description, lesson_type, sort_order, estimated_minutes, is_active)
      values (${data.categoryId}, ${data.name}, ${data.description}, ${data.lessonType}, ${data.sortOrder}, ${data.estimatedMinutes}, ${data.isActive})
      returning id
    `;
    return { id: rows[0]!.id };
  });

export const deleteLesson = createServerFn({ method: "POST" })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from lessons where id = ${data.id}`;
    return { ok: true };
  });

export const listQuestions = createServerFn({ method: "GET" })
  .validator((input?: { lessonId?: number; includeInactive?: boolean }) => input ?? {})
  .handler(async ({ data }) => {
    const sql = await getSql();
    await seedIfEmpty(sql);
    const lessonId = data.lessonId;
    const includeInactive = Boolean(data.includeInactive);
    const rows = lessonId
      ? await sql`
          select q.*, l.name as lesson_name, c.name as category_name,
            (select count(*)::int from answers a where a.question_id = q.id) as answer_count
          from questions q
          join lessons l on l.id = q.lesson_id
          join categories c on c.id = l.category_id
          where q.lesson_id = ${lessonId}
            and (${includeInactive} or q.is_active = true)
          order by q.sort_order, q.id
        `
      : await sql`
          select q.*, l.name as lesson_name, c.name as category_name,
            (select count(*)::int from answers a where a.question_id = q.id) as answer_count
          from questions q
          join lessons l on l.id = q.lesson_id
          join categories c on c.id = l.category_id
          where (${includeInactive} or q.is_active = true)
          order by q.id desc
          limit 2000
        `;
    return rows.map(mapQuestion);
  });

export const saveQuestion = createServerFn({ method: "POST" })
  .validator((input: {
    id?: number;
    lessonId: number;
    prompt: string;
    promptNative: string;
    questionType: string;
    points: number;
    sortOrder: number;
    explanation: string;
    audioText: string;
    isActive: boolean;
    answers?: { answerText: string; isCorrect: boolean; sortOrder: number }[];
  }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    let id = data.id;
    if (id) {
      await sql`
        update questions set
          lesson_id = ${data.lessonId}, prompt = ${data.prompt}, prompt_native = ${data.promptNative},
          question_type = ${data.questionType}, points = ${data.points}, sort_order = ${data.sortOrder},
          explanation = ${data.explanation}, audio_text = ${data.audioText}, is_active = ${data.isActive}
        where id = ${id}
      `;
    } else {
      const rows = await sql<{ id: number }>`
        insert into questions (
          lesson_id, prompt, prompt_native, question_type, points, sort_order, explanation, audio_text, is_active
        ) values (
          ${data.lessonId}, ${data.prompt}, ${data.promptNative}, ${data.questionType},
          ${data.points}, ${data.sortOrder}, ${data.explanation}, ${data.audioText}, ${data.isActive}
        ) returning id
      `;
      id = rows[0]!.id;
    }
    if (data.answers) {
      await sql`delete from answers where question_id = ${id}`;
      const kept = data.answers.filter((a) => a.answerText.trim());
      for (let i = 0; i < kept.length; i += 1) {
        const a = kept[i]!;
        await sql`
          insert into answers (question_id, answer_text, is_correct, sort_order)
          values (${id}, ${a.answerText.trim()}, ${a.isCorrect}, ${i + 1})
        `;
      }
    }
    return { id };
  });

export const deleteQuestion = createServerFn({ method: "POST" })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from questions where id = ${data.id}`;
    return { ok: true };
  });

export const listAnswers = createServerFn({ method: "GET" })
  .validator((input?: { questionId?: number }) => input ?? {})
  .handler(async ({ data }) => {
    const sql = await getSql();
    await seedIfEmpty(sql);
    const questionId = data.questionId;
    const rows = questionId
      ? await sql`select * from answers where question_id = ${questionId} order by sort_order, id`
      : await sql`select * from answers order by id desc limit 4000`;
    return rows.map(mapAnswer);
  });

export const saveAnswer = createServerFn({ method: "POST" })
  .validator((input: {
    id?: number;
    questionId: number;
    answerText: string;
    isCorrect: boolean;
    sortOrder: number;
  }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    if (data.id) {
      await sql`
        update answers set
          question_id = ${data.questionId}, answer_text = ${data.answerText},
          is_correct = ${data.isCorrect}, sort_order = ${data.sortOrder}
        where id = ${data.id}
      `;
      return { id: data.id };
    }
    const rows = await sql<{ id: number }>`
      insert into answers (question_id, answer_text, is_correct, sort_order)
      values (${data.questionId}, ${data.answerText}, ${data.isCorrect}, ${data.sortOrder})
      returning id
    `;
    return { id: rows[0]!.id };
  });

export const deleteAnswer = createServerFn({ method: "POST" })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from answers where id = ${data.id}`;
    return { ok: true };
  });

export const listVocabulary = createServerFn({ method: "GET" })
  .validator((input?: { languageId?: number; categoryId?: number; lessonId?: number }) => input ?? {})
  .handler(async ({ data }) => {
    const sql = await getSql();
    await seedIfEmpty(sql);
    const langFilter = data.languageId ?? null;
    const catFilter = data.categoryId ?? null;
    const lessonFilter = data.lessonId ?? null;
    const rows = await sql`
      select v.*, c.name as category_name
      from vocabulary v
      left join categories c on c.id = v.category_id
      where (${langFilter}::int is null or v.language_id = ${langFilter})
        and (${catFilter}::int is null or v.category_id = ${catFilter})
        and (${lessonFilter}::int is null or v.lesson_id = ${lessonFilter})
      order by v.sort_order, v.id
      limit 400
    `;
    return rows.map(mapVocab);
  });

export const saveVocabulary = createServerFn({ method: "POST" })
  .validator((input: {
    id?: number;
    languageId: number;
    categoryId: number | null;
    lessonId: number | null;
    term: string;
    translation: string;
    phonetic: string;
    example: string;
    exampleTranslation: string;
    sortOrder: number;
    isActive: boolean;
  }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    if (data.id) {
      await sql`
        update vocabulary set
          language_id = ${data.languageId}, category_id = ${data.categoryId}, lesson_id = ${data.lessonId},
          term = ${data.term}, translation = ${data.translation}, phonetic = ${data.phonetic},
          example = ${data.example}, example_translation = ${data.exampleTranslation},
          sort_order = ${data.sortOrder}, is_active = ${data.isActive}
        where id = ${data.id}
      `;
      return { id: data.id };
    }
    const rows = await sql<{ id: number }>`
      insert into vocabulary (
        language_id, category_id, lesson_id, term, translation, phonetic, example, example_translation, sort_order, is_active
      ) values (
        ${data.languageId}, ${data.categoryId}, ${data.lessonId}, ${data.term}, ${data.translation},
        ${data.phonetic}, ${data.example}, ${data.exampleTranslation}, ${data.sortOrder}, ${data.isActive}
      ) returning id
    `;
    return { id: rows[0]!.id };
  });

export const deleteVocabulary = createServerFn({ method: "POST" })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from vocabulary where id = ${data.id}`;
    return { ok: true };
  });

export const getLessonPlay = createServerFn({ method: "GET" })
  .validator((input: { lessonId: number }) => input)
  .handler(async ({ data }): Promise<LessonPlay | null> => {
    const sql = await getSql();
    await seedIfEmpty(sql);
    const lessonRows = await sql`select * from lessons where id = ${data.lessonId}`;
    if (!lessonRows[0]) return null;
    const lesson = mapLesson(lessonRows[0]);
    const catRows = await sql`select * from categories where id = ${lesson.categoryId}`;
    if (!catRows[0]) return null;
    const category = mapCat(catRows[0]);
    const langRows = await sql`select * from languages where id = ${category.languageId}`;
    if (!langRows[0]) return null;
    const language = mapLang(langRows[0]);
    const qRows = await sql`
      select * from questions where lesson_id = ${lesson.id} and is_active = true
      order by sort_order, id
    `;
    const questions = qRows.map(mapQuestion);
    if (questions.length) {
      const ids = questions.map((q) => q.id);
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
      const aRows = await sql.query(
        `select * from answers where question_id in (${placeholders}) order by sort_order, id`,
        ids,
      );
      const byQuestion = new Map<number, ReturnType<typeof mapAnswer>[]>();
      for (const row of aRows) {
        const answer = mapAnswer(row);
        const list = byQuestion.get(answer.questionId) ?? [];
        list.push(answer);
        byQuestion.set(answer.questionId, list);
      }
      for (const q of questions) {
        q.answers = byQuestion.get(q.id) ?? [];
      }
    }
    const vRows = await sql`
      select v.*, c.name as category_name from vocabulary v
      left join categories c on c.id = v.category_id
      where v.lesson_id = ${lesson.id} and v.is_active = true
      order by v.sort_order
    `;
    return {
      lesson,
      category,
      language,
      questions,
      vocabulary: vRows.map(mapVocab),
    };
  });

export const getDashboard = createServerFn({ method: "GET" }).handler(async (): Promise<DashboardStats> => {
  const sql = await getSql();
  await seedIfEmpty(sql);
  const [languages] = await sql<{ n: number }>`select count(*)::int as n from languages`;
  const [categories] = await sql<{ n: number }>`select count(*)::int as n from categories`;
  const [lessons] = await sql<{ n: number }>`select count(*)::int as n from lessons`;
  const [questions] = await sql<{ n: number }>`select count(*)::int as n from questions`;
  const [answers] = await sql<{ n: number }>`select count(*)::int as n from answers`;
  const [vocabulary] = await sql<{ n: number }>`select count(*)::int as n from vocabulary`;
  const [users] = await sql<{ n: number }>`select count(*)::int as n from cms_users`;
  const [lessonsEmpty] = await sql<{ n: number }>`
    select count(*)::int as n from lessons l
    where not exists (select 1 from questions q where q.lesson_id = l.id)
  `;
  const [questionsEmpty] = await sql<{ n: number }>`
    select count(*)::int as n from questions q
    where not exists (select 1 from answers a where a.question_id = q.id)
  `;
  const byCategory = await sql<{ name: string; lessons: number; color: string }>`
    select c.name, c.color, count(l.id)::int as lessons
    from categories c
    left join lessons l on l.category_id = c.id
    group by c.id, c.name, c.color, c.sort_order
    order by c.sort_order
    limit 12
  `;
  return {
    languages: languages?.n ?? 0,
    categories: categories?.n ?? 0,
    lessons: lessons?.n ?? 0,
    questions: questions?.n ?? 0,
    answers: answers?.n ?? 0,
    vocabulary: vocabulary?.n ?? 0,
    users: users?.n ?? 0,
    lessonsEmpty: lessonsEmpty?.n ?? 0,
    questionsEmpty: questionsEmpty?.n ?? 0,
    byCategory,
  };
});

function mapUser(r: Record<string, unknown>): CmsUser {
  return {
    id: Number(r.id),
    alias: String(r.alias),
    role: String(r.role),
    languageId: r.language_id == null ? null : Number(r.language_id),
    xp: Number(r.xp),
    streak: Number(r.streak),
    isActive: Boolean(r.is_active),
    notes: String(r.notes ?? ""),
    sortOrder: Number(r.sort_order),
    languageName: r.language_name != null ? String(r.language_name) : undefined,
  };
}

export const listCmsUsers = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  await seedIfEmpty(sql);
  const rows = await sql`
    select u.*, lang.name as language_name
    from cms_users u
    left join languages lang on lang.id = u.language_id
    order by u.sort_order, u.id
  `;
  return rows.map(mapUser);
});

export const saveCmsUser = createServerFn({ method: "POST" })
  .validator((input: {
    id?: number;
    alias: string;
    role: string;
    languageId: number | null;
    xp: number;
    streak: number;
    isActive: boolean;
    notes: string;
    sortOrder: number;
  }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const alias = data.alias.trim().slice(0, 40);
    if (!alias) throw new Error("Alias requerido");
    if (data.id) {
      await sql`
        update cms_users set
          alias = ${alias}, role = ${data.role}, language_id = ${data.languageId},
          xp = ${data.xp}, streak = ${data.streak}, is_active = ${data.isActive},
          notes = ${data.notes}, sort_order = ${data.sortOrder}
        where id = ${data.id}
      `;
      return { id: data.id };
    }
    const rows = await sql<{ id: number }>`
      insert into cms_users (alias, role, language_id, xp, streak, is_active, notes, sort_order)
      values (${alias}, ${data.role}, ${data.languageId}, ${data.xp}, ${data.streak}, ${data.isActive}, ${data.notes}, ${data.sortOrder})
      returning id
    `;
    return { id: rows[0]!.id };
  });

export const deleteCmsUser = createServerFn({ method: "POST" })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from cms_users where id = ${data.id}`;
    return { ok: true };
  });
