
'use server';
/**
 * @fileOverview Implements an AI flow to summarize a patient's history.
 *
 * - summarizePatientHistory - A function that generates a clinical summary for a patient.
 * - SummarizePatientHistoryInput - The input type for the summarizePatientHistory function.
 * - SummarizePatientHistoryOutput - The return type for the summarizePatientHistory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizePatientHistoryInputSchema = z.object({
  patient: z.object({
    name: z.string().describe("The patient's full name."),
    age: z.number().describe("The patient's age."),
    gender: z.string().describe("The patient's gender."),
  }),
  appointments: z.array(
    z.object({
      doctorName: z.string().describe("The doctor's name."),
      doctorSpecialty: z.string().describe("The doctor's specialty."),
      dateTime: z.string().describe("The date and time of the appointment."),
      status: z.string().describe("The status of the appointment (e.g., Completed, Scheduled)."),
    })
  ).describe("The patient's appointment history."),
});
export type SummarizePatientHistoryInput = z.infer<typeof SummarizePatientHistoryInputSchema>;

const SummarizePatientHistoryOutputSchema = z.object({
  summary: z.string().describe("A concise clinical summary of the patient's history in Arabic, highlighting key information like recent visits, upcoming appointments, and specialties of doctors seen. Should be in paragraph form."),
});
export type SummarizePatientHistoryOutput = z.infer<typeof SummarizePatientHistoryOutputSchema>;


export async function summarizePatientHistory(input: SummarizePatientHistoryInput): Promise<SummarizePatientHistoryOutput> {
  return summarizePatientHistoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizePatientHistoryPrompt',
  input: {schema: SummarizePatientHistoryInputSchema},
  output: {schema: SummarizePatientHistoryOutputSchema},
  prompt: `أنت مساعد طبي ذكي. مهمتك هي إنشاء ملخص سريري موجز لسجل المريض باللغة العربية.
  يجب أن يكون الملخص سهل القراءة للطبيب، مع إبراز أهم المعلومات.

  معلومات المريض:
  - الاسم: {{{patient.name}}}
  - العمر: {{{patient.age}}}
  - الجنس: {{{patient.gender}}}

  تاريخ المواعيد:
  {{#each appointments}}
  - {{dateTime}}: موعد مع {{doctorName}} ({{doctorSpecialty}}). الحالة: {{status}}.
  {{/each}}

  بناءً على البيانات المقدمة، قم بإنشاء ملخص سريري. ركز على وتيرة الزيارات، ومجموعة التخصصات التي قام بزيارتها، وأي مواعيد قادمة مجدولة.
  قدم المخرجات كفقرة واحدة باللغة العربية.
  `,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const summarizePatientHistoryFlow = ai.defineFlow(
  {
    name: 'summarizePatientHistoryFlow',
    inputSchema: SummarizePatientHistoryInputSchema,
    outputSchema: SummarizePatientHistoryOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
