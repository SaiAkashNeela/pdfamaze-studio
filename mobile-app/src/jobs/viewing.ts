import { AppState } from "react-native";

/** Which job's screen is open right now, so we don't notify about the job you're looking at. */
let viewing: string | null = null;

export function setViewingJob(id: string | null) {
  viewing = id;
}

/** True when the person can already see this job finishing on screen. */
export function isWatching(id: string): boolean {
  return AppState.currentState === "active" && viewing === id;
}
