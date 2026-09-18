import {z} from "zod"
export const userSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username should have minimum length of 3" })
    .max(30, "Username is too long"),
  password: z
    .string()
    .min(6, { message: "Password should have minimum length of 6" })
    .max(72, "Password is too long"),
});

// Only public https GitHub repos are supported. Allowlisting github.com
// (instead of a loose "any git URL" regex) keeps file:/ssh: schemes and
// internal-host URLs (SSRF) out of the build containers.
const githubRepoRegex = /^https:\/\/github\.com\/[^/]+\/[^/]+\/?(\.git)?\/?$/;

export const projectSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Project name is required" })
    .max(50, "Project name is too long"),
  gitURL: z
    .string()
    .url({ message: "Git URL must be a valid URL" })
    .regex(githubRepoRegex, {
      message: "Git URL must be a public GitHub repository, e.g. https://github.com/user/repo",
    }),
})
