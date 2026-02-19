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
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useVolleyball, Game } from '@/lib/volleyball-context';

function GameScoreCard({ game, teams, onSubmit }: {
  game: Game;
  teams: any[];
  onSubmit: (gameId: string, s1: number, s2: number) => void;
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

    const maxScore = Math.max(s1, s2);
    if (maxScore < 21) {
      setError('Winner must reach at least 21');
      return;
    }

    if (s1 === s2) {
      setError('Scores cannot be tied');
      return;
    }

    setError('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(game.id, s1, s2);
  };

  if (game.completed) {
    const t1Won = (game.team1Score ?? 0) > (game.team2Score ?? 0);
    return (
      <View style={[styles.gameCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={theme.success} />
          <Text style={[styles.completedText, { color: theme.success }]}>Final</Text>
        </View>
        <View style={styles.matchupRow}>
          <View style={[styles.teamScoreCol, t1Won && styles.winnerCol]}>
            <Text style={[styles.matchTeamName, { color: t1Won ? theme.tint : theme.textSecondary }]} numberOfLines={1}>
              {team1?.name ?? '?'}
            </Text>
            <Text style={[styles.finalScore, { color: t1Won ? theme.tint : theme.textSecondary }]}>
              {game.team1Score}
            </Text>
          </View>
          <Text style={[styles.vs, { color: theme.textSecondary }]}>-</Text>
          <View style={[styles.teamScoreCol, !t1Won && styles.winnerCol]}>
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

export default function ScoresScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { currentWeek, submitScore } = useVolleyball();

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

  const completedCount = currentWeek.games.filter(g => g.completed).length;
  const totalGames = currentWeek.games.length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[styles.content, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 16, paddingBottom: Platform.OS === 'web' ? 34 + 100 : 120 }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text }]}>Enter Scores</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Week {currentWeek.weekNumber}
        </Text>

        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.tint, width: `${(completedCount / totalGames) * 100}%` as any }]} />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {completedCount} of {totalGames} games completed
        </Text>

        {currentWeek.allGamesCompleted && (
          <View style={[styles.allDoneBanner, { backgroundColor: theme.success + '20', borderColor: theme.success }]}>
            <Ionicons name="trophy" size={20} color={theme.success} />
            <Text style={[styles.allDoneText, { color: theme.success }]}>All games complete! Check rankings on the Teams tab.</Text>
          </View>
        )}

        <View style={styles.gamesContainer}>
          {currentWeek.games.map((game, i) => (
            <View key={game.id}>
              <Text style={[styles.gameLabel, { color: theme.textSecondary }]}>Game {i + 1}</Text>
              <GameScoreCard game={game} teams={currentWeek.teams} onSubmit={submitScore} />
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 16 },
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
  gamesContainer: { gap: 16 },
  gameLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 6, textTransform: 'uppercase' as const },
  gameCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  matchupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamScoreCol: { flex: 1, alignItems: 'center', gap: 8 },
  winnerCol: {},
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
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    alignSelf: 'flex-end',
  },
  completedText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
