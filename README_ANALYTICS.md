# Google Analytics Integration

Google Analytics has been successfully integrated into ArchiFusion. Here's how it works:

## Setup

1. **Environment Variable**: Add your Google Analytics Measurement ID to `.env.local`:
   ```
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```

2. **Get your Measurement ID**:
   - Go to [Google Analytics](https://analytics.google.com/)
   - Create a new property or use existing one
   - Go to Admin → Data Streams → Web
   - Copy your Measurement ID (starts with G-)

## Usage

### Automatic Page Tracking
Page views are automatically tracked when users navigate between pages.

### Custom Event Tracking
Use the `useAnalytics` hook to track custom events:

```tsx
import { useAnalytics } from '@/hooks/useAnalytics';

function MyComponent() {
  const { trackEvent } = useAnalytics();
  
  const handleButtonClick = () => {
    trackEvent('button_click', {
      event_category: 'engagement',
      event_label: 'cta_button',
      value: 1
    });
  };
  
  return <button onClick={handleButtonClick}>Click me</button>;
}
```

### Direct Event Tracking
You can also import the gtag functions directly:

```tsx
import * as gtag from '@/lib/gtag';

// Track an event
gtag.event('purchase', {
  event_category: 'ecommerce',
  event_label: 'premium_plan',
  value: 99
});
```

## What's Tracked

- **Page Views**: Automatic tracking of all page navigation
- **Custom Events**: Any events you define using the tracking functions
- **User Sessions**: Standard GA4 session tracking
- **User Demographics**: Based on Google's data (if enabled)

## Privacy

- Analytics only loads when `NEXT_PUBLIC_GA_ID` is set
- No personal data is collected beyond what GA4 provides by default
- Users can opt out through browser settings or ad blockers

## Files Added

- `lib/gtag.ts` - Core Google Analytics functions
- `hooks/useAnalytics.ts` - React hook for easy event tracking
- Updated `app/layout.tsx` - Added GA scripts
- `.env.local` - Environment variable template
