import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { fetchBallotForUser, type BallotRace } from '@/lib/supabase/ballot';
import { Ionicons } from '@expo/vector-icons';
import OfficialBallotView from '@/components/OfficialBallotView';

export default function BallotScreen() {
  const { profile, user } = useAuth();
  const [races, setRaces] = useState<BallotRace[]>([]);
  const [loading, setLoading] = useState(true);
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
        // No ballot data yet - this is expected until official 2026 ballot is released
        setError(null);
        setRaces([]);
      } else {
        setRaces(ballotData);
        setError(null);
      }

    } catch (err) {
      console.error('[BallotScreen] Error loading ballot:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [profile, user]);

  useEffect(() => {
    loadBallot();
  }, [loadBallot]);

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

  return (
    <SafeAreaView style={styles.container}>
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ff4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : races.length === 0 ? (
        <View style={styles.comingSoonContainer}>
          <Ionicons name="calendar-outline" size={80} color="#0066cc" />
          <Text style={styles.comingSoonTitle}>Ballot Coming Soon!</Text>
          <Text style={styles.comingSoonText}>
            The official 2026 Maryland Republican Primary ballot will be published by the Maryland State Board of Elections in <Text style={styles.highlight}>April 2026</Text>.
          </Text>
          <Text style={styles.comingSoonText}>
            Once released, Hard Party leaders will carefully research all candidates and <Text style={styles.highlight}>endorse the best</Text> choices for each race.
          </Text>
          <Text style={styles.comingSoonText}>
            When you vote, simply follow our endorsements and <Text style={styles.highlight}>we win as a unified bloc</Text>! 🎯
          </Text>
          <View style={styles.primaryInfoBox}>
            <Text style={styles.primaryInfoTitle}>📅 2026 PRIMARY DATES</Text>
            <Text style={styles.primaryInfoText}>• Registration Deadline: May 3, 2026</Text>
            <Text style={styles.primaryInfoText}>• Early Voting: June 12-20, 2026</Text>
            <Text style={styles.primaryInfoText}>• Election Day: June 24, 2026</Text>
          </View>
        </View>
      ) : (
        <>
          {/* Ballot Status Banner */}
          <View style={styles.ballotBanner}>
            <Ionicons name="information-circle" size={18} color="#0066cc" />
            <Text style={styles.ballotBannerText}>
              Official 2026 ballot releases April 2026. Hard Party leaders will research and endorse the best candidates. We vote as one unified bloc for maximum power! 🎯
            </Text>
          </View>
          <OfficialBallotView races={races} county={profile?.county} loading={loading} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  ballotBanner: {
    backgroundColor: '#e6f2ff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#0066cc',
    gap: 8,
  },
  ballotBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066cc',
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    color: '#666',
    textAlign: 'center',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 20,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  highlight: {
    fontWeight: 'bold',
    color: '#0066cc',
  },
  primaryInfoBox: {
    backgroundColor: '#f0f8ff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0066cc',
    marginTop: 20,
    width: '100%',
  },
  primaryInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    paddingLeft: 10,
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  comingSoonTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 20,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
    maxWidth: 400,
  },
});
