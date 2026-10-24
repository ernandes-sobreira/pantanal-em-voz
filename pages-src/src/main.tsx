import React, { FormEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import { audiences, topics } from "../../lib/pantanal-options";
import "./style.css";

const API = "https://pantanal-em-voz.ernandes-sobreira.chatgpt.site/api";
const ADMIN_ORIGIN = "https://pantanal-em-voz.ernandes-sobreira.chatgpt.site";
type Reply = { id: string; nickname: string; body: string; createdAt: string; updatedAt: string };
type Post = { id: string; nickname: string; topic: string; audience: string; body: string; createdAt: string; updatedAt: string; replies: Reply[] };
type Room = { id: string; code: string; title: string; topic: string; audience: string; visibility: "public" | "secret"; createdAt?: string };
type CreatedRoom = { room: Room; managerKey: string };

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Não foi possível concluir a ação.");
  return data;
}

function getRoomCode() {
  const match = window.location.hash.match(/^#\/sala\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function publicRoomUrl(code: string) {
  return `${window.location.origin}${window.location.pathname}#/sala/${encodeURIComponent(code)}`;
}

function Wheel({ title, options, result, rotation, onSpin, disabled }: {
  title: string; options: string[]; result: string; rotation: number; onSpin: () => void; disabled: boolean;
}) {
  const colors = ["#2a78d6", "#e7f1fc", "#0a6b62", "#dcf3ee", "#eda100", "#f9edd9", "#eb6834", "#eef1f5"];
  const step = 360 / options.length;
  const background = `conic-gradient(from -90deg, ${options.map((_, i) => `${colors[i % colors.length]} ${i * step}deg ${(i + 1) * step}deg`).join(",")})`;
  return <article className="wheel-card">
    <div className="wheel-head"><span className="wheel-num">{title === "Público" ? "01" : "02"}</span><div><h3>{title === "Público" ? "Com quem conversar?" : "Qual tema puxar?"}</h3><small>{options.length} possibilidades</small></div></div>
    <div className="wheel-stage"><span className="wheel-pointer">▼</span><div className="wheel-disc" style={{ background, transform: `rotate(${rotation}deg)` }} /><div className="wheel-hub"><span>{title}</span><b>↻</b></div></div>
    <div className={`wheel-result ${result ? "selected" : ""}`} aria-live="polite">{result || "Gire para descobrir"}</div>
    <button className="btn outline" disabled={disabled} onClick={onSpin}>Girar roleta</button>
  </article>;
}

function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState(topics[0]);
  const [audience, setAudience] = useState(audiences[0]);
  const [visibility, setVisibility] = useState<"public" | "secret">("public");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [audienceWheel, setAudienceWheel] = useState(0);
  const [topicWheel, setTopicWheel] = useState(0);
  const [pickedAudience, setPickedAudience] = useState("");
  const [pickedTopic, setPickedTopic] = useState("");

  async function loadRooms() {
    try { const data = await api("/rooms"); setRooms(data.rooms ?? []); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar as salas."); }
  }
  useEffect(() => { void loadRooms(); const timer = window.setInterval(() => { if (!document.hidden) void loadRooms(); }, 6000); return () => window.clearInterval(timer); }, []);

  function rotate(which: "audience" | "topic" | "both") {
    if (spinning) return;
    setSpinning(true);
    if (which !== "topic") {
      const index = Math.floor(Math.random() * audiences.length);
      setPickedAudience(audiences[index]);
      setAudienceWheel((current) => current + 1800 + Math.random() * 1080 + index * (360 / audiences.length));
    }
    if (which !== "audience") {
      const index = Math.floor(Math.random() * topics.length);
      setPickedTopic(topics[index]);
      setTopicWheel((current) => current + 1800 + Math.random() * 1080 + index * (360 / topics.length));
    }
    window.setTimeout(() => setSpinning(false), 2600);
  }
  function usePair() {
    if (!pickedAudience || !pickedTopic) return;
    setAudience(pickedAudience); setTopic(pickedTopic); setTitle(`Conversa com ${pickedAudience} sobre ${pickedTopic}`);
    document.getElementById("criar")?.scrollIntoView({ behavior: "smooth" });
  }
  async function createRoom(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      const data = await api("/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, topic, audience, visibility }) }) as CreatedRoom;
      localStorage.setItem(`pantanal:manager:${data.room.code}`, data.managerKey);
      sessionStorage.setItem(`pantanal:created:${data.room.code}`, JSON.stringify(data));
      window.location.hash = `/sala/${encodeURIComponent(data.room.code)}`;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível criar a sala."); }
  }
  function joinRoom(event: FormEvent) { event.preventDefault(); if (code.trim()) window.location.hash = `/sala/${encodeURIComponent(code.trim())}`; }

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark"><i/><i/><i/></span>Pantanal em Voz</a><nav><a href="#roletas">Roletas</a><a href="#salas">Salas visíveis</a><a href={`${ADMIN_ORIGIN}/gerenciar`} target="_blank" rel="noreferrer">Gerência</a></nav></header>
    <section className="hero"><div><div className="eyebrow"><i/> Conversas do Pantanal</div><h1>Quem você quer<br/>chamar para<br/><em>essa conversa?</em></h1><p>Escolha um tema, aproxime diferentes vozes e construa mensagens para quem vive o Pantanal — do vizinho à prefeitura.</p><div className="hero-actions"><a className="btn primary" href="#roletas">Girar as roletas ↗</a><a className="text-link" href="#criar">Já sei o que quero dizer</a></div><div className="note">〰 Pelo celular · em grupo · sem cadastro</div></div><div className="landscape"><svg viewBox="0 0 620 420" aria-hidden="true"><rect width="620" height="420" fill="#e7f1fc"/><circle cx="486" cy="91" r="43" fill="#eda100"/><path d="M0 205q96-35 193 0t212 0t215 0v215H0z" fill="#b5d3ef"/><path d="M0 256q102-38 205 0t207 0t208 0v164H0z" fill="#2a78d6"/><path d="M0 302q106-25 211 0t208 0t201 0v118H0z" fill="#0a6b62"/><path d="M0 344q100-18 202 0t207 0t211 0v76H0z" fill="#dcf3ee"/><path d="M0 384q104-13 207 0t206 0t207 0v36H0z" fill="#fff"/><g fill="#12233a"><path d="M76 213h9v78h-9zM58 234q22-41 45 0-23 15-45 0zM541 216h8v68h-8zM524 235q21-37 41 0-20 14-41 0zM176 238h7v53h-7zM164 250q16-30 32 0-16 12-32 0z"/></g><g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"><path d="M278 318q25-18 51 0t52 0t52 0"/><path d="M318 348q26-16 52 0t52 0"/><path d="M397 94l-8 20M424 102l-8 20M451 94l-8 20"/></g></svg><div className="art-tag"><b>Água, território, gente.</b><span>Um lugar de muitas vozes.</span></div></div></section>

    <section className="roulette" id="roletas"><div className="section-head"><div><div className="eyebrow">Uma ideia para começar</div><h2>Roleta de conversa</h2><p>Sorteie um público e um tema. Ou escolha tudo manualmente.</p></div><span className="count-label">01 / 02</span></div><div className="wheel-layout"><Wheel title="Público" options={audiences} result={pickedAudience} rotation={audienceWheel} disabled={spinning} onSpin={() => rotate("audience")}/><Wheel title="Tema" options={topics} result={pickedTopic} rotation={topicWheel} disabled={spinning} onSpin={() => rotate("topic")}/><aside className="roulette-aside"><span className="quote-mark">“</span><p>Uma boa conversa começa quando sabemos <b>com quem</b> queremos falar e <b>sobre o quê</b>.</p><button className="btn primary full" disabled={spinning} onClick={() => rotate("both")}>{spinning ? "As roletas estão girando…" : "Girar as duas roletas ↻"}</button><button className="btn soft full" disabled={!pickedAudience || !pickedTopic} onClick={usePair}>Usar esta combinação na sala ↓</button></aside></div></section>
    <section className="steps"><div><b>1</b><strong>Escolha ou sorteie</strong><span>Defina o tema e para quem quer falar.</span></div><div><b>2</b><strong>Abra uma sala</strong><span>Visível para todos ou secreta por convite.</span></div><div><b>3</b><strong>Converse em grupo</strong><span>Compartilhe por QR code, leia e responda.</span></div></section>

    <section className="section" id="criar"><div className="section-head"><div><div className="eyebrow">Agora, organize a conversa</div><h2>Criar uma sala</h2><p>Escolha o público principal e o tema. O público pode mudar em cada mensagem.</p></div></div><div className="create-grid"><form className="panel" onSubmit={createRoom}><label>Nome da sala<input required minLength={3} maxLength={72} placeholder="Ex.: Conversa sobre a água do bairro" value={title} onChange={e=>setTitle(e.target.value)}/></label><div className="form-grid"><label>Tema principal<select value={topic} onChange={e=>setTopic(e.target.value)}>{topics.map(value=><option key={value}>{value}</option>)}</select></label><label>Público principal<select value={audience} onChange={e=>setAudience(e.target.value)}>{audiences.map(value=><option key={value}>{value}</option>)}</select></label></div><fieldset><legend>Quem pode encontrar a sala?</legend><label className={`visibility ${visibility === "public" ? "selected" : ""}`}><input type="radio" name="visibility" checked={visibility === "public"} onChange={()=>setVisibility("public")}/><span><b>Visível</b><small>Aparece na lista. Qualquer pessoa pode entrar.</small></span></label><label className={`visibility ${visibility === "secret" ? "selected" : ""}`}><input type="radio" name="visibility" checked={visibility === "secret"} onChange={()=>setVisibility("secret")}/><span><b>Secreta</b><small>Entra quem tiver o link ou QR code.</small></span></label></fieldset>{error&&<p className="error" role="alert">{error}</p>}<button className="btn primary full">Criar sala e gerar convite ↗</button></form><aside className="panel join"><div className="eyebrow">Já tem convite?</div><h3>Entre na conversa</h3><p>Escaneie o QR code ou digite o código recebido.</p><form onSubmit={joinRoom}><input value={code} onChange={e=>setCode(e.target.value)} placeholder="Código da sala"/><button className="btn outline full">Entrar na sala →</button></form><small>Salas secretas não aparecem na lista.</small></aside></div></section>

    <section className="section rooms" id="salas"><div className="section-head"><div><div className="eyebrow">Aberto para participar</div><h2>Salas visíveis</h2><p>Entre em uma conversa em andamento ou convide seu grupo para começar.</p></div><span className="count-label">{rooms.length} {rooms.length === 1 ? "sala" : "salas"}</span></div>{rooms.length ? <div className="room-grid">{rooms.map(room=><a className="room-card" key={room.id} href={`#/sala/${encodeURIComponent(room.code)}`}><span className="pill">{room.topic}</span><h3>{room.title}</h3><small>Público principal · {room.audience ?? "Público geral"}</small><b>Entrar na conversa ↗</b></a>)}</div> : <div className="empty"><b>Ainda não há salas visíveis.</b><span>Gire as roletas ou escolha um tema e crie a primeira conversa.</span></div>}</section>

    <footer className="footer"><b>Pantanal em Voz · Água, território, gente.</b><span>Autores: Ernandes Sobreira · Beatriz Ferraz Bühler · Maísa Consuelo dos Santos · Juliana Cássia de Marchi · Elaine Barreto de Menezes · Basirat Abiodun Ariyibi</span><a href="https://github.com/ernandes-sobreira/pantanal-em-voz">Código no GitHub ↗</a></footer>
  </main>;
}

function RoomPage({ code }: { code: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [nickname, setNickname] = useState("");
  const [topic, setTopic] = useState(topics[0]);
  const [audience, setAudience] = useState(audiences[0]);
  const [body, setBody] = useState("");
  const [replyFor, setReplyFor] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [edit, setEdit] = useState<{type:"post"|"reply";id:string;body:string}|null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [managerKey, setManagerKey] = useState("");
  const [managerInput, setManagerInput] = useState("");
  const [showManager, setShowManager] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [created, setCreated] = useState<CreatedRoom|null>(null);
  const [myKeys, setMyKeys] = useState<Record<string,string>>({});
  const [isAppManager, setIsAppManager] = useState(false);
  const [busy, setBusy] = useState(false);
  const invite = publicRoomUrl(code);

  async function refresh(initial = false) {
    try {
      const data = await api(`/rooms/${encodeURIComponent(code)}`);
      setRoom(data.room); setPosts(data.posts ?? []); setIsAppManager(data.isAppManager === true);
      if (initial) { setTopic(data.room.topic); setAudience(data.room.audience ?? audiences[0]); }
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível abrir a sala."); }
  }
  useEffect(() => {
    setNickname(localStorage.getItem("pantanal:nickname") ?? "");
    setManagerKey(localStorage.getItem(`pantanal:manager:${code}`) ?? "");
    const prefix = `pantanal:author:${code}:`;
    const keys: Record<string,string> = {};
    for (let i=0;i<localStorage.length;i++) { const key=localStorage.key(i); if(key?.startsWith(prefix)) keys[key.slice(prefix.length)] = localStorage.getItem(key) ?? ""; }
    setMyKeys(keys);
    const saved = sessionStorage.getItem(`pantanal:created:${code}`);
    if(saved){try{setCreated(JSON.parse(saved));setShowShare(true);sessionStorage.removeItem(`pantanal:created:${code}`);}catch{sessionStorage.removeItem(`pantanal:created:${code}`);}}
    void refresh(true);
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 6000);
    return () => window.clearInterval(timer);
  }, [code]);
  function saveNickname(value:string){setNickname(value);localStorage.setItem("pantanal:nickname",value);}
  function rememberKey(id:string,key:string){localStorage.setItem(`pantanal:author:${code}:${id}`,key);setMyKeys(old=>({...old,[id]:key}));}
  async function submitPost(event:FormEvent){event.preventDefault();if(!nickname.trim()){setError("Escreva como quer aparecer na sala.");return;}setBusy(true);setError("");try{const data=await api(`/rooms/${encodeURIComponent(code)}/posts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nickname,topic,audience,body})});rememberKey(data.post.id,data.authorKey);setBody("");setNotice("Mensagem publicada para o grupo.");await refresh();}catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível publicar.");}finally{setBusy(false);}}
  async function submitReply(event:FormEvent,postId:string){event.preventDefault();if(!nickname.trim()){setError("Escreva como quer aparecer na sala.");return;}setBusy(true);setError("");try{const data=await api(`/rooms/${encodeURIComponent(code)}/posts/${encodeURIComponent(postId)}/replies`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nickname,body:replyBody})});rememberKey(data.reply.id,data.authorKey);setReplyBody("");setReplyFor("");setNotice("Resposta publicada.");await refresh();}catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível responder.");}finally{setBusy(false);}}
  async function saveEdit(event:FormEvent){event.preventDefault();if(!edit)return;setBusy(true);setError("");try{await api(`/${edit.type === "post" ? "posts" : "replies"}/${encodeURIComponent(edit.id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,body:edit.body,managerKey,authorKey:myKeys[edit.id]??""})});setEdit(null);setNotice("Alteração salva para o grupo.");await refresh();}catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível editar.");}finally{setBusy(false);}}
  async function copyInvite(){try{await navigator.clipboard.writeText(invite);setNotice("Link da sala copiado.");}catch{setNotice(invite);}}
  function applyManager(){const value=managerInput.trim();if(!value)return;localStorage.setItem(`pantanal:manager:${code}`,value);setManagerKey(value);setManagerInput("");setShowManager(false);setNotice("Chave de gerente ativada neste aparelho.");}

  if(!room) return <main className="shell room-loading"><a className="brand" href="#">Pantanal em Voz</a><p>{error || "Abrindo a sala…"}</p><a href="#">Voltar às salas</a></main>;
  return <main className="shell"><header className="topbar"><a className="brand" href="#"><span className="brand-mark"><i/><i/><i/></span>Pantanal em Voz</a><nav><button className="btn outline" onClick={()=>setShowShare(v=>!v)}>{showShare?"Fechar convite":"Compartilhar sala ↗"}</button><a href="#salas">Outras salas</a></nav></header>
    <section className="room-head"><a className="text-link" href="#">← Todas as salas</a><div className="room-title-line"><div><span className="pill">Tema · {room.topic}</span><span className="audience-pill">Público · {room.audience ?? "Público geral"}</span><h1>{room.title}</h1><p>{room.visibility === "secret" ? "Sala secreta · entra quem recebeu o QR code ou link" : "Sala visível · qualquer pessoa pode participar"}</p></div><span className="count-label">{room.visibility === "secret" ? "⌁ Secreta" : "◎ Visível"}</span></div>{showShare&&<div className="share-panel"><QRCodeSVG value={invite} size={132} level="M" includeMargin/><div><b>{created?"Convide o grupo para entrar":"Convide mais pessoas"}</b><p>Tema: {room.topic} · Público principal: {room.audience ?? "Público geral"}</p><code>{invite}</code><button className="btn outline" onClick={copyInvite}>Copiar link</button>{created&&<div className="manager-key"><b>Chave do gerente da sala</b><code>{created.managerKey}</code><button className="text-button" onClick={()=>navigator.clipboard.writeText(created.managerKey)}>Copiar chave</button></div>}</div></div>}</section>
    <div className="room-grid-layout"><section><div className="section-head"><div><div className="eyebrow">A conversa do grupo</div><h2>Mensagens e respostas</h2></div><span className="count-label">{posts.length} {posts.length===1?"mensagem":"mensagens"}</span></div>{error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}<button onClick={()=>setNotice("")}>×</button></p>}
      <form className="panel compose" onSubmit={submitPost}><h3>O que você quer colocar na conversa?</h3><p>O grupo inteiro vai poder ler e responder.</p><label>Como quer aparecer?<input required maxLength={36} value={nickname} onChange={e=>saveNickname(e.target.value)} placeholder="Seu nome ou apelido"/></label><div className="form-grid"><label>Tema<select value={topic} onChange={e=>setTopic(e.target.value)}>{topics.map(value=><option key={value}>{value}</option>)}</select></label><label>Para quem é esta mensagem?<select value={audience} onChange={e=>setAudience(e.target.value)}>{audiences.map(value=><option key={value}>{value}</option>)}</select></label></div><label>Mensagem<textarea required maxLength={1400} rows={4} value={body} onChange={e=>setBody(e.target.value)} placeholder="Conte uma ideia, experiência ou pergunta. O que você gostaria que outras pessoas entendessem?"/></label><div className="compose-actions"><small>{body.length}/1400 · respeito e curiosidade ajudam a conversa.</small><button className="btn primary" disabled={busy}>{busy?"Enviando…":"Publicar para o grupo ↗"}</button></div></form>
      <div className="feed">{posts.length?posts.map(post=><article className="post" key={post.id}><div className="post-meta"><span className="avatar">{post.nickname.trim().slice(0,1).toUpperCase()}</span><div><b>{post.nickname}</b><small>{post.createdAt?new Date(post.createdAt.replace(" ","T")+"Z").toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):"Agora"}{post.updatedAt&&post.updatedAt!==post.createdAt?" · editada":""}</small></div><span className="post-tag">{post.topic}</span><span className="post-tag">Para {post.audience}</span>{(isAppManager||managerKey||myKeys[post.id])&&<button className="text-button" onClick={()=>setEdit({type:"post",id:post.id,body:post.body})}>Editar</button>}</div><p className="post-body">{post.body}</p><div className="post-foot"><small>{post.replies.length} {post.replies.length===1?"resposta":"respostas"}</small><button className="text-button" onClick={()=>{setReplyFor(replyFor===post.id?"":post.id);setReplyBody("");}}>Responder ↩</button></div>{post.replies.map(reply=><div className="reply" key={reply.id}><b>{reply.nickname}</b><small>{reply.updatedAt&&reply.updatedAt!==reply.createdAt?" · editada":""}</small><p>{reply.body}</p>{(isAppManager||managerKey||myKeys[reply.id])&&<button className="text-button" onClick={()=>setEdit({type:"reply",id:reply.id,body:reply.body})}>Editar</button>}</div>)}{replyFor===post.id&&<form className="reply-form" onSubmit={e=>submitReply(e,post.id)}><input required maxLength={900} value={replyBody} onChange={e=>setReplyBody(e.target.value)} placeholder="Escreva uma resposta para o grupo…"/><button className="btn outline" disabled={busy}>Responder</button></form>}</article>):<div className="empty"><b>A conversa começa com você.</b><span>Compartilhe uma pergunta, experiência ou ideia sobre {room.topic.toLowerCase()}.</span></div>}</div></section>
      <aside className="side"><section className="panel"><div className="eyebrow">Espaço do grupo</div><h3>Como esta sala funciona</h3><ul><li>As mensagens ficam salvas e aparecem para todo mundo.</li><li>As respostas ajudam a construir a conversa.</li><li>O autor pode editar no aparelho em que publicou.</li><li>Gerentes da sala e do app também podem editar.</li></ul><small>Atualiza para o grupo a cada poucos segundos.</small></section><section className="panel manager"><div className="eyebrow">Gerência</div><h3>Editar contribuições</h3><p>A pessoa que criou a sala pode ativar a chave de gerente. A gerência do app abre no app completo, usando a mesma base de salas.</p>{managerKey?<p className="notice">Chave desta sala ativada neste aparelho. <button className="text-button" onClick={()=>{localStorage.removeItem(`pantanal:manager:${code}`);setManagerKey("");}}>Sair</button></p>:showManager?<form onSubmit={e=>{e.preventDefault();applyManager();}}><input required value={managerInput} onChange={e=>setManagerInput(e.target.value)} placeholder="Cole a chave da sala"/><button className="btn primary full">Ativar chave</button></form>:<button className="btn outline full" onClick={()=>setShowManager(true)}>Ativar chave da sala</button>}<a className="text-link admin-link" href={`${ADMIN_ORIGIN}/sala/${encodeURIComponent(code)}`} target="_blank" rel="noreferrer">Abrir versão completa para gerência do app ↗</a></section><section className="share-small"><b>Convide outras vozes</b><p>O QR code abre esta mesma sala em qualquer celular.</p><button className="text-button" onClick={()=>setShowShare(true)}>Mostrar QR code ↗</button></section></aside></div>
    <footer className="footer"><b>Pantanal em Voz</b><span>Sala {room.visibility === "secret" ? "secreta" : "visível"} · conversa coletiva sobre o território</span></footer>
    {edit&&<div className="modal"><form className="modal-card" onSubmit={saveEdit}><button type="button" className="close" onClick={()=>setEdit(null)}>×</button><div className="eyebrow">Editar contribuição</div><h2>Ajuste sua mensagem</h2><p>A alteração será atualizada para todas as pessoas da sala.</p><textarea rows={6} maxLength={1400} value={edit.body} onChange={e=>setEdit({...edit,body:e.target.value})}/>{error&&<p className="error">{error}</p>}<div className="compose-actions"><button type="button" className="btn soft" onClick={()=>setEdit(null)}>Cancelar</button><button className="btn primary" disabled={busy}>Salvar edição</button></div></form></div>}
  </main>;
}

function App() {
  const [code, setCode] = useState(getRoomCode());
  useEffect(() => { const update = () => setCode(getRoomCode()); window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, []);
  return code ? <RoomPage key={code} code={code}/> : <Home/>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
