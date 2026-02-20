import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './query-client';

export type Position = 'Setter' | 'Hitter' | 'Libero' | 'Defender';

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
  videoUrl?: string;
}

export interface LeagueSettings {
  playersPerTeam: number;
  numTeams: number;
}

interface LeagueInfo {
  id: number;
  name: string;
  joinCode: string;
}

interface VolleyballContextValue {
  players: Player[];
  currentWeek: WeekData | null;
  history: WeekHistoryEntry[];
  isLoading: boolean;
  league: LeagueInfo | null;
  settings: LeagueSettings;
  updatePlayerName: (id: string, name: string) => void;
  generateNewWeek: () => void;
  swapPlayers: (player1Id: string, team1Id: string, player2Id: string, team2Id: string) => void;
  submitScore: (gameId: string, team1Score: number, team2Score: number, round: 'roundRobin' | 'semifinal' | 'final') => void;
  undoScore: (gameId: string, round: 'roundRobin' | 'semifinal' | 'final') => void;
  resetSeason: () => void;
  updateVideoUrl: (weekNumber: number, videoUrl: string | null) => void;
  getTeamRankings: () => Array<{ team: Team; totalPoints: number; wins: number; losses: number; rank: number }>;
  getPlayerStandings: () => Player[];
  createLeague: (name: string, playersPerTeam?: number, numTeams?: number) => Promise<void>;
  joinLeague: (code: string) => Promise<void>;
  leaveLeague: () => void;
  refreshData: () => Promise<void>;
}

const VolleyballContext = createContext<VolleyballContextValue | null>(null);

const LEAGUE_KEY = 'vb_league_info';
const DEFAULT_SETTINGS: LeagueSettings = { playersPerTeam: 4, numTeams: 4 };

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
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentWeek, setCurrentWeek] = useState<WeekData | null>(null);
  const [history, setHistory] = useState<WeekHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [settings, setSettings] = useState<LeagueSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadLeague();
  }, []);

  const loadLeague = async () => {
    try {
      const stored = await AsyncStorage.getItem(LEAGUE_KEY);
      if (stored) {
        const leagueInfo: LeagueInfo = JSON.parse(stored);
        setLeague(leagueInfo);
        await fetchLeagueData(leagueInfo.id);
      }
    } catch (e) {
      console.error('Failed to load league:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeagueData = async (leagueId: number) => {
    try {
      const res = await apiRequest('GET', `/api/leagues/${leagueId}`);
      const data = await res.json();
      setPlayers(data.players || []);
      setCurrentWeek(data.currentWeek || null);
      setHistory(data.history || []);
      setSettings(data.settings || DEFAULT_SETTINGS);
    } catch (e) {
      console.error('[VB] Failed to fetch league data:', e);
    }
  };

  const refreshData = useCallback(async () => {
    if (league) {
      await fetchLeagueData(league.id);
    }
  }, [league]);

  const createLeague = useCallback(async (name: string, playersPerTeam?: number, numTeams?: number) => {
    const body: any = { name };
    if (playersPerTeam != null) body.playersPerTeam = playersPerTeam;
    if (numTeams != null) body.numTeams = numTeams;
    const res = await apiRequest('POST', '/api/leagues', body);
    const data = await res.json();
    const leagueInfo: LeagueInfo = { id: data.id, name: data.name, joinCode: data.joinCode };
    setLeague(leagueInfo);
    await AsyncStorage.setItem(LEAGUE_KEY, JSON.stringify(leagueInfo));
    await fetchLeagueData(leagueInfo.id);
  }, []);

  const joinLeague = useCallback(async (code: string) => {
    const res = await apiRequest('POST', '/api/leagues/join', { code });
    const data = await res.json();
    const leagueInfo: LeagueInfo = { id: data.id, name: data.name, joinCode: data.joinCode };
    setLeague(leagueInfo);
    await AsyncStorage.setItem(LEAGUE_KEY, JSON.stringify(leagueInfo));
    await fetchLeagueData(leagueInfo.id);
  }, []);

  const leaveLeague = useCallback(() => {
    setLeague(null);
    setPlayers([]);
    setCurrentWeek(null);
    setHistory([]);
    setSettings(DEFAULT_SETTINGS);
    AsyncStorage.removeItem(LEAGUE_KEY);
  }, []);

  const updatePlayerName = useCallback((id: string, name: string) => {
    if (!league) return;
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    setCurrentWeek(prev => {
      if (!prev) return null;
      return {
        ...prev,
        teams: prev.teams.map(team => ({
          ...team,
          players: team.players.map(tp => tp.id === id ? { ...tp, name } : tp),
        })),
      };
    });
    apiRequest('PUT', `/api/leagues/${league.id}/players/${id}`, { name }).catch(console.error);
  }, [league]);

  const generateNewWeek = useCallback(async () => {
    if (!league) return;
    try {
      const res = await apiRequest('POST', `/api/leagues/${league.id}/generate-week`);
      const data = await res.json();
      setCurrentWeek(data.currentWeek);
      setHistory(data.history);
    } catch (e) {
      console.error('Generate week error:', e);
    }
  }, [league]);

  const swapPlayers = useCallback(async (player1Id: string, team1Id: string, player2Id: string, team2Id: string) => {
    if (!league) return;
    try {
      const res = await apiRequest('POST', `/api/leagues/${league.id}/swap-players`, {
        player1Id, team1Id, player2Id, team2Id,
      });
      const data = await res.json();
      setCurrentWeek(data.currentWeek);
    } catch (e) {
      console.error('Swap error:', e);
    }
  }, [league]);

  const submitScore = useCallback(async (gameId: string, team1Score: number, team2Score: number, round: 'roundRobin' | 'semifinal' | 'final') => {
    if (!league) return;
    try {
      const res = await apiRequest('POST', `/api/leagues/${league.id}/submit-score`, {
        gameId, team1Score, team2Score, round,
      });
      const data = await res.json();
      setCurrentWeek(data.currentWeek);
      setPlayers(data.players);
    } catch (e) {
      console.error('Submit score error:', e);
    }
  }, [league]);

  const undoScore = useCallback(async (gameId: string, round: 'roundRobin' | 'semifinal' | 'final') => {
    if (!league) return;
    try {
      const res = await apiRequest('POST', `/api/leagues/${league.id}/undo-score`, {
        gameId, round,
      });
      const data = await res.json();
      setCurrentWeek(data.currentWeek);
      setPlayers(data.players);
    } catch (e) {
      console.error('Undo score error:', e);
    }
  }, [league]);

  const resetSeason = useCallback(async () => {
    if (!league) return;
    try {
      const res = await apiRequest('POST', `/api/leagues/${league.id}/reset`);
      const data = await res.json();
      setPlayers(data.players);
      setCurrentWeek(null);
      setHistory([]);
    } catch (e) {
      console.error('Reset error:', e);
    }
  }, [league]);

  const updateVideoUrl = useCallback(async (weekNumber: number, videoUrl: string | null) => {
    if (!league) return;
    try {
      const res = await apiRequest('POST', `/api/leagues/${league.id}/history-video`, {
        weekNumber, videoUrl,
      });
      const data = await res.json();
      setHistory(data.history);
    } catch (e) {
      console.error('Update video URL error:', e);
    }
  }, [league]);

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
    league,
    settings,
    updatePlayerName,
    generateNewWeek,
    swapPlayers,
    submitScore,
    undoScore,
    resetSeason,
    updateVideoUrl,
    getTeamRankings,
    getPlayerStandings,
    createLeague,
    joinLeague,
    leaveLeague,
    refreshData,
  }), [players, currentWeek, history, isLoading, league, settings, updatePlayerName, generateNewWeek, swapPlayers, submitScore, undoScore, resetSeason, updateVideoUrl, getTeamRankings, getPlayerStandings, createLeague, joinLeague, leaveLeague, refreshData]);

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
