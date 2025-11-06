# Payment Card Display Fix - booking_mobile

## Issue
When a card was added in the booking_mobile app, it wasn't showing up in the saved card section after successfully adding it. Additionally, there was a database column mismatch error preventing the payment methods from loading.

## Root Cause
There were multiple issues causing the cards not to show:

1. **CRITICAL - Database Column Mismatch**: The code was referencing `default_payment_method` but the database column is actually named `default_payment_method_id`. This caused a PostgreSQL error: "column profiles.default_payment_method does not exist"

2. **Navigation issue**: After successfully adding a card, the app was using `navigation.navigate('PaymentMethods', { refresh: Date.now() })` which could cause the focus listener to not trigger properly.

3. **Timing issue**: Stripe needs a moment to fully process the payment method attachment. The app was fetching the list immediately without giving Stripe time to process.

4. **Loading state**: When returning to the PaymentMethods screen, there was no visual indication that the list was being refreshed.

5. **Insufficient logging**: Limited logging made it difficult to debug where the issue was occurring.

## Solution

### 0. Fixed Database Column Name (ALL FILES) ⚠️ CRITICAL
**Change**: Updated all references from `default_payment_method` to `default_payment_method_id`:
- In `stripeHelpers.js`: `getPaymentMethodsMobile()` and `deletePaymentMethodMobile()`
- In `AddPaymentMethodScreen.js`: When setting first card as default
- In `PaymentMethodsScreen.js`: When updating default payment method

**Error Fixed**:
```
ERROR column profiles.default_payment_method does not exist
HINT Perhaps you meant to reference the column "profiles.default_payment_method_id"
```

**Reason**: The database schema uses `default_payment_method_id` but the code was referencing the wrong column name, causing all payment method operations to fail.

### 1. Fixed Navigation Flow (`AddPaymentMethodScreen.js`)
**Change**: Modified the navigation after successful card addition from:
```javascript
navigation.navigate('PaymentMethods', { refresh: Date.now() });
```
To:
```javascript
navigation.goBack();
```

**Reason**: Using `goBack()` ensures the screen is properly unmounted and remounted, which triggers the focus listener reliably.

### 2. Added Processing Delay (`AddPaymentMethodScreen.js`)
**Change**: Added a 500ms delay before navigating back:
```javascript
// Small delay to ensure Stripe has fully processed the payment method
await new Promise(resolve => setTimeout(resolve, 500));
```

**Reason**: Gives Stripe time to fully process and attach the payment method to the customer before we try to fetch the updated list.

### 3. Show Loading State on Focus (`PaymentMethodsScreen.js`)
**Change**: Modified the focus listener to show loading state:
```javascript
const unsubscribe = navigation.addListener('focus', () => {
  console.log('PaymentMethodsScreen focused, refreshing...');
  // Set loading to show refresh is happening
  setLoading(true);
  fetchPaymentMethods();
});
```

**Reason**: Provides visual feedback that the list is being refreshed when returning to the screen.

### 4. Enhanced Logging (`stripeHelpers.js`)
**Change**: Added comprehensive logging throughout `getPaymentMethodsMobile`:
- Log when function starts
- Log user ID
- Log Stripe customer ID and default payment method
- Log when fetching from Stripe
- Log payment methods count
- Log any errors with context

**Reason**: Makes it much easier to debug if issues occur in the future.

## Files Modified

1. `/booking_mobile/src/screens/AddPaymentMethodScreen.js`
   - Fixed navigation after card addition
   - Added 500ms delay for Stripe processing
   - Fixed database column name: `default_payment_method` → `default_payment_method_id`

2. `/booking_mobile/src/screens/PaymentMethodsScreen.js`
   - Added loading state on screen focus
   - Fixed database column name: `default_payment_method` → `default_payment_method_id`

3. `/booking_mobile/src/lib/stripeHelpers.js`
   - Enhanced logging in `getPaymentMethodsMobile` function
   - Fixed database column name: `default_payment_method` → `default_payment_method_id` (in 3 places)

## Testing Instructions

1. Open the booking_mobile app
2. Navigate to Payment Methods screen
3. Tap "Add New Card"
4. Enter test card details (4242 4242 4242 4242)
5. Tap "Add Card"
6. After success alert, tap "OK"
7. **Expected Result**: You should see the spinner briefly, then the newly added card should appear in the list
8. The card should be marked as "Default" if it's the first card

## Test Cards (Development Mode)
- **Success**: 4242 4242 4242 4242
- Use any future expiry date
- Use any 3-digit CVC
- Use any ZIP code

## Additional Notes

- The fix ensures that cards added through the mobile app now properly display in the saved cards section
- The loading state provides better UX by showing the user that the list is being refreshed
- Enhanced logging will help diagnose any future issues quickly
- The 500ms delay is a safe buffer but can be adjusted if needed (though Stripe is usually fast)

## Prevention

To prevent similar issues in the future:
1. Always add appropriate delays when dealing with external API operations
2. Use proper navigation patterns (goBack vs navigate)
3. Show loading states during async operations
4. Add comprehensive logging for debugging
