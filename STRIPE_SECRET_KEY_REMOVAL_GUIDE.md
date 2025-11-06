# 🔐 STRIPE SECRET KEY REMOVAL GUIDE

## ⚠️ CRITICAL SECURITY ISSUE FIXED

GitHub correctly detected that you were about to push a Stripe secret key to a public repository. This would have been a **MAJOR SECURITY BREACH**.

## ✅ What We've Already Fixed

1. ✅ Moved `STRIPE_SECRET_KEY` to `.env` file (which is gitignored)
2. ✅ Updated `stripeHelpers.js` to use `process.env.STRIPE_SECRET_KEY`
3. ✅ Updated `.env.example` to include the secret key template
4. ✅ Verified `.env` is in `.gitignore`

## 🚨 IMMEDIATE ACTION REQUIRED

The secret key **WAS ALREADY COMMITTED** to Git history in commit `1342e61`. You have 2 options:

### Option 1: Rewrite Git History (Recommended if not pushed to origin)

**Check if the bad commits have been pushed:**
```bash
cd /Volumes/C/CCTAPPS/booking_mobile
git log origin/main..HEAD --oneline
```

If you see commits that haven't been pushed yet, you can safely rewrite history:

```bash
# Go back 2 commits and redo them without the secret
git reset --soft HEAD~2

# Stage only the safe files
git add .env.example
git add src/lib/stripeHelpers.js
git add src/screens/UberLikeBookingScreen.js
# Add any other files you changed

# Create a new commit without the secret
git commit -m "Fix: Move Stripe secret key to environment variables"

# Push the clean history
git push origin main --force
```

### Option 2: If Already Pushed to GitHub (CRITICAL)

If the commits with the secret key have already been pushed to GitHub:

**YOU MUST IMMEDIATELY:**

1. **Revoke the exposed API key:**
   - Go to https://dashboard.stripe.com/test/apikeys
   - Click "Roll" next to the Secret key
   - This will generate a new secret key
   - Update your `.env` file with the new key

2. **Remove from Git history using BFG Repo-Cleaner:**
```bash
# Install BFG (one-time)
brew install bfg

# Clone a fresh copy
cd /Volumes/C/CCTAPPS
git clone --mirror git@github.com:YOUR_USERNAME/YOUR_REPO.git booking_mobile_mirror

# Remove the secret from history
cd booking_mobile_mirror
bfg --replace-text ../secrets.txt

# Push the cleaned history
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

Create `secrets.txt` with:
```
sk_test_YOUR_ACTUAL_SECRET_KEY_HERE===>***REMOVED***
```

## 📝 Current Status

**Modified files ready to commit:**
- `src/lib/stripeHelpers.js` - Now uses environment variable
- `.env.example` - Updated template

**Files you should NOT commit:**
- `.env` - Contains actual secrets (already gitignored)

## 🔄 Safe Commit Process Going Forward

```bash
cd /Volumes/C/CCTAPPS/booking_mobile

# Stage the safe changes
git add .env.example
git add src/lib/stripeHelpers.js

# Commit
git commit -m "Security: Move Stripe secret key to environment variables

- Removed hardcoded STRIPE_SECRET_KEY from stripeHelpers.js
- Updated to use process.env.STRIPE_SECRET_KEY
- Added STRIPE_SECRET_KEY to .env.example template
- All secrets are now in .env (gitignored)"

# Push
git push origin main
```

## 🛡️ Prevention Tips

1. **Never hardcode secrets** - Always use environment variables
2. **Check before committing:**
   ```bash
   git diff --staged | grep -i "sk_test_\|sk_live_\|api_key"
   ```
3. **Use pre-commit hooks** to scan for secrets
4. **Review changes** in GitHub Desktop before pushing

## 📋 Verification Checklist

- [ ] `.env` file contains `STRIPE_SECRET_KEY`
- [ ] `.env` is listed in `.gitignore`
- [ ] `stripeHelpers.js` uses `process.env.STRIPE_SECRET_KEY`
- [ ] `.env.example` has placeholder values
- [ ] No secrets visible in `git diff --staged`
- [ ] If already pushed: Stripe secret key has been rolled/regenerated
- [ ] App still works with environment variable

## 🔧 Testing After Fix

```bash
# Restart the app to load new environment variables
cd /Volumes/C/CCTAPPS/booking_mobile
npx expo start --clear
```

## 📞 Support

If you've already pushed the secret to GitHub:
1. **IMMEDIATELY** roll the Stripe API key at https://dashboard.stripe.com
2. Follow Option 2 above to clean Git history
3. Update `.env` with the new key
4. Never reuse the exposed key

---

**Status:** ✅ Code fixed, awaiting Git cleanup and safe commit
