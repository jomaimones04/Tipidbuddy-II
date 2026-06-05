# TipidBuddy Animations Implementation Guide

This document provides a comprehensive guide for implementing animations throughout the TipidBuddy app using react-native-reanimated and react-native-animatable.

## Setup

### Installed Packages
- `react-native-reanimated@4.1.1` (already installed)
- `react-native-animatable` (newly added)

### Key Files
- `src/utils/animations.ts` - Animation utilities and hooks
- `src/navigation/index.tsx` - Screen transition animations
- Individual screens for micro-interactions

---

## Animation Categories

### 1. Screen Transitions (Navigation)
**Configured in**: `src/navigation/index.tsx`

```typescript
// Stack screens: slide from right
cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS

// Modal screens: slide from bottom
cardStyleInterpolator: CardStyleInterpolators.forBottomSheetAndroid

// Special screens (e.g., Recap): fade + scale
cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid
```

### 2. HomeScreen (My Carts)
✅ **Implemented**:
- **FAB Scale Animation**: FAB scales in with spring on mount (0 → 1)
- **Cart Cards Stagger**: Each cart card animates in from bottom with stagger (100ms delay between cards)
- **Card Press Animation**: Cards scale down slightly on press (1.0 → 0.97), spring back on release

### 3. SpendingRecapScreen
✅ **Partially Implemented**:
- **Screen Fade + Scale**: Screen fades in (0 → 1) and scales (0.9 → 1.0) on mount

**To Add**:
```typescript
// Summary cards stagger animation
const cardAnimations = [];
for (let i = 0; i < 4; i++) {
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);
  
  useEffect(() => {
    translateY.value = withDelay(
      i * 100,
      withTiming(0, timingConfig.normal)
    );
    opacity.value = withDelay(
      i * 100,
      withTiming(1, timingConfig.normal)
    );
  }, []);
  
  cardAnimations.push({ translateY, opacity });
}

// Progress bars animate width
const progressWidth = useSharedValue(0);
useEffect(() => {
  progressWidth.value = withDelay(
    delay,
    withTiming(targetWidth, { duration: 500, easing: Easing.out(Easing.ease) })
  );
}, []);
```

### 4. CartDetailScreen
**Animations to Implement**:

```typescript
// Budget bar fill animation
const budgetProgress = useSharedValue(0);
useEffect(() => {
  budgetProgress.value = withTiming(actualProgress, {
    duration: 600,
    easing: Easing.out(Easing.ease),
  });
}, [actualProgress]);

// Item check animation
const checkScale = useSharedValue(0);
const strikethroughWidth = useSharedValue(0);

const handleItemCheck = (itemId: string, isChecked: boolean) => {
  if (isChecked) {
    checkScale.value = withSpring(1, springConfig.bouncy);
    strikethroughWidth.value = withTiming(100, timingConfig.fast);
    // Flash green background
    rowOpacity.value = withSequence(
      withTiming(0.5, { duration: 200 }), // Green tint
      withTiming(0, { duration: 300 })
    );
  } else {
    checkScale.value = withSpring(0, springConfig.gentle);
    strikethroughWidth.value = withTiming(0, timingConfig.fast);
  }
};
```

### 5. InsightsScreen
**Animations to Implement**:

```typescript
// Content fade transition when switching date range
const contentOpacity = useSharedValue(1);

const handleDateNavigation = () => {
  contentOpacity.value = withSequence(
    withTiming(0, { duration: 200 }),
    withTiming(1, { duration: 200 })
  );
};

// Recent carts stagger animation
const cartAnimations = carts.map((_, index) => {
  const translate = useSharedValue(30);
  const opacity = useSharedValue(0);
  
  useEffect(() => {
    translate.value = withDelay(
      index * 100,
      withTiming(0, timingConfig.normal)
    );
    opacity.value = withDelay(
      index * 100,
      withTiming(1, timingConfig.normal)
    );
  }, []);
  
  return { translate, opacity };
});
```

### 6. TemplatesScreen
**Animations to Implement**:

```typescript
// Template cards stagger in
// "Use Template" button: press scale + spring back
// New template: slides in from top
```

### 7. VoiceInputModal
**Animations to Implement**:

```typescript
// Modal slides up from bottom with spring
// Microphone button continuous pulse
const pulseScale = useSharedValue(1);

useEffect(() => {
  const pulse = () => {
    pulseScale.value = withSequence(
      withTiming(1.15, { duration: 500 }),
      withTiming(1, { duration: 500 })
    );
  };
  
  pulse();
  const interval = setInterval(pulse, 1000);
  return () => clearInterval(interval);
}, [isRecording]);

// While recording: pulse faster and larger
// Sound wave bars animate up and down
// Parsed result chips slide in from right with stagger
```

### 8. CameraScannerScreen
**Animations to Implement**:

```typescript
// Corner brackets scale + fade in on mount
// Scanning line sweeps top to bottom continuously
// When label detected: brackets flash green + scale up briefly
```

### 9. Global Micro-Interactions
**Button Press Animation**:
```typescript
const { animatedStyle, onPressIn, onPressOut } = useButtonAnimation();

<Animated.View style={animatedStyle}>
  <TouchableOpacity onPressIn={onPressIn} onPressOut={onPressOut}>
    {/* Button content */}
  </TouchableOpacity>
</Animated.View>
```

**Card Press Animation**:
```typescript
const { animatedStyle, onPressIn, onPressOut } = useCardAnimation();

<Animated.View style={animatedStyle}>
  <TouchableOpacity onPressIn={onPressIn} onPressOut={onPressOut}>
    {/* Card content */}
  </TouchableOpacity>
</Animated.View>
```

---

## Animation Utilities

Located in `src/utils/animations.ts`:

### Hooks Available

- `useButtonAnimation()` - Scale 1.0 → 0.95 on press
- `useCardAnimation()` - Scale 1.0 → 0.98 on press
- `useFadeIn(delay)` - Fade in with optional delay
- `useSlideUp(delay, distance)` - Slide up + fade
- `useSlideDown(delay, distance)` - Slide down + fade
- `useScaleAnimation(fromScale, delay, duration)` - Scale animation
- `useProgressAnimation(delay, duration)` - Progress bar width animation
- `useStaggeredAnimation(itemCount, itemDelay, duration)` - Stagger for lists
- `useTabIndicatorAnimation(tabWidth, selectedIndex, tabCount)` - Tab pill animation
- `useIconScaleAnimation(isSelected)` - Icon scale up/down
- `useRotationAnimation()` - 0° ↔ 45° rotation
- `useCheckboxAnimation()` - Checkbox fill animation
- `usePulseAnimation(isActive)` - Continuous pulse
- `useStrikethroughAnimation()` - Width 0 → 100%
- `useColorAnimation(fromColor, toColor, shouldAnimate)` - Color transition
- `useBounceAnimation(triggerBounce)` - Bounce effect
- `useSwipeOutAnimation(shouldSwipe)` - Swipe left + fade
- `useShakeAnimation(shouldShake)` - Shake effect

### Spring Configs
- `springConfig.bouncy` - Fast, bouncy animation
- `springConfig.smooth` - Smooth, controlled
- `springConfig.gentle` - Gentle, with overshoot clamping

### Timing Configs
- `timingConfig.fast` - 250ms
- `timingConfig.normal` - 400ms
- `timingConfig.slow` - 600ms
- `timingConfig.colorTransition` - 500ms linear

---

## Implementation Checklist

### Phase 1: Core Navigation & Screen Transitions
- ✅ Navigation config with screen transitions
- ✅ HomeScreen cart animations
- ✅ SpendingRecapScreen fade + scale

### Phase 2: Key Screens
- ⏳ CartDetailScreen (budget bar, item checks)
- ⏳ InsightsScreen (content transitions)
- ⏳ Recap tab switching & progress bars

### Phase 3: Modal Screens & Special Effects
- ⏳ VoiceInputModal
- ⏳ CameraScannerScreen
- ⏳ TemplatesScreen

### Phase 4: Global Micro-Interactions
- ⏳ Button press animations
- ⏳ Card press animations
- ⏳ Swipe & gesture animations
- ⏳ Theme transition

---

## Best Practices

1. **Respect Reduce Motion**: Check accessibility settings before playing animations
2. **Non-Blocking**: Animations should not block user interaction
3. **Smooth Transitions**: Use appropriate easing functions
4. **Stagger for Lists**: Use 100ms delays between items for visual rhythm
5. **Spring for Interactions**: Use spring for button/touch feedback
6. **Timing for Data**: Use timing for progress bars and quantitative changes
7. **Sequence Complex**: Use `withSequence()` for multi-step animations
8. **Test on Device**: Always test animations on physical Android devices

---

## Performance Considerations

- Use `useAnimatedStyle()` to keep calculations on native thread
- Wrap expensive calculations in `runOnJS()` if needed
- Memoize animated components with `React.memo()`
- Use `keyExtractor` on FlatLists for proper list animations
- Profile with React DevTools and native profilers

---

## Testing Animations

```typescript
// Test animation timing
import { advanceAnimationByTime } from 'react-native-reanimated/lib/types';

// Visual regression testing
// Compare frame captures before/after animation
```

---

## Future Enhancements

- Add gesture-based animations (swipe, pinch)
- Implement shared element transitions
- Add scroll-driven animations
- Parallax effects on details screens
- Layout animations for dynamic content
