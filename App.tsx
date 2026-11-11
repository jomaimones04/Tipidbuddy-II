import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NavigationRoot from './src/navigation';
import { useGroceryStore } from './src/store/index';
import { useAuthStore } from './src/store/auth';

export default function App() {
  const initializeStore = useGroceryStore((state) => state.initializeStore);
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initializeStore();
    initializeAuth();
  }, [initializeAuth, initializeStore]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationRoot />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
