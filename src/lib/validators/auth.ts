import { z } from "zod";

/*
 * Strong-but-not-annoying password policy.
 * - 8+ chars (NIST recommendation; length matters more than complexity)
 * - At least one letter and one number — catches "12345678" and "password"
 *   without forcing users into "Tr0ub4dor&3" theatre.
 * - Max length prevents DoS via bcrypt being asked to hash a 10MB string.
 */
const passwordSchema = z
  .string()
  .min(8, "Must be at least 8 characters")
  .max(72, "Must be 72 characters or fewer") // bcrypt's actual limit
  .regex(/[a-zA-Z]/, "Must contain a letter")
  .regex(/\d/, "Must contain a number");

export const SignUpSchema = z.object({
  name: z.string().trim().min(1, "Required").max(60),
  email: z.string().trim().toLowerCase().email("Invalid email").max(254),
  password: passwordSchema,
  // Slug — validated against the same rules as profile.slug. Required at
  // signup so users own their URL identity from day one rather than getting
  // an ugly auto-generated one.
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "At least 3 characters")
    .max(30, "At most 30 characters")
    .regex(
      /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,28}[a-z0-9]$/,
      "Use lowercase letters, digits, and single hyphens",
    ),
});

export const SignInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  // Just non-empty here; the auth check runs against the bcrypt hash.
  // Don't re-apply the password rules — would lock out legitimate users
  // whose old password predates a policy change.
  password: z.string().min(1, "Required"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type SignInInput = z.infer<typeof SignInSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
