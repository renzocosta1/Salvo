import { useAuth } from '@/lib/auth';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface ProfileData {
  display_name: string | null;
  level: number;
  xp: number;
  rank: {
    name: string;
    level_min: number;
    level_max: number;
  } | null;
}

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [profile]);

  const loadProfile = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          display_name,
          level,
          xp,
          rank:ranks(name, level_min, level_max)
        `)
        .eq('id', profile.id)
        .single();

      if (error) throw error;
      setProfileData(data as ProfileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profileData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Profile Not Found</Text>
      </View>
    );
  }

  // Calculate XP progress to next level
  const currentLevelXp = profileData.level * profileData.level * 100;
  const nextLevelXp = (profileData.level + 1) * (profileData.level + 1) * 100;
  const xpToNextLevel = nextLevelXp - profileData.xp;
  const progressPercent = ((profileData.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

  const rankName = profileData.rank?.name || 'Recruit';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color="#3498db" />
        </View>
        <Text style={styles.displayName}>{profileData.display_name || 'Unnamed Warrior'}</Text>
        <Text style={styles.rankBadge}>{rankName}</Text>
      </View>

      {/* Stats Cards Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profileData.level}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profileData.xp.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total XP</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{xpToNextLevel.toLocaleString()}</Text>
          <Text style={styles.statLabel}>XP to Next</Text>
        </View>
      </View>

      {/* XP Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Next Level Progress</Text>
          <Text style={styles.progressPercentage}>{Math.round(progressPercent)}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(progressPercent, 100)}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <Pressable
          style={({ pressed }) => [styles.listItem, pressed && styles.listItemPressed]}
          onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available soon')}
        >
          <View style={styles.listItemLeft}>
            <Ionicons name="person-outline" size={24} color="#8b98a5" />
            <Text style={styles.listItemText}>Edit Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#8b98a5" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.listItem, pressed && styles.listItemPressed]}
          onPress={() => Alert.alert('Coming Soon', 'Notifications settings will be available soon')}
        >
          <View style={styles.listItemLeft}>
            <Ionicons name="notifications-outline" size={24} color="#8b98a5" />
            <Text style={styles.listItemText}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#8b98a5" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.listItem, pressed && styles.listItemPressed]}
          onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available soon')}
        >
          <View style={styles.listItemLeft}>
            <Ionicons name="shield-outline" size={24} color="#8b98a5" />
            <Text style={styles.listItemText}>Privacy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#8b98a5" />
        </Pressable>
      </View>

      {/* Sign Out Button */}
      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  content: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f1419',
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
    backgroundColor: '#0f1419',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff6b35',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1c2631',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  rankBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
    backgroundColor: '#1c2631',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3744',
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
  },
  progressSection: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#0f1419',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  listItemPressed: {
    backgroundColor: '#2a3744',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listItemText: {
    fontSize: 16,
    color: '#ffffff',
  },
  signOutButton: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff6b35',
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b35',
  },
});
