# TipidBuddy - React Native Shopping List App

A comprehensive grocery shopping list and budget tracking app built with React Native, Expo, and TypeScript. Manage your shopping trips, track prices, stay within budget, and gain spending insights all offline.

## ✨ Features

- **Cart Management**: Create and manage multiple shopping carts with budgets
- **Budget Tracking**: Real-time budget tracking with animated progress bars
- **Price History**: Track prices per store with price trend indicators
- **Spending Insights**: View spending patterns by category, store, and time period
- **Cart Templates**: Use system or custom templates to create carts quickly
- **Voice Input**: Add items by voice command (Filipino/English)
- **Camera Scanning**: AI-powered label scanning for quick item addition
- **CSV Export**: Export shopping history and analytics
- **Family Sharing**: Share carts with family members
- **Offline First**: Full offline support with AsyncStorage
- **Guest Mode**: No login required to start using the app
- **Notifications**: Budget alerts when approaching limit

## 🛠️ Tech Stack

- **React Native** with Expo
- **TypeScript** (strict mode)
- **React Navigation** (bottom tabs + stack)
- **Zustand** for state management
- **AsyncStorage** for persistence
- **Expo APIs**: Camera, Speech, Notifications, Haptics, File System
- **Victory Native** for charts
- **React Native Reanimated** for animations

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)

### Setup

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

## 📁 Project Structure

```
/src
  /screens           # All app screens
  /components        # Reusable UI components
  /navigation        # Tab and stack navigators
  /store             # Zustand state management
  /hooks             # Custom React hooks
  /utils             # Helper functions (formatPeso, CSV export, voice parser, etc.)
  /types             # TypeScript interfaces and types
  /constants         # Colors, fonts, templates, default data
  /assets            # Icons, images, fonts
```

## 🎯 Core Screens

1. **Home Screen** - View all carts with budget progress
2. **Cart Detail** - Manage items in a cart with real-time budget
3. **Create/Edit Cart** - Create new carts from templates or manually
4. **Add Item** - Add items manually, by voice, or by camera scan
5. **Price History** - View price trends over time per store
6. **Spending Recap** - Summary after completing a shopping trip
7. **Templates** - Browse and use pre-built or custom cart templates
8. **Insights** - View spending patterns and analytics
9. **Family Sharing** - Manage family members and shared carts
10. **Settings** - Configure app preferences

## 💾 Data Models

### Cart
- ID, name, budget, items, store, date, completion status, total spent

### Item
- ID, name, quantity, unit, estimated/actual price, category, store, price history

### PriceRecord
- Store ID, store name, price, date

### CartTemplate
- ID, name, is system, items list

### Category
- ID, name, color

### SpendingRecap
- Cart ID, total spent, budget, saved amount, category breakdown

## 🎨 Design System

- **Primary Color**: #2D7D46 (Fresh Green)
- **Accent Color**: #F4A123 (Warm Amber)
- **Danger Color**: #E84040
- **Background**: #F9F9F6 (Off-white)
- **Dark Surface**: #1C1C1E
- **Border Radius**: 12-16px
- **Fonts**: Plus Jakarta Sans (headings) + DM Sans (body)

## 💱 Currency

- **Philippine Peso (₱)** only
- All prices formatted as `₱X,XXX.XX`
- Use `formatPeso(amount)` utility function throughout

## 🔔 Notifications

- Budget alert at 90% spent
- Confirmation when under budget
- Uses `expo-notifications` for push notifications

## 📤 Export

- CSV format with date, cart name, store, budget, total spent, items
- Export as plain text list
- Share via native share sheet

## 👥 Guest Mode

- App launches immediately in guest mode
- No login required
- All data stored locally in AsyncStorage
- Optional account creation for cloud sync

## 🧪 Testing

```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run type-check      # TypeScript check
npm run lint            # ESLint
npm run format          # Format with Prettier
```

## 📋 Utilities

- **formatPeso()** - Format numbers as Philippine Peso
- **parseVoiceInput()** - Parse Filipino/English voice commands
- **generateCSV()** - Generate CSV from cart data
- **calculatePriceTrend()** - Calculate price trend indicators
- **formatDate()** - Format dates in locale format

## 🚀 Future Enhancements

- [ ] Cloud sync with Firebase
- [ ] Real barcode scanning
- [ ] Grocery store integrations
- [ ] AI-powered shopping recommendations
- [ ] Receipt OCR for price capture
- [ ] Shopping list sharing links
- [ ] Price comparison with nearby stores
- [ ] Smart shopping reminders

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please create a fork and submit pull requests.

## 📞 Support

For issues or feature requests, please open an issue on the repository.

---

**Created with ❤️ for smart shopping in the Philippines**
