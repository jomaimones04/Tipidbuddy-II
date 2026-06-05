import { useCallback } from 'react';
import { useColorScheme } from 'react-native';

// Hook for theme colors
export const useThemeColors = () => {
  const colorScheme = useColorScheme();

  const colors = {
    primary: '#2D7D46',
    accent: '#F4A123',
    danger: '#E84040',
    success: '#22C55E',
    warning: '#F59E0B',
    background: colorScheme === 'dark' ? '#1C1C1E' : '#F9F9F6',
    surface: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    text: colorScheme === 'dark' ? '#FFFFFF' : '#1C1C1E',
    textSecondary: colorScheme === 'dark' ? '#A1A1A6' : '#6B7280',
    border: colorScheme === 'dark' ? '#3C3C3E' : '#E5E7EB',
  };

  return colors;
};

// Hook for storing/retrieving app state
export const useAppState = () => {
  const getState = useCallback(async () => {
    // Will be implemented with AsyncStorage
    return null;
  }, []);

  const setState = useCallback(async () => {
    // Will be implemented with AsyncStorage
  }, []);

  return { getState, setState };
};
