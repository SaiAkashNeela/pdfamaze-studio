/**
 * Two notifications, both local to the phone:
 *  - "your file is ready", sent once when a job finishes;
 *  - a gentle weekly reminder, which restarts its 7-day clock every time the app is opened, so it
 *    only arrives after a quiet week. It can be switched off in Help.
 * Local only: scheduled on the phone itself, no push service, no server, no tokens.
 * Permission is asked the first time a job starts (not on launch), and a refusal is respected.
 */
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { t } from "@/i18n";
import { loadPrefs } from "@/theme/prefs";

const CHANNEL = "job-done";
const REMINDER_CHANNEL = "weekly-reminder";
const REMINDER_ID = "weekly-reminder";
const WEEK_SECONDS = 7 * 24 * 60 * 60;
let prepared = false;

/** Show the banner even while the app is open: a job may finish while you're on another screen. */
export function setUpNotifications() {
  if (prepared) return;
  prepared = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync(CHANNEL, {
      name: t("notify.channel"),
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => undefined);
    void Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: t("notify.reminderChannel"),
      importance: Notifications.AndroidImportance.LOW,
    }).catch(() => undefined);
  }
}

/** Opens the finished job when its notification is tapped. Returns an unsubscribe function. */
export function listenForTaps(): () => void {
  const open = (response: Notifications.NotificationResponse | null) => {
    const id = response?.notification.request.content.data?.["jobId"];
    if (typeof id === "string") router.push({ pathname: "/job/[id]", params: { id } });
  };
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}

/** Ask once, the first time it's useful. Never nags. */
export async function askOnce(): Promise<void> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || !current.canAskAgain) return;
    const result = await Notifications.requestPermissionsAsync();
    if (result.granted) await scheduleWeeklyReminder();
  } catch {
    // Notifications are optional; the in-app "Your files" list always works.
  }
}

/** "Your file is ready": sent once per finished job. */
export async function notifyJobDone(jobId: string, title: string): Promise<void> {
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      identifier: jobId,
      content: {
        title: t("notify.title"),
        body: t("notify.body", { tool: title }),
        data: { jobId },
      },
      trigger: Platform.OS === "android" ? { channelId: CHANNEL } : null,
    });
  } catch {
    // Optional; never let a notification problem affect the result.
  }
}

/**
 * (Re)starts the weekly reminder: one notification 7 days from now, repeating every 7 days.
 * Called on every app open, so people who use the app regularly never see it.
 */
export async function scheduleWeeklyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
    if (!loadPrefs().weeklyReminder) return;
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: { title: t("notify.reminderTitle"), body: t("notify.reminderBody") },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: WEEK_SECONDS,
        repeats: true,
        ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL } : {}),
      },
    });
  } catch {
    // Optional.
  }
}

export async function cancelWeeklyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    // Nothing scheduled.
  }
}
