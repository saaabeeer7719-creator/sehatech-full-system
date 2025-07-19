"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, addDays, setHours, setMinutes } from "date-fns"
import { ar } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  CalendarIcon, 
  Clock, 
  User, 
  Stethoscope,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

const appointmentSchema = z.object({
  patientId: z.string().min(1, "يجب اختيار المريض"),
  doctorId: z.string().min(1, "يجب اختيار الطبيب"),
  date: z.date({
    required_error: "يجب اختيار التاريخ",
  }),
  time: z.string().min(1, "يجب اختيار الوقت"),
  type: z.enum(["consultation", "follow-up", "emergency"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  reason: z.string().min(1, "يجب كتابة سبب الزيارة"),
  notes: z.string().optional(),
  symptoms: z.string().optional(),
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

interface Patient {
  id: string
  name: string
  phone: string
  lastVisit?: string
}

interface Doctor {
  id: string
  name: string
  specialty: string
  consultationFee: number
  availableSlots: string[]
  nextAvailable: string
}

interface AppointmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate?: Date
  patients: Patient[]
  doctors: Doctor[]
  onSubmit: (data: AppointmentFormData) => Promise<void>
  isLoading?: boolean
  editingAppointment?: any
}

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"
]

const appointmentTypes = {
  consultation: "استشارة",
  "follow-up": "متابعة", 
  emergency: "طوارئ"
}

const priorityLevels = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة"
}

export function AppointmentForm({
  open,
  onOpenChange,
  selectedDate,
  patients,
  doctors,
  onSubmit,
  isLoading = false,
  editingAppointment
}: AppointmentFormProps) {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [searchPatient, setSearchPatient] = useState("")
  const [searchDoctor, setSearchDoctor] = useState("")

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      date: selectedDate || new Date(),
      time: "",
      type: "consultation",
      priority: "medium",
      reason: "",
      notes: "",
      symptoms: "",
    },
  })

  // تصفية المرضى حسب البحث
  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchPatient.toLowerCase()) ||
    patient.phone.includes(searchPatient)
  )

  // تصفية الأطباء حسب البحث
  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchDoctor.toLowerCase()) ||
    doctor.specialty.toLowerCase().includes(searchDoctor.toLowerCase())
  )

  // تحديث الأوقات المتاحة عند تغيير الطبيب أو التاريخ
  useEffect(() => {
    if (selectedDoctor && form.watch("date")) {
      // محاكاة الحصول على الأوقات المتاحة
      const mockAvailableSlots = timeSlots.filter((_, index) => 
        Math.random() > 0.3 // محاكاة بعض الأوقات المحجوزة
      )
      setAvailableSlots(mockAvailableSlots)
    }
  }, [selectedDoctor, form.watch("date")])

  // تحديث البيانات عند التعديل
  useEffect(() => {
    if (editingAppointment) {
      form.reset({
        patientId: editingAppointment.patientId,
        doctorId: editingAppointment.doctorId,
        date: new Date(editingAppointment.date),
        time: editingAppointment.time,
        type: editingAppointment.type,
        priority: editingAppointment.priority,
        reason: editingAppointment.reason,
        notes: editingAppointment.notes,
        symptoms: editingAppointment.symptoms,
      })
    }
  }, [editingAppointment, form])

  const handleDoctorSelect = (doctorId: string) => {
    const doctor = doctors.find(d => d.id === doctorId)
    setSelectedDoctor(doctor || null)
    form.setValue("doctorId", doctorId)
    form.setValue("time", "") // إعادة تعيين الوقت عند تغيير الطبيب
  }

  const handleSubmit = async (data: AppointmentFormData) => {
    try {
      await onSubmit(data)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting appointment:", error)
    }
  }

  const isSlotAvailable = (slot: string) => {
    return availableSlots.includes(slot)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">
            {editingAppointment ? "تعديل الموعد" : "إضافة موعد جديد"}
          </DialogTitle>
          <DialogDescription className="text-right">
            {editingAppointment 
              ? "قم بتعديل بيانات الموعد أدناه"
              : "املأ البيانات أدناه لإضافة موعد جديد"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* اختيار المريض */}
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-right">المريض</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          placeholder="البحث عن مريض..."
                          value={searchPatient}
                          onChange={(e) => setSearchPatient(e.target.value)}
                          className="text-right"
                        />
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المريض" />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-48">
                              {filteredPatients.map((patient) => (
                                <SelectItem key={patient.id} value={patient.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <div>
                                      <div className="font-medium">{patient.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {patient.phone}
                                      </div>
                                    </div>
                                    {patient.lastVisit && (
                                      <Badge variant="outline" className="text-xs">
                                        آخر زيارة: {patient.lastVisit}
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* اختيار الطبيب */}
              <FormField
                control={form.control}
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-right">الطبيب</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          placeholder="البحث عن طبيب..."
                          value={searchDoctor}
                          onChange={(e) => setSearchDoctor(e.target.value)}
                          className="text-right"
                        />
                        <Select onValueChange={handleDoctorSelect} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الطبيب" />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-48">
                              {filteredDoctors.map((doctor) => (
                                <SelectItem key={doctor.id} value={doctor.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <div>
                                      <div className="font-medium">د. {doctor.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {doctor.specialty}
                                      </div>
                                    </div>
                                    <div className="text-left">
                                      <div className="text-sm font-medium">
                                        {doctor.consultationFee} ريال
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        متاح: {doctor.nextAvailable}
                                      </div>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* اختيار التاريخ */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-right">التاريخ</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-right font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ar })
                            ) : (
                              <span>اختر التاريخ</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date() || date < new Date("1900-01-01")
                          }
                          locale={ar}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* اختيار الوقت */}
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-right">الوقت</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الوقت" />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="h-48">
                            {timeSlots.map((slot) => (
                              <SelectItem 
                                key={slot} 
                                value={slot}
                                disabled={!isSlotAvailable(slot)}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>{slot}</span>
                                  {isSlotAvailable(slot) ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription className="text-right">
                      {selectedDoctor ? 
                        `الأوقات المتاحة للدكتور ${selectedDoctor.name}` :
                        "اختر الطبيب أولاً لعرض الأوقات المتاحة"
                      }
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* نوع الموعد */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-right">نوع الموعد</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الموعد" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(appointmentTypes).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* الأولوية */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-right">الأولوية</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الأولوية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(priorityLevels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* سبب الزيارة */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-right">سبب الزيارة</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="اكتب سبب الزيارة..."
                      className="text-right"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* الأعراض */}
            <FormField
              control={form.control}
              name="symptoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-right">الأعراض (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="اكتب الأعراض إن وجدت..."
                      className="text-right"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ملاحظات */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-right">ملاحظات إضافية (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="أي ملاحظات إضافية..."
                      className="text-right"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                {editingAppointment ? "تحديث الموعد" : "إضافة الموعد"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

