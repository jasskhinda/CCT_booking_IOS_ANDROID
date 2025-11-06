#!/bin/bash

# Start booking_mobile app
# Created: November 6, 2025

echo "🚀 Starting booking_mobile app..."
echo ""

# Kill any existing processes
echo "1. Clearing existing processes..."
lsof -ti:8081 | xargs kill -9 2>/dev/null
pkill -f "expo" 2>/dev/null
pkill -f "metro" 2>/dev/null
sleep 2

# Clear cache
echo "2. Clearing Metro bundler cache..."
rm -rf .expo
rm -rf node_modules/.cache

# Start Expo
echo "3. Starting Expo development server..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   📱 BOOKING MOBILE - EXPO DEV SERVER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npx expo start --clear
