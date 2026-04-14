"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

const AGE_VERIFIED_KEY = "kinktube_age_verified";
const AGE_VERIFIED_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

interface AgeVerificationProps {
  children: React.ReactNode;
}

export default function AgeVerification({ children }: AgeVerificationProps) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has already verified
    const stored = localStorage.getItem(AGE_VERIFIED_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const isExpired = Date.now() - data.timestamp > AGE_VERIFIED_EXPIRY;
        if (!isExpired && data.verified) {
          setIsVerified(true);
          setIsLoading(false);
          return;
        }
      } catch {
        // Invalid stored data, show modal
      }
    }
    setIsVerified(false);
    setIsLoading(false);
  }, []);

  const handleVerify = () => {
    // Store verification with timestamp
    localStorage.setItem(
      AGE_VERIFIED_KEY,
      JSON.stringify({
        verified: true,
        timestamp: Date.now(),
      })
    );
    setIsVerified(true);
  };

  const handleExit = () => {
    // Redirect to safe site
    window.location.href = "https://www.google.com";
  };

  // Show nothing while checking localStorage
  if (isLoading) {
    return null;
  }

  // Show children if verified
  if (isVerified) {
    return <>{children}</>;
  }

  // Show age verification modal
  return (
    <>
      {/* Blur the background */}
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-background-secondary border border-border rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Warning Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-accent" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-4">
            Age Verification Required
          </h1>

          {/* Description */}
          <div className="text-foreground-muted text-center space-y-3 mb-8">
            <p>
              This website contains adult content including nudity and explicit
              material related to BDSM, kink, and fetish themes.
            </p>
            <p className="font-semibold text-foreground">
              You must be at least 18 years old (or the age of majority in your
              jurisdiction) to enter.
            </p>
            <p className="text-sm">
              By clicking &quot;I am 18 or older&quot;, you agree that you are of
              legal age to view adult content and accept our Terms of Service.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleVerify}
              className="
                flex-1 flex items-center justify-center gap-2
                px-6 py-4 rounded-lg
                bg-accent hover:bg-accent-hover
                text-white font-semibold
                transition-colors
              "
            >
              <ShieldCheck className="w-5 h-5" />
              I am 18 or older - Enter
            </button>
            <button
              onClick={handleExit}
              className="
                flex-1 px-6 py-4 rounded-lg
                bg-background-tertiary hover:bg-border
                text-foreground-muted font-semibold
                border border-border
                transition-colors
              "
            >
              Exit Site
            </button>
          </div>

          {/* Additional Info */}
          <p className="text-xs text-foreground-muted text-center mt-6">
            We use cookies to remember your verification for 30 days.
            <br />
            Please ensure you are in a private environment before continuing.
          </p>
        </div>
      </div>
    </>
  );
}
