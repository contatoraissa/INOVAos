import { createFileRoute, Link } from "@tanstack/react-router";
import { getAccountSession, signOutAccount } from "@/lib/account-session";
import { Logo } from "@/components/inova/Logo";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/minha-conta")({
  loader: () => getAccountSession(),
  component: Account,
});
function Account() {
  const account = Route.useLoaderData();
  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <section className="mx-auto max-w-2xl rounded-2xl border bg-white p-8">
        <Logo />
        <h1 className="mt-8 font-display text-3xl font-semibold">
          {account ? `Olá, ${account.full_name}` : "Entre na sua conta"}
        </h1>
        {account ? (
          <>
            <p className="mt-3 text-muted-foreground">{account.email}</p>
            <div className="mt-6 rounded-xl bg-brand-soft p-5">
              <h2 className="font-semibold">
                {account.account_type === "doctor" ? "Sua conta médica" : "Sua conta gratuita"}
              </h2>
              <p className="mt-2 text-sm">
                {account.account_type === "doctor"
                  ? `Assinatura: ${account.subscription ?? "pendente"}. Verificação profissional: ${account.professional_status === "verified" ? "verificada" : "pendente"}. A contratação ainda não está disponível.`
                  : "Cadastro confirmado. Seus dados são separados do perfil fictício da demonstração."}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Seu cadastro está salvo. Os módulos de atendimento da conta real ainda estão sendo
                conectados; a demonstração utiliza dados fictícios.
              </p>
            </div>
            {account.canPreview && (
              <div className="mt-5 rounded-xl border border-brand/20 p-5">
                <h2 className="font-semibold">Seu acesso de avaliação está liberado</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Abra seu painel próprio e cadastre seus pacientes após preparar a base no
                  Supabase. Nenhum registro demonstrativo será exibido. Esta autorização não ativa
                  cobrança nem verifica seu CRM.
                </p>
                <Button asChild className="mt-4">
                  <Link to="/dashboard">Entrar no espaço médico</Link>
                </Button>
              </div>
            )}
            {account.account_type === "patient" && (
              <Button asChild className="mt-5">
                <Link to="/portal-paciente">Entrar no meu espaço de cuidado</Link>
              </Button>
            )}
            <Button
              className="mt-6"
              onClick={async () => {
                await signOutAccount();
                window.location.assign("/acesso");
              }}
            >
              Sair da conta
            </Button>
          </>
        ) : (
          <Link to="/acesso" className="mt-6 inline-block text-brand-deep">
            Ir para o login
          </Link>
        )}
      </section>
    </main>
  );
}
