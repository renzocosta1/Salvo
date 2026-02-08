import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import {
  getMyReferralCode,
  getReferralStats,
  getMyReferrals,
  generateReferralLink,
  generateReferralMessage,
  type Referral,
} from '@/lib/supabase/referrals';

export default function InviteScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string>('');
  const [stats, setStats] = useState({ 
    totalReferrals: 0, 
    completedReferrals: 0, 
    pendingReferrals: 0,
    totalXpEarned: 0 
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    loadReferralData();
  }, [profile]);

  const loadReferralData = async () => {
    if (!profile) return;

    setLoading(true);

    // Load referral code
    const codeResult = await getMyReferralCode(profile.id);
    if (codeResult.data) {
      setReferralCode(codeResult.data);
    }

    // Load stats
    const statsResult = await getReferralStats(profile.id);
    if (statsResult.data) {
      setStats(statsResult.data);
    }

    // Load referral history
    const referralsResult = await getMyReferrals(profile.id);
    if (referralsResult.data) {
      setReferrals(referralsResult.data);
    }

    setLoading(false);
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    if (Platform.OS === 'web') {
      window.alert('Copied to clipboard!');
    } else {
      Alert.alert('Copied!', 'Referral code copied to clipboard');
    }
  };

  const handleCopyLink = async () => {
    const link = generateReferralLink(referralCode);
    await Clipboard.setStringAsync(link);
    if (Platform.OS === 'web') {
      window.alert('Link copied to clipboard!');
    } else {
      Alert.alert('Copied!', 'Referral link copied to clipboard');
    }
  };

  const handleShare = async () => {
    const message = generateReferralMessage(referralCode);
    const link = generateReferralLink(referralCode);

    // Web Share API (PWA)
    if (Platform.OS === 'web' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'Join Salvo',
          text: message,
          url: link,
        });
      } catch (error) {
        console.error('[handleShare] Web Share API error:', error);
        // Fallback: copy to clipboard
        await handleCopyLink();
      }
    } else {
      // Fallback: copy to clipboard
      await handleCopyLink();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading referral data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎯 Relational Raid</Text>
        <Text style={styles.headerSubtitle}>
          Recruit Maryland voters. Earn +100 XP per completed referral.
        </Text>
      </View>

      {/* Referral Code Card */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Your Referral Code</Text>
        <Pressable onPress={handleCopyCode} style={styles.codeBox}>
          <Text style={styles.codeText}>{referralCode}</Text>
          <Ionicons name="copy-outline" size={24} color="#39FF14" />
        </Pressable>
        <Text style={styles.codeHint}>Tap to copy</Text>
      </View>

      {/* Share Button */}
      <Pressable style={styles.shareButton} onPress={handleShare}>
        <Ionicons name="share-social" size={20} color="#0f1419" />
        <Text style={styles.shareButtonText}>Share Referral Link</Text>
      </Pressable>

      {/* Stats Grid */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Recruitment Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalReferrals}</Text>
            <Text style={styles.statLabel}>Total Referrals</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#39FF14' }]}>{stats.completedReferrals}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#39FF14' }]}>{stats.totalXpEarned}</Text>
            <Text style={styles.statLabel}>XP Earned</Text>
          </View>
        </View>
      </View>

      {/* Referral History */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Referral History</Text>
        {referrals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#2a3744" />
            <Text style={styles.emptyStateText}>No referrals yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Share your code to start recruiting warriors
            </Text>
          </View>
        ) : (
          referrals.map((referral) => (
            <View key={referral.id} style={styles.inviteCard}>
              <View style={styles.inviteCardLeft}>
                <View
                  style={[
                    styles.statusDot,
                    referral.xp_awarded
                      ? styles.statusDotAccepted
                      : styles.statusDotPending,
                  ]}
                />
                <View style={styles.inviteCardInfo}>
                  <Text style={styles.inviteCode}>
                    {referral.invitee_name || 'New Recruit'}
                  </Text>
                  <Text style={styles.inviteDate}>
                    {new Date(referral.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <View style={styles.inviteCardRight}>
                <Text
                  style={[
                    styles.statusText,
                    referral.xp_awarded
                      ? styles.statusTextAccepted
                      : styles.statusTextPending,
                  ]}
                >
                  {referral.xp_awarded ? '+100 XP' : 'Pending'}
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
    backgroundColor: '#39FF14', // Neon green
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
    color: '#0f1419', // Dark text on neon green
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
    color: '#ffffff',
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
    backgroundColor: '#39FF14', // Neon green for completed
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
    color: '#39FF14', // Neon green for completed
  },
  statusTextPending: {
    color: '#ff9800',
  },
  statusTextExpired: {
    color: '#ff6b35',
  },
});
