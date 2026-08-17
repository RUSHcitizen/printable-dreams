// Shared visual classes for anything that should look like a button —
// Button.astro (links + disabled placeholders) and SubmitButton.astro
// (real <button type="submit"> for forms). One definition so a link-style
// CTA and a form's submit button are never visually inconsistent.
export const buttonBase =
  "inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold transition-colors";

export const buttonVariants = {
  primary: "bg-brand-700 text-white hover:bg-brand-800",
  secondary: "border border-brand-700 text-brand-700 hover:bg-brand-50",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
