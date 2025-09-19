// Minimal PII crypto helpers (browser AES-GCM). Keys are NOT stored here.
// We resolve key material per tenant at runtime from a KMS/secret manager via IgniteConfig hooks.
import { getPiiKeyInfo } from "../IgniteConfig";

// Utility to derive CryptoKey from raw key bytes (Uint8Array)
async function importAesGcmKey(rawBytes) {
  return await crypto.subtle.importKey("raw", rawBytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptPii({ tenantId, plaintext }) {
  // ⚠ Placeholder key resolution: replace with secure retrieval (e.g., HTTPS function).
  const { keyRef } = getPiiKeyInfo(tenantId);
  if (!keyRef) throw new Error("PII key not configured for tenant");
  // Demo only: derive bytes from keyRef hash; DO NOT ship this to prod unchanged.
  const enc = new TextEncoder();
  const keyBytes = await crypto.subtle.digest("SHA-256", enc.encode(keyRef));
  const key = await importAesGcmKey(new Uint8Array(keyBytes));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  return { iv: Array.from(iv), ct: Array.from(new Uint8Array(ct)) }; // store as arrays in Firestore
}

export async function decryptPii({ tenantId, iv, ct }) {
  const { keyRef } = getPiiKeyInfo(tenantId);
  if (!keyRef) throw new Error("PII key not configured for tenant");
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const keyBytes = await crypto.subtle.digest("SHA-256", enc.encode(keyRef));
  const key = await importAesGcmKey(new Uint8Array(keyBytes));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(ct)
  );
  return dec.decode(pt);
}
