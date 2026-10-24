"use client";

import { QRCodeSVG } from "qrcode.react";
import { FormEvent, useEffect, useState } from "react";

const topics = ["Água", "Fogo e queimadas", "Agrotóxicos", "Hormônios na água", "Cheias e secas", "Bichos e plantas", "Pecuária e campo", "Lixo e esgoto"];
type Room = { id: string; code: string; title: string; topic: string; visibility: "public" | "secret"; createdAt?: string };
type Created = { room: Room; managerKey: string };

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState(topics[0]);
  const [visibility, setVisibility] = useState<"public" | "secret">("public");
  const [code, setCode] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function loadRooms() {
    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setRooms(data.rooms ?? []);
      else setError(data.error ?? "Não foi possível carregar as salas.");
    } catch { setError("Não foi possível conectar ao mural de salas."); }
  }
  useEffect(() => { void loadRooms(); }, []);

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, topic, visibility }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível criar a sala.");
      localStorage.setItem(`pantanal:manager:${data.room.code}`, data.managerKey);
      setCreated(data); await loadRooms();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível criar a sala."); }
    finally { setBusy(false); }
  }
  function enterRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const value = code.trim(); if (value) window.location.href = `/sala/${encodeURIComponent(value)}`;
  }
  const invite = created && typeof window !== "undefined" ? `${window.location.origin}/sala/${created.room.code}` : "";
  async function copyInvite() {
    if (!invite) return;
    await navigator.clipboard.writeText(invite); setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  return <main className="page-shell">
    <header className="topbar"><a className="brand" href="/"><span className="brand-icon">✳</span><span>Pantanal em Voz</span></a><div className="home-actions"><a className="top-link" href="/gerenciar">Gerente do app</a><a className="top-link" href="#salas">Salas abertas <span>↓</span></a></div></header>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow">Conhecimento que vira conversa</div><h1>Uma sala.<br/>Muitas vozes<br/><em>sobre o Pantanal.</em></h1><p>Crie um espaço para conversar sobre água, fogo, produção, saúde e vida no Pantanal. Convide o grupo por QR code e construa ideias em conjunto.</p><div className="hero-actions"><a className="button button-dark" href="#criar">Criar uma sala <span>↗</span></a><a className="text-link" href="#salas">Encontrar sala visível</a></div><div className="hero-note"><span className="online-dot"/> Funciona no celular · sem cadastro</div></div>
      <div className="hero-art"><svg viewBox="0 0 620 420" role="img" aria-label="Paisagem estilizada de água e campos do Pantanal"><rect width="620" height="420" rx="26" fill="#dce9db"/><circle cx="485" cy="93" r="47" fill="#e8bc5c"/><path d="M0 212Q100 186 200 212t210 0t210-2v210H0Z" fill="#9db58f"/><path d="M0 256q92-34 184 0t184 0t252-2v166H0Z" fill="#527d66"/><path d="M0 302q112-29 221 0t206-2t193 2v120H0Z" fill="#3f766f"/><path d="M0 343q104-27 208 0t208 0t204 3v76H0Z" fill="#bed8cd"/><path d="M0 382q110-20 220 0t210 0t190 1v39H0Z" fill="#edf1e4"/><g fill="#294d43"><path d="M83 219h9v74h-9z"/><path d="M65 238q22-41 44 0-22 15-44 0z"/><path d="M538 219h8v69h-8z"/><path d="M522 237q20-38 40 0-20 14-40 0z"/><path d="M180 238h7v53h-7z"/><path d="M167 249q17-31 34 0-17 12-34 0z"/></g><g fill="none" stroke="#fffefa" strokeWidth="4" opacity=".8"><path d="M277 324q27-20 54 0t54 0t54 0"/><path d="M320 354q28-18 55 0t55 0"/></g><g fill="#fffefa"><circle cx="300" cy="164" r="4"/><circle cx="324" cy="154" r="3"/><circle cx="344" cy="168" r="4"/></g></svg><div className="art-caption">Água · vida · território · futuro</div><div className="art-stamp">✳<br/><small>conversa<br/>que conecta</small></div></div>
    </section>

    <section className="how-grid" aria-label="Como funciona"><div><span className="step-no">01</span><strong>Escolha o tema</strong><p>Água, queimadas, agrotóxicos, cheias e muito mais.</p></div><div><span className="step-no">02</span><strong>Abra uma sala</strong><p>Visível na lista ou secreta, compartilhada por QR code.</p></div><div><span className="step-no">03</span><strong>Converse em grupo</strong><p>Todo mundo lê, responde e ajuda a mensagem a crescer.</p></div></section>

    <section className="section" id="criar"><div className="section-heading"><div><div className="eyebrow">Comece pelo seu grupo</div><h2>Criar uma sala</h2><p>Dê um nome à conversa e escolha como as pessoas vão encontrá-la.</p></div><div className="topic-cloud">{topics.slice(0,5).map((item)=><span key={item}>{item}</span>)}</div></div>
      <div className="create-layout"><form className="panel create-form" onSubmit={createRoom}><label>Nome da sala<input required minLength={3} maxLength={72} placeholder="Ex.: Água do nosso bairro" value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Tema principal<select value={topic} onChange={e=>setTopic(e.target.value)}>{topics.map(item=><option key={item}>{item}</option>)}</select></label><fieldset><legend>Quem pode encontrar a sala?</legend><label className={`visibility-choice ${visibility==="public"?"selected":""}`}><input type="radio" name="visibility" checked={visibility==="public"} onChange={()=>setVisibility("public")}/><span><strong>Visível</strong><small>Aparece na lista de salas. Qualquer pessoa pode entrar.</small></span><span className="choice-icon">◎</span></label><label className={`visibility-choice ${visibility==="secret"?"selected":""}`}><input type="radio" name="visibility" checked={visibility==="secret"} onChange={()=>setVisibility("secret")}/><span><strong>Secreta</strong><small>Não aparece na lista. Entra quem tiver o link ou QR code.</small></span><span className="choice-icon">⌁</span></label></fieldset>{error&&<p className="error-text" role="alert">{error}</p>}<button className="button button-dark full" disabled={busy}>{busy?"Criando sala…":"Criar sala e gerar QR code ↗"}</button></form>
        <aside className="panel join-panel"><span className="join-icon">⌕</span><h3>Já tem um convite?</h3><p>Escaneie o QR code com a câmera do celular ou digite aqui o código recebido.</p><form onSubmit={enterRoom}><label className="sr-only" htmlFor="room-code">Código da sala</label><input id="room-code" placeholder="Cole o código da sala" value={code} onChange={e=>setCode(e.target.value)}/><button className="button button-light full">Entrar na sala →</button></form><div className="privacy-note">As salas secretas não aparecem nesta página.</div></aside></div>
    </section>

    <section className="section rooms-section" id="salas"><div className="section-heading"><div><div className="eyebrow">Converse com outras pessoas</div><h2>Salas visíveis</h2><p>Entre em uma conversa aberta ou crie uma sala para o seu grupo.</p></div><span className="count-pill">{rooms.length} {rooms.length===1?"sala":"salas"}</span></div>{rooms.length?<div className="room-grid">{rooms.map(room=><a className="room-card" key={room.id} href={`/sala/${room.code}`}><div className="room-card-top"><span className="room-symbol">✳</span><span className="visibility-tag">Visível</span></div><span className="room-topic">{room.topic}</span><h3>{room.title}</h3><span className="room-open">Entrar na conversa <b>↗</b></span></a>)}</div>:<div className="empty-rooms"><div className="empty-icon">⌁</div><strong>Ainda não há salas visíveis.</strong><span>Crie a primeira conversa e convide seu grupo.</span><a href="#criar">Criar sala ↗</a></div>}</section>

    {created&&<div className="modal-backdrop" role="presentation"><section className="created-modal" role="dialog" aria-modal="true" aria-labelledby="created-title"><button className="modal-close" onClick={()=>setCreated(null)} aria-label="Fechar">×</button><div className="eyebrow">Sala criada</div><h2 id="created-title">Convide o grupo para entrar</h2><p>Mostre este QR code ou envie o link. A sala {created.room.visibility==="secret"?"é secreta e não aparece na lista pública.":"está visível na lista de salas."}</p><div className="qr-wrap"><QRCodeSVG value={invite} size={190} level="M" includeMargin/></div><div className="invite-url">{invite}</div><button className="button button-light full" onClick={copyInvite}>{copied?"Link copiado ✓":"Copiar link de convite"}</button><div className="manager-key"><strong>Chave do gerente</strong><p>Guarde esta chave. Ela permite editar qualquer mensagem desta sala.</p><code>{created.managerKey}</code><button className="copy-key" onClick={()=>navigator.clipboard.writeText(created.managerKey)}>Copiar chave</button></div><a className="button button-dark full" href={`/sala/${created.room.code}`}>Abrir a sala →</a></section></div>}

    <footer className="footer"><span>Pantanal em Voz</span><span>Uma conversa coletiva sobre o território.</span><span>Autores: Ernandes · Beatriz Ferraz Bühler · Maísa Consuelo dos Santos · Juliana Cássia de Marchi · Elaine · Basirat</span></footer>
  </main>;
}
