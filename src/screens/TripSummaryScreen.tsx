import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useGroceryStore } from '@store/index';
import { COLORS, SPACING } from '@constants/index';
import { formatPesoAmount } from '@utils/index';
import { useTheme } from '../hooks/useTheme';
import type { GroceryItem } from '../types/index';

const DONUT_RADIUS = 115;
const DONUT_THICKNESS = 18;
const ANIMATION_DURATION = 800;
const AMOUNT_ANIMATION_DURATION = 600;

export const TripSummaryScreen = ({ route, navigation }: any) => {
  const { cartId } = route.params;
  const { carts, getStoreName } = useGroceryStore();
  const cart = carts.find((c) => c.id === cartId);
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [categorySort, setCategorySort] = useState<'highest' | 'lowest' | 'a-z'>('highest');
  const [showCategorySortSheet, setShowCategorySortSheet] = useState(false);

  // Animations
  const donutProgress = useSharedValue(0);
  const spentAmount = useSharedValue(0);
  const navigationCardOpacity = useSharedValue(0);

  useEffect(() => {
    if (!cart) return;

    // Animate donut ring
    donutProgress.value = withTiming(1, {
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.ease),
    });

    // Animate spent amount
    spentAmount.value = withTiming(1, {
      duration: AMOUNT_ANIMATION_DURATION,
      easing: Easing.out(Easing.ease),
    });

    // Fade in navigation card after donut animation
    navigationCardOpacity.value = withDelay(
      ANIMATION_DURATION + 100,
      withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      })
    );
  }, [cart]);

  if (!cart) {
    return (
      <View style={styles.container}>
        <Text>Cart not found</Text>
      </View>
    );
  }

  const spent = cart.totalSpent || 0;
  const budget = cart.budget || 0;
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  const isUnderBudget = spent < budget;
  const isNearBudget = spent >= budget * 0.75 && spent < budget;

  // Determine ring color
  const getRingColor = () => {
    if (isUnderBudget) return COLORS.success;
    if (isNearBudget) return COLORS.accent;
    return COLORS.danger;
  };

  const ringColor = getRingColor();

  // Calculate category breakdown
  const categoryData = useMemo(() => {
    const map = new Map<
      string,
      { name: string; color: string; amount: number; itemCount: number; items: GroceryItem[] }
    >();
    cart.items.forEach((item) => {
      const price = (item.actualPrice || item.estimatedPrice) * item.quantity;
      const key = item.category;
      const existing = map.get(key);
      if (existing) {
        existing.amount += price;
        existing.itemCount += 1;
        existing.items.push(item);
      } else {
        map.set(key, {
          name: item.category,
          color: item.categoryColor,
          amount: price,
          itemCount: 1,
          items: [item],
        });
      }
    });

    let sorted = Array.from(map.values());
    if (categorySort === 'highest') {
      sorted.sort((a, b) => b.amount - a.amount);
    } else if (categorySort === 'lowest') {
      sorted.sort((a, b) => a.amount - b.amount);
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [cart, categorySort]);

  const getSortLabel = (sort: 'highest' | 'lowest' | 'a-z') => {
    if (sort === 'highest') return 'Highest Spent';
    if (sort === 'lowest') return 'Lowest Spent';
    return 'Name (A-Z)';
  };

  const categorySortOptions: { key: 'highest' | 'lowest' | 'a-z'; label: string }[] = [
    { key: 'highest', label: 'Highest Spent' },
    { key: 'lowest', label: 'Lowest Spent' },
    { key: 'a-z', label: 'Name (A-Z)' },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const navigationCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: navigationCardOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{cart.name.toUpperCase()}</Text>
          <Text style={styles.subtitle}>
            {formatDate(cart.date)} · {getStoreName(cart.storeId)}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Donut Chart */}
        <View style={styles.chartContainer}>
          <DonutChart
            percentage={Math.min(percentage, 100)}
            spent={spent}
            budget={budget}
            ringColor={ringColor}
            progress={donutProgress}
            amountProgress={spentAmount}
          />
        </View>

        {/* Navigation Card */}
        <Animated.View style={[styles.navigationCard, navigationCardAnimatedStyle]}>
          <TouchableOpacity
            style={styles.navigationCardContent}
            onPress={() => {
              navigation.navigate('SpendingRecap', {
                startDate: new Date(cart.date),
                endDate: new Date(cart.date),
              });
            }}
            activeOpacity={0.7}
          >
            <View style={styles.navigationCardText}>
              <Text style={styles.navigationCardTitle}>See how all your trips compare</Text>
              <Text style={styles.navigationCardSubtitle}>
                View spending recap by category, item, and store
              </Text>
            </View>
            <Text style={styles.navigationCardArrow}>›</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* What You Bought Section */}
        <View style={styles.whatYouBoughtContainer}>
          <View style={styles.whatYouBoughtHeader}>
            <Text style={styles.whatYouBoughtTitle}>What you bought</Text>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowCategorySortSheet(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="filter-outline" size={14} color={theme.textSecondary} />
              <Text style={styles.filterText}>{getSortLabel(categorySort)}</Text>
            </TouchableOpacity>
          </View>

          {/* Category Cards */}
          {categoryData.map((category, index) => (
            <CategoryCard
              key={index}
              index={index}
              category={category}
              theme={theme}
              cartId={cartId}
              navigation={navigation}
            />
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={showCategorySortSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategorySortSheet(false)}
      >
        <View style={styles.sortSheetOverlay}>
          <TouchableOpacity
            style={styles.sortSheetBackdrop}
            activeOpacity={1}
            onPress={() => setShowCategorySortSheet(false)}
          />
          <View style={styles.sortSheetWrapper}>
            <View style={styles.sortSheetOptionsBlock}>
              <Text style={styles.sortSheetTitle}>Sort Categories</Text>
              {categorySortOptions.map((option, index) => {
                const isSelected = categorySort === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.sortSheetOptionRow,
                      index < categorySortOptions.length - 1 && styles.sortSheetOptionBorder,
                    ]}
                    onPress={() => {
                      setCategorySort(option.key);
                      setShowCategorySortSheet(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.sortSheetOptionText,
                        isSelected && styles.sortSheetOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={COLORS.primary}
                        style={styles.sortSheetCheckmark}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.sortSheetCancelBlock}>
              <TouchableOpacity
                style={styles.sortSheetCancelButton}
                onPress={() => setShowCategorySortSheet(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.sortSheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Donut Chart Component
interface DonutChartProps {
  percentage: number;
  spent: number;
  budget: number;
  ringColor: string;
  progress: any;
  amountProgress: any;
}

const DonutChart: React.FC<DonutChartProps> = ({
  percentage,
  spent,
  budget,
  ringColor,
  progress,
  amountProgress,
}) => {
  const svgSize = 320;
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.1], [0, 1], Extrapolate.CLAMP),
  }));

  const amountAnimatedStyle = useAnimatedStyle(() => ({
    opacity: amountProgress.value,
  }));

  const circumference = 2 * Math.PI * DONUT_RADIUS;
  const strokeDashoffset = circumference * (1 - Math.min(percentage / 100, 1));

  return (
    <View style={{ position: 'relative', width: svgSize, height: svgSize }}>
      <Animated.View
        style={[
          animatedStyle,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          <Circle
            cx={centerX}
            cy={centerY}
            r={DONUT_RADIUS}
            stroke="#E5E7EB"
            strokeWidth={DONUT_THICKNESS}
            fill="none"
          />
          <Circle
            cx={centerX}
            cy={centerY}
            r={DONUT_RADIUS}
            stroke={ringColor}
            strokeWidth={DONUT_THICKNESS}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${centerX} ${centerY})`}
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          },
          amountAnimatedStyle,
        ]}
        pointerEvents="none"
      >
        <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.textLight }}>Spent</Text>
        <CountUpText
          value={spent}
          style={{ fontSize: 21, fontWeight: '700', color: COLORS.text }}
        />
        <Text
          style={{
            fontSize: 13,
            fontWeight: '500',
            color: COLORS.textLight,
            marginTop: 8,
          }}
        >
          Budget
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textLight, marginTop: 4 }}>
          ₱{formatPesoAmount(budget)}
        </Text>
      </Animated.View>
    </View>
  );
};

// CountUpText Component
interface CountUpTextProps {
  value: number;
  style?: any;
}

const CountUpText: React.FC<CountUpTextProps> = ({ value, style }) => {
  const displayValue = useSharedValue(0);

  useEffect(() => {
    displayValue.value = withTiming(value, {
      duration: AMOUNT_ANIMATION_DURATION,
      easing: Easing.out(Easing.ease),
    });
  }, [value]);

  return (
    <Animated.Text
      style={[
        style,
        useAnimatedStyle(() => {
          // For display purposes, we'll just show the final value
          // A true counter would need a worklet
          return {
            opacity: interpolate(displayValue.value, [0, value], [0, 1], Extrapolate.CLAMP),
          };
        }),
      ]}
    >
      ₱{formatPesoAmount(value)}
    </Animated.Text>
  );
};

// Category Card Component
interface CategoryData {
  name: string;
  color: string;
  amount: number;
  itemCount: number;
  items: GroceryItem[];
}

interface CategoryCardProps {
  index: number;
  category: CategoryData;
  theme: any;
  cartId: string;
  navigation: any;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ index, category, theme, cartId, navigation }) => {
  const cardStyles = React.useMemo(() => getCategoryCardStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 100;
    translateY.value = withDelay(
      ANIMATION_DURATION + 200 + delay,
      withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      })
    );
    opacity.value = withDelay(
      ANIMATION_DURATION + 200 + delay,
      withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      })
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleItemPress = (item: GroceryItem) => {
    navigation.navigate('ItemDetail', {
      itemId: item.id,
      itemName: item.name,
      cartId,
    });
  };

  return (
    <Animated.View style={[animatedStyle]}>
      <View style={cardStyles.card}>
        <TouchableOpacity
          style={cardStyles.header}
          onPress={() => setExpanded((prev) => !prev)}
          activeOpacity={0.7}
        >
          <View style={cardStyles.titleSection}>
            <Text style={cardStyles.categoryName}>{category.name}</Text>
          </View>
          <View style={cardStyles.rightSection}>
            <Text style={cardStyles.amount}>₱{formatPesoAmount(category.amount)}</Text>
            <Text style={[cardStyles.arrow, expanded && cardStyles.arrowExpanded]}>
              {expanded ? '⌄' : '›'}
            </Text>
          </View>
        </TouchableOpacity>

        {expanded && (
          <View style={cardStyles.itemsList}>
            {category.items.map((item) => {
              const unitPrice = item.actualPrice || item.estimatedPrice;
              const lineTotal = unitPrice * item.quantity;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={cardStyles.itemRow}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={cardStyles.itemInfo}>
                    <Text style={cardStyles.itemName}>{item.name}</Text>
                    <Text style={cardStyles.itemDetails}>
                      {item.quantity} × ₱{formatPesoAmount(unitPrice)}
                    </Text>
                  </View>
                  <Text style={cardStyles.itemAmount}>₱{formatPesoAmount(lineTotal)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={cardStyles.progressBarContainer}>
          <View style={cardStyles.progressBarBackground}>
            <View
              style={[
                cardStyles.progressBarFill,
                {
                  width: '100%',
                  backgroundColor: category.color,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.lg,
      paddingTop: SPACING.lg + 8,
    },
    titleSection: {
      alignItems: 'center',
    },
    title: {
      fontSize: 25,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: SPACING.xs,
    },
    placeholder: {
      width: 24,
    },
    content: {
      flex: 1,
    },
    chartContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.lg,
      overflow: 'visible',
    },
    donutCenterText: {
      alignItems: 'center',
    },
    donutLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    donutAmount: {
      fontSize: 32,
      fontWeight: '700',
      marginTop: SPACING.xs,
    },
    donutBudget: {
      fontSize: 13,
      fontWeight: '500',
    },
    navigationCard: {
      marginHorizontal: SPACING.lg,
      marginVertical: SPACING.lg,
      backgroundColor: theme.card,
      borderRadius: 12,
      overflow: 'hidden',
    },
    navigationCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.lg,
    },
    navigationCardText: {
      flex: 1,
    },
    navigationCardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      marginBottom: SPACING.xs,
    },
    navigationCardSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    navigationCardArrow: {
      fontSize: 24,
      color: theme.primary,
      marginLeft: SPACING.lg,
    },
    whatYouBoughtContainer: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    whatYouBoughtHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    whatYouBoughtTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    filterText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    sortSheetOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.lg,
    },
    sortSheetBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    sortSheetWrapper: {
      gap: SPACING.sm,
    },
    sortSheetOptionsBlock: {
      backgroundColor: '#2C2C2E',
      borderRadius: 14,
      overflow: 'hidden',
    },
    sortSheetTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
      textAlign: 'center',
      paddingVertical: SPACING.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    },
    sortSheetOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      position: 'relative',
    },
    sortSheetOptionBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    },
    sortSheetOptionText: {
      fontSize: 16,
      fontWeight: '400',
      color: '#FFFFFF',
      textAlign: 'center',
    },
    sortSheetOptionTextSelected: {
      color: COLORS.primary,
      fontWeight: '600',
    },
    sortSheetCheckmark: {
      position: 'absolute',
      right: SPACING.lg,
    },
    sortSheetCancelBlock: {
      backgroundColor: '#2C2C2E',
      borderRadius: 14,
      overflow: 'hidden',
    },
    sortSheetCancelButton: {
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    sortSheetCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.primary,
    },
    bottomSpacer: {
      height: SPACING.xl,
    },
  });

const getCategoryCardStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    titleSection: {
      flex: 1,
    },
    categoryName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: SPACING.lg,
    },
    amount: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      marginRight: SPACING.sm,
    },
    arrow: {
      fontSize: 20,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    arrowExpanded: {
      marginTop: -4,
    },
    itemsList: {
      marginTop: SPACING.md,
      paddingTop: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
    },
    itemInfo: {
      flex: 1,
      marginRight: SPACING.md,
    },
    itemName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    itemDetails: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    itemAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    progressBarContainer: {
      marginTop: SPACING.md,
    },
    progressBarBackground: {
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 2,
    },
  });
