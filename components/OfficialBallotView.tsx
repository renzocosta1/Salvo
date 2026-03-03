/**
 * Official Ballot View - Read-Only Party Slate
 * Shows who the party is endorsing - a cheat sheet for the voting booth
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { type BallotRace } from '@/lib/supabase/ballot';

interface OfficialBallotViewProps {
  races: BallotRace[];
  county?: string;
  loading?: boolean;
}

export default function OfficialBallotView({ races, county, loading = false }: OfficialBallotViewProps) {
  const getVoteInstruction = (race: BallotRace): string => {
    const max = race.max_selections || 1;
    if (max === 1) return 'Vote for 1';
    return `Vote for up to ${max}`;
  };

  const cleanRaceTitle = (title: string): string => {
    // Remove "(Vote for up to X)" from title if present - we'll show it separately
    return title.replace(/\s*\(Vote for up to \d+\)/gi, '').trim();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading Ballot...</Text>
      </View>
    );
  }

  if (races.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No ballot available for your district</Text>
        <Text style={styles.emptySubtext}>
          Make sure your address is set correctly in your profile
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Official Header */}
      <View style={styles.header}>
        <Text style={styles.officialTitle}>OFFICIAL BALLOT</Text>
        <Text style={styles.referenceNotice}>★ FOR REFERENCE ONLY - DO NOT MARK ★</Text>
        <Text style={styles.electionType}>REPUBLICAN PRIMARY ELECTION</Text>
        <Text style={styles.electionDate}>Tuesday, May 14, 2024</Text>
        <Text style={styles.location}>State of Maryland, County of {county || 'Montgomery'}</Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>VOTING INSTRUCTIONS</Text>
        <Text style={styles.instructionsText}>
          This is a sample of your actual ballot for reference purposes.{'\n\n'}
          Candidates with <Text style={styles.greenText}>FILLED OVALS</Text> and <Text style={styles.greenText}>GREEN backgrounds</Text> are party-endorsed.{'\n\n'}
          Take this guide to the voting booth and mark your paper ballot accordingly.
        </Text>
      </View>

      {/* Ballot Races */}
      {races.map((race, raceIndex) => {
        const endorsedCandidates = race.candidates.filter(c => c.hard_party_endorsed);
        const maxSelections = race.max_selections || 1;

        return (
          <View key={race.id} style={styles.raceSection}>
            {/* Race Header */}
            <View style={styles.raceHeader}>
              <Text style={styles.raceTitle}>{cleanRaceTitle(race.race_title)}</Text>
              {race.incumbent_name && (
                <Text style={styles.incumbentText}>Currently: {race.incumbent_name}</Text>
              )}
              <Text style={styles.voteInstruction}>{getVoteInstruction(race)}</Text>
            </View>

            {/* Candidates */}
            <View style={styles.candidatesContainer}>
              {race.candidates.map((candidate) => {
                const isEndorsed = candidate.hard_party_endorsed;

                return (
                  <View
                    key={candidate.id}
                    style={[
                      styles.candidateRow,
                      isEndorsed && styles.candidateRowEndorsed,
                    ]}
                  >
                    {/* Oval/Circle (like Scantron) */}
                    <View style={styles.ovalContainer}>
                      <View
                        style={[
                          styles.oval,
                          isEndorsed && styles.ovalFilled,
                        ]}
                      />
                    </View>

                    {/* Candidate Info */}
                    <View style={styles.candidateInfo}>
                      <View style={styles.candidateNameRow}>
                        <Text
                          style={[
                            styles.candidateName,
                            isEndorsed && styles.candidateNameEndorsed,
                          ]}
                        >
                          {candidate.name || candidate.candidate_name}
                        </Text>
                        {candidate.is_placeholder && (
                          <View style={styles.placeholderBadge}>
                            <Text style={styles.placeholderText}>TBD</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.candidateParty}>
                        {candidate.party || candidate.candidate_party || 'Republican'}
                      </Text>
                    </View>

                    {/* Endorsed Badge */}
                    {isEndorsed && (
                      <View style={styles.endorsedBadge}>
                        <Text style={styles.endorsedBadgeText}>✓ ENDORSED</Text>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Write-in line (if applicable) */}
              {maxSelections === 1 && (
                <View style={styles.writeInRow}>
                  <View style={styles.ovalContainer}>
                    <View style={styles.oval} />
                  </View>
                  <Text style={styles.writeInText}>or write-in:</Text>
                  <View style={styles.writeInLine} />
                </View>
              )}
            </View>
          </View>
        );
      })}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          END OF BALLOT
        </Text>
        <Text style={styles.footerSubtext}>
          Bring this guide to the voting booth and vote for all GREEN highlighted candidates
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#000',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#000',
    alignItems: 'center',
  },
  officialTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
    letterSpacing: 3,
  },
  referenceNotice: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#cc0000',
    marginTop: 6,
    letterSpacing: 1,
  },
  electionType: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: '#000',
    marginTop: 12,
  },
  electionDate: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    marginTop: 4,
  },
  location: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    marginTop: 4,
  },
  instructions: {
    backgroundColor: '#fffacd',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  instructionsText: {
    fontSize: 12,
    color: '#000',
    lineHeight: 18,
  },
  greenText: {
    color: '#00aa00',
    fontWeight: 'bold',
  },
  raceSection: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    marginBottom: 8,
  },
  raceHeader: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    borderTopWidth: 2,
    borderTopColor: '#000',
  },
  raceTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  voteInstruction: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  incumbentText: {
    fontSize: 10,
    color: '#0066cc',
    marginTop: 2,
    marginBottom: 2,
    fontStyle: 'italic',
  },
  candidatesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 4,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#d0d0d0',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    backgroundColor: '#fefefe',
  },
  candidateRowEndorsed: {
    backgroundColor: '#e8ffe8',
    borderLeftWidth: 6,
    borderLeftColor: '#00aa00',
    borderBottomWidth: 1,
    borderBottomColor: '#00aa00',
  },
  ovalContainer: {
    marginRight: 14,
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  oval: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  ovalFilled: {
    backgroundColor: '#000',
  },
  candidateInfo: {
    flex: 1,
  },
  candidateNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  candidateName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  placeholderBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginLeft: 6,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  candidateNameEndorsed: {
    fontWeight: 'bold',
    color: '#000',
  },
  candidateParty: {
    fontSize: 11,
    color: '#666',
  },
  endorsedBadge: {
    backgroundColor: '#00aa00',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginLeft: 8,
  },
  endorsedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  writeInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  writeInText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginRight: 8,
  },
  writeInLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#000',
  },
  footer: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 2,
    borderTopColor: '#000',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
    color: '#000',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 11,
    textAlign: 'center',
    color: '#666',
    lineHeight: 16,
  },
});
