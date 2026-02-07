import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import {
  fetchBallotForUser,
  fetchUserCommitments,
  commitToCandidate,
  removeCommitment,
  type BallotRace,
  type BallotCandidate,
} from '@/lib/supabase/ballot';
import { Ionicons } from '@expo/vector-icons';

export default function BallotScreen() {
  const { profile, user } = useAuth();
  const [races, setRaces] = useState<BallotRace[]>([]);
  const [commitments, setCommitments] = useState<Map<string, string>>(new Map()); // raceId -> candidateId
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBallot = useCallback(async () => {
    if (!profile || !user) {
      setLoading(false);
      return;
    }

    if (!profile.county || !profile.legislative_district) {
      setError('No district information found. Please update your address in Profile.');
      setLoading(false);
      return;
    }

    try {
      // Fetch ballot data
      const { data: ballotData, error: ballotError } = await fetchBallotForUser(
        profile.county,
        profile.legislative_district
      );

      if (ballotError) {
        setError(ballotError.message);
        setRaces([]);
      } else if (!ballotData || ballotData.length === 0) {
        setError(`No ballot data available for ${profile.county} County, District ${profile.legislative_district}.`);
        setRaces([]);
      } else {
        setRaces(ballotData);
        setError(null);
      }

      // Fetch user's commitments
      const { data: commitmentsData, error: commitmentsError } = await fetchUserCommitments(user.id);

      if (!commitmentsError && commitmentsData) {
        const commitmentsMap = new Map<string, string>();
        commitmentsData.forEach((commitment) => {
          commitmentsMap.set(commitment.race_id, commitment.candidate_id);
        });
        setCommitments(commitmentsMap);
      }
    } catch (err) {
      console.error('[BallotScreen] Error loading ballot:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile, user]);

  useEffect(() => {
    loadBallot();
  }, [loadBallot]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBallot();
  };

  const handleToggleCommitment = async (race: BallotRace, candidate: BallotCandidate) => {
    if (!user) return;

    const currentCommitment = commitments.get(race.id);

    if (currentCommitment === candidate.id) {
      // Remove commitment
      const result = await removeCommitment(user.id, race.id);
      if (result.success) {
        const newCommitments = new Map(commitments);
        newCommitments.delete(race.id);
        setCommitments(newCommitments);
      } else {
        if (Platform.OS === 'web') {
          window.alert('Failed to remove commitment: ' + result.error?.message);
        }
      }
    } else {
      // Add/update commitment
      const result = await commitToCandidate(user.id, race.id, candidate.id);
      if (result.success) {
        const newCommitments = new Map(commitments);
        newCommitments.set(race.id, candidate.id);
        setCommitments(newCommitments);
      } else {
        if (Platform.OS === 'web') {
          window.alert('Failed to commit: ' + result.error?.message);
        }
      }
    }
  };

  const completionPercentage = races.length > 0
    ? Math.round((commitments.size / races.length) * 100)
    : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#39FF14" />
          <Text style={styles.loadingText}>Loading your ballot...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🗳️ Your Ballot</Text>
          <Text style={styles.headerSubtitle}>2026 Maryland Primary</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ff4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗳️ Your Ballot</Text>
        <Text style={styles.headerSubtitle}>
          {profile?.county} County, District {profile?.legislative_district}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Ballot Completion</Text>
          <Text style={styles.progressPercentage}>{completionPercentage}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${completionPercentage}%` }]} />
        </View>
        <Text style={styles.progressCount}>
          {commitments.size} of {races.length} races committed
        </Text>
      </View>

      {/* Races List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#39FF14"
            colors={['#39FF14']}
          />
        }
      >
        {races.map((race, index) => (
          <View key={race.id} style={styles.raceCard}>
            <View style={styles.raceHeader}>
              <Text style={styles.raceTitle}>{race.race_title}</Text>
              <View style={[
                styles.raceTypeBadge,
                race.race_type === 'federal' && styles.raceBadgeFederal,
                race.race_type === 'state' && styles.raceBadgeState,
              ]}>
                <Text style={styles.raceTypeText}>{race.race_type.toUpperCase()}</Text>
              </View>
            </View>

            {race.candidates.map((candidate) => {
              const isCommitted = commitments.get(race.id) === candidate.id;
              const isEndorsed = candidate.hard_party_endorsed;

              return (
                <TouchableOpacity
                  key={candidate.id}
                  style={[
                    styles.candidateRow,
                    isCommitted && styles.candidateRowCommitted,
                    isEndorsed && styles.candidateRowEndorsed,
                  ]}
                  onPress={() => handleToggleCommitment(race, candidate)}
                >
                  <View style={styles.candidateInfo}>
                    <Text style={[
                      styles.candidateName,
                      isEndorsed && styles.candidateNameEndorsed,
                    ]}>
                      {candidate.candidate_name}
                      {isEndorsed && ' ⭐'}
                    </Text>
                    <Text style={styles.candidateParty}>{candidate.candidate_party}</Text>
                  </View>
                  <View style={[
                    styles.checkbox,
                    isCommitted && styles.checkboxChecked,
                    isEndorsed && styles.checkboxEndorsed,
                  ]}>
                    {isCommitted && <Ionicons name="checkmark" size={20} color="#0f1419" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Bottom Spacer */}
        <View style={{ height: 32 }} />
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
    fontSize: 16,
    color: '#8b98a5',
  },
  header: {
    paddingHorizontal: 20,
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
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1c2631',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2a3744',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#39FF14',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#2a3744',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#39FF14',
  },
  progressCount: {
    fontSize: 12,
    color: '#8b98a5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  raceCard: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  raceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  raceTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 12,
  },
  raceTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#2a3744',
    borderRadius: 4,
  },
  raceBadgeFederal: {
    backgroundColor: '#1e3a5f',
  },
  raceBadgeState: {
    backgroundColor: '#3a1e5f',
  },
  raceTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8b98a5',
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#0f1419',
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  candidateRowCommitted: {
    backgroundColor: '#1c2631',
    borderColor: '#39FF14',
    borderWidth: 2,
  },
  candidateRowEndorsed: {
    borderColor: '#39FF14',
    borderWidth: 2,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  candidateNameEndorsed: {
    color: '#39FF14',
    fontWeight: '700',
  },
  candidateParty: {
    fontSize: 13,
    color: '#8b98a5',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#8b98a5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkboxChecked: {
    backgroundColor: '#39FF14',
    borderColor: '#39FF14',
  },
  checkboxEndorsed: {
    borderColor: '#39FF14',
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
});
