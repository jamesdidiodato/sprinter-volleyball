import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const leagues = pgTable("leagues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  joinCode: text("join_code").notNull().unique(),
  players: jsonb("players").notNull().default(sql`'[]'::jsonb`),
  currentWeek: jsonb("current_week"),
  history: jsonb("history").notNull().default(sql`'[]'::jsonb`),
  settings: jsonb("settings").notNull().default(sql`'{"playersPerTeam":4,"numTeams":4}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
});

export const insertLeagueSchema = createInsertSchema(leagues).pick({
  name: true,
  joinCode: true,
});

export type InsertLeague = z.infer<typeof insertLeagueSchema>;
export type League = typeof leagues.$inferSelect;
