"use client";

import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { audiences, topics } from "../lib/pantanal-options";

type Room = { id: string; code: string; title: string; topic: string; audience: string; visibility: "public" | "secret"; createdAt?: string };
type Created = { room: Room; managerKey: string };

function wheelGradient(count: number) {
  const colors = ["#2a78d6", "#e7f1fc", "#0a6b62", "#dcf3ee", "#eda100", "#f9edd9", "#eb6834", "#eef1f5"];
  const step = 360 / count;
  const stops = Array.from({ length: count }, (_, index) => `${colors[index % colors.length]} ${index * step}deg ${(index + 1) * step}deg`);
  return `conic-gradient(from -90deg, ${stops.join(", ")})`;
}

function nextWheelRotation(index: number, count: number, current: number) {
  const center = (index + 0.5) * (360 / count);
  const desired = (360 - center) % 360;
  const currentAngle = ((current % 360) + 360) % 360;
  const offset = (desired - currentAngle + 360) % 360;
  return current + 360 * 5 + offset;
}

function Wheel({
  title,
  result,
  options,
  rotation,
  disabled,
  onSpin,
}: {
  title: string;
  result: string;
  options: string[];
  rotation: number;
  disabled: boolean;
  onSpin: () => void;
}) {
  return (
    <article className="wheel-card">
      <div className="wheel-card-head">
        <span className="wheel-number">{title === "Público" ? "01" : "02"}</span>
        <div><h3>{title === "Público" ? "Com quem conversar?" : "Qual tema puxar?"}</h3><p>{options.length} possibilidades na roleta</p></div>
      </div>
      <div className="wheel-stage">
        <span className="wheel-pointer" aria-hidden="true">▼</span>
        <div className="wheel-disc" style={{ background: wheelGradient(options.length), transform: `rotate(${rotation}deg)` }} aria-hidden="true">
          <span className="wheel-spoke spoke-a" /><span className="wheel-spoke spoke-b" /><span className="wheel-spoke spoke-c" />
        </div>
        <div className="wheel-hub" aria-hidden="true"><span>{title}</span><b>↻</b></div>
      </div>
      <p className={`wheel-result ${result ? "has-result" : ""}`} aria-live="polite">{result || "Gire para descobrir"}</p>
      <button className="button button-outline wheel-button" type="button" disabled={disabled} onClick={onSpin}>Girar roleta</button>
    </article>
  );
}

export default function Home() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [title, setTitle] = useState("");
  const generatedTitle = useRef(false);
  const [topic, setTopic] = useState(topics[0]);
  const [audience, setAudience] = useState(audiences[0]);
  const [visibility, setVisibility] = useState<"public" | "secret">("public");
  const [code, setCode] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [busy, setBusy] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [audienceSpin, setAudienceSpin] = useState(0);
  const [topicSpin, setTopicSpin] = useState(0);
  const [pickedAudience, setPickedAudience] = useState("");
  const [pickedTopic, setPickedTopic] = useState("");

  async function loadRooms() {
    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const data = await response.json() as { rooms?: Room[]; error?: string };
      if (response.ok) setRooms(data.rooms ?? []);
      else setError(data.error ?? "Não foi possível carregar as salas.");
    } catch { setError("Não foi possível conectar ao mural de salas."); }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadRooms(); }, []);

  function spinWheel(which: "audience" | "topic" | "both") {
    if (spinning) return;
    setSpinning(true);
    if (which === "audience" || which === "both") {
      const index = Math.floor(Math.random() * audiences.length);
      setPickedAudience(audiences[index]);
      setAudienceSpin((value) => nextWheelRotation(index, audiences.length, value));
    }
    if (which === "topic" || which === "both") {
      const index = Math.floor(Math.random() * topics.length);
      setPickedTopic(topics[index]);
      setTopicSpin((value) => nextWheelRotation(index, topics.length, value));
    }
    window.setTimeout(() => setSpinning(false), 2600);
  }

  function useCombination() {
    if (!pickedAudience || !pickedTopic) return;
    setAudience(pickedAudience);
    setTopic(pickedTopic);
    setTitle(`Conversa com ${pickedAudience} sobre ${pickedTopic}`);
    generatedTitle.current = true;
    document.getElementById("criar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, topic, audience, visibility }) });
      const data = await response.json() as { room: Room; managerKey: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível criar a sala.");
      localStorage.setItem(`pantanal:manager:${data.room.code}`, data.managerKey);
      setCreated(data); await loadRooms();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível criar a sala."); }
    finally { setBusy(false); }
  }
  function enterRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const value = code.trim(); if (value) router.push(`/sala/${encodeURIComponent(value)}`);
  }
  const invite = created && typeof window !== "undefined" ? `${window.location.origin}/sala/${created.room.code}` : "";
  async function copyInvite() {
    if (!invite) return;
    try { await navigator.clipboard.writeText(invite); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setError("Não foi possível copiar o link neste aparelho."); }
  }

  return <main className="page-shell">
    <header className="topbar">
      <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Pantanal em Voz</span></Link>
      <nav className="home-actions" aria-label="Navegação principal"><a className="top-link" href="#roletas">Roletas de conversa</a><a className="top-link" href="#salas">Salas visíveis <span>↓</span></a><Link className="top-link manager-nav" href="/gerenciar">Gerência</Link></nav>
    </header>

    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-mark" /> Conversas do Pantanal</div>
        <h1>Quem você quer<br />chamar para<br /><em>essa conversa?</em></h1>
        <p>Escolha um tema, aproxime diferentes vozes e construa mensagens para quem vive o Pantanal — do vizinho à prefeitura.</p>
        <div className="hero-actions"><a className="button button-primary" href="#roletas">Girar as roletas <span>↗</span></a><a className="text-link" href="#criar">Já sei o que quero dizer</a></div>
        <div className="hero-note"><span className="rain-mark">〰</span> Pelo celular · em grupo · sem cadastro</div>
      </div>
      <div className="hero-art" aria-label="Ilustração azul de águas e chuva no Pantanal" role="img">
        <svg viewBox="0 0 620 420" aria-hidden="true"><rect width="620" height="420" fill="#e7f1fc"/><circle cx="486" cy="91" r="43" fill="#eda100"/><path d="M0 205q96-35 193 0t212 0t215 0v215H0z" fill="#b5d3ef"/><path d="M0 256q102-38 205 0t207 0t208 0v164H0z" fill="#2a78d6"/><path d="M0 302q106-25 211 0t208 0t201 0v118H0z" fill="#0a6b62"/><path d="M0 344q100-18 202 0t207 0t211 0v76H0z" fill="#dcf3ee"/><path d="M0 384q104-13 207 0t206 0t207 0v36H0z" fill="#fff"/><g fill="#12233a"><path d="M76 213h9v78h-9zM58 234q22-41 45 0-23 15-45 0zM541 216h8v68h-8zM524 235q21-37 41 0-20 14-41 0zM176 238h7v53h-7zM164 250q16-30 32 0-16 12-32 0z"/></g><g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".9"><path d="M278 318q25-18 51 0t52 0t52 0"/><path d="M318 348q26-16 52 0t52 0"/><path d="M397 94l-8 20M424 102l-8 20M451 94l-8 20"/></g><path d="M93 87c0 17-25 17-25 0 0-9 12-26 12-26s13 17 13 26z" fill="#2a78d6"/><path d="M115 91q11-10 22 0t22 0" fill="none" stroke="#0a6b62" strokeWidth="4" strokeLinecap="round"/></svg>
        <div className="art-caption"><strong>Água, território, gente.</strong><span>Um lugar de muitas vozes.</span></div>
        <div className="art-stamp">Pantanal<br /><b>MT · MS</b></div>
      </div>
    </section>

    <section className="section roulette-section" id="roletas">
      <div className="section-heading roulette-heading"><div><div className="eyebrow">Uma ideia para começar</div><h2>Roleta de conversa</h2><p>Sorteie um público e um tema. Ou escolha tudo manualmente logo abaixo.</p></div><span className="roulette-index">01 / 02</span></div>
      <div className="roulette-layout">
        <Wheel title="Público" result={pickedAudience} options={audiences} rotation={audienceSpin} disabled={spinning} onSpin={() => spinWheel("audience")} />
        <Wheel title="Tema" result={pickedTopic} options={topics} rotation={topicSpin} disabled={spinning} onSpin={() => spinWheel("topic")} />
        <div className="roulette-side"><div className="roulette-note"><span className="voice-mark">“</span><p>Uma boa conversa começa quando sabemos <strong>com quem</strong> queremos falar e <strong>sobre o quê</strong>.</p></div><button className="button button-primary full" type="button" disabled={spinning} onClick={() => spinWheel("both")}>{spinning ? "As roletas estão girando…" : "Girar as duas roletas ↻"}</button><button className="button button-soft full" type="button" disabled={!pickedAudience || !pickedTopic} onClick={useCombination}>Usar esta combinação na sala ↓</button></div>
      </div>
    </section>

    <section className="how-grid" aria-label="Como funciona"><div><span className="step-no">1</span><strong>Escolha ou sorteie</strong><p>Defina o tema e para quem quer falar.</p></div><div><span className="step-no">2</span><strong>Abra uma sala</strong><p>Visível para todos ou secreta por convite.</p></div><div><span className="step-no">3</span><strong>Converse em grupo</strong><p>Compartilhe por QR code, leia e responda.</p></div></section>

    <section className="section" id="criar"><div className="section-heading"><div><div className="eyebrow">Agora, organize a conversa</div><h2>Criar uma sala</h2><p>Escolha o público principal e o tema. As pessoas podem mudar o público em cada mensagem.</p></div><span className="section-rule" /></div>
      <div className="create-layout"><form className="panel create-form" onSubmit={createRoom}><div className="form-intro"><span className="form-step">A</span><div><strong>Sobre o que será esta sala?</strong><small>Você pode ajustar essas escolhas antes de criar.</small></div></div><label>Nome da sala<input required minLength={3} maxLength={72} placeholder="Ex.: Conversa sobre a água do bairro" value={title} onChange={e=>{generatedTitle.current=false;setTitle(e.target.value)}}/></label><div className="create-selects"><label>Tema principal<select value={topic} onChange={e=>{setTopic(e.target.value);if(generatedTitle.current)setTitle(`Conversa com ${audience} sobre ${e.target.value}`)}}>{topics.map(item=><option key={item}>{item}</option>)}</select></label><label>Público principal<select value={audience} onChange={e=>{setAudience(e.target.value);if(generatedTitle.current)setTitle(`Conversa com ${e.target.value} sobre ${topic}`)}}>{audiences.map(item=><option key={item}>{item}</option>)}</select></label></div><fieldset><legend>Quem pode encontrar a sala?</legend><label className={`visibility-choice ${visibility==="public"?"selected":""}`}><input type="radio" name="visibility" checked={visibility==="public"} onChange={()=>setVisibility("public")}/><span><strong>Visível</strong><small>Aparece na lista. Qualquer pessoa pode entrar.</small></span><span className="choice-icon">◎</span></label><label className={`visibility-choice ${visibility==="secret"?"selected":""}`}><input type="radio" name="visibility" checked={visibility==="secret"} onChange={()=>setVisibility("secret")}/><span><strong>Secreta</strong><small>Entra quem tiver o link ou QR code.</small></span><span className="choice-icon">⌁</span></label></fieldset>{error&&<p className="error-text" role="alert">{error}</p>}<button className="button button-primary full" disabled={busy}>{busy?"Criando sala…":"Criar sala e gerar convite ↗"}</button></form>
        <aside className="panel join-panel"><span className="join-icon" aria-hidden="true">↗</span><div className="eyebrow">Já tem convite?</div><h3>Entre na conversa</h3><p>Escaneie o QR code com a câmera do celular ou digite o código recebido.</p><form onSubmit={enterRoom}><label className="sr-only" htmlFor="room-code">Código da sala</label><input id="room-code" placeholder="Cole o código da sala" value={code} onChange={e=>setCode(e.target.value)}/><button className="button button-outline full">Entrar na sala →</button></form><div className="privacy-note">Salas secretas não aparecem na lista.</div></aside></div>
    </section>

    <section className="section rooms-section" id="salas"><div className="section-heading"><div><div className="eyebrow">Aberto para participar</div><h2>Salas visíveis</h2><p>Entre em uma conversa em andamento ou convide seu grupo para começar outra.</p></div><span className="count-pill">{rooms.length} {rooms.length===1?"sala":"salas"}</span></div>{rooms.length?<div className="room-grid">{rooms.map(room=><Link className="room-card" key={room.id} href={`/sala/${room.code}`}><div className="room-card-top"><span className="room-symbol" aria-hidden="true">〰</span><span className="visibility-tag">Visível</span></div><span className="room-topic">{room.topic}</span><h3>{room.title}</h3><span className="room-audience">Público principal · {room.audience}</span><span className="room-open">Entrar na conversa <b>↗</b></span></Link>)}</div>:<div className="empty-rooms"><div className="empty-icon">〰</div><strong>Ainda não há salas visíveis.</strong><span>Gire as roletas ou escolha um tema e crie a primeira conversa.</span><a href="#roletas">Ir para as roletas ↗</a></div>}</section>

    {created&&<div className="modal-backdrop" role="presentation"><section className="created-modal" role="dialog" aria-modal="true" aria-labelledby="created-title"><button className="modal-close" onClick={()=>setCreated(null)} aria-label="Fechar">×</button><div className="eyebrow">Sala criada</div><h2 id="created-title">Leve o grupo para a conversa</h2><p>Compartilhe o QR code. O tema é {created.room.topic}; o público principal é {created.room.audience}. {created.room.visibility==="secret"?"Esta sala secreta não aparece na lista pública.":"Esta sala aparece na lista pública."}</p><div className="qr-wrap"><QRCodeSVG value={invite} size={190} level="M" includeMargin/></div><div className="invite-url">{invite}</div><button className="button button-soft full" onClick={copyInvite}>{copied?"Link copiado ✓":"Copiar link de convite"}</button><div className="manager-key"><strong>Chave de gerente da sala</strong><p>Guarde esta chave. Ela permite editar as mensagens da sala.</p><code>{created.managerKey}</code><button className="copy-key" onClick={()=>navigator.clipboard.writeText(created.managerKey)}>Copiar chave</button></div><Link className="button button-primary full" href={`/sala/${created.room.code}`}>Abrir a sala →</Link></section></div>}

    <footer className="footer"><span className="footer-brand">Pantanal em Voz · Água, território, gente.</span><span>Autores: Ernandes Sobreira · Beatriz Ferraz Bühler · Maísa Consuelo dos Santos · Juliana Cássia de Marchi · Elaine Barreto de Menezes · Basirat Abiodun Ariyibi</span><a href="https://github.com/ernandes-sobreira/pantanal-em-voz" target="_blank" rel="noreferrer">Ver o código no GitHub ↗</a></footer>
  </main>;
}
