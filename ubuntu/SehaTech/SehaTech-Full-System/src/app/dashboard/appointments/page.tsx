"use client"

import { useState } from "react"
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar"
import { AppointmentForm } from "@/components/appointments/appointment-form"
import { LiveQueueStatus } from "@/components/realtime/live-queue-status"
import { useRealTimeAppointments } from "@/hooks/use-realtime-appointments"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar,
  Clock,
  Users,
  Plus,
  Filter,
  Download,
  Settings
} from "lucide-react"

// بيانات تجريبية
const mockAppointments = [
  {
    id: "1",
    patientName: "أحمد محمد علي",
    doctorName: "د. فاطمة أحمد",
    doctorSpecialty: "طب الأطفال",
    time: "2024-01-15T09:00:00",
    status: "confirmed" as const,
    type: "consultation" as const,
    priority: "medium" as const
  },
  {
    id: "2", 
    patientName: "سارة محمود",
    doctorName: "د. محمد حسن",
    doctorSpecialty: "الطب العام",
    time: "2024-01-15T10:30:00",
    status: "scheduled" as const,
    type: "follow-up" as const,
    priority: "low" as const
  },
  {
    id: "3",
    patientName: "عبدالله خالد",
    doctorName: "د. أحمد علي",
    doctorSpecialty: "القلب",
    time: "2024-01-15T14:00:00",
    status: "in-progress" as const,
    type: "emergency" as const,
    priority: "urgent" as const
  }
]

const mockPatients = [
  {
    id: "p1",
    name: "أحمد محمد علي",
    phone: "0501234567",
    lastVisit: "2024-01-10"
  },
  {
    id: "p2",
    name: "فاطمة أحمد حسن", 
    phone: "0507654321",
    lastVisit: "2024-01-08"
  },
  {
    id: "p3",
    name: "محمد عبدالله",
    phone: "0509876543"
  }
]

const mockDoctors = [
  {
    id: "d1",
    name: "د. فاطمة أحمد",
    specialty: "طب الأطفال",
    consultationFee: 150,
    availableSlots: ["09:00", "10:00", "11:00"],
    nextAvailable: "غداً 09:00"
  },
  {
    id: "d2",
    name: "د. محمد حسن",
    specialty: "الطب العام", 
    consultationFee: 120,
    availableSlots: ["08:30", "09:30", "10:30"],
    nextAvailable: "اليوم 15:00"
  },
  {
    id: "d3",
    name: "د. أحمد علي",
    specialty: "القلب",
    consultationFee: 200,
    availableSlots: ["14:00", "15:00", "16:00"],
    nextAvailable: "بعد غد 14:00"
  }
]

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("calendar")

  const {
    appointments,
    loading,
    stats,
    createAppointment,
    updateAppointment,
    deleteAppointment
  } = useRealTimeAppointments({
    autoRefresh: true,
    enableNotifications: true
  })

  const handleAppointmentSelect = (appointment: any) => {
    setSelectedAppointment(appointment)
    setShowAppointmentForm(true)
  }

  const handleNewAppointment = (date: Date) => {
    setSelectedDate(date)
    setSelectedAppointment(null)
    setShowAppointmentForm(true)
  }

  const handleAppointmentSubmit = async (data: any) => {
    try {
      if (selectedAppointment) {
        await updateAppointment(selectedAppointment.id, data)
      } else {
        await createAppointment(data)
      }
      setShowAppointmentForm(false)
      setSelectedAppointment(null)
    } catch (error) {
      console.error('Error submitting appointment:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-right">إدارة المواعيد</h1>
          <p className="text-muted-foreground text-right">
            إدارة وجدولة المواعيد مع المزامنة الفورية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 ml-2" />
            فلترة
          </Button>
          <Button onClick={() => handleNewAppointment(new Date())}>
            <Plus className="h-4 w-4 ml-2" />
            موعد جديد
          </Button>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">إجمالي المواعيد</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right">{stats.total}</div>
            <p className="text-xs text-muted-foreground text-right">
              +12% من الأسبوع الماضي
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">مؤكدة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right">{stats.confirmed}</div>
            <p className="text-xs text-muted-foreground text-right">
              {stats.scheduled} في الانتظار
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">جارية</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground text-right">
              {stats.completed} مكتملة اليوم
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">معدل الإكمال</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-right">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {stats.cancelled} ملغية
            </p>
          </CardContent>
        </Card>
      </div>

      {/* المحتوى الرئيسي */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">التقويم</TabsTrigger>
          <TabsTrigger value="queue">الطابور</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <AppointmentCalendar
            appointments={mockAppointments}
            onAppointmentSelect={handleAppointmentSelect}
            onDateSelect={setSelectedDate}
            onNewAppointment={handleNewAppointment}
          />
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <LiveQueueStatus
            doctorId="d1"
            onPatientCall={(patientId) => console.log('Call patient:', patientId)}
            onNextPatient={() => console.log('Next patient')}
            onPauseQueue={() => console.log('Pause queue')}
            onResumeQueue={() => console.log('Resume queue')}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-right">المواعيد هذا الأسبوع</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">الأحد</span>
                    <Badge variant="outline">12 موعد</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">الاثنين</span>
                    <Badge variant="outline">15 موعد</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">الثلاثاء</span>
                    <Badge variant="outline">18 موعد</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">الأربعاء</span>
                    <Badge variant="outline">14 موعد</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">الخميس</span>
                    <Badge variant="outline">16 موعد</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-right">الأطباء الأكثر نشاطاً</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">د. فاطمة أحمد</span>
                    <Badge>25 موعد</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">د. محمد حسن</span>
                    <Badge>22 موعد</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">د. أحمد علي</span>
                    <Badge>18 موعد</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* نموذج الموعد */}
      <AppointmentForm
        open={showAppointmentForm}
        onOpenChange={setShowAppointmentForm}
        selectedDate={selectedDate}
        patients={mockPatients}
        doctors={mockDoctors}
        onSubmit={handleAppointmentSubmit}
        editingAppointment={selectedAppointment}
      />
    </div>
  )
}

