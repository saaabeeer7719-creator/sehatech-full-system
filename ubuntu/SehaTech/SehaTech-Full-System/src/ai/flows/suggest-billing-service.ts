'use server';
/**
 * @fileOverview Implements an AI flow to suggest a billing service based on recent appointments.
 *
 * - suggestBillingService - A function that suggests a billing service.
 * - SuggestBillingServiceInput - The input type for the suggestBillingService function.
 * - SuggestBillingServiceOutput - The return type for the suggestBillingService function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestBillingServiceInputSchema = z.object({
  patientId: z.string().describe('The ID of the patient.'),
  recentAppointments: z.array(
    z.object({
      doctorSpecialty: z.string().describe("The doctor's specialty."),
      dateTime: z.string().describe("The date and time of the appointment."),
      status: z.string().describe("The status of the appointment."),
    })
  ).describe("The patient's recent appointment history."),
});
export type SuggestBillingServiceInput = z.infer<typeof SuggestBillingServiceInputSchema>;


const SuggestBillingServiceOutputSchema = z.object({
    service: z.string().describe("The suggested billing service, e.g., 'Cardiology Consultation' or 'Dermatology Follow-up'.")
});
export type SuggestBillingServiceOutput = z.infer<typeof SuggestBillingServiceOutputSchema>;


export async function suggestBillingService(input: SuggestBillingServiceInput): Promise<SuggestBillingServiceOutput> {
  return suggestBillingServiceFlow(input);
}


const prompt = ai.definePrompt({
  name: 'suggestBillingServicePrompt',
  input: {schema: SuggestBillingServiceInputSchema},
  output: {schema: SuggestBillingServiceOutputSchema},
  prompt: `You are a medical billing assistant. Based on the patient's recent appointments, suggest a concise and appropriate billing service description.
  The most recent, completed appointment is the most likely candidate for billing. If there are multiple completed appointments, use the most recent one.

  Patient ID: {{{patientId}}}

  Recent Appointments:
  {{#each recentAppointments}}
  - Specialty: {{{doctorSpecialty}}}, Date: {{{dateTime}}}, Status: {{{status}}}
  {{/each}}

  Based on this, suggest a single, clear billing service description. For example, if the latest completed appointment was with a cardiologist, suggest 'Cardiology Consultation'.
  `,
});

const suggestBillingServiceFlow = ai.defineFlow(
  {
    name: 'suggestBillingServiceFlow',
    inputSchema: SuggestBillingServiceInputSchema,
    outputSchema: SuggestBillingServiceOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);