import React from 'react';
import { Easing } from 'react-native';
import { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

// Common spring configs
export const springConfig = {
  bouncy: {
    damping: 5,
    mass: 1,
    overshootClamping: false,
  },
  smooth: {
    damping: 10,
    mass: 1,
    overshootClamping: true,
  },
  gentle: {
    damping: 15,
    mass: 1,
    overshootClamping: true,
  },
};

// Common timing configs
export const timingConfig = {
  fast: {
    duration: 250,
    easing: Easing.out(Easing.ease),
  },
  normal: {
    duration: 400,
    easing: Easing.out(Easing.ease),
  },
  slow: {
    duration: 600,
    easing: Easing.out(Easing.ease),
  },
  colorTransition: {
    duration: 500,
    easing: Easing.linear,
  },
};

// Hook to check if animations should be reduced
export const useReduceMotion = () => {
  // Simplified - returns false to allow animations
  // In a real app, you'd check device accessibility settings
  return false;
};

// Button press animation
export const useButtonAnimation = () => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.95, springConfig.gentle);
  };

  const onPressOut = () => {
    scale.value = withSpring(1, springConfig.gentle);
  };

  return {
    animatedStyle,
    onPressIn,
    onPressOut,
  };
};

// Card scale animation (slight scale on press)
export const useCardAnimation = () => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.98, springConfig.gentle);
  };

  const onPressOut = () => {
    scale.value = withSpring(1, springConfig.gentle);
  };

  return {
    animatedStyle,
    onPressIn,
    onPressOut,
  };
};

// Fade in animation
export const useFadeIn = (delay = 0) => {
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const start = () => {
    opacity.value = withDelay(
      delay,
      withTiming(1, timingConfig.normal)
    );
  };

  return {
    animatedStyle,
    start,
  };
};

// Slide up animation
export const useSlideUp = (delay = 0, distance = 30) => {
  const translateY = useSharedValue(distance);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const start = () => {
    translateY.value = withDelay(
      delay,
      withTiming(0, timingConfig.normal)
    );
    opacity.value = withDelay(
      delay,
      withTiming(1, timingConfig.normal)
    );
  };

  return {
    animatedStyle,
    start,
  };
};

// Slide down animation
export const useSlideDown = (delay = 0, distance = 30) => {
  const translateY = useSharedValue(-distance);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const start = () => {
    translateY.value = withDelay(
      delay,
      withTiming(0, timingConfig.normal)
    );
    opacity.value = withDelay(
      delay,
      withTiming(1, timingConfig.normal)
    );
  };

  return {
    animatedStyle,
    start,
  };
};

// Scale animation
export const useScaleAnimation = (
  fromScale = 0.9,
  delay = 0,
  duration = 400
) => {
  const scale = useSharedValue(fromScale);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const start = () => {
    scale.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.ease) })
    );
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.ease) })
    );
  };

  return {
    animatedStyle,
    start,
  };
};

// Width animation (for progress bars)
export const useProgressAnimation = (delay = 0, duration = 500) => {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${interpolate(
      progress.value,
      [0, 1],
      [0, 100],
      Extrapolate.CLAMP
    )}%`,
  }));

  const start = () => {
    progress.value = withDelay(
      delay,
      withTiming(1, { 
        duration, 
        easing: Easing.out(Easing.ease) 
      })
    );
  };

  return {
    animatedStyle,
    start,
  };
};

// Staggered animation for lists
export const useStaggeredAnimation = (
  itemCount: number,
  itemDelay = 100,
  duration = 400
) => {
  const animations = Array.from({ length: itemCount }, (_, index) => {
    const translateY = useSharedValue(30);
    const opacity = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    }));

    const start = () => {
      const delay = index * itemDelay;
      translateY.value = withDelay(
        delay,
        withTiming(0, { duration, easing: Easing.out(Easing.ease) })
      );
      opacity.value = withDelay(
        delay,
        withTiming(1, { duration, easing: Easing.out(Easing.ease) })
      );
    };

    return {
      animatedStyle,
      start,
    };
  });

  return animations;
};

// Tab indicator animation
export const useTabIndicatorAnimation = (
  tabWidth: number,
  selectedIndex: number
) => {
  const translateX = useSharedValue(selectedIndex * tabWidth);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const updatePosition = (index: number) => {
    translateX.value = withSpring(
      index * tabWidth,
      springConfig.smooth
    );
  };

  return {
    animatedStyle,
    updatePosition,
  };
};

// Icon scale animation
export const useIconScaleAnimation = (isSelected: boolean) => {
  const scale = useSharedValue(isSelected ? 1.2 : 1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const updateScale = (selected: boolean) => {
    scale.value = withSpring(
      selected ? 1.2 : 1,
      springConfig.bouncy
    );
  };

  return {
    animatedStyle,
    updateScale,
  };
};

// Rotation animation
export const useRotationAnimation = () => {
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ 
      rotate: `${interpolate(
        rotation.value,
        [0, 1],
        [0, 45],
        Extrapolate.CLAMP
      )}deg` 
    }],
  }));

  const toggle = () => {
    rotation.value = withSpring(
      rotation.value === 0 ? 1 : 0,
      springConfig.smooth
    );
  };

  return {
    animatedStyle,
    toggle,
    rotation,
  };
};

// Checkbox animation
export const useCheckboxAnimation = () => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const check = () => {
    scale.value = withSpring(1, springConfig.bouncy);
    opacity.value = withSpring(1, springConfig.bouncy);
  };

  const uncheck = () => {
    scale.value = withSpring(0, springConfig.gentle);
    opacity.value = withSpring(0, springConfig.gentle);
  };

  return {
    animatedStyle,
    check,
    uncheck,
  };
};

// Pulse animation
export const usePulseAnimation = (isActive = true) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  React.useEffect(() => {
    if (!isActive) return;

    const pulse = () => {
      scale.value = withSequence(
        withTiming(1.1, { duration: 500 }),
        withTiming(1, { duration: 500 })
      );
    };

    pulse();
    const interval = setInterval(pulse, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  return {
    animatedStyle,
  };
};

// Strikethrough animation
export const useStrikethroughAnimation = () => {
  const strokeWidth = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${interpolate(
      strokeWidth.value,
      [0, 1],
      [0, 100],
      Extrapolate.CLAMP
    )}%`,
  }));

  const drawStrike = () => {
    strokeWidth.value = withTiming(1, timingConfig.fast);
  };

  const clearStrike = () => {
    strokeWidth.value = withTiming(0, timingConfig.fast);
  };

  return {
    animatedStyle,
    drawStrike,
    clearStrike,
  };
};

// Color transition animation
export const useColorAnimation = (
  shouldAnimate = true
) => {
  const colorProgress = useSharedValue(shouldAnimate ? 0 : 1);

  const animatedStyle = useAnimatedStyle(() => {
    // This is simplified - in real usage you'd interpolate between RGB values
    return {
      opacity: colorProgress.value,
    };
  });

  const start = () => {
    if (!shouldAnimate) return;
    colorProgress.value = withTiming(1, timingConfig.colorTransition);
  };

  return {
    animatedStyle,
    start,
  };
};

// Bounce animation
export const useBounceAnimation = (triggerBounce: boolean) => {
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  React.useEffect(() => {
    if (!triggerBounce) return;

    translateY.value = withSequence(
      withSpring(-10, springConfig.bouncy),
      withSpring(0, springConfig.bouncy)
    );
  }, [triggerBounce]);

  return {
    animatedStyle,
  };
};

// Swipe out animation (for delete gestures)
export const useSwipeOutAnimation = (shouldSwipe: boolean) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const startSwipe = () => {
    if (!shouldSwipe) return;
    translateX.value = withTiming(-500, timingConfig.normal);
    opacity.value = withTiming(0, timingConfig.normal);
  };

  return {
    animatedStyle,
    startSwipe,
  };
};

// Shake animation (for validation errors)
export const useShakeAnimation = (shouldShake: boolean) => {
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  React.useEffect(() => {
    if (!shouldShake) return;

    const shake = () => {
      translateX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    };

    shake();
  }, [shouldShake]);

  return {
    animatedStyle,
  };
};

export default {
  springConfig,
  timingConfig,
  useButtonAnimation,
  useCardAnimation,
  useFadeIn,
  useSlideUp,
  useSlideDown,
  useScaleAnimation,
  useProgressAnimation,
  useStaggeredAnimation,
  useTabIndicatorAnimation,
  useIconScaleAnimation,
  useRotationAnimation,
  useCheckboxAnimation,
  usePulseAnimation,
  useStrikethroughAnimation,
  useColorAnimation,
  useBounceAnimation,
  useSwipeOutAnimation,
  useShakeAnimation,
};
