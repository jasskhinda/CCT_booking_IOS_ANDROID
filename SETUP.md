# Quick Setup Guide

## ✅ Environment Variables Configured

Your `.env` file has been created with the correct credentials.

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd booking_mobile
npm install
```

### 2. Start the App
```bash
npm start
```

This will open the Expo Dev Tools in your browser.

### 3. Run on Device/Simulator

**Option A: Physical Device (Recommended for testing)**
1. Install "Expo Go" app from App Store (iOS) or Play Store (Android)
2. Scan the QR code shown in the terminal/browser
3. App will load on your phone

**Option B: iOS Simulator (Mac only)**
- Press `i` in the terminal
- Or click "Run on iOS simulator" in Expo Dev Tools

**Option C: Android Emulator**
- Press `a` in the terminal
- Or click "Run on Android device/emulator" in Expo Dev Tools

## 📱 Test Accounts

You can create test accounts directly in the app, or use existing accounts from your web app.

## 🔧 Troubleshooting

### App won't start
```bash
# Clear cache and restart
npm start -- --clear
```

### Connection issues
If you get Supabase connection errors, try switching to the standard Supabase URL:

In `.env`, change:
```
EXPO_PUBLIC_SUPABASE_URL=https://btzfgasugkycbavcwvnx.supabase.co
```

### Google Maps not working
Make sure these APIs are enabled in Google Cloud Console:
- Maps SDK for Android
- Maps SDK for iOS
- Places API
- Distance Matrix API

## 📦 Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## 📖 Features Ready to Test

- ✅ Sign Up / Sign In
- ✅ Book a Ride
- ✅ View Trips
- ✅ Trip Details
- ✅ Profile Management
- ✅ Real-time Updates
- ✅ Pricing Calculator

## 🎯 Next Steps

1. Test all features on your device
2. Report any bugs or issues
3. Request feature additions/changes
4. Customize branding (colors, logos)
5. Prepare for App Store submission

## 💬 Need Help?

Open an issue on GitHub or contact support.
