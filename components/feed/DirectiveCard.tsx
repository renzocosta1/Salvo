import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';

export type DirectiveWithProgress = {
  id: string;
  title: string;
  body: string | null;
  target_goal: number;
  current_salvos: number;
  created_at: string;
  is_completed: boolean;
};

interface DirectiveCardProps {
  directive: DirectiveWithProgress;
}

export function DirectiveCard({ directive }: DirectiveCardProps) {
  const router = useRouter();
  const progress = Math.min((directive.current_salvos / directive.target_goal) * 100, 100);
  const isComplete = directive.is_completed || progress >= 100;

  // Format timestamp (e.g., "2h ago", "15m ago")
  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
  };

  const handlePress = () => {
    router.push(`/directive/${directive.id}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        isComplete && styles.cardComplete,
      ]}
    >
      {/* Header: Completion Status & Timestamp */}
      <View style={styles.header}>
        {isComplete && (
          <View style={styles.completeBadge}>
            <View style={styles.completeDot} />
            <Text style={styles.completeText}>COMPLETE</Text>
          </View>
        )}
        <Text style={styles.timestamp}>{getTimeAgo(directive.created_at)}</Text>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {directive.title}
      </Text>

      {/* Body/Description */}
      {directive.body && (
        <Text style={styles.description} numberOfLines={2}>
          {directive.body}
        </Text>
      )}

      {/* Progress Section */}
      <View style={styles.progressSection}>
        {/* Progress Stats */}
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressStats}>
            {directive.current_salvos.toLocaleString()} / {directive.target_goal.toLocaleString()}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progress}%`,
                backgroundColor: isComplete ? '#4caf50' : '#2196f3',
              },
            ]}
          />
        </View>

        {/* Percentage */}
        <Text style={styles.progressPercentage}>{progress.toFixed(0)}%</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3744',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  cardComplete: {
    borderColor: '#4caf50',
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1419',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4caf50',
    marginRight: 6,
  },
  completeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4caf50',
  },
  timestamp: {
    fontSize: 12,
    color: '#8b98a5',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#8b98a5',
    marginBottom: 16,
    lineHeight: 20,
  },
  progressSection: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressStats: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#0f1419',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#8b98a5',
    textAlign: 'right',
  },
});
