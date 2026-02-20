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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useVolleyball } from '@/lib/volleyball-context';

export default function LeagueScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { createLeague, joinLeague } = useVolleyball();
  const router = useRouter();

  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [leagueName, setLeagueName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!leagueName.trim()) {
      setError('Please enter a league name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createLeague(leagueName.trim());
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
            onPress={() => { router.push('/admin'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
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
              ? 'Give your league a name. You\'ll get a code to share with your group.'
              : 'Enter the join code you received from your league organizer.'}
          </Text>

          <View style={styles.formContainer}>
            {mode === 'create' ? (
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                value={leagueName}
                onChangeText={setLeagueName}
                placeholder="e.g. Thursday Night Volleyball"
                placeholderTextColor={theme.textSecondary}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
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
