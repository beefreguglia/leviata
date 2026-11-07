import { redirect } from "next/navigation";
import { devLoginEnabled, signIn } from "@/auth";
import { getViewer } from "@/lib/session";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { LeviataMark } from "@/components/layout/logo";
import { FadeIn } from "@/components/motion";

export const metadata = { title: "Entrar" };

const ERRORS: Record<string, string> = {
  "fora-do-servidor": "Você precisa estar no servidor do Discord da Leviata para entrar.",
  config: "Login com Discord ainda não configurado (faltam variáveis no .env).",
  CredentialsSignin: "Usuário de teste não encontrado.",
  AccessDenied: "Acesso negado.",
};

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.3 18.3 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.7.1 18.2a19.9 19.9 0 0 0 6 3l1.3-2.1a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.9-9.8-3.6-13.8ZM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // checa no banco (não só o cookie): sessão de usuário apagado não pode causar loop de redirect
  const viewer = await getViewer();
  if (viewer) redirect("/dashboard");

  const { erro, error } = await searchParams;
  const errKey = (typeof erro === "string" ? erro : undefined) ?? (typeof error === "string" ? error : undefined);
  const errMsg = errKey ? (ERRORS[errKey] ?? "Não foi possível entrar. Tente de novo.") : null;

  const devUsers = devLoginEnabled
    ? await db.user.findMany({
        include: { member: { include: { rank: true } } },
        orderBy: { member: { rank: { order: "asc" } } },
        take: 10,
      })
    : [];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 0%, color-mix(in oklch, var(--primary) 14%, transparent), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-20 items-center justify-center rounded-card bg-card shadow-[0_0_60px_-10px_var(--primary)]">
            <LeviataMark className="size-12 text-primary" />
          </span>
          <h1 className="mt-5 text-[2rem] font-bold leading-shorter">Leviata</h1>
          <p className="mt-1 text-base text-muted-foreground">Cidade dos Anjos · Painel interno</p>
        </div>

        <FadeIn className="rounded-card bg-card p-6">
          {errMsg && (
            <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errMsg}
            </p>
          )}
          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo: "/dashboard" });
            }}
          >
            <Button type="submit" size="lg" className="h-12 w-full gap-2 rounded-md text-base font-semibold">
              <DiscordIcon />
              Entrar com Discord
            </Button>
          </form>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Só membros do servidor da Leviata têm acesso.
          </p>

          {devLoginEnabled && (
            <div className="mt-6 border-t pt-4">
              <p className="mb-3 text-sm font-bold text-warning">Login de teste (só em desenvolvimento)</p>
              {devUsers.length === 0 && (
                <p className="text-xs text-muted-foreground">Rode <code>npm run db:seed</code> para criar usuários de teste.</p>
              )}
              <div className="flex flex-col gap-1.5">
                {devUsers.map((u) => (
                  <form
                    key={u.id}
                    action={async () => {
                      "use server";
                      await signIn("dev", { discordId: u.discordId, redirectTo: "/dashboard" });
                    }}
                  >
                    <Button type="submit" variant="secondary" className="h-11 w-full justify-between rounded-md">
                      <span>{u.member?.rpName ?? u.username}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="size-1.5 rounded-full" style={{ background: u.member?.rank?.color ?? "gray" }} />
                        {u.member?.rank?.name ?? "sem ficha"}
                      </span>
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </FadeIn>
      </div>
    </main>
  );
}
