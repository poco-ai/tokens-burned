import { z } from "zod";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "@/lib/auth-username";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Please enter a valid email address.");

const passwordSchema = z
  .string()
  .min(1, "Password is required.")
  .max(128, "Password is too long.");

export const usernameSchema = z
  .string()
  .trim()
  .min(1, "Username is required.")
  .min(
    USERNAME_MIN_LENGTH,
    `Username must be at least ${USERNAME_MIN_LENGTH} characters.`,
  )
  .max(
    USERNAME_MAX_LENGTH,
    `Username must be at most ${USERNAME_MAX_LENGTH} characters.`,
  )
  .regex(
    USERNAME_PATTERN,
    "Username may only contain letters, numbers, underscores, and periods.",
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema.min(8, "Password must be at least 8 characters."),
});

export const registerSchema = z.object({
  username: usernameSchema,
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(50, "Name is too long."),
  email: emailSchema,
  password: passwordSchema.min(8, "Password must be at least 8 characters."),
});
