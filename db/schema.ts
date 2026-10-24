import { sql } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  topic: text("topic").notNull(),
  visibility: text("visibility", { enum: ["public", "secret"] }).notNull(),
  managerKeyHash: text("manager_key_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("rooms_visibility_created_idx").on(table.visibility, table.createdAt)]);

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
  topic: text("topic").notNull(),
  audience: text("audience").notNull(),
  body: text("body").notNull(),
  authorKeyHash: text("author_key_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("posts_room_created_idx").on(table.roomId, table.createdAt)]);

export const replies = sqliteTable("replies", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
  body: text("body").notNull(),
  authorKeyHash: text("author_key_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("replies_post_created_idx").on(table.postId, table.createdAt)]);
