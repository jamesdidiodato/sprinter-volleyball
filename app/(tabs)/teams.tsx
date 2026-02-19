import React, { useState, useEffect } from 'react';
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
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withDelay, FadeIn } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useVolleyball, Team } from '@/lib/volleyball-context';

const POSITION_LABELS: Record<string, string> = { Setter: 'S', Hitter: 'H', Back: 'B' };

function TeamCard({ team, index }: { team: Team; index: number }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 150, withSpring(1, { damping: 12 }));
    opacity.value = withDelay(index * 150, withSpring(1));
  }, [team.id]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const teamColors = ['#F57C24', '#5C6BC0', '#26A69A', '#EF5350'];
  const accent = teamColors[index % 4];

  return (
    <Animated.View style={[styles.teamCard, { backgroundColor: theme.card, borderColor: theme.border }, animStyle]}>
      <View style={[styles.teamHeader, { borderBottomColor: theme.border }]}>
        <View style={[styles.teamDot, { backgroundColor: accent }]} />
        <Text style={[styles.teamName, { color: theme.text }]}>{team.name}</Text>
      </View>
      {team.players.map(player => {
        const posColor = theme[player.position.toLowerCase() as 'setter' | 'hitter' | 'back'];
        return (
          <View key={player.id} style={styles.playerItem}>
            <View style={[styles.miniPosBadge, { backgroundColor: posColor }]}>
              <Text style={styles.miniPosText}>{POSITION_LABELS[player.position]}</Text>
            </View>
            <Text style={[styles.playerItemName, { color: theme.text }]} numberOfLines={1}>{player.name}</Text>
          </View>
        );
      })}
    </Animated.View>
  );
}

export default function TeamsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { currentWeek, generateNewWeek, getTeamRankings } = useVolleyball();

  const handleGenerate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    generateNewWeek();
  };

  const rankings = getTeamRankings();
  const hasCompletedGames = currentWeek?.games.some(g => g.completed) ?? false;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 16, paddingBottom: Platform.OS === 'web' ? 34 + 100 : 120 }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.text }]}>Weekly Teams</Text>
      {currentWeek && (
        <Text style={[styles.weekLabel, { color: theme.tint }]}>
          Week {currentWeek.weekNumber}
        </Text>
      )}

      <Pressable
        onPress={handleGenerate}
        style={({ pressed }) => [
          styles.generateBtn,
          { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        <Ionicons name="shuffle" size={22} color="#FFF" />
        <Text style={styles.generateText}>Generate New Week</Text>
      </Pressable>

      {!currentWeek && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Tap the button above to generate this week's teams
          </Text>
        </View>
      )}

      {currentWeek && (
        <View style={styles.teamsGrid}>
          {currentWeek.teams.map((team, i) => (
            <TeamCard key={team.id} team={team} index={i} />
          ))}
        </View>
      )}

      {hasCompletedGames && (
        <View style={styles.rankingsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Weekly Rankings</Text>
          <View style={[styles.rankTable, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.rankHeaderRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.rankHeaderCell, styles.rankCol, { color: theme.textSecondary }]}>#</Text>
              <Text style={[styles.rankHeaderCell, styles.teamCol, { color: theme.textSecondary }]}>Team</Text>
              <Text style={[styles.rankHeaderCell, styles.statCol, { color: theme.textSecondary }]}>Pts</Text>
              <Text style={[styles.rankHeaderCell, styles.statCol, { color: theme.textSecondary }]}>W</Text>
              <Text style={[styles.rankHeaderCell, styles.statCol, { color: theme.textSecondary }]}>L</Text>
            </View>
            {rankings.map((r) => (
              <View key={r.team.id} style={[styles.rankRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.rankCell, styles.rankCol, { color: theme.tint, fontFamily: 'Inter_700Bold' }]}>{r.rank}</Text>
                <Text style={[styles.rankCell, styles.teamCol, { color: theme.text }]} numberOfLines={1}>{r.team.name}</Text>
                <Text style={[styles.rankCell, styles.statCol, { color: theme.text }]}>{r.totalPoints}</Text>
                <Text style={[styles.rankCell, styles.statCol, { color: theme.success }]}>{r.wins}</Text>
                <Text style={[styles.rankCell, styles.statCol, { color: theme.error }]}>{r.losses}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  weekLabel: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 16 },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 24,
  },
  generateText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_700Bold' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', maxWidth: 240 },
  teamsGrid: { gap: 12 },
  teamCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  teamDot: { width: 10, height: 10, borderRadius: 5 },
  teamName: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  playerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  miniPosBadge: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  miniPosText: { color: '#FFF', fontSize: 11, fontFamily: 'Inter_700Bold' },
  playerItemName: { fontSize: 15, fontFamily: 'Inter_400Regular', flex: 1 },
  rankingsSection: { marginTop: 28 },
  sectionTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  rankTable: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  rankHeaderRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1 },
  rankHeaderCell: { fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase' as const },
  rankRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 0.5 },
  rankCell: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  rankCol: { width: 30 },
  teamCol: { flex: 1 },
  statCol: { width: 40, textAlign: 'center' as const },
});
