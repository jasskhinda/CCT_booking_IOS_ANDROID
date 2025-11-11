# 🔧 METRO BUNDLER CACHE ISSUE - CLEAR & RESTART

## 🔴 THE PROBLEM
Even after killing and restarting the server, the old code is still running. This is a **Metro bundler cache issue**.

---

## ✅ SOLUTION - CLEAR CACHE & RESTART

### Step 1: Stop Expo Server
Press `Ctrl+C` in your Expo terminal to stop it completely

### Step 2: Clear Metro Bundler Cache
Run this command in your terminal:

```bash
cd /Volumes/C/CCTAPPS/booking_mobile && npx expo start -c
```

The `-c` flag clears the cache!

### Step 3: Wait for Server to Start
You'll see "Metro waiting on..." message

### Step 4: Reload Your App
- Shake your device
- Tap "Reload"

---

## 🎯 ALTERNATIVE - FULL CACHE CLEAR

If the above doesn't work, do a FULL cache clear:

```bash
cd /Volumes/C/CCTAPPS/booking_mobile && \
rm -rf node_modules/.cache && \
rm -rf .expo && \
npx expo start -c
```

This will:
1. Delete node_modules cache
2. Delete .expo folder
3. Start with cache cleared

---

## 📋 QUICK COMMAND

**Copy and paste this into your terminal:**

```bash
cd /Volumes/C/CCTAPPS/booking_mobile && npx expo start -c
```

Press Enter and wait for it to start!

---

## ✅ AFTER RESTART

You should see the console log:
```
📏 Distance calculation: {
  oneWayMiles: 45.7,
  isRoundTrip: false,
  distanceForPricing: 45.7,
  calculation: 45.7
}
```

And the price should be **~$636** (not $624)!

---

**Run the command now!** The `-c` flag will force Metro to rebuild everything! 🚀
