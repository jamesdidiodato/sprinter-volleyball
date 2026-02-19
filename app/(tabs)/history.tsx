import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useVolleyball, WeekHistoryEntry, Game } from '@/lib/volleyball-context';

function GameResultRow({ game, teams, theme }: { game: Game; teams: any[]; theme: any }) {
  if (!game.completed) return null;
  const team1 = teams.find(t => t.id === game.team1Id);
  const team2 = teams.find(t => t.id === game.team2Id);
  const t1Won = (game.team1Score ?? 0) > (game.team2Score ?? 0);

  return (
    <View style={[styles.gameResultRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.grTeamName, { color: t1Won ? theme.tint : theme.textSecondary, fontFamily: t1Won ? 'Inter_700Bold' : 'Inter_400Regular' }]} numberOfLines={1}>
        {team1?.name ?? '?'}
      </Text>
      <Text style={[styles.grScore, { color: theme.text }]}>{game.team1Score}</Text>
      <Text style={[styles.grDash, { color: theme.textSecondary }]}>-</Text>
      <Text style={[styles.grScore, { color: theme.text }]}>{game.team2Score}</Text>
      <Text style={[styles.grTeamName, styles.grTeamRight, { color: !t1Won ? theme.tint : theme.textSecondary, fontFamily: !t1Won ? 'Inter_700Bold' : 'Inter_400Regular' }]} numberOfLines={1}>
        {team2?.name ?? '?'}
      </Text>
    </View>
  );
}

function WeekCard({ entry }: { entry: WeekHistoryEntry }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const [expanded, setExpanded] = useState(false);

  const rrGames = entry.games.filter(g => g.completed);
  const semiGames = entry.semifinalGames.filter(g => g.completed);
  const finalGames = entry.finalGames.filter(g => g.completed);
  const totalGames = rrGames.length + semiGames.length + finalGames.length;

  return (
    <View style={[styles.weekCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        onPress={() => { setExpanded(!expanded); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        style={styles.weekCardHeader}
      >
        <View style={styles.weekTitleRow}>
          <Text style={[styles.weekTitle, { color: theme.text }]}>Week {entry.weekNumber}</Text>
          <Text style={[styles.weekGameCount, { color: theme.textSecondary }]}>
            {totalGames} games
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>

      {!expanded && (
        <View style={styles.weekSummary}>
          {entry.rankings.slice(0, 4).map((r, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={[styles.summaryRank, { color: i === 0 ? theme.tint : theme.textSecondary }]}>
                #{r.rank}
              </Text>
              <Text style={[styles.summaryTeam, { color: theme.text }]} numberOfLines={1}>
                {r.teamName}
              </Text>
              <Text style={[styles.summaryPts, { color: theme.textSecondary }]}>
                {r.totalPoints} pts
              </Text>
            </View>
          ))}
        </View>
      )}

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={[styles.rankingsTable, { borderTopColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>RANKINGS</Text>
            {entry.rankings.map((r, i) => (
              <View key={i} style={[styles.rankRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.rankNum, { color: theme.tint }]}>#{r.rank}</Text>
                <Text style={[styles.rankTeam, { color: theme.text }]} numberOfLines={1}>{r.teamName}</Text>
                <Text style={[styles.rankStat, { color: theme.success }]}>{r.wins}W</Text>
                <Text style={[styles.rankStat, { color: theme.error }]}>{r.losses}L</Text>
                <Text style={[styles.rankPts, { color: theme.textSecondary }]}>{r.totalPoints}pts</Text>
              </View>
            ))}
          </View>

          {rrGames.length > 0 && (
            <View style={styles.gamesSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ROUND ROBIN</Text>
              {rrGames.map(game => (
                <GameResultRow key={game.id} game={game} teams={entry.teams} theme={theme} />
              ))}
            </View>
          )}

          {semiGames.length > 0 && (
            <View style={styles.gamesSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>SEMIFINALS</Text>
              {semiGames.map(game => (
                <GameResultRow key={game.id} game={game} teams={entry.teams} theme={theme} />
              ))}
            </View>
          )}

          {finalGames.length > 0 && (
            <View style={styles.gamesSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>FINALS</Text>
              {finalGames.map(game => (
                <GameResultRow key={game.id} game={game} teams={entry.teams} theme={theme} />
              ))}
            </View>
          )}

          <View style={styles.teamsSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>TEAMS</Text>
            {entry.teams.map(team => (
              <View key={team.id} style={styles.teamBlock}>
                <Text style={[styles.teamBlockName, { color: theme.text }]}>{team.name}</Text>
                <Text style={[styles.teamPlayers, { color: theme.textSecondary }]}>
                  {team.players.map(p => p.name).join(', ')}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { history } = useVolleyball();

  const reversedHistory = [...history].reverse();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 16, paddingBottom: Platform.OS === 'web' ? 34 + 100 : 120 }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.text }]}>History</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        {history.length} {history.length === 1 ? 'week' : 'weeks'} played
      </Text>

      {history.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Past weeks will appear here after you generate a new week
          </Text>
        </View>
      )}

      {reversedHistory.map((entry) => (
        <WeekCard key={entry.weekNumber} entry={entry} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 20 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', maxWidth: 240 },
  weekCard: { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  weekCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  weekTitleRow: { flex: 1 },
  weekTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  weekGameCount: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  weekSummary: { paddingHorizontal: 16, paddingBottom: 14, gap: 6 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryRank: { fontSize: 13, fontFamily: 'Inter_700Bold', width: 24 },
  summaryTeam: { fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1 },
  summaryPts: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  expandedContent: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  rankingsTable: { borderTopWidth: 1 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, gap: 8 },
  rankNum: { fontSize: 14, fontFamily: 'Inter_700Bold', width: 28 },
  rankTeam: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  rankStat: { fontSize: 13, fontFamily: 'Inter_600SemiBold', width: 28 },
  rankPts: { fontSize: 13, fontFamily: 'Inter_400Regular', width: 40, textAlign: 'right' as const },
  gamesSection: {},
  gameResultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5 },
  grTeamName: { fontSize: 14, flex: 1 },
  grTeamRight: { textAlign: 'right' as const },
  grScore: { fontSize: 16, fontFamily: 'Inter_700Bold', width: 30, textAlign: 'center' as const },
  grDash: { fontSize: 14, marginHorizontal: 4 },
  teamsSection: {},
  teamBlock: { marginBottom: 10 },
  teamBlockName: { fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  teamPlayers: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
