import {z} from "zod"
export const userSchema = z.object({
  username: z.string(),
  password: z
    .string()
    .min(6, { message: "Password should have minimum length of 8" })
    .max(15, "Password is too long"),
});

export const projectSchema = z.object({
  name:z.string(),
  gitURL:z.string()
})

