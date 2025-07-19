"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  CalendarDays, 
  Clock, 
  User, 
  Stethoscope,
  Plus,
  Filter,
  Search
} from "lucide-react"
import { format, isSameDay, parseISO } from "date-fns"
import { ar } from "date-fns/locale"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Appointment {
  id: string
  patientName: string
  doctorName: string
  doctorSpecialty: string
  time: string
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
  type: 'consultation' | 'follow-up' | 'emergency'
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

interface AppointmentCalendarProps {
  appointments: Appointment[]
  onAppointmentSelect?: (appointment: Appointment) => void
  onDateSelect?: (date: Date) => void
  onNewAppointment?: (date: Date) => void
}

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-green-100 text-green-800 border-green-200", 
  'in-progress': "bg-yellow-100 text-yellow-800 border-yellow-200",
  completed: "bg-gray-100 text-gray-800 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200"
}

const priorityColors = {
  low: "border-l-gray-300",
  medium: "border-l-blue-400",
  high: "border-l-orange-400", 
  urgent: "border-l-red-500"
}

const statusLabels = {
  scheduled: "مجدول",
  confirmed: "مؤكد",
  'in-progress': "جاري",
  completed: "مكتمل",
  cancelled: "ملغي"
}

export function AppointmentCalendar({ 
  appointments, 
  onAppointmentSelect,
  onDateSelect,
  onNewAppointment 
}: AppointmentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [doctorFilter, setDoctorFilter] = useState<string>("all")

  // تصفية المواعيد حسب التاريخ المحدد
  const selectedDateAppointments = appointments.filter(apt => {
    const aptDate = parseISO(apt.time.split('T')[0])
    return isSameDay(aptDate, selectedDate)
  })

  // تطبيق الفلاتر
  const filteredAppointments = selectedDateAppointments.filter(apt => {
    const matchesSearch = apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apt.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || apt.status === statusFilter
    const matchesDoctor = doctorFilter === "all" || apt.doctorName === doctorFilter
    
    return matchesSearch && matchesStatus && matchesDoctor
  })

  // الحصول على قائمة الأطباء الفريدة
  const uniqueDoctors = Array.from(new Set(appointments.map(apt => apt.doctorName)))

  // الحصول على الأيام التي تحتوي على مواعيد
  const appointmentDates = appointments.map(apt => parseISO(apt.time.split('T')[0]))

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      onDateSelect?.(date)
    }
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    onAppointmentSelect?.(appointment)
  }

  const handleNewAppointment = () => {
    onNewAppointment?.(selectedDate)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* التقويم */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <CalendarDays className="h-5 w-5" />
            التقويم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            locale={ar}
            className="rounded-md border"
            modifiers={{
              hasAppointments: appointmentDates
            }}
            modifiersStyles={{
              hasAppointments: { 
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                fontWeight: 'bold'
              }
            }}
          />
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-3 h-3 bg-blue-100 rounded border"></div>
              أيام بها مواعيد
            </div>
          </div>
        </CardContent>
      </Card>

      {/* قائمة المواعيد */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              مواعيد {format(selectedDate, 'dd MMMM yyyy', { locale: ar })}
            </CardTitle>
            <Button onClick={handleNewAppointment} size="sm">
              <Plus className="h-4 w-4 ml-2" />
              موعد جديد
            </Button>
          </div>
          
          {/* أدوات التصفية والبحث */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المرضى أو الأطباء..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 text-right"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="scheduled">مجدول</SelectItem>
                <SelectItem value="confirmed">مؤكد</SelectItem>
                <SelectItem value="in-progress">جاري</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>

            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="تصفية حسب الطبيب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأطباء</SelectItem>
                {uniqueDoctors.map(doctor => (
                  <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-[500px]">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد مواعيد في هذا التاريخ</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={handleNewAppointment}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة موعد جديد
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppointments
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((appointment) => (
                    <Card 
                      key={appointment.id}
                      className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${priorityColors[appointment.priority]}`}
                      onClick={() => handleAppointmentClick(appointment)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(parseISO(appointment.time), 'HH:mm')}
                            </span>
                          </div>
                          <Badge 
                            variant="outline"
                            className={statusColors[appointment.status]}
                          >
                            {statusLabels[appointment.status]}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{appointment.patientName}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              د. {appointment.doctorName} - {appointment.doctorSpecialty}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">
                              {appointment.type === 'consultation' ? 'استشارة' : 
                               appointment.type === 'follow-up' ? 'متابعة' : 'طوارئ'}
                            </Badge>
                            
                            {appointment.priority === 'urgent' && (
                              <Badge variant="destructive" className="text-xs">
                                عاجل
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

