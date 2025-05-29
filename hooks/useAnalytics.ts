import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import * as gtag from '@/lib/gtag';

export const useAnalytics = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (gtag.GA_TRACKING_ID) {
      gtag.pageview(pathname);
    }
  }, [pathname]);

  const trackEvent = (
    action: string,
    options?: {
      event_category?: string;
      event_label?: string;
      value?: number;
      [key: string]: any;
    }
  ) => {
    gtag.event(action, options || {});
  };

  return { trackEvent };
};
