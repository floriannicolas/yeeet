'use client';

import { CookieIcon } from 'lucide-react';
import { useLocalStorage } from 'usehooks-ts';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const COOKIE_CONSENT_KEY = 'yeeet-cookie-consent';

export default function CookieConsent({
  onAcceptCallback = () => {},
  onDeclineCallback = () => {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hide, setHide] = useState(false);
  const [areCookiesConsent, setAreCookiesConsent] = useLocalStorage<undefined | boolean>(
    COOKIE_CONSENT_KEY,
    undefined
  );

  const accept = () => {
    setIsOpen(false);
    setAreCookiesConsent(true);
    document.cookie = `${COOKIE_CONSENT_KEY}=true; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
    setTimeout(() => {
      setHide(true);
    }, 700);
    onAcceptCallback();
  };

  const decline = () => {
    setIsOpen(false);
    setAreCookiesConsent(false);
    setTimeout(() => {
      setHide(true);
    }, 700);
    onDeclineCallback();
  };

  useEffect(() => {
    try {
      setIsOpen(true);
      if (
        areCookiesConsent !== undefined ||
        document.cookie.includes(`${COOKIE_CONSENT_KEY}=true`)
      ) {
        setIsOpen(false);
        setTimeout(() => {
          setHide(true);
        }, 700);
      }
    } catch (e) {
      console.log('Error: ', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn(
        'fixed z-200 bottom-0 left-0 right-0 sm:left-4 sm:bottom-4 w-full sm:max-w-md duration-700',
        !isOpen
          ? 'transition-[opacity,transform] translate-y-8 opacity-0'
          : 'transition-[opacity,transform] translate-y-0 opacity-100',
        hide && 'hidden'
      )}
    >
      <div className="m-3 dark:bg-card bg-background border border-border rounded-lg">
        <div className="flex items-center justify-between p-3">
          <h1 className="text-lg font-medium">We use cookies</h1>
          <CookieIcon className="h-[1.2rem] w-[1.2rem]" />
        </div>
        <div className="p-3 -mt-2">
          <p className="text-sm text-left text-muted-foreground">
            We use cookies to ensure you get the best experience on our website. For more
            information on how we use cookies, please see our cookie policy.
          </p>
        </div>
        <div className="p-3 flex items-center gap-2 mt-2 border-t">
          <Button onClick={accept} className="w-full h-9 rounded-full">
            accept
          </Button>
          <Button onClick={decline} className="w-full h-9 rounded-full" variant="outline">
            decline
          </Button>
        </div>
      </div>
    </div>
  );
}
