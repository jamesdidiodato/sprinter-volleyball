import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withDelay } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useVolleyball, Team, Player } from '@/lib/volleyball-context';

const POSITION_LABELS: Record<string, string> = { Setter: 'S', Hitter: 'H', Libero: 'L', Defender: 'D' };

function TeamCard({ team, index, editMode, selectedPlayer, onPlayerTap }: {
  team: Team;
  index: number;
  editMode: boolean;
  selectedPlayer: { playerId: string; teamId: string } | null;
  onPlayerTap: (playerId: string, teamId: string) => void;
}) {
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

  const isSelectedTeam = selectedPlayer?.teamId === team.id;

  return (
    <Animated.View style={[styles.teamCard, { backgroundColor: theme.card, borderColor: editMode ? accent + '60' : theme.border }, animStyle]}>
      <View style={[styles.teamHeader, { borderBottomColor: theme.border }]}>
        <View style={[styles.teamDot, { backgroundColor: accent }]} />
        <Text style={[styles.teamName, { color: theme.text }]}>{team.name}</Text>
        {editMode && (
          <View style={[styles.editBadge, { backgroundColor: accent + '20' }]}>
            <Text style={[styles.editBadgeText, { color: accent }]}>Tap to swap</Text>
          </View>
        )}
      </View>
      {team.players.map(player => {
        const posColor = (theme as any)[player.position.toLowerCase()] || theme.tint;
        const isSelected = selectedPlayer?.playerId === player.id && isSelectedTeam;
        const isValidTarget = editMode && selectedPlayer && !isSelectedTeam;

        return (
          <Pressable
            key={player.id}
            onPress={() => editMode && onPlayerTap(player.id, team.id)}
            style={[
              styles.playerItem,
              isSelected && { backgroundColor: theme.tint + '20' },
              isValidTarget && { backgroundColor: accent + '10' },
            ]}
          >
            <View style={[styles.miniPosBadge, { backgroundColor: posColor }]}>
              <Text style={styles.miniPosText}>{POSITION_LABELS[player.position]}</Text>
            </View>
            <Text style={[styles.playerItemName, { color: theme.text }]} numberOfLines={1}>{player.name}</Text>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={20} color={theme.tint} />
            )}
            {isValidTarget && (
              <Ionicons name="swap-horizontal" size={18} color={accent} />
            )}
          </Pressable>
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
  const { currentWeek, generateNewWeek, swapPlayers, getTeamRankings } = useVolleyball();

  const [editMode, setEditMode] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ playerId: string; teamId: string } | null>(null);
  const [showSwapConfirm, setShowSwapConfirm] = useState(false);
  const [pendingSwap, setPendingSwap] = useState<{ p1Id: string; t1Id: string; p2Id: string; t2Id: string; p1Name: string; p2Name: string } | null>(null);

  const handleGenerate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setEditMode(false);
    setSelectedPlayer(null);
    generateNewWeek();
  };

  const hasAnyScores = currentWeek?.games.some(g => g.completed) ?? false;
  const canEdit = !!currentWeek && !hasAnyScores;

  const handleToggleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (editMode) {
      setEditMode(false);
      setSelectedPlayer(null);
    } else {
      setEditMode(true);
    }
  };

  const handlePlayerTap = (playerId: string, teamId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!selectedPlayer) {
      setSelectedPlayer({ playerId, teamId });
      return;
    }

    if (selectedPlayer.teamId === teamId) {
      if (selectedPlayer.playerId === playerId) {
        setSelectedPlayer(null);
      } else {
        setSelectedPlayer({ playerId, teamId });
      }
      return;
    }

    const p1 = currentWeek!.teams.find(t => t.id === selectedPlayer.teamId)?.players.find(p => p.id === selectedPlayer.playerId);
    const p2 = currentWeek!.teams.find(t => t.id === teamId)?.players.find(p => p.id === playerId);

    if (p1 && p2) {
      setPendingSwap({
        p1Id: selectedPlayer.playerId,
        t1Id: selectedPlayer.teamId,
        p2Id: playerId,
        t2Id: teamId,
        p1Name: p1.name,
        p2Name: p2.name,
      });
      setShowSwapConfirm(true);
    }
  };

  const confirmSwap = () => {
    if (pendingSwap) {
      swapPlayers(pendingSwap.p1Id, pendingSwap.t1Id, pendingSwap.p2Id, pendingSwap.t2Id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowSwapConfirm(false);
    setPendingSwap(null);
    setSelectedPlayer(null);
  };

  const cancelSwap = () => {
    setShowSwapConfirm(false);
    setPendingSwap(null);
    setSelectedPlayer(null);
  };

  const rankings = getTeamRankings();
  const hasCompletedGames = currentWeek?.games.some(g => g.completed) ?? false;

  const phaseLabel = currentWeek ? {
    roundRobin: 'Round Robin in progress',
    semifinals: 'Semifinals in progress',
    finals: 'Finals in progress',
    complete: 'Week Complete',
  }[currentWeek.phase] : '';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 16, paddingBottom: Platform.OS === 'web' ? 34 + 100 : 120 }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.text }]}>Weekly Teams</Text>
      {currentWeek && (
        <View style={styles.weekMeta}>
          <Text style={[styles.weekLabel, { color: theme.tint }]}>
            Week {currentWeek.weekNumber}
          </Text>
          <View style={[styles.phasePill, { backgroundColor: currentWeek.phase === 'complete' ? theme.success + '20' : theme.tint + '20' }]}>
            <Text style={[styles.phaseText, { color: currentWeek.phase === 'complete' ? theme.success : theme.tint }]}>
              {phaseLabel}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.buttonCol}>
        <Pressable
          onPress={handleGenerate}
          style={({ pressed }) => [
            styles.generateBtn,
            { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <Ionicons name="shuffle" size={22} color="#FFF" />
          <Text style={styles.generateText}>
            {currentWeek ? 'Generate New Week' : 'Generate First Week'}
          </Text>
        </Pressable>

        {canEdit && (
          <Pressable
            onPress={handleToggleEdit}
            testID="edit-teams-button"
            style={({ pressed }) => [
              styles.editBtn,
              {
                backgroundColor: editMode ? theme.accent : isDark ? '#2A3A4A' : '#E8E8E8',
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Ionicons name={editMode ? 'checkmark' : 'swap-horizontal'} size={20} color={editMode ? (isDark ? '#1B2838' : '#FFF') : theme.text} />
            <Text style={[styles.editBtnText, { color: editMode ? (isDark ? '#1B2838' : '#FFF') : theme.text }]}>
              {editMode ? 'Done' : 'Edit'}
            </Text>
          </Pressable>
        )}
      </View>

      {editMode && (
        <View style={[styles.editHint, { backgroundColor: theme.tint + '15', borderColor: theme.tint + '30' }]}>
          <Ionicons name="information-circle" size={18} color={theme.tint} />
          <Text style={[styles.editHintText, { color: theme.tint }]}>
            {selectedPlayer ? 'Now tap a player on a different team to swap' : 'Tap a player to select them, then tap a player on another team to swap'}
          </Text>
        </View>
      )}

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
            <TeamCard
              key={team.id}
              team={team}
              index={i}
              editMode={editMode}
              selectedPlayer={selectedPlayer}
              onPlayerTap={handlePlayerTap}
            />
          ))}
        </View>
      )}

      {hasCompletedGames && (
        <View style={styles.rankingsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Round Robin Rankings</Text>
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

      {currentWeek && currentWeek.semifinalGames.length > 0 && (
        <View style={styles.rankingsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Semifinal Results</Text>
          {currentWeek.semifinalGames.map(game => {
            const team1 = currentWeek.teams.find(t => t.id === game.team1Id);
            const team2 = currentWeek.teams.find(t => t.id === game.team2Id);
            const done = game.completed;
            const t1Won = done && (game.team1Score ?? 0) > (game.team2Score ?? 0);
            return (
              <View key={game.id} style={[styles.bracketGame, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.bracketRow}>
                  <Text style={[styles.bracketTeam, { color: done ? (t1Won ? theme.tint : theme.textSecondary) : theme.text }]} numberOfLines={1}>
                    {team1?.name ?? '?'}
                  </Text>
                  <Text style={[styles.bracketScore, { color: theme.text }]}>
                    {done ? game.team1Score : '-'}
                  </Text>
                </View>
                <View style={styles.bracketRow}>
                  <Text style={[styles.bracketTeam, { color: done ? (!t1Won ? theme.tint : theme.textSecondary) : theme.text }]} numberOfLines={1}>
                    {team2?.name ?? '?'}
                  </Text>
                  <Text style={[styles.bracketScore, { color: theme.text }]}>
                    {done ? game.team2Score : '-'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {currentWeek && currentWeek.finalGames.length > 0 && (
        <View style={styles.rankingsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Final Results</Text>
          {currentWeek.finalGames.map(game => {
            const team1 = currentWeek.teams.find(t => t.id === game.team1Id);
            const team2 = currentWeek.teams.find(t => t.id === game.team2Id);
            const done = game.completed;
            const t1Won = done && (game.team1Score ?? 0) > (game.team2Score ?? 0);
            return (
              <View key={game.id} style={[styles.bracketGame, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {game.label && <Text style={[styles.bracketLabel, { color: theme.textSecondary }]}>{game.label}</Text>}
                <View style={styles.bracketRow}>
                  <Text style={[styles.bracketTeam, { color: done ? (t1Won ? theme.tint : theme.textSecondary) : theme.text }]} numberOfLines={1}>
                    {team1?.name ?? '?'}
                  </Text>
                  <Text style={[styles.bracketScore, { color: theme.text }]}>
                    {done ? game.team1Score : '-'}
                  </Text>
                </View>
                <View style={styles.bracketRow}>
                  <Text style={[styles.bracketTeam, { color: done ? (!t1Won ? theme.tint : theme.textSecondary) : theme.text }]} numberOfLines={1}>
                    {team2?.name ?? '?'}
                  </Text>
                  <Text style={[styles.bracketScore, { color: theme.text }]}>
                    {done ? game.team2Score : '-'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Modal
        visible={showSwapConfirm}
        transparent
        animationType="fade"
        onRequestClose={cancelSwap}
      >
        <Pressable style={styles.modalOverlay} onPress={cancelSwap}>
          <Pressable style={[styles.modalCard, { backgroundColor: isDark ? '#1E2D3D' : '#FFF' }]}>
            <Ionicons name="swap-horizontal" size={36} color={theme.tint} style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Swap Players?</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              Swap {pendingSwap?.p1Name} with {pendingSwap?.p2Name}?
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={cancelSwap}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: isDark ? '#2A3A4A' : '#E8E8E8', opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmSwap}
                testID="confirm-swap-button"
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Swap</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  weekMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  weekLabel: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  phasePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  phaseText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  buttonCol: { gap: 10, marginBottom: 16 },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  generateText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_700Bold' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  editBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  editHintText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
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
  teamName: { fontSize: 17, fontFamily: 'Inter_700Bold', flex: 1 },
  editBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  editBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
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
  bracketGame: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  bracketLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  bracketRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  bracketTeam: { fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1 },
  bracketScore: { fontSize: 16, fontFamily: 'Inter_700Bold', width: 40, textAlign: 'right' as const },
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
});
