import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { randomUUID } from "crypto";

type Position = 'Setter' | 'Hitter' | 'Libero' | 'Defender';

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

type LeagueFormat = 'roundRobin' | 'ladder';

interface LeagueSettings {
  playersPerTeam: number;
  numTeams: number;
  format: LeagueFormat;
}

interface LadderCourt {
  courtNumber: number;
  team1Id: string;
  team2Id: string;
  game: Game;
}

interface LadderRound {
  roundNumber: number;
  courts: LadderCourt[];
  completed: boolean;
}

interface LadderWeekData {
  teams: Team[];
  rounds: LadderRound[];
  currentRound: number;
  totalRounds: number;
  teamPoints: Record<string, number>;
  weekNumber: number;
  phase: 'playing' | 'complete';
}

function getPositionDistribution(playersPerTeam: number): { setters: number; hitters: number; liberos: number; defenders: number } {
  if (playersPerTeam === 2) return { setters: 1, hitters: 1, liberos: 0, defenders: 0 };
  if (playersPerTeam === 3) return { setters: 1, hitters: 2, liberos: 0, defenders: 0 };
  if (playersPerTeam === 4) return { setters: 1, hitters: 2, liberos: 1, defenders: 0 };
  if (playersPerTeam === 5) return { setters: 1, hitters: 3, liberos: 1, defenders: 0 };
  return { setters: 1, hitters: 3, liberos: 1, defenders: 1 };
}

function generateDefaultPlayers(settings: LeagueSettings): Player[] {
  const dist = getPositionDistribution(settings.playersPerTeam);
  const players: Player[] = [];
  let id = 1;
  for (let i = 0; i < dist.setters * settings.numTeams; i++) {
    players.push({ id: String(id++), name: `Setter ${i + 1}`, position: 'Setter', seasonWins: 0, seasonLosses: 0 });
  }
  for (let i = 0; i < dist.hitters * settings.numTeams; i++) {
    players.push({ id: String(id++), name: `Hitter ${i + 1}`, position: 'Hitter', seasonWins: 0, seasonLosses: 0 });
  }
  for (let i = 0; i < dist.liberos * settings.numTeams; i++) {
    players.push({ id: String(id++), name: `Libero ${i + 1}`, position: 'Libero', seasonWins: 0, seasonLosses: 0 });
  }
  for (let i = 0; i < dist.defenders * settings.numTeams; i++) {
    players.push({ id: String(id++), name: `Defender ${i + 1}`, position: 'Defender', seasonWins: 0, seasonLosses: 0 });
  }
  return players;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const TEAM_NAMES = ['Team A', 'Team B', 'Team C', 'Team D', 'Team E', 'Team F', 'Team G', 'Team H',
  'Team I', 'Team J', 'Team K', 'Team L'];

function generateTeams(players: Player[], settings: LeagueSettings): Team[] {
  const dist = getPositionDistribution(settings.playersPerTeam);
  const setters = shuffle(players.filter(p => p.position === 'Setter'));
  const hitters = shuffle(players.filter(p => p.position === 'Hitter'));
  const liberos = shuffle(players.filter(p => p.position === 'Libero'));
  const defenders = shuffle(players.filter(p => p.position === 'Defender'));

  const teams: Team[] = [];
  for (let i = 0; i < settings.numTeams; i++) {
    const teamPlayers: Player[] = [];
    for (let s = 0; s < dist.setters; s++) {
      teamPlayers.push(setters[i * dist.setters + s]);
    }
    for (let h = 0; h < dist.hitters; h++) {
      teamPlayers.push(hitters[i * dist.hitters + h]);
    }
    for (let l = 0; l < dist.liberos; l++) {
      teamPlayers.push(liberos[i * dist.liberos + l]);
    }
    for (let d = 0; d < dist.defenders; d++) {
      teamPlayers.push(defenders[i * dist.defenders + d]);
    }
    teams.push({
      id: randomUUID(),
      name: TEAM_NAMES[i] || `Team ${i + 1}`,
      players: teamPlayers,
    });
  }
  return teams;
}

function generateRoundRobinGames(teams: Team[]): Game[] {
  const n = teams.length;
  const fullRounds = n % 2 === 0 ? n - 1 : n;
  const maxRounds = Math.min(n <= 4 ? fullRounds : 4, fullRounds);

  const teamIndices = teams.map((_, i) => i);
  if (n % 2 !== 0) {
    teamIndices.push(-1);
  }
  const numSlots = teamIndices.length;
  const fixed = teamIndices[0];
  const rotating = teamIndices.slice(1);

  const games: Game[] = [];
  let gameNum = 1;

  for (let round = 0; round < maxRounds; round++) {
    const currentOrder = [fixed, ...rotating];
    for (let i = 0; i < numSlots / 2; i++) {
      const a = currentOrder[i];
      const b = currentOrder[numSlots - 1 - i];
      if (a === -1 || b === -1) continue;
      games.push({
        id: randomUUID(),
        team1Id: teams[a].id,
        team2Id: teams[b].id,
        team1Score: null,
        team2Score: null,
        completed: false,
        round: 'roundRobin',
        label: `Round ${round + 1} - Game ${gameNum}`,
      });
      gameNum++;
    }
    rotating.push(rotating.shift()!);
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

function hasSemifinals(numTeams: number): boolean {
  return numTeams >= 4;
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

function generateLadderRound(teams: Team[], roundNumber: number, previousRound?: LadderRound): LadderRound {
  const numCourts = Math.floor(teams.length / 2);

  let courtPairs: [string, string][] = [];

  if (roundNumber === 1 || !previousRound) {
    const ids = shuffle(teams.map(t => t.id));
    for (let c = 0; c < numCourts; c++) {
      courtPairs.push([ids[c * 2], ids[c * 2 + 1]]);
    }
  } else {
    const prevCourts = [...previousRound.courts].sort((a, b) => a.courtNumber - b.courtNumber);
    const winners: string[] = [];
    const losers: string[] = [];
    for (const court of prevCourts) {
      const g = court.game;
      if (g.completed) {
        const w = (g.team1Score ?? 0) > (g.team2Score ?? 0) ? g.team1Id : g.team2Id;
        const l = (g.team1Score ?? 0) > (g.team2Score ?? 0) ? g.team2Id : g.team1Id;
        winners.push(w);
        losers.push(l);
      } else {
        winners.push(court.team1Id);
        losers.push(court.team2Id);
      }
    }

    for (let c = 0; c < numCourts; c++) {
      if (c === 0) {
        courtPairs.push([winners[0], winners[1]]);
      } else if (c === numCourts - 1) {
        courtPairs.push([losers[c - 1], losers[c]]);
      } else {
        courtPairs.push([losers[c - 1], winners[c + 1]]);
      }
    }
  }

  const courts: LadderCourt[] = courtPairs.map((pair, c) => ({
    courtNumber: c + 1,
    team1Id: pair[0],
    team2Id: pair[1],
    game: {
      id: randomUUID(),
      team1Id: pair[0],
      team2Id: pair[1],
      team1Score: null,
      team2Score: null,
      completed: false,
      round: 'roundRobin' as const,
      label: `Court ${c + 1}`,
    },
  }));

  return { roundNumber, courts, completed: false };
}

function getParamId(params: Record<string, string | string[]>, key: string): string {
  const val = params[key];
  return Array.isArray(val) ? val[0] : val;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/leagues", async (req: Request, res: Response) => {
    try {
      const { name, playersPerTeam, numTeams, format } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: "League name is required" });
      }
      const ppt = typeof playersPerTeam === 'number' ? Math.min(6, Math.max(2, Math.round(playersPerTeam))) : 4;
      const nt = typeof numTeams === 'number' ? Math.max(2, Math.round(numTeams)) : 4;
      const fmt: LeagueFormat = format === 'ladder' ? 'ladder' : 'roundRobin';

      if (fmt === 'ladder' && nt % 2 !== 0) {
        return res.status(400).json({ error: "Ladder format requires an even number of teams" });
      }

      const settings: LeagueSettings = { playersPerTeam: ppt, numTeams: nt, format: fmt };
      const players = generateDefaultPlayers(settings);

      const code = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) +
        Math.random().toString(36).substring(2, 6).toUpperCase();
      const league = await storage.createLeague({
        name: name.trim(),
        joinCode: code,
        players,
        settings,
      });
      return res.json({ id: league.id, name: league.name, joinCode: league.joinCode, settings });
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
      const leagueId = parseInt(getParamId(req.params, 'id'));
      const league = await storage.getLeague(leagueId);
      if (!league) return res.status(404).json({ error: "League not found" });
      storage.touchLeague(leagueId).catch(() => {});
      const leagueSettings = (league.settings as LeagueSettings) || { playersPerTeam: 4, numTeams: 4, format: 'roundRobin' };
      const isLadder = leagueSettings.format === 'ladder';
      return res.json({
        id: league.id,
        name: league.name,
        joinCode: league.joinCode,
        players: league.players,
        currentWeek: isLadder ? null : league.currentWeek,
        ladderWeek: isLadder ? league.currentWeek : null,
        history: league.history,
        settings: leagueSettings,
      });
    } catch (e: any) {
      console.error("Get league error:", e);
      return res.status(500).json({ error: "Failed to get league" });
    }
  });

  app.put("/api/leagues/:id/players/:playerId", async (req: Request, res: Response) => {
    try {
      const league = await storage.getLeague(parseInt(getParamId(req.params, 'id')));
      if (!league) return res.status(404).json({ error: "League not found" });
      const { name } = req.body;
      const players = (league.players as Player[]).map(p =>
        p.id === getParamId(req.params, 'playerId') ? { ...p, name } : p
      );
      const currentWeek = league.currentWeek as WeekData | null;
      let updatedWeek = currentWeek;
      if (currentWeek) {
        updatedWeek = {
          ...currentWeek,
          teams: currentWeek.teams.map(team => ({
            ...team,
            players: team.players.map(tp => tp.id === getParamId(req.params, 'playerId') ? { ...tp, name } : tp),
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
      const league = await storage.getLeague(parseInt(getParamId(req.params, 'id')));
      if (!league) return res.status(404).json({ error: "League not found" });
      const players = league.players as Player[];
      const settings = (league.settings as LeagueSettings) || { playersPerTeam: 4, numTeams: 4, format: 'roundRobin' };
      const isLadder = settings.format === 'ladder';
      const currentWeekRaw = league.currentWeek;
      let history = (league.history as any[]) || [];

      if (isLadder) {
        const currentLadder = currentWeekRaw as LadderWeekData | null;
        if (currentLadder && currentLadder.rounds) {
          const anyCompleted = currentLadder.rounds.some(r => r.courts.some(c => c.game.completed));
          if (anyCompleted) {
            history = [...history, {
              weekNumber: currentLadder.weekNumber,
              teams: currentLadder.teams,
              rounds: currentLadder.rounds,
              teamPoints: currentLadder.teamPoints,
              format: 'ladder',
            }];
          }
        }

        const teams = generateTeams(players, settings);
        const firstRound = generateLadderRound(teams, 1);
        const teamPoints: Record<string, number> = {};
        teams.forEach(t => { teamPoints[t.id] = 0; });
        const weekNumber = currentLadder ? currentLadder.weekNumber + 1 : 1;
        const newLadder: LadderWeekData = {
          teams,
          rounds: [firstRound],
          currentRound: 1,
          totalRounds: 6,
          teamPoints,
          weekNumber,
          phase: 'playing',
        };

        await storage.updateLeague(league.id, { currentWeek: newLadder, history });
        return res.json({ ladderWeek: newLadder, history });
      }

      const currentWeek = currentWeekRaw as WeekData | null;
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

      const teams = generateTeams(players, settings);
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
      const league = await storage.getLeague(parseInt(getParamId(req.params, 'id')));
      if (!league) return res.status(404).json({ error: "League not found" });
      const leagueSettings = (league.settings as LeagueSettings) || { playersPerTeam: 4, numTeams: 4, format: 'roundRobin' };
      const isLadder = leagueSettings.format === 'ladder';

      const { player1Id, team1Id, player2Id, team2Id } = req.body;

      if (isLadder) {
        const ladderWeek = league.currentWeek as LadderWeekData | null;
        if (!ladderWeek) return res.status(400).json({ error: "No ladder week active" });

        const swapTeams = (teams: Team[]) => teams.map(team => {
          if (team.id === team1Id) {
            return { ...team, players: team.players.map(p =>
              p.id === player1Id
                ? teams.find(t => t.id === team2Id)!.players.find(p2 => p2.id === player2Id)!
                : p
            )};
          }
          if (team.id === team2Id) {
            return { ...team, players: team.players.map(p =>
              p.id === player2Id
                ? teams.find(t => t.id === team1Id)!.players.find(p1 => p1.id === player1Id)!
                : p
            )};
          }
          return team;
        });

        const updatedTeams = swapTeams(ladderWeek.teams);
        const updatedLadder = { ...ladderWeek, teams: updatedTeams };
        await storage.updateLeague(league.id, { currentWeek: updatedLadder });
        return res.json({ ladderWeek: updatedLadder });
      }

      const currentWeek = league.currentWeek as WeekData | null;
      if (!currentWeek) return res.status(400).json({ error: "No current week" });

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
      const league = await storage.getLeague(parseInt(getParamId(req.params, 'id')));
      if (!league) return res.status(404).json({ error: "League not found" });
      const settings = (league.settings as LeagueSettings) || { playersPerTeam: 4, numTeams: 4 };
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
          if (hasSemifinals(settings.numTeams)) {
            updatedWeek.semifinalGames = generateSemifinals(updatedWeek);
            updatedWeek.phase = 'semifinals';
          } else {
            updatedWeek.phase = 'complete';
          }
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

  app.post("/api/leagues/:id/undo-score", async (req: Request, res: Response) => {
    try {
      const league = await storage.getLeague(parseInt(getParamId(req.params, 'id')));
      if (!league) return res.status(404).json({ error: "League not found" });
      const settings = (league.settings as LeagueSettings) || { playersPerTeam: 4, numTeams: 4 };
      const currentWeek = league.currentWeek as WeekData | null;
      if (!currentWeek) return res.status(400).json({ error: "No current week" });

      const { gameId, round } = req.body;
      let updatedWeek = { ...currentWeek };
      let players = [...(league.players as Player[])];

      const reverseWinLoss = (game: Game) => {
        if (!game.completed) return;
        const winnerId = (game.team1Score ?? 0) > (game.team2Score ?? 0) ? game.team1Id : game.team2Id;
        const loserId = (game.team1Score ?? 0) > (game.team2Score ?? 0) ? game.team2Id : game.team1Id;
        const winningTeam = currentWeek.teams.find(t => t.id === winnerId);
        const losingTeam = currentWeek.teams.find(t => t.id === loserId);
        if (winningTeam && losingTeam) {
          const winnerIds = new Set(winningTeam.players.map(p => p.id));
          const loserIds = new Set(losingTeam.players.map(p => p.id));
          players = players.map(p => {
            if (winnerIds.has(p.id)) return { ...p, seasonWins: Math.max(0, p.seasonWins - 1) };
            if (loserIds.has(p.id)) return { ...p, seasonLosses: Math.max(0, p.seasonLosses - 1) };
            return p;
          });
        }
      };

      if (round === 'roundRobin') {
        const game = currentWeek.games.find(g => g.id === gameId);
        if (!game || !game.completed) return res.status(400).json({ error: "Game not found or not completed" });
        reverseWinLoss(game);
        updatedWeek.games = currentWeek.games.map(g =>
          g.id === gameId ? { ...g, team1Score: null, team2Score: null, completed: false } : g
        );
        if (updatedWeek.phase !== 'roundRobin') {
          updatedWeek.semifinalGames.forEach(g => { if (g.completed) reverseWinLoss(g); });
          updatedWeek.finalGames.forEach(g => { if (g.completed) reverseWinLoss(g); });
          updatedWeek.semifinalGames = [];
          updatedWeek.finalGames = [];
          updatedWeek.phase = 'roundRobin';
        }
      } else if (round === 'semifinal') {
        const game = currentWeek.semifinalGames.find(g => g.id === gameId);
        if (!game || !game.completed) return res.status(400).json({ error: "Game not found or not completed" });
        reverseWinLoss(game);
        updatedWeek.semifinalGames = currentWeek.semifinalGames.map(g =>
          g.id === gameId ? { ...g, team1Score: null, team2Score: null, completed: false } : g
        );
        if (updatedWeek.phase !== 'semifinals') {
          updatedWeek.finalGames.forEach(g => { if (g.completed) reverseWinLoss(g); });
          updatedWeek.finalGames = [];
          updatedWeek.phase = 'semifinals';
        }
      } else if (round === 'final') {
        const game = currentWeek.finalGames.find(g => g.id === gameId);
        if (!game || !game.completed) return res.status(400).json({ error: "Game not found or not completed" });
        reverseWinLoss(game);
        updatedWeek.finalGames = currentWeek.finalGames.map(g =>
          g.id === gameId ? { ...g, team1Score: null, team2Score: null, completed: false } : g
        );
        if (updatedWeek.phase === 'complete') {
          updatedWeek.phase = 'finals';
        }
      }

      await storage.updateLeague(league.id, { currentWeek: updatedWeek, players });
      return res.json({ currentWeek: updatedWeek, players });
    } catch (e: any) {
      console.error("Undo score error:", e);
      return res.status(500).json({ error: "Failed to undo score" });
    }
  });

  app.post("/api/leagues/:id/ladder-score", async (req: Request, res: Response) => {
    try {
      const league = await storage.getLeague(parseInt(getParamId(req.params, 'id')));
      if (!league) return res.status(404).json({ error: "League not found" });
      const ladderWeek = league.currentWeek as LadderWeekData | null;
      if (!ladderWeek || !ladderWeek.rounds) return res.status(400).json({ error: "No ladder week active" });

      const { roundNumber, courtNumber, team1Score, team2Score } = req.body;

      if (team1Score > 21 || team2Score > 21) {
        return res.status(400).json({ error: "Scores go to 21" });
      }
      if (Math.max(team1Score, team2Score) < 21) {
        return res.status(400).json({ error: "Winner must reach at least 21" });
      }
      if (team1Score === team2Score) {
        return res.status(400).json({ error: "Scores cannot be tied" });
      }

      let players = [...(league.players as Player[])];
      const updatedLadder = { ...ladderWeek, rounds: [...ladderWeek.rounds] };
      const roundIdx = updatedLadder.rounds.findIndex(r => r.roundNumber === roundNumber);
      if (roundIdx === -1) return res.status(400).json({ error: "Round not found" });

      const round = { ...updatedLadder.rounds[roundIdx], courts: [...updatedLadder.rounds[roundIdx].courts] };
      const courtIdx = round.courts.findIndex(c => c.courtNumber === courtNumber);
      if (courtIdx === -1) return res.status(400).json({ error: "Court not found" });

      const court = { ...round.courts[courtIdx] };
      court.game = { ...court.game, team1Score, team2Score, completed: true };
      round.courts[courtIdx] = court;

      const winnerId = team1Score > team2Score ? court.team1Id : court.team2Id;
      const loserId = team1Score > team2Score ? court.team2Id : court.team1Id;

      const winningTeam = ladderWeek.teams.find(t => t.id === winnerId);
      const losingTeam = ladderWeek.teams.find(t => t.id === loserId);
      if (winningTeam && losingTeam) {
        const winnerIds = new Set(winningTeam.players.map(p => p.id));
        const loserIds = new Set(losingTeam.players.map(p => p.id));
        players = players.map(p => {
          if (winnerIds.has(p.id)) return { ...p, seasonWins: p.seasonWins + 1 };
          if (loserIds.has(p.id)) return { ...p, seasonLosses: p.seasonLosses + 1 };
          return p;
        });
      }

      const numCourts = Math.floor(ladderWeek.teams.length / 2);
      const updatedPoints = { ...ladderWeek.teamPoints };
      if (roundNumber <= 2) {
        updatedPoints[winnerId] = (updatedPoints[winnerId] || 0) + 2;
      } else {
        const winnerPts = numCourts - courtNumber + 1;
        const loserPts = courtNumber === 1 ? 1 : 0;
        updatedPoints[winnerId] = (updatedPoints[winnerId] || 0) + winnerPts;
        updatedPoints[loserId] = (updatedPoints[loserId] || 0) + loserPts;
      }
      updatedLadder.teamPoints = updatedPoints;

      if (round.courts.every(c => c.game.completed)) {
        round.completed = true;
      }
      updatedLadder.rounds[roundIdx] = round;

      await storage.updateLeague(league.id, { currentWeek: updatedLadder, players });
      return res.json({ ladderWeek: updatedLadder, players });
    } catch (e: any) {
      console.error("Ladder score error:", e);
      return res.status(500).json({ error: "Failed to submit ladder score" });
    }
  });

  app.post("/api/leagues/:id/undo-ladder-score", async (req: Request, res: Response) => {
    try {
      const league = await storage.getLeague(parseInt(getParamId(req.params, 'id')));
      if (!league) return res.status(404).json({ error: "League not found" });
      const ladderWeek = league.currentWeek as LadderWeekData | null;
      if (!ladderWeek || !ladderWeek.rounds) return res.status(400).json({ error: "No ladder week active" });

      const { roundNumber, courtNumber } = req.body;

      const roundIdx = ladderWeek.rounds.findIndex(r => r.roundNumber === roundNumber);
      if (roundIdx === -1) return res.status(400).json({ error: "Round not found" });

      const round = ladderWeek.rounds[roundIdx];
      const courtIdx = round.courts.findIndex(c => c.courtNumber === courtNumber);
      if (courtIdx === -1) return res.status(400).json({ error: "Court not found" });

      const court = round.courts[courtIdx];
      if (!court.game.completed) return res.status(400).json({ error: "Game not completed" });

      if (roundIdx < ladderWeek.rounds.length - 1) {
        return res.status(400).json({ error: "Cannot undo score from a previous round. Undo later rounds first." });
      }

      let players = [...(league.players as Player[])];
      const winnerId = (court.game.team1Score ?? 0) > (court.game.team2Score ?? 0) ? court.team1Id : court.team2Id;
      const loserId = (court.game.team1Score ?? 0) > (court.game.team2Score ?? 0) ? court.team2Id : court.team1Id;

      const winningTeam = ladderWeek.teams.find(t => t.id === winnerId);
      const losingTeam = ladderWeek.teams.find(t => t.id === loserId);
      if (winningTeam && losingTeam) {
        const winnerIds = new Set(winningTeam.players.map(p => p.id));
        const loserIds = new Set(losingTeam.players.map(p => p.id));
        players = players.map(p => {
          if (winnerIds.has(p.id)) return { ...p, seasonWins: Math.max(0, p.seasonWins - 1) };
          if (loserIds.has(p.id)) return { ...p, seasonLosses: Math.max(0, p.seasonLosses - 1) };
          return p;
        });
      }

      const numCourts = Math.floor(ladderWeek.teams.length / 2);
      const updatedPoints = { ...ladderWeek.teamPoints };
      if (roundNumber <= 2) {
        updatedPoints[winnerId] = Math.max(0, (updatedPoints[winnerId] || 0) - 2);
      } else {
        const winnerPts = numCourts - courtNumber + 1;
        const loserPts = courtNumber === 1 ? 1 : 0;
        updatedPoints[winnerId] = Math.max(0, (updatedPoints[winnerId] || 0) - winnerPts);
        updatedPoints[loserId] = Math.max(0, (updatedPoints[loserId] || 0) - loserPts);
      }

      const updatedRounds = [...ladderWeek.rounds];
      const updatedRound = { ...round, courts: [...round.courts] };
      updatedRound.courts[courtIdx] = {
        ...court,
        game: { ...court.game, team1Score: null, team2Score: null, completed: false },
      };
      updatedRound.completed = false;
      updatedRounds[roundIdx] = updatedRound;

      const updatedLadder = { ...ladderWeek, rounds: updatedRounds, teamPoints: updatedPoints };
      await storage.updateLeague(league.id, { currentWeek: updatedLadder, players });
      return res.json({ ladderWeek: updatedLadder, players });
    } catch (e: any) {
      console.error("Undo ladder score error:", e);
      return res.status(500).json({ error: "Failed to undo ladder score" });
    }
  });

  app.post("/api/leagues/:id/ladder-advance", async (req: Request, res: Response) => {
    try {
      const league = await storage.getLeague(parseInt(getParamId(req.params, 'id')));
      if (!league) return res.status(404).json({ error: "League not found" });
      const ladderWeek = league.currentWeek as LadderWeekData | null;
      if (!ladderWeek || !ladderWeek.rounds) return res.status(400).json({ error: "No ladder week active" });

      const currentRound = ladderWeek.rounds[ladderWeek.rounds.length - 1];
      if (!currentRound || !currentRound.completed) {
        return res.status(400).json({ error: "Current round not complete" });
      }

      if (ladderWeek.currentRound >= ladderWeek.totalRounds) {
        const updatedLadder = { ...ladderWeek, phase: 'complete' as const };
        await storage.updateLeague(league.id, { currentWeek: updatedLadder });
        return res.json({ ladderWeek: updatedLadder });
      }

      const nextRound = generateLadderRound(ladderWeek.teams, ladderWeek.currentRound + 1, currentRound);
      const updatedLadder = {
        ...ladderWeek,
        rounds: [...ladderWeek.rounds, nextRound],
        currentRound: ladderWeek.currentRound + 1,
      };

      await storage.updateLeague(league.id, { currentWeek: updatedLadder });
      return res.json({ ladderWeek: updatedLadder });
    } catch (e: any) {
      console.error("Ladder advance error:", e);
      return res.status(500).json({ error: "Failed to advance ladder round" });
    }
  });

  app.post("/api/leagues/:id/history-video", async (req: Request, res: Response) => {
    try {
      const league = await storage.getLeague(parseInt(getParamId(req.params, 'id')));
      if (!league) return res.status(404).json({ error: "League not found" });
      const history = (league.history as any[]) || [];
      const { weekNumber, videoUrl } = req.body;

      const updatedHistory = history.map((entry: any) => {
        if (entry.weekNumber === weekNumber) {
          if (videoUrl === null || videoUrl === '') {
            const { videoUrl: _, ...rest } = entry;
            return rest;
          }
          return { ...entry, videoUrl };
        }
        return entry;
      });

      await storage.updateLeague(league.id, { history: updatedHistory });
      return res.json({ history: updatedHistory });
    } catch (e: any) {
      console.error("Update video URL error:", e);
      return res.status(500).json({ error: "Failed to update video URL" });
    }
  });

  app.post("/api/leagues/:id/reset", async (req: Request, res: Response) => {
    try {
      const league = await storage.getLeague(parseInt(getParamId(req.params, 'id')));
      if (!league) return res.status(404).json({ error: "League not found" });
      const players = (league.players as Player[]).map(p => ({ ...p, seasonWins: 0, seasonLosses: 0 }));
      await storage.updateLeague(league.id, { players, currentWeek: null, history: [] });
      return res.json({ success: true, players });
    } catch (e: any) {
      console.error("Reset error:", e);
      return res.status(500).json({ error: "Failed to reset" });
    }
  });

  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      if (!password || password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Invalid password" });
      }
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/admin/leagues", async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      if (!password || password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const allLeagues = await storage.getAllLeagues();
      const summary = allLeagues.map(l => ({
        id: l.id,
        name: l.name,
        joinCode: l.joinCode,
        playerCount: Array.isArray(l.players) ? (l.players as any[]).length : 0,
        weeksPlayed: Array.isArray(l.history) ? (l.history as any[]).length : 0,
        settings: l.settings || { playersPerTeam: 4, numTeams: 4 },
        createdAt: l.createdAt,
        lastAccessedAt: l.lastAccessedAt,
      }));
      return res.json({ leagues: summary });
    } catch (e: any) {
      console.error("Admin list leagues error:", e);
      return res.status(500).json({ error: "Failed to list leagues" });
    }
  });

  app.post("/api/admin/leagues/:id/delete", async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      if (!password || password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const leagueId = parseInt(getParamId(req.params, 'id'));
      const deleted = await storage.deleteLeague(leagueId);
      if (!deleted) return res.status(404).json({ error: "League not found" });
      return res.json({ success: true });
    } catch (e: any) {
      console.error("Admin delete league error:", e);
      return res.status(500).json({ error: "Failed to delete league" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
