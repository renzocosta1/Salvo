import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const AGE_RANGES = [
  { label: '18-24', value: '18-24' },
  { label: '25-34', value: '25-34' },
  { label: '35-44', value: '35-44' },
  { label: '45-54', value: '45-54' },
  { label: '55-64', value: '55-64' },
  { label: '65+', value: '65+' },
];

const GENDERS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [ageRange, setAgeRange] = useState('18-24'); // Default value
  const [gender, setGender] = useState('male'); // Default value
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!ageRange || !gender) {
      Alert.alert('Missing Information', 'Please select both age and gender to continue');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          age_range: ageRange,
          gender: gender,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to save information. Please try again.');
        setLoading(false);
        return;
      }

      // Navigate to address entry
      router.push('/(onboarding)/address');
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
          <Text style={styles.title}>Share a little about yourself</Text>
          <Text style={styles.subtitle}>
            This will help Salvo tailor the experience to your unique needs
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Age Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Select Age</Text>
            <Picker
              selectedValue={ageRange}
              onValueChange={(itemValue) => setAgeRange(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {AGE_RANGES.map((age) => (
                <Picker.Item
                  key={age.value}
                  label={age.label}
                  value={age.value}
                />
              ))}
            </Picker>
          </View>

          {/* Gender Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Select Gender</Text>
            <View style={styles.genderButtons}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={[
                    styles.genderButton,
                    gender === g.value && styles.genderButtonActive,
                  ]}
                  onPress={() => setGender(g.value)}
                >
                  <View style={[styles.radioOuter, gender === g.value && styles.radioOuterActive]}>
                    {gender === g.value && <View style={styles.radioInner} />}
                  </View>
                  <Text
                    style={[styles.genderText, gender === g.value && styles.genderTextActive]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

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
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#8b98a5',
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  picker: {
    color: '#ffffff',
    backgroundColor: '#1c2631',
    height: Platform.OS === 'ios' ? 180 : 50,
  },
  pickerItem: {
    color: '#ffffff',
    fontSize: 18,
    height: 180,
  },
  genderButtons: {
    gap: 12,
  },
  genderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c2631',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3744',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  genderButtonActive: {
    borderColor: '#ffffff',
    backgroundColor: '#2a3744',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8b98a5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioOuterActive: {
    borderColor: '#ffffff',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  genderText: {
    fontSize: 16,
    color: '#8b98a5',
  },
  genderTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
