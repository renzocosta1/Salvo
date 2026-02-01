import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export default function OathScreen() {
  const { user, refetchProfile } = useAuth();
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contractText, setContractText] = useState('');
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    fetchContractVersion();
  }, []);

  const fetchContractVersion = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_versions')
        .select('id, version_tag, body_text')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching contract version:', error);
        setContractText(getDefaultOathText());
        return;
      }

      setCurrentVersionId(data.id);
      setContractText(data.body_text || getDefaultOathText());
    } catch (error) {
      console.error('Error:', error);
      setContractText(getDefaultOathText());
    }
  };

  const getDefaultOathText = () => {
    return `THE OATH

By signing this oath, you agree to join The Hard Party as a Warrior in our mission-critical coordination platform.

MISSION STATEMENT

We are not a social network. We are an action engine. Our purpose is to transform digital intent into real-world presence, measurable impact, and verified results.

YOUR COMMITMENT

As a Warrior of The Hard Party, you commit to:

1. VERIFIED ACTION
   Complete missions with photographic proof. All actions are verified by AI to ensure authenticity and accountability.

2. COLLECTIVE COORDINATION
   Contribute to directives issued by the General. Your salvos add to the Pillage Meter, driving collective goals forward.

3. TERRITORIAL EXPANSION
   Check in at real-world locations to reveal map tiles. Expand our territory through physical presence.

4. MERITOCRATIC ADVANCEMENT
   Progress from Recruit (Level 0) to Warrior (Level 5) through verified missions. Centurion status (Level 10+) requires manual approval and demonstrated leadership.

5. OATH COMPLIANCE
   Understand that access to the platform is contingent on signing this oath. Breaking the social contract may result in removal from The Hard Party.

HIERARCHY

• General: Issues directives and manages the party
• Captains: Lead Warrior Bands and coordinate sub-units
• Warriors: Execute directives, complete missions, expand territory
• Recruits: New members who have signed the oath (Level 0-4)

CHAIN OF COMMAND

You agree to follow the chain of command. Directives flow one-way from the General. Your role is to execute, not debate.

DATA AND PRIVACY

Your actions, check-ins, mission proofs, and XP are recorded and may be visible to other party members. Your profile, rank, and level are public within the party.

TERRITORY RULES

Map tiles are revealed only through physical check-ins. Territory is earned through presence.

AI VERIFICATION

Mission proofs are verified asynchronously using AI. Verified missions award XP and trigger rank recomputation.

RATE LIMITS

Raids are rate-limited to 10 per 60 seconds per user. This is enforced server-side to ensure fairness.

FINAL ACKNOWLEDGMENT

I understand that Salvo is not a game, not a social media platform, and not a discussion forum. It is a tool for organized, verified, real-world action.

By scrolling to the bottom and pressing JOIN, you electronically sign this oath and gain access to Salvo.

--- END OF OATH ---`;
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    const maxScroll = contentSize.height - layoutMeasurement.height;
    const currentProgress = maxScroll > 0 ? (contentOffset.y / maxScroll) * 100 : 100;
    setScrollProgress(Math.min(100, Math.max(0, currentProgress)));

    setScrolledToBottom(isAtBottom);
  };

  const handleJoin = async () => {
    if (!user || !currentVersionId) {
      Alert.alert('Error', 'Authentication error. Please try logging in again.');
      return;
    }

    setLoading(true);
    try {
      const { data: hardParty, error: partyError } = await supabase
        .from('parties')
        .select('id')
        .eq('name', 'Hard Party')
        .single();

      if (partyError || !hardParty) {
        console.error('Error fetching Hard Party:', partyError);
        Alert.alert('Error', 'Failed to join party. Please contact support.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          oath_signed_at: new Date().toISOString(),
          contract_version_id: currentVersionId,
          party_id: hardParty.id,
          role: 'warrior',
          level: 0,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        Alert.alert('Error', 'Failed to sign oath. Please try again.');
        setLoading(false);
        return;
      }

      await refetchProfile(user.id);
    } catch (error) {
      console.error('Error signing oath:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>The Oath</Text>
          <Text style={styles.subtitle}>Read carefully to proceed</Text>
        </View>

        {/* Contract ScrollView */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <Text style={styles.contractText}>{contractText}</Text>
        </ScrollView>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>SCROLL TO CONTINUE</Text>
            <Text style={styles.progressPercent}>{Math.round(scrollProgress)}%</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${scrollProgress}%` }]} />
          </View>
        </View>

        {/* Join Button */}
        <TouchableOpacity
          style={[styles.joinButton, !scrolledToBottom && styles.joinButtonDisabled]}
          onPress={handleJoin}
          disabled={!scrolledToBottom || loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.joinButtonText}>
              {scrolledToBottom ? 'JOIN THE HARD PARTY' : 'SCROLL TO ENABLE'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8b98a5',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#1c2631',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3744',
    marginBottom: 16,
  },
  scrollContent: {
    padding: 20,
  },
  contractText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8b98a5',
    letterSpacing: 1,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00ff88',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#1c2631',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00ff88',
  },
  joinButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  joinButtonDisabled: {
    backgroundColor: '#2a3744',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
  },
});
