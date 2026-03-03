/**
 * Race Endorsement Card
 * Displays a single race with candidates and allows leaders to endorse/un-endorse
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { BallotRace, BallotCandidate } from '@/lib/supabase/ballot';

interface PendingEndorsement {
  candidateId: string;
  endorsed: boolean;
  candidateName: string;
  raceTitle: string;
}

interface RaceEndorsementCardProps {
  race: BallotRace;
  affectedUsersCount: number;
  affectedGeography: string;
  onToggleSelection: (candidateId: string, endorsed: boolean, candidateName: string, raceTitle: string) => void;
  pendingChanges: Map<string, PendingEndorsement>;
}

export default function RaceEndorsementCard({
  race,
  affectedUsersCount,
  affectedGeography,
  onToggleSelection,
  pendingChanges,
}: RaceEndorsementCardProps) {

  const isSingleSelect = (race.max_selections || 1) === 1;
  const maxSelections = race.max_selections || 1;

  // Get effective endorsement state (combining database + pending changes)
  const getEffectiveEndorsement = (candidate: BallotCandidate): boolean => {
    const pendingChange = pendingChanges.get(candidate.id);
    if (pendingChange !== undefined) {
      return pendingChange.endorsed;
    }
    return candidate.hard_party_endorsed;
  };

  // Count current endorsements (database + pending)
  const getEndorsedCount = (): number => {
    return race.candidates.filter((c) => getEffectiveEndorsement(c)).length;
  };

  const handleToggleEndorsement = (candidate: BallotCandidate) => {
    const currentlyEndorsed = getEffectiveEndorsement(candidate);
    const newEndorsed = !currentlyEndorsed;

    // For single-select races, un-endorse all others
    if (isSingleSelect && newEndorsed) {
      race.candidates.forEach((c) => {
        if (c.id !== candidate.id && getEffectiveEndorsement(c)) {
          onToggleSelection(c.id, false, c.candidate_name, race.race_title);
        }
      });
    }

    // Toggle this candidate
    onToggleSelection(candidate.id, newEndorsed, candidate.candidate_name, race.race_title);
  };

  const endorsedCount = getEndorsedCount();
  const canEndorseMore = endorsedCount < maxSelections;

  return (
    <View style={styles.card}>
      {/* Race Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.raceTitle}>{race.race_title}</Text>
          {race.incumbent_name && (
            <Text style={styles.incumbent}>Currently: {race.incumbent_name}</Text>
          )}
          <Text style={styles.instruction}>
            {isSingleSelect ? 'Vote for 1' : `Vote for up to ${maxSelections}`}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.endorsedBadge}>
            {endorsedCount}/{maxSelections} Endorsed
          </Text>
        </View>
      </View>

      {/* Impact Info */}
      <View style={styles.impactBar}>
        <Text style={styles.impactText}>
          Affects {affectedUsersCount} users in {affectedGeography}
        </Text>
      </View>

      {/* Candidates */}
      <View style={styles.candidatesContainer}>
        {race.candidates.map((candidate) => {
          const isEndorsed = getEffectiveEndorsement(candidate);
          const isPlaceholder = candidate.is_placeholder;
          const hasPendingChange = pendingChanges.has(candidate.id);
          const canToggle = isEndorsed || canEndorseMore || !isSingleSelect;

          return (
            <Pressable
              key={candidate.id}
              style={[
                styles.candidateRow,
                isEndorsed && styles.candidateRowEndorsed,
                hasPendingChange && styles.candidateRowPending,
                !canToggle && styles.candidateRowDisabled,
              ]}
              onPress={() => handleToggleEndorsement(candidate)}
              disabled={!canToggle}
            >
              {/* Checkbox/Radio */}
              <View style={styles.checkboxContainer}>
                <View
                  style={[
                    isSingleSelect ? styles.radio : styles.checkbox,
                    isEndorsed && (isSingleSelect ? styles.radioChecked : styles.checkboxChecked),
                  ]}
                >
                  {isEndorsed && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </View>

              {/* Candidate Info */}
              <View style={styles.candidateInfo}>
                <View style={styles.candidateNameRow}>
                  <Text style={[styles.candidateName, isEndorsed && styles.candidateNameEndorsed]}>
                    {candidate.candidate_name}
                  </Text>
                  {isPlaceholder && (
                    <View style={styles.placeholderBadge}>
                      <Text style={styles.placeholderText}>PLACEHOLDER</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.candidateParty}>{candidate.candidate_party}</Text>
              </View>

              {/* Endorsed Badge */}
              {isEndorsed && (
                <View style={[styles.endorsedIndicator, hasPendingChange && styles.endorsedIndicatorPending]}>
                  <Text style={styles.endorsedText}>{hasPendingChange ? 'PENDING' : 'ENDORSED'}</Text>
                </View>
              )}

              {/* Pending Removal Badge */}
              {!isEndorsed && hasPendingChange && (
                <View style={styles.removedIndicator}>
                  <Text style={styles.removedText}>TO REMOVE</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Warning for placeholder races */}
      {race.candidates.some((c) => c.is_placeholder) && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ This race contains placeholder candidates. Update with real candidate names when they file.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: 12,
  },
  raceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  incumbent: {
    fontSize: 11,
    color: '#0066cc',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  instruction: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  endorsedBadge: {
    backgroundColor: '#000',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 'bold',
  },
  impactBar: {
    backgroundColor: '#fffacd',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  impactText: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  candidatesContainer: {
    padding: 12,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  candidateRowEndorsed: {
    backgroundColor: '#e8ffe8',
    borderColor: '#00aa00',
    borderWidth: 2,
  },
  candidateRowPending: {
    backgroundColor: '#fff8e1',
    borderColor: '#ffa000',
    borderWidth: 2,
  },
  candidateRowDisabled: {
    opacity: 0.5,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  checkboxChecked: {
    backgroundColor: '#00aa00',
    borderColor: '#00aa00',
  },
  radio: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 13,
  },
  radioChecked: {
    backgroundColor: '#00aa00',
    borderColor: '#00aa00',
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  candidateInfo: {
    flex: 1,
  },
  candidateNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  candidateName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  candidateNameEndorsed: {
    fontWeight: 'bold',
  },
  candidateParty: {
    fontSize: 12,
    color: '#666',
  },
  placeholderBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginLeft: 8,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  endorsedIndicator: {
    backgroundColor: '#00aa00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  endorsedIndicatorPending: {
    backgroundColor: '#ffa000',
  },
  endorsedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  removedIndicator: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  removedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffc107',
  },
  warningText: {
    fontSize: 11,
    color: '#856404',
    lineHeight: 16,
  },
});
