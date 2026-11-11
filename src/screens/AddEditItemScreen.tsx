import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  PanResponder,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useGroceryStore } from '@store/index';
import { useIsFocused } from '@react-navigation/native';
import { SPACING } from '@constants/index';
import {
  generateId,
  formatPesoAmount,
  getStoreBreakdown,
  getMostRecentPurchase,
  detectCategory,
  splitQuantityString,
} from '@utils/index';
import { saveManualProduct, saveStorePrice } from '../api/products';
import type { Category } from '../types';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';

interface HistoricalPurchase {
  storeId: string;
  storeName: string;
  price: number;
  date: string;
}

export const AddEditItemScreen = ({ route, navigation }: any) => {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const {
    cartId,
    itemId,
    scannedData,
    voiceData,
    detectedName,
    detectedPrice,
    detectedQuantity,
    detectedUnit,
    detectedBarcode,
    detectedBarcodeType,
    detectedBrand,
    detectedCategory,
    detectedDescription,
    detectedImageUrl,
  } = route.params || {};
  const { carts, categories, updateCart, getStoreName, getRecordsForItemName } =
    useGroceryStore();
  const cart = carts.find((c) => c.id === cartId);
  const existingItem = cart?.items.find((i) => i.id === itemId);

  // Prefill scanned, voice, or camera detected data if adding a new item
  const prefill = !existingItem ? (scannedData || voiceData) : null;

  const initialName = existingItem?.name || detectedName || prefill?.name || '';
  const initialPrice = existingItem?.estimatedPrice?.toString() || detectedPrice || prefill?.price?.toString() || '';

  // Handle quantity and unit prefilling (possibly splitting unit-containing quantities)
  const initialQuantityUnit = (() => {
    if (existingItem) {
      return { amount: existingItem.quantity.toString(), unit: existingItem.unit || '' };
    }

    const rawQty =
      detectedQuantity !== undefined && detectedQuantity !== null && detectedQuantity !== ''
        ? String(detectedQuantity)
        : prefill?.quantity?.toString() || '';
    const split = rawQty ? splitQuantityString(rawQty) : { amount: '', unit: '' };
    return {
      amount: split.amount || (rawQty && !split.unit ? rawQty : '1'),
      unit: detectedUnit || prefill?.unit || split.unit || '',
    };
  })();

  const [name, setName] = useState(initialName);
  const [brand] = useState(detectedBrand || '');
  const [quantity, setQuantity] = useState(initialQuantityUnit.amount);
  const [unit, setUnit] = useState(initialQuantityUnit.unit);
  const [customUnit, setCustomUnit] = useState(
    initialQuantityUnit.unit !== '' && !['pcs', 'kg', 'g', 'L', 'mL', 'pack', 'bottle', 'loaf', 'dozen', 'box', 'sachet', 'tray'].includes(initialQuantityUnit.unit)
      ? initialQuantityUnit.unit
      : ''
  );
  const [estimatedPrice, setEstimatedPrice] = useState(initialPrice);
  const imageUrl = detectedImageUrl || existingItem?.imageUrl || '';
  const [showUnitSheet, setShowUnitSheet] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(windowHeight);
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);
  const [formContentHeight, setFormContentHeight] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const fullViewportHeight = useRef(0);
  const keyboardVisibleRef = useRef(keyboardVisible);
  const windowHeightRef = useRef(windowHeight);
  const dragStartY = useRef(0);
  const sheetTranslateY = useRef(new Animated.Value(windowHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  keyboardVisibleRef.current = keyboardVisible;
  windowHeightRef.current = windowHeight;
  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        sheetTranslateY.stopAnimation((value) => {
          dragStartY.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        sheetTranslateY.setValue(Math.max(0, dragStartY.current + gesture.dy));
      },
      onPanResponderRelease: (_, gesture) => {
        if (keyboardVisibleRef.current) {
          Keyboard.dismiss();
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            speed: 20,
            bounciness: 3,
          }).start();
          return;
        }

        if (gesture.dy > 120 || gesture.vy > 0.8) {
          Keyboard.dismiss();
          Animated.timing(sheetTranslateY, {
            toValue: windowHeightRef.current,
            duration: 180,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) navigation.goBack();
          });
          return;
        }

        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 3,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardVisible(true);
      const screenTop = event.endCoordinates.screenY;
      const fullHeight = fullViewportHeight.current || windowHeight;
      setKeyboardBottomInset(
        Number.isFinite(screenTop) && screenTop > 0
          ? Math.max(0, fullHeight - screenTop)
          : event.endCoordinates.height
      );
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardBottomInset(0);
    });

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 16,
        bounciness: 2,
      }),
    ]).start();

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [backdropOpacity, sheetTranslateY]);

  const availableViewportHeight = (() => {
    if (!keyboardVisible) return viewportHeight;

    const fullHeight = fullViewportHeight.current || viewportHeight;
    const modalResizedForKeyboard = viewportHeight < fullHeight - 80;
    return modalResizedForKeyboard
      ? viewportHeight
      : Math.min(viewportHeight, Math.max(0, fullHeight - keyboardBottomInset));
  })();
  const sheetBottomInset =
    keyboardVisible && viewportHeight >= (fullViewportHeight.current || viewportHeight) - 80
      ? keyboardBottomInset
      : 0;

  const handleSelectChip = (u: string) => {
    setUnit(u);
    setCustomUnit('');
  };

  const handleCustomUnitChange = (text: string) => {
    setCustomUnit(text);
    setUnit(text);
  };

  const matchAppCategory = (rawCategory?: string, itemName?: string): string => {
    const pickFromList = (value?: string) => {
      if (!value) return '';
      const lower = value.trim().replace(/\s+/g, ' ').toLowerCase();
      const match = categories.find((c: Category) => {
        const categoryName = c.name.trim().replace(/\s+/g, ' ').toLowerCase();
        const shortName = categoryName.split('(')[0].trim();
        return (
          categoryName === lower ||
          categoryName.includes(lower) ||
          lower.includes(shortName)
        );
      });
      return match?.name || '';
    };

    return (
      pickFromList(rawCategory) ||
      pickFromList(rawCategory ? detectCategory(rawCategory) : '') ||
      pickFromList(itemName ? detectCategory(itemName) : '') ||
      categories[0]?.name ||
      ''
    );
  };

  // Auto-detect category for prefilled name if present, otherwise fallback
  const initialCategory = (() => {
    if (existingItem) return existingItem.category;
    return matchAppCategory(detectedCategory, initialName);
  })();

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [priceManuallyChanged, setPriceManuallyChanged] = useState(
    existingItem || initialPrice !== '' ? true : false
  );

  const getHistoryForName = (itemName: string): HistoricalPurchase[] => {
    if (!itemName.trim()) return [];

    const fromGlobal = getRecordsForItemName(itemName);
    if (fromGlobal.length > 0) return fromGlobal;

    const matches: HistoricalPurchase[] = [];
    carts.forEach((c) => {
      if (c.isCompleted) {
        c.items.forEach((item) => {
          if (item.name.trim().toLowerCase() === itemName.trim().toLowerCase()) {
            matches.push({
              storeId: c.storeId || 'local',
              storeName: getStoreName(c.storeId),
              price: item.actualPrice || item.estimatedPrice,
              date: c.completedAt || c.date || new Date().toISOString(),
            });
          }
        });
      }
    });
    return matches;
  };

  const getTimeAgo = (dateString: string) => {
    const diffTime = Math.abs(new Date().getTime() - new Date(dateString).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return '1 week ago';
    return `${diffWeeks} weeks ago`;
  };

  const nameHistory = getHistoryForName(name);
  const uniqueStorePurchases = getStoreBreakdown(nameHistory);
  const lastBought = getMostRecentPurchase(nameHistory);

  const getSmartRecommendation = () => {
    if (!cart?.storeId || !name.trim() || uniqueStorePurchases.length === 0) {
      return null;
    }

    const currentStoreName = getStoreName(cart.storeId).toLowerCase().trim();
    const cheapestOtherStore = uniqueStorePurchases.find(
      (p) => p.storeName.toLowerCase().trim() !== currentStoreName
    );
    const currentStoreLatest = uniqueStorePurchases.find(
      (p) => p.storeName.toLowerCase().trim() === currentStoreName
    );

    if (cheapestOtherStore) {
      const comparisonPrice =
        parseFloat(estimatedPrice) ||
        (currentStoreLatest ? currentStoreLatest.price : null);
      if (comparisonPrice && cheapestOtherStore.price < comparisonPrice) {
        const diff = comparisonPrice - cheapestOtherStore.price;
        if (diff > 0.01) {
          return {
            diff,
            storeName: cheapestOtherStore.storeName,
          };
        }
      }
    }
    return null;
  };

  const recommendation = getSmartRecommendation();
  const sameStoreHistory = nameHistory
    .filter((purchase) => purchase.storeId === (cart?.storeId || 'local'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sameStoreLatest = sameStoreHistory[0];
  const totalPrice = (parseFloat(quantity) || 0) * (parseFloat(estimatedPrice) || 0);

  const handleNameChange = (text: string) => {
    setName(text);
    if (!priceManuallyChanged && text.trim().length > 0) {
      const hist = getHistoryForName(text);
      if (hist.length > 0) {
        const cheapest = getStoreBreakdown(hist)[0];
        if (cheapest) {
          setEstimatedPrice(cheapest.price.toString());
        }
      }
    }

    setSelectedCategory(matchAppCategory(detectCategory(text)));
  };

  const selectedCategoryObj = categories.find((c) => c.name === selectedCategory);

  const handleSave = async () => {
    if (savingRef.current) return;
    if (!name.trim() || !quantity || !estimatedPrice) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    const numQuantity = parseFloat(quantity);
    const numPrice = parseFloat(estimatedPrice);

    if (isNaN(numQuantity) || numQuantity <= 0) {
      Alert.alert('Validation Error', 'Quantity must be a valid positive number');
      return;
    }

    if (isNaN(numPrice) || numPrice < 0) {
      Alert.alert('Validation Error', 'Price must be a valid non-negative number');
      return;
    }

    if (!cart) return;

    savingRef.current = true;
    setIsSaving(true);
    Keyboard.dismiss();
    let updatedItems = [...cart.items];

    if (existingItem) {
      // Update existing item
      updatedItems = updatedItems.map((item) =>
        item.id === itemId
          ? {
            ...item,
            name,
            quantity: numQuantity,
            unit,
            estimatedPrice: numPrice,
            category: selectedCategory,
            categoryColor: selectedCategoryObj?.color || item.categoryColor,
            imageUrl: imageUrl || item.imageUrl,
            lastUpdated: new Date().toISOString(),
            barcode: detectedBarcode || item.barcode,
            barcodeType: detectedBarcodeType || item.barcodeType,
          }
          : item
      );
    } else {
      // Add new item
      const newItem = {
        id: generateId(),
        name,
        quantity: numQuantity,
        unit,
        estimatedPrice: numPrice,
        actualPrice: undefined,
        isChecked: false,
        category: selectedCategory,
        categoryColor: selectedCategoryObj?.color || '#84CC16',
        imageUrl: imageUrl || undefined,
        barcode: detectedBarcode || undefined,
        barcodeType: detectedBarcodeType || undefined,
        priceHistory: [],
        lastUpdated: new Date().toISOString(),
      };
      updatedItems.push(newItem);
    }

    // Recalculate total spent
    const totalSpent = updatedItems.reduce(
      (sum, item) =>
        sum +
        (item.isChecked
          ? (item.actualPrice ?? item.estimatedPrice) * item.quantity
          : 0),
      0
    );

    const updatedCart = { ...cart, items: updatedItems, totalSpent };
    try {
      await updateCart(updatedCart);

      if (detectedBarcode && name.trim()) {
        void saveManualProduct({
          barcode: detectedBarcode,
          barcodeType: detectedBarcodeType,
          name: name.trim(),
          brand: brand.trim(),
          category: selectedCategory,
          description: detectedDescription || '',
          imageUrl: imageUrl || detectedImageUrl || '',
          source: 'manual',
        });

        const storeName = getStoreName(cart.storeId);
        if (storeName) {
          void saveStorePrice(detectedBarcode, storeName, numPrice);
        }
      }

      navigation.goBack();
    } catch (error) {
      console.error('[AddEditItem] Failed to save item:', error);
      Alert.alert('Could not save item', 'Please try again.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const UNITS = ['pcs', 'kg', 'g', 'L', 'mL', 'pack', 'bottle', 'loaf', 'dozen', 'box', 'sachet', 'tray'];

  return (
    <Modal
      visible={isFocused}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (keyboardVisible) {
          Keyboard.dismiss();
          return;
        }
        navigation.goBack();
      }}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        onLayout={(event) => {
          const nextHeight = event.nativeEvent.layout.height;
          if (nextHeight > 0) {
            setViewportHeight(nextHeight);
            if (!keyboardVisible && nextHeight > fullViewportHeight.current) {
              fullViewportHeight.current = nextHeight;
            }
          }
        }}
      >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => Keyboard.dismiss()}
          accessibilityLabel="Dismiss keyboard"
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            bottom: sheetBottomInset,
            maxHeight: keyboardVisible
              ? Math.max(0, availableViewportHeight - 8)
              : Math.min(windowHeight * 0.72, availableViewportHeight - 8),
            height: keyboardVisible
              ? formContentHeight > 0
                ? Math.min(
                    availableViewportHeight - 8,
                    formContentHeight + 18 + 42 + 44 + SPACING.md
                  )
                : Math.max(0, availableViewportHeight - 8)
              : Math.min(windowHeight * 0.72, availableViewportHeight - 8),
            paddingBottom: keyboardVisible
              ? SPACING.md
              : Math.max(insets.bottom, SPACING.md),
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        <View
          style={[styles.dragArea, keyboardVisible && styles.dragAreaCompact]}
          {...sheetPanResponder.panHandlers}
        >
          <View style={styles.dragHandle} />
        </View>

        <View style={[styles.sheetHeader, keyboardVisible && styles.sheetHeaderCompact]}>
          <Text style={styles.sheetTitle}>{existingItem ? 'Edit Item' : 'Add Item'}</Text>
          <TouchableOpacity
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel={existingItem ? 'Save item' : 'Done, add item'}
            disabled={isSaving}
          >
            <Text style={[styles.doneAction, isSaving && styles.disabledAction]}>
              {isSaving ? 'Saving…' : existingItem ? 'Save' : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={[styles.sheetScroll, keyboardVisible && styles.sheetScrollCompact]}
          contentContainerStyle={[
            styles.sheetContent,
            keyboardVisible && styles.sheetContentCompact,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onContentSizeChange={(_, contentHeight) => {
            setFormContentHeight((currentHeight) =>
              currentHeight === contentHeight ? currentHeight : contentHeight
            );
          }}
        >
          {!keyboardVisible && recommendation && (
            <View style={styles.recommendationBanner}>
              <Text style={styles.recommendationBannerText}>
                You bought this ₱{formatPesoAmount(recommendation.diff)} cheaper at {recommendation.storeName} last time
              </Text>
            </View>
          )}

          <View style={[styles.field, keyboardVisible && styles.fieldCompact]}>
            <View
              style={[
                styles.fieldTitleRow,
                keyboardVisible && styles.fieldTitleRowCompact,
              ]}
            >
              <Text style={styles.label}>Item Name</Text>
              <TouchableOpacity
                style={[
                  styles.cameraAction,
                  keyboardVisible && styles.cameraActionCompact,
                ]}
                onPress={() => navigation.navigate('CameraScanner', { cartId })}
                accessibilityRole="button"
                accessibilityLabel="Scan product or add product image"
              >
                <MaterialIcons name="camera-alt" size={21} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.compactCard,
                keyboardVisible && styles.compactCardCompact,
              ]}
            >
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.productImage} />
              ) : null}
              <TextInput
                style={[
                  styles.compactTextInput,
                  keyboardVisible && styles.compactTextInputCompact,
                ]}
                placeholder="Item name"
                value={name}
                onChangeText={handleNameChange}
                placeholderTextColor={theme.textMuted}
                returnKeyType="done"
              />
            </View>
          </View>

          <View
            style={[
              styles.compactCard,
              keyboardVisible && styles.compactCardCompact,
            ]}
          >
            <TouchableOpacity
              style={[styles.selectorRow, keyboardVisible && styles.selectorRowCompact]}
              onPress={() => {
                Keyboard.dismiss();
                setShowUnitSheet(false);
                setShowCategorySheet(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Category: ${selectedCategory}`}
            >
              <Text style={styles.rowLabel}>Category</Text>
              <View style={styles.categoryValue}>
                <Text style={styles.categoryValueText} numberOfLines={1}>
                  {selectedCategory}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={theme.textMuted} />
            </TouchableOpacity>
            <View style={styles.cardDivider} />
            <View style={[styles.selectorRow, keyboardVisible && styles.selectorRowCompact]}>
              <Text style={styles.rowLabel}>Price</Text>
              <Text style={styles.currencySign}>₱</Text>
              <TextInput
                style={[
                  styles.priceField,
                  keyboardVisible && styles.priceFieldCompact,
                ]}
                placeholder="0.00"
                value={estimatedPrice}
                onChangeText={(text) => {
                  setEstimatedPrice(text);
                  setPriceManuallyChanged(true);
                }}
                keyboardType="decimal-pad"
                placeholderTextColor={theme.textMuted}
              />
            </View>
          </View>

          <View
            style={[
              styles.compactCard,
              keyboardVisible && styles.compactCardCompact,
            ]}
          >
            <View style={[styles.selectorRow, keyboardVisible && styles.selectorRowCompact]}>
              <Text style={styles.rowLabel}>Quantity</Text>
              <TextInput
                style={[
                  styles.quantityField,
                  keyboardVisible && styles.quantityFieldCompact,
                ]}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor={theme.textMuted}
                accessibilityLabel="Quantity"
              />
              <TouchableOpacity
                style={[
                  styles.quantityControl,
                  keyboardVisible && styles.quantityControlCompact,
                ]}
                onPress={() => setQuantity(String(Math.max(1, (parseFloat(quantity) || 1) - 1)))}
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
              >
                <MaterialIcons name="remove" size={20} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quantityControl,
                  keyboardVisible && styles.quantityControlCompact,
                ]}
                onPress={() => setQuantity(String((parseFloat(quantity) || 0) + 1))}
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
              >
                <MaterialIcons name="add" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.cardDivider} />
            <TouchableOpacity
              style={[styles.selectorRow, keyboardVisible && styles.selectorRowCompact]}
              onPress={() => {
                Keyboard.dismiss();
                setShowCategorySheet(false);
                setShowUnitSheet(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Unit: ${unit || 'Select unit'}`}
            >
              <Text style={styles.rowLabel}>Unit</Text>
              <Text style={styles.selectorValue}>{unit || 'Select unit'}</Text>
              <MaterialIcons name="chevron-right" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {!keyboardVisible && detectedBarcode ? (
            <View style={styles.barcodeInfo}>
              <Text style={styles.barcodeInfoLabel}>Scanned barcode</Text>
              <Text style={styles.barcodeInfoValue}>{detectedBarcode}</Text>
            </View>
          ) : null}

          {!keyboardVisible && sameStoreLatest && (
            <TouchableOpacity
              style={styles.lastPriceBadge}
              onPress={() => {
                setEstimatedPrice(String(sameStoreLatest.price));
                setPriceManuallyChanged(true);
              }}
            >
              <Text style={styles.lastPriceLabel}>Last price at this store</Text>
              <Text style={styles.lastPriceAmount}>₱{formatPesoAmount(sameStoreLatest.price)}</Text>
            </TouchableOpacity>
          )}

          {!keyboardVisible && name.trim().length > 0 && lastBought && (
            <View style={styles.suggestionCard}>
              <Text style={styles.suggestionTitle}>Price suggestions</Text>
              <Text style={styles.suggestionSub}>
                Last bought at {lastBought.storeName} for ₱{formatPesoAmount(lastBought.price)} ({getTimeAgo(lastBought.date)})
              </Text>
              {uniqueStorePurchases.length > 1 && uniqueStorePurchases.map((store) => (
                <TouchableOpacity
                  key={store.storeName.toLowerCase().trim()}
                  style={styles.rankingRow}
                  onPress={() => {
                    setEstimatedPrice(String(store.price));
                    setPriceManuallyChanged(true);
                  }}
                >
                  <Text style={styles.rankingText}>
                    {store.storeName} — ₱{formatPesoAmount(store.price)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.totalFooter, keyboardVisible && styles.totalFooterCompact]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>₱{formatPesoAmount(totalPrice)}</Text>
        </View>
      </Animated.View>

      <Modal
        visible={showCategorySheet}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowCategorySheet(false)}
      >
        <View style={styles.categoryModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowCategorySheet(false)}
            accessibilityLabel="Close category selection"
          />
          <View
            style={[
              styles.categorySheet,
              {
                maxHeight: windowHeight * 0.78,
                paddingBottom: Math.max(insets.bottom, SPACING.md),
              },
            ]}
          >
            <View style={styles.categoryHeader}>
              <TouchableOpacity
                style={styles.categoryBackButton}
                onPress={() => setShowCategorySheet(false)}
                accessibilityRole="button"
                accessibilityLabel="Back to Add Item"
              >
                <MaterialIcons name="arrow-back-ios" size={20} color={theme.primary} />
              </TouchableOpacity>
              <Text style={styles.categorySheetTitle}>Select Category</Text>
            </View>

            <ScrollView
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.categoryOptionsCard}>
                {categories.map((cat, index) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryModalOption,
                      index < categories.length - 1 && styles.categoryModalOptionDivider,
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat.name);
                      setShowCategorySheet(false);
                    }}
                  >
                    <View style={[styles.categoryModalSwatch, { backgroundColor: cat.color }]} />
                    <Text style={styles.categoryModalOptionText}>{cat.name}</Text>
                    {selectedCategory === cat.name && (
                      <MaterialIcons name="check" size={21} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.addCategoryButton}
                onPress={() => {
                  setShowCategorySheet(false);
                  navigation.getParent()?.navigate('SettingsTab', {
                    screen: 'CategoryManager',
                  });
                }}
                accessibilityRole="button"
              >
                <View style={styles.addCategoryIcon}>
                  <MaterialIcons name="add" size={21} color={theme.primary} />
                </View>
                <Text style={styles.addCategoryText}>Add New Category</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showUnitSheet}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowUnitSheet(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.unitModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowUnitSheet(false);
            }}
            accessibilityLabel="Close unit selection"
          />
          <View
            style={[
              styles.unitSheet,
              {
                maxHeight: Math.min(windowHeight * 0.78, availableViewportHeight - 8),
                paddingBottom: Math.max(insets.bottom, SPACING.md),
              },
            ]}
          >
            <View style={styles.categoryHeader}>
              <TouchableOpacity
                style={styles.categoryBackButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowUnitSheet(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Back to Add Item"
              >
                <MaterialIcons name="arrow-back-ios" size={20} color={theme.primary} />
              </TouchableOpacity>
              <Text style={styles.categorySheetTitle}>Unit</Text>
            </View>

            <ScrollView
              style={styles.unitSheetScroll}
              contentContainerStyle={styles.unitSheetContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            >
              <View style={styles.unitCustomCard}>
                <TextInput
                  style={styles.unitCustomInput}
                  placeholder="Custom unit"
                  value={customUnit}
                  onChangeText={handleCustomUnitChange}
                  placeholderTextColor={theme.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (customUnit.trim()) {
                      setUnit(customUnit.trim());
                      setCustomUnit(customUnit.trim());
                      Keyboard.dismiss();
                      setShowUnitSheet(false);
                    }
                  }}
                  accessibilityLabel="Custom unit"
                />
                {customUnit.trim().length > 0 && (
                  <TouchableOpacity
                    style={styles.useCustomUnitButton}
                    onPress={() => {
                      const nextUnit = customUnit.trim();
                      setUnit(nextUnit);
                      setCustomUnit(nextUnit);
                      Keyboard.dismiss();
                      setShowUnitSheet(false);
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.useCustomUnitText}>Use</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.unitOptionsCard}>
                {UNITS.map((option, index) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.unitModalOption,
                      index < UNITS.length - 1 && styles.unitModalOptionDivider,
                    ]}
                    onPress={() => {
                      handleSelectChip(option);
                      Keyboard.dismiss();
                      setShowUnitSheet(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: unit === option && !customUnit }}
                  >
                    <Text style={styles.unitModalOptionText}>{option}</Text>
                    {unit === option && !customUnit && (
                      <MaterialIcons name="check" size={21} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
    flexDirection: 'column',
    backgroundColor: theme.isDark ? theme.background : '#F4F5F7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 18,
  },
  dragArea: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragAreaCompact: {
    height: 18,
  },
  dragHandle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.isDark ? theme.border : '#C8CBD0',
  },
  sheetHeader: {
    minHeight: 52,
    paddingHorizontal: 22,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetHeaderCompact: {
    minHeight: 42,
    paddingBottom: 4,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
  },
  doneAction: {
    color: theme.isDark ? theme.primary : '#3AA76D',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  disabledAction: {
    opacity: 0.55,
  },
  sheetScroll: {
    flex: 1,
    minHeight: 0,
  },
  sheetScrollCompact: {
    flexShrink: 1,
  },
  sheetContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 14,
  },
  sheetContentCompact: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 6,
    gap: 6,
  },
  compactCard: {
    borderRadius: 14,
    backgroundColor: theme.isDark ? theme.card : '#FFFFFF',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.isDark ? theme.border : '#E8E9EB',
  },
  compactCardCompact: {
    paddingHorizontal: 10,
  },
  compactTextInput: {
    flex: 1,
    minHeight: 54,
    color: theme.text,
    fontSize: 16,
    paddingVertical: 10,
  },
  compactTextInputCompact: {
    minHeight: 38,
    paddingVertical: 4,
  },
  fieldTitleRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldTitleRowCompact: {
    minHeight: 26,
  },
  cameraAction: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraActionCompact: {
    width: 32,
    height: 30,
  },
  productImage: {
    width: 38,
    height: 38,
    borderRadius: 8,
    marginRight: 10,
  },
  selectorRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorRowCompact: {
    minHeight: 38,
    gap: 6,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: theme.text,
  },
  categoryValue: {
    maxWidth: '60%',
    backgroundColor: theme.isDark ? theme.surface : '#EAF3FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryValueText: {
    color: theme.isDark ? theme.text : '#335F8C',
    fontSize: 13,
    fontWeight: '600',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.isDark ? theme.border : '#E6E7E9',
  },
  currencySign: {
    color: theme.textSecondary,
    fontSize: 15,
  },
  priceField: {
    minWidth: 84,
    paddingVertical: 10,
    textAlign: 'right',
    color: theme.text,
    fontSize: 16,
  },
  quantityField: {
    minWidth: 62,
    paddingVertical: 10,
    textAlign: 'right',
    color: theme.text,
    fontSize: 16,
  },
  quantityControl: {
    width: 38,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.isDark ? theme.border : '#E6E7E9',
  },
  quantityControlCompact: {
    width: 32,
    height: 32,
  },
  priceFieldCompact: {
    paddingVertical: 4,
    fontSize: 14,
  },
  quantityFieldCompact: {
    minWidth: 48,
    paddingVertical: 4,
    fontSize: 14,
  },
  selectorValue: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  totalFooter: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.isDark ? theme.border : '#DCDDDF',
  },
  totalFooterCompact: {
    minHeight: 44,
    marginHorizontal: 14,
  },
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
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: theme.text,
  },
  addAction: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: '600',
    padding: SPACING.sm,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  form: {
    gap: SPACING.md,
  },
  lastPriceBadge: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastPriceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  historyDetails: {
    flex: 1,
  },
  historyDate: {
    marginTop: 4,
    fontSize: 11,
    color: theme.textMuted,
  },
  lastPriceValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  lastPriceAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  trendIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  barcodeInfo: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: 4,
  },
  barcodeInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  barcodeInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  barcodeInfoType: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  field: {
    gap: SPACING.sm,
  },
  fieldCompact: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfField: {
    flex: 1,
    gap: SPACING.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 14,
    color: theme.text,
    backgroundColor: theme.inputBackground,
  },
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
    backgroundColor: theme.surface,
  },
  nameInput: {
    flex: 1,
    minHeight: 54,
    color: theme.text,
    fontSize: 15,
  },
  cameraButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.border,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityRow: {
    flexDirection: 'row',
    minHeight: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: theme.surface,
    paddingHorizontal: SPACING.sm,
  },
  quantityInput: {
    flex: 1,
    color: theme.text,
    paddingHorizontal: SPACING.sm,
    fontSize: 15,
  },
  quantityButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: theme.border,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: theme.surface,
    paddingHorizontal: SPACING.md,
  },
  pricePrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.primary,
    marginRight: SPACING.sm,
  },
  priceInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: 14,
    color: theme.text,
  },
  chipsScrollView: {
    marginVertical: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  chipUnselected: {
    backgroundColor: 'transparent',
    borderColor: theme.border,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: theme.isDark ? theme.background : '#FFFFFF',
  },
  chipTextUnselected: {
    color: theme.textSecondary,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.textSecondary,
    marginTop: 4,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: theme.surface,
    gap: SPACING.sm,
  },
  categoryColor: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  categoryText: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  categoryList: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.surface,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: SPACING.sm,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  categoryOptionText: {
    fontSize: 14,
    color: theme.text,
  },
  categoryModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  categorySheet: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: theme.background,
    borderRadius: 26,
    paddingTop: 16,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  categoryHeader: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBackButton: {
    width: 38,
    height: 42,
    justifyContent: 'center',
  },
  categorySheetTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: theme.text,
  },
  categoryScroll: {
    flexShrink: 1,
  },
  categoryScrollContent: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  categoryOptionsCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  categoryModalOption: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryModalOptionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  categoryModalSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  categoryModalOptionText: {
    flex: 1,
    color: theme.text,
    fontSize: 15,
  },
  addCategoryButton: {
    minHeight: 58,
    marginTop: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: 16,
  },
  addCategoryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.background,
  },
  addCategoryText: {
    color: theme.primary,
    fontSize: 15,
  },
  unitModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  unitSheet: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: theme.background,
    borderRadius: 26,
    paddingTop: 16,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  unitSheetScroll: {
    flexShrink: 1,
  },
  unitSheetContent: {
    gap: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  unitCustomCard: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: theme.surface,
  },
  unitCustomInput: {
    flex: 1,
    minHeight: 54,
    color: theme.text,
    fontSize: 15,
  },
  useCustomUnitButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  useCustomUnitText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  unitOptionsCard: {
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: theme.surface,
    overflow: 'hidden',
  },
  unitModalOption: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitModalOptionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  unitModalOptionText: {
    color: theme.text,
    fontSize: 15,
  },
  categoryOptionTextSelected: {
    fontWeight: '600',
    color: theme.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  saveButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.headerText,
  },
  totalLabel: {
    fontSize: 16,
    color: theme.text,
  },
  totalAmount: {
    marginLeft: 'auto',
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  recommendationBanner: {
    backgroundColor: theme.isDark ? '#3B2E16' : '#FFFBEB',
    borderColor: theme.isDark ? '#8A5A10' : '#F59E0B',
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  recommendationBannerText: {
    color: theme.isDark ? '#FCD34D' : '#B45309',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionCard: {
    backgroundColor: theme.isDark ? '#12312E' : '#F0FDFA',
    borderColor: theme.isDark ? '#2D7D70' : '#5EEAD4',
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.sm,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.primary,
    marginBottom: 4,
  },
  suggestionSub: {
    fontSize: 12,
    color: theme.text,
    lineHeight: 18,
  },
  rankingList: {
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: theme.isDark ? theme.border : '#E2E8F0',
    paddingTop: SPACING.sm,
    gap: 4,
  },
  rankingHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 4,
  },
  rankingRow: {
    paddingVertical: 2,
  },
  rankingText: {
    fontSize: 12,
    color: theme.text,
  },
});
