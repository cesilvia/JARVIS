import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

export interface StoredCredential {
  credentialID: string;
  credentialPublicKey: string; // base64url encoded
  counter: number;
  transports?: string[];
}

const DATA_DIR = join(process.cwd(), ".data");
const DATA_FILE = join(DATA_DIR, "webauthn.json");

const isVercel = !!process.env.VERCEL;

// In-memory challenge store (works on serverless because GET options
// and POST verify happen within seconds on the same instance)
const challengeStore = new Map<string, { challenge: string; expiresAt: number }>();

export async function getCredentials(): Promise<StoredCredential[]> {
  const envCreds = process.env.WEBAUTHN_CREDENTIALS;
  if (envCreds) {
    try {
      return JSON.parse(envCreds) as StoredCredential[];
    } catch {
      // fall through
    }
  }

  if (!isVercel) {
    try {
      const raw = await readFile(DATA_FILE, "utf-8");
      const data = JSON.parse(raw);
      return data.credentials || [];
    } catch {
      // no file yet
    }
  }

  return [];
}

export async function saveCredential(cred: StoredCredential): Promise<void> {
  const existing = await getCredentials();
  const idx = existing.findIndex((c) => c.credentialID === cred.credentialID);
  if (idx >= 0) {
    existing[idx] = cred;
  } else {
    existing.push(cred);
  }

  if (isVercel) {
    await saveCredentialsToVercel(existing);
  } else {
    await saveCredentialsToFile(existing);
  }

  // Also update the in-process env var so reads work immediately
  process.env.WEBAUTHN_CREDENTIALS = JSON.stringify(existing);
}

export async function updateCredentialCounter(
  credentialID: string,
  newCounter: number
): Promise<void> {
  const creds = await getCredentials();
  const cred = creds.find((c) => c.credentialID === credentialID);
  if (cred) {
    cred.counter = newCounter;
    if (isVercel) {
      await saveCredentialsToVercel(creds);
    } else {
      await saveCredentialsToFile(creds);
    }
    process.env.WEBAUTHN_CREDENTIALS = JSON.stringify(creds);
  }
}

export async function storeChallenge(
  sessionId: string,
  challenge: string
): Promise<void> {
  // Clean expired
  for (const [key, val] of challengeStore.entries()) {
    if (val.expiresAt < Date.now()) challengeStore.delete(key);
  }
  challengeStore.set(sessionId, {
    challenge,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
}

export async function getAndDeleteChallenge(
  sessionId: string
): Promise<string | null> {
  const entry = challengeStore.get(sessionId);
  if (!entry || entry.expiresAt < Date.now()) {
    challengeStore.delete(sessionId);
    return null;
  }
  challengeStore.delete(sessionId);
  return entry.challenge;
}

export async function hasRegisteredCredentials(): Promise<boolean> {
  const creds = await getCredentials();
  return creds.length > 0;
}

// --- Storage backends ---

async function saveCredentialsToFile(
  creds: StoredCredential[]
): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    DATA_FILE,
    JSON.stringify({ credentials: creds }, null, 2)
  );
}

async function saveCredentialsToVercel(
  creds: StoredCredential[]
): Promise<void> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  const token = process.env.VERCEL_DEPLOY_TOKEN;

  if (!projectId || !token) {
    console.error(
      "Cannot save WebAuthn credentials: VERCEL_PROJECT_ID or VERCEL_DEPLOY_TOKEN not set"
    );
    return;
  }

  const value = JSON.stringify(creds);
  const teamQuery = teamId ? `?teamId=${teamId}` : "";

  // Check if env var already exists
  const checkRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env${teamQuery}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (checkRes.ok) {
    const data = await checkRes.json();
    const existing = data.envs?.find(
      (e: { key: string }) => e.key === "WEBAUTHN_CREDENTIALS"
    );

    if (existing) {
      // Update existing
      await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}${teamQuery}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ value }),
        }
      );
      return;
    }
  }

  // Create new
  await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/env${teamQuery}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: "WEBAUTHN_CREDENTIALS",
        value,
        type: "encrypted",
        target: ["production"],
      }),
    }
  );
}
