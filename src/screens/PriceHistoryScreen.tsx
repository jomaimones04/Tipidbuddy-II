import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useGroceryStore } from '@store/index';
import { SPACING } from '@constants/index';
import { formatPesoAmount } from '@utils/index';
import { useTheme } from '../hooks/useTheme';

const STORE_COLORS: { [key: string]: string } = {
  'store_sm': '#3B82F6', // Blue
  'store_puregold': '#F59E0B', // Amber
  'store_savemore': '#10B981', // Emerald
  'store_robinsons': '#EF4444', // Red
  'store_landmark': '#8B5CF6', // Purple
  'store_waltermart': '#EC4899', // Pink
  'local': '#6B7280', // Gray
};

export const PriceHistoryScreen = ({ route, navigation }: any) => {
  const { itemId, cartId } = route.params;
  const { carts, getStoreName } = useGroceryStore();
  const cart = carts.find((c) => c.id === cartId);
  const item = cart?.items.find((i) => i.id === itemId);
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.itemName}>Item not found</Text>
      </View>
    );
  }

  const getFullPriceHistory = () => {
    const records: { storeId: string; storeName: string; price: number; date: string }[] = [];
    carts.forEach((c) => {
      if (c.isCompleted) {
        c.items.forEach((i) => {
          if (i.name.trim().toLowerCase() === item.name.trim().toLowerCase()) {
            records.push({
              storeId: c.storeId || 'local',
              storeName: getStoreName(c.storeId),
              price: i.actualPrice || i.estimatedPrice,
              date: c.date || new Date().toISOString(),
            });
          }
        });
      }
    });
    // Sort chronologically (oldest first)
    return records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getTrendLabel = (records: any[]) => {
    if (records.length < 2) return 'Stable →';
    const oldest = records[0].price;
    const newest = records[records.length - 1].price;
    if (newest > oldest) return 'Rising ↑';
    if (newest < oldest) return 'Falling ↓';
    return 'Stable →';
  };

  const getStoreColor = (storeId: string, index: number) => {
    if (STORE_COLORS[storeId]) return STORE_COLORS[storeId];
    const fallbackColors = ['#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6'];
    return fallbackColors[index % fallbackColors.length];
  };

  const priceHistory = getFullPriceHistory();
  const trendLabel = getTrendLabel(priceHistory);

  const prices = priceHistory.map((p) => p.price);
  const dates = priceHistory.map((p) => new Date(p.date).getTime());

  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 100;
  const priceRange = maxPrice - minPrice || 10;

  const minDate = dates.length > 0 ? Math.min(...dates) : 0;
  const maxDate = dates.length > 0 ? Math.max(...dates) : 1;
  const dateRange = maxDate - minDate || 1;

  let lowestPoint: any = null;
  let highestPoint: any = null;
  if (priceHistory.length > 0) {
    priceHistory.forEach((p) => {
      if (!lowestPoint || p.price < lowestPoint.price) {
        lowestPoint = p;
      }
      if (!highestPoint || p.price > highestPoint.price) {
        highestPoint = p;
      }
    });
  }

  const chartWidth = Dimensions.get('window').width - SPACING.lg * 2;
  const chartHeight = 220;
  const paddingLeft = 50;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;
  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  const getCoords = (price: number, dateString: string) => {
    const time = new Date(dateString).getTime();
    const xPct = dateRange === 0 ? 0.5 : (time - minDate) / dateRange;
    const x = paddingLeft + xPct * graphWidth;

    const yPct = priceRange === 0 ? 0.5 : (price - minPrice) / priceRange;
    const y = paddingTop + (1 - yPct) * graphHeight;

    return { x, y };
  };

  const uniqueStoreIds = Array.from(new Set(priceHistory.map((p) => p.storeId)));
  const gridLines = [minPrice, (minPrice + maxPrice) / 2, maxPrice];

  const renderPaths = () => {
    return uniqueStoreIds.map((storeId, storeIdx) => {
      const storeRecords = priceHistory.filter((p) => p.storeId === storeId);
      if (storeRecords.length === 0) return null;

      const points = storeRecords.map((r) => getCoords(r.price, r.date));
      let d = '';
      points.forEach((pt, idx) => {
        if (idx === 0) {
          d += `M ${pt.x} ${pt.y}`;
        } else {
          d += ` L ${pt.x} ${pt.y}`;
        }
      });

      const strokeColor = getStoreColor(storeId, storeIdx);

      return (
        <React.Fragment key={storeId}>
          {points.length > 1 && (
            <Path
              d={d}
              fill="none"
              stroke={strokeColor}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {points.map((pt, idx) => {
            const record = storeRecords[idx];
            const isLowest = lowestPoint && record.price === lowestPoint.price && record.date === lowestPoint.date;
            const isHighest = highestPoint && record.price === highestPoint.price && record.date === highestPoint.date;

            let dotColor = strokeColor;
            let radius = 5;
            if (isLowest) {
              dotColor = theme.success;
              radius = 8;
            } else if (isHighest) {
              dotColor = theme.danger;
              radius = 8;
            }

            return (
              <Circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={radius}
                fill={dotColor}
                stroke={theme.card}
                strokeWidth={2}
              />
            );
          })}
        </React.Fragment>
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Price History</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>
            Current: ₱{formatPesoAmount(item.actualPrice || item.estimatedPrice)}
          </Text>
        </View>

        <View style={styles.trendBox}>
          <Text style={styles.trendLabel}>Price Trend</Text>
          <Text style={[
            styles.trendValue,
            trendLabel.includes('Rising') && { color: theme.danger },
            trendLabel.includes('Falling') && { color: theme.success }
          ]}>
            {trendLabel}
          </Text>
        </View>

        {priceHistory.length > 0 ? (
          <View style={styles.chartContainer}>
            <View style={styles.chartWrapper}>
              <Svg width={chartWidth} height={chartHeight}>
                {/* Grid Lines */}
                {gridLines.map((val, idx) => {
                  const yPct = priceRange === 0 ? 0.5 : (val - minPrice) / priceRange;
                  const y = paddingTop + (1 - yPct) * graphHeight;
                  return (
                    <React.Fragment key={idx}>
                      <Line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        stroke={theme.border}
                        strokeWidth={1}
                        strokeDasharray="4 4"
                      />
                      <SvgText
                        x={paddingLeft - 8}
                        y={y + 4}
                        fontSize={10}
                        fill={theme.textSecondary}
                        textAnchor="end"
                      >
                        ₱{formatPesoAmount(val)}
                      </SvgText>
                    </React.Fragment>
                  );
                })}

                {/* Main Paths and Dots */}
                {renderPaths()}

                {/* X Axis Date Labels */}
                <SvgText
                  x={paddingLeft}
                  y={chartHeight - 8}
                  fontSize={10}
                  fill={theme.textSecondary}
                  textAnchor="start"
                >
                  {new Date(minDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </SvgText>
                <SvgText
                  x={chartWidth - paddingRight}
                  y={chartHeight - 8}
                  fontSize={10}
                  fill={theme.textSecondary}
                  textAnchor="end"
                >
                  {new Date(maxDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </SvgText>
              </Svg>
            </View>

            {/* Legend */}
            <View style={styles.legendContainer}>
              <Text style={styles.legendTitle}>Stores:</Text>
              <View style={styles.legendList}>
                {uniqueStoreIds.map((storeId, index) => (
                  <View key={storeId} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: getStoreColor(storeId, index) }]} />
                    <Text style={styles.legendText}>
                      {getStoreName(storeId === 'local' ? undefined : storeId)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={[styles.legendList, { marginTop: SPACING.sm }]}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
                  <Text style={styles.legendText}>Lowest Price Dot</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.danger }]} />
                  <Text style={styles.legendText}>Highest Price Dot</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No price history yet</Text>
            <Text style={styles.emptySubtext}>
              Track prices by shopping at different stores.
            </Text>
          </View>
        )}

        {/* Price Records List */}
        {priceHistory.length > 0 && (
          <View style={styles.priceListSection}>
            <Text style={styles.sectionTitle}>Price Records (Oldest to Newest)</Text>
            {[...priceHistory].reverse().map((record, index) => (
              <View key={index} style={styles.priceRecord}>
                <View>
                  <Text style={styles.storeName}>{record.storeName}</Text>
                  <Text style={styles.recordDate}>
                    {new Date(record.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.recordPrice}>₱{formatPesoAmount(record.price)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      backgroundColor: theme.header,
    },
    backButton: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.headerText,
    },
    title: {
      fontSize: 26,
      fontWeight: '600',
      color: theme.headerText,
    },
    placeholder: {
      width: 60,
    },
    content: {
      flex: 1,
      padding: SPACING.lg,
    },
    itemInfo: {
      marginBottom: SPACING.xl,
    },
    itemName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: SPACING.sm,
    },
    itemPrice: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    trendBox: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.lg,
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: SPACING.xl,
      borderWidth: 1,
      borderColor: theme.border,
    },
    trendLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: SPACING.xs,
    },
    trendValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.accent,
    },
    chartContainer: {
      marginBottom: SPACING.xl,
    },
    chartWrapper: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
    },
    legendContainer: {
      marginTop: SPACING.md,
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    legendTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.text,
      marginBottom: SPACING.xs,
    },
    legendList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.md,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: 11,
      color: theme.text,
    },
    emptyState: {
      paddingVertical: SPACING.xl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: SPACING.sm,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    priceListSection: {
      marginTop: SPACING.xl,
      paddingBottom: SPACING.xl * 2,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: SPACING.md,
    },
    priceRecord: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    storeName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    recordDate: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: SPACING.xs,
    },
    recordPrice: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
    },
  });

