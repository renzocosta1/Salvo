import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, RefreshControl, ScrollView } from 'react-native';
import { useAuth } from '@/lib/auth';
import { refreshPolymarketOdds, subscribeToOddsUpdates } from '@/lib/supabase/polymarket';
import { fetchBallotWithOdds, getTopCandidate, getOddsColorCode, type RaceWithOdds } from '@/lib/supabase/ballotWithOdds';
import { getActiveAlerts, acknowledgeAlert, subscribeToAlerts, type AlertWithMarket } from '@/lib/alerts/oddsAlerts';
import RedAlertBanner from './RedAlertBanner';

interface CountdownInfo {
  label: string;
  date: Date;
  daysRemaining: number;
  isPast: boolean;
}

export default function WarRoomHUD() {
  const { profile } = useAuth();
  const [races, setRaces] = useState<RaceWithOdds[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdowns, setCountdowns] = useState<CountdownInfo[]>([]);
  const [alerts, setAlerts] = useState<AlertWithMarket[]>([]);

  // Maryland 2026 Republican Primary - Official Dates
  // Source: Maryland State Board of Elections
  const ELECTION_DATES = [
    { label: 'Voter Registration Deadline', date: new Date('2026-05-03T23:59:59') },
    { label: 'Early Voting Begins', date: new Date('2026-06-12T08:00:00') },
    { label: 'Early Voting Ends', date: new Date('2026-06-20T20:00:00') },
    { label: 'Primary Election Day', date: new Date('2026-06-24T20:00:00') },
  ];

  useEffect(() => {
    if (profile) {
      loadData();
      loadAlerts();

      // Subscribe to real-time odds updates
      const oddsSubscription = subscribeToOddsUpdates(() => {
        loadData();
      });

      // Subscribe to real-time alerts
      const alertsSubscription = subscribeToAlerts(profile.id, () => {
        loadAlerts();
      });

      // Update countdowns every minute
      const interval = setInterval(updateCountdowns, 60000);
      updateCountdowns();

      // Auto-refresh odds every 15 minutes
      const autoRefreshInterval = setInterval(handleRefresh, 15 * 60 * 1000);

      return () => {
        oddsSubscription.unsubscribe();
        alertsSubscription.unsubscribe();
        clearInterval(interval);
        clearInterval(autoRefreshInterval);
      };
    }
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    // Check if user has district information
    if (!profile.county || !profile.legislative_district) {
      setRaces([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WarRoomHUD.tsx:78',message:'loadData fetching ballot with odds',data:{county:profile.county,district:profile.legislative_district},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    
    const result = await fetchBallotWithOdds({
      id: profile.id,
      county: profile.county,
      legislative_district: profile.legislative_district,
      congressional_district: profile.congressional_district || '',
    });

    if (result.data) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WarRoomHUD.tsx:89',message:'fetchBallotWithOdds result',data:{raceCount:result.data.length,raceTitles:result.data.map(r=>r.raceTitle),marketSlugs:result.data.map(r=>r.market?.slug||'no-market'),hasOdds:result.data.map(r=>!!r.market)},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      
      // Sort races: federal first, then state, then county
      const sorted = result.data.sort((a, b) => {
        const order = { federal: 0, state: 1, county: 2 };
        return order[a.race_type] - order[b.race_type];
      });
      setRaces(sorted);
    }
    setLoading(false);
  };

  const loadAlerts = async () => {
    if (!profile) return;

    const result = await getActiveAlerts(profile.id);
    if (result.data) {
      setAlerts(result.data);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPolymarketOdds();
    await loadData();
    await loadAlerts();
    setRefreshing(false);
  };

  const handleDismissAlert = async (alertId: string) => {
    if (!profile) return;

    const result = await acknowledgeAlert(alertId, profile.id);
    if (result.success) {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    }
  };

  const updateCountdowns = () => {
    const now = new Date();
    const updated = ELECTION_DATES.map((event) => {
      const timeRemaining = event.date.getTime() - now.getTime();
      const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
      return {
        ...event,
        daysRemaining,
        isPast: timeRemaining < 0,
      };
    });
    setCountdowns(updated);
  };

  const renderHeroRace = (race: RaceWithOdds) => {
    if (!race.odds) return null;

    const topCandidate = getTopCandidate(race.odds);
    if (!topCandidate) return null;

    const colorCode = getOddsColorCode(topCandidate.probability);
    const changePercent = race.odds.price_change_24h?.[topCandidate.index];

    return (
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{race.race_title}</Text>
        <View style={styles.heroGaugeContainer}>
          <View style={styles.heroGauge}>
            <View
              style={[
                styles.heroGaugeFill,
                colorCode === 'winning' && styles.gaugeWinning,
                colorCode === 'competitive' && styles.gaugeCompetitive,
                colorCode === 'losing' && styles.gaugeLosing,
                { width: `${Math.round(topCandidate.probability * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.heroCandidate}>{topCandidate.name}</Text>
          <View style={styles.heroOddsRow}>
            <Text style={styles.heroOdds}>
              {Math.round(topCandidate.probability * 100)}%
            </Text>
            {changePercent !== null && changePercent !== undefined && (
              <Text
                style={[
                  styles.heroChange,
                  changePercent > 0 ? styles.changePositive : styles.changeNegative,
                ]}
              >
                {`${changePercent > 0 ? '+' : ''}${(changePercent * 100).toFixed(1)}%`}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.heroOutcomesList}>
          {race.odds.outcomes.map((outcome, idx) => (
            <View key={idx} style={styles.heroOutcomeRow}>
              <Text style={styles.heroOutcomeName}>{outcome}</Text>
              <Text style={styles.heroOutcomePrice}>
                {Math.round(race.odds!.prices[idx] * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderRaceCard = (race: RaceWithOdds) => {
    const topCandidate = getTopCandidate(race.odds);
    if (!topCandidate) return null;

    const colorCode = getOddsColorCode(topCandidate.probability);

    return (
      <View key={race.id} style={styles.raceCard}>
        <Text style={styles.raceTitle}>{race.race_title}</Text>
        <View style={styles.gaugeContainer}>
          <View style={styles.gauge}>
            <View
              style={[
                styles.gaugeFill,
                colorCode === 'winning' && styles.gaugeWinning,
                colorCode === 'competitive' && styles.gaugeCompetitive,
                colorCode === 'losing' && styles.gaugeLosing,
                { width: `${Math.round(topCandidate.probability * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.gaugeLabel}>
            {topCandidate.name}: {Math.round(topCandidate.probability * 100)}%
          </Text>
        </View>
      </View>
    );
  };

  const renderCountdown = (countdown: CountdownInfo) => {
    return (
      <View key={countdown.label} style={styles.countdownCard}>
        <Text style={styles.countdownLabel}>{countdown.label}</Text>
        <Text style={[
          styles.countdownDays,
          countdown.isPast && styles.countdownPast
        ]}>
          {countdown.isPast ? 'COMPLETED' : `${countdown.daysRemaining} ${countdown.daysRemaining === 1 ? 'day' : 'days'}`}
        </Text>
        <Text style={styles.countdownDate}>
          {countdown.date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#39FF14" />
        <Text style={styles.loadingText}>Loading War Room Intel...</Text>
      </View>
    );
  }

  // Check if user has district info
  if (!profile?.county || !profile?.legislative_district) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>⚠️ District Info Required</Text>
        <Text style={[styles.loadingText, { color: '#888', marginTop: 16 }]}>
          Please update your address in Profile to access War Room data
        </Text>
      </View>
    );
  }

  // Separate governor race as hero
  const governorRace = races.find((r) => r.race_title.toLowerCase().includes('governor'));
  // Only show races that have betting markets (not blank)
  const otherRaces = races.filter((r) => r.id !== governorRace?.id && r.odds !== null);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#39FF14" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>🎯 WAR ROOM CENTCOM</Text>
        <Pressable onPress={handleRefresh} disabled={refreshing}>
          <Text style={styles.refreshButton}>🔄 Refresh</Text>
        </Pressable>
      </View>

      {/* RED ALERTS */}
      {alerts.length > 0 && (
        <View style={styles.section}>
          <RedAlertBanner alerts={alerts} onDismiss={handleDismissAlert} />
        </View>
      )}

      {/* HERO: Governor Race */}
      {governorRace && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏛️ TOP RACE</Text>
          {renderHeroRace(governorRace)}
        </View>
      )}

      {/* User's District Races (Only races with betting markets) */}
      {otherRaces.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 YOUR BALLOT RACES (Live Markets)</Text>
          {profile && (
            <Text style={styles.districtInfo}>
              {profile.county} • District {profile.legislative_district} • {profile.congressional_district}
            </Text>
          )}
          <View style={styles.racesGrid}>
            {otherRaces.map((race) => renderRaceCard(race))}
          </View>
          <Text style={styles.marketNote}>
            Only showing races with active Polymarket betting odds. More markets will appear as the primary season approaches.
          </Text>
        </View>
      )}

      {/* Countdowns Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 MISSION DEADLINES</Text>
        <View style={styles.countdownGrid}>
          {countdowns.map((countdown) => renderCountdown(countdown))}
        </View>
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Odds update every 15 minutes • Powered by Polymarket
        </Text>
        <Text style={styles.footerText}>
          Last refresh: {new Date().toLocaleTimeString()}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#39FF14',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#39FF14',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#39FF14',
    textShadowColor: '#39FF14',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  refreshButton: {
    color: '#39FF14',
    fontSize: 14,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#39FF14',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  districtInfo: {
    color: '#888',
    fontSize: 12,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  heroCard: {
    backgroundColor: '#111',
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#39FF14',
  },
  heroTitle: {
    color: '#39FF14',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  heroGaugeContainer: {
    marginBottom: 16,
  },
  heroGauge: {
    height: 40,
    backgroundColor: '#222',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },
  heroGaugeFill: {
    height: '100%',
    borderRadius: 20,
  },
  heroCandidate: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroOddsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  heroOdds: {
    color: '#39FF14',
    fontSize: 32,
    fontWeight: 'bold',
  },
  heroChange: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  heroOutcomesList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 8,
  },
  heroOutcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  heroOutcomeName: {
    color: '#CCC',
    fontSize: 14,
  },
  heroOutcomePrice: {
    color: '#39FF14',
    fontSize: 14,
    fontWeight: '600',
  },
  racesGrid: {
    gap: 12,
  },
  raceCard: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  raceTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  gaugeContainer: {
    gap: 8,
  },
  gauge: {
    height: 20,
    backgroundColor: '#222',
    borderRadius: 10,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 10,
  },
  gaugeWinning: {
    backgroundColor: '#00ff00',
  },
  gaugeCompetitive: {
    backgroundColor: '#ffaa00',
  },
  gaugeLosing: {
    backgroundColor: '#ff4444',
  },
  gaugeLabel: {
    color: '#39FF14',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noMarketBadge: {
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  noMarketText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  marketNote: {
    color: '#888',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  changePositive: {
    color: '#00ff00',
  },
  changeNegative: {
    color: '#ff4444',
  },
  countdownGrid: {
    gap: 12,
  },
  countdownCard: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#39FF14',
  },
  countdownLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  countdownDays: {
    color: '#39FF14',
    fontSize: 32,
    fontWeight: 'bold',
  },
  countdownPast: {
    color: '#888',
    fontSize: 20,
    fontWeight: 'normal',
  },
  countdownDate: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  noDataText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});
