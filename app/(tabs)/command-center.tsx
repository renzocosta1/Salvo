import { useAuth } from '@/lib/auth';
import { createDirective, createWarriorBand, getWarriorBands } from '@/lib/supabase/command';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  ActivityIndicator,
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
      Alert.alert('Success', `Directive "${directiveTitle}" has been created.`);
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

    const result = await createWarriorBand(profile.party_id, bandName.trim(), profile.id);

    if (result.success) {
      Alert.alert('Success', `Warrior Band "${bandName}" has been created.`);
      setBandName('');
      loadBands();
    } else {
      Alert.alert('Error', result.error || 'Failed to create warrior band');
    }

    setCreatingBand(false);
  };

  if (!isGeneral && !isCaptain) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Text style={styles.accessDeniedEmoji}>🔒</Text>
        <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
        <Text style={styles.accessDeniedText}>
          Command Center is only accessible to Generals and Captains.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Command Center</Text>
        <Text style={styles.headerSubtitle}>
          {isGeneral ? 'General Operations' : 'Captain Operations'}
        </Text>
      </View>

      {/* Tabs */}
      {isGeneral && isCaptain && (
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'directives' && styles.tabActive]}
            onPress={() => setActiveTab('directives')}
          >
            <Text style={[styles.tabText, activeTab === 'directives' && styles.tabTextActive]}>
              Directives
            </Text>
            {activeTab === 'directives' && <View style={styles.tabIndicator} />}
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'bands' && styles.tabActive]}
            onPress={() => setActiveTab('bands')}
          >
            <Text style={[styles.tabText, activeTab === 'bands' && styles.tabTextActive]}>
              Bands
            </Text>
            {activeTab === 'bands' && <View style={styles.tabIndicator} />}
          </Pressable>
        </View>
      )}

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
        {/* GENERAL: Directive Creation */}
        {isGeneral && (!isCaptain || activeTab === 'directives') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Create New Directive</Text>

            <Text style={styles.label}>Directive Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Raid the Citadel"
              placeholderTextColor="#9e9e9e"
              value={directiveTitle}
              onChangeText={setDirectiveTitle}
              maxLength={100}
            />

            <Text style={styles.label}>Mission Brief (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide context, objectives, or battle strategy..."
              placeholderTextColor="#9e9e9e"
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
              placeholderTextColor="#9e9e9e"
              value={directiveGoal}
              onChangeText={setDirectiveGoal}
              keyboardType="numeric"
              maxLength={6}
            />

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                creatingDirective && styles.buttonDisabled,
              ]}
              onPress={handleCreateDirective}
              disabled={creatingDirective}
            >
              {creatingDirective ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Create Directive</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* CAPTAIN: Warrior Band Management */}
        {isCaptain && (!isGeneral || activeTab === 'bands') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Warrior Band Management</Text>

            <Text style={styles.label}>Band Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Alpha Squad, Night Raid"
              placeholderTextColor="#9e9e9e"
              value={bandName}
              onChangeText={setBandName}
              maxLength={50}
            />

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                creatingBand && styles.buttonDisabled,
              ]}
              onPress={handleCreateBand}
              disabled={creatingBand}
            >
              {creatingBand ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Create Band</Text>
              )}
            </Pressable>

            {/* Band List */}
            <View style={styles.bandListSection}>
              <Text style={styles.bandListTitle}>Active Bands</Text>
              {loadingBands ? (
                <View style={styles.bandListEmpty}>
                  <ActivityIndicator color="#2196f3" />
                </View>
              ) : bands.length === 0 ? (
                <Text style={styles.bandListEmptyText}>No bands created yet</Text>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9e9e9e',
  },
  tabTextActive: {
    color: '#2196f3',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#2196f3',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 40,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1c1c1e',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#2196f3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bandListSection: {
    marginTop: 32,
  },
  bandListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 16,
  },
  bandListEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  bandListEmptyText: {
    fontSize: 14,
    color: '#9e9e9e',
    textAlign: 'center',
  },
  bandCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bandName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 4,
  },
  bandCaptain: {
    fontSize: 14,
    color: '#757575',
  },
  accessDeniedContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  accessDeniedEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1c1e',
    textAlign: 'center',
    marginBottom: 12,
  },
  accessDeniedText: {
    fontSize: 15,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 22,
  },
});
