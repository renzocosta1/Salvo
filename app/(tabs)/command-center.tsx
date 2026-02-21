import { useAuth } from '@/lib/auth';
import { fetchDirectivesForUser } from '@/lib/supabase/directives';
import type { DirectiveWithProgress } from '@/lib/supabase/types';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { router } from 'expo-router';

export default function CommandCenterScreen() {
  const { profile } = useAuth();
  const [missions, setMissions] = useState<DirectiveWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMissions();
  }, [profile?.party_id]);

  const loadMissions = async () => {
    if (!profile?.party_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await fetchDirectivesForUser(profile);
    
    if (result.data) {
      setMissions(result.data);
    } else if (result.error) {
      Alert.alert('Error', 'Failed to load missions');
    }
    
    setLoading(false);
  };

  const handleMissionPress = (mission: DirectiveWithProgress) => {
    // Navigate to mission detail screen
    router.push({
      pathname: '/(tabs)/mission/[id]' as any,
      params: { id: mission.id },
    });
  };

  const getMissionIcon = (mission: DirectiveWithProgress) => {
    if (mission.mission_type === 'EARLY_RAID') return '⚡';
    if (mission.mission_type === 'ELECTION_DAY_SIEGE') return '🔥';
    if (mission.title.includes('Relational Raid')) return '🎯';
    if (mission.title.includes('Digital Ballot')) return '🗳️';
    return '📋';
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return '⏰ EXPIRED';
    if (days === 0) return '⏰ TODAY';
    if (days === 1) return '⏰ 1 DAY LEFT';
    return `⏰ ${days} DAYS LEFT`;
  };

  const getProgressPercentage = (mission: DirectiveWithProgress) => {
    return Math.min(100, Math.round((mission.current_salvos / mission.target_goal) * 100));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff00" />
        <Text style={styles.loadingText}>Loading missions...</Text>
      </View>
    );
  }

  if (!profile?.party_id) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>No Party Assigned</Text>
        <Text style={styles.errorText}>
          Complete onboarding to access tactical missions.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎯 Tactical Commands</Text>
        <Text style={styles.headerSubtitle}>
          Montgomery County & MD-6 • Primary 2026
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={styles.scrollContentContainer}
      >
        {missions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active missions</Text>
          </View>
        ) : (
          missions.map((mission) => {
            const icon = getMissionIcon(mission);
            const deadline = formatDeadline(mission.mission_deadline);
            const progress = getProgressPercentage(mission);
            const isCompleted = mission.is_completed;

            return (
              <Pressable
                key={mission.id}
                style={({ pressed }) => [
                  styles.missionCard,
                  pressed && styles.missionCardPressed,
                  isCompleted && styles.missionCardCompleted,
                ]}
                onPress={() => handleMissionPress(mission)}
              >
                {/* Header Row */}
                <View style={styles.missionHeader}>
                  <Text style={styles.missionIcon}>{icon}</Text>
                  <View style={styles.missionHeaderText}>
                    <Text style={styles.missionTitle} numberOfLines={1}>
                      {mission.title}
                    </Text>
                    {deadline && (
                      <Text style={[
                        styles.missionDeadline,
                        deadline.includes('EXPIRED') && styles.deadlineExpired
                      ]}>
                        {deadline}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Mission Brief */}
                {mission.body && (
                  <Text style={styles.missionBrief} numberOfLines={2}>
                    {mission.body.split('\n')[0]}
                  </Text>
                )}

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${progress}%` },
                        isCompleted && styles.progressBarCompleted
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {mission.current_salvos.toLocaleString()} / {mission.target_goal.toLocaleString()}
                  </Text>
                </View>

                {/* Tags */}
                <View style={styles.tagContainer}>
                  {mission.requires_gps && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>📍 GPS Required</Text>
                    </View>
                  )}
                  {mission.mission_type && (
                    <View style={[styles.tag, styles.tagMissionType]}>
                      <Text style={styles.tagText}>
                        {mission.mission_type.replace('_', ' ')}
                      </Text>
                    </View>
                  )}
                  {isCompleted && (
                    <View style={[styles.tag, styles.tagCompleted]}>
                      <Text style={styles.tagText}>✅ COMPLETED</Text>
                    </View>
                  )}
                </View>

                {/* CTA */}
                <View style={styles.ctaRow}>
                  <Text style={styles.ctaText}>
                    {isCompleted ? 'View Details →' : 'Start Mission →'}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#1a1f26',
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8b98a5',
    fontWeight: '500',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f1419',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8b98a5',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0f1419',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 15,
    color: '#8b98a5',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8b98a5',
  },
  missionCard: {
    backgroundColor: '#1a1f26',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2d3748',
  },
  missionCardPressed: {
    opacity: 0.8,
    borderColor: '#00ff00',
  },
  missionCardCompleted: {
    borderColor: '#00ff0044',
    opacity: 0.85,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  missionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  missionHeaderText: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  missionDeadline: {
    fontSize: 12,
    color: '#00ff00',
    fontWeight: '600',
  },
  deadlineExpired: {
    color: '#ff4444',
  },
  missionBrief: {
    fontSize: 14,
    color: '#8b98a5',
    lineHeight: 20,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#2d3748',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00ff00',
    borderRadius: 4,
  },
  progressBarCompleted: {
    backgroundColor: '#00ff00',
  },
  progressText: {
    fontSize: 12,
    color: '#8b98a5',
    fontWeight: '600',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#2d3748',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagMissionType: {
    backgroundColor: '#1e40af22',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  tagCompleted: {
    backgroundColor: '#00ff0022',
    borderWidth: 1,
    borderColor: '#00ff00',
  },
  tagText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  ctaRow: {
    marginTop: 4,
  },
  ctaText: {
    fontSize: 14,
    color: '#00ff00',
    fontWeight: '700',
  },
});
