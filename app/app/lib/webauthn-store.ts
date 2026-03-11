import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

export interface StoredCredential {
  credentialID: string;
  credentialPublicKey: string; // base64url encoded
  counter: number;
  transports?: string[];
}

interface WebAuthnData {
  credentials: StoredCredential[];
  challenges: Record<string, { challenge: string; expiresAt: number }>;
}

const DATA_DIR = join(process.cwd(), ".data");
const DATA_FILE = join(DATA_DIR, "webauthn.json");

async function readData(): Promise<WebAuthnData> {
  // Check env var first (for production/Vercel)
  const envCreds = process.env.WEBAUTHN_CREDENTIALS;
  if (envCreds) {
    try {
      const credentials = JSON.parse(envCreds) as StoredCredential[];
      return { credentials, challenges: {} };
    } catch {
      // fall through to file
    }
  }

  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { credentials: [], challenges: {} };
  }
}

async function writeData(data: WebAuthnData): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function getCredentials(): Promise<StoredCredential[]> {
  const data = await readData();
  return data.credentials;
}

export async function saveCredential(cred: StoredCredential): Promise<void> {
  const data = await readData();
  const existing = data.credentials.findIndex(
    (c) => c.credentialID === cred.credentialID
  );
  if (existing >= 0) {
    data.credentials[existing] = cred;
  } else {
    data.credentials.push(cred);
  }
  await writeData(data);
}

export async function updateCredentialCounter(
  credentialID: string,
  newCounter: number
): Promise<void> {
  const data = await readData();
  const cred = data.credentials.find((c) => c.credentialID === credentialID);
  if (cred) {
    cred.counter = newCounter;
    await writeData(data);
  }
}

export async function storeChallenge(
  sessionId: string,
  challenge: string
): Promise<void> {
  const data = await readData();
  data.challenges[sessionId] = {
    challenge,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  };
  // Clean expired challenges
  for (const [key, val] of Object.entries(data.challenges)) {
    if (val.expiresAt < Date.now()) delete data.challenges[key];
  }
  await writeData(data);
}

export async function getAndDeleteChallenge(
  sessionId: string
): Promise<string | null> {
  const data = await readData();
  const entry = data.challenges[sessionId];
  if (!entry || entry.expiresAt < Date.now()) {
    delete data.challenges[sessionId];
    await writeData(data);
    return null;
  }
  const challenge = entry.challenge;
  delete data.challenges[sessionId];
  await writeData(data);
  return challenge;
}

export async function hasRegisteredCredentials(): Promise<boolean> {
  const creds = await getCredentials();
  return creds.length > 0;
}
