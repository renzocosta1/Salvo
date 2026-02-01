import { CircularPillageMeter } from '@/components/CircularPillageMeter';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/lib/auth';
import { fetchDirectiveById, insertSalvo, subscribeToSalvos } from '@/lib/supabase/directives';
import type { DirectiveWithProgress } from '@/lib/supabase/types';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

export default function DirectiveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [directive, setDirective] = useState<DirectiveWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [raiding, setRaiding] = useState(false);

  // Load directive data
  useEffect(() => {
    loadDirective();
  }, [id]);

  // Real-time subscription for salvo updates
  useEffect(() => {
    if (!id || !profile) return;

    console.log('[REALTIME] Setting up subscription for directive:', id);
    
    const channel = subscribeToSalvos([id], (payload) => {
      console.log('[REALTIME] Salvo update received:', payload);
      
      // Ignore updates from our own user (we already have optimistic update)
      if (payload.new?.user_id === profile.id) {
        console.log('[REALTIME] Ignoring own update (optimistic already applied)');
        return;
      }
      
      // Update directive count in real-time for OTHER users' actions
      setDirective(prev => {
        if (!prev) return prev;
        
        const newCount = prev.current_salvos + 1;
        const isCompleted = newCount >= prev.target_goal;
        
        console.log(`[REALTIME] Updating count from other user: ${prev.current_salvos} -> ${newCount}`);
        
        return {
          ...prev,
          current_salvos: newCount,
          is_completed: isCompleted,
        };
      });
    });

    return () => {
      console.log('[REALTIME] Cleaning up subscription');
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [id, profile]);

  const loadDirective = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await fetchDirectiveById(id);

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setDirective(data);
      } else {
        setError('Directive not found');
      }
    } catch (err) {
      setError('Failed to load directive');
    } finally {
      setLoading(false);
    }
  };

  // Debounced raid function (500ms)
  const handleRaid = useDebounce(async () => {
    if (!directive || !profile) return;

    setRaiding(true);
    
    console.log('[RAID] Button tapped - inserting to database...', {
      user_id: profile.id,
      directive_id: directive.id,
      title: directive.title,
    });

    try {
      // Insert salvo to database
      const { success, error: insertError } = await insertSalvo(profile.id, directive.id);

      if (success) {
        // Success - salvo recorded
        console.log('[RAID] Salvo inserted successfully!');
        
        // Haptic feedback on success
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        
        // Update local count optimistically
        setDirective(prev => prev ? {
          ...prev,
          current_salvos: prev.current_salvos + 1,
          is_completed: (prev.current_salvos + 1) >= prev.target_goal,
        } : null);

        Alert.alert(
          'RAID SUCCESSFUL',
          '⚔️ Salvo recorded! The Pillage Meter will update momentarily.',
          [{ text: 'CONTINUE', style: 'default' }]
        );
      } else {
        // Error - rate limit or other issue
        console.error('[RAID] Failed:', insertError?.message);
        
        Alert.alert(
          'RAID FAILED',
          insertError?.message || 'Unable to record salvo. Please try again.',
          [{ text: 'OK', style: 'cancel' }]
        );
      }
    } catch (err) {
      console.error('[RAID] Unexpected error:', err);
      Alert.alert(
        'ERROR',
        'Network error. Check your connection and try again.',
        [{ text: 'OK', style: 'cancel' }]
      );
    } finally {
      setRaiding(false);
    }
  }, 500);

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Loading...',
            headerStyle: { backgroundColor: '#0a0a0a' },
            headerTintColor: '#00ff88',
            headerBackTitle: 'Back',
          }}
        />
        <View className="flex-1 bg-tactical-bg justify-center items-center">
          <ActivityIndicator size="large" color="#00ff88" />
          <Text className="mt-4 text-sm font-mono tracking-wider" style={{ color: '#a0a0a0' }}>
            LOADING DIRECTIVE...
          </Text>
        </View>
      </>
    );
  }

  if (error || !directive) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Error',
            headerStyle: { backgroundColor: '#0a0a0a' },
            headerTintColor: '#00ff88',
            headerBackTitle: 'Back',
          }}
        />
        <View className="flex-1 bg-tactical-bg justify-center items-center px-8">
          <View className="w-20 h-20 rounded-full bg-tactical-bgSecondary border-2 items-center justify-center mb-6" style={{ borderColor: '#ff4444' }}>
            <Text className="text-2xl font-bold" style={{ color: '#ff4444' }}>!</Text>
          </View>
          <Text className="text-xl font-bold text-center mb-2" style={{ color: '#ff4444' }}>
            DIRECTIVE NOT FOUND
          </Text>
          <Text className="text-center text-sm" style={{ color: '#a0a0a0' }}>
            {error || 'Unable to load directive data'}
          </Text>
        </View>
      </>
    );
  }

  const progress = Math.min((directive.current_salvos / directive.target_goal) * 100, 100);
  const isComplete = directive.is_completed || progress >= 100;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Directive',
          headerStyle: { backgroundColor: '#0a0a0a' },
          headerTintColor: '#00ff88',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: 'Back',
          headerBackTitleVisible: true,
        }}
      />
      <View className="flex-1 bg-tactical-bg">
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 100 }}
        >
        {/* Completion Status */}
        {isComplete && (
          <View className="mb-4 p-4 rounded-lg border-2" style={{ backgroundColor: 'rgba(0, 255, 136, 0.1)', borderColor: '#00ff88' }}>
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: '#00ff88' }} />
              <Text className="text-lg font-bold tracking-wider" style={{ color: '#00ff88' }}>
                OBJECTIVE COMPLETE
              </Text>
            </View>
          </View>
        )}

        {/* Title */}
        <Text 
          className="text-3xl font-bold tracking-tight mb-4"
          style={{ color: isComplete ? '#00ff88' : '#ffffff' }}
        >
          {directive.title.toUpperCase()}
        </Text>

        {/* Description */}
        {directive.body && (
          <Text className="text-base leading-6 mb-6" style={{ color: '#a0a0a0' }}>
            {directive.body}
          </Text>
        )}

        {/* Circular Pillage Meter */}
        <View className="mb-6 p-6 rounded-lg items-center" style={{ backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333333' }}>
          <Text className="text-xs font-mono tracking-wider mb-4" style={{ color: '#a0a0a0' }}>
            PILLAGE METER
          </Text>
          
          <CircularPillageMeter
            currentCount={directive.current_salvos}
            targetGoal={directive.target_goal}
            size={240}
            strokeWidth={16}
          />
        </View>

        {/* Raid Button */}
        <Pressable
          onPress={handleRaid}
          disabled={raiding || isComplete}
          className="py-6 rounded-lg items-center justify-center"
          style={({ pressed }) => ({
            backgroundColor: isComplete ? '#333333' : (raiding ? '#cc5428' : (pressed ? '#cc5428' : '#ff6b35')),
            opacity: isComplete ? 0.5 : (pressed ? 0.9 : 1),
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <Text className="text-2xl font-bold tracking-wider" style={{ color: '#ffffff' }}>
            {raiding ? 'RAIDING...' : (isComplete ? 'COMPLETE' : 'RAID')}
          </Text>
          {!isComplete && (
            <Text className="text-xs mt-1 font-mono tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              TAP TO PILLAGE
            </Text>
          )}
        </Pressable>

        {/* Debug Info */}
        <View className="mt-6 p-3 rounded" style={{ backgroundColor: '#0a0a0a' }}>
          <Text className="text-xs font-mono mb-1" style={{ color: '#666666' }}>
            DIRECTIVE ID: {directive.id}
          </Text>
          <Text className="text-xs font-mono" style={{ color: '#666666' }}>
            PARTY-WIDE: {directive.is_party_wide ? 'YES' : 'NO'}
          </Text>
        </View>
      </ScrollView>

        {/* Floating Back Button */}
        <Pressable
          onPress={() => router.back()}
          className="absolute bottom-6 left-6 flex-row items-center px-4 py-3 rounded-lg"
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#1a1a1a' : '#0a0a0a',
            borderWidth: 2,
            borderColor: '#00ff88',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text className="text-2xl mr-2" style={{ color: '#00ff88' }}>←</Text>
          <Text className="font-bold tracking-wider" style={{ color: '#00ff88' }}>
            BACK
          </Text>
        </Pressable>
      </View>
    </>
  );
}
