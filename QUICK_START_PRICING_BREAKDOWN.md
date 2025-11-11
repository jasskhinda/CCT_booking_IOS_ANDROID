# 🚀 Quick Start: Apply Database Migration & Test

## Step 1: Apply Database Migration (5 minutes)

### Option A: Supabase Dashboard (Easiest)

1. **Open Supabase Dashboard**
   - Go to your booking_app project in Supabase
   - Click "SQL Editor" in the left sidebar

2. **Run Migration**
   - Click "New Query"
   - Copy the ENTIRE contents of this file:
     `/Volumes/C/CCTAPPS/booking_app/db/add_pricing_breakdown_columns.sql`
   - Paste into SQL Editor
   - Click "Run" or press Cmd+Enter

3. **Expected Output:**
   ```
   ✅ Added pricing_breakdown_data column
   ✅ Added pricing_breakdown_total column
   ✅ Added pricing_breakdown_locked_at column
   ✅ Migrated existing trip prices to pricing_breakdown_total
   
   status: "Pricing breakdown storage setup complete!"
   note: "Individual bookings will now save detailed pricing breakdowns"
   ```

4. **Verify Migration**
   - Run this verification query:
   ```sql
   SELECT 
     column_name,
     data_type,
     is_nullable
   FROM information_schema.columns
   WHERE table_name = 'trips'
     AND column_name IN ('pricing_breakdown_data', 'pricing_breakdown_total', 'pricing_breakdown_locked_at')
   ORDER BY column_name;
   ```
   
   - Expected result: Should show 3 rows with the new columns

### Option B: Copy-Paste SQL (Even Easier)

Just copy and paste this into Supabase SQL Editor:

```sql
DO $$ 
BEGIN
    -- Add pricing_breakdown_data column to store the detailed breakdown as JSON
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'pricing_breakdown_data') THEN
        ALTER TABLE trips ADD COLUMN pricing_breakdown_data JSONB;
        COMMENT ON COLUMN trips.pricing_breakdown_data IS 'Detailed pricing breakdown from booking (JSON) - locked from booking page';
        RAISE NOTICE '✅ Added pricing_breakdown_data column';
    ELSE
        RAISE NOTICE 'ℹ️ pricing_breakdown_data column already exists';
    END IF;
    
    -- Add pricing_breakdown_total column for quick total access
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'pricing_breakdown_total') THEN
        ALTER TABLE trips ADD COLUMN pricing_breakdown_total DECIMAL(10,2);
        COMMENT ON COLUMN trips.pricing_breakdown_total IS 'Total amount from pricing breakdown for quick access';
        RAISE NOTICE '✅ Added pricing_breakdown_total column';
    ELSE
        RAISE NOTICE 'ℹ️ pricing_breakdown_total column already exists';
    END IF;
    
    -- Add pricing_breakdown_locked_at column for tracking when breakdown was saved
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'pricing_breakdown_locked_at') THEN
        ALTER TABLE trips ADD COLUMN pricing_breakdown_locked_at TIMESTAMPTZ;
        COMMENT ON COLUMN trips.pricing_breakdown_locked_at IS 'When the pricing breakdown was locked during booking';
        RAISE NOTICE '✅ Added pricing_breakdown_locked_at column';
    ELSE
        RAISE NOTICE 'ℹ️ pricing_breakdown_locked_at column already exists';
    END IF;
    
    -- Update existing trips to have pricing_breakdown_total match their price column
    UPDATE trips 
    SET pricing_breakdown_total = price 
    WHERE pricing_breakdown_total IS NULL AND price IS NOT NULL;
    
    RAISE NOTICE '✅ Migrated existing trip prices to pricing_breakdown_total';
    
END $$;
```

---

## Step 2: Reload Mobile App (30 seconds)

1. **In your terminal where Expo is running**, press `r` to reload
2. Or press `i` to reopen iOS Simulator if needed

---

## Step 3: Test Pricing Breakdown Display (2 minutes)

### Test the "View price breakdown" button:

1. **Fill in the booking form:**
   - Pickup: `400 W Wilson Bridge Rd, Worthington, OH`
   - Destination: `200 E Campus View Blvd, Columbus, OH`
   - Wheelchair: `Bariatric (400+ lbs)`
   - (This will calculate a fare around $150-200)

2. **Tap "View price breakdown" button**
   - ✅ Should expand and show breakdown details
   - ✅ Should show: Base fare, Distance charge, Total
   - ✅ Console should log: `🔍 Toggle price breakdown`

3. **Check console logs:**
   ```
   💰 Comprehensive pricing calculated: {
     pricing: { basePrice: 150, distancePrice: X, total: Y },
     ...
   }
   
   🔍 Toggle price breakdown: {
     showPriceBreakdown: true,
     pricingBreakdown: { basePrice: 150, ... },
     hasPricingBreakdown: true
   }
   ```

---

## Step 4: Test Booking with Pricing Breakdown Storage (3 minutes)

1. **Complete the booking:**
   - Fill all required fields
   - Tap "Book Trip"
   - Should see: ✅ "Trip booked successfully!"

2. **Verify in Supabase:**
   ```sql
   SELECT 
     id,
     status,
     price,
     pricing_breakdown_total,
     pricing_breakdown_locked_at,
     pricing_breakdown_data->'pricing'->>'basePrice' as base_price,
     pricing_breakdown_data->'pricing'->>'distancePrice' as distance_price,
     pricing_breakdown_data->'pricing'->>'total' as total,
     pricing_breakdown_data->>'source' as source,
     created_at
   FROM trips
   WHERE user_id = '365d55fe-58a4-4b23-a9ae-df3d8412e7de'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

3. **Expected result:**
   ```
   price: 448.80
   pricing_breakdown_total: 448.80
   pricing_breakdown_locked_at: 2025-11-07 11:18:47+00
   base_price: "150"
   distance_price: "298.8"
   total: "448.8"
   source: "BookingMobileApp"
   ```

---

## ✅ Success Criteria

- [x] Database migration ran without errors
- [x] New columns exist in trips table
- [x] "View price breakdown" button shows detailed breakdown
- [x] Console logs show pricing data when toggling
- [x] Booking saves `pricing_breakdown_data` as JSONB
- [x] `pricing_breakdown_total` matches `price`
- [x] `pricing_breakdown_locked_at` is set to current timestamp
- [x] `source` field shows "BookingMobileApp"

---

## 🐛 Troubleshooting

### Issue: "Column already exists" error
**Solution:** This is fine! The migration checks if columns exist. Just verify with the verification query.

### Issue: Pricing breakdown doesn't show when toggled
**Check:**
1. Console logs - is `pricingBreakdown` null?
2. Did fare calculation run? (should see `💰 Comprehensive pricing calculated`)
3. Try entering addresses and recalculating

### Issue: Booking fails with "column does not exist"
**Check:**
1. Did migration run successfully?
2. Run verification query to confirm columns exist
3. Reload app after migration

### Issue: Console shows "pricingBreakdown: null"
**Solution:** 
1. Make sure you've entered valid pickup/destination addresses
2. Fare calculation runs automatically after addresses are entered
3. Check for any errors in console during fare calculation

---

## 📊 What Gets Saved

When you book a trip, here's what's saved in `pricing_breakdown_data`:

```json
{
  "pricing": {
    "basePrice": 150,
    "distancePrice": 298.8,
    "countyPrice": 0,
    "deadMileagePrice": 0,
    "wheelchairPrice": 0,
    "total": 448.8,
    "isBariatric": true,
    "baseRatePerLeg": 150
  },
  "distance": { "distance": 45.7, "unit": "miles" },
  "summary": {
    "isRoundTrip": false,
    "isEmergency": false,
    "wheelchairType": "bariatric",
    "additionalPassengers": 0
  },
  "wheelchairInfo": {
    "type": "bariatric",
    "requirements": null,
    "details": null
  },
  "clientInfo": {
    "weight": 450
  },
  "addressDetails": {
    "pickupDetails": null,
    "destinationDetails": null
  },
  "createdAt": "2025-11-07T16:18:47.000Z",
  "source": "BookingMobileApp"
}
```

---

## 🎯 Next: Create Trip Details Screen

Once this is working, we can create screens to:
1. **View trip details** - Show the saved pricing breakdown
2. **Edit trips** - Pre-fill form with saved data
3. **View trip history** - See all past bookings with their locked pricing

Similar to how `facility_mobile` works! 🚀
