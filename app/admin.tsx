import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  useColorScheme,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { apiRequest } from '@/lib/query-client';

interface LeagueSummary {
  id: number;
  name: string;
  joinCode: string;
  playerCount: number;
  weeksPlayed: number;
  createdAt: string;
  lastAccessedAt: string | null;
}

export default function AdminScreen({ onBack }: { onBack?: () => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const topPad = Platform.OS === 'web' ? 67 + 20 : insets.top + 20;

  const handleLogin = async () => {
    if (!password.trim()) {
      setError('Please enter the admin password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiRequest('POST', '/api/admin/login', { password: password.trim() });
      setAuthenticated(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchLeagues();
    } catch (e: any) {
      setError('Invalid password');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeagues = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('POST', '/api/admin/leagues', { password: password.trim() });
      const data = await res.json();
      setLeagues(data.leagues || []);
    } catch (e: any) {
      setError('Failed to load leagues');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = useCallback(async (league: LeagueSummary) => {
    const doDelete = async () => {
      setDeletingId(league.id);
      try {
        await apiRequest('POST', `/api/admin/leagues/${league.id}/delete`, { password: password.trim() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLeagues(prev => prev.filter(l => l.id !== league.id));
      } catch (e: any) {
        setError('Failed to delete league');
      } finally {
        setDeletingId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(`Delete "${league.name}"? This cannot be undone.`)) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Delete League',
        `Delete "${league.name}"? This removes all data and cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  }, [password]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  if (!authenticated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView
          contentContainerStyle={[styles.centered, { paddingTop: topPad, paddingBottom: 60 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => onBack?.()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.tint} />
            <Text style={[styles.backText, { color: theme.tint }]}>Back</Text>
          </Pressable>

          <Ionicons name="shield-checkmark" size={48} color={theme.tint} style={{ marginBottom: 16 }} />
          <Text style={[styles.formTitle, { color: theme.text }]}>Admin Panel</Text>
          <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>
            Enter the admin password to manage all leagues
          </Text>

          <View style={styles.formContainer}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Admin password"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={16} color={theme.error} />
                <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: theme.tint, opacity: (pressed || loading) ? 0.75 : 1 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="log-in" size={20} color="#FFF" />
                  <Text style={styles.submitText}>Sign In</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingTop: topPad, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => onBack?.()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.tint} />
            <Text style={[styles.backText, { color: theme.tint }]}>Back</Text>
          </Pressable>
          <Pressable onPress={fetchLeagues} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color={theme.tint} />
          </Pressable>
        </View>

        <Text style={[styles.pageTitle, { color: theme.text }]}>Manage Leagues</Text>
        <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
          {leagues.length} active league{leagues.length !== 1 ? 's' : ''}
        </Text>

        {loading && leagues.length === 0 && (
          <ActivityIndicator color={theme.tint} style={{ marginTop: 40 }} />
        )}

        {!!error && (
          <View style={[styles.errorRow, { marginTop: 16 }]}>
            <Ionicons name="alert-circle" size={16} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          </View>
        )}

        {leagues.length === 0 && !loading && (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No leagues found
          </Text>
        )}

        {leagues.map(league => (
          <View key={league.id} style={[styles.leagueCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.leagueHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.leagueName, { color: theme.text }]}>{league.name}</Text>
                <Text style={[styles.leagueCode, { color: theme.tint }]}>{league.joinCode}</Text>
              </View>
              <Pressable
                onPress={() => handleDelete(league)}
                disabled={deletingId === league.id}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  { backgroundColor: theme.error + '15', opacity: pressed ? 0.7 : 1 },
                ]}
              >
                {deletingId === league.id ? (
                  <ActivityIndicator size="small" color={theme.error} />
                ) : (
                  <Ionicons name="trash" size={18} color={theme.error} />
                )}
              </Pressable>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="people" size={14} color={theme.textSecondary} />
                <Text style={[styles.statText, { color: theme.textSecondary }]}>
                  {league.playerCount} players
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="calendar" size={14} color={theme.textSecondary} />
                <Text style={[styles.statText, { color: theme.textSecondary }]}>
                  {league.weeksPlayed} week{league.weeksPlayed !== 1 ? 's' : ''} played
                </Text>
              </View>
            </View>

            <View style={[styles.accessRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.accessLabel, { color: theme.textSecondary }]}>Last accessed</Text>
              <Text style={[styles.accessValue, { color: theme.text }]}>
                {formatDate(league.lastAccessedAt)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { paddingHorizontal: 24, alignItems: 'center' },
  listContent: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  refreshBtn: { padding: 8 },
  pageTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 20 },
  formTitle: { fontSize: 26, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  formSubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8, maxWidth: 300, lineHeight: 20 },
  formContainer: { width: '100%', maxWidth: 400, marginTop: 32, gap: 16, alignItems: 'stretch' },
  input: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_700Bold' },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 40 },
  leagueCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  leagueHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  leagueName: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  leagueCode: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  accessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accessLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  accessValue: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
