import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

interface AnimatedProgressBarProps {
  percentage: number;
  delay?: number;
  duration?: number;
  color?: string;
  backgroundColor?: string;
  height?: number;
  borderRadius?: number;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  percentage,
  delay = 0,
  duration = 500,
  color = '#2D7D46',
  backgroundColor = '#E5E7EB',
  height = 6,
  borderRadius = 3,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(Math.min(percentage, 100), {
        duration,
        easing: Easing.out(Easing.ease),
      })
    );
  }, [percentage]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${interpolate(
      progress.value,
      [0, 100],
      [0, 100],
      Extrapolate.CLAMP
    )}%`,
  }));

  return (
    <Animated.View
      style={[
        styles.background,
        {
          height,
          borderRadius,
          backgroundColor,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius,
            backgroundColor: color,
          },
          animatedBarStyle,
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  background: {
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});

export default AnimatedProgressBar;
