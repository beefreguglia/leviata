import NextAuth, { CredentialsSignin } from "next-auth";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { db } from "@/lib/db";
import { discordSignIn, type DiscordProfileLike } from "@/lib/discord-sync";

export const devLoginEnabled =
  process.env.AUTH_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";

const providers: Provider[] = [
  Discord({
    // sem servidor configurado, só pede a identidade (não dá para ler cargos)
    authorization: {
      params: { scope: process.env.DISCORD_GUILD_ID ? "identify guilds.members.read" : "identify" },
    },
  }),
];

if (devLoginEnabled) {
  // Login de teste: entra como um usuário já cadastrado no banco (seed), sem Discord.
  providers.push(
    Credentials({
      id: "dev",
      name: "Login de teste",
      credentials: { discordId: { label: "Discord ID" } },
      async authorize(credentials) {
        const discordId = String(credentials?.discordId ?? "");
        const user = await db.user.findUnique({ where: { discordId } });
        if (!user) throw new CredentialsSignin("usuario-inexistente");
        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return { id: user.id, name: user.username, image: user.avatarUrl };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "discord") return true;
      return discordSignIn({
        accessToken: account.access_token,
        guildId: process.env.DISCORD_GUILD_ID,
        profile: profile as DiscordProfileLike | undefined,
      });
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "discord") {
        // sem adapter, user.id aqui é o ID do Discord → troca pelo id interno
        const dbUser = await db.user.findUnique({ where: { discordId: account.providerAccountId } });
        token.uid = dbUser?.id;
      } else if (user?.id) {
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
});
