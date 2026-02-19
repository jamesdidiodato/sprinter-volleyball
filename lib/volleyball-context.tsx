import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export type Position = 'Setter' | 'Hitter' | 'Back';

export interface Player {
  id: string;
  name: string;
  position: Position;
  seasonWins: number;
  seasonLosses: number;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
}

export interface Game {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Score: number | null;
  team2Score: number | null;
  completed: boolean;
  round: 'roundRobin' | 'semifinal' | 'final';
  label?: string;
}

export type WeekPhase = 'roundRobin' | 'semifinals' | 'finals' | 'complete';

export interface WeekData {
  teams: Team[];
  games: Game[];
  semifinalGames: Game[];
  finalGames: Game[];
  weekNumber: number;
  phase: WeekPhase;
}

export interface WeekHistoryEntry {
  weekNumber: number;
  teams: Team[];
  games: Game[];
  semifinalGames: Game[];
  finalGames: Game[];
  rankings: Array<{ teamName: string; totalPoints: number; wins: number; losses: number; rank: number }>;
}

interface VolleyballContextValue {
  players: Player[];
  currentWeek: WeekData | null;
  history: WeekHistoryEntry[];
  isLoading: boolean;
  updatePlayerName: (id: string, name: string) => void;
  generateNewWeek: () => void;
  submitScore: (gameId: string, team1Score: number, team2Score: number, round: 'roundRobin' | 'semifinal' | 'final') => void;
  resetSeason: () => void;
  getTeamRankings: () => Array<{ team: Team; totalPoints: number; wins: number; losses: number; rank: number }>;
  getPlayerStandings: () => Player[];
}

const VolleyballContext = createContext<VolleyballContextValue | null>(null);

const STORAGE_KEYS = {
  PLAYERS: 'vb_players',
  CURRENT_WEEK: 'vb_current_week',
  HISTORY: 'vb_history',
};

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
      id: Crypto.randomUUID(),
      name: teamNames[i],
      players: [
        setters[i],
        hitters[i * 2],
        hitters[i * 2 + 1],
        backs[i],
      ],
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
        id: Crypto.randomUUID(),
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

function getRankingsFromGames(teams: Team[], games: Game[]): Array<{ team: Team; totalPoints: number; wins: number; losses: number; rank: number }> {
  const teamStats = teams.map(team => {
    let totalPoints = 0;
    let wins = 0;
    let losses = 0;

    games.forEach(game => {
      if (!game.completed) return;
      if (game.team1Id === team.id) {
        totalPoints += game.team1Score ?? 0;
        if ((game.team1Score ?? 0) > (game.team2Score ?? 0)) wins++;
        else losses++;
      } else if (game.team2Id === team.id) {
        totalPoints += game.team2Score ?? 0;
        if ((game.team2Score ?? 0) > (game.team1Score ?? 0)) wins++;
        else losses++;
      }
    });

    return { team, totalPoints, wins, losses, rank: 0 };
  });

  teamStats.sort((a, b) => b.totalPoints - a.totalPoints);
  teamStats.forEach((s, i) => { s.rank = i + 1; });

  return teamStats;
}

export function VolleyballProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS);
  const [currentWeek, setCurrentWeek] = useState<WeekData | null>(null);
  const [history, setHistory] = useState<WeekHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [playersData, weekData, historyData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PLAYERS),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_WEEK),
        AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
      ]);
      if (playersData) setPlayers(JSON.parse(playersData));
      if (weekData) setCurrentWeek(JSON.parse(weekData));
      if (historyData) setHistory(JSON.parse(historyData));
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const savePlayers = async (p: Player[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(p));
  };

  const saveWeek = async (w: WeekData | null) => {
    if (w) {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_WEEK, JSON.stringify(w));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_WEEK);
    }
  };

  const saveHistory = async (h: WeekHistoryEntry[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(h));
  };

  const updatePlayerName = useCallback((id: string, name: string) => {
    setPlayers(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, name } : p);
      savePlayers(updated);

      setCurrentWeek(prevWeek => {
        if (!prevWeek) return null;
        const updateTeamPlayers = (teams: Team[]) => teams.map(team => ({
          ...team,
          players: team.players.map(tp => tp.id === id ? { ...tp, name } : tp),
        }));
        const updatedWeek = {
          ...prevWeek,
          teams: updateTeamPlayers(prevWeek.teams),
        };
        saveWeek(updatedWeek);
        return updatedWeek;
      });

      return updated;
    });
  }, []);

  const generateNewWeek = useCallback(() => {
    if (currentWeek) {
      const allGames = [...currentWeek.games, ...currentWeek.semifinalGames, ...currentWeek.finalGames];
      const completedGames = allGames.filter(g => g.completed);
      if (completedGames.length > 0) {
        const rankings = getRankingsFromGames(currentWeek.teams, currentWeek.games);
        const entry: WeekHistoryEntry = {
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
        };
        setHistory(prevHistory => {
          const updated = [...prevHistory, entry];
          saveHistory(updated);
          return updated;
        });
      }
    }

    const teams = generateTeams(players);
    const games = generateRoundRobinGames(teams);
    const weekNumber = currentWeek ? currentWeek.weekNumber + 1 : 1;
    const newWeek: WeekData = {
      teams,
      games,
      semifinalGames: [],
      finalGames: [],
      weekNumber,
      phase: 'roundRobin',
    };
    setCurrentWeek(newWeek);
    saveWeek(newWeek);
  }, [currentWeek, players]);

  const applyWinLoss = useCallback((winnerId: string, loserId: string, teams: Team[]) => {
    const winningTeam = teams.find(t => t.id === winnerId);
    const losingTeam = teams.find(t => t.id === loserId);

    if (winningTeam && losingTeam) {
      setPlayers(prevPlayers => {
        const winnerIds = new Set(winningTeam.players.map(p => p.id));
        const loserIds = new Set(losingTeam.players.map(p => p.id));
        const updated = prevPlayers.map(p => {
          if (winnerIds.has(p.id)) return { ...p, seasonWins: p.seasonWins + 1 };
          if (loserIds.has(p.id)) return { ...p, seasonLosses: p.seasonLosses + 1 };
          return p;
        });
        savePlayers(updated);
        return updated;
      });
    }
  }, []);

  const generateSemifinals = useCallback((week: WeekData): Game[] => {
    const rankings = getRankingsFromGames(week.teams, week.games);
    const rank1 = rankings.find(r => r.rank === 1)!;
    const rank2 = rankings.find(r => r.rank === 2)!;
    const rank3 = rankings.find(r => r.rank === 3)!;
    const rank4 = rankings.find(r => r.rank === 4)!;

    return [
      {
        id: Crypto.randomUUID(),
        team1Id: rank1.team.id,
        team2Id: rank4.team.id,
        team1Score: null,
        team2Score: null,
        completed: false,
        round: 'semifinal' as const,
        label: `#1 ${rank1.team.name} vs #4 ${rank4.team.name}`,
      },
      {
        id: Crypto.randomUUID(),
        team1Id: rank2.team.id,
        team2Id: rank3.team.id,
        team1Score: null,
        team2Score: null,
        completed: false,
        round: 'semifinal' as const,
        label: `#2 ${rank2.team.name} vs #3 ${rank3.team.name}`,
      },
    ];
  }, []);

  const generateFinals = useCallback((week: WeekData): Game[] => {
    const semi1 = week.semifinalGames[0];
    const semi2 = week.semifinalGames[1];

    const winner1Id = (semi1.team1Score ?? 0) > (semi1.team2Score ?? 0) ? semi1.team1Id : semi1.team2Id;
    const loser1Id = (semi1.team1Score ?? 0) > (semi1.team2Score ?? 0) ? semi1.team2Id : semi1.team1Id;
    const winner2Id = (semi2.team1Score ?? 0) > (semi2.team2Score ?? 0) ? semi2.team1Id : semi2.team2Id;
    const loser2Id = (semi2.team1Score ?? 0) > (semi2.team2Score ?? 0) ? semi2.team2Id : semi2.team1Id;

    const getTeamName = (id: string) => week.teams.find(t => t.id === id)?.name ?? '?';

    return [
      {
        id: Crypto.randomUUID(),
        team1Id: winner1Id,
        team2Id: winner2Id,
        team1Score: null,
        team2Score: null,
        completed: false,
        round: 'final' as const,
        label: `Championship: ${getTeamName(winner1Id)} vs ${getTeamName(winner2Id)}`,
      },
      {
        id: Crypto.randomUUID(),
        team1Id: loser1Id,
        team2Id: loser2Id,
        team1Score: null,
        team2Score: null,
        completed: false,
        round: 'final' as const,
        label: `3rd Place: ${getTeamName(loser1Id)} vs ${getTeamName(loser2Id)}`,
      },
    ];
  }, []);

  const submitScore = useCallback((gameId: string, team1Score: number, team2Score: number, round: 'roundRobin' | 'semifinal' | 'final') => {
    setCurrentWeek(prev => {
      if (!prev) return null;

      let updatedWeek = { ...prev };

      if (round === 'roundRobin') {
        const updatedGames = prev.games.map(g =>
          g.id === gameId ? { ...g, team1Score, team2Score, completed: true } : g
        );
        updatedWeek.games = updatedGames;

        const game = updatedGames.find(g => g.id === gameId)!;
        const winnerId = team1Score > team2Score ? game.team1Id : game.team2Id;
        const loserId = team1Score > team2Score ? game.team2Id : game.team1Id;
        applyWinLoss(winnerId, loserId, prev.teams);

        const allRoundRobinDone = updatedGames.every(g => g.completed);
        if (allRoundRobinDone) {
          const semis = generateSemifinals(updatedWeek);
          updatedWeek.semifinalGames = semis;
          updatedWeek.phase = 'semifinals';
        }
      } else if (round === 'semifinal') {
        const updatedSemis = prev.semifinalGames.map(g =>
          g.id === gameId ? { ...g, team1Score, team2Score, completed: true } : g
        );
        updatedWeek.semifinalGames = updatedSemis;

        const game = updatedSemis.find(g => g.id === gameId)!;
        const winnerId = team1Score > team2Score ? game.team1Id : game.team2Id;
        const loserId = team1Score > team2Score ? game.team2Id : game.team1Id;
        applyWinLoss(winnerId, loserId, prev.teams);

        const allSemisDone = updatedSemis.every(g => g.completed);
        if (allSemisDone) {
          updatedWeek.semifinalGames = updatedSemis;
          const finals = generateFinals({ ...updatedWeek, semifinalGames: updatedSemis });
          updatedWeek.finalGames = finals;
          updatedWeek.phase = 'finals';
        }
      } else if (round === 'final') {
        const updatedFinals = prev.finalGames.map(g =>
          g.id === gameId ? { ...g, team1Score, team2Score, completed: true } : g
        );
        updatedWeek.finalGames = updatedFinals;

        const game = updatedFinals.find(g => g.id === gameId)!;
        const winnerId = team1Score > team2Score ? game.team1Id : game.team2Id;
        const loserId = team1Score > team2Score ? game.team2Id : game.team1Id;
        applyWinLoss(winnerId, loserId, prev.teams);

        const allFinalsDone = updatedFinals.every(g => g.completed);
        if (allFinalsDone) {
          updatedWeek.phase = 'complete';
        }
      }

      saveWeek(updatedWeek);
      return updatedWeek;
    });
  }, [applyWinLoss, generateSemifinals, generateFinals]);

  const resetSeason = useCallback(() => {
    const resetPlayers = players.map(p => ({ ...p, seasonWins: 0, seasonLosses: 0 }));
    setPlayers(resetPlayers);
    setCurrentWeek(null);
    setHistory([]);
    savePlayers(resetPlayers);
    saveWeek(null);
    saveHistory([]);
  }, [players]);

  const getTeamRankings = useCallback(() => {
    if (!currentWeek) return [];
    return getRankingsFromGames(currentWeek.teams, currentWeek.games);
  }, [currentWeek]);

  const getPlayerStandings = useCallback(() => {
    return [...players].sort((a, b) => {
      const aTotal = a.seasonWins + a.seasonLosses;
      const bTotal = b.seasonWins + b.seasonLosses;
      const aWinPct = aTotal > 0 ? a.seasonWins / aTotal : 0;
      const bWinPct = bTotal > 0 ? b.seasonWins / bTotal : 0;
      if (bWinPct !== aWinPct) return bWinPct - aWinPct;
      return b.seasonWins - a.seasonWins;
    });
  }, [players]);

  const value = useMemo(() => ({
    players,
    currentWeek,
    history,
    isLoading,
    updatePlayerName,
    generateNewWeek,
    submitScore,
    resetSeason,
    getTeamRankings,
    getPlayerStandings,
  }), [players, currentWeek, history, isLoading, updatePlayerName, generateNewWeek, submitScore, resetSeason, getTeamRankings, getPlayerStandings]);

  return (
    <VolleyballContext.Provider value={value}>
      {children}
    </VolleyballContext.Provider>
  );
}

export function useVolleyball() {
  const context = useContext(VolleyballContext);
  if (!context) throw new Error('useVolleyball must be used within VolleyballProvider');
  return context;
}
