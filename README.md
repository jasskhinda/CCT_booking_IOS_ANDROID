# CCT Booking Mobile App

A React Native mobile application for Compassionate Care Transportation booking system. This app allows clients to book rides, track trips, and manage their profiles on iOS and Android devices.

## Features

- 🔐 **Authentication**: Secure sign-up, sign-in, and password reset
- 📅 **Ride Booking**: Book one-way or round-trip rides with date/time selection
- 🗺️ **Location Services**: Address input for pickup and destination
- 💰 **Dynamic Pricing**: Real-time price calculation based on distance and premiums
- 🚗 **Trip Management**: View all trips with real-time status updates
- ♿ **Accessibility**: Wheelchair accommodation options
- 🎖️ **Veteran Discount**: 20% discount for veterans
- 👤 **Profile Management**: Update personal information and preferences
- 📱 **Real-time Updates**: Live trip status synchronization via Supabase

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation (Stack & Bottom Tabs)
- **Backend**: Supabase (Authentication, Database, Real-time)
- **Maps**: React Native Maps & Google Places Autocomplete
- **State Management**: React Context API & Hooks
- **Storage**: Expo Secure Store
- **UI**: React Native (StyleSheet)

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Studio
- Expo Go app (for physical device testing)

## Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/jasskhinda/CCT_booking_IOS_ANDROID.git
cd CCT_booking_IOS_ANDROID
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## Database Setup

This app uses the same Supabase database as the web application. Ensure the following tables are set up:

- `profiles` - User profile information
- `trips` - Trip bookings and details
- `drivers` - Driver information

Refer to the main booking_app repository for database schema and setup scripts.

## Running the App

### Development Mode

```bash
npm start
```

This will start the Expo development server. You can then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

## Project Structure

```
booking_mobile/
├── src/
│   ├── components/         # Reusable components
│   ├── hooks/             # Custom hooks (useAuth)
│   ├── lib/               # Utilities (supabase, pricing)
│   ├── navigation/        # Navigation configuration
│   ├── screens/           # All app screens
│   │   ├── LoginScreen.js
│   │   ├── SignUpScreen.js
│   │   ├── ForgotPasswordScreen.js
│   │   ├── HomeScreen.js
│   │   ├── BookingScreen.js
│   │   ├── TripsScreen.js
│   │   ├── TripDetailsScreen.js
│   │   └── ProfileScreen.js
│   └── services/          # API services
├── assets/                # Images, fonts, icons
├── App.js                 # Main app component
├── app.json              # Expo configuration
├── package.json          # Dependencies
└── README.md             # This file
```

## Key Features Implementation

### Authentication
- Uses Supabase Auth with email/password
- Secure token storage with Expo Secure Store
- Automatic session management and refresh
- Role-based access control (client role)

### Booking Flow
1. Select pickup and destination addresses
2. Choose date and time
3. Select options (round trip, wheelchair, veteran discount)
4. Calculate estimated price
5. Confirm and book trip
6. Receive confirmation

### Pricing Calculator
- Base rate: $50 per leg
- Distance-based pricing: $3/mile (Franklin County), $4/mile (outside)
- Premiums: After hours, emergency, wheelchair rental
- Veteran discount: 20% off total
- Real-time calculation before booking

### Real-time Updates
- Automatic trip status synchronization
- Live driver assignment notifications
- Real-time trip progress tracking

## Building for Production

### iOS

1. Configure app.json with your bundle identifier
2. Run:
```bash
eas build --platform ios
```

### Android

1. Configure app.json with your package name
2. Run:
```bash
eas build --platform android
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | Yes |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Optional |

## Troubleshooting

### Common Issues

**App won't start:**
- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

**Authentication errors:**
- Verify Supabase credentials in `.env`
- Check Supabase Auth settings (email auth enabled)

**Maps not loading:**
- Verify Google Maps API key
- Enable required APIs in Google Cloud Console:
  - Maps SDK for Android
  - Maps SDK for iOS
  - Places API
  - Distance Matrix API

**Build errors:**
- Update Expo: `npm install expo@latest`
- Run `expo doctor` to check for issues

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Related Repositories

- [Booking Web App](https://github.com/jasskhinda/booking_app) - Web version of the booking system
- [Dispatcher App](../dispatcher_app) - Operations dashboard
- [Facility App](../facility_app) - Facility-specific interface

## License

Copyright © 2025 Compassionate Care Transportation. All rights reserved.

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Contact: support@cctransportation.com

## Version History

- **v1.0.0** (2025-01-XX) - Initial release
  - User authentication
  - Trip booking with pricing
  - Trip management
  - Profile management
  - Real-time updates

---

Made with ❤️ for Compassionate Care Transportation
