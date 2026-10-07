/**
 * Web globals the PDF libraries expect. Expo already installs TextEncoder/TextDecoder;
 * crypto.getRandomValues (used for encryption file IDs and owner passwords) comes from expo-crypto.
 */
import { getRandomValues } from "expo-crypto";

const g = globalThis as { crypto?: { getRandomValues?: unknown } };
if (!g.crypto) g.crypto = {};
if (typeof g.crypto.getRandomValues !== "function") g.crypto.getRandomValues = getRandomValues;
