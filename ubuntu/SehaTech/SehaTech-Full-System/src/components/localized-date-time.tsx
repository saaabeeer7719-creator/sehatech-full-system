
"use client";

import { useState, useEffect } from 'react';

interface LocalizedDateTimeProps {
  dateTime: any; // Can be a string, a Firestore Timestamp, or a JS Date
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
}

export function LocalizedDateTime({ dateTime, locale = 'ar-EG', options = {} }: LocalizedDateTimeProps) {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after hydration
    try {
      if (!dateTime) {
        setFormattedDate('جارٍ...');
        return;
      }
      // Check if it's a Firestore Timestamp and convert it
      const date = typeof dateTime.toDate === 'function' 
        ? dateTime.toDate() 
        : new Date(dateTime);
        
      setFormattedDate(date.toLocaleString(locale, options));
    } catch (e) {
      // Fallback for invalid dates
      setFormattedDate(String(dateTime));
    }
  }, [dateTime, locale, options]);

  // Render a placeholder or null on the server and during the initial client render
  // to avoid the hydration mismatch.
  return <>{formattedDate}</>;
}
