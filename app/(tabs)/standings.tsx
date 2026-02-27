import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  Share,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Colors from '@/constants/colors';
import { useVolleyball, Player, LadderWeekData, getTeamDisplayName } from '@/lib/volleyball-context';

type SortKey = 'winPct' | 'wins' | 'losses' | 'name';

export default function StandingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { getPlayerStandings, resetSeason, settings, ladderWeek } = useVolleyball();
  const [sortBy, setSortBy] = useState<SortKey>('winPct');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const standings = getPlayerStandings();

  const sorted = [...standings].sort((a, b) => {
    switch (sortBy) {
      case 'wins':
        return b.seasonWins - a.seasonWins;
      case 'losses':
        return b.seasonLosses - a.seasonLosses;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'winPct':
      default:
        return 0;
    }
  });

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    resetSeason();
    setShowResetConfirm(false);
  };

  const handleExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const header = 'Name,Position,Wins,Losses,Win%\n';
    const rows = sorted.map(p => {
      const total = p.seasonWins + p.seasonLosses;
      const pct = total > 0 ? ((p.seasonWins / total) * 100).toFixed(1) : '0.0';
      return `${p.name},${p.position},${p.seasonWins},${p.seasonLosses},${pct}%`;
    }).join('\n');
    const csv = header + rows;

    if (Platform.OS === 'web') {
      try {
        await Share.share({ message: csv, title: 'Season Standings' });
      } catch { }
      return;
    }

    try {
      const fileUri = FileSystem.documentDirectory + 'volleyball_standings.csv';
      await FileSystem.writeAsStringAsync(fileUri, csv);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv' });
      }
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: 'winPct', label: 'Win %' },
    { key: 'wins', label: 'Wins' },
    { key: 'losses', label: 'Losses' },
    { key: 'name', label: 'Name' },
  ];

  const ladderTeamRankings = React.useMemo(() => {
    if (settings.format !== 'ladder' || !ladderWeek) return [];
    const entries = Object.entries(ladderWeek.teamPoints)
      .map(([teamId, points]) => ({
        team: ladderWeek.teams.find((t: any) => t.id === teamId),
        points: points as number,
        teamId,
      }))
      .filter(e => e.team)
      .sort((a, b) => b.points - a.points);
    return entries;
  }, [settings.format, ladderWeek]);

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <Text style={[styles.title, { color: theme.text }]}>Season Standings</Text>

      <View style={styles.actionRow}>
        <Pressable
          onPress={handleExport}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="share-outline" size={18} color={isDark ? '#1B2838' : '#FFF'} />
          <Text style={[styles.actionBtnText, { color: isDark ? '#1B2838' : '#FFF' }]}>Export CSV</Text>
        </Pressable>
        <Pressable
          onPress={handleReset}
          testID="reset-button"
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: theme.error, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="refresh" size={18} color="#FFF" />
          <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Reset</Text>
        </Pressable>
      </View>

      {settings.format === 'ladder' && ladderTeamRankings.length > 0 && (
        <View style={styles.ladderSection}>
          <Text style={[styles.ladderSectionTitle, { color: theme.text }]}>Team Points</Text>
          <Text style={[styles.ladderSectionSub, { color: theme.textSecondary }]}>
            Week {ladderWeek?.weekNumber} — Round {ladderWeek?.currentRound} of {ladderWeek?.totalRounds}
          </Text>
          {ladderTeamRankings.map((entry, idx) => (
            <View key={entry.teamId} style={[styles.ladderTeamRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.ladderRank, { color: idx === 0 ? theme.tint : theme.textSecondary }]}>
                {idx + 1}
              </Text>
              <Text style={[styles.ladderTeamName, { color: theme.text }]} numberOfLines={1}>
                {entry.team ? getTeamDisplayName(entry.team) : '?'}
              </Text>
              <Text style={[styles.ladderPoints, { color: theme.tint }]}>
                {entry.points} pts
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.sortRow}>
        <Text style={[styles.sortLabel, { color: theme.textSecondary }]}>Sort by:</Text>
        {sortOptions.map(opt => {
          const active = sortBy === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => { setSortBy(opt.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[
                styles.sortChip,
                { backgroundColor: active ? theme.tint : theme.card, borderColor: active ? theme.tint : theme.border },
              ]}
            >
              <Text style={[styles.sortChipText, { color: active ? '#FFF' : theme.textSecondary }]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
        <Text style={[styles.thCell, styles.rankW, { color: theme.textSecondary }]}>#</Text>
        <Text style={[styles.thCell, styles.nameW, { color: theme.textSecondary }]}>Player</Text>
        <Text style={[styles.thCell, styles.posW, { color: theme.textSecondary }]}>Pos</Text>
        <Text style={[styles.thCell, styles.numW, { color: theme.textSecondary }]}>W</Text>
        <Text style={[styles.thCell, styles.numW, { color: theme.textSecondary }]}>L</Text>
        <Text style={[styles.thCell, styles.pctW, { color: theme.textSecondary }]}>%</Text>
      </View>
    </View>
  );

  const renderPlayer = ({ item, index }: { item: Player; index: number }) => {
    const total = item.seasonWins + item.seasonLosses;
    const pct = total > 0 ? ((item.seasonWins / total) * 100).toFixed(0) : '-';
    const posColor = (theme as any)[item.position.toLowerCase()] || theme.tint;

    return (
      <View style={[styles.tableRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.tdCell, styles.rankW, { color: theme.textSecondary }]}>{index + 1}</Text>
        <Text style={[styles.tdCell, styles.nameW, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{item.name}</Text>
        <View style={[styles.miniPosBadge, { backgroundColor: posColor }]}>
          <Text style={styles.miniPosText}>{item.position[0]}</Text>
        </View>
        <Text style={[styles.tdCell, styles.numW, { color: theme.success }]}>{item.seasonWins}</Text>
        <Text style={[styles.tdCell, styles.numW, { color: theme.error }]}>{item.seasonLosses}</Text>
        <Text style={[styles.tdCell, styles.pctW, { color: theme.tint, fontFamily: 'Inter_700Bold' }]}>{pct === '-' ? '-' : `${pct}%`}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        renderItem={renderPlayer}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[styles.list, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 16 }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showResetConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetConfirm(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowResetConfirm(false)}
        >
          <Pressable style={[styles.modalCard, { backgroundColor: isDark ? '#1E2D3D' : '#FFF' }]}>
            <Ionicons name="warning" size={36} color={theme.error} style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Erase All Data?</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              This will permanently erase all season standings, current teams, scores, and week history. This cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowResetConfirm(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: isDark ? '#2A3A4A' : '#E8E8E8', opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmReset}
                testID="confirm-erase-button"
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: theme.error, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Erase Everything</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  headerContent: { marginBottom: 8 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  sortLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', marginRight: 4 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  sortChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  thCell: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase' as const },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    borderWidth: 1,
  },
  tdCell: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  rankW: { width: 28 },
  nameW: { flex: 1, marginRight: 8 },
  posW: { width: 32, textAlign: 'center' as const },
  numW: { width: 36, textAlign: 'center' as const },
  pctW: { width: 44, textAlign: 'right' as const },
  miniPosBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  miniPosText: { color: '#FFF', fontSize: 10, fontFamily: 'Inter_700Bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
  },
  modalIcon: { marginBottom: 12 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  ladderSection: { marginBottom: 20, gap: 4 },
  ladderSectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  ladderSectionSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 8 },
  ladderTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  ladderRank: { fontSize: 16, fontFamily: 'Inter_700Bold', width: 28 },
  ladderTeamName: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  ladderPoints: { fontSize: 15, fontFamily: 'Inter_700Bold' },
});
