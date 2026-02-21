import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';

export default function PWACheckScreen() {
  const [diagnostics, setDiagnostics] = useState<any>({});

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      setDiagnostics({ platform: 'Not Web' });
      return;
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true ||
                         document.referrer.includes('android-app://');

    const info = {
      isStandalone,
      displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 
                   window.matchMedia('(display-mode: browser)').matches ? 'browser' : 'unknown',
      navigatorStandalone: (window.navigator as any).standalone,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      isIOS: /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()),
      isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
      windowInnerHeight: window.innerHeight,
      windowInnerWidth: window.innerWidth,
      screenHeight: window.screen.height,
      screenWidth: window.screen.width,
    };

    setDiagnostics(info);
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PWA Diagnostic Check</Text>
        <Text style={styles.subtitle}>
          {diagnostics.isStandalone ? '✅ Running as PWA' : '❌ Running in Browser'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Installation Status</Text>
        <View style={styles.card}>
          <DiagnosticRow label="Display Mode" value={diagnostics.displayMode || 'unknown'} />
          <DiagnosticRow label="Is Standalone" value={diagnostics.isStandalone ? 'YES ✅' : 'NO ❌'} />
          <DiagnosticRow label="Navigator Standalone" value={String(diagnostics.navigatorStandalone)} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browser Info</Text>
        <View style={styles.card}>
          <DiagnosticRow label="Is iOS" value={diagnostics.isIOS ? 'YES' : 'NO'} />
          <DiagnosticRow label="Is Safari" value={diagnostics.isSafari ? 'YES' : 'NO'} />
          <DiagnosticRow label="User Agent" value={diagnostics.userAgent} multiline />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Screen Dimensions</Text>
        <View style={styles.card}>
          <DiagnosticRow label="Window Size" value={`${diagnostics.windowInnerWidth} x ${diagnostics.windowInnerHeight}`} />
          <DiagnosticRow label="Screen Size" value={`${diagnostics.screenWidth} x ${diagnostics.screenHeight}`} />
        </View>
      </View>

      {!diagnostics.isStandalone && (
        <View style={[styles.section, styles.warningSection]}>
          <Text style={styles.warningTitle}>⚠️ NOT RUNNING AS PWA</Text>
          <Text style={styles.warningText}>
            To properly test Task 29 features, you must:
            {'\n\n'}
            1. Open Safari browser{'\n'}
            2. Go to salvo-eight.vercel.app{'\n'}
            3. Tap Share button{'\n'}
            4. Tap "Add to Home Screen"{'\n'}
            5. Tap "Add"{'\n'}
            6. CLOSE Safari completely{'\n'}
            7. Tap the Salvo icon on HOME SCREEN{'\n\n'}
            
            If you see Safari buttons at bottom = NOT a PWA!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function DiagnosticRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}:</Text>
      <Text style={[styles.rowValue, multiline && styles.rowValueMultiline]}>
        {value || 'N/A'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1f26',
    borderBottomWidth: 2,
    borderBottomColor: '#2d3748',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00ff00',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00ff00',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#1a1f26',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  row: {
    marginBottom: 12,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b98a5',
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 14,
    color: '#ffffff',
  },
  rowValueMultiline: {
    fontSize: 12,
    lineHeight: 18,
  },
  warningSection: {
    backgroundColor: '#ff6b3522',
    borderWidth: 2,
    borderColor: '#ff6b35',
    borderRadius: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff6b35',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 22,
  },
});
