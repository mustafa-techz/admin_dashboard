export const CHAT_NOTIFICATION_SOUND_PATH = "/sounds/notification.wav";
export const CHAT_NOTIFICATION_ICON_PATH = "/window.svg";

export const canUseBrowserNotifications = () =>
  typeof window !== "undefined" && "Notification" in window;

export const requestChatNotificationPermission = async () => {
  if (!canUseBrowserNotifications()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;

  return Notification.requestPermission();
};
