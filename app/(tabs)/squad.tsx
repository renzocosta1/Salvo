import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import {
  getDistrictLeaderboard,
  getCountyLeaderboard,
  getSquadStats,
  claimWeeklyCheckIn,
  getMyDistrictRank,
  subscribeToSquadUpdates,
  type LeaderboardEntry,
  type SquadStats,
} from '@/lib/supabase/squad';

type LeaderboardView = 'district' | 'county';

export default function SquadScreen() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<LeaderboardView>('district');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [squadStats, setSquadStats] = useState<SquadStats | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (profile) {
      loadData();

      // Subscribe to real-time updates
      if (profile.county && profile.legislative_district) {
        const subscription = subscribeToSquadUpdates(
          profile.county,
          profile.legislative_district,
          () => {
            loadData();
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      }
    }
  }, [profile, view]);

  const loadData = async () => {
    if (!profile || !profile.county || !profile.legislative_district) {
      setLoading(false);
      return;
    }

    try {
      // Load leaderboard
      if (view === 'district') {
        const { data, error } = await getDistrictLeaderboard(
          profile.county,
          profile.legislative_district,
          20
        );
        if (data) setLeaderboard(data);

        // Get user's rank
        const rankResult = await getMyDistrictRank(
          profile.id,
          profile.county,
          profile.legislative_district
        );
        if (rankResult.rank) setMyRank(rankResult.rank);

        // Load squad stats
        const statsResult = await getSquadStats(
          profile.county,
          profile.legislative_district
        );
        if (statsResult.data) setSquadStats(statsResult.data);
      } else {
        const { data, error } = await getCountyLeaderboard(profile.county, 20);
        if (data) setLeaderboard(data);
      }
    } catch (error) {
      console.error('[SquadScreen] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleClaimCheckIn = async () => {
    if (!user || claiming) return;

    setClaiming(true);

    const { data, error } = await claimWeeklyCheckIn(user.id);

    setClaiming(false);

    if (error) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message}`);
      } else {
        Alert.alert('Error', error.message);
      }
      return;
    }

    if (!data) {
      if (Platform.OS === 'web') {
        window.alert('Unknown error occurred');
      } else {
        Alert.alert('Error', 'Unknown error occurred');
      }
      return;
    }

    if (!data.success) {
      // Too soon to check in
      const hoursLeft = data.hours_remaining || 0;
      const daysLeft = Math.floor(hoursLeft / 24);
      const remainingHours = Math.floor(hoursLeft % 24);
      
      const message = daysLeft > 0 
        ? `Come back in ${daysLeft}d ${remainingHours}h`
        : `Come back in ${remainingHours} hours`;

      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Too Soon!', message);
      }
      return;
    }

    // Success!
    const message = data.new_streak === 1
      ? `First check-in! +${data.total_xp} XP`
      : `${data.new_streak} week streak! +${data.total_xp} XP (Base: ${data.base_xp}, Streak Bonus: +${data.streak_bonus})`;

    if (Platform.OS === 'web') {
      window.alert(`✅ ${message}`);
    } else {
      Alert.alert('Check-In Complete!', message);
    }

    // Reload to show updated stats
    loadData();
  };

  const renderRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const renderLeaderboardEntry = (entry: LeaderboardEntry, index: number) => {
    const isCurrentUser = entry.user_id === user?.id;
    const rank = entry.district_rank || entry.county_rank || index + 1;

    return (
      <View
        key={entry.user_id}
        style={[
          styles.leaderboardEntry,
          isCurrentUser && styles.leaderboardEntryHighlight,
        ]}
      >
        <View style={styles.leaderboardLeft}>
          <Text style={styles.leaderboardRank}>{renderRankBadge(rank)}</Text>
          <View style={styles.leaderboardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.leaderboardName}>
                {entry.display_name}
                {isCurrentUser && ' (YOU)'}
              </Text>
              {entry.is_leader && (
                <View style={styles.leaderBadge}>
                  <Text style={styles.leaderBadgeText}>LEADER</Text>
                </View>
              )}
            </View>
            {view === 'county' && entry.legislative_district && (
              <Text style={styles.districtLabel}>
                District {entry.legislative_district}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.leaderboardRight}>
          <Text style={styles.leaderboardXP}>{entry.xp.toLocaleString()} XP</Text>
          <Text style={styles.leaderboardLevel}>Level {entry.level}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#39FF14" />
          <Text style={styles.loadingText}>Loading squad data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile || !profile.county || !profile.legislative_district) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="location-outline" size={60} color="#8b98a5" />
          <Text style={styles.errorText}>
            Update your address in Profile to see your squad!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#39FF14" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚔️ Your Squad</Text>
          <Text style={styles.headerSubtitle}>
            {profile.county} County, District {profile.legislative_district}
          </Text>
        </View>

        {/* Weekly Check-In Card */}
        <View style={styles.checkInCard}>
          <View style={styles.checkInHeader}>
            <Ionicons name="calendar-outline" size={24} color="#39FF14" />
            <Text style={styles.checkInTitle}>Weekly Check-In</Text>
          </View>
          <Text style={styles.checkInSubtitle}>
            Earn +50 XP every week (+ streak bonus)
          </Text>
          <Pressable
            style={[styles.checkInButton, claiming && styles.checkInButtonDisabled]}
            onPress={handleClaimCheckIn}
            disabled={claiming}
          >
            {claiming ? (
              <ActivityIndicator size="small" color="#0f1419" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#0f1419" />
                <Text style={styles.checkInButtonText}>Claim Check-In</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.checkInHint}>
            Current streak: {profile.check_in_streak || 0} weeks
          </Text>
        </View>

        {/* Squad Stats */}
        {squadStats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>📊 Squad Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{squadStats.total_members}</Text>
                <Text style={styles.statLabel}>Warriors</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#39FF14' }]}>
                  {squadStats.active_today}
                </Text>
                <Text style={styles.statLabel}>Active Today</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {squadStats.total_xp.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Total XP</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{squadStats.missions_completed}</Text>
                <Text style={styles.statLabel}>Missions</Text>
              </View>
            </View>
            {squadStats.top_warrior && (
              <View style={styles.topWarriorBox}>
                <Text style={styles.topWarriorLabel}>🏆 Top Warrior</Text>
                <Text style={styles.topWarriorName}>{squadStats.top_warrior.name}</Text>
                <Text style={styles.topWarriorXP}>
                  {squadStats.top_warrior.xp.toLocaleString()} XP • Level {squadStats.top_warrior.level}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <Pressable
            style={[
              styles.viewToggleButton,
              view === 'district' && styles.viewToggleButtonActive,
            ]}
            onPress={() => setView('district')}
          >
            <Text
              style={[
                styles.viewToggleText,
                view === 'district' && styles.viewToggleTextActive,
              ]}
            >
              District {profile.legislative_district}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.viewToggleButton,
              view === 'county' && styles.viewToggleButtonActive,
            ]}
            onPress={() => setView('county')}
          >
            <Text
              style={[
                styles.viewToggleText,
                view === 'county' && styles.viewToggleTextActive,
              ]}
            >
              {profile.county} County
            </Text>
          </Pressable>
        </View>

        {/* Your Rank Banner */}
        {myRank && view === 'district' && (
          <View style={styles.rankBanner}>
            <Text style={styles.rankBannerText}>
              🎯 You're ranked #{myRank} in your district
            </Text>
          </View>
        )}

        {/* Leaderboard */}
        <View style={styles.leaderboardSection}>
          <Text style={styles.sectionTitle}>
            🏆 {view === 'district' ? 'District' : 'County'} Leaderboard
          </Text>
          {leaderboard.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color="#2a3744" />
              <Text style={styles.emptyText}>No warriors in your {view} yet</Text>
              <Text style={styles.emptySubtext}>
                Recruit more members to build your squad!
              </Text>
            </View>
          ) : (
            leaderboard.map((entry, index) => renderLeaderboardEntry(entry, index))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#8b98a5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8b98a5',
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8b98a5',
  },
  checkInCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  checkInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  checkInTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  checkInSubtitle: {
    fontSize: 13,
    color: '#8b98a5',
    marginBottom: 16,
  },
  checkInButton: {
    backgroundColor: '#39FF14',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkInButtonDisabled: {
    opacity: 0.5,
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f1419',
  },
  checkInHint: {
    fontSize: 12,
    color: '#8b98a5',
    textAlign: 'center',
    marginTop: 10,
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0f1419',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8b98a5',
    textAlign: 'center',
  },
  topWarriorBox: {
    backgroundColor: '#0f1419',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#39FF14',
  },
  topWarriorLabel: {
    fontSize: 13,
    color: '#8b98a5',
    marginBottom: 8,
  },
  topWarriorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#39FF14',
    marginBottom: 4,
  },
  topWarriorXP: {
    fontSize: 13,
    color: '#8b98a5',
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#1c2631',
    borderRadius: 10,
    padding: 4,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: '#39FF14',
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b98a5',
  },
  viewToggleTextActive: {
    color: '#0f1419',
  },
  rankBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#1c2631',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#39FF14',
  },
  rankBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  leaderboardSection: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b98a5',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8b98a5',
    textAlign: 'center',
  },
  leaderboardEntry: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  leaderboardEntryHighlight: {
    borderColor: '#39FF14',
    borderWidth: 2,
    backgroundColor: '#1a2b1a',
  },
  leaderboardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0, // Allow flex child to shrink below content size
  },
  leaderboardRank: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    minWidth: 40,
  },
  leaderboardInfo: {
    flex: 1,
    minWidth: 0, // Allow flex child to shrink below content size
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap', // Allow wrapping if needed
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flexShrink: 1, // Allow name to shrink if needed
  },
  leaderBadge: {
    backgroundColor: '#ff6b35',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  leaderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  districtLabel: {
    fontSize: 12,
    color: '#8b98a5',
  },
  leaderboardRight: {
    alignItems: 'flex-end',
  },
  leaderboardXP: {
    fontSize: 16,
    fontWeight: '700',
    color: '#39FF14',
    marginBottom: 2,
  },
  leaderboardLevel: {
    fontSize: 12,
    color: '#8b98a5',
  },
});
