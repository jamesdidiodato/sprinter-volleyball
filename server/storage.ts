import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { leagues, type League, type InsertLeague } from "../shared/schema";

const db = drizzle(process.env.DATABASE_URL!);

export interface IStorage {
  createLeague(data: InsertLeague & { players: any[]; settings?: any }): Promise<League>;
  getLeagueByCode(joinCode: string): Promise<League | undefined>;
  getLeague(id: number): Promise<League | undefined>;
  updateLeague(id: number, data: Partial<{ players: any; currentWeek: any; history: any; settings: any }>): Promise<League | undefined>;
  getAllLeagues(): Promise<League[]>;
  deleteLeague(id: number): Promise<boolean>;
  touchLeague(id: number): Promise<void>;
}

class DatabaseStorage implements IStorage {
  async createLeague(data: InsertLeague & { players: any[]; settings?: any }): Promise<League> {
    const [league] = await db.insert(leagues).values({
      name: data.name,
      joinCode: data.joinCode,
      players: data.players,
      currentWeek: null,
      history: [],
      settings: data.settings || { playersPerTeam: 4, numTeams: 4 },
    }).returning();
    return league;
  }

  async getLeagueByCode(joinCode: string): Promise<League | undefined> {
    const [league] = await db.select().from(leagues).where(eq(leagues.joinCode, joinCode.toUpperCase()));
    return league;
  }

  async getLeague(id: number): Promise<League | undefined> {
    const [league] = await db.select().from(leagues).where(eq(leagues.id, id));
    return league;
  }

  async updateLeague(id: number, data: Partial<{ players: any; currentWeek: any; history: any }>): Promise<League | undefined> {
    const [league] = await db.update(leagues).set(data).where(eq(leagues.id, id)).returning();
    return league;
  }

  async getAllLeagues(): Promise<League[]> {
    return db.select().from(leagues).orderBy(desc(leagues.lastAccessedAt));
  }

  async deleteLeague(id: number): Promise<boolean> {
    const result = await db.delete(leagues).where(eq(leagues.id, id)).returning();
    return result.length > 0;
  }

  async touchLeague(id: number): Promise<void> {
    await db.update(leagues).set({ lastAccessedAt: new Date() }).where(eq(leagues.id, id));
  }
}

export const storage = new DatabaseStorage();
