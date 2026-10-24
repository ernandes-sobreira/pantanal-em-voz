import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

type RoomRow = { id: string; code: string; title: string; topic: string; visibility: "public" | "secret"; created_at: string; manager_key_hash: string };
type PostRow = { id: string; room_id: string; nickname: string; topic: string; audience: string; body: string; author_key_hash: string; created_at: string; updated_at: string };
type ReplyRow = { id: string; post_id: string; nickname: string; body: string; author_key_hash: string; created_at: string; updated_at: string };
type Input = Record<string, unknown>;

function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
async function readInput(request: Request): Promise<Input> {
  try { return await request.json() as Input; } catch { return {}; }
}
function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => alphabet[byte & 31]).join("");
}
async function hash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (part) => part.toString(16).padStart(2, "0")).join("");
}
function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function publicRoom(room: RoomRow) {
  return { id: room.id, code: room.code, title: room.title, topic: room.topic, visibility: room.visibility, createdAt: room.created_at };
}
function isAppManager(request: Request) {
  const signedInUserId = request.headers.get("oai-authenticated-user-id");
  return Boolean(signedInUserId && env.APP_MANAGER_USER_ID && signedInUserId === env.APP_MANAGER_USER_ID);
}
function publicPost(row: PostRow, roomReplies: ReplyRow[]) {
  return {
    id: row.id, nickname: row.nickname, topic: row.topic, audience: row.audience, body: row.body,
    createdAt: row.created_at, updatedAt: row.updated_at,
    replies: roomReplies.filter((item) => item.post_id === row.id).map((item) => ({
      id: item.id, nickname: item.nickname, body: item.body, createdAt: item.created_at, updatedAt: item.updated_at,
    })),
  };
}

export async function GET(request: Request) {
  try {
    const db = env.DB;
    if (!db) return reply({ error: "O banco compartilhado ainda não está conectado." }, 503);
    const parts = new URL(request.url).pathname.split("/").filter(Boolean).slice(1);
    if (parts.length === 1 && parts[0] === "rooms") {
      const result = await db.prepare("SELECT id, code, title, topic, visibility, created_at, manager_key_hash FROM rooms WHERE visibility = 'public' ORDER BY created_at DESC LIMIT 50").all<RoomRow>();
      return reply({ rooms: (result.results ?? []).map(publicRoom) });
    }
    if (parts.length === 2 && parts[0] === "rooms") {
      const room = await db.prepare("SELECT * FROM rooms WHERE code = ? LIMIT 1").bind(parts[1]).first<RoomRow>();
      if (!room) return reply({ error: "Sala não encontrada. Confira o QR code ou o código." }, 404);
      const postsResult = await db.prepare("SELECT * FROM posts WHERE room_id = ? ORDER BY created_at DESC").bind(room.id).all<PostRow>();
      const repliesResult = await db.prepare("SELECT r.* FROM replies r JOIN posts p ON p.id = r.post_id WHERE p.room_id = ? ORDER BY r.created_at ASC").bind(room.id).all<ReplyRow>();
      return reply({ room: publicRoom(room), posts: (postsResult.results ?? []).map((item) => publicPost(item, repliesResult.results ?? [])), isAppManager: isAppManager(request) });
    }
    return reply({ error: "Endereço desconhecido." }, 404);
  } catch {
    return reply({ error: "Não foi possível carregar os dados da sala." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const db = env.DB;
    if (!db) return reply({ error: "O banco compartilhado ainda não está conectado." }, 503);
    const parts = new URL(request.url).pathname.split("/").filter(Boolean).slice(1);
    const body = await readInput(request);

    if (parts.length === 1 && parts[0] === "rooms") {
      const title = clean(body.title, 72);
      const topic = clean(body.topic, 48);
      const visibility = body.visibility === "secret" ? "secret" : "public";
      if (title.length < 3 || !topic) return reply({ error: "Informe um nome de sala e um tema." }, 400);
      const id = crypto.randomUUID();
      const code = roomCode();
      const managerKey = token();
      await db.prepare("INSERT INTO rooms (id, code, title, topic, visibility, manager_key_hash) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(id, code, title, topic, visibility, await hash(managerKey)).run();
      return reply({ room: { id, code, title, topic, visibility }, managerKey }, 201);
    }

    if (parts.length === 3 && parts[0] === "rooms" && parts[2] === "posts") {
      const room = await db.prepare("SELECT * FROM rooms WHERE code = ? LIMIT 1").bind(parts[1]).first<RoomRow>();
      if (!room) return reply({ error: "Sala não encontrada." }, 404);
      const nickname = clean(body.nickname, 36) || "Participante";
      const topic = clean(body.topic, 48) || room.topic;
      const audience = clean(body.audience, 64);
      const text = clean(body.body, 1400);
      if (text.length < 2 || !audience) return reply({ error: "Escreva a mensagem e escolha para quem ela é." }, 400);
      const id = crypto.randomUUID();
      const authorKey = token();
      await db.prepare("INSERT INTO posts (id, room_id, nickname, topic, audience, body, author_key_hash) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(id, room.id, nickname, topic, audience, text, await hash(authorKey)).run();
      return reply({ post: { id, nickname, topic, audience, body: text }, authorKey }, 201);
    }

    if (parts.length === 5 && parts[0] === "rooms" && parts[2] === "posts" && parts[4] === "replies") {
      const room = await db.prepare("SELECT id FROM rooms WHERE code = ? LIMIT 1").bind(parts[1]).first<{ id: string }>();
      const post = await db.prepare("SELECT id FROM posts WHERE id = ? AND room_id = ? LIMIT 1").bind(parts[3], room?.id ?? "").first<{ id: string }>();
      if (!room || !post) return reply({ error: "Mensagem não encontrada nesta sala." }, 404);
      const nickname = clean(body.nickname, 36) || "Participante";
      const text = clean(body.body, 900);
      if (text.length < 2) return reply({ error: "Escreva uma resposta antes de enviar." }, 400);
      const id = crypto.randomUUID();
      const authorKey = token();
      await db.prepare("INSERT INTO replies (id, post_id, nickname, body, author_key_hash) VALUES (?, ?, ?, ?, ?)")
        .bind(id, post.id, nickname, text, await hash(authorKey)).run();
      return reply({ reply: { id, nickname, body: text }, authorKey }, 201);
    }
    return reply({ error: "Endereço desconhecido." }, 404);
  } catch {
    return reply({ error: "Não foi possível salvar. Tente novamente." }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const db = env.DB;
    if (!db) return reply({ error: "O banco compartilhado ainda não está conectado." }, 503);
    const parts = new URL(request.url).pathname.split("/").filter(Boolean).slice(1);
    const body = await readInput(request);
    const code = clean(body.code, 100);
    const managerKey = clean(body.managerKey, 100);
    const authorKey = clean(body.authorKey, 100);
    const text = clean(body.body, 1400);
    if (!code || text.length < 2) return reply({ error: "A mensagem não pode ficar vazia." }, 400);

    if (parts.length === 2 && parts[0] === "posts") {
      const row = await db.prepare("SELECT p.id, p.author_key_hash, r.code, r.manager_key_hash FROM posts p JOIN rooms r ON r.id = p.room_id WHERE p.id = ? LIMIT 1").bind(parts[1]).first<{ id: string; author_key_hash: string; code: string; manager_key_hash: string }>();
      if (!row || row.code !== code) return reply({ error: "Mensagem não encontrada." }, 404);
      const [managerHash, authorHash] = await Promise.all([managerKey ? hash(managerKey) : "", authorKey ? hash(authorKey) : ""]);
      if (!isAppManager(request) && !equal(managerHash, row.manager_key_hash) && !equal(authorHash, row.author_key_hash)) return reply({ error: "Só quem enviou, o gerente da sala ou o gerente do app pode editar." }, 403);
      await db.prepare("UPDATE posts SET body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(text, row.id).run();
      return reply({ ok: true });
    }

    if (parts.length === 2 && parts[0] === "replies") {
      const row = await db.prepare("SELECT x.id, x.author_key_hash, r.code, r.manager_key_hash FROM replies x JOIN posts p ON p.id = x.post_id JOIN rooms r ON r.id = p.room_id WHERE x.id = ? LIMIT 1").bind(parts[1]).first<{ id: string; author_key_hash: string; code: string; manager_key_hash: string }>();
      if (!row || row.code !== code) return reply({ error: "Resposta não encontrada." }, 404);
      const [managerHash, authorHash] = await Promise.all([managerKey ? hash(managerKey) : "", authorKey ? hash(authorKey) : ""]);
      if (!isAppManager(request) && !equal(managerHash, row.manager_key_hash) && !equal(authorHash, row.author_key_hash)) return reply({ error: "Só quem enviou, o gerente da sala ou o gerente do app pode editar." }, 403);
      await db.prepare("UPDATE replies SET body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(text.slice(0, 900), row.id).run();
      return reply({ ok: true });
    }
    return reply({ error: "Endereço desconhecido." }, 404);
  } catch {
    return reply({ error: "Não foi possível editar agora. Tente novamente." }, 500);
  }
}
