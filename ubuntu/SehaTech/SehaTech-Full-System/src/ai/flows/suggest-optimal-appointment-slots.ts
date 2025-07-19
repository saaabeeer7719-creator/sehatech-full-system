'use server';
/**
 * @fileOverview Implements the smart appointment suggestion feature.
 *
 * - suggestOptimalAppointmentSlots - A function that suggests optimal appointment slots based on patient history and doctor availability.
 * - SuggestOptimalAppointmentSlotsInput - The input type for the suggestOptimalAppointmentSlots function.
 * - SuggestOptimalAppointmentSlotsOutput - The return type for the suggestOptimalAppointmentSlots function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestOptimalAppointmentSlotsInputSchema = z.object({
  patientId: z.string().describe('The ID of the patient.'),
  doctorId: z.string().describe('The ID of the doctor.'),
  appointmentHistory: z.array(
    z.object({
      date: z.string().describe('The date of the past appointment.'),
      time: z.string().describe('The time of the past appointment.'),
    })
  ).describe('The appointment history of the patient with the doctor.'),
  doctorAvailability: z.array(
    z.object({
      date: z.string().describe('The date of availability.'),
      slots: z.array(z.string()).describe('Available time slots for the date.'),
    })
  ).describe('The doctor availability, including dates and time slots.'),
});
export type SuggestOptimalAppointmentSlotsInput = z.infer<typeof SuggestOptimalAppointmentSlotsInputSchema>;

const SuggestOptimalAppointmentSlotsOutputSchema = z.object({
  suggestedSlots: z.array(
    z.object({
      date: z.string().describe('The suggested date for the appointment.'),
      time: z.string().describe('The suggested time for the appointment.'),
      reason: z.string().describe('The reason for suggesting this particular slot.'),
    })
  ).describe('The list of suggested appointment slots.'),
});
export type SuggestOptimalAppointmentSlotsOutput = z.infer<typeof SuggestOptimalAppointmentSlotsOutputSchema>;

export async function suggestOptimalAppointmentSlots(input: SuggestOptimalAppointmentSlotsInput): Promise<SuggestOptimalAppointmentSlotsOutput> {
  return suggestOptimalAppointmentSlotsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOptimalAppointmentSlotsPrompt',
  input: {schema: SuggestOptimalAppointmentSlotsInputSchema},
  output: {schema: SuggestOptimalAppointmentSlotsOutputSchema},
  prompt: `You are an AI assistant designed to suggest optimal appointment slots for patients based on their appointment history and doctor availability.

  Patient ID: {{{patientId}}}
  Doctor ID: {{{doctorId}}}

  Appointment History:
  {{#each appointmentHistory}}
  - Date: {{{date}}}, Time: {{{time}}}
  {{/each}}

  Doctor Availability:
  {{#each doctorAvailability}}
  - Date: {{{date}}}, Slots: {{#each slots}}{{{this}}} {{/each}}
  {{/each}}

  Consider the patient's appointment history to identify preferred days and times.  Also ensure the suggested times are within the doctor's availability.
  Suggest up to 3 optimal appointment slots, providing a reason for each suggestion.
  Ensure that all dates are in ISO 8601 format, and all times are in HH:mm format.
  Reason about the suggestions step by step.
  Do not suggest slots that are outside the doctor's specified availability.
  `,config: {
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

const suggestOptimalAppointmentSlotsFlow = ai.defineFlow(
  {
    name: 'suggestOptimalAppointmentSlotsFlow',
    inputSchema: SuggestOptimalAppointmentSlotsInputSchema,
    outputSchema: SuggestOptimalAppointmentSlotsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
