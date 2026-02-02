import { DirectiveCard } from '@/components/feed/DirectiveCard';
import { EmptyFeed } from '@/components/feed/EmptyFeed';
import { useDirectives } from '@/hooks/useDirectives';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function CommandFeedScreen() {
  const { profile, signOut } = useAuth();
  const { directives, loading, error, refreshing, refresh } = useDirectives();
  const router = useRouter();

  // Guard: Don't render if no profile (prevents flash when redirecting to login)
  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading directives...</Text>
      </View>
    );
  }

  // Error state
  if (error && !refreshing) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>!</Text>
        </View>
        <Text style={styles.errorTitle}>Connection Failed</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Command Feed</Text>
            <Text style={styles.headerSubtitle}>
              {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} • Level{' '}
              {profile.level}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: () => signOut(),
                },
              ]);
            }}
            style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </Pressable>
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
          contentContainerStyle={styles.listContent}
          style={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#ffffff"
              colors={['#ffffff']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419', // Citizen dark blue-black
  },
  header: {
    backgroundColor: '#0f1419',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3744', // Subtle border
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff', // White text
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8b98a5', // Muted gray
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1c2631', // Darker card background
    borderRadius: 8,
  },
  signOutButtonPressed: {
    opacity: 0.7,
  },
  signOutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b35', // Soft red/orange
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 32,
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
    paddingHorizontal: 32,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1c2631',
    borderWidth: 2,
    borderColor: '#ff6b35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorIconText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ff6b35',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#8b98a5',
    textAlign: 'center',
  },
});
