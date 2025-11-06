# 🔔 Notification Icon Setup Guide

## 📱 Current Status

Your `app.json` is now configured to use custom notification icons:

### **iOS:**
- Uses `./assets/icon.png` (already configured ✅)
- Shows your app icon in notifications

### **Android:**
- Needs `./assets/notification-icon.png` (needs to be created)
- Must be a **white silhouette** on transparent background
- Shows in notification tray with the color `#5fbfc0` (your brand color)

---

## 🎨 How to Create the Android Notification Icon

Android notification icons have **special requirements**:

### **Requirements:**
1. ✅ **White silhouette** only (no colors, gradients, or shadows)
2. ✅ **Transparent background**
3. ✅ **96x96 pixels** (will be scaled automatically)
4. ✅ **PNG format** with alpha channel
5. ✅ **Simple design** (small details won't show well)

### **What Android Does:**
- Takes your white icon
- Applies your brand color (`#5fbfc0`) to it
- Shows it in the notification tray

---

## 🚀 Quick Options to Create It

### **Option 1: Use Your Existing Icon** (Recommended)

If you have your logo as an SVG or vector file:

1. Open in design tool (Figma, Illustrator, Photoshop, etc.)
2. Convert to **pure white silhouette** on transparent background
3. Export as **96x96px PNG**
4. Save as `/Volumes/C/CCTAPPS/booking_mobile/assets/notification-icon.png`

### **Option 2: Online Tools**

Use one of these free tools:

**1. Figma/Canva:**
- Create 96x96px canvas
- Add your logo
- Change fill to **pure white** (#FFFFFF)
- Remove background (transparent)
- Export as PNG

**2. Android Asset Studio:**
- https://romannurik.github.io/AndroidAssetStudio/icons-notification.html
- Upload your logo
- It will automatically create the correct format
- Download and rename to `notification-icon.png`

**3. Icon Kitchen:**
- https://icon.kitchen/
- Upload your logo
- Select "Notification Icon"
- Download and use

### **Option 3: Convert Existing Icon** (Quickest)

If your current `icon.png` is simple enough:

```bash
# Use ImageMagick to convert (if you have it installed)
cd /Volumes/C/CCTAPPS/booking_mobile/assets
convert icon.png -alpha extract -negate -resize 96x96 notification-icon.png
```

---

## 📂 File Structure After Setup

```
booking_mobile/
  assets/
    icon.png                    # ✅ Main app icon (colored)
    adaptive-icon.png          # ✅ Android adaptive icon
    notification-icon.png      # 🆕 Android notification icon (white silhouette)
    splash-icon.png            # ✅ Splash screen
    favicon.png                # ✅ Web favicon
```

---

## 🧪 Testing

### **After creating the notification icon:**

1. **Rebuild the app:**
   ```bash
   cd /Volumes/C/CCTAPPS/booking_mobile
   npx expo prebuild --clean
   ```

2. **For iOS** (Expo Go):
   - Just reload: Shake device → Reload
   - Icon will update automatically

3. **For Android** (Expo Go):
   - May need to reinstall app
   - Notification icon updates on app reinstall

4. **Test notifications:**
   - Book a trip
   - Check notification tray
   - Should see your white logo with teal color overlay

---

## 🎯 iOS vs Android Notification Icons

### **iOS:**
- Uses your **full-color app icon**
- Automatically rounds it
- Shows in notifications, lock screen, etc.
- ✅ Already working with `icon.png`

### **Android:**
- Uses **white silhouette** (notification-icon.png)
- Applies your brand color overlay
- Shows in status bar and notification tray
- 🔧 Needs notification-icon.png to be created

---

## 📝 Example of Good Notification Icons

**Good Examples:**
- ✅ Simple car/vehicle silhouette
- ✅ Letter "C" in a circle (for CCT)
- ✅ Simple transportation icon
- ✅ Your logo simplified to just outlines

**Bad Examples:**
- ❌ Detailed logo with colors
- ❌ Logo with gradients or shadows
- ❌ Text that's hard to read at small size
- ❌ Complex details that disappear at small size

---

## 🚀 Quick Start

1. **Open your current logo in a design tool**
2. **Make it pure white (#FFFFFF)**
3. **Simplify if needed** (remove small details)
4. **Export as 96x96px PNG** with transparent background
5. **Save as:** `/Volumes/C/CCTAPPS/booking_mobile/assets/notification-icon.png`
6. **Rebuild:** `npx expo prebuild --clean`
7. **Test:** Book a trip and check notifications!

---

## ⚠️ Important Notes

### **Don't use full-color icon for Android notifications:**
- Android will reject colored icons
- Only the **shape** matters (it becomes a silhouette)
- Android applies your color (`#5fbfc0`) automatically

### **Size matters:**
- 96x96px is the base size
- Android scales it automatically for different densities
- Don't make it smaller (will look pixelated)

### **Transparency required:**
- Background must be **transparent** (alpha channel)
- Only the **white shape** should be visible
- No drop shadows or glows

---

## 🎨 If You Don't Have Design Tools

### **Quick Solution: Use a Simple Icon**

Create a simple white text logo:

1. Open any image editor (even Preview on Mac)
2. Create 96x96px transparent canvas
3. Add white text "CCT" or "🚗" in the center
4. Export as PNG
5. Use as placeholder until you have proper logo

---

## ✅ Once Done

After creating `notification-icon.png`:

1. ✅ iOS will use your colored `icon.png` (already working)
2. ✅ Android will use white `notification-icon.png` with teal overlay
3. ✅ Notifications will have your branding!

---

**Need help creating the icon?** Let me know and I can guide you through a specific tool!
