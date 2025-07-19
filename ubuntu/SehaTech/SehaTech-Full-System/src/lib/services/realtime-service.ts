import { ref, set, push, onValue, off, serverTimestamp, onDisconnect } from "firebase/database"
import { rtdb } from "@/lib/firebase"

export interface UserPresence {
  state: 'online' | 'offline'
  last_changed: number
  current_session?: string
  device_info?: {
    type: 'desktop' | 'mobile' | 'tablet'
    browser?: string
    os?: string
  }
}

export interface LiveUpdate {
  type: 'appointment_update' | 'patient_update' | 'doctor_update' | 'system_update'
  entityId: string
  action: 'created' | 'updated' | 'deleted'
  data: any
  timestamp: number
  userId: string
}

export interface NotificationData {
  id: string
  type: 'appointment_reminder' | 'appointment_update' | 'system_alert' | 'patient_update' | 'payment_received'
  title: string
  message: string
  timestamp: number
  read: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  data?: Record<string, any>
}

export interface QueueStatus {
  doctorId: string
  currentPatient?: string
  queueLength: number
  estimatedWaitTime: number
  nextPatients: Array<{
    patientId: string
    patientName: string
    appointmentTime: string
    estimatedTime: string
  }>
}

class RealTimeService {
  private presenceRef = ref(rtdb, 'presence')
  private updatesRef = ref(rtdb, 'live_updates')
  private notificationsRef = ref(rtdb, 'notifications')
  private queueRef = ref(rtdb, 'queue_status')
  private statsRef = ref(rtdb, 'stats')

  // إدارة حضور المستخدمين
  async setUserPresence(userId: string, isOnline: boolean, deviceInfo?: UserPresence['device_info']) {
    try {
      const userPresenceRef = ref(rtdb, `presence/${userId}`)
      const presenceData: UserPresence = {
        state: isOnline ? 'online' : 'offline',
        last_changed: Date.now(),
        current_session: isOnline ? this.generateSessionId() : undefined,
        device_info: deviceInfo
      }

      await set(userPresenceRef, presenceData)

      if (isOnline) {
        // إعداد قطع الاتصال التلقائي
        const disconnectRef = onDisconnect(userPresenceRef)
        await disconnectRef.set({
          state: 'offline',
          last_changed: serverTimestamp(),
          current_session: null
        })
      }

      return presenceData
    } catch (error) {
      console.error('Error setting user presence:', error)
      throw error
    }
  }

  // الاستماع لحضور المستخدمين
  subscribeToUserPresence(callback: (users: Record<string, UserPresence>) => void) {
    const unsubscribe = onValue(this.presenceRef, (snapshot) => {
      const presence = snapshot.val() || {}
      callback(presence)
    })

    return () => off(this.presenceRef, 'value', unsubscribe)
  }

  // إرسال تحديث فوري
  async sendLiveUpdate(update: Omit<LiveUpdate, 'timestamp'>) {
    try {
      const updateData: LiveUpdate = {
        ...update,
        timestamp: Date.now()
      }

      await push(this.updatesRef, updateData)

      // إرسال إشعار للمستخدمين المعنيين
      await this.notifyRelevantUsers(updateData)

      return updateData
    } catch (error) {
      console.error('Error sending live update:', error)
      throw error
    }
  }

  // الاستماع للتحديثات الفورية
  subscribeToLiveUpdates(callback: (updates: LiveUpdate[]) => void) {
    const unsubscribe = onValue(this.updatesRef, (snapshot) => {
      const updates: LiveUpdate[] = []
      snapshot.forEach((child) => {
        updates.push({
          id: child.key,
          ...child.val()
        })
      })
      
      // ترتيب حسب الوقت (الأحدث أولاً)
      updates.sort((a, b) => b.timestamp - a.timestamp)
      
      callback(updates.slice(0, 50)) // آخر 50 تحديث
    })

    return () => off(this.updatesRef, 'value', unsubscribe)
  }

  // إرسال إشعار
  async sendNotification(userId: string, notification: Omit<NotificationData, 'id' | 'timestamp'>) {
    try {
      const notificationData: NotificationData = {
        ...notification,
        id: this.generateNotificationId(),
        timestamp: Date.now()
      }

      const userNotificationsRef = ref(rtdb, `notifications/${userId}`)
      await push(userNotificationsRef, notificationData)

      // تحديث عداد الإشعارات غير المقروءة
      await this.updateUnreadCount(userId)

      return notificationData
    } catch (error) {
      console.error('Error sending notification:', error)
      throw error
    }
  }

  // إرسال إشعار جماعي
  async sendBulkNotification(userIds: string[], notification: Omit<NotificationData, 'id' | 'timestamp'>) {
    try {
      const promises = userIds.map(userId => 
        this.sendNotification(userId, notification)
      )
      
      await Promise.all(promises)
      return true
    } catch (error) {
      console.error('Error sending bulk notification:', error)
      throw error
    }
  }

  // الاستماع لإشعارات المستخدم
  subscribeToUserNotifications(userId: string, callback: (notifications: NotificationData[]) => void) {
    const userNotificationsRef = ref(rtdb, `notifications/${userId}`)
    
    const unsubscribe = onValue(userNotificationsRef, (snapshot) => {
      const notifications: NotificationData[] = []
      snapshot.forEach((child) => {
        notifications.push({
          id: child.key,
          ...child.val()
        })
      })
      
      // ترتيب حسب الوقت (الأحدث أولاً)
      notifications.sort((a, b) => b.timestamp - a.timestamp)
      
      callback(notifications)
    })

    return () => off(userNotificationsRef, 'value', unsubscribe)
  }

  // تحديد إشعار كمقروء
  async markNotificationAsRead(userId: string, notificationId: string) {
    try {
      const notificationRef = ref(rtdb, `notifications/${userId}/${notificationId}`)
      await set(notificationRef, { read: true })
      
      // تحديث عداد الإشعارات غير المقروءة
      await this.updateUnreadCount(userId)
      
      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  // تحديد جميع الإشعارات كمقروءة
  async markAllNotificationsAsRead(userId: string) {
    try {
      const userNotificationsRef = ref(rtdb, `notifications/${userId}`)
      const snapshot = await new Promise<any>((resolve) => {
        onValue(userNotificationsRef, resolve, { onlyOnce: true })
      })

      const updates: Record<string, any> = {}
      snapshot.forEach((child: any) => {
        updates[`${child.key}/read`] = true
      })

      if (Object.keys(updates).length > 0) {
        await set(userNotificationsRef, updates)
      }

      // تحديث عداد الإشعارات غير المقروءة
      await this.updateUnreadCount(userId)

      return true
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  // تحديث حالة الطابور
  async updateQueueStatus(queueStatus: QueueStatus) {
    try {
      const queueRef = ref(rtdb, `queue_status/${queueStatus.doctorId}`)
      await set(queueRef, {
        ...queueStatus,
        lastUpdated: Date.now()
      })

      // إرسال تحديث فوري
      await this.sendLiveUpdate({
        type: 'system_update',
        entityId: queueStatus.doctorId,
        action: 'updated',
        data: queueStatus,
        userId: 'system'
      })

      return true
    } catch (error) {
      console.error('Error updating queue status:', error)
      throw error
    }
  }

  // الاستماع لحالة الطابور
  subscribeToQueueStatus(doctorId: string, callback: (queueStatus: QueueStatus | null) => void) {
    const queueRef = ref(rtdb, `queue_status/${doctorId}`)
    
    const unsubscribe = onValue(queueRef, (snapshot) => {
      const queueStatus = snapshot.val()
      callback(queueStatus)
    })

    return () => off(queueRef, 'value', unsubscribe)
  }

  // تحديث الإحصائيات الفورية
  async updateRealTimeStats(statsData: Record<string, any>) {
    try {
      await set(this.statsRef, {
        ...statsData,
        lastUpdated: Date.now()
      })

      return true
    } catch (error) {
      console.error('Error updating real-time stats:', error)
      throw error
    }
  }

  // الاستماع للإحصائيات الفورية
  subscribeToRealTimeStats(callback: (stats: Record<string, any>) => void) {
    const unsubscribe = onValue(this.statsRef, (snapshot) => {
      const stats = snapshot.val() || {}
      callback(stats)
    })

    return () => off(this.statsRef, 'value', unsubscribe)
  }

  // مزامنة البيانات عبر الأجهزة
  async syncUserData(userId: string, data: Record<string, any>) {
    try {
      const userSyncRef = ref(rtdb, `user_sync/${userId}`)
      await set(userSyncRef, {
        ...data,
        lastSync: Date.now(),
        deviceId: this.getDeviceId()
      })

      return true
    } catch (error) {
      console.error('Error syncing user data:', error)
      throw error
    }
  }

  // الاستماع لمزامنة البيانات
  subscribeToUserDataSync(userId: string, callback: (data: Record<string, any>) => void) {
    const userSyncRef = ref(rtdb, `user_sync/${userId}`)
    
    const unsubscribe = onValue(userSyncRef, (snapshot) => {
      const data = snapshot.val() || {}
      
      // تجاهل التحديثات من نفس الجهاز
      if (data.deviceId !== this.getDeviceId()) {
        callback(data)
      }
    })

    return () => off(userSyncRef, 'value', unsubscribe)
  }

  // إرسال رسالة فورية
  async sendInstantMessage(fromUserId: string, toUserId: string, message: string) {
    try {
      const messageData = {
        from: fromUserId,
        to: toUserId,
        message,
        timestamp: Date.now(),
        read: false
      }

      const messagesRef = ref(rtdb, `messages/${toUserId}`)
      await push(messagesRef, messageData)

      // إرسال إشعار
      await this.sendNotification(toUserId, {
        type: 'system_alert',
        title: 'رسالة جديدة',
        message: `رسالة جديدة من ${fromUserId}`,
        read: false,
        priority: 'medium',
        data: { messageId: messageData }
      })

      return messageData
    } catch (error) {
      console.error('Error sending instant message:', error)
      throw error
    }
  }

  // تنظيف البيانات القديمة
  async cleanupOldData() {
    try {
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 أيام

      // تنظيف التحديثات القديمة
      const updatesSnapshot = await new Promise<any>((resolve) => {
        onValue(this.updatesRef, resolve, { onlyOnce: true })
      })

      const updatesToDelete: string[] = []
      updatesSnapshot.forEach((child: any) => {
        if (child.val().timestamp < cutoffTime) {
          updatesToDelete.push(child.key)
        }
      })

      // حذف التحديثات القديمة
      for (const updateId of updatesToDelete) {
        const updateRef = ref(rtdb, `live_updates/${updateId}`)
        await set(updateRef, null)
      }

      return {
        deletedUpdates: updatesToDelete.length
      }
    } catch (error) {
      console.error('Error cleaning up old data:', error)
      throw error
    }
  }

  // دوال مساعدة خاصة
  private async notifyRelevantUsers(update: LiveUpdate) {
    // تحديد المستخدمين المعنيين بالتحديث وإرسال إشعارات لهم
    const relevantUsers = await this.getRelevantUsers(update)
    
    for (const userId of relevantUsers) {
      await this.sendNotification(userId, {
        type: 'system_alert',
        title: this.getUpdateTitle(update),
        message: this.getUpdateMessage(update),
        read: false,
        priority: 'medium',
        data: { update }
      })
    }
  }

  private async getRelevantUsers(update: LiveUpdate): Promise<string[]> {
    // منطق تحديد المستخدمين المعنيين بناءً على نوع التحديث
    const users: string[] = []
    
    switch (update.type) {
      case 'appointment_update':
        // إشعار المريض والطبيب
        if (update.data.patientId) users.push(update.data.patientId)
        if (update.data.doctorId) users.push(update.data.doctorId)
        break
      case 'system_update':
        // إشعار جميع المستخدمين النشطين
        // يمكن تحسين هذا لاحقاً
        break
    }
    
    return users
  }

  private getUpdateTitle(update: LiveUpdate): string {
    switch (update.type) {
      case 'appointment_update':
        return 'تحديث موعد'
      case 'patient_update':
        return 'تحديث مريض'
      case 'doctor_update':
        return 'تحديث طبيب'
      default:
        return 'تحديث النظام'
    }
  }

  private getUpdateMessage(update: LiveUpdate): string {
    switch (update.action) {
      case 'created':
        return 'تم إنشاء عنصر جديد'
      case 'updated':
        return 'تم تحديث العنصر'
      case 'deleted':
        return 'تم حذف العنصر'
      default:
        return 'تم تحديث البيانات'
    }
  }

  private async updateUnreadCount(userId: string) {
    try {
      const userNotificationsRef = ref(rtdb, `notifications/${userId}`)
      const snapshot = await new Promise<any>((resolve) => {
        onValue(userNotificationsRef, resolve, { onlyOnce: true })
      })

      let unreadCount = 0
      snapshot.forEach((child: any) => {
        if (!child.val().read) {
          unreadCount++
        }
      })

      const unreadCountRef = ref(rtdb, `unread_counts/${userId}`)
      await set(unreadCountRef, unreadCount)

      return unreadCount
    } catch (error) {
      console.error('Error updating unread count:', error)
      throw error
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getDeviceId(): string {
    // إنشاء معرف فريد للجهاز
    let deviceId = localStorage.getItem('deviceId')
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('deviceId', deviceId)
    }
    return deviceId
  }
}

export const realTimeService = new RealTimeService()

