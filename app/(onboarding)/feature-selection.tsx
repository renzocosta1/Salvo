import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const FEATURES = [
  {
    id: 'directive_alerts',
    label: 'Live nearby directive alerts',
    description: 'Get notified when new missions are issued',
  },
  {
    id: 'party_announcements',
    label: 'Party-wide announcements',
    description: 'Stay updated with party news',
  },
  {
    id: 'mission_notifications',
    label: 'Mission completion notifications',
    description: 'Know when missions are completed',
  },
  {
    id: 'territory_updates',
    label: 'Territory expansion updates',
    description: 'See when new areas are revealed',
  },
  {
    id: 'rank_alerts',
    label: 'Rank progression alerts',
    description: 'Get notified of rank promotions',
  },
  {
    id: 'captain_messages',
    label: 'Captain direct messages',
    description: 'Receive messages from your captain',
  },
];

export default function FeatureSelectionScreen() {
  const router = useRouter();
  const { user, refetchProfile } = useAuth();
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const toggleFeature = (featureId: string) => {
    const newSelected = new Set(selectedFeatures);
    if (newSelected.has(featureId)) {
      newSelected.delete(featureId);
    } else {
      newSelected.add(featureId);
    }
    setSelectedFeatures(newSelected);
  };

  const handleContinue = async () => {
    if (!user) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      // Convert Set to object for JSONB storage
      const preferences: Record<string, boolean> = {};
      FEATURES.forEach((feature) => {
        preferences[feature.id] = selectedFeatures.has(feature.id);
      });

      const { error } = await supabase.from('user_preferences').upsert(
        {
          user_id: user.id,
          feature_alerts: preferences,
        },
        {
          onConflict: 'user_id',
        }
      );

      if (error) {
        console.error('Error saving preferences:', error);
        Alert.alert('Error', 'Failed to save preferences. Please try again.');
        setLoading(false);
        return;
      }

      // Mark onboarding as complete
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error completing onboarding:', profileError);
      }

      // Refresh the profile to update auth context
      await refetchProfile(user.id);

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>How can Salvo help?</Text>
          <Text style={styles.subtitle}>Select which features you are most interested in</Text>
          <Text style={styles.selectAllLabel}>Select All That Apply</Text>
        </View>

        {/* Feature List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {FEATURES.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[
                styles.featureButton,
                selectedFeatures.has(feature.id) && styles.featureButtonActive,
              ]}
              onPress={() => toggleFeature(feature.id)}
            >
              <View style={styles.featureContent}>
                <View
                  style={[
                    styles.checkbox,
                    selectedFeatures.has(feature.id) && styles.checkboxActive,
                  ]}
                >
                  {selectedFeatures.has(feature.id) && (
                    <Ionicons name="checkmark" size={20} color="#0f1419" />
                  )}
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureLabel}>{feature.label}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0f1419" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
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
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8b98a5',
    marginBottom: 24,
  },
  selectAllLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  featureButton: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3744',
    marginBottom: 12,
    overflow: 'hidden',
  },
  featureButtonActive: {
    borderColor: '#ffffff',
    backgroundColor: '#2a3744',
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#8b98a5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  checkboxActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#8b98a5',
  },
  continueButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f1419',
  },
});
