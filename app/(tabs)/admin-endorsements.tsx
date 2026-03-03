/**
 * Admin Endorsements Screen
 * Leaders-only screen for setting candidate endorsements
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { BallotRace } from '@/lib/supabase/ballot';
import {
  fetchRacesForGeography,
  getAffectedUserCount,
  batchUpdateEndorsements,
} from '@/lib/supabase/endorsements';
import GeographyFilter from '@/components/admin/GeographyFilter';
import RaceEndorsementCard from '@/components/admin/RaceEndorsementCard';

interface PendingEndorsement {
  candidateId: string;
  endorsed: boolean;
  candidateName: string;
  raceTitle: string;
}

export default function AdminEndorsementsScreen() {
  const { profile } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedCounty, setSelectedCounty] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [races, setRaces] = useState<BallotRace[]>([]);
  const [affectedUsersCount, setAffectedUsersCount] = useState<number>(0);
  const [affectedGeography, setAffectedGeography] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingEndorsement>>(new Map());

  // Access control: Only leaders can access this screen
  if (!profile?.leadership_role) {
    return (
      <SafeAreaView style={styles.accessDeniedContainer}>
        <Text style={styles.accessDeniedIcon}>🔒</Text>
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedText}>
          This screen is only available to district/county/state leaders.
        </Text>
      </SafeAreaView>
    );
  }

  const handleGeographySelected = useCallback(
    async (county: string, district: string) => {
      setSelectedCounty(county);
      setSelectedDistrict(district);
      setLoading(true);

      try {
        // Fetch races for this geography
        const { data: racesData, error: racesError } = await fetchRacesForGeography(
          county,
          district
        );

        if (racesError || !racesData) {
          Alert.alert('Error', racesError?.message || 'Failed to load races');
          setRaces([]);
          return;
        }

        setRaces(racesData);

        // Get affected user count (for the first race to get base count)
        if (racesData.length > 0 && profile.congressional_district) {
          const { count, geography } = await getAffectedUserCount(
            racesData[0],
            county,
            district,
            profile.congressional_district
          );
          setAffectedUsersCount(count);
          setAffectedGeography(geography);
        }
      } catch (error) {
        console.error('Error loading geography:', error);
        Alert.alert('Error', 'Failed to load races');
      } finally {
        setLoading(false);
      }
    },
    [profile]
  );

  const handleToggleSelection = useCallback(
    (candidateId: string, endorsed: boolean, candidateName: string, raceTitle: string) => {
      setPendingChanges((prev) => {
        const newChanges = new Map(prev);
        newChanges.set(candidateId, {
          candidateId,
          endorsed,
          candidateName,
          raceTitle,
        });
        return newChanges;
      });
    },
    []
  );

  const handleSaveAllChanges = useCallback(async () => {
    if (pendingChanges.size === 0 || !profile) return;

    const changesArray = Array.from(pendingChanges.values());
    const endorseCount = changesArray.filter((c) => c.endorsed).length;
    const unendorseCount = changesArray.filter((c) => !c.endorsed).length;

    // Show confirmation dialog
    Alert.alert(
      'Save Endorsements?',
      `You are about to:\n\n` +
      `✓ Endorse ${endorseCount} candidate(s)\n` +
      `✗ Un-endorse ${unendorseCount} candidate(s)\n\n` +
      `This will affect ${affectedUsersCount} users in ${affectedGeography}.\n\n` +
      `Changes will apply immediately to all ballots.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save All Changes',
          style: 'default',
          onPress: async () => {
            setSaving(true);

            try {
              const result = await batchUpdateEndorsements(
                changesArray,
                races,
                profile.id,
                affectedGeography,
                affectedUsersCount
              );

              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to save endorsements');
                return;
              }

              // Clear pending changes
              setPendingChanges(new Map());

              // Reload races to reflect changes
              await handleGeographySelected(selectedCounty, selectedDistrict);

              Alert.alert(
                'Success! ✓',
                `Endorsements saved successfully.\n\n${affectedUsersCount} users' ballots have been updated.`
              );
            } catch (error) {
              console.error('Error saving endorsements:', error);
              Alert.alert('Error', 'Failed to save endorsements');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }, [pendingChanges, profile, affectedUsersCount, affectedGeography, races, selectedCounty, selectedDistrict, handleGeographySelected]);

  const handleCancelChanges = useCallback(() => {
    if (pendingChanges.size === 0) return;

    Alert.alert(
      'Discard Changes?',
      `You have ${pendingChanges.size} pending change(s). Are you sure you want to discard them?`,
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => setPendingChanges(new Map()),
        },
      ]
    );
  }, [pendingChanges.size]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Admin: Endorsements</Text>
          <Text style={styles.pageSubtitle}>
            Set candidate endorsements for your geography
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {profile.leadership_role?.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Geography Filter */}
        <GeographyFilter
          onGeographySelected={handleGeographySelected}
          loading={loading}
        />

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading races...</Text>
          </View>
        )}

        {/* Races List */}
        {!loading && races.length === 0 && selectedCounty && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No races found for this geography</Text>
            <Text style={styles.emptySubtext}>
              Make sure ballot data is seeded for {selectedCounty} County, District {selectedDistrict}
            </Text>
          </View>
        )}

        {!loading && races.length > 0 && (
          <>
            <Text style={styles.racesHeader}>
              {races.length} Races • {selectedCounty} County, District {selectedDistrict}
            </Text>
            <View style={styles.instructionBanner}>
              <Text style={styles.instructionText}>
                ℹ️ Select candidates below, then click "Save Endorsements" at the bottom
              </Text>
            </View>
            {races.map((race) => (
              <RaceEndorsementCard
                key={race.id}
                race={race}
                affectedUsersCount={affectedUsersCount}
                affectedGeography={affectedGeography}
                onToggleSelection={handleToggleSelection}
                pendingChanges={pendingChanges}
              />
            ))}
          </>
        )}

        {/* Help Section */}
        {!loading && races.length === 0 && !selectedCounty && (
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>Getting Started</Text>
            <Text style={styles.helpText}>
              1. Select a county and district above{'\n'}
              2. Click "Load Races" to view ballot races{'\n'}
              3. Tap candidates to endorse/un-endorse them{'\n'}
              4. Changes affect all users in that geography immediately
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {pendingChanges.size > 0 && (
        <View style={styles.fabContainer}>
          <View style={styles.fabButtons}>
            <Pressable
              style={[styles.fabButton, styles.fabButtonCancel]}
              onPress={handleCancelChanges}
              disabled={saving}
            >
              <Text style={styles.fabButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.fabButton, styles.fabButtonSave, saving && styles.fabButtonDisabled]}
              onPress={handleSaveAllChanges}
              disabled={saving}
            >
              <Text style={styles.fabButtonText}>
                {saving ? 'Saving...' : `Save ${pendingChanges.size} Change${pendingChanges.size === 1 ? '' : 's'}`}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  pageHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  roleBadge: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  racesHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    paddingLeft: 4,
  },
  instructionBanner: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  instructionText: {
    fontSize: 13,
    color: '#1565c0',
    textAlign: 'center',
    lineHeight: 18,
  },
  helpContainer: {
    backgroundColor: '#f0f8ff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066cc',
    marginTop: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
  },
  accessDeniedIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  accessDeniedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  accessDeniedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: '#000',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  fabButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabButtonSave: {
    backgroundColor: '#00aa00',
  },
  fabButtonCancel: {
    backgroundColor: '#666',
  },
  fabButtonDisabled: {
    opacity: 0.5,
  },
  fabButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
