import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "../../prisma/config"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          console.log("[AUTH] Login attempt:", credentials?.email)
          const { email, password } = credentialsSchema.parse(credentials)
          
          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user) {
            console.log("[AUTH] User not found:", email)
            return null
          }

          console.log("[AUTH] User found:", user.id)
          const isValid = await bcrypt.compare(password, user.password)
          
          if (!isValid) {
            console.log("[AUTH] Invalid password")
            return null
          }

          console.log("[AUTH] Login successful:", user.id)
          return {
            id: user.id,
            email: user.email,
          }
        } catch (error) {
          console.error("[AUTH] Error:", error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 giorni
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id
      }
      return token
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
