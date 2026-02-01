import { DirectiveCard } from '@/components/feed/DirectiveCard';
import { EmptyFeed } from '@/components/feed/EmptyFeed';
import { useDirectives } from '@/hooks/useDirectives';
import { useAuth } from '@/lib/auth';
import React from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

export default function CommandFeedScreen() {
  const { profile, signOut } = useAuth();
  const { directives, loading, error, refreshing, refresh } = useDirectives();


  // Guard: Don't render if no profile (prevents flash when redirecting to login)
  if (!profile) {
    return (
      <View className="flex-1 bg-tactical-bg justify-center items-center">
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

  // Loading state
  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-tactical-bg justify-center items-center">
        <ActivityIndicator size="large" color="#00ff88" />
        <Text className="mt-4 text-sm font-mono tracking-wider" style={{ color: '#a0a0a0' }}>
          LOADING DIRECTIVES...
        </Text>
      </View>
    );
  }

  // Error state
  if (error && !refreshing) {
    return (
      <View className="flex-1 bg-tactical-bg justify-center items-center px-8">
        <View className="w-20 h-20 rounded-full bg-tactical-bgSecondary border-2 items-center justify-center mb-6" style={{ borderColor: '#ff4444' }}>
          <Text className="text-2xl font-bold" style={{ color: '#ff4444' }}>!</Text>
        </View>
        <Text className="text-xl font-bold text-center mb-2" style={{ color: '#ff4444' }}>
          CONNECTION FAILED
        </Text>
        <Text className="text-center text-sm" style={{ color: '#a0a0a0' }}>
          {error.message}
        </Text>
      </View>
    );
  }

  return (
    <View 
      className="flex-1 bg-tactical-bg"
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View className="px-4 pb-4 border-b border-tactical-border" style={{ paddingTop: 60 }}>
        <View className="flex-row items-center justify-between mb-2">
          <Text 
            className="text-3xl font-bold tracking-tight flex-1"
            style={{ color: '#ffffff' }}
          >
            COMMAND FEED
          </Text>
          <Pressable
            onPress={() => {
              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: () => signOut(),
                  },
                ]
              );
            }}
            className="px-4 py-2 rounded ml-3"
            style={{ backgroundColor: '#ff4444' }}
          >
            <Text className="text-white text-xs font-bold">SIGN OUT</Text>
          </Pressable>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm" style={{ color: '#a0a0a0' }}>
            {profile.role.toUpperCase()} • LEVEL {profile.level}
          </Text>
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#00ff88' }} />
            <Text className="text-xs font-mono tracking-wider" style={{ color: '#00ff88' }}>
              LIVE
            </Text>
          </View>
        </View>
      </View>

      {/* Directive List */}
      {directives.length === 0 ? (
        <EmptyFeed />
      ) : (
        <FlatList
          data={directives}
          renderItem={({ item }) => <DirectiveCard directive={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#00ff88"
              colors={['#00ff88']}
            />
          }
        />
      )}
    </View>
  );
}
