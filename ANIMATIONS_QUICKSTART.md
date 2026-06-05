# Animations Integration Guide - Quick Start

## What's Been Set Up

### ✅ Already Implemented

1. **Navigation Animations**
   - All stack screens: slide from right
   - Modal screens: slide from bottom
   - SpendingRecapScreen: fade + scale

2. **HomeScreen**
   - FAB scales in on mount
   - Cart cards stagger in from bottom (100ms apart)
   - Card press: scale 1.0 → 0.97, spring back
   - Supports dark/light theme

3. **Reusable Components**
   - `AnimatedProgressBar` - Progress bars with animated width
   - `AnimatedCartItem` - Items with checkbox animation + strikethrough
   - Animation utilities in `src/utils/animations.ts`

### 📋 Quick Integration Steps

## 1. Use AnimatedProgressBar in CartDetailScreen

```typescript
import { AnimatedProgressBar } from '@components/AnimatedProgressBar';

// Replace your current progress bar with:
<AnimatedProgressBar
  percentage={budgetPercentage}
  delay={100}
  duration={600}
  color={budgetColor}
  backgroundColor={theme.border}
  height={8}
/>
```

## 2. Use AnimatedCartItem in CartDetailScreen

```typescript
import { AnimatedCartItem } from '@components/AnimatedCartItem';

// In your FlatList renderItem:
const renderItem = ({ item, index }: any) => (
  <AnimatedCartItem
    item={{ ...item, index }}
    onToggleCheck={(itemId, isChecked) => {
      // your existing toggle logic
    }}
    theme={theme}
    estimatedPrice={item.estimatedPrice}
  />
);
```

## 3. Add Button Press Animations

```typescript
import { useButtonAnimation } from '@utils/animations';
import Animated from 'react-native-reanimated';

export const MyButton = () => {
  const { animatedStyle, onPressIn, onPressOut } = useButtonAnimation();

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity onPressIn={onPressIn} onPressOut={onPressOut}>
        <Text>Press Me</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};
```

## 4. Add Card Press Animations

```typescript
import { useCardAnimation } from '@utils/animations';
import Animated from 'react-native-reanimated';

export const MyCard = () => {
  const { animatedStyle, onPressIn, onPressOut } = useCardAnimation();

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity onPressIn={onPressIn} onPressOut={onPressOut}>
        {/* Card content */}
      </TouchableOpacity>
    </Animated.View>
  );
};
```

## 5. Add Stagger Animations to Lists

```typescript
import { useStaggeredAnimation } from '@utils/animations';
import Animated from 'react-native-reanimated';

export const MyList = ({ items }) => {
  const animations = useStaggeredAnimation(items.length, 100, 400);

  useEffect(() => {
    animations.forEach(anim => anim.start());
  }, []);

  return (
    <ScrollView>
      {items.map((item, index) => (
        <Animated.View key={item.id} style={animations[index].animatedStyle}>
          {/* Your item content */}
        </Animated.View>
      ))}
    </ScrollView>
  );
};
```

## 6. Add Content Fade Transition (for switching tabs/filters)

```typescript
import { useFadeIn } from '@utils/animations';
import Animated from 'react-native-reanimated';

const [showContent, setShowContent] = useState(true);
const fadeAnim = useFadeIn(0);

const handleTabChange = () => {
  setShowContent(false);
  // Refetch/update data
  setTimeout(() => {
    setShowContent(true);
    fadeAnim.start();
  }, 100);
};

return (
  <Animated.View style={fadeAnim.animatedStyle}>
    {showContent && <YourContent />}
  </Animated.View>
);
```

## 7. Add Scale Animation on Mount

```typescript
import { useScaleAnimation } from '@utils/animations';
import Animated from 'react-native-reanimated';

export const MyComponent = () => {
  const scaleAnim = useScaleAnimation(0.9, 0, 400);

  useEffect(() => {
    scaleAnim.start();
  }, []);

  return (
    <Animated.View style={scaleAnim.animatedStyle}>
      {/* Your content */}
    </Animated.View>
  );
};
```

## Next Steps for Full Implementation

### Priority Order:

1. **CartDetailScreen** (HIGH)
   - Use `AnimatedProgressBar` for budget bar
   - Use `AnimatedCartItem` for items
   - Add FAB expansion animation with stagger

2. **InsightsScreen** (MEDIUM)
   - Add content fade on date range change
   - Stagger in recent carts
   - Animate summary card

3. **SpendingRecapScreen Cards** (MEDIUM)
   - Already has screen fade-in
   - Add staggered card animations
   - Use `AnimatedProgressBar` for category/store rows

4. **VoiceInputModal** (LOW)
   - Pulse animation on mic button
   - Animated sound waves during recording

5. **TemplatesScreen** (LOW)
   - Stagger template cards
   - Button press animations

## Tips for Best Results

- Test on physical Android device
- Use DevTools Profiler to check performance
- Keep animations under 500ms for snappy feel
- Use spring for interactive feedback
- Use timing for data-driven changes
- Stagger lists with 75-100ms between items

## Troubleshooting

**Animation not playing?**
- Check if component is wrapped with `Animated.View`
- Verify `useEffect` is calling `start()` function
- Check console for warnings

**Animation stutters?**
- Profile with Android Studio Profiler
- Check for expensive re-renders
- Use `React.memo()` for animated components
- Verify worklet functions are in native thread

**Animation doesn't feel natural?**
- Adjust spring damping (lower = bouncier)
- Check easing function
- Add/remove `withDelay`
- Test spring config values

## Resources

- `ANIMATIONS.md` - Complete animation reference
- `src/utils/animations.ts` - All animation hooks
- React Native Reanimated docs: https://docs.swmansion.com/react-native-reanimated/
