import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, where } from "firebase/firestore";

export interface Notification {
  id?: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: string;
  actionUrl?: string;
  data?: Record<string, any>;
}

export const getNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(50)
  );
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = [];
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() as Omit<Notification, 'id'> });
    });
    callback(notifications);
  });
  return unsubscribe;
};

export const addNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
  await addDoc(collection(db, "notifications"), {
    ...notification,
    timestamp: new Date(),
    read: false,
  });
};

export const markNotificationAsRead = async (notificationId: string) => {
  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, {
    read: true,
  });
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("read", "==", false)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.forEach((doc) => {
    batch.update(doc.ref, { read: true });
  });
  await batch.commit();
};

import { getDocs, writeBatch } from "firebase/firestore";