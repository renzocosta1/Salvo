import { useAuth } from '@/lib/auth';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState<ProfileData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

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

  const handleLookup = async () => {
    if (!lookupId.trim()) return;

    setLookupLoading(true);
    setLookupResult(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          display_name,
          level,
          xp,
          rank:ranks(name, level_min, level_max)
        `)
        .eq('id', lookupId.trim())
        .single();

      if (error) throw error;
      setLookupResult(data as ProfileData);
    } catch (error) {
      console.error('Error looking up user:', error);
      setLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  if (loading) {
    return (
      <View className="flex-1 bg-tactical-bg justify-center items-center">
        <ActivityIndicator size="large" color="#00ff88" />
        <Text className="mt-4 text-sm font-mono tracking-wider" style={{ color: '#a0a0a0' }}>
          LOADING PROFILE...
        </Text>
      </View>
    );
  }

  if (!profileData) {
    return (
      <View className="flex-1 bg-tactical-bg justify-center items-center px-8">
        <Text className="text-xl font-bold text-center" style={{ color: '#ff4444' }}>
          PROFILE NOT FOUND
        </Text>
      </View>
    );
  }

  // Calculate XP progress to next level
  const currentLevelXp = profileData.level * profileData.level * 100;
  const nextLevelXp = (profileData.level + 1) * (profileData.level + 1) * 100;
  const xpToNextLevel = nextLevelXp - profileData.xp;
  const progressPercent = ((profileData.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

  const rankName = profileData.rank?.name || 'Recruit';
  const rankColor = 
    rankName === 'Centurion' ? '#ffd700' :
    rankName === 'Warrior' ? '#00ff88' :
    '#a0a0a0';

  return (
    <View className="flex-1 bg-tactical-bg">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-xs font-mono tracking-wider mb-2" style={{ color: '#a0a0a0' }}>
            WARRIOR PROFILE
          </Text>
          <Text className="text-3xl font-bold tracking-tight" style={{ color: '#ffffff' }}>
            {profileData.display_name || 'UNNAMED WARRIOR'}
          </Text>
        </View>

        {/* Rank Badge */}
        <View
          className="mb-6 p-6 rounded-lg border-2"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderColor: rankColor,
          }}
        >
          <Text className="text-xs font-mono tracking-wider mb-2" style={{ color: '#a0a0a0' }}>
            RANK
          </Text>
          <Text className="text-4xl font-bold tracking-tight" style={{ color: rankColor }}>
            {rankName.toUpperCase()}
          </Text>
          <Text className="text-sm mt-2" style={{ color: '#a0a0a0' }}>
            Level {profileData.rank?.level_min || 0} - {profileData.rank?.level_max || 4}
          </Text>
        </View>

        {/* Level & XP */}
        <View className="mb-6 p-6 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-xs font-mono tracking-wider mb-1" style={{ color: '#a0a0a0' }}>
                LEVEL
              </Text>
              <Text className="text-5xl font-bold" style={{ color: '#00ff88' }}>
                {profileData.level}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs font-mono tracking-wider mb-1" style={{ color: '#a0a0a0' }}>
                TOTAL XP
              </Text>
              <Text className="text-2xl font-bold" style={{ color: '#ffffff' }}>
                {profileData.xp.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View className="mb-2">
            <Text className="text-xs font-mono tracking-wider mb-2" style={{ color: '#a0a0a0' }}>
              NEXT LEVEL: {xpToNextLevel.toLocaleString()} XP
            </Text>
            <View className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
              <View
                className="h-full rounded-full"
                style={{
                  backgroundColor: '#00ff88',
                  width: `${Math.min(progressPercent, 100)}%`,
                }}
              />
            </View>
          </View>
        </View>

        {/* Compare Stats */}
        <View className="mb-6 p-6 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
          <Text className="text-xs font-mono tracking-wider mb-4" style={{ color: '#a0a0a0' }}>
            COMPARE STATS
          </Text>
          <TextInput
            className="mb-4 p-4 rounded-lg border-2 text-white font-mono"
            style={{
              backgroundColor: '#0a0a0a',
              borderColor: '#2a2a2a',
              color: '#ffffff',
            }}
            placeholder="Enter user ID..."
            placeholderTextColor="#666666"
            value={lookupId}
            onChangeText={setLookupId}
          />
          <Pressable
            onPress={handleLookup}
            disabled={lookupLoading || !lookupId.trim()}
            className="py-4 rounded-lg items-center"
            style={({ pressed }) => ({
              backgroundColor: lookupLoading || !lookupId.trim() ? '#2a2a2a' : pressed ? '#00cc6a' : '#00ff88',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text className="text-lg font-bold tracking-wider" style={{ color: '#0a0a0a' }}>
              {lookupLoading ? 'SEARCHING...' : 'LOOKUP'}
            </Text>
          </Pressable>

          {/* Lookup Result */}
          {lookupResult && (
            <View className="mt-4 p-4 rounded-lg border-2" style={{ backgroundColor: '#0a0a0a', borderColor: '#2a2a2a' }}>
              <Text className="text-lg font-bold mb-2" style={{ color: '#ffffff' }}>
                {lookupResult.display_name || 'UNNAMED WARRIOR'}
              </Text>
              <Text className="text-sm mb-1" style={{ color: '#a0a0a0' }}>
                Level {lookupResult.level} • {lookupResult.xp.toLocaleString()} XP
              </Text>
              <Text className="text-sm font-bold" style={{ color: '#00ff88' }}>
                {lookupResult.rank?.name.toUpperCase() || 'RECRUIT'}
              </Text>
            </View>
          )}
        </View>

        {/* Sign Out Button */}
        <Pressable
          onPress={handleSignOut}
          className="py-4 rounded-lg items-center border-2"
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#1a1a1a' : '#0a0a0a',
            borderColor: '#ff4444',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text className="text-lg font-bold tracking-wider" style={{ color: '#ff4444' }}>
            SIGN OUT
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
