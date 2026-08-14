import { defineCollection, z } from 'astro:content';

const baseSchema = z.object({
  title: z.string(),
  beschreibung: z.string().optional(),
  tags: z.array(z.string()).default([]),
  reihenfolge: z.number().optional(),
  premium: z.boolean().default(false),
  preview: z.string().optional().default(''),
});

const lernskripte = defineCollection({
  schema: baseSchema.extend({
    topic: z.string().optional(),
    premium: z.boolean().default(true),
  }),
});

const themen = defineCollection({
  schema: baseSchema,
});

const pruefung = defineCollection({
  schema: baseSchema.extend({
    topic: z.string().optional(),
    premium: z.boolean().default(true),
  }),
});

const ebooks = defineCollection({
  schema: baseSchema.extend({
    premium: z.boolean().default(true),
  }),
});

const examQuiz = defineCollection({
  schema: z.object({
    question: z.string(),
    answers: z.array(z.string()).min(2),
    correctAnswer: z.string(),
    explanation: z.string().optional(),
    topic: z.string(),
    difficulty: z.enum(['leicht', 'mittel', 'schwer']),
    premium: z.boolean().default(true),
  }),
});

const faelle = defineCollection({
  schema: baseSchema,
});

const quiz = defineCollection({
  schema: z.object({
    question: z.string(),
    answer: z.string(),
    topic: z.string(),
    difficulty: z.enum(['leicht', 'mittel', 'schwer']),
    premium: z.boolean().default(false),
  }),
});

const vorlagen = defineCollection({
  schema: baseSchema,
});

const lernpfade = defineCollection({
  schema: baseSchema.extend({
    bereich: z.string().optional(),
    premium: z.boolean().default(false),
  }),
});

const anleitungsaufgaben = defineCollection({
  schema: z.object({
    title: z.string(),
    beschreibung: z.string(),
    ausbildungsstand: z.enum([
      'ausbildungsbeginn',
      'erstes-drittel',
      'zweites-drittel',
      'drittes-drittel',
    ]),
    themenbereich: z.string(),
    setting: z.array(
      z.enum([
        'settinguebergreifend',
        'klinik',
        'stationaere-langzeitpflege',
        'ambulante-pflege',
      ])
    ),
    dauer: z.string().optional(),
    reihenfolge: z.number().optional(),
    tags: z.array(z.string()).default([]),
    premium: z.boolean().default(true),
  }),
});

export const collections = {
  lernskripte,
  themen,
  pruefung,
  ebooks,
  examQuiz,
  faelle,
  quiz,
  vorlagen,
  lernpfade,
  anleitungsaufgaben,
};