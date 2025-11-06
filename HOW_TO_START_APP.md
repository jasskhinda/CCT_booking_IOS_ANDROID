# 📱 MANUAL INSTRUCTIONS TO START BOOKING_MOBILE APP

## Quick Start (Copy & Paste This):

### Option 1: Using Expo Start Command
```bash
cd /Volumes/C/CCTAPPS/booking_mobile && npx expo start --clear
```

### Option 2: Using NPM Start
```bash
cd /Volumes/C/CCTAPPS/booking_mobile && npm start
```

### Option 3: Step by Step
```bash
# 1. Navigate to the app directory
cd /Volumes/C/CCTAPPS/booking_mobile

# 2. Clear cache (optional but recommended)
rm -rf .expo
rm -rf node_modules/.cache

# 3. Start the app
npx expo start --clear
```

---

## What You'll See:

After running the command, you should see:
```
› Metro waiting on exp://10.71.240.90:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
```

---

## To Test On Your Phone:

### iOS:
1. Open Camera app
2. Scan the QR code
3. Tap the notification to open in Expo Go

### Android:
1. Open Expo Go app
2. Tap "Scan QR Code"
3. Scan the QR code

---

## Troubleshooting:

### If you see "command not found: npx"
```bash
cd /Volumes/C/CCTAPPS/booking_mobile
npm install -g expo-cli
expo start --clear
```

### If you see port already in use
```bash
# Kill existing process
lsof -ti:8081 | xargs kill -9

# Then start again
npx expo start --clear
```

### If the app won't start
```bash
cd /Volumes/C/CCTAPPS/booking_mobile
rm -rf node_modules
npm install
npx expo start --clear
```

---

## Current App Configuration:

**Navigation:**
- ✅ Home Tab
- ✅ **Book Tab** → Now uses `UberLikeBookingScreen` (needs manual adaptation)
- ✅ Trips Tab
- ✅ Profile Tab

**Note:** The Book tab is currently using the new UberLikeBookingScreen which still has facility-specific code. If you encounter errors, you can temporarily revert to the old BookingScreen by editing `src/navigation/AppNavigator.js`:

```javascript
// Change this line:
<Tab.Screen name="Book" component={UberLikeBookingScreen} />

// Back to:
<Tab.Screen name="Book" component={BookingScreen} />
```

---

## What to Test:

1. **Book Tab** - The new enhanced booking screen
2. **PricingDisplay Component** - Should show detailed breakdown with:
   - Base fare (X legs @ $X/leg (Bariatric rate))
   - Distance charge ($X/mile (Franklin County))
   - Dead mileage (X mi @ $4/mile)
   - County surcharge (X counties @ $50/county)
   - Weekend/After-hours surcharge (combined if both)

---

**Ready to start?** Copy one of the commands above and paste it in your terminal!
