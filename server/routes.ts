import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { randomUUID } from "crypto";

type Position = 'Setter' | 'Hitter' | 'Back';

interface Player {
  id: string;
  name: string;
  position: Position;
  seasonWins: number;
  seasonLosses: number;
}

interface Team {
  id: string;
  name: string;
  players: Player[];
}

interface Game {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Score: number | null;
  team2Score: number | null;
  completed: boolean;
  round: 'roundRobin' | 'semifinal' | 'final';
  label?: string;
}

interface WeekData {
  teams: Team[];
  games: Game[];
  semifinalGames: Game[];
  finalGames: Game[];
  weekNumber: number;
  phase: 'roundRobin' | 'semifinals' | 'finals' | 'complete';
}

const DEFAULT_PLAYERS: Player[] = [
  { id: '1', name: 'Setter 1', position: 'Setter', seasonWins: 0, seasonLosses: 0 },
  { id: '2', name: 'Setter 2', position: 'Setter', seasonWins: 0, seasonLosses: 0 },
  { id: '3', name: 'Setter 3', position: 'Setter', seasonWins: 0, seasonLosses: 0 },
  { id: '4', name: 'Setter 4', position: 'Setter', seasonWins: 0, seasonLosses: 0 },
  { id: '5', name: 'Hitter 1', position: 'Hitter', seasonWins: 0, seasonLosses: 0 },
  { id: '6', name: 'Hitter 2', position: 'Hitter', seasonWins: 0, seasonLosses: 0 },
  { id: '7', name: 'Hitter 3', position: 'Hitter', seasonWins: 0, seasonLosses: 0 },
  { id: '8', name: 'Hitter 4', position: 'Hitter', seasonWins: 0, seasonLosses: 0 },
  { id: '9', name: 'Hitter 5', position: 'Hitter', seasonWins: 0, seasonLosses: 0 },
  { id: '10', name: 'Hitter 6', position: 'Hitter', seasonWins: 0, seasonLosses: 0 },
  { id: '11', name: 'Hitter 7', position: 'Hitter', seasonWins: 0, seasonLosses: 0 },
  { id: '12', name: 'Hitter 8', position: 'Hitter', seasonWins: 0, seasonLosses: 0 },
  { id: '13', name: 'Back 1', position: 'Back', seasonWins: 0, seasonLosses: 0 },
  { id: '14', name: 'Back 2', position: 'Back', seasonWins: 0, seasonLosses: 0 },
  { id: '15', name: 'Back 3', position: 'Back', seasonWins: 0, seasonLosses: 0 },
  { id: '16', name: 'Back 4', position: 'Back', seasonWins: 0, seasonLosses: 0 },
];

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateTeams(players: Player[]): Team[] {
  const setters = shuffle(players.filter(p => p.position === 'Setter'));
  const hitters = shuffle(players.filter(p => p.position === 'Hitter'));
  const backs = shuffle(players.filter(p => p.position === 'Back'));
  const teamNames = ['Team A', 'Team B', 'Team C', 'Team D'];
  const teams: Team[] = [];
  for (let i = 0; i < 4; i++) {
    teams.push({
      id: randomUUID(),
      name: teamNames[i],
      players: [setters[i], hitters[i * 2], hitters[i * 2 + 1], backs[i]],
    });
  }
  return teams;
}

function generateRoundRobinGames(teams: Team[]): Game[] {
  const games: Game[] = [];
  let gameNum = 1;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      games.push({
        id: randomUUID(),
        team1Id: teams[i].id,
        team2Id: teams[j].id,
        team1Score: null,
        team2Score: null,
        completed: false,
        round: 'roundRobin',
        label: `Game ${gameNum}`,
      });
      gameNum++;
    }
  }
  return games;
}

function getRankingsFromGames(teams: Team[], games: Game[]) {
  const teamStats = teams.map(team => {
    let totalPoints = 0, wins = 0, losses = 0;
    games.forEach(game => {
      if (!game.completed) return;
      if (game.team1Id === team.id) {
        totalPoints += game.team1Score ?? 0;
        if ((game.team1Score ?? 0) > (game.team2Score ?? 0)) wins++; else losses++;
      } else if (game.team2Id === team.id) {
        totalPoints += game.team2Score ?? 0;
        if ((game.team2Score ?? 0) > (game.team1Score ?? 0)) wins++; else losses++;
      }
    });
    return { team, totalPoints, wins, losses, rank: 0 };
  });
  teamStats.sort((a, b) => b.totalPoints - a.totalPoints);
  teamStats.forEach((s, i) => { s.rank = i + 1; });
  return teamStats;
}

function generateSemifinals(week: WeekData): Game[] {
  const rankings = getRankingsFromGames(week.teams, week.games);
  const rank1 = rankings.find(r => r.rank === 1)!;
  const rank2 = rankings.find(r => r.rank === 2)!;
  const rank3 = rankings.find(r => r.rank === 3)!;
  const rank4 = rankings.find(r => r.rank === 4)!;
  return [
    { id: randomUUID(), team1Id: rank1.team.id, team2Id: rank4.team.id, team1Score: null, team2Score: null, completed: false, round: 'semifinal', label: `#1 ${rank1.team.name} vs #4 ${rank4.team.name}` },
    { id: randomUUID(), team1Id: rank2.team.id, team2Id: rank3.team.id, team1Score: null, team2Score: null, completed: false, round: 'semifinal', label: `#2 ${rank2.team.name} vs #3 ${rank3.team.name}` },
  ];
}

function generateFinals(week: WeekData): Game[] {
  const semi1 = week.semifinalGames[0];
  const semi2 = week.semifinalGames[1];
  const winner1Id = (semi1.team1Score ?? 0) > (semi1.team2Score ?? 0) ? semi1.team1Id : semi1.team2Id;
  const loser1Id = (semi1.team1Score ?? 0) > (semi1.team2Score ?? 0) ? semi1.team2Id : semi1.team1Id;
  const winner2Id = (semi2.team1Score ?? 0) > (semi2.team2Score ?? 0) ? semi2.team1Id : semi2.team2Id;
  const loser2Id = (semi2.team1Score ?? 0) > (semi2.team2Score ?? 0) ? semi2.team2Id : semi2.team1Id;
  const getName = (id: string) => week.teams.find(t => t.id === id)?.name ?? '?';
  return [
    { id: randomUUID(), team1Id: winner1Id, team2Id: winner2Id, team1Score: null, team2Score: null, completed: false, round: 'final', label: `Championship: ${getName(winner1Id)} vs ${getName(winner2Id)}` },
    { id: randomUUID(), team1Id: loser1Id, team2Id: loser2Id, team1Score: null, team2Score: null, completed: false, round: 'final', label: `3rd Place: ${getName(loser1Id)} vs ${getName(loser2Id)}` },
  ];
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/leagues", async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: "League name is required" });
      }
      const code = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) +
        Math.random().toString(36).substring(2, 6).toUpperCase();
      const league = await storage.createLeague({
        name: name.trim(),
        joinCode: code,
        players: DEFAULT_PLAYERS,
      });
      return res.json({ id: league.id, name: league.name, joinCode: league.joinCode });
    } catch (e: any) {
      console.error("Create league error:", e);
      return res.status(500).json({ error: "Failed to create league" });
    }
  });

  app.post("/api/leagues/join", async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: "Join code is required" });
      }
      const league = await storage.getLeagueByCode(code.trim().toUpperCase());
      if (!league) {
        return res.status(404).json({ error: "League not found. Check your code and try again." });
      }
      return res.json({ id: league.id, name: league.name, joinCode: league.joinCode });
    } catch (e: any) {
      console.error("Join league error:", e);
      return res.status(500).json({ error: "Failed to join league" });
    }
  });

  app.get("/api/leagues/:id", async (req: Request, res: Response) => {
    try {
      const league = await storage.getLeague(parseInt(req.params.id));
      if (!league) return res.status(404).json({ error: "League not found" });
      return res.json({
        id: league.id,
        name: league.name,
        joinCode: league.joinCode,
        players: league.players,
        currentWeek: league.currentWeek,
        history: league.history,
      });
    } catch (e: any) {
      console.error("Get league error:", e);
      return res.status(500).json({ error: "Failed to get league" });
    }
  });

  app.put("/api/leagues/:id/players/:playerId", async (req: Request, res: Response) => {
    try {
      const league = await storage.getLeague(parseInt(req.params.id));
      if (!league) return res.status(404).json({ error: "League not found" });
      const { name } = req.body;
      const players = (league.players as Player[]).map(p =>
        p.id === req.params.playerId ? { ...p, name } : p
      );
      const currentWeek = league.currentWeek as WeekData | null;
      let updatedWeek = currentWeek;
      if (currentWeek) {
        updatedWeek = {
          ...currentWeek,
          teams: currentWeek.teams.map(team => ({
            ...team,
            players: team.players.map(tp => tp.id === req.params.playerId ? { ...tp, name } : tp),
          })),
        };
      }
      await storage.updateLeague(league.id, { players, currentWeek: updatedWeek });
      return res.json({ success: true });
    } catch (e: any) {
      console.error("Update player error:", e);
      return res.status(500).json({ error: "Failed to update player" });
    }
  });

  app.post("/api/leagues/:id/generate-week", async (req: Request, res: Response) => {
    try {
      const league = await storage.getLeague(parseInt(req.params.id));
      if (!league) return res.status(404).json({ error: "League not found" });
      const players = league.players as Player[];
      const currentWeek = league.currentWeek as WeekData | null;
      let history = (league.history as any[]) || [];

      if (currentWeek) {
        const allGames = [...currentWeek.games, ...currentWeek.semifinalGames, ...currentWeek.finalGames];
        const completedGames = allGames.filter(g => g.completed);
        if (completedGames.length > 0) {
          const rankings = getRankingsFromGames(currentWeek.teams, currentWeek.games);
          history = [...history, {
            weekNumber: currentWeek.weekNumber,
            teams: currentWeek.teams,
            games: currentWeek.games,
            semifinalGames: currentWeek.semifinalGames,
            finalGames: currentWeek.finalGames,
            rankings: rankings.map(r => ({
              teamName: r.team.name,
              totalPoints: r.totalPoints,
              wins: r.wins,
              losses: r.losses,
              rank: r.rank,
            })),
          }];
        }
      }

      const teams = generateTeams(players);
      const games = generateRoundRobinGames(teams);
      const weekNumber = currentWeek ? currentWeek.weekNumber + 1 : 1;
      const newWeek: WeekData = { teams, games, semifinalGames: [], finalGames: [], weekNumber, phase: 'roundRobin' };

      await storage.updateLeague(league.id, { currentWeek: newWeek, history });
      return res.json({ currentWeek: newWeek, history });
    } catch (e: any) {
      console.error("Generate week error:", e);
      return res.status(500).json({ error: "Failed to generate week" });
    }
  });

  app.post("/api/leagues/:id/swap-players", async (req: Request, res: Response) => {
    try {
      const league = await storage.getLeague(parseInt(req.params.id));
      if (!league) return res.status(404).json({ error: "League not found" });
      const currentWeek = league.currentWeek as WeekData | null;
      if (!currentWeek) return res.status(400).json({ error: "No current week" });

      const { player1Id, team1Id, player2Id, team2Id } = req.body;
      const updatedTeams = currentWeek.teams.map(team => {
        if (team.id === team1Id) {
          return { ...team, players: team.players.map(p =>
            p.id === player1Id
              ? currentWeek.teams.find(t => t.id === team2Id)!.players.find(p2 => p2.id === player2Id)!
              : p
          )};
        }
        if (team.id === team2Id) {
          return { ...team, players: team.players.map(p =>
            p.id === player2Id
              ? currentWeek.teams.find(t => t.id === team1Id)!.players.find(p1 => p1.id === player1Id)!
              : p
          )};
        }
        return team;
      });

      const updatedWeek = { ...currentWeek, teams: updatedTeams };
      await storage.updateLeague(league.id, { currentWeek: updatedWeek });
      return res.json({ currentWeek: updatedWeek });
    } catch (e: any) {
      console.error("Swap players error:", e);
      return res.status(500).json({ error: "Failed to swap players" });
    }
  });

  app.post("/api/leagues/:id/submit-score", async (req: Request, res: Response) => {
    try {
      const league = await storage.getLeague(parseInt(req.params.id));
      if (!league) return res.status(404).json({ error: "League not found" });
      const currentWeek = league.currentWeek as WeekData | null;
      if (!currentWeek) return res.status(400).json({ error: "No current week" });

      const { gameId, team1Score, team2Score, round } = req.body;

      if (team1Score > 21 || team2Score > 21) {
        return res.status(400).json({ error: "Scores go to 21" });
      }
      if (Math.max(team1Score, team2Score) < 21) {
        return res.status(400).json({ error: "Winner must reach at least 21" });
      }
      if (team1Score === team2Score) {
        return res.status(400).json({ error: "Scores cannot be tied" });
      }

      let updatedWeek = { ...currentWeek };
      let players = [...(league.players as Player[])];

      const applyWinLoss = (winnerId: string, loserId: string) => {
        const winningTeam = currentWeek.teams.find(t => t.id === winnerId);
        const losingTeam = currentWeek.teams.find(t => t.id === loserId);
        if (winningTeam && losingTeam) {
          const winnerIds = new Set(winningTeam.players.map(p => p.id));
          const loserIds = new Set(losingTeam.players.map(p => p.id));
          players = players.map(p => {
            if (winnerIds.has(p.id)) return { ...p, seasonWins: p.seasonWins + 1 };
            if (loserIds.has(p.id)) return { ...p, seasonLosses: p.seasonLosses + 1 };
            return p;
          });
        }
      };

      if (round === 'roundRobin') {
        updatedWeek.games = currentWeek.games.map(g =>
          g.id === gameId ? { ...g, team1Score, team2Score, completed: true } : g
        );
        const game = updatedWeek.games.find(g => g.id === gameId)!;
        const winnerId = team1Score > team2Score ? game.team1Id : game.team2Id;
        const loserId = team1Score > team2Score ? game.team2Id : game.team1Id;
        applyWinLoss(winnerId, loserId);
        if (updatedWeek.games.every(g => g.completed)) {
          updatedWeek.semifinalGames = generateSemifinals(updatedWeek);
          updatedWeek.phase = 'semifinals';
        }
      } else if (round === 'semifinal') {
        updatedWeek.semifinalGames = currentWeek.semifinalGames.map(g =>
          g.id === gameId ? { ...g, team1Score, team2Score, completed: true } : g
        );
        const game = updatedWeek.semifinalGames.find(g => g.id === gameId)!;
        const winnerId = team1Score > team2Score ? game.team1Id : game.team2Id;
        const loserId = team1Score > team2Score ? game.team2Id : game.team1Id;
        applyWinLoss(winnerId, loserId);
        if (updatedWeek.semifinalGames.every(g => g.completed)) {
          updatedWeek.finalGames = generateFinals(updatedWeek);
          updatedWeek.phase = 'finals';
        }
      } else if (round === 'final') {
        updatedWeek.finalGames = currentWeek.finalGames.map(g =>
          g.id === gameId ? { ...g, team1Score, team2Score, completed: true } : g
        );
        const game = updatedWeek.finalGames.find(g => g.id === gameId)!;
        const winnerId = team1Score > team2Score ? game.team1Id : game.team2Id;
        const loserId = team1Score > team2Score ? game.team2Id : game.team1Id;
        applyWinLoss(winnerId, loserId);
        if (updatedWeek.finalGames.every(g => g.completed)) {
          updatedWeek.phase = 'complete';
        }
      }

      await storage.updateLeague(league.id, { currentWeek: updatedWeek, players });
      return res.json({ currentWeek: updatedWeek, players });
    } catch (e: any) {
      console.error("Submit score error:", e);
      return res.status(500).json({ error: "Failed to submit score" });
    }
  });

  app.post("/api/leagues/:id/reset", async (req: Request, res: Response) => {
    try {
      const league = await storage.getLeague(parseInt(req.params.id));
      if (!league) return res.status(404).json({ error: "League not found" });
      const players = (league.players as Player[]).map(p => ({ ...p, seasonWins: 0, seasonLosses: 0 }));
      await storage.updateLeague(league.id, { players, currentWeek: null, history: [] });
      return res.json({ success: true, players });
    } catch (e: any) {
      console.error("Reset error:", e);
      return res.status(500).json({ error: "Failed to reset" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
