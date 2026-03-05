import NextAuth from "next-auth";
import { authOptions } from "@/libs/auth";

// next-auth v4.24.13 already handles `await context.params` internally
// (NextAuthRouteHandler does `await context.params` before extracting nextauth segments)
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
