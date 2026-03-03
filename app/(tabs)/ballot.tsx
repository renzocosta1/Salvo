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
        setError(`No ballot data available for ${profile.county} County, District ${profile.legislative_district}.`);
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
      ) : (
        <>
          {/* Test Banner */}
          <View style={styles.testBanner}>
            <Ionicons name="information-circle" size={16} color="#0066cc" />
            <Text style={styles.testBannerText}>
              2024 PRIMARY BALLOT (Testing) - This is a sample ballot for feature testing
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
  testBanner: {
    backgroundColor: '#e6f2ff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#0066cc',
    gap: 8,
  },
  testBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066cc',
    textAlign: 'center',
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
});
