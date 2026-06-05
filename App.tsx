import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NavigationRoot from './src/navigation';
import { useGroceryStore } from './src/store/index';

export default function App() {
  const initializeStore = useGroceryStore((state) => state.initializeStore);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationRoot />
    </GestureHandlerRootView>
  );
}
