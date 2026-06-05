import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CardStyleInterpolators } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeScreen } from '@screens/HomeScreen';
import { CartDetailScreen } from '@screens/CartDetailScreen';
import { CartFormScreen } from '@screens/CartFormScreen';
import { InsightsScreen } from '@screens/InsightsScreen';
import { SettingsScreen } from '@screens/SettingsScreen';
import { AddEditItemScreen } from '@screens/AddEditItemScreen';
import { SpendingRecapScreen } from '@screens/SpendingRecapScreen';
import { TripSummaryScreen } from '@screens/TripSummaryScreen';
import { CategoryDetailScreen } from '@screens/CategoryDetailScreen';
import { VoiceInputModal } from '@screens/VoiceInputModal';
import { CameraScannerScreen } from '@screens/CameraScannerScreen';
import { ItemDetailScreen } from '@screens/ItemDetailScreen';
import { StoreComparisonScreen } from '@screens/StoreComparisonScreen';
import { CategoryManagerScreen } from '@screens/CategoryManagerScreen';
import { FamilySharingScreen } from '@screens/FamilySharingScreen';
import { ExportModal } from '@screens/ExportModal';
import { TemplatesScreen } from '@screens/TemplatesScreen';
import { ComingSoonScreen } from '@screens/ComingSoonScreen';

import { COLORS } from '@constants/index';
import type { RootStackParamList, TabParamList } from '../types/index';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Consistent header configuration used across all screens
const getHeaderConfig = (title: string) => ({
  headerShown: true,
  title,
  headerLeft: () => null,
  headerBackVisible: false,
  headerStyle: {
    backgroundColor: COLORS.primary,
    height: Platform.OS === 'android' ? 90 : 90,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  headerTintColor: COLORS.white,
  headerTitleStyle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: COLORS.white,
    marginLeft: Platform.OS === 'android' ? -10 : 0,
  },
  headerTitleAlign: 'left' as const,
});

// Screen transition options
const slideFromRightOptions = {
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
};

const slideFromBottomOptions = {
  cardStyleInterpolator: CardStyleInterpolators.forBottomSheetAndroid,
};

const fadeScaleOptions = {
  cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
};

const HomeTabStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        ...slideFromRightOptions,
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={getHeaderConfig('My Carts')}
      />
      <Stack.Screen
        name="CartDetail"
        component={CartDetailScreen}
        options={{
          ...getHeaderConfig('Cart Details'),
          ...slideFromRightOptions,
        }}
      />
      <Stack.Screen
        name="CartForm"
        component={CartFormScreen}
        options={{
          ...getHeaderConfig('Create Cart'),
          ...slideFromBottomOptions,
        }}
      />
      <Stack.Screen
        name="AddEditItem"
        component={AddEditItemScreen}
        options={{
          ...getHeaderConfig('Add/Edit Item'),
          ...slideFromBottomOptions,
        }}
      />
      <Stack.Screen
        name="VoiceInput"
        component={VoiceInputModal}
        options={{
          ...getHeaderConfig('Voice Input'),
          ...slideFromBottomOptions,
        }}
      />
      <Stack.Screen
        name="CameraScanner"
        component={CameraScannerScreen}
        options={{
          ...getHeaderConfig('Scan Label'),
          ...slideFromRightOptions,
        }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{
          headerShown: false,
          ...slideFromRightOptions,
        }}
      />
      <Stack.Screen
        name="StoreComparison"
        component={StoreComparisonScreen}
        options={{
          ...getHeaderConfig('Store Prices'),
          ...slideFromRightOptions,
        }}
      />
      <Stack.Screen
        name="TripSummary"
        component={TripSummaryScreen}
        options={{
          headerShown: false,
          ...fadeScaleOptions,
        }}
      />
      <Stack.Screen
        name="CategoryDetail"
        component={CategoryDetailScreen}
        options={{
          headerShown: false,
          ...slideFromRightOptions,
        }}
      />
      <Stack.Screen
        name="SpendingRecap"
        component={SpendingRecapScreen}
        options={{
          ...getHeaderConfig('Trip Summary'),
          ...fadeScaleOptions,
        }}
      />
      <Stack.Screen
        name="Export"
        component={ExportModal}
        options={{
          ...getHeaderConfig('Export Cart'),
          ...slideFromBottomOptions,
        }}
      />
      <Stack.Screen
        name="ComingSoon"
        component={ComingSoonScreen}
        options={{
          headerShown: false,
          ...slideFromBottomOptions,
        }}
      />
    </Stack.Navigator>
  );
};

const SettingsTabStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true,
      ...slideFromRightOptions,
    }}
  >
    <Stack.Screen
      name="SettingsMain"
      component={SettingsScreen}
      options={getHeaderConfig('Account')}
    />
    <Stack.Screen
      name="CategoryManager"
      component={CategoryManagerScreen}
      options={{
        ...getHeaderConfig('Manage Categories'),
        ...slideFromRightOptions,
      }}
    />
    <Stack.Screen
      name="FamilySharing"
      component={FamilySharingScreen}
      options={{
        ...getHeaderConfig('Family Sharing'),
        ...slideFromRightOptions,
      }}
    />
  </Stack.Navigator>
);

const InsightsTabStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true,
      ...slideFromRightOptions,
    }}
  >
    <Stack.Screen
      name="InsightsMain"
      component={InsightsScreen}
      options={{
        ...getHeaderConfig('Insights'),
        statusBarStyle: 'light',
      }}
    />
    <Stack.Screen
      name="TripSummary"
      component={TripSummaryScreen}
      options={{
        headerShown: false,
        ...fadeScaleOptions,
      }}
    />
    <Stack.Screen
      name="SpendingRecap"
      component={SpendingRecapScreen}
      options={{
        ...getHeaderConfig('Trip Summary'),
        ...fadeScaleOptions,
      }}
    />
    <Stack.Screen
      name="ItemDetail"
      component={ItemDetailScreen}
      options={{
        headerShown: false,
        ...slideFromRightOptions,
      }}
    />
  </Stack.Navigator>
);

const TemplatesTabStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true,
      ...slideFromRightOptions,
    }}
  >
    <Stack.Screen
      name="Templates"
      component={TemplatesScreen}
      options={getHeaderConfig('Templates')}
    />
  </Stack.Navigator>
);

const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary, // Green for active
        tabBarInactiveTintColor: '#999999', // Gray for inactive (not green)
        tabBarLabelStyle: {
          fontSize: 13, // Increased from 12
          fontWeight: '600',
          marginTop: 4, // More space between icon and label
        },
        tabBarIconStyle: {
          marginBottom: 0, // Remove default margin
        },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.white,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeTabStack}
        options={{
          title: 'Carts',
          tabBarLabel: 'Carts',
          tabBarIcon: ({ color }) => <Feather name="shopping-cart" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="InsightsTab"
        component={InsightsTabStack}
        options={{
          title: 'Insights',
          tabBarLabel: 'Insights',
          tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsTabStack}
        options={{
          title: 'Account',
          tabBarLabel: 'Account',
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default function NavigationRoot() {
  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
}
