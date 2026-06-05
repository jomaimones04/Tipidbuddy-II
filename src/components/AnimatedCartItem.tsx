import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { SPACING } from '@constants/index';
import type { GroceryItem } from '../types/index';

interface AnimatedCartItemProps {
  item: GroceryItem & { index: number };
  onToggleCheck: (itemId: string, isChecked: boolean) => void;
  theme: any;
  estimatedPrice: number;
}

export const AnimatedCartItem: React.FC<AnimatedCartItemProps> = ({
  item,
  onToggleCheck,
  theme,
  estimatedPrice,
}) => {
  const styles = StyleSheet.create({
    container: {
      marginBottom: SPACING.md,
    },
    itemRow: {
      backgroundColor: theme.card,
      borderRadius: 8,
      padding: SPACING.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.primary,
      marginRight: SPACING.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkmark: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: SPACING.xs,
    },
    strikeThroughText: {
      textDecorationLine: 'line-through',
      color: theme.textSecondary,
    },
    categoryBadge: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
      backgroundColor: theme.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    priceSection: {
      alignItems: 'flex-end',
      marginLeft: SPACING.md,
    },
    price: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    quantity: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: SPACING.xs,
    },
  });

  // Animations
  const checkboxScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);
  const strikethroughWidth = useSharedValue(0);
  const rowBackgroundOpacity = useSharedValue(0);
  const itemTranslateY = useSharedValue(20);
  const itemOpacity = useSharedValue(0);

  // Initial stagger animation
  useEffect(() => {
    const delay = item.index * 75;
    itemTranslateY.value = withTiming(0, {
      duration: 400,
      // Use default easing
    });
    itemOpacity.value = withTiming(1, {
      duration: 400,
    });
  }, []);

  const itemAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: itemTranslateY.value }],
    opacity: itemOpacity.value,
  }));

  const checkboxAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: item.isChecked ? '#2D7D46' : 'transparent',
    transform: [{ scale: checkboxScale.value }],
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkmarkOpacity.value,
  }));

  const rowBgAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(34, 197, 94, ${rowBackgroundOpacity.value * 0.1})`,
  }));

  const strikethroughAnimatedStyle = useAnimatedStyle(() => ({
    width: `${interpolate(
      strikethroughWidth.value,
      [0, 1],
      [0, 100],
      Extrapolate.CLAMP
    )}%`,
  }));

  const handleToggle = () => {
    const newChecked = !item.isChecked;

    if (newChecked) {
      // Animate check
      checkboxScale.value = withSpring(1, {
        damping: 5,
        mass: 1,
        overshootClamping: false,
      });
      checkmarkOpacity.value = withSpring(1, {
        damping: 10,
        mass: 1,
        overshootClamping: true,
      });
      strikethroughWidth.value = withTiming(1, { duration: 300 });
      rowBackgroundOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 300 })
      );
    } else {
      // Animate uncheck
      checkboxScale.value = withSpring(0, {
        damping: 10,
        mass: 1,
        overshootClamping: true,
      });
      checkmarkOpacity.value = withSpring(0, {
        damping: 10,
        mass: 1,
        overshootClamping: true,
      });
      strikethroughWidth.value = withTiming(0, { duration: 300 });
      rowBackgroundOpacity.value = withTiming(0, { duration: 200 });
    }

    onToggleCheck(item.id, newChecked);
  };

  return (
    <Animated.View style={[styles.container, itemAnimatedStyle]}>
      <Animated.View style={[styles.itemRow, rowBgAnimatedStyle]}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={handleToggle}
        >
          <Animated.View style={checkboxAnimatedStyle}>
            <Animated.Text style={[styles.checkmark, checkmarkAnimatedStyle]}>
              ✓
            </Animated.Text>
          </Animated.View>
        </TouchableOpacity>

        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, item.isChecked && styles.strikeThroughText]}>
            {item.name}
          </Text>
          <Text style={styles.categoryBadge}>{item.category}</Text>

          {/* Animated strikethrough */}
          {item.isChecked && (
            <Animated.View
              style={{
                height: 1,
                backgroundColor: theme.textSecondary,
                marginTop: 8,
                ...strikethroughAnimatedStyle,
              }}
            />
          )}
        </View>

        <View style={styles.priceSection}>
          <Text style={styles.price}>
            ₱{(item.actualPrice || item.estimatedPrice || 0).toFixed(2)}
          </Text>
          <Text style={styles.quantity}>×{item.quantity}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default AnimatedCartItem;
