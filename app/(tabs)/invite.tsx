import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import {
  getMyInviteCode,
  getInviteStats,
  getMyInvites,
  type Invite,
} from '@/lib/recruiting/invites';
import { shareInvite } from '@/lib/recruiting/sms';

export default function InviteScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [stats, setStats] = useState({ total: 0, accepted: 0, pending: 0 });
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    loadInviteData();
  }, [profile]);

  const loadInviteData = async () => {
    if (!profile) return;

    setLoading(true);

    // Load invite code
    const codeResult = await getMyInviteCode(profile.id);
    if (codeResult.success && codeResult.code) {
      setInviteCode(codeResult.code);
    }

    // Load stats
    const statsResult = await getInviteStats(profile.id);
    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data);
    }

    // Load invite history
    const invitesResult = await getMyInvites(profile.id);
    if (invitesResult.success && invitesResult.data) {
      setInvites(invitesResult.data);
    }

    setLoading(false);
  };

  const handleCopyCode = () => {
    Clipboard.setString(inviteCode);
    Alert.alert('Copied!', 'Invite code copied to clipboard');
  };

  const handleShare = async () => {
    const userName = profile?.display_name || 'A friend';
    const result = await shareInvite(inviteCode, userName);

    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to share invite');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading invite data...</Text>
      </View>
    );
  }

  const xpEarned = stats.accepted * 50; // 50 XP per accepted invite

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Invite Friends</Text>
        <Text style={styles.headerSubtitle}>Share Salvo and earn rewards</Text>
      </View>

      {/* Invite Code Card */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Your Invite Code</Text>
        <Pressable onPress={handleCopyCode} style={styles.codeBox}>
          <Text style={styles.codeText}>{inviteCode}</Text>
          <Ionicons name="copy-outline" size={24} color="#3498db" />
        </Pressable>
        <Text style={styles.codeHint}>Tap to copy</Text>
      </View>

      {/* Share Button */}
      <Pressable style={styles.shareButton} onPress={handleShare}>
        <Ionicons name="share-social" size={20} color="#ffffff" />
        <Text style={styles.shareButtonText}>Share Invite Link</Text>
      </Pressable>

      {/* Stats Grid */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Invites Sent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.accepted}</Text>
            <Text style={styles.statLabel}>Accepted</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#4caf50' }]}>{xpEarned}</Text>
            <Text style={styles.statLabel}>XP Earned</Text>
          </View>
        </View>
      </View>

      {/* Invite History */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Invite History</Text>
        {invites.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#2a3744" />
            <Text style={styles.emptyStateText}>No invites sent yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Share your code to start inviting friends
            </Text>
          </View>
        ) : (
          invites.map((invite) => (
            <View key={invite.id} style={styles.inviteCard}>
              <View style={styles.inviteCardLeft}>
                <View
                  style={[
                    styles.statusDot,
                    invite.status === 'accepted'
                      ? styles.statusDotAccepted
                      : invite.status === 'pending'
                      ? styles.statusDotPending
                      : styles.statusDotExpired,
                  ]}
                />
                <View style={styles.inviteCardInfo}>
                  <Text style={styles.inviteCode}>{invite.invite_code}</Text>
                  <Text style={styles.inviteDate}>
                    {new Date(invite.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <View style={styles.inviteCardRight}>
                <Text
                  style={[
                    styles.statusText,
                    invite.status === 'accepted'
                      ? styles.statusTextAccepted
                      : invite.status === 'pending'
                      ? styles.statusTextPending
                      : styles.statusTextExpired,
                  ]}
                >
                  {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
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
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8b98a5',
  },
  codeCard: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b98a5',
    marginBottom: 12,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1419',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3498db',
    letterSpacing: 4,
  },
  codeHint: {
    fontSize: 12,
    color: '#8b98a5',
    marginTop: 8,
  },
  shareButton: {
    backgroundColor: '#3498db', // Blue accent
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff', // White text
  },
  statsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
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
    color: '#3498db',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8b98a5',
    textAlign: 'center',
  },
  historySection: {
    marginBottom: 24,
  },
  emptyState: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b98a5',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8b98a5',
    textAlign: 'center',
  },
  inviteCard: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  inviteCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotAccepted: {
    backgroundColor: '#4caf50',
  },
  statusDotPending: {
    backgroundColor: '#ff9800',
  },
  statusDotExpired: {
    backgroundColor: '#ff6b35',
  },
  inviteCardInfo: {},
  inviteCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  inviteDate: {
    fontSize: 12,
    color: '#8b98a5',
  },
  inviteCardRight: {},
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusTextAccepted: {
    color: '#4caf50',
  },
  statusTextPending: {
    color: '#ff9800',
  },
  statusTextExpired: {
    color: '#ff6b35',
  },
});
