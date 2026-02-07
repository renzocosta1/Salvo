import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { lookupDistrictByAddress } from '@/lib/districts';

const US_STATES = [
  { label: 'Maryland', value: 'MD' },
  { label: 'Alabama', value: 'AL' },
  { label: 'Alaska', value: 'AK' },
  { label: 'Arizona', value: 'AZ' },
  { label: 'Arkansas', value: 'AR' },
  { label: 'California', value: 'CA' },
  { label: 'Colorado', value: 'CO' },
  { label: 'Connecticut', value: 'CT' },
  { label: 'Delaware', value: 'DE' },
  { label: 'Florida', value: 'FL' },
  { label: 'Georgia', value: 'GA' },
  { label: 'Hawaii', value: 'HI' },
  { label: 'Idaho', value: 'ID' },
  { label: 'Illinois', value: 'IL' },
  { label: 'Indiana', value: 'IN' },
  { label: 'Iowa', value: 'IA' },
  { label: 'Kansas', value: 'KS' },
  { label: 'Kentucky', value: 'KY' },
  { label: 'Louisiana', value: 'LA' },
  { label: 'Maine', value: 'ME' },
  { label: 'Massachusetts', value: 'MA' },
  { label: 'Michigan', value: 'MI' },
  { label: 'Minnesota', value: 'MN' },
  { label: 'Mississippi', value: 'MS' },
  { label: 'Missouri', value: 'MO' },
  { label: 'Montana', value: 'MT' },
  { label: 'Nebraska', value: 'NE' },
  { label: 'Nevada', value: 'NV' },
  { label: 'New Hampshire', value: 'NH' },
  { label: 'New Jersey', value: 'NJ' },
  { label: 'New Mexico', value: 'NM' },
  { label: 'New York', value: 'NY' },
  { label: 'North Carolina', value: 'NC' },
  { label: 'North Dakota', value: 'ND' },
  { label: 'Ohio', value: 'OH' },
  { label: 'Oklahoma', value: 'OK' },
  { label: 'Oregon', value: 'OR' },
  { label: 'Pennsylvania', value: 'PA' },
  { label: 'Rhode Island', value: 'RI' },
  { label: 'South Carolina', value: 'SC' },
  { label: 'South Dakota', value: 'SD' },
  { label: 'Tennessee', value: 'TN' },
  { label: 'Texas', value: 'TX' },
  { label: 'Utah', value: 'UT' },
  { label: 'Vermont', value: 'VT' },
  { label: 'Virginia', value: 'VA' },
  { label: 'Washington', value: 'WA' },
  { label: 'West Virginia', value: 'WV' },
  { label: 'Wisconsin', value: 'WI' },
  { label: 'Wyoming', value: 'WY' },
];

// Maryland Counties and Districts for manual fallback
const MD_COUNTIES = [
  'Allegany', 'Anne Arundel', 'Baltimore', 'Baltimore City', 'Calvert', 'Caroline',
  'Carroll', 'Cecil', 'Charles', 'Dorchester', 'Frederick', 'Garrett', 'Harford',
  'Howard', 'Kent', 'Montgomery', 'Prince Georges', 'Queen Annes', 'Somerset',
  'St. Marys', 'Talbot', 'Washington', 'Wicomico', 'Worcester'
];

const MD_LEGISLATIVE_DISTRICTS = Array.from({ length: 47 }, (_, i) => `District ${i + 1}`);
const MD_CONGRESSIONAL_DISTRICTS = Array.from({ length: 8 }, (_, i) => `MD-${i + 1}`);

export default function AddressScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('MD'); // Default to Maryland
  const [zipCode, setZipCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Manual fallback state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCounty, setManualCounty] = useState('');
  const [manualLegislative, setManualLegislative] = useState('District 1');
  const [manualCongressional, setManualCongressional] = useState('MD-1');

  const handleManualSubmit = async () => {
    // Validate manual entries
    if (!manualCounty || !manualLegislative || !manualCongressional) {
      Alert.alert('Missing Information', 'Please select all district fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      // Update profile with manually entered district information
      const { error } = await supabase
        .from('profiles')
        .update({
          address_line1: streetAddress,
          city: city,
          state: state,
          zip_code: zipCode,
          county: manualCounty,
          congressional_district: manualCongressional,
          legislative_district: manualLegislative,
          geocoded_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to save information. Please try again.');
        setLoading(false);
        return;
      }

      console.log('Profile updated successfully (manual entry)');

      // Mark onboarding as complete and navigate to main app
      const { error: onboardingError } = await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id);

      if (onboardingError) {
        console.error('Error completing onboarding:', onboardingError);
      }

      // Refresh profile to update auth context
      await refetchProfile(user.id);

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    // Validate inputs
    if (!streetAddress.trim() || !city.trim() || !state || !zipCode.trim()) {
      Alert.alert('Missing Information', 'Please fill in all address fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      // Build full address string
      const fullAddress = `${streetAddress}, ${city}, ${state} ${zipCode}`;
      
      console.log('Looking up address:', fullAddress);

      // Lookup district information using Google Civic API
      const result = await lookupDistrictByAddress(fullAddress);

      if (!result.success || !result.district) {
        console.error('District lookup failed:', result.error);
        
        // Show manual entry option
        Alert.alert(
          'Address Lookup Failed',
          'We couldn\'t automatically verify your district. Would you like to enter it manually?',
          [
            {
              text: 'Try Again',
              onPress: () => setLoading(false),
              style: 'cancel',
            },
            {
              text: 'Enter Manually',
              onPress: () => {
                setLoading(false);
                setShowManualEntry(true);
              },
            },
          ]
        );
        return;
      }

      console.log('District lookup successful:', result.district);

      // Update profile with address and district information
      const { error } = await supabase
        .from('profiles')
        .update({
          address_line1: streetAddress,
          city: city,
          state: state,
          zip_code: zipCode,
          county: result.district.county,
          congressional_district: result.district.congressionalDistrict,
          legislative_district: result.district.legislativeDistrict,
          geocoded_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to save address. Please try again.');
        setLoading(false);
        return;
      }

      console.log('Profile updated successfully');

      // Mark onboarding as complete and navigate to main app
      const { error: onboardingError } = await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id);

      if (onboardingError) {
        console.error('Error completing onboarding:', onboardingError);
      }

      // Refresh profile to update auth context
      await refetchProfile(user.id);

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Where are you based?</Text>
            <Text style={styles.subtitle}>
              We'll use your address to show you relevant political information and opportunities in your district
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Street Address */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Street Address</Text>
              <TextInput
                style={styles.textInput}
                value={streetAddress}
                onChangeText={setStreetAddress}
                placeholder="123 Main St"
                placeholderTextColor="#8b98a5"
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* City */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.textInput}
                value={city}
                onChangeText={setCity}
                placeholder="Annapolis"
                placeholderTextColor="#8b98a5"
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* State */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>State</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={state}
                  onValueChange={(itemValue) => setState(itemValue)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {US_STATES.map((s) => (
                    <Picker.Item
                      key={s.value}
                      label={s.label}
                      value={s.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Zip Code */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Zip Code</Text>
              <TextInput
                style={styles.textInput}
                value={zipCode}
                onChangeText={setZipCode}
                placeholder="21401"
                placeholderTextColor="#8b98a5"
                keyboardType="number-pad"
                maxLength={5}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Manual Entry Section (shown if API lookup fails) */}
          {showManualEntry && (
            <View style={styles.manualSection}>
              <Text style={styles.manualTitle}>Manual District Entry</Text>
              <Text style={styles.manualSubtitle}>
                Please select your district information manually
              </Text>

              {/* County Selection */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>County</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={manualCounty}
                    onValueChange={(itemValue) => setManualCounty(itemValue)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="Select County" value="" />
                    {MD_COUNTIES.map((county) => (
                      <Picker.Item
                        key={county}
                        label={county}
                        value={county}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Legislative District */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>State Legislative District</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={manualLegislative}
                    onValueChange={(itemValue) => setManualLegislative(itemValue)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    {MD_LEGISLATIVE_DISTRICTS.map((district) => (
                      <Picker.Item
                        key={district}
                        label={district}
                        value={district}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Congressional District */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Congressional District</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={manualCongressional}
                    onValueChange={(itemValue) => setManualCongressional(itemValue)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    {MD_CONGRESSIONAL_DISTRICTS.map((district) => (
                      <Picker.Item
                        key={district}
                        label={district}
                        value={district}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          )}

          {/* Info Box */}
          {!showManualEntry && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                🔒 Your address is private and secure. We only use it to determine your voting district and show you relevant civic engagement opportunities.
              </Text>
            </View>
          )}

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.buttonDisabled]}
            onPress={showManualEntry ? handleManualSubmit : handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0f1419" />
            ) : (
              <Text style={styles.continueButtonText}>
                {showManualEntry ? 'Submit' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 32,
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
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3744',
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  pickerContainer: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3744',
    overflow: 'hidden',
  },
  picker: {
    color: '#ffffff',
    height: Platform.OS === 'ios' ? 180 : 50,
  },
  pickerItem: {
    color: '#ffffff',
    fontSize: 18,
    height: 180,
  },
  manualSection: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3744',
    padding: 16,
    marginBottom: 24,
  },
  manualTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  manualSubtitle: {
    fontSize: 14,
    color: '#8b98a5',
    marginBottom: 20,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3744',
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#8b98a5',
    lineHeight: 20,
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
