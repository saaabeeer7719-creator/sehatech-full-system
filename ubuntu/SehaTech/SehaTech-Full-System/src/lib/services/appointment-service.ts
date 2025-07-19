import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore"
import { ref, set, push, onValue, off } from "firebase/database"
import { db, rtdb } from "@/lib/firebase"
import { API_BASE_URL } from "@/lib/config"

export interface CreateAppointmentRequest {
  patientId: string
  doctorId: string
  date: string
  time: string
  duration?: number
  type: 'consultation' | 'follow-up' | 'emergency'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  reason: string
  notes?: string
  symptoms?: string
}

export interface UpdateAppointmentRequest {
  id: string
  status?: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show'
  notes?: string
  actualStartTime?: string
  actualEndTime?: string
  diagnosis?: string
  prescription?: string
  followUpRequired?: boolean
  followUpDate?: string
}

export interface AppointmentFilters {
  doctorId?: string
  patientId?: string
  status?: string
  date?: string
  dateRange?: {
    start: string
    end: string
  }
  type?: string
  priority?: string
}

export interface TimeSlot {
  time: string
  available: boolean
  appointmentId?: string
  patientName?: string
}

export interface WaitingListEntry {
  patientId: string
  doctorId: string
  preferredDate?: string
  preferredTime?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  reason: string
  createdAt: Timestamp
}

class AppointmentService {
  private appointmentsCollection = collection(db, 'appointments')
  private patientsCollection = collection(db, 'patients')
  private doctorsCollection = collection(db, 'doctors')
  private waitingListCollection = collection(db, 'waiting_list')

  // إنشاء موعد جديد
  async createAppointment(appointmentData: CreateAppointmentRequest, createdBy: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...appointmentData, createdBy }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  // تحديث موعد
  async updateAppointment(updateData: UpdateAppointmentRequest, updatedBy: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments/${updateData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...updateData, updatedBy }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  }

  // حذف موعد
  async deleteAppointment(appointmentId: string, deletedBy: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deletedBy }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  }

  // الحصول على المواعيد مع التصفية
  async getAppointments(filters: AppointmentFilters = {}, pageSize = 20, lastDoc?: any) {
    try {
      const params = new URLSearchParams();
      for (const key in filters) {
        if (filters[key as keyof AppointmentFilters]) {
          params.append(key, filters[key as keyof AppointmentFilters] as string);
        }
      }
      if (pageSize) params.append('pageSize', pageSize.toString());
      if (lastDoc) params.append('lastDoc', JSON.stringify(lastDoc)); // Needs proper serialization

      const response = await fetch(`${API_BASE_URL}/api/appointments?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting appointments:', error);
      throw error;
    }
  }

  // التحقق من توفر الوقت
  async checkTimeSlotAvailability(doctorId: string, date: string, time: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doctorId, date, time }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.available;
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  }

  // الحصول على الأوقات المتاحة لطبيب في يوم معين
  async getAvailableTimeSlots(doctorId: string, date: string): Promise<TimeSlot[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments/available-slots?doctorId=${doctorId}&date=${date}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting available time slots:', error);
      throw error;
    }
  }

  // إضافة إلى قائمة الانتظار
  async addToWaitingList(waitingListData: Omit<WaitingListEntry, 'createdAt'>) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/waiting-list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(waitingListData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error adding to waiting list:', error);
      throw error;
    }
  }

  // إرسال التذكيرات
  async sendAppointmentReminders() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reminders/send`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error sending reminders:', error);
      throw error;
    }
  }

  // الاستماع للتحديثات الفورية (هذه الوظيفة ستبقى تستخدم Firebase Realtime Database مباشرة للمزامنة الفورية)
  subscribeToAppointmentUpdates(callback: (appointments: any[]) => void) {
    const q = query(
      this.appointmentsCollection,
      orderBy('metadata.updatedAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const appointments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(appointments);
    });
  }

  // تحديث الإحصائيات في الوقت الفعلي (هذه الوظيفة ستبقى تستخدم Firebase Realtime Database مباشرة)
  private async updateRealTimeStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // إحصائيات اليوم
      const todayQuery = query(
        this.appointmentsCollection,
        where('date', '==', today)
      );
      
      const todaySnapshot = await getDocs(todayQuery);
      const todayStats = {
        total: todaySnapshot.size,
        completed: 0,
        pending: 0,
        cancelled: 0
      };

      todaySnapshot.docs.forEach(doc => {
        const status = doc.data().status.current;
        if (status === 'completed') todayStats.completed++;
        else if (status === 'cancelled') todayStats.cancelled++;
        else todayStats.pending++;
      });

      // تحديث في Realtime Database
      await set(ref(rtdb, 'stats/appointments/today'), todayStats);
    } catch (error) {
      console.error('Error updating real-time stats:', error);
    }
  }

  // إرسال إشعار (هذه الوظيفة ستبقى تستخدم Firebase Realtime Database مباشرة)
  private async sendAppointmentNotification(appointmentId: string, type: string, status?: string) {
    try {
      const appointmentDoc = await getDoc(doc(this.appointmentsCollection, appointmentId));
      if (!appointmentDoc.exists()) return;

      const appointment = appointmentDoc.data();
      
      const notification = {
        type: `appointment_${type}`,
        appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        message: this.getNotificationMessage(type, appointment, status),
        timestamp: Date.now()
      };

      // إرسال للمريض والطبيب
      await Promise.all([
        push(ref(rtdb, `notifications/${appointment.patientId}`), notification),
        push(ref(rtdb, `notifications/${appointment.doctorId}`), notification)
      ]);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // التحقق من قائمة الانتظار عند توفر موعد
  private async checkWaitingListForAvailability(doctorId: string) {
    // تنفيذ منطق التحقق من قائمة الانتظار
    // وإشعار المرضى عند توفر مواعيد
  }

  // دوال مساعدة
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private getStatusChangeReason(status: string): string {
    const reasons = {
      confirmed: 'تأكيد الموعد',
      'in-progress': 'بدء الموعد',
      completed: 'انتهاء الموعد',
      cancelled: 'إلغاء الموعد',
      'no-show': 'عدم حضور المريض'
    };
    return reasons[status as keyof typeof reasons] || 'تحديث الحالة';
  }

  private getNotificationMessage(type: string, appointment: any, status?: string): string {
    switch (type) {
      case 'created':
        return `تم إنشاء موعد جديد مع د. ${appointment.doctorName}`;
      case 'reminder':
        return `تذكير: لديك موعد غداً مع د. ${appointment.doctorName} في ${appointment.time}`;
      case 'status_changed':
        return `تم تحديث حالة موعدك مع د. ${appointment.doctorName} إلى: ${status}`;
      default:
        return 'تحديث في موعدك';
    }
  }
}

export const appointmentService = new AppointmentService();



