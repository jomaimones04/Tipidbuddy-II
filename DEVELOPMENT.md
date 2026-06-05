# TipidBuddy Development Guide

## Getting Started

The TipidBuddy app is now fully scaffolded and ready for development. All dependencies are installed and TypeScript compilation is successful.

### Running the App

```bash
# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

## Project Status

### ✅ Completed
- **Project Structure**: All directories organized by feature/layer
- **Dependencies**: All packages installed and verified
- **TypeScript**: Configured with strict mode and path aliases
- **Navigation**: Tab navigator + stack navigation setup
- **State Management**: Zustand store with AsyncStorage persistence
- **Utilities**: formatPeso, CSV export, voice parser, price trends
- **Screens**: 5 basic screens created (Home, Cart Detail, Cart Form, Templates, Insights, Settings)
- **Design System**: Colors, fonts, spacing constants defined
- **Tests**: Jest + unit tests structure for utilities

### 🚀 Next Steps

1. **Complete Screen Implementations**
   - Enhance CartDetailScreen with item management
   - Build VoiceInputModal with voice parsing
   - Implement CameraScannerScreen with image recognition
   - Create PriceHistoryScreen with charts
   - Build InsightsScreen with spending analytics

2. **Build Reusable Components**
   - BudgetProgressBar (animated, color-coded)
   - ItemCard component
   - CategoryPicker component
   - PriceHistoryChart component
   - StoreComparisonCard component

3. **Implement Advanced Features**
   - Voice input parsing and modal
   - Camera scanning integration
   - Real-time budget calculations
   - Price history tracking
   - Spending recap notifications
   - Family sharing functionality
   - CSV export and sharing

4. **Polish & Testing**
   - Add haptic feedback (expo-haptics)
   - Implement notifications (expo-notifications)
   - Add animations (react-native-reanimated)
   - Write integration tests
   - Test on real devices

## File Structure Reference

```
src/
├── screens/           # All 15+ app screens
├── components/        # Reusable UI components (to be expanded)
├── navigation/        # Navigation configuration
├── store/             # Zustand state management
├── hooks/             # Custom React hooks
├── utils/             # Helper functions & utilities
├── types/             # TypeScript type definitions
├── constants/         # Colors, fonts, templates, default data
└── assets/            # Images, icons, fonts (placeholders)
```

## Key Utilities

### Peso Formatting
```typescript
import { formatPeso, formatPesoAmount } from '@utils/index';

formatPeso(1234.50);        // "₱1,234.50"
formatPesoAmount(1234.50);  // "1,234.50"
```

### Voice Input Parser
```typescript
import { parseVoiceInput } from '@utils/index';

parseVoiceInput("2 kilo ng bigas, 80 piso");
// { quantity: 2, unit: 'kilo', name: 'bigas', price: 80 }
```

### Price Trends
```typescript
import { calculatePriceTrend, getTrendIcon } from '@utils/index';

const trend = calculatePriceTrend(100, 120);  // "up"
const icon = getTrendIcon(trend);              // "↑"
```

### CSV Export
```typescript
import { generateCSV } from '@utils/index';

const csv = generateCSV(cartName, items, totalSpent, budget, storeName);
// Returns formatted CSV string ready to export
```

## Important Notes

- **Philippine Peso (₱)**: All prices are formatted in PHP only - no currency selector needed
- **Offline First**: App works fully offline with AsyncStorage persistence
- **Guest Mode**: No login required - users can start using immediately
- **Fonts**: Font files are placeholders - download actual fonts from Google Fonts (Plus Jakarta Sans, DM Sans)
- **Types**: Use path aliases (@screens, @components, etc.) throughout the app

## Database Schema

The app uses AsyncStorage with these keys:
- `grocery_budget_carts` - All shopping carts
- `grocery_budget_stores` - Store database
- `grocery_budget_templates` - Cart templates
- `grocery_budget_categories` - Product categories
- `grocery_budget_settings` - User settings
- `grocery_budget_family` - Family members

## Testing

```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run type-check      # TypeScript check
npm run lint            # ESLint
npm run format          # Format with Prettier
```

## Troubleshooting

### Font Loading Issues
If fonts don't load, ensure font files exist in `src/assets/fonts/` directory. Download actual TTF files from Google Fonts.

### AsyncStorage Not Persisting
Make sure you're calling `useGroceryStore().initializeStore()` in App.tsx on mount.

### Navigation Not Working
Verify that all screen imports are correct and navigation params match the type definitions in `src/types/index.ts`.

## Next Development Session

When resuming development:
1. Run `npm start` to start the Expo server
2. Review the TODO comments in screen files for incomplete features
3. Check DEVELOPMENT.md for current status
4. Refer to the requirements document for feature specifications

---

**Happy coding! 🚀**
