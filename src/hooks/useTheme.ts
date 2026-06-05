import { useColorScheme } from 'react-native';
import { useGroceryStore } from '../store/index';
import { LightTheme, DarkTheme } from '../constants/theme';

export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const themeMode = useGroceryStore((state) => state.settings.themeMode) || 'system';

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  return isDark ? DarkTheme : LightTheme;
};
