// Today's consultation slots. Booking + triage now live in the backend
// (see app/api/appointments/route.ts); this list drives the student UI picker.

/** Consultation slots. The first two are reserved for High urgency. */
export const SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
];

export const PRIORITY_SLOTS = SLOTS.slice(0, 2); // 09:00, 09:30
