import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Colors from '@/constants/colors';
import { useVolleyball, Player, Position } from '@/lib/volleyball-context';

type SortKey = 'winPct' | 'wins' | 'losses' | 'name';

export default function StandingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { getPlayerStandings, resetSeason } = useVolleyball();

  const [sortBy, setSortBy] = useState<SortKey>('winPct');

  const standings = getPlayerStandings();

  const sorted = [...standings].sort((a, b) => {
    const aTotal = a.seasonWins + a.seasonLosses;
    const bTotal = b.seasonWins + b.seasonLosses;
    const aWinPct = aTotal > 0 ? a.seasonWins / aTotal : 0;
    const bWinPct = bTotal > 0 ? b.seasonWins / bTotal : 0;

    switch (sortBy) {
      case 'winPct':
        if (bWinPct !== aWinPct) return bWinPct - aWinPct;
        return b.seasonWins - a.seasonWins;
      case 'wins':
        return b.seasonWins - a.seasonWins;
      case 'losses':
        return b.seasonLosses - a.seasonLosses;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const handleReset = () => {
    Alert.alert(
      'Reset Season',
      'This will clear all wins, losses, and team data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            resetSeason();
          },
        },
      ],
    );
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
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: theme.error, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="refresh" size={18} color="#FFF" />
          <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Reset</Text>
        </Pressable>
      </View>

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
    const posColor = theme[item.position.toLowerCase() as 'setter' | 'hitter' | 'back'];

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
});
