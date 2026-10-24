"use client";

import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { audiences, topics } from "../../../lib/pantanal-options";
type Reply = { id: string; nickname: string; body: string; createdAt: string; updatedAt: string };
type Post = { id: string; nickname: string; topic: string; audience: string; body: string; createdAt: string; updatedAt: string; replies: Reply[] };
type Room = { id: string; code: string; title: string; topic: string; audience: string; visibility: "public" | "secret"; createdAt: string };
type EditTarget = { type: "post" | "reply"; id: string; body: string };

export default function RoomClient({ code }: { code: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState(audiences[0]);
  const [managerKey, setManagerKey] = useState("");
  const [managerInput, setManagerInput] = useState("");
  const [showManager, setShowManager] = useState(false);
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [invite, setInvite] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [myKeys, setMyKeys] = useState<Record<string, string>>({});
  const [isAppManager, setIsAppManager] = useState(false);

  const refresh = useCallback(async (initial = false) => {
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(code)}`, { cache: "no-store" });
      const data = await response.json() as { room: Room; posts?: Post[]; isAppManager?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Sala não encontrada.");
      setRoom(data.room); setPosts(data.posts ?? []); if(initial){setTopic(data.room.topic);setAudience(data.room.audience ?? audiences[0]);} setIsAppManager(data.isAppManager === true);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível abrir a sala."); }
    finally { if (initial) setLoading(false); }
  }, [code]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNickname(localStorage.getItem("pantanal:nickname") ?? "");
    setManagerKey(localStorage.getItem(`pantanal:manager:${code}`) ?? "");
    setInvite(`${window.location.origin}/sala/${code}`);
    const prefix = `pantanal:author:${code}:`;
    const keys: Record<string,string> = {};
    for (let i=0;i<localStorage.length;i++) { const key=localStorage.key(i); if (key?.startsWith(prefix)) keys[key.slice(prefix.length)]=localStorage.getItem(key) ?? ""; }
    setMyKeys(keys);
    void refresh(true);
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 6000);
    return () => window.clearInterval(timer);
  }, [code, refresh]);

  function rememberName(value: string) { setNickname(value); localStorage.setItem("pantanal:nickname", value); }
  function rememberKey(id: string, key: string) { localStorage.setItem(`pantanal:author:${code}:${id}`, key); setMyKeys((old) => ({ ...old, [id]: key })); }
  function applyManagerKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const value=managerInput.trim(); if(!value) return;
    localStorage.setItem(`pantanal:manager:${code}`, value); setManagerKey(value); setManagerInput(""); setShowManager(false); setMessage("Chave do gerente ativada neste aparelho.");
  }
  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!nickname.trim()) { setError("Escreva como quer aparecer na sala."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(code)}/posts`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ nickname, topic, audience, body }) });
      const data = await response.json() as { post: Post; authorKey: string; error?: string }; if(!response.ok) throw new Error(data.error ?? "Não foi possível publicar.");
      rememberKey(data.post.id, data.authorKey); setBody(""); setMessage("Mensagem publicada para o grupo."); await refresh();
    } catch(cause) { setError(cause instanceof Error?cause.message:"Não foi possível publicar."); }
    finally { setSaving(false); }
  }
  async function submitReply(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault(); if (!nickname.trim()) { setError("Escreva como quer aparecer na sala."); return; }
    setSaving(true); setError("");
    try {
      const response=await fetch(`/api/rooms/${encodeURIComponent(code)}/posts/${postId}/replies`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nickname,body:replyBody})});
      const data=await response.json() as { reply: Reply; authorKey: string; error?: string };if(!response.ok)throw new Error(data.error??"Não foi possível responder.");
      rememberKey(data.reply.id,data.authorKey);setReplyBody("");setReplyFor(null);setMessage("Resposta publicada.");await refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível responder.");}
    finally{setSaving(false);}
  }
  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(!edit)return;setSaving(true);setError("");
    try{
      const path=edit.type==="post"?`/api/posts/${edit.id}`:`/api/replies/${edit.id}`;
      const response=await fetch(path,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,body:edit.body,managerKey,authorKey:myKeys[edit.id]??""})});
      const data=await response.json() as { ok?: boolean; error?: string };if(!response.ok)throw new Error(data.error??"Você não tem permissão para editar.");
      setEdit(null);setMessage("Alteração salva para todo o grupo.");await refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível editar.");}
    finally{setSaving(false);}
  }
  async function copyInvite(){try{await navigator.clipboard.writeText(invite);setMessage("Link da sala copiado.");}catch{setMessage(invite);}}

  if(loading) return <main className="room-loading"><div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>Pantanal em Voz</div><p>Abrindo a sala…</p></main>;
  if(!room) return <main className="room-loading"><div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>Pantanal em Voz</div><section className="panel not-found"><div className="eyebrow">Convite não localizado</div><h1>Essa sala não foi encontrada.</h1><p>{error}</p><Link className="button button-dark" href="/">Voltar ao início</Link></section></main>;
  return <main className="room-shell">
    <header className="topbar room-topbar"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Pantanal em Voz</span></Link><div className="room-top-actions"><button className="button button-light small" onClick={()=>setShowQr(v=>!v)}>{showQr?"Fechar convite":"Compartilhar sala ↗"}</button><Link className="top-link" href="/#salas">Outras salas</Link></div></header>
    <section className="room-heading"><Link className="back-link" href="/">← Todas as salas</Link><div className="room-heading-row"><div><span className="room-topic">Tema · {room.topic}</span><span className="room-audience-tag">Público · {room.audience}</span><h1>{room.title}</h1><p>{room.visibility==="secret"?"Sala secreta · entre quem recebeu o QR code ou link":"Sala visível · qualquer pessoa pode participar"}</p></div><span className={`visibility-tag ${room.visibility==="secret"?"secret-tag":""}`}>{room.visibility==="secret"?"⌁ Secreta":"◎ Visível"}</span></div>{showQr&&<div className="share-strip"><div className="share-qr"><QRCodeSVG value={invite} size={118} level="M" includeMargin/></div><div><strong>Convide mais pessoas</strong><p>Escaneie o QR code com a câmera do celular. A sala secreta só é acessível a quem recebe este convite.</p><button className="button button-primary small" onClick={copyInvite}>Copiar link da sala</button></div></div>}</section>

    <div className="room-columns"><section className="conversation"><div className="section-heading conversation-title"><div><div className="eyebrow">A conversa do grupo</div><h2>Mensagens e respostas</h2></div><span className="count-pill">{posts.length} {posts.length===1?"mensagem":"mensagens"}</span></div>
      {error&&<div className="error-banner" role="alert">{error}</div>}{message&&<div className="success-banner" role="status">{message}<button onClick={()=>setMessage("")}>×</button></div>}
      <form className="panel compose-form" onSubmit={submitPost}><div className="compose-head"><span className="compose-icon">✎</span><div><strong>O que você quer colocar na conversa?</strong><small>O grupo inteiro vai poder ler e responder.</small></div></div><label>Como quer aparecer?<input maxLength={36} value={nickname} onChange={e=>rememberName(e.target.value)} placeholder="Seu nome ou apelido" required/></label><div className="compose-selects"><label>Tema<select value={topic} onChange={e=>setTopic(e.target.value)}>{topics.map(item=><option key={item}>{item}</option>)}</select></label><label>Para quem é esta mensagem?<select value={audience} onChange={e=>setAudience(e.target.value)}>{audiences.map(item=><option key={item}>{item}</option>)}</select></label></div><label>Mensagem<textarea maxLength={1400} rows={4} value={body} onChange={e=>setBody(e.target.value)} placeholder="Conte sua ideia, experiência ou pergunta. O que você gostaria que outras pessoas entendessem?" required/></label><div className="compose-bottom"><span>{body.length}/1400 · respeito e curiosidade ajudam a conversa.</span><button className="button button-dark" disabled={saving}>{saving?"Enviando…":"Publicar para o grupo ↗"}</button></div></form>
      <div className="feed-list">{posts.length?posts.map(post=><article className="post-card" key={post.id}><div className="post-meta"><span className="avatar">{post.nickname.trim().slice(0,1).toUpperCase()}</span><div><strong>{post.nickname}</strong><small>{post.createdAt?new Date(post.createdAt.replace(" ","T")+"Z").toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):"Agora"}{post.updatedAt&&post.updatedAt!==post.createdAt?" · editada":""}</small></div><div className="post-tags"><span>{post.topic}</span><span>Para {post.audience}</span></div>{(isAppManager||managerKey||myKeys[post.id])&&<button className="edit-button" onClick={()=>setEdit({type:"post",id:post.id,body:post.body})}>Editar</button>}</div><p className="post-body">{post.body}</p><div className="post-footer"><span>{post.replies.length} {post.replies.length===1?"resposta":"respostas"}</span><button className="reply-toggle" onClick={()=>{setReplyFor(replyFor===post.id?null:post.id);setReplyBody("")}}>Responder ↩</button></div>{post.replies.length>0&&<div className="replies">{post.replies.map(reply=><div className="reply-card" key={reply.id}><span className="reply-line"/><div className="reply-content"><div className="reply-author"><strong>{reply.nickname}</strong><small>{reply.createdAt?new Date(reply.createdAt.replace(" ","T")+"Z").toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):"Agora"}{reply.updatedAt&&reply.updatedAt!==reply.createdAt?" · editada":""}</small>{(isAppManager||managerKey||myKeys[reply.id])&&<button className="edit-button" onClick={()=>setEdit({type:"reply",id:reply.id,body:reply.body})}>Editar</button>}</div><p>{reply.body}</p></div></div>)}</div>}{replyFor===post.id&&<form className="reply-form" onSubmit={e=>submitReply(e,post.id)}><input maxLength={900} value={replyBody} onChange={e=>setReplyBody(e.target.value)} placeholder="Escreva uma resposta para o grupo…" required/><button className="button button-light small" disabled={saving}>Responder</button></form>}</article>):<div className="empty-rooms feed-empty"><div className="empty-icon">〰</div><strong>A conversa começa com você.</strong><span>Compartilhe uma pergunta, uma experiência ou uma ideia sobre {room.topic.toLowerCase()}.</span></div>}</div>
    </section>

    <aside className="room-aside"><section className="panel room-info"><div className="eyebrow">Espaço do grupo</div><h3>Como esta sala funciona</h3><ul><li>As mensagens ficam salvas e aparecem para todo mundo.</li><li>As respostas ajudam a construir a conversa.</li><li>O autor pode editar a própria mensagem neste aparelho.</li><li>Gerentes da sala e do app podem editar contribuições.</li></ul><div className="refresh-note"><span className="online-dot"/> Atualiza para o grupo a cada poucos segundos</div></section><section className="panel manager-panel"><div className="manager-emblem">⚙</div><h3>Gerência</h3><p>A pessoa que criou a sala pode usar a chave da sala. O gerente do app entra com sua conta ChatGPT para editar em qualquer sala.</p>{isAppManager&&<div className="manager-active"><span className="online-dot"/> Gerente do app autenticado</div>}{managerKey&&<div className="manager-active"><span className="online-dot"/> Chave desta sala ativada <button onClick={()=>{localStorage.removeItem(`pantanal:manager:${code}`);setManagerKey("");setMessage("Chave removida deste aparelho.")}}>Sair</button></div>}{showManager&&!managerKey&&<form className="manager-form" onSubmit={applyManagerKey}><input value={managerInput} onChange={e=>setManagerInput(e.target.value)} placeholder="Cole a chave desta sala" required/><button className="button button-primary small">Ativar chave</button></form>}{!managerKey&&!showManager&&<button className="button button-outline full" onClick={()=>setShowManager(true)}>Ativar chave desta sala</button>}<Link className="manager-login" href={`/gerenciar?return_to=${encodeURIComponent(`/sala/${code}`)}`}>Entrar como gerente do app ↗</Link></section><section className="share-small"><span>〰</span><strong>Convide outras vozes</strong><p>Um QR code abre esta mesma sala em qualquer celular.</p><button className="text-link" onClick={()=>setShowQr(true)}>Mostrar QR code ↗</button></section></aside></div>

    {edit&&<div className="modal-backdrop" role="presentation"><form className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title" onSubmit={saveEdit}><button type="button" className="modal-close" onClick={()=>setEdit(null)} aria-label="Fechar">×</button><div className="eyebrow">Editar contribuição</div><h2 id="edit-title">Ajuste sua mensagem</h2><p>A alteração será atualizada para todas as pessoas da sala.</p><textarea value={edit.body} maxLength={1400} rows={6} onChange={e=>setEdit({...edit,body:e.target.value})}/>{error&&<p className="error-text">{error}</p>}<div className="modal-actions"><button type="button" className="button button-light" onClick={()=>setEdit(null)}>Cancelar</button><button className="button button-dark" disabled={saving}>{saving?"Salvando…":"Salvar edição"}</button></div></form></div>}
    <footer className="footer"><Link href="/">Pantanal em Voz</Link><span>Sala {room.visibility==="secret"?"secreta":"visível"} · conversa coletiva sobre o território</span><span>Autores: Ernandes · Beatriz Ferraz Bühler · Maísa Consuelo dos Santos · Juliana Cássia de Marchi · Elaine · Basirat</span></footer>
  </main>;
}
