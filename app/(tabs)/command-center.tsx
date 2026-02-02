import { useAuth } from '@/lib/auth';
import { createDirective, createWarriorBand, getWarriorBands, assignUserToBand } from '@/lib/supabase/command';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function CommandCenterScreen() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'directives' | 'bands'>('directives');

  // Directive Creation State
  const [directiveTitle, setDirectiveTitle] = useState('');
  const [directiveBody, setDirectiveBody] = useState('');
  const [directiveGoal, setDirectiveGoal] = useState('100');
  const [creatingDirective, setCreatingDirective] = useState(false);

  // Warrior Band State
  const [bandName, setBandName] = useState('');
  const [creatingBand, setCreatingBand] = useState(false);
  const [bands, setBands] = useState<any[]>([]);
  const [loadingBands, setLoadingBands] = useState(true);

  const isGeneral = profile?.role === 'general';
  const isCaptain = profile?.role === 'captain';

  useEffect(() => {
    if (isCaptain) {
      loadBands();
    }
  }, [isCaptain]);

  const loadBands = async () => {
    if (!profile?.party_id) return;
    setLoadingBands(true);
    const result = await getWarriorBands(profile.party_id);
    if (result.data) {
      setBands(result.data);
    }
    setLoadingBands(false);
  };

  const handleCreateDirective = async () => {
    if (!directiveTitle.trim() || !profile?.party_id || !profile?.id) {
      Alert.alert('Error', 'Please fill in the directive title');
      return;
    }

    const goal = parseInt(directiveGoal);
    if (isNaN(goal) || goal < 1) {
      Alert.alert('Error', 'Target goal must be a positive number');
      return;
    }

    setCreatingDirective(true);

    const result = await createDirective(
      profile.party_id,
      profile.id,
      directiveTitle.trim(),
      directiveBody.trim() || null,
      goal
    );

    if (result.success) {
      Alert.alert('✅ DIRECTIVE ISSUED', `"${directiveTitle}" has been deployed to all warriors.`);
      setDirectiveTitle('');
      setDirectiveBody('');
      setDirectiveGoal('100');
    } else {
      Alert.alert('Error', result.error || 'Failed to create directive');
    }

    setCreatingDirective(false);
  };

  const handleCreateBand = async () => {
    if (!bandName.trim() || !profile?.party_id || !profile?.id) {
      Alert.alert('Error', 'Please enter a band name');
      return;
    }

    setCreatingBand(true);

    const result = await createWarriorBand(
      profile.party_id,
      bandName.trim(),
      profile.id
    );

    if (result.success) {
      Alert.alert('✅ BAND CREATED', `Warrior Band "${bandName}" is now active.`);
      setBandName('');
      loadBands();
    } else {
      Alert.alert('Error', result.error || 'Failed to create warrior band');
    }

    setCreatingBand(false);
  };

  if (!isGeneral && !isCaptain) {
    return (
      <View style={styles.container}>
        <Text style={styles.accessDenied}>⛔ ACCESS RESTRICTED</Text>
        <Text style={styles.accessDeniedSubtext}>
          Command Center is only accessible to Generals and Captains.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚔️ COMMAND CENTER</Text>
        <Text style={styles.subtitle}>
          {isGeneral ? '👑 GENERAL OPERATIONS' : '🎖️ CAPTAIN OPERATIONS'}
        </Text>
      </View>

      {/* Tab Selector */}
      {isGeneral && isCaptain && (
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'directives' && styles.tabActive]}
            onPress={() => setActiveTab('directives')}
          >
            <Text style={[styles.tabText, activeTab === 'directives' && styles.tabTextActive]}>
              DIRECTIVES
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'bands' && styles.tabActive]}
            onPress={() => setActiveTab('bands')}
          >
            <Text style={[styles.tabText, activeTab === 'bands' && styles.tabTextActive]}>
              BANDS
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView style={styles.scrollContent}>
        {/* GENERAL: Directive Creation */}
        {isGeneral && (!isCaptain || activeTab === 'directives') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📜 ISSUE NEW DIRECTIVE</Text>
            <Text style={styles.sectionSubtitle}>
              Create a new raid directive for your party
            </Text>

            <Text style={styles.label}>Directive Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., RAID THE CITADEL"
              placeholderTextColor="#666"
              value={directiveTitle}
              onChangeText={setDirectiveTitle}
              maxLength={100}
            />

            <Text style={styles.label}>Mission Brief (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide context, objectives, or battle strategy..."
              placeholderTextColor="#666"
              value={directiveBody}
              onChangeText={setDirectiveBody}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <Text style={styles.label}>Target Goal (Salvos Required)</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor="#666"
              value={directiveGoal}
              onChangeText={setDirectiveGoal}
              keyboardType="numeric"
              maxLength={6}
            />

            <Pressable
              style={[styles.button, creatingDirective && styles.buttonDisabled]}
              onPress={handleCreateDirective}
              disabled={creatingDirective}
            >
              <Text style={styles.buttonText}>
                {creatingDirective ? 'ISSUING...' : '⚔️ ISSUE DIRECTIVE'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* CAPTAIN: Warrior Band Management */}
        {isCaptain && (!isGeneral || activeTab === 'bands') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛡️ WARRIOR BAND MANAGEMENT</Text>
            <Text style={styles.sectionSubtitle}>
              Create and manage warrior bands within your party
            </Text>

            <Text style={styles.label}>Band Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Alpha Squad, Night Raid"
              placeholderTextColor="#666"
              value={bandName}
              onChangeText={setBandName}
              maxLength={50}
            />

            <Pressable
              style={[styles.button, creatingBand && styles.buttonDisabled]}
              onPress={handleCreateBand}
              disabled={creatingBand}
            >
              <Text style={styles.buttonText}>
                {creatingBand ? 'CREATING...' : '🛡️ CREATE BAND'}
              </Text>
            </Pressable>

            {/* Band List */}
            <View style={styles.bandList}>
              <Text style={styles.bandListTitle}>📋 ACTIVE BANDS</Text>
              {loadingBands ? (
                <Text style={styles.bandListEmpty}>Loading bands...</Text>
              ) : bands.length === 0 ? (
                <Text style={styles.bandListEmpty}>No bands created yet</Text>
              ) : (
                bands.map((band) => (
                  <View key={band.id} style={styles.bandCard}>
                    <Text style={styles.bandName}>{band.name}</Text>
                    <Text style={styles.bandCaptain}>
                      Captain: {band.captain?.display_name || 'Unassigned'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 2,
    borderBottomColor: '#00ff88',
  },
  title: {
    color: '#00ff88',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
    marginTop: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#00ff88',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tabTextActive: {
    color: '#00ff88',
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    color: '#00ff88',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 5,
  },
  sectionSubtitle: {
    color: '#888',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 20,
  },
  label: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#00ff88',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bandList: {
    marginTop: 30,
  },
  bandListTitle: {
    color: '#00ff88',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 15,
  },
  bandListEmpty: {
    color: '#666',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
    paddingVertical: 20,
  },
  bandCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  bandName: {
    color: '#00ff88',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 5,
  },
  bandCaptain: {
    color: '#888',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  accessDenied: {
    color: '#ff0000',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
    marginTop: 100,
  },
  accessDeniedSubtext: {
    color: '#888',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 40,
  },
});
