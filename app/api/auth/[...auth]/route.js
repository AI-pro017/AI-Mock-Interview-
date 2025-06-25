import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/utils/db"
import { users, accounts, sessions, verificationTokens } from "@/utils/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { CredentialsSignin } from "@auth/core/errors"

export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          experienceLevel: null,
          targetRoles: null,
          resumeUrl: null,
          timezone: null,
        }
      },
    }),
    Credentials({
      async authorize(credentials) {
        if (!credentials.email || !credentials.password) {
          return null;
        }

        const userResult = await db.select().from(users).where(eq(users.email, credentials.email)).limit(1);
        const user = userResult[0];

        if (!user || !user.passwordHash) {
          return null;
        }

        // Final security gate: never log in a user with an unverified email.
        if (!user.emailVerified) {
          return null;
        }
        
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return user;
      }
    })
  ],
  callbacks: {
    // This callback runs when a JWT is created or updated.
    async jwt({ token, user }) {
      if (user) {
        // On sign-in, add all our custom fields to the token.
        token.id = user.id;
        token.experienceLevel = user.experienceLevel;
        token.targetRoles = user.targetRoles;
        token.resumeUrl = user.resumeUrl;
        token.timezone = user.timezone;
      }
      return token;
    },
    // This callback runs when a session is checked.
    async session({ session, token }) {
      if (token && session.user) {
        // Add the custom fields from the token to the session object.
        session.user.id = token.id;
        session.user.experienceLevel = token.experienceLevel;
        session.user.targetRoles = token.targetRoles;
        session.user.resumeUrl = token.resumeUrl;
        session.user.timezone = token.timezone;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/sign-in',
  },
}) 