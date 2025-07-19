"use client"

import { useState, useEffect, useCallback } from "react"
import { appointmentService } from "@/lib/services/appointment-service"
import { realTimeService } from "@/lib/services/realtime-service"
import { useToast } from "@/hooks/use-toast"

export interface UseRealTimeAppointmentsOptions {
  doctorId?: string
  patientId?: string
  date?: string
  autoRefresh?: boolean
  enableNotifications?: boolean
}

export interface AppointmentUpdate {
  type: 'created' | 'updated' | 'deleted'
  appointment: any
  timestamp: number
}

export function useRealTimeAppointments(options: UseRealTimeAppointmentsOptions = {}) {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const { toast } = useToast()

  // تحميل المواعيد الأولية
  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const filters = {
        doctorId: options.doctorId,
        patientId: options.patientId,
        date: options.date
      }

      const result = await appointmentService.getAppointments(filters)
      setAppointments(result.appointments)
      setLastUpdate(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ في تحميل المواعيد'
      setError(errorMessage)
      console.error('Error loading appointments:', err)
    } finally {
      setLoading(false)
    }
  }, [options.doctorId, options.patientId, options.date])

  // معالجة التحديثات الفورية
  const handleAppointmentUpdate = useCallback((update: AppointmentUpdate) => {
    setAppointments(prev => {
      let updated = [...prev]

      switch (update.type) {
        case 'created':
          // إضافة موعد جديد
          updated.unshift(update.appointment)
          if (options.enableNotifications) {
            toast({
              title: "موعد جديد",
              description: `تم إضافة موعد جديد للمريض ${update.appointment.patientName}`,
              duration: 5000
            })
          }
          break

        case 'updated':
          // تحديث موعد موجود
          const updateIndex = updated.findIndex(apt => apt.id === update.appointment.id)
          if (updateIndex !== -1) {
            updated[updateIndex] = { ...updated[updateIndex], ...update.appointment }
            if (options.enableNotifications) {
              toast({
                title: "تحديث موعد",
                description: `تم تحديث موعد المريض ${update.appointment.patientName}`,
                duration: 3000
              })
            }
          }
          break

        case 'deleted':
          // حذف موعد
          updated = updated.filter(apt => apt.id !== update.appointment.id)
          if (options.enableNotifications) {
            toast({
              title: "حذف موعد",
              description: `تم حذف موعد المريض ${update.appointment.patientName}`,
              variant: "destructive",
              duration: 3000
            })
          }
          break
      }

      return updated
    })

    setLastUpdate(new Date())
  }, [options.enableNotifications, toast])

  // الاستماع للتحديثات الفورية
  useEffect(() => {
    if (!options.autoRefresh) return

    const unsubscribe = appointmentService.subscribeToAppointmentUpdates((updatedAppointments) => {
      // تطبيق الفلاتر على التحديثات
      let filteredAppointments = updatedAppointments

      if (options.doctorId) {
        filteredAppointments = filteredAppointments.filter(apt => apt.doctorId === options.doctorId)
      }

      if (options.patientId) {
        filteredAppointments = filteredAppointments.filter(apt => apt.patientId === options.patientId)
      }

      if (options.date) {
        filteredAppointments = filteredAppointments.filter(apt => apt.date === options.date)
      }

      setAppointments(filteredAppointments)
      setLastUpdate(new Date())
    })

    return unsubscribe
  }, [options.autoRefresh, options.doctorId, options.patientId, options.date])

  // الاستماع للتحديثات الفورية من realTimeService
  useEffect(() => {
    if (!options.enableNotifications) return

    const unsubscribe = realTimeService.subscribeToLiveUpdates((updates) => {
      updates.forEach(update => {
        if (update.type === 'appointment_update') {
          handleAppointmentUpdate({
            type: update.action as 'created' | 'updated' | 'deleted',
            appointment: update.data,
            timestamp: update.timestamp
          })
        }
      })
    })

    return unsubscribe
  }, [options.enableNotifications, handleAppointmentUpdate])

  // تحميل البيانات عند التهيئة
  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  // إنشاء موعد جديد
  const createAppointment = useCallback(async (appointmentData: any) => {
    try {
      const newAppointment = await appointmentService.createAppointment(appointmentData, 'current-user')
      
      // إرسال تحديث فوري
      await realTimeService.sendLiveUpdate({
        type: 'appointment_update',
        entityId: newAppointment.id,
        action: 'created',
        data: newAppointment,
        userId: 'current-user'
      })

      return newAppointment
    } catch (error) {
      console.error('Error creating appointment:', error)
      throw error
    }
  }, [])

  // تحديث موعد
  const updateAppointment = useCallback(async (appointmentId: string, updateData: any) => {
    try {
      const updatedAppointment = await appointmentService.updateAppointment({
        id: appointmentId,
        ...updateData
      }, 'current-user')

      // إرسال تحديث فوري
      await realTimeService.sendLiveUpdate({
        type: 'appointment_update',
        entityId: appointmentId,
        action: 'updated',
        data: updatedAppointment,
        userId: 'current-user'
      })

      return updatedAppointment
    } catch (error) {
      console.error('Error updating appointment:', error)
      throw error
    }
  }, [])

  // حذف موعد
  const deleteAppointment = useCallback(async (appointmentId: string) => {
    try {
      await appointmentService.deleteAppointment(appointmentId, 'current-user')

      // إرسال تحديث فوري
      await realTimeService.sendLiveUpdate({
        type: 'appointment_update',
        entityId: appointmentId,
        action: 'deleted',
        data: { id: appointmentId },
        userId: 'current-user'
      })

      return true
    } catch (error) {
      console.error('Error deleting appointment:', error)
      throw error
    }
  }, [])

  // تحديث حالة الموعد
  const updateAppointmentStatus = useCallback(async (appointmentId: string, status: string) => {
    return updateAppointment(appointmentId, { status })
  }, [updateAppointment])

  // الحصول على الأوقات المتاحة
  const getAvailableTimeSlots = useCallback(async (doctorId: string, date: string) => {
    try {
      return await appointmentService.getAvailableTimeSlots(doctorId, date)
    } catch (error) {
      console.error('Error getting available time slots:', error)
      throw error
    }
  }, [])

  // إعادة تحميل البيانات
  const refresh = useCallback(() => {
    loadAppointments()
  }, [loadAppointments])

  // إحصائيات المواعيد
  const stats = {
    total: appointments.length,
    scheduled: appointments.filter(apt => apt.status?.current === 'scheduled').length,
    confirmed: appointments.filter(apt => apt.status?.current === 'confirmed').length,
    inProgress: appointments.filter(apt => apt.status?.current === 'in-progress').length,
    completed: appointments.filter(apt => apt.status?.current === 'completed').length,
    cancelled: appointments.filter(apt => apt.status?.current === 'cancelled').length
  }

  return {
    // البيانات
    appointments,
    loading,
    error,
    lastUpdate,
    stats,

    // الإجراءات
    createAppointment,
    updateAppointment,
    deleteAppointment,
    updateAppointmentStatus,
    getAvailableTimeSlots,
    refresh,

    // معلومات إضافية
    isRealTime: options.autoRefresh || false,
    hasNotifications: options.enableNotifications || false
  }
}

// Hook مخصص لموعد واحد
export function useRealTimeAppointment(appointmentId: string) {
  const [appointment, setAppointment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!appointmentId) return

    // تحميل الموعد الأولي
    const loadAppointment = async () => {
      try {
        setLoading(true)
        // يمكن إضافة دالة getAppointmentById إلى appointmentService
        // const apt = await appointmentService.getAppointmentById(appointmentId)
        // setAppointment(apt)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ')
      } finally {
        setLoading(false)
      }
    }

    loadAppointment()

    // الاستماع للتحديثات الفورية
    const unsubscribe = realTimeService.subscribeToLiveUpdates((updates) => {
      updates.forEach(update => {
        if (update.type === 'appointment_update' && update.entityId === appointmentId) {
          setAppointment(update.data)
        }
      })
    })

    return unsubscribe
  }, [appointmentId])

  return {
    appointment,
    loading,
    error
  }
}

// Hook لإحصائيات المواعيد الفورية
export function useRealTimeAppointmentStats(doctorId?: string) {
  const [stats, setStats] = useState({
    today: { total: 0, completed: 0, pending: 0, cancelled: 0 },
    thisWeek: { total: 0, completed: 0, pending: 0, cancelled: 0 },
    thisMonth: { total: 0, completed: 0, pending: 0, cancelled: 0 }
  })

  useEffect(() => {
    const unsubscribe = realTimeService.subscribeToRealTimeStats((statsData) => {
      if (doctorId) {
        // فلترة الإحصائيات للطبيب المحدد
        setStats(statsData.doctors?.[doctorId] || stats)
      } else {
        // الإحصائيات العامة
        setStats(statsData.appointments || stats)
      }
    })

    return unsubscribe
  }, [doctorId])

  return stats
}

