import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, RadialGradient, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularPillageMeterProps {
  currentCount: number;
  targetGoal: number;
  size?: number;
  strokeWidth?: number;
}

export function CircularPillageMeter({
  currentCount,
  targetGoal,
  size = 200,
  strokeWidth = 12,
}: CircularPillageMeterProps) {
  const progress = Math.min((currentCount / targetGoal) * 100, 100);
  const isComplete = progress >= 100;
  
  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Animated value for smooth progress updates
  const animatedProgress = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [progress]);
  
  // Calculate stroke dash offset for progress
  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });
  
  const center = size / 2;
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          {/* Glow effect for complete state */}
          <RadialGradient id="glowGradient" cx="50%" cy="50%">
            <Stop offset="0%" stopColor="#00ff88" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Glow circle when complete */}
          {isComplete && (
            <Circle
              cx={center}
              cy={center}
              r={radius + 8}
              fill="url(#glowGradient)"
            />
          )}
          
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#333333"
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Progress circle */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={isComplete ? '#00ff88' : '#ff6b35'}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      
      {/* Center content */}
      <View style={styles.centerContent}>
        <Text 
          style={[
            styles.countText,
            { color: isComplete ? '#00ff88' : '#ffffff' }
          ]}
        >
          {currentCount.toLocaleString()}
        </Text>
        <Text style={styles.dividerText}>/</Text>
        <Text style={styles.goalText}>
          {targetGoal.toLocaleString()}
        </Text>
        <Text 
          style={[
            styles.percentText,
            { color: isComplete ? '#00ff88' : '#ff6b35' }
          ]}
        >
          {progress.toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  dividerText: {
    fontSize: 16,
    color: '#666666',
    marginVertical: -4,
  },
  goalText: {
    fontSize: 20,
    color: '#a0a0a0',
    marginBottom: 8,
  },
  percentText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
});
