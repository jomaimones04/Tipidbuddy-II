import React, { useEffect } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface AnimatedTabIndicatorProps {
  selectedIndex: number;
  tabCount: number;
  tabWidth: number;
  height?: number;
  backgroundColor?: string;
  style?: ViewStyle;
}

/**
 * Animated tab indicator that slides smoothly between tabs
 * Use this to show which tab is currently selected
 *
 * Example:
 * const [selectedTab, setSelectedTab] = useState(0);
 * const tabWidth = screenWidth / 3;
 *
 * <AnimatedTabIndicator
 *   selectedIndex={selectedTab}
 *   tabCount={3}
 *   tabWidth={tabWidth}
 *   height={3}
 *   backgroundColor="#2D7D46"
 * />
 */
export const AnimatedTabIndicator: React.FC<AnimatedTabIndicatorProps> = ({
  selectedIndex,
  tabCount,
  tabWidth,
  height = 3,
  backgroundColor = '#2D7D46',
  style,
}) => {
  const translateX = useSharedValue(selectedIndex * tabWidth);

  useEffect(() => {
    translateX.value = withSpring(selectedIndex * tabWidth, {
      damping: 10,
      mass: 1,
      overshootClamping: true,
    });
  }, [selectedIndex, tabWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        styles.container,
        {
          width: tabWidth * tabCount,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.indicator,
          {
            width: tabWidth,
            height,
            backgroundColor,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  indicator: {
    borderRadius: 2,
  },
});

export default AnimatedTabIndicator;
