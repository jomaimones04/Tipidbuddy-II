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
- An Expo/EAS account for cloud Android builds

### Setup

```powershell
# Install mobile dependencies from the repository root
npm install

# Configure the mobile API URL (local development or your deployed backend)
Copy-Item .env.example .env
# Edit .env and set EXPO_PUBLIC_API_BASE_URL

# Start Expo
npm start
```

### Backend and MongoDB Atlas

The Express API and MongoDB connection are in `backend/`. The backend connects to Atlas using the existing `connectDatabase()` implementation; the app never receives the MongoDB URI.

1. In MongoDB Atlas, create a database user and allow network access from your hosting provider. If the provider uses changing outbound IPs, follow its recommended Atlas network access setup; do not put Atlas credentials in the mobile `.env`.
2. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI` to the Atlas connection URI for the `Tipidbuddy-II` database. `MONGODB_DATABASE` defaults to `Tipidbuddy-II`; keep it set explicitly.
3. Install and start locally:

   ```powershell
   cd backend
   npm install
   npm start
   ```

4. Verify `http://localhost:5000/api/health` reports `success: true` and `database: "connected"`.

For a fresh clone, repeat the two separate `.env` setup steps above. The `.env` files are ignored by Git. MongoDB Atlas remains the persistent database when code is pushed, cloned, or redeployed.

### Deploying the backend

Create a web service on Render or Railway using this repository, with `backend` as the root directory, `npm install` as the build command, and `npm start` as the start command. The service listens on `process.env.PORT` and binds to `0.0.0.0`. Configure these service environment variables:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Your Atlas connection URI (backend hosting environment only) |
| `MONGODB_DATABASE` | `Tipidbuddy-II` |
| `PORT` | Use the port assigned by the hosting provider; set `5000` for local development |
| `AUTH_JWT_SECRET` | Random secret of at least 32 characters, used to sign account sessions |
| `GOOGLE_OAUTH_CLIENT_IDS` | Comma-separated Google OAuth client IDs accepted by the backend |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | SMTP settings required to deliver password-reset emails |
| `PASSWORD_RESET_URL` | Optional reset link base; defaults to `tipidbuddy://reset-password` |

Set the hosting service's health-check path to `/api/health`. The API refuses to start successfully if it cannot connect to MongoDB. Deployment and Atlas access-list setup must be completed in your own accounts; this repository does not contain a deployed backend URL.

### Optional account authentication

The app remains usable as a guest. Accounts use the backend's `accounts` collection; passwords are hashed on the server, and the app stores its signed session in Android/iOS secure storage. Signing in does not delete or migrate local carts. The existing app-data API is not account-scoped, so account sign-in currently does not enable per-user cloud synchronization.

Email registration and login require `AUTH_JWT_SECRET` on the backend. To enable Google sign-in, create Google OAuth client IDs for the app's Android package (`com.tipidbuddy.app`), iOS bundle ID (`com.tipidbuddy.app`), and web client as applicable. Set the corresponding `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` values in the root `.env` for local builds and in EAS for production builds. Set the same accepted client IDs, comma-separated, as `GOOGLE_OAUTH_CLIENT_IDS` on the backend.

Generate the backend JWT secret with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` and store it only in the backend hosting environment. The Android Google OAuth client must match the package ID and the SHA-1 fingerprint for the Android signing key used for the APK.

Password-reset requests require a working SMTP account with a verified sender; configure the SMTP variables above. The default email link opens the app's `tipidbuddy://reset-password` route. Set `PASSWORD_RESET_URL` only if you have a verified alternate deep-link destination. Never place backend JWT or SMTP secrets in the mobile `.env` or EAS variables.

### Android APK builds

`EXPO_PUBLIC_API_BASE_URL` is embedded into the app at build time. For an installed APK, configure that variable in the EAS `production` environment to your deployed HTTPS API origin (for example, `https://your-service.example.com`, replaced with your real service URL). Do not use localhost, a private LAN address, or a MongoDB URI. Configure the same variable in EAS for `preview` builds if you use that profile.

Then build a directly installable APK:

```bash
npx eas-cli build --platform android --profile production-apk
```

For Expo Go/local development, set `EXPO_PUBLIC_API_BASE_URL` in the root `.env` to your computer's reachable LAN backend URL, or leave it unset while Expo is running on the LAN; the app can then derive the Expo host. A production build has no LAN/localhost fallback and reports a configuration error if its API URL is missing or invalid.

To verify a built APK saves data, open it on a device with internet access, create a cart with items and a store, set item prices, and finish the trip. The app only updates the cart as completed after the API confirms the save; a failed save leaves the cart available for retry. Check the completed cart in the Atlas `carts` collection and its price records in `itempricehistories`, and confirm the hosted `/api/health` endpoint reports a connected database.

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
- Optional account creation for sign-in

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
