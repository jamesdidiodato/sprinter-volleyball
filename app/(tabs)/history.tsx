import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  TextInput,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useVolleyball, WeekHistoryEntry, Game, LadderRound } from '@/lib/volleyball-context';

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

function VideoSection({ entry, theme }: { entry: WeekHistoryEntry; theme: any }) {
  const { updateVideoUrl } = useVolleyball();
  const [editing, setEditing] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState('');

  const videoId = entry.videoUrl ? extractYouTubeId(entry.videoUrl) : null;
  const hasVideo = !!entry.videoUrl && !!videoId;

  const handleSave = () => {
    if (!inputUrl.trim()) {
      setError('');
      setEditing(false);
      return;
    }
    if (!isValidYouTubeUrl(inputUrl.trim())) {
      setError('Please enter a valid YouTube link.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateVideoUrl(entry.weekNumber, inputUrl.trim());
    setEditing(false);
    setError('');
    setInputUrl('');
  };

  const handleRemove = () => {
    if (Platform.OS === 'web') {
      updateVideoUrl(entry.weekNumber, null);
    } else {
      Alert.alert('Remove Video', 'Remove the video link from this week?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            updateVideoUrl(entry.weekNumber, null);
          },
        },
      ]);
    }
  };

  const handleWatch = () => {
    if (entry.videoUrl) {
      Linking.openURL(entry.videoUrl);
    }
  };

  const startEdit = () => {
    setInputUrl(entry.videoUrl || '');
    setError('');
    setEditing(true);
  };

  if (editing) {
    return (
      <View style={styles.videoSection}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>GAME VIDEO</Text>
        <TextInput
          style={[styles.videoInput, { color: theme.text, borderColor: error ? theme.error : theme.border, backgroundColor: theme.background }]}
          placeholder="Paste your YouTube game link here..."
          placeholderTextColor={theme.textSecondary}
          value={inputUrl}
          onChangeText={(t) => { setInputUrl(t); setError(''); }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        {!!error && (
          <Text style={[styles.videoError, { color: theme.error }]}>{error}</Text>
        )}
        <View style={styles.videoActions}>
          <Pressable
            onPress={() => { setEditing(false); setError(''); }}
            style={({ pressed }) => [styles.videoActionBtn, { backgroundColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.videoActionText, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.videoActionBtn, { backgroundColor: theme.tint, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="checkmark" size={16} color="#FFF" />
            <Text style={[styles.videoActionText, { color: '#FFF' }]}>Save</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (hasVideo) {
    const thumbUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    return (
      <View style={styles.videoSection}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>GAME VIDEO</Text>
        <Pressable onPress={handleWatch} style={({ pressed }) => [styles.thumbnailWrapper, { borderColor: theme.border, opacity: pressed ? 0.85 : 1 }]}>
          <Image source={{ uri: thumbUrl }} style={styles.thumbnail} resizeMode="cover" />
          <View style={styles.playOverlay}>
            <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
          </View>
        </Pressable>
        <View style={styles.videoBottomRow}>
          <Pressable
            onPress={handleWatch}
            style={({ pressed }) => [styles.watchBtn, { backgroundColor: '#FF0000', opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="logo-youtube" size={18} color="#FFF" />
            <Text style={styles.watchBtnText}>Watch Video</Text>
          </Pressable>
          <View style={styles.videoEditActions}>
            <Pressable onPress={startEdit} style={({ pressed }) => [styles.smallActionBtn, { opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="pencil" size={16} color={theme.textSecondary} />
            </Pressable>
            <Pressable onPress={handleRemove} style={({ pressed }) => [styles.smallActionBtn, { opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="trash-outline" size={16} color={theme.error} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.videoSection}>
      <Pressable
        onPress={startEdit}
        style={({ pressed }) => [styles.addVideoBtn, { borderColor: theme.border, backgroundColor: theme.background, opacity: pressed ? 0.7 : 1 }]}
      >
        <Ionicons name="videocam-outline" size={20} color={theme.textSecondary} />
        <Text style={[styles.addVideoText, { color: theme.textSecondary }]}>Add Game Video (YouTube Link)</Text>
      </Pressable>
    </View>
  );
}

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
  const hasVideo = !!entry.videoUrl;

  return (
    <View style={[styles.weekCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        onPress={() => { setExpanded(!expanded); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        style={styles.weekCardHeader}
      >
        <View style={styles.weekTitleRow}>
          <View style={styles.weekTitleLine}>
            <Text style={[styles.weekTitle, { color: theme.text }]}>Week {entry.weekNumber}</Text>
            {hasVideo && (
              <Ionicons name="videocam" size={16} color="#FF0000" style={{ marginLeft: 8 }} />
            )}
          </View>
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
          {entry.rankings.slice(0, 4).map((r, i) => {
            const team = entry.teams.find(t => t.name === r.teamName);
            const playerNames = team ? team.players.map(p => p.name).join(', ') : '';
            return (
              <View key={i} style={styles.summaryRow}>
                <Text style={[styles.summaryRank, { color: i === 0 ? theme.tint : theme.textSecondary }]}>
                  #{r.rank}
                </Text>
                <View style={styles.summaryTeamCol}>
                  <Text style={[styles.summaryTeam, { color: theme.text }]} numberOfLines={1}>
                    {r.teamName}: {playerNames}
                  </Text>
                </View>
                <Text style={[styles.summaryPts, { color: theme.textSecondary }]}>
                  {r.totalPoints} pts
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {expanded && (
        <View style={styles.expandedContent}>
          <VideoSection entry={entry} theme={theme} />

          <View style={[styles.rankingsTable, { borderTopColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>RANKINGS</Text>
            {entry.rankings.map((r, i) => {
              const team = entry.teams.find(t => t.name === r.teamName);
              const playerNames = team ? team.players.map(p => p.name).join(', ') : '';
              return (
                <View key={i} style={[styles.rankRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.rankNum, { color: theme.tint }]}>#{r.rank}</Text>
                  <View style={styles.rankTeamCol}>
                    <Text style={[styles.rankTeam, { color: theme.text }]} numberOfLines={1}>{r.teamName}: {playerNames}</Text>
                  </View>
                  <Text style={[styles.rankStat, { color: theme.success }]}>{r.wins}W</Text>
                  <Text style={[styles.rankStat, { color: theme.error }]}>{r.losses}L</Text>
                  <Text style={[styles.rankPts, { color: theme.textSecondary }]}>{r.totalPoints}pts</Text>
                </View>
              );
            })}
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

interface LadderHistoryEntry {
  weekNumber: number;
  teams: any[];
  rounds: LadderRound[];
  teamPoints: Record<string, number>;
  format: 'ladder';
  videoUrl?: string;
}

function LadderWeekCard({ entry }: { entry: LadderHistoryEntry }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const [expanded, setExpanded] = useState(false);

  const totalGames = entry.rounds.reduce((acc, r) => acc + r.courts.length, 0);
  const completedGames = entry.rounds.reduce((acc, r) => acc + r.courts.filter(c => c.game.completed).length, 0);
  const hasVideo = !!entry.videoUrl;

  const pointsSorted = Object.entries(entry.teamPoints)
    .map(([teamId, pts]) => ({ team: entry.teams.find((t: any) => t.id === teamId), points: pts as number }))
    .filter(e => e.team)
    .sort((a, b) => b.points - a.points);

  return (
    <View style={[styles.weekCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        onPress={() => { setExpanded(!expanded); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        style={styles.weekCardHeader}
      >
        <View style={styles.weekTitleRow}>
          <View style={styles.weekTitleLine}>
            <Text style={[styles.weekTitle, { color: theme.text }]}>Week {entry.weekNumber}</Text>
            <View style={[styles.ladderBadge, { backgroundColor: theme.setter + '20' }]}>
              <Text style={[styles.ladderBadgeText, { color: theme.setter }]}>Ladder</Text>
            </View>
            {hasVideo && (
              <Ionicons name="videocam" size={16} color="#FF0000" style={{ marginLeft: 8 }} />
            )}
          </View>
          <Text style={[styles.weekGameCount, { color: theme.textSecondary }]}>
            {entry.rounds.length} rounds, {completedGames}/{totalGames} games
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textSecondary} />
      </Pressable>

      {!expanded && (
        <View style={styles.weekSummary}>
          {pointsSorted.slice(0, 4).map((e, i) => (
            <View key={e.team.id} style={styles.summaryRow}>
              <Text style={[styles.summaryRank, { color: i === 0 ? theme.tint : theme.textSecondary }]}>#{i + 1}</Text>
              <View style={styles.summaryTeamCol}>
                <Text style={[styles.summaryTeam, { color: theme.text }]} numberOfLines={1}>
                  {e.team.name}
                </Text>
              </View>
              <Text style={[styles.summaryPts, { color: theme.textSecondary }]}>{e.points} pts</Text>
            </View>
          ))}
        </View>
      )}

      {expanded && (
        <View style={styles.expandedContent}>
          <VideoSection entry={entry as any} theme={theme} />

          <View style={[styles.rankingsTable, { borderTopColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>FINAL STANDINGS</Text>
            {pointsSorted.map((e, i) => (
              <View key={e.team.id} style={[styles.rankRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.rankNum, { color: theme.tint }]}>#{i + 1}</Text>
                <View style={styles.rankTeamCol}>
                  <Text style={[styles.rankTeam, { color: theme.text }]} numberOfLines={1}>{e.team.name}</Text>
                </View>
                <Text style={[styles.rankPts, { color: theme.textSecondary }]}>{e.points} pts</Text>
              </View>
            ))}
          </View>

          {entry.rounds.map((round) => (
            <View key={round.roundNumber} style={styles.gamesSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ROUND {round.roundNumber}</Text>
              {round.courts.map((court) => {
                const team1 = entry.teams.find((t: any) => t.id === court.team1Id);
                const team2 = entry.teams.find((t: any) => t.id === court.team2Id);
                if (!court.game.completed) return null;
                const t1Won = (court.game.team1Score ?? 0) > (court.game.team2Score ?? 0);
                return (
                  <View key={court.courtNumber} style={[styles.gameResultRow, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.ladderCourtNum, { color: theme.textSecondary }]}>Ct{court.courtNumber}</Text>
                    <Text style={[styles.grTeamName, { color: t1Won ? theme.tint : theme.textSecondary, fontFamily: t1Won ? 'Inter_700Bold' : 'Inter_400Regular' }]} numberOfLines={1}>
                      {team1?.name ?? '?'}
                    </Text>
                    <Text style={[styles.grScore, { color: theme.text }]}>{court.game.team1Score}</Text>
                    <Text style={[styles.grDash, { color: theme.textSecondary }]}>-</Text>
                    <Text style={[styles.grScore, { color: theme.text }]}>{court.game.team2Score}</Text>
                    <Text style={[styles.grTeamName, styles.grTeamRight, { color: !t1Won ? theme.tint : theme.textSecondary, fontFamily: !t1Won ? 'Inter_700Bold' : 'Inter_400Regular' }]} numberOfLines={1}>
                      {team2?.name ?? '?'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={styles.teamsSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>TEAMS</Text>
            {entry.teams.map((team: any) => (
              <View key={team.id} style={styles.teamBlock}>
                <Text style={[styles.teamBlockName, { color: theme.text }]}>{team.name}</Text>
                <Text style={[styles.teamPlayers, { color: theme.textSecondary }]}>
                  {team.players.map((p: any) => p.name).join(', ')}
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
      keyboardShouldPersistTaps="handled"
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

      {reversedHistory.map((entry: any) => {
        if (entry.format === 'ladder') {
          return <LadderWeekCard key={entry.weekNumber} entry={entry} />;
        }
        return <WeekCard key={entry.weekNumber} entry={entry} />;
      })}
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
  weekTitleLine: { flexDirection: 'row', alignItems: 'center' },
  weekTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  weekGameCount: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  weekSummary: { paddingHorizontal: 16, paddingBottom: 14, gap: 6 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryRank: { fontSize: 13, fontFamily: 'Inter_700Bold', width: 24 },
  summaryTeamCol: { flex: 1 },
  summaryTeam: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  summaryPts: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  expandedContent: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  rankingsTable: { borderTopWidth: 1 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, gap: 8 },
  rankNum: { fontSize: 14, fontFamily: 'Inter_700Bold', width: 28 },
  rankTeamCol: { flex: 1 },
  rankTeam: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
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
  videoSection: { marginTop: 4, marginBottom: 4 },
  videoInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  videoError: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 6 },
  videoActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  videoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  videoActionText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  thumbnailWrapper: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: { width: '100%', aspectRatio: 16 / 9 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  videoBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  watchBtnText: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  videoEditActions: { flexDirection: 'row', gap: 8 },
  smallActionBtn: { padding: 8 },
  addVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    marginTop: 8,
  },
  addVideoText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  ladderBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  ladderBadgeText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  ladderCourtNum: { fontSize: 12, fontFamily: 'Inter_600SemiBold', width: 30, marginRight: 4 },
});
