import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  TextInput,
  useColorScheme,
  Platform,
  Modal,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useVolleyball, Position } from '@/lib/volleyball-context';

const POSITION_LABELS: Record<string, string> = {
  Setter: 'S',
  Hitter: 'H',
  Libero: 'L',
  Defender: 'D',
};

function PlayerRow({ player, onEdit }: { player: any; onEdit: (id: string, name: string) => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);

  const posColor = (theme as any)[player.position.toLowerCase()] || theme.tint;

  const handleSave = () => {
    if (name.trim()) {
      onEdit(player.id, name.trim());
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      setName(player.name);
    }
    setEditing(false);
  };

  return (
    <View style={[styles.playerRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.positionBadge, { backgroundColor: posColor }]}>
        <Text style={styles.positionText}>{POSITION_LABELS[player.position]}</Text>
      </View>
      <View style={styles.playerInfo}>
        {editing ? (
          <TextInput
            style={[styles.nameInput, { color: theme.text, borderBottomColor: theme.tint }]}
            value={name}
            onChangeText={setName}
            onBlur={handleSave}
            onSubmitEditing={handleSave}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
          />
        ) : (
          <Pressable onPress={() => { setEditing(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.nameRow}>
            <Text style={[styles.playerName, { color: theme.text }]} numberOfLines={1}>{player.name}</Text>
            <Ionicons name="pencil" size={14} color={theme.textSecondary} />
          </Pressable>
        )}
        <Text style={[styles.positionLabel, { color: theme.textSecondary }]}>{player.position}</Text>
      </View>
      <View style={styles.statsCol}>
        <Text style={[styles.statValue, { color: theme.success }]}>{player.seasonWins}W</Text>
        <Text style={[styles.statValue, { color: theme.error }]}>{player.seasonLosses}L</Text>
      </View>
    </View>
  );
}

export default function PlayersScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { players, updatePlayerName, league, leaveLeague, refreshData } = useVolleyball();

  const [filter, setFilter] = useState<Position | 'All'>('All');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (league?.joinCode) {
      await Clipboard.setStringAsync(league.joinCode);
      setCopied(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const filtered = filter === 'All' ? players : players.filter(p => p.position === filter);

  const allPositions = Array.from(new Set(players.map(p => p.position)));
  const positions: Array<string> = ['All', ...allPositions];

  const handleLeave = () => {
    leaveLeague();
    setShowLeaveConfirm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {league && (
        <View style={[styles.leagueBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.leagueInfo}>
            <Text style={[styles.leagueName, { color: theme.text }]}>{league.name}</Text>
            <View style={styles.codeRow}>
              <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>Code: </Text>
              <Text style={[styles.codeValue, { color: theme.tint }]}>{league.joinCode}</Text>
              <Pressable
                onPress={handleCopyCode}
                style={({ pressed }) => [
                  styles.copyBtn,
                  { backgroundColor: copied ? theme.success + '20' : theme.tint + '15', opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={copied ? theme.success : theme.tint} />
                <Text style={[styles.copyBtnText, { color: copied ? theme.success : theme.tint }]}>
                  {copied ? 'Copied!' : 'Copy'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <Text style={[styles.title, { color: theme.text }]}>Players</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        {players.length} players registered
      </Text>
      <View style={styles.filterRow}>
        {positions.map(pos => {
          const active = filter === pos;
          return (
            <Pressable
              key={pos}
              onPress={() => { setFilter(pos); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[
                styles.filterChip,
                { backgroundColor: active ? theme.tint : theme.card, borderColor: active ? theme.tint : theme.border },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? '#FFF' : theme.textSecondary }]}>
                {pos}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContent}>
      <Pressable
        onPress={() => { setShowLeaveConfirm(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
        style={({ pressed }) => [
          styles.leaveLeagueBtn,
          { borderColor: theme.error, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Ionicons name="log-out-outline" size={18} color={theme.error} />
        <Text style={[styles.leaveLeagueBtnText, { color: theme.error }]}>Leave League</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <PlayerRow player={item} onEdit={updatePlayerName} />}
        contentContainerStyle={[styles.list, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 16 }]}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />
        }
      />

      <Modal
        visible={showLeaveConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLeaveConfirm(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowLeaveConfirm(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: isDark ? '#1E2D3D' : '#FFF' }]}>
            <Ionicons name="log-out-outline" size={36} color={theme.error} style={{ marginBottom: 12 }} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Leave League?</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              You can rejoin later with the code: {league?.joinCode}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowLeaveConfirm(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: isDark ? '#2A3A4A' : '#E8E8E8', opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleLeave}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: theme.error, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Leave</Text>
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
  headerContent: { marginBottom: 16 },
  leagueBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  leagueInfo: { flex: 1 },
  leagueName: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  codeLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  codeValue: { fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  copyBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  positionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  positionText: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  playerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  playerName: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  positionLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  nameInput: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    borderBottomWidth: 2,
    paddingVertical: 2,
    minWidth: 100,
  },
  statsCol: { flexDirection: 'row', gap: 8 },
  statValue: { fontSize: 14, fontFamily: 'Inter_700Bold' },
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
  footerContent: { marginTop: 24, marginBottom: 20, alignItems: 'center' },
  leaveLeagueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  leaveLeagueBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
});
