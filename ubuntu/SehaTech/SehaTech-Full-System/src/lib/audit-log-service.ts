
'use server';

import { db } from './firebase';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import type { UserRole } from './types';

const sectionMap: { [key: string]: string } = {
  'إضافة مريض': 'المرضى',
  'تعديل مريض': 'المرضى',
  'حذف مريض': 'المرضى',
  'إضافة طبيب': 'الأطباء',
  'تعديل طبيب': 'الأطباء',
  'حذف طبيب': 'الأطباء',
  'إنشاء موعد': 'المواعيد',
  'تحديث حالة موعد': 'المواعيد',
  'إنشاء فاتورة (يدوي)': 'الفواتير',
  'إنشاء فاتورة (تلقائي)': 'الفواتير',
  'إضافة مستخدم': 'المستخدمون',
  'تعديل مستخدم': 'المستخدمون',
  'حذف مستخدم': 'المستخدمون',
  'تحديث الصلاحيات': 'الإعدادات',
  'تحديث الإعدادات العامة': 'الإعدادات',
};


export async function logAuditEvent(
  action: string,
  details: Record<string, any>,
  userId: string
) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error(`User with ID ${userId} not found.`);
    }
    const userData = userDoc.data();

    await addDoc(collection(db, 'auditLogs'), {
      userId: userId,
      action: action,
      details: details,
      section: sectionMap[action] || 'عام',
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error logging audit event:', error);
    // Optionally, you could re-throw the error or handle it as needed
  }
}
