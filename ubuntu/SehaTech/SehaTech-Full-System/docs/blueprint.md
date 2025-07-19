# **App Name**: SehaTech

## Core Features:

- User Authentication: User authentication and authorization with different roles (admin, branchManager, doctor, staff, patient) using Firebase Authentication, managed via custom claims.
- Doctor Schedules: Display doctor schedules and availability, pulled dynamically from Firestore.
- Doctor Search and Filter: Enable users to search and filter doctors by specialty and availability.
- Appointment management: Manage appointments, with consideration of free follow-ups as determined from historical appointment data, and based on the consultation period defined by the doctor.
- Appointment Status: Visual representation of appointment statuses (scheduled, waiting, completed, follow-up) using distinct colors.
- Offline Mode: Implement offline mode and data synchronization using Firestore's offline capabilities. Appointments created offline are synced once the connection is restored.
- Smart Appointment Suggestions: Integrate a tool that uses appointment history and doctor availability to suggest optimal appointment slots to patients.

## Style Guidelines:

- Primary color: Deep teal (#008080) to convey trust and health.
- Background color: Very light teal (#F0F8FF) for a clean, calming background.
- Accent color: Blue-green (#468499) to complement the primary, providing a contrasting highlight.
- Body and headline font: 'PT Sans', a modern sans-serif, providing clarity and legibility across all devices and user roles.
- Use clear, minimalist icons for navigation and status indicators.
- A clean, tab-based layout, for ease of navigation.
- Subtle transitions and animations to confirm user interactions and provide visual feedback, without distracting from the app’s core functionality.