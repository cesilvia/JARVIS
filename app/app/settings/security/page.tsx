"use client";

import { useState, useEffect } from "react";
import Navigation from "../../components/Navigation";
import SettingsNavIcon from "../SettingsNavIcon";
import { useRouter } from "next/navigation";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [registeringBiometric, setRegisteringBiometric] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwChanging, setPwChanging] = useState(false);
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      setBiometricSupported(true);
      fetch("/api/auth/webauthn/registered")
        .then((r) => r.json())
        .then((d) => setBiometricRegistered(d.registered))
        .catch(() => {});
    }
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage("");
    setPwError("");
    if (!currentPw || !newPw) return;
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match");
      return;
    }
    if (newPw.length < 4) {
      setPwError("New password must be at least 4 characters");
      return;
    }
    setPwChanging(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (res.ok) {
        setPwMessage("Password changed successfully!");
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      } else {
        const data = await res.json();
        setPwError(data.error || "Failed to change password");
      }
    } catch {
      setPwError("Connection failed");
    } finally {
      setPwChanging(false);
    }
  };

  const handleRegisterBiometric = async () => {
    setRegisteringBiometric(true);
    setBiometricMessage("");
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const optionsRes = await fetch("/api/auth/webauthn/register");
      if (!optionsRes.ok) throw new Error("Failed to get registration options");
      const options = await optionsRes.json();
      const credential = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });
      if (verifyRes.ok) {
        setBiometricRegistered(true);
        setBiometricMessage("Biometric registered successfully!");
      } else {
        const data = await verifyRes.json();
        setBiometricMessage(data.error || "Registration failed");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setBiometricMessage("Registration was cancelled");
      } else {
        setBiometricMessage("Registration failed");
      }
    } finally {
      setRegisteringBiometric(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Navigation />

        <h1 className="text-3xl font-bold font-mono mt-6 text-blue-400">Security</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm mb-8">
          Password, biometrics, and authentication.
        </p>

        {/* Change Password */}
        <section className="border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold font-mono text-slate-100 mb-2">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Current password"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 font-mono text-sm"
            />
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 font-mono text-sm"
            />
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 font-mono text-sm"
            />
            <button
              type="submit"
              disabled={pwChanging || !currentPw || !newPw || !confirmPw}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm transition-colors disabled:opacity-50"
            >
              {pwChanging ? "Changing..." : "Change Password"}
            </button>
            {pwMessage && <p className="text-green-400 font-mono text-xs">{pwMessage}</p>}
            {pwError && <p className="text-red-400 font-mono text-xs">{pwError}</p>}
          </form>
        </section>

        {/* Biometrics */}
        {biometricSupported && (
          <section className="border border-slate-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold font-mono text-slate-100 mb-2">Biometrics</h2>
            <p className="text-slate-400 font-mono text-sm mb-4">
              Register Touch ID or Face ID for quick authentication.
            </p>
            <button
              onClick={handleRegisterBiometric}
              disabled={registeringBiometric}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm transition-colors disabled:opacity-50"
            >
              {registeringBiometric
                ? "Registering..."
                : biometricRegistered
                ? "Re-register Biometric"
                : "Register Biometric (Touch ID / Face ID)"}
            </button>
            {biometricRegistered && (
              <p className="text-green-400 font-mono text-xs mt-2">Biometric is registered</p>
            )}
            {biometricMessage && (
              <p className={`font-mono text-xs mt-2 ${biometricMessage.includes("success") ? "text-green-400" : "text-red-400"}`}>
                {biometricMessage}
              </p>
            )}
          </section>
        )}

        {/* Log Out */}
        <section className="border border-slate-700 rounded-lg p-6">
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-red-300 font-mono text-sm transition-colors"
          >
            Log Out
          </button>
        </section>
      </div>
      <SettingsNavIcon />
    </div>
  );
}
