import { AuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import prisma from "@/libs/prismadb";

export const authOptions: AuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_SECRET as string,
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }),
        AppleProvider({
            clientId: process.env.APPLE_ID as string,
            clientSecret: process.env.APPLE_SECRET as string,
        }),
        {
            id: "dossier-facile",
            name: "DossierFacile",
            type: "oauth",
            authorization: {
                url: "https://sso-preprod.dossierfacile.fr/auth/realms/dossier-facile/protocol/openid-connect/auth",
                params: { scope: "openid profile email" },
            },
            token: "https://sso-preprod.dossierfacile.fr/auth/realms/dossier-facile/protocol/openid-connect/token",
            userinfo: "https://sso-preprod.dossierfacile.fr/auth/realms/dossier-facile/protocol/openid-connect/userinfo",
            clientId: process.env.DOSSIER_FACILE_CLIENT_ID,
            clientSecret: process.env.DOSSIER_FACILE_CLIENT_SECRET,
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.given_name + " " + profile.family_name,
                    email: profile.email,
                    image: null,
                };
            },
        },
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "email", type: "text" },
                password: { label: "password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email,
                    },
                });

                if (!user || !user.hashedPassword) {
                    throw new Error("Invalid credentials");
                }

                const isCorrectPassword = await bcrypt.compare(
                    credentials.password,
                    user.hashedPassword
                );

                if (!isCorrectPassword) {
                    throw new Error("Invalid credentials");
                }

                return user;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
                // Strip large fields to avoid Header Overflow (431) but keep other claims
                delete (token as any).name;
                delete (token as any).email;
                delete (token as any).picture;
                delete (token as any).image;
                return token;
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user && token?.sub) {
                session.user.id = token.sub as string;

                // Fetch fresh user data from DB to avoid bloat in cookie
                const freshUser = await prisma.user.findUnique({
                    where: { id: token.sub as string }
                });

                if (freshUser) {
                    session.user.name = freshUser.name;
                    session.user.email = freshUser.email;
                    session.user.image = freshUser.image;
                }
            }
            return session;
        }
    },
    pages: {
        signIn: "/",
    },
    debug: process.env.NODE_ENV === "development",
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
