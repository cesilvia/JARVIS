"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CircuitBackground from "../hub/CircuitBackground";
import { Suspense } from "react";

const hubTheme = {
  primary: "#00D9FF",
  secondary: "#67C7EB",
  background: "#000000",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/hub";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    checkSetupStatus();
    checkBiometricAvailability();
  }, []);

  async function checkSetupStatus() {
    try {
      const res = await fetch("/api/auth/setup");
      if (res.ok) {
        const { needsSetup: setup } = await res.json();
        setNeedsSetup(setup);
      }
    } catch {
      setNeedsSetup(false);
    }
  }

  async function checkBiometricAvailability() {
    try {
      const res = await fetch("/api/auth/webauthn/registered");
      if (res.ok) {
        const { registered } = await res.json();
        if (registered && window.PublicKeyCredential) {
          setBiometricAvailable(true);
        }
      }
    } catch {
      // WebAuthn not available
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(redirect);
      } else {
        const data = await res.json();
        setError(data.error || "Setup failed");
      }
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(redirect);
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    setBiometricLoading(true);
    setError("");
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");

      const optionsRes = await fetch("/api/auth/webauthn/verify", {
        method: "GET",
      });
      if (!optionsRes.ok) throw new Error("Failed to get auth options");
      const options = await optionsRes.json();

      const credential = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/webauthn/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });

      if (verifyRes.ok) {
        router.push(redirect);
      } else {
        const data = await verifyRes.json();
        setError(data.error || "Biometric verification failed");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Biometric authentication was cancelled");
      } else {
        setError("Biometric authentication failed");
      }
    } finally {
      setBiometricLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen hud-scifi-bg relative flex items-center justify-center"
      style={{ backgroundColor: hubTheme.background, color: hubTheme.primary }}
    >
      <CircuitBackground />
      <main className="relative z-10 w-full max-w-sm px-4">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/assets/jarvis-frame.png"
            alt="JARVIS"
            className="jarvis-hud hud-element object-contain mb-6"
            style={{ width: 120, height: 120 }}
          />
          <h1
            className="text-2xl font-semibold hud-text tracking-wider"
            style={{ color: hubTheme.primary }}
          >
            J.A.R.V.I.S.
          </h1>
          <p className="text-sm mt-1" style={{ color: hubTheme.secondary }}>
            {needsSetup ? "First Time Setup" : "Authentication Required"}
          </p>
        </div>

        <div className="hud-card rounded-lg p-6 border border-[#00D9FF]/20">
          {needsSetup === null ? (
            <div className="text-center py-4" style={{ color: hubTheme.secondary }}>
              Loading...
            </div>
          ) : needsSetup ? (
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg border border-[#00D9FF]/30 bg-[rgba(0,217,255,0.05)] text-[#00D9FF] placeholder-[#67C7EB]/50 focus:outline-none focus:border-[#00D9FF]/60 focus:bg-[rgba(0,217,255,0.08)]"
                />
              </div>
              <div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-4 py-3 rounded-lg border border-[#00D9FF]/30 bg-[rgba(0,217,255,0.05)] text-[#00D9FF] placeholder-[#67C7EB]/50 focus:outline-none focus:border-[#00D9FF]/60 focus:bg-[rgba(0,217,255,0.08)]"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full px-4 py-3 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] disabled:opacity-40 disabled:cursor-not-allowed font-medium tracking-wide transition-colors"
              >
                {loading ? "Setting up..." : "Set Password & Enter"}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg border border-[#00D9FF]/30 bg-[rgba(0,217,255,0.05)] text-[#00D9FF] placeholder-[#67C7EB]/50 focus:outline-none focus:border-[#00D9FF]/60 focus:bg-[rgba(0,217,255,0.08)]"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !password}
                className="w-full px-4 py-3 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] disabled:opacity-40 disabled:cursor-not-allowed font-medium tracking-wide transition-colors"
              >
                {loading ? "Authenticating..." : "Unlock"}
              </button>
            </form>
          )}

          {biometricAvailable && (
            <>
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-[#00D9FF]/20" />
                <span
                  className="px-3 text-xs"
                  style={{ color: hubTheme.secondary }}
                >
                  or
                </span>
                <div className="flex-1 border-t border-[#00D9FF]/20" />
              </div>
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={biometricLoading}
                className="w-full px-4 py-3 rounded-lg border border-[#00D9FF]/30 bg-transparent text-[#00D9FF] hover:bg-[rgba(0,217,255,0.1)] disabled:opacity-40 disabled:cursor-not-allowed font-medium tracking-wide transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 10v4" />
                  <path d="M7.5 8A5.5 5.5 0 0 1 18 10.5" />
                  <path d="M6 12a6.5 6.5 0 0 0 12 3.5" />
                  <path d="M4.5 15A8.5 8.5 0 0 1 8 5.5" />
                  <path d="M20 9.5a8.5 8.5 0 0 1-4 10" />
                  <path d="M2 12a10.5 10.5 0 0 1 5.5-9" />
                  <path d="M22 12a10.5 10.5 0 0 1-5.5 7.5" />
                </svg>
                {biometricLoading ? "Verifying..." : "Use Biometrics"}
              </button>
            </>
          )}

          {error && (
            <p className="text-red-400 text-sm text-center mt-4">{error}</p>
          )}
        </div>
      </main>
    </div>
  );
}
