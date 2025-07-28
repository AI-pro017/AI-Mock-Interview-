import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/utils/db"
import { users, accounts, sessions, verificationTokens } from "@/utils/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: new Date(), // Set emailVerified for new Google users
          disabled: false, // Set disabled = false by default
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
        
        // Check if user is disabled
        if (user.disabled) {
          console.log(`❌ Disabled user attempted credentials sign-in: ${user.email}`);
          return null; // Don't allow disabled users to sign in
        }
        
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
    async signIn({ user, account, profile, isNewUser }) {
      // For all sign-ins (including Google), check if user is disabled
      if (user?.email) {
        try {
          const existingUser = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
          
          if (existingUser[0] && existingUser[0].disabled) {
            console.log(`❌ Disabled user attempted sign-in via ${account?.provider}: ${user.email}`);
            return false; // Prevent sign-in for disabled users
          }
          
          // Update emailVerified for Google users if it's null
          if (account?.provider === 'google' && existingUser[0] && !existingUser[0].emailVerified) {
            await db.update(users)
              .set({ 
                emailVerified: new Date(),
                name: user.name || existingUser[0].name,
                image: user.image || existingUser[0].image
              })
              .where(eq(users.email, user.email));
            
            console.log(`✅ Updated emailVerified for Google user: ${user.email}`);
          }
        } catch (error) {
          console.error('Error checking user status during sign-in:', error);
          return false; // Be safe and deny access if we can't check status
        }
      }
      
      return true;
    },
    async jwt({ token, user, trigger }) {
      // When user data is available (initial sign-in), add it to token
      if (user) {
        token.id = user.id;
        token.experienceLevel = user.experienceLevel;
        token.targetRoles = user.targetRoles;
        token.resumeUrl = user.resumeUrl;
        token.timezone = user.timezone;
        token.disabled = user.disabled;
      }
      
      // For subsequent requests, check if user is still active
      if (token?.id && !user) {
        try {
          const userResult = await db.select().from(users).where(eq(users.id, token.id)).limit(1);
          const currentUser = userResult[0];
          
          if (currentUser?.disabled) {
            console.log(`❌ User ${token.email} has been disabled, invalidating token`);
            // Return empty token to invalidate session
            return {};
          }
          
          // Update token with latest user data
          token.disabled = currentUser?.disabled;
          token.experienceLevel = currentUser?.experienceLevel;
          token.targetRoles = currentUser?.targetRoles;
          token.resumeUrl = currentUser?.resumeUrl;
          token.timezone = currentUser?.timezone;
        } catch (error) {
          console.error('Error checking user status in JWT callback:', error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Check if token is empty (user was disabled)
        if (!token.id) {
          return null; // Invalidate session
        }
        
        session.user.id = token.id;
        session.user.experienceLevel = token.experienceLevel;
        session.user.targetRoles = token.targetRoles;
        session.user.resumeUrl = token.resumeUrl;
        session.user.timezone = token.timezone;
        session.user.disabled = token.disabled;
        
        // Additional check for disabled users
        if (token.disabled) {
          console.log(`❌ Disabled user attempting to use session: ${session.user.email}`);
          return null; // Invalidate session for disabled users
        }
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      console.log(`🎉 New user created: ${user.email} (disabled: ${user.disabled})`);
    },
    async signIn({ user, account, isNewUser }) {
      if (account?.provider === 'google') {
        console.log(`🔐 Google sign-in: ${user.email}, isNewUser: ${isNewUser}`);
      } else if (account?.provider === 'credentials') {
        console.log(`🔐 Credentials sign-in: ${user.email}`);
      }
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/sign-in',
  },
}) 