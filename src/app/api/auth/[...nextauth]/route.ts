import { handlers } from "@/lib/auth";

// NextAuth v5 returns { handlers: { GET, POST } }. Re-export both.
export const { GET, POST } = handlers;
