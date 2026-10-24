import { env } from "cloudflare:workers";
import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function ManagerPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const params = await searchParams;
  const returnTo = params.return_to?.startsWith("/sala/") ? params.return_to : "/";
  const user = await getChatGPTUser();
  if (!user) {
    const signIn = chatGPTSignInPath(`/gerenciar?return_to=${returnTo}`);
    return <main className="room-loading"><section className="panel manager-gate"><div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>Pantanal em Voz</div><div className="eyebrow">Acesso de gerente</div><h1>Entre com sua conta ChatGPT.</h1><p>O gerente do app pode editar mensagens em qualquer sala. As demais pessoas continuam entrando pelo QR code sem cadastro.</p><a className="button button-dark" href={signIn} target="_top">Entrar como gerente ↗</a></section></main>;
  }
  const allowed = user.userId === env.APP_MANAGER_USER_ID;
  return <main className="room-loading"><section className="panel manager-gate"><div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>Pantanal em Voz</div><div className="eyebrow">Acesso de gerente</div><h1>{allowed ? "Gerência do app ativa." : "Esta conta não gerencia o app."}</h1><p>{allowed ? "Você pode editar contribuições em todas as salas. Abra uma sala e use o botão Editar em qualquer mensagem ou resposta." : "Entre com a conta responsável pela administração do Pantanal em Voz."}</p><a className="button button-dark" href={returnTo}>Continuar →</a></section></main>;
}
