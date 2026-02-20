import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  useColorScheme,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useVolleyball, Game } from '@/lib/volleyball-context';

function GameScoreCard({ game, teams, onSubmit, onUndo, round }: {
  game: Game;
  teams: any[];
  onSubmit: (gameId: string, s1: number, s2: number, round: 'roundRobin' | 'semifinal' | 'final') => void;
  onUndo: (gameId: string, round: 'roundRobin' | 'semifinal' | 'final') => void;
  round: 'roundRobin' | 'semifinal' | 'final';
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const team1 = teams.find(t => t.id === game.team1Id);
  const team2 = teams.find(t => t.id === game.team2Id);

  const [score1, setScore1] = useState(game.team1Score?.toString() ?? '');
  const [score2, setScore2] = useState(game.team2Score?.toString() ?? '');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const s1 = parseInt(score1, 10);
    const s2 = parseInt(score2, 10);

    if (isNaN(s1) || isNaN(s2)) {
      setError('Enter valid scores');
      return;
    }
    if (s1 < 0 || s2 < 0) {
      setError('Scores must be positive');
      return;
    }
    if (s1 > 21 || s2 > 21) {
      setError('Scores go to 21');
      return;
    }
    if (Math.max(s1, s2) < 21) {
      setError('Winner must reach at least 21');
      return;
    }
    if (s1 === s2) {
      setError('Scores cannot be tied');
      return;
    }

    setError('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(game.id, s1, s2, round);
  };

  if (game.completed) {
    const t1Won = (game.team1Score ?? 0) > (game.team2Score ?? 0);
    return (
      <View style={[styles.gameCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.completedRow}>
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={theme.success} />
            <Text style={[styles.completedText, { color: theme.success }]}>Final</Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onUndo(game.id, round); }}
            style={({ pressed }) => [
              styles.undoBtn,
              { backgroundColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="arrow-undo" size={14} color={theme.textSecondary} />
            <Text style={[styles.undoBtnText, { color: theme.textSecondary }]}>Undo</Text>
          </Pressable>
        </View>
        <View style={styles.matchupRow}>
          <View style={styles.teamScoreCol}>
            <Text style={[styles.matchTeamName, { color: t1Won ? theme.tint : theme.textSecondary }]} numberOfLines={1}>
              {team1?.name ?? '?'}
            </Text>
            <Text style={[styles.finalScore, { color: t1Won ? theme.tint : theme.textSecondary }]}>
              {game.team1Score}
            </Text>
          </View>
          <Text style={[styles.vs, { color: theme.textSecondary }]}>-</Text>
          <View style={styles.teamScoreCol}>
            <Text style={[styles.matchTeamName, { color: !t1Won ? theme.tint : theme.textSecondary }]} numberOfLines={1}>
              {team2?.name ?? '?'}
            </Text>
            <Text style={[styles.finalScore, { color: !t1Won ? theme.tint : theme.textSecondary }]}>
              {game.team2Score}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.gameCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.matchupRow}>
        <View style={styles.teamScoreCol}>
          <Text style={[styles.matchTeamName, { color: theme.text }]} numberOfLines={1}>{team1?.name ?? '?'}</Text>
          <TextInput
            style={[styles.scoreInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            value={score1}
            onChangeText={setScore1}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            maxLength={3}
            textAlign="center"
          />
        </View>
        <Text style={[styles.vs, { color: theme.textSecondary }]}>vs</Text>
        <View style={styles.teamScoreCol}>
          <Text style={[styles.matchTeamName, { color: theme.text }]} numberOfLines={1}>{team2?.name ?? '?'}</Text>
          <TextInput
            style={[styles.scoreInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            value={score2}
            onChangeText={setScore2}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            maxLength={3}
            textAlign="center"
          />
        </View>
      </View>
      {!!error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
      <Pressable
        onPress={handleSubmit}
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        <Ionicons name="checkmark" size={20} color="#FFF" />
        <Text style={styles.saveBtnText}>Save Score</Text>
      </Pressable>
    </View>
  );
}

function RoundSection({ title, subtitle, games, teams, onSubmit, onUndo, round, accentColor }: {
  title: string;
  subtitle?: string;
  games: Game[];
  teams: any[];
  onSubmit: (gameId: string, s1: number, s2: number, round: 'roundRobin' | 'semifinal' | 'final') => void;
  onUndo: (gameId: string, round: 'roundRobin' | 'semifinal' | 'final') => void;
  round: 'roundRobin' | 'semifinal' | 'final';
  accentColor: string;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  if (games.length === 0) return null;

  return (
    <View style={styles.roundSection}>
      <View style={[styles.roundHeader, { borderLeftColor: accentColor }]}>
        <Text style={[styles.roundTitle, { color: theme.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.roundSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
      {games.map((game, i) => (
        <View key={game.id}>
          <Text style={[styles.gameLabel, { color: theme.textSecondary }]}>
            {game.label ?? `Game ${i + 1}`}
          </Text>
          <GameScoreCard game={game} teams={teams} onSubmit={onSubmit} onUndo={onUndo} round={round} />
        </View>
      ))}
    </View>
  );
}

export default function ScoresScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { currentWeek, submitScore, undoScore } = useVolleyball();

  if (!currentWeek) {
    return (
      <View style={[styles.container, styles.emptyContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.emptyContent, { paddingTop: Platform.OS === 'web' ? 67 : 0 }]}>
          <Ionicons name="clipboard-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Games Yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Generate teams first from the Teams tab
          </Text>
        </View>
      </View>
    );
  }

  const rrCompleted = currentWeek.games.filter(g => g.completed).length;
  const rrTotal = currentWeek.games.length;
  const semiCompleted = currentWeek.semifinalGames.filter(g => g.completed).length;
  const semiTotal = currentWeek.semifinalGames.length;
  const finalCompleted = currentWeek.finalGames.filter(g => g.completed).length;
  const finalTotal = currentWeek.finalGames.length;
  const totalGames = rrTotal + semiTotal + finalTotal;
  const totalCompleted = rrCompleted + semiCompleted + finalCompleted;

  const phaseLabel = {
    roundRobin: 'Round Robin',
    semifinals: 'Semifinals',
    finals: 'Finals',
    complete: 'Week Complete',
  }[currentWeek.phase];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 16, paddingBottom: Platform.OS === 'web' ? 34 + 100 : 350 }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
        <Text style={[styles.title, { color: theme.text }]}>Enter Scores</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Week {currentWeek.weekNumber}
          </Text>
          <View style={[styles.phasePill, { backgroundColor: theme.tint + '20' }]}>
            <Text style={[styles.phaseText, { color: theme.tint }]}>{phaseLabel}</Text>
          </View>
        </View>

        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.tint, width: `${totalGames > 0 ? (totalCompleted / totalGames) * 100 : 0}%` as any }]} />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {totalCompleted} of {totalGames} games completed
        </Text>

        {currentWeek.phase === 'complete' && (
          <View style={[styles.allDoneBanner, { backgroundColor: theme.success + '20', borderColor: theme.success }]}>
            <Ionicons name="trophy" size={20} color={theme.success} />
            <Text style={[styles.allDoneText, { color: theme.success }]}>
              Week complete! Generate a new week from the Teams tab.
            </Text>
          </View>
        )}

        <RoundSection
          title="Round Robin"
          subtitle="All teams play each other"
          games={currentWeek.games}
          teams={currentWeek.teams}
          onSubmit={submitScore}
          onUndo={undoScore}
          round="roundRobin"
          accentColor={theme.tint}
        />

        {currentWeek.semifinalGames.length > 0 && (
          <RoundSection
            title="Semifinals"
            subtitle="#1 vs #4 and #2 vs #3"
            games={currentWeek.semifinalGames}
            teams={currentWeek.teams}
            onSubmit={submitScore}
            onUndo={undoScore}
            round="semifinal"
            accentColor={theme.setter}
          />
        )}

        {currentWeek.finalGames.length > 0 && (
          <RoundSection
            title="Finals"
            subtitle="Championship & 3rd Place"
            games={currentWeek.finalGames}
            teams={currentWeek.teams}
            onSubmit={submitScore}
            onUndo={undoScore}
            round="final"
            accentColor={theme.success}
          />
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { justifyContent: 'center', alignItems: 'center' },
  emptyContent: { alignItems: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  emptySubtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  content: { paddingHorizontal: 16 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  phasePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  phaseText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 20 },
  allDoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  allDoneText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  roundSection: { marginBottom: 28 },
  roundHeader: { borderLeftWidth: 4, paddingLeft: 12, marginBottom: 16 },
  roundTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  roundSubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  gameLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 6, textTransform: 'uppercase' as const },
  gameCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  matchupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamScoreCol: { flex: 1, alignItems: 'center', gap: 8 },
  matchTeamName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  vs: { fontSize: 14, fontFamily: 'Inter_700Bold', marginHorizontal: 12 },
  scoreInput: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    width: 70,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
  },
  finalScore: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  undoBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
