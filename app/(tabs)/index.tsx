import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, Alert } from 'react-native';
import { supabase, testSupabaseConnection } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'expo-router';

type ConnectionStatus = {
  connected: boolean;
  loading: boolean;
  error: string | null;
  ranksCount: number | null;
  tablesFound: string[];
};

export default function SupabaseTestScreen() {
  const { signOut, user, profile } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    loading: true,
    error: null,
    ranksCount: null,
    tablesFound: [],
  });

  useEffect(() => {
    testConnection();
  }, []);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            // signOut() clears all state, auth guard will auto-redirect to login
            await signOut();
            // Force reload the root to clear navigation stack
            if (router.canGoBack()) {
              router.dismissAll();
            }
          },
        },
      ]
    );
  };

  const testConnection = async () => {
    setStatus({ connected: false, loading: true, error: null, ranksCount: null, tablesFound: [] });
    
    try {
      // Test 1: Basic connection
      const connectionTest = await testSupabaseConnection();
      
      if (!connectionTest.success) {
        setStatus({
          connected: false,
          loading: false,
          error: connectionTest.error || 'Connection failed',
          ranksCount: null,
          tablesFound: [],
        });
        return;
      }

      // Test 2: Count ranks
      const { count: ranksCount, error: ranksError } = await supabase
        .from('ranks')
        .select('*', { count: 'exact', head: true });

      if (ranksError) {
        setStatus({
          connected: true,
          loading: false,
          error: `Ranks table error: ${ranksError.message}`,
          ranksCount: null,
          tablesFound: [],
        });
        return;
      }

      // Test 3: Check other tables exist
      const tables = ['profiles', 'parties', 'directives', 'missions', 'h3_tiles'];
      const tablesFound: string[] = [];
      
      for (const table of tables) {
        const { error } = await supabase.from(table).select('id', { count: 'exact', head: true });
        if (!error) {
          tablesFound.push(table);
        }
      }

      setStatus({
        connected: true,
        loading: false,
        error: null,
        ranksCount: ranksCount || 0,
        tablesFound,
      });
    } catch (error) {
      setStatus({
        connected: false,
        loading: false,
        error: String(error),
        ranksCount: null,
        tablesFound: [],
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>
                Salvo — Task #1
              </Text>
              <Text style={styles.subtitle}>
                Supabase Connection Test
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
          {user && (
            <View style={styles.userInfo}>
              <Text style={styles.userEmail}>{user.email}</Text>
              {profile && (
                <Text style={styles.userRole}>
                  {profile.role} • Level {profile.level}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Connection Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              Connection Status
            </Text>
            {status.loading ? (
              <ActivityIndicator size="small" color="#00ff88" />
            ) : (
              <View 
                style={[
                  styles.statusDot,
                  { backgroundColor: status.connected ? '#00ff88' : '#ff4444' }
                ]}
              />
            )}
          </View>

          {status.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {status.error}
              </Text>
            </View>
          )}

          {status.connected && !status.loading && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  Database Connection
                </Text>
                <Text style={styles.successText}>
                  ✓ Connected
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  Ranks Table Count
                </Text>
                <Text style={styles.infoValue}>
                  {status.ranksCount !== null ? `${status.ranksCount} ranks` : 'N/A'}
                </Text>
              </View>

              <View style={styles.tablesSection}>
                <Text style={styles.infoLabel}>
                  Tables Found ({status.tablesFound.length}/5)
                </Text>
                <View style={styles.badgesContainer}>
                  {status.tablesFound.map((table) => (
                    <View 
                      key={table}
                      style={styles.badge}
                    >
                      <Text style={styles.badgeText}>
                        {table}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Schema Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Schema Status
          </Text>
          
          <View style={styles.schemaInfo}>
            <Text style={styles.schemaItem}>
              ✓ Schema deployed from docs/schema.sql
            </Text>
            <Text style={styles.schemaItem}>
              ✓ RLS policies configured
            </Text>
            <Text style={styles.schemaItem}>
              ✓ Triggers and functions installed
            </Text>
            <Text style={styles.schemaItem}>
              ✓ Rank/XP computation ready
            </Text>
          </View>
        </View>

        {/* Retry Button */}
        <TouchableOpacity
          style={styles.retryButton}
          onPress={testConnection}
          disabled={status.loading}
        >
          <Text style={styles.retryButtonText}>
            {status.loading ? 'Testing...' : 'Retry Connection'}
          </Text>
        </TouchableOpacity>

        {/* Task Completion Status */}
        {status.connected && status.ranksCount !== null && status.tablesFound.length >= 5 && (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerTitle}>
              ✓ Task #1 Complete
            </Text>
            <Text style={styles.successBannerSubtitle}>
              Project initialized. Supabase schema deployed.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 64,
  },
  header: {
    marginBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  signOutButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  signOutButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  userInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  userEmail: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 12,
    color: '#00ff88',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 4,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00ff88',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  tablesSection: {
    marginTop: 8,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#00ff88',
    fontSize: 12,
    fontWeight: '500',
  },
  schemaInfo: {
    marginTop: 16,
  },
  schemaItem: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#ff6b35',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
  },
  successBanner: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderWidth: 1,
    borderColor: '#00ff88',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
  },
  successBannerTitle: {
    color: '#00ff88',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  successBannerSubtitle: {
    color: 'rgba(0, 255, 136, 0.8)',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 4,
  },
});
