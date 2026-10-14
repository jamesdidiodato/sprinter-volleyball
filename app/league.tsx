import React, { useEffect, useState } from 'react';
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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useVolleyball, LeagueFormat } from '@/lib/volleyball-context';

type FavoriteLeague = { name: string; joinCode: string };

const FAVORITES_KEY = 'vb_favorite_leagues';
const emptyFavorites = (): FavoriteLeague[] =>
  Array.from({ length: 3 }, () => ({ name: '', joinCode: '' }));

function normalizeFavorites(value: unknown): FavoriteLeague[] {
  const favorites = Array.isArray(value) ? value : [];
  return Array.from({ length: 3 }, (_, index) => {
    const favorite = favorites[index];
    return {
      name: typeof favorite?.name === 'string' ? favorite.name : '',
      joinCode: typeof favorite?.joinCode === 'string' ? favorite.joinCode.toUpperCase() : '',
    };
  });
}

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
  const [favorites, setFavorites] = useState<FavoriteLeague[]>(emptyFavorites);
  const [favoriteDraft, setFavoriteDraft] = useState<FavoriteLeague[]>(emptyFavorites);
  const [showFavoritesEditor, setShowFavoritesEditor] = useState(false);
  const [favoriteEditorError, setFavoriteEditorError] = useState('');
  const [favoriteLoadingIndex, setFavoriteLoadingIndex] = useState<number | null>(null);

  const totalPlayers = playersPerTeam * numTeams;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(FAVORITES_KEY)
      .then(stored => {
        if (active && stored) setFavorites(normalizeFavorites(JSON.parse(stored)));
      })
      .catch(e => console.error('Failed to load favorite leagues:', e));
    return () => { active = false; };
  }, []);

  const openFavoritesEditor = () => {
    setFavoriteDraft(favorites.map(favorite => ({ ...favorite })));
    setFavoriteEditorError('');
    setShowFavoritesEditor(true);
  };

  const updateFavoriteDraft = (index: number, field: keyof FavoriteLeague, value: string) => {
    setFavoriteDraft(current => current.map((favorite, i) => (
      i === index
        ? { ...favorite, [field]: field === 'joinCode' ? value.toUpperCase() : value }
        : favorite
    )));
    setFavoriteEditorError('');
  };

  const clearFavoriteDraft = (index: number) => {
    setFavoriteDraft(current => current.map((favorite, i) => (
      i === index ? { name: '', joinCode: '' } : favorite
    )));
    setFavoriteEditorError('');
  };

  const saveFavorites = async () => {
    const normalized = normalizeFavorites(favoriteDraft).map(favorite => ({
      name: favorite.name.trim(),
      joinCode: favorite.joinCode.trim().toUpperCase(),
    }));
    const hasIncompleteFavorite = normalized.some(favorite =>
      Boolean(favorite.name) !== Boolean(favorite.joinCode)
    );
    if (hasIncompleteFavorite) {
      setFavoriteEditorError('Enter both a league name and join code for each favorite, or clear the slot.');
      return;
    }

    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(normalized));
      setFavorites(normalized);
      setShowFavoritesEditor(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('Failed to save favorite leagues:', e);
      setFavoriteEditorError('Could not save favorites. Please try again.');
    }
  };

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

  const handleJoinFavorite = async (favorite: FavoriteLeague, index: number) => {
    if (!favorite.name.trim() || !favorite.joinCode.trim()) {
      openFavoritesEditor();
      return;
    }

    setLoading(true);
    setFavoriteLoadingIndex(index);
    setError('');
    try {
      await joinLeague(favorite.joinCode.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('404')) {
        setError(`Could not find ${favorite.name}. Check its saved join code.`);
      } else {
        setError(`Failed to join ${favorite.name}. Please try again.`);
      }
    } finally {
      setLoading(false);
      setFavoriteLoadingIndex(null);
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
                Enter a join code, or pick one of your saved favorites
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
              : 'Enter your organizer’s join code, or choose a saved league below.'}
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
              <>
                <TextInput
                  style={[styles.input, styles.codeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                  value={joinCode}
                  onChangeText={t => setJoinCode(t.toUpperCase())}
                  placeholder="League join code"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={handleJoin}
                  accessibilityLabel="League join code"
                />

                <View style={styles.favoriteSection}>
                  <View style={styles.favoriteHeadingRow}>
                    <Text style={[styles.favoriteHeading, { color: theme.text }]}>My Favorites</Text>
                    <Pressable
                      onPress={openFavoritesEditor}
                      accessibilityRole="button"
                      accessibilityLabel="Edit favorite leagues"
                      style={({ pressed }) => [styles.editFavoritesBtn, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Ionicons name="pencil" size={15} color={theme.tint} />
                      <Text style={[styles.editFavoritesText, { color: theme.tint }]}>Edit favorites</Text>
                    </Pressable>
                  </View>
                  <View style={styles.favoritesRow}>
                    {favorites.map((favorite, index) => {
                      const isSet = Boolean(favorite.name.trim() && favorite.joinCode.trim());
                      const isJoining = favoriteLoadingIndex === index;
                      return (
                        <Pressable
                          key={index}
                          onPress={() => handleJoinFavorite(favorite, index)}
                          disabled={loading}
                          accessibilityRole="button"
                          accessibilityLabel={isSet ? `Join ${favorite.name}` : `Set favorite ${index + 1}`}
                          style={({ pressed }) => [
                            styles.favoriteCard,
                            {
                              backgroundColor: theme.card,
                              borderColor: isSet ? theme.tint + '55' : theme.border,
                              opacity: pressed || (loading && !isJoining) ? 0.72 : 1,
                            },
                          ]}
                        >
                          <View style={[styles.favoriteIcon, { backgroundColor: theme.tint + '18' }]}>
                            {isJoining ? (
                              <ActivityIndicator size="small" color={theme.tint} />
                            ) : (
                              <Ionicons name={isSet ? 'star' : 'add'} size={20} color={theme.tint} />
                            )}
                          </View>
                          <Text
                            style={[styles.favoriteName, { color: isSet ? theme.text : theme.textSecondary }]}
                            numberOfLines={1}
                          >
                            {isSet ? favorite.name : `Favorite ${index + 1}`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
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
      <Modal
        visible={showFavoritesEditor}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFavoritesEditor(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboard}
          >
            <View style={[styles.favoriteModal, { backgroundColor: theme.card }]}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalHeading}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Favorites</Text>
                  <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                    Save up to three leagues for quick joining.
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowFavoritesEditor(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close favorites editor"
                  hitSlop={10}
                >
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </Pressable>
              </View>
              <ScrollView
                style={styles.favoriteDraftList}
                contentContainerStyle={styles.favoriteDraftContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {favoriteDraft.map((favorite, index) => (
                  <View
                    key={index}
                    style={[styles.favoriteDraftCard, { borderColor: theme.border, backgroundColor: theme.background }]}
                  >
                    <View style={styles.favoriteDraftHeading}>
                      <Text style={[styles.favoriteDraftLabel, { color: theme.text }]}>Favorite {index + 1}</Text>
                      <Pressable
                        onPress={() => clearFavoriteDraft(index)}
                        accessibilityRole="button"
                        accessibilityLabel={`Clear favorite ${index + 1}`}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.error} />
                      </Pressable>
                    </View>
                    <TextInput
                      style={[styles.favoriteInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                      value={favorite.name}
                      onChangeText={value => updateFavoriteDraft(index, 'name', value)}
                      placeholder="League name"
                      placeholderTextColor={theme.textSecondary}
                      returnKeyType="next"
                      accessibilityLabel={`Favorite ${index + 1} league name`}
                    />
                    <TextInput
                      style={[styles.favoriteInput, styles.favoriteCodeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                      value={favorite.joinCode}
                      onChangeText={value => updateFavoriteDraft(index, 'joinCode', value)}
                      placeholder="Join code"
                      placeholderTextColor={theme.textSecondary}
                      autoCapitalize="characters"
                      returnKeyType="done"
                      accessibilityLabel={`Favorite ${index + 1} join code`}
                    />
                  </View>
                ))}
                {!!favoriteEditorError && (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={16} color={theme.error} />
                    <Text style={[styles.errorText, { color: theme.error }]}>{favoriteEditorError}</Text>
                  </View>
                )}
              </ScrollView>
              <View style={styles.favoriteModalActions}>
                <Pressable
                  onPress={() => setShowFavoritesEditor(false)}
                  style={({ pressed }) => [
                    styles.favoriteModalBtn,
                    { backgroundColor: theme.background, opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text style={[styles.favoriteModalBtnText, { color: theme.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={saveFavorites}
                  style={({ pressed }) => [
                    styles.favoriteModalBtn,
                    styles.saveFavoritesBtn,
                    { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={[styles.favoriteModalBtnText, { color: '#FFF' }]}>Save favorites</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  favoriteSection: { gap: 10 },
  favoriteHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  favoriteHeading: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  editFavoritesBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  editFavoritesText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  favoritesRow: { flexDirection: 'row', gap: 8 },
  favoriteCard: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 7,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  favoriteIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  favoriteName: { width: '100%', fontSize: 11, lineHeight: 14, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalKeyboard: { width: '100%', maxWidth: 440, maxHeight: '92%' },
  favoriteModal: { borderRadius: 18, padding: 20, maxHeight: '100%' },
  modalTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  modalHeading: { flex: 1 },
  modalTitle: { fontSize: 21, fontFamily: 'Inter_700Bold' },
  modalSubtitle: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_400Regular', marginTop: 4 },
  favoriteDraftList: { flexShrink: 1 },
  favoriteDraftContent: { gap: 10, paddingBottom: 10 },
  favoriteDraftCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 9 },
  favoriteDraftHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  favoriteDraftLabel: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  favoriteInput: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  favoriteCodeInput: { textTransform: 'uppercase', letterSpacing: 1 },
  favoriteModalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  favoriteModalBtn: { flex: 1, minHeight: 46, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  saveFavoritesBtn: { flex: 1.3 },
  favoriteModalBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
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
