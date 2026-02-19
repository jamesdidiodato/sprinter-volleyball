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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useVolleyball, Position } from '@/lib/volleyball-context';

const POSITION_LABELS: Record<Position, string> = {
  Setter: 'S',
  Hitter: 'H',
  Back: 'B',
};

function PlayerRow({ player, onEdit }: { player: any; onEdit: (id: string, name: string) => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);

  const posColor = theme[player.position.toLowerCase() as 'setter' | 'hitter' | 'back'];

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
  const { players, updatePlayerName } = useVolleyball();

  const [filter, setFilter] = useState<Position | 'All'>('All');

  const filtered = filter === 'All' ? players : players.filter(p => p.position === filter);

  const positions: Array<Position | 'All'> = ['All', 'Setter', 'Hitter', 'Back'];

  const renderHeader = () => (
    <View style={styles.headerContent}>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <PlayerRow player={item} onEdit={updatePlayerName} />}
        contentContainerStyle={[styles.list, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 16 }]}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  headerContent: { marginBottom: 16 },
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
});
