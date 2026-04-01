import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const tests = pgTable('tests', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  topic: text('topic').notNull(),
  examType: text('exam_type').notNull(),
  difficulty: text('difficulty').notNull(),
  questionCount: integer('question_count').notNull(),
  isPublic: boolean('is_public').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  testId: integer('test_id').notNull().references(() => tests.id),
  text: text('text').notNull(),
  options: jsonb('options').notNull().$type<{ label: string; text: string }[]>(),
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation'),
  imageUrl: text('image_url'),
  hint: text('hint'),
  section: text('section'),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  testId: integer('test_id').notNull().references(() => tests.id),
  completedAt: timestamp('completed_at'),
  timeTakenSeconds: integer('time_taken_seconds'),
  score: integer('score'),
  total: integer('total'),
});

export const sessionAnswers = pgTable('session_answers', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull().references(() => sessions.id),
  questionId: integer('question_id').notNull().references(() => questions.id),
  selectedAnswer: text('selected_answer'),
  isCorrect: boolean('is_correct'),
  timeTakenSeconds: integer('time_taken_seconds'),
});

export const testTranslations = pgTable('test_translations', {
  id: serial('id').primaryKey(),
  testId: integer('test_id').notNull().references(() => tests.id),
  language: text('language').notNull(),
  translatedData: jsonb('translated_data').notNull(),
});

export const insertTestSchema = createInsertSchema(tests).omit({ id: true, createdAt: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true });
export const insertSessionAnswerSchema = createInsertSchema(sessionAnswers).omit({ id: true });

export type Test = typeof tests.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SessionAnswer = typeof sessionAnswers.$inferSelect;
export type InsertTest = z.infer<typeof insertTestSchema>;
