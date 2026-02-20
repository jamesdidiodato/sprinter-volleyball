import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  useColorScheme,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useVolleyball, LeagueFormat } from '@/lib/volleyball-context';

function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
  theme,
  subtitle,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  theme: any;
  subtitle?: string;
}) {
  return (
    <View style={[stepperStyles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={stepperStyles.labelCol}>
        <Text style={[stepperStyles.label, { color: theme.text }]}>{label}</Text>
        {subtitle ? <Text style={[stepperStyles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      <View style={stepperStyles.controls}>
        <Pressable
          onPress={() => { if (value > min) { onChange(value - 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
          style={({ pressed }) => [
            stepperStyles.btn,
            { backgroundColor: value <= min ? theme.border : theme.tint + '20', opacity: pressed && value > min ? 0.7 : 1 },
          ]}
          disabled={value <= min}
        >
          <Ionicons name="remove" size={20} color={value <= min ? theme.textSecondary : theme.tint} />
        </Pressable>
        <Text style={[stepperStyles.value, { color: theme.text }]}>{value}</Text>
        <Pressable
          onPress={() => { if (value < max) { onChange(value + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
          style={({ pressed }) => [
            stepperStyles.btn,
            { backgroundColor: value >= max ? theme.border : theme.tint + '20', opacity: pressed && value < max ? 0.7 : 1 },
          ]}
          disabled={value >= max}
        >
          <Ionicons name="add" size={20} color={value >= max ? theme.textSecondary : theme.tint} />
        </Pressable>
      </View>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  labelCol: { flex: 1 },
  label: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  value: { fontSize: 20, fontFamily: 'Inter_700Bold', minWidth: 28, textAlign: 'center' },
});

export default function LeagueScreen({ onOpenAdmin }: { onOpenAdmin?: () => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { createLeague, joinLeague } = useVolleyball();

  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [leagueName, setLeagueName] = useState('');
  const [leagueFormat, setLeagueFormat] = useState<LeagueFormat>('roundRobin');
  const [playersPerTeam, setPlayersPerTeam] = useState(4);
  const [numTeams, setNumTeams] = useState(4);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const totalPlayers = playersPerTeam * numTeams;

  const handleCreate = async () => {
    if (!leagueName.trim()) {
      setError('Please enter a league name');
      return;
    }
    if (leagueFormat === 'ladder' && numTeams % 2 !== 0) {
      setError('Ladder format requires an even number of teams');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createLeague(leagueName.trim(), playersPerTeam, numTeams, leagueFormat);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError('Failed to create league. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a join code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await joinLeague(joinCode.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('404')) {
        setError('League not found. Check your code and try again.');
      } else {
        setError('Failed to join league. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const topPad = Platform.OS === 'web' ? 67 + 40 : insets.top + 40;

  if (mode === 'choose') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView
          contentContainerStyle={[styles.centered, { paddingTop: topPad, paddingBottom: 60 }]}
          showsVerticalScrollIndicator={false}
        >
          <Ionicons name="trophy" size={64} color={theme.tint} />
          <Text style={[styles.heroTitle, { color: theme.text }]}>Volleyball Tracker</Text>
          <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
            Track your rec league teams, scores, and standings — shared with your whole group
          </Text>

          <View style={styles.optionsContainer}>
            <Pressable
              onPress={() => { setMode('create'); setError(''); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              style={({ pressed }) => [
                styles.optionCard,
                { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.tint + '20' }]}>
                <Ionicons name="add-circle" size={32} color={theme.tint} />
              </View>
              <Text style={[styles.optionTitle, { color: theme.text }]}>Create a League</Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>
                Start a new league and get a code to share with your group
              </Text>
            </Pressable>

            <Pressable
              onPress={() => { setMode('join'); setError(''); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              style={({ pressed }) => [
                styles.optionCard,
                { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.accent + '20' }]}>
                <Ionicons name="enter" size={32} color={isDark ? theme.accent : theme.accent} />
              </View>
              <Text style={[styles.optionTitle, { color: theme.text }]}>Join a League</Text>
              <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>
                Enter a code from your league organizer to join an existing league
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => { onOpenAdmin?.(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={({ pressed }) => [
              styles.adminBtn,
              { opacity: pressed ? 0.6 : 0.8 },
            ]}
          >
            <Ionicons name="shield-checkmark" size={16} color={theme.textSecondary} />
            <Text style={[styles.adminBtnText, { color: theme.textSecondary }]}>Manage Active Leagues</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView
          contentContainerStyle={[styles.centered, { paddingTop: topPad, paddingBottom: 60 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => { setMode('choose'); setError(''); }}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={theme.tint} />
            <Text style={[styles.backText, { color: theme.tint }]}>Back</Text>
          </Pressable>

          <Ionicons
            name={mode === 'create' ? 'add-circle' : 'enter'}
            size={48}
            color={theme.tint}
            style={{ marginBottom: 16 }}
          />

          <Text style={[styles.formTitle, { color: theme.text }]}>
            {mode === 'create' ? 'Create a League' : 'Join a League'}
          </Text>
          <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>
            {mode === 'create'
              ? 'Set up your league with a name and team configuration.'
              : 'Enter the join code you received from your league organizer.'}
          </Text>

          <View style={styles.formContainer}>
            {mode === 'create' ? (
              <>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                  value={leagueName}
                  onChangeText={setLeagueName}
                  placeholder="League name (e.g. Thursday Night VB)"
                  placeholderTextColor={theme.textSecondary}
                  autoFocus
                  returnKeyType="next"
                />

                <View style={styles.formatSection}>
                  <Text style={[styles.formatLabel, { color: theme.text }]}>League Format</Text>
                  <View style={styles.formatRow}>
                    <Pressable
                      onPress={() => { setLeagueFormat('roundRobin'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[
                        styles.formatOption,
                        { borderColor: leagueFormat === 'roundRobin' ? theme.tint : theme.border, backgroundColor: leagueFormat === 'roundRobin' ? theme.tint + '15' : theme.card },
                      ]}
                    >
                      <Ionicons name="git-network-outline" size={22} color={leagueFormat === 'roundRobin' ? theme.tint : theme.textSecondary} />
                      <Text style={[styles.formatOptionTitle, { color: leagueFormat === 'roundRobin' ? theme.tint : theme.text }]}>
                        Round Robin + Playoffs
                      </Text>
                      <Text style={[styles.formatOptionDesc, { color: theme.textSecondary }]}>
                        All teams play each other, then top teams compete in playoffs
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => { setLeagueFormat('ladder'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[
                        styles.formatOption,
                        { borderColor: leagueFormat === 'ladder' ? theme.tint : theme.border, backgroundColor: leagueFormat === 'ladder' ? theme.tint + '15' : theme.card },
                      ]}
                    >
                      <Ionicons name="swap-vertical" size={22} color={leagueFormat === 'ladder' ? theme.tint : theme.textSecondary} />
                      <Text style={[styles.formatOptionTitle, { color: leagueFormat === 'ladder' ? theme.tint : theme.text }]}>
                        Ladder League
                      </Text>
                      <Text style={[styles.formatOptionDesc, { color: theme.textSecondary }]}>
                        6 rounds with court rankings — winners move up, losers move down
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <NumberStepper
                  label="Players per Team"
                  subtitle="2 to 6 players"
                  value={playersPerTeam}
                  min={2}
                  max={6}
                  onChange={setPlayersPerTeam}
                  theme={theme}
                />

                <NumberStepper
                  label="Number of Teams"
                  subtitle={`${totalPlayers} total players needed`}
                  value={numTeams}
                  min={2}
                  max={12}
                  onChange={setNumTeams}
                  theme={theme}
                />

                <View style={[styles.summaryCard, { backgroundColor: theme.tint + '10', borderColor: theme.tint + '30' }]}>
                  <Ionicons name="information-circle" size={18} color={theme.tint} />
                  <Text style={[styles.summaryText, { color: theme.text }]}>
                    {numTeams} teams of {playersPerTeam} = {totalPlayers} players
                    {leagueFormat === 'ladder'
                      ? ` • 6 rounds, ${Math.floor(numTeams / 2)} court${Math.floor(numTeams / 2) > 1 ? 's' : ''}`
                      : numTeams >= 4 ? ' • Round Robin → Semifinals → Finals' : ' • Round Robin only'}
                  </Text>
                </View>
                {leagueFormat === 'ladder' && numTeams % 2 !== 0 && (
                  <View style={[styles.summaryCard, { backgroundColor: theme.error + '10', borderColor: theme.error + '30' }]}>
                    <Ionicons name="warning" size={18} color={theme.error} />
                    <Text style={[styles.summaryText, { color: theme.error }]}>
                      Ladder format requires an even number of teams
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <TextInput
                style={[styles.input, styles.codeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                value={joinCode}
                onChangeText={t => setJoinCode(t.toUpperCase())}
                placeholder="e.g. SPRNT4K2X"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="characters"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleJoin}
              />
            )}

            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={16} color={theme.error} />
                <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={mode === 'create' ? handleCreate : handleJoin}
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
                  <Ionicons name={mode === 'create' ? 'add' : 'enter'} size={20} color="#FFF" />
                  <Text style={styles.submitText}>
                    {mode === 'create' ? 'Create League' : 'Join League'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { paddingHorizontal: 24, alignItems: 'center' },
  heroTitle: { fontSize: 32, fontFamily: 'Inter_700Bold', marginTop: 16, textAlign: 'center' },
  heroSubtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8, maxWidth: 300, lineHeight: 22 },
  optionsContainer: { width: '100%', maxWidth: 400, marginTop: 40, gap: 16 },
  optionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  optionDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 24 },
  backText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  formTitle: { fontSize: 26, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  formSubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8, maxWidth: 300, lineHeight: 20 },
  formContainer: { width: '100%', maxWidth: 400, marginTop: 32, gap: 16 },
  input: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  codeInput: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    letterSpacing: 3,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 18 },
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
  formatSection: { gap: 8 },
  formatLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  formatRow: { gap: 10 },
  formatOption: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    gap: 4,
  },
  formatOptionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  formatOptionDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
    paddingVertical: 10,
  },
  adminBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
