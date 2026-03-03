/**
 * Geography Filter for Admin Endorsements
 * Allows leaders to select county and district to view/edit ballot endorsements
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Alert, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GeographyFilterProps {
  onGeographySelected: (county: string, district: string) => void;
  loading?: boolean;
}

// Maryland counties with their legislative districts
const MARYLAND_GEOGRAPHY = {
  'Montgomery': ['15', '16', '17', '18', '19', '20', '39'],
  'Anne Arundel': ['30', '31', '32', '33'],
  'Baltimore County': ['7', '8', '9', '10', '11', '42', '43', '44'],
  'Prince Georges': ['21', '22', '23', '24', '25', '26', '27', '47'],
  'Howard': ['9', '12', '13'],
  'Harford': ['7', '34', '35'],
  'Frederick': ['3', '4'],
  'Carroll': ['5'],
  'Washington': ['1', '2'],
  'Allegany': ['1'],
  'Baltimore City': ['40', '41', '43', '45', '46'],
};

export default function GeographyFilter({ onGeographySelected, loading = false }: GeographyFilterProps) {
  const [selectedCounty, setSelectedCounty] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

  useEffect(() => {
    if (selectedCounty) {
      const districts = MARYLAND_GEOGRAPHY[selectedCounty as keyof typeof MARYLAND_GEOGRAPHY] || [];
      setAvailableDistricts(districts);
      setSelectedDistrict(districts[0] || '');
    }
  }, [selectedCounty]);

  const showCountyPicker = () => {
    const counties = Object.keys(MARYLAND_GEOGRAPHY);
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...counties],
          cancelButtonIndex: 0,
          title: 'Select County',
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const selectedCounty = counties[buttonIndex - 1];
            setSelectedCounty(selectedCounty);
          }
        }
      );
    } else {
      // Android fallback - just use the first county for now
      Alert.alert('Select County', 'Please select a county', [
        { text: 'Cancel', style: 'cancel' },
        ...counties.map((county) => ({
          text: county,
          onPress: () => setSelectedCounty(county),
        })),
      ]);
    }
  };

  const showDistrictPicker = () => {
    if (availableDistricts.length === 0) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...availableDistricts.map(d => `District ${d}`)],
          cancelButtonIndex: 0,
          title: 'Select Legislative District',
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const selectedDist = availableDistricts[buttonIndex - 1];
            setSelectedDistrict(selectedDist);
          }
        }
      );
    } else {
      Alert.alert('Select District', 'Please select a legislative district', [
        { text: 'Cancel', style: 'cancel' },
        ...availableDistricts.map((district) => ({
          text: `District ${district}`,
          onPress: () => setSelectedDistrict(district),
        })),
      ]);
    }
  };

  const handleLoadRaces = () => {
    if (selectedCounty && selectedDistrict) {
      onGeographySelected(selectedCounty, selectedDistrict);
    }
  };

  const isValid = selectedCounty && selectedDistrict;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Geography</Text>
      <Text style={styles.subtitle}>
        Choose county and district to view/edit endorsements
      </Text>

      <View style={styles.filtersRow}>
        {/* County Selector */}
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>County</Text>
          <Pressable
            style={styles.selectButton}
            onPress={() => {
              if (!loading) showCountyPicker();
            }}
            disabled={loading}
          >
            <Text style={styles.selectButtonText}>
              {selectedCounty || 'Select County...'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </Pressable>
        </View>

        {/* District Selector */}
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Legislative District</Text>
          <Pressable
            style={[
              styles.selectButton,
              availableDistricts.length === 0 && styles.selectButtonDisabled
            ]}
            onPress={() => {
              if (!loading && availableDistricts.length > 0) showDistrictPicker();
            }}
            disabled={loading || availableDistricts.length === 0}
          >
            <Text style={styles.selectButtonText}>
              {selectedDistrict ? `District ${selectedDistrict}` : 'Select District...'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </Pressable>
        </View>
      </View>

      {/* Load Button */}
      <Pressable
        style={[styles.loadButton, (!isValid || loading) && styles.loadButtonDisabled]}
        onPress={handleLoadRaces}
        disabled={!isValid || loading}
      >
        <Text style={styles.loadButtonText}>
          {loading ? 'Loading...' : 'Load Races'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  pickerContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  selectButton: {
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    height: 50,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  loadButton: {
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  loadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loadButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
