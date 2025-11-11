# ✅ ACTION CHECKLIST - Do This Now!

## 🔴 REQUIRED: Database Migration (5 minutes)

### Step 1: Open Supabase
- [ ] Go to https://supabase.com
- [ ] Select your **booking_app** project
- [ ] Click **"SQL Editor"** in left sidebar

### Step 2: Run Migration
- [ ] Click **"New Query"**
- [ ] Open file: `/Volumes/C/CCTAPPS/booking_app/db/add_pricing_breakdown_columns.sql`
- [ ] **Copy ALL** the SQL code
- [ ] **Paste** into Supabase SQL Editor
- [ ] Click **"Run"** or press `Cmd+Enter`

### Step 3: Verify Success
- [ ] Should see output with green checkmarks (✅)
- [ ] Run this verification query:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'trips'
  AND column_name LIKE 'pricing_breakdown%'
ORDER BY column_name;
```
- [ ] Should see 3 rows (pricing_breakdown_data, pricing_breakdown_locked_at, pricing_breakdown_total)

---

## 🟡 RECOMMENDED: Test the App (10 minutes)

### Step 1: Reload App
- [ ] In terminal where Expo is running, press **`r`** to reload
- [ ] Or press **`i`** to reopen iOS Simulator

### Step 2: Test Price Breakdown Display
- [ ] Fill in addresses:
  - Pickup: `400 W Wilson Bridge Rd, Worthington, OH`
  - Destination: `200 E Campus View Blvd, Columbus, OH`
- [ ] Select wheelchair type: **Bariatric**
- [ ] Tap **"View price breakdown"**
- [ ] ✅ Should expand and show:
  ```
  Base fare (1 leg @ $150/leg Bariatric)  $150.00
  Distance charge ($4/mile)                $XX.XX
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total                                    $XXX.XX
  ```

### Step 3: Check Console Logs
- [ ] Look for: `💰 Comprehensive pricing calculated`
- [ ] Look for: `🔍 Toggle price breakdown: { ... }`
- [ ] Should show `hasPricingBreakdown: true`

### Step 4: Book a Test Trip
- [ ] Complete all required fields
- [ ] Tap **"Book Trip"**
- [ ] Should see: ✅ **"Trip booked successfully!"**

### Step 5: Verify Database Storage
- [ ] Go back to Supabase SQL Editor
- [ ] Run this query (replace with your user_id):
```sql
SELECT 
  id,
  status,
  price,
  pricing_breakdown_total,
  pricing_breakdown_locked_at,
  pricing_breakdown_data->'pricing'->>'basePrice' as base_price,
  pricing_breakdown_data->'pricing'->>'total' as total,
  pricing_breakdown_data->>'source' as source,
  created_at
FROM trips
WHERE user_id = '365d55fe-58a4-4b23-a9ae-df3d8412e7de'
ORDER BY created_at DESC
LIMIT 1;
```
- [ ] Should see:
  - `pricing_breakdown_total` = matches `price`
  - `pricing_breakdown_locked_at` = recent timestamp
  - `base_price` = "150" (or appropriate amount)
  - `total` = matches total fare
  - `source` = "BookingMobileApp"

---

## 🟢 OPTIONAL: Advanced Testing

### Test Round Trip
- [ ] Toggle **"Round Trip"** on
- [ ] Set return time
- [ ] Verify pricing doubles for round trip
- [ ] Book and verify `is_round_trip: true` in breakdown

### Test Different Wheelchair Types
- [ ] Test with **"Standard"** ($50/leg)
- [ ] Test with **"Bariatric"** ($150/leg)
- [ ] Verify pricing changes accordingly

### Test Long Distance
- [ ] Try addresses 100+ miles apart
- [ ] Should see **dead mileage** fee in breakdown
- [ ] Verify county surcharges apply

---

## 📋 Success Criteria

You're done when you can answer YES to all:

- [ ] Database migration ran successfully (no errors)
- [ ] 3 new columns exist in trips table
- [ ] "View price breakdown" button expands/collapses properly
- [ ] Pricing breakdown shows detailed line items
- [ ] Console logs show pricing data
- [ ] Can book a trip successfully
- [ ] Database query shows pricing_breakdown_data as JSON
- [ ] pricing_breakdown_total matches price column
- [ ] source field shows "BookingMobileApp"

---

## 🐛 If Something Goes Wrong

### Migration Failed
**Check:**
- Did you select the correct database (booking_app)?
- Did you copy the ENTIRE SQL file?
- Look at error message - it will tell you what's wrong

**Common Issues:**
- "column already exists" → This is OK! Migration is idempotent
- "permission denied" → Make sure you're logged in as project owner
- "syntax error" → Make sure you copied all the SQL, including the `DO $$` block

### Pricing Breakdown Doesn't Show
**Check:**
1. Console logs - is `pricingBreakdown` null?
2. Did you enter valid addresses?
3. Did fare calculation complete? (look for `💰 Comprehensive pricing calculated`)

**Fix:**
- Try entering addresses again
- Make sure both pickup AND destination are filled
- Check for any errors in console

### Booking Fails
**Error:** "column does not exist"
- Migration didn't run successfully
- Run verification query to check columns exist
- Try running migration again

**Error:** Network or permission error
- Check Supabase is online
- Verify auth session is active
- Try logging out and back in

---

## 📚 Documentation Files Created

Quick reference to docs:

1. **Start Here:** `QUICK_START_PRICING_BREAKDOWN.md`
2. **Technical Details:** `PRICING_BREAKDOWN_STORAGE_IMPLEMENTATION.md`
3. **Complete Summary:** `PRICING_BREAKDOWN_COMPLETE.md`
4. **Session Summary:** `SESSION_SUMMARY_PRICING_BREAKDOWN.md`
5. **This Checklist:** `ACTION_CHECKLIST.md`

---

## 🎯 What's Next (After Testing)

Once everything works:

1. **Create TripDetailScreen** - Show trip with locked pricing
2. **Create EditTripModal** - Edit trip with preserved data
3. **Update MyTrips** - Add "View Details" button
4. **Test end-to-end** - Book → View → Edit flow

---

## 💪 You Got This!

**Current Status:**
- ✅ Code changes complete
- ✅ Documentation created
- ✅ Migration SQL ready
- ✅ App is running in simulator

**Next Action:**
👉 Apply database migration in Supabase (5 minutes)

**Then:**
👉 Reload app and test (10 minutes)

**Total Time:** ~15 minutes to complete everything! 🚀

---

**Need Help?** Check the troubleshooting section above or look at the detailed documentation files.
