import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { LeviataMark } from "@/components/layout/logo";

export const metadata = { title: "Sem acesso" };

export default function SemAcessoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <LeviataMark className="mx-auto size-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua conta ainda não tem uma patente com acesso a esta área. Fale com a liderança da Leviata para liberar seu
          cargo no Discord.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="ghost">Sair</Button>
          </form>
        </div>
      </div>
    </main>
  );
}
