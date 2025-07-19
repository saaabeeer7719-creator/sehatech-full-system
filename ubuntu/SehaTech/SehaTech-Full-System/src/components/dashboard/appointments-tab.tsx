
"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AppointmentScheduler } from "../appointment-scheduler"
import type { Appointment, Doctor } from "@/lib/types"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon, X, Search } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format, isSameDay } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { LocalizedDateTime } from "../localized-date-time"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, doc, updateDoc, addDoc, serverTimestamp, orderBy } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { logAuditEvent } from "@/lib/audit-log-service"

const appointmentStatuses = ['Scheduled', 'Waiting', 'Completed', 'Follow-up'];
const statusTranslations: { [key: string]: string } = {
  'Scheduled': 'مجدول',
  'Waiting': 'في الانتظار',
  'Completed': 'مكتمل',
  'Follow-up': 'إعادة'
};

const statusBadgeVariants: { [key: string]: "success" | "secondary" | "waiting" | "followup" } = {
    'Completed': 'success',
    'Scheduled': 'secondary',
    'Waiting': 'waiting',
    'Follow-up': 'followup'
};


export function AppointmentsTab({ }: {}) {
  const [currentUser] = useAuthState(auth);
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDoctor, setFilterDoctor] = useState<string>("all");
  const { toast } = useToast()

  useEffect(() => {
    const q = query(collection(db, "appointments"), orderBy("dateTime", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const appts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(appts);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "doctors"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
      setDoctors(docs);
    });
    return () => unsubscribe();
  }, []);


  const handleAppointmentCreated = async (newAppointmentData: Omit<Appointment, 'id' | 'status'>) => {
    if (!currentUser) return;
     try {
        const docRef = await addDoc(collection(db, "appointments"), {
            ...newAppointmentData,
            status: 'Scheduled',
        });
        toast({
            title: "تم حجز الموعد بنجاح!",
            description: `تم حجز موعد جديد.`,
        });
        await logAuditEvent('إنشاء موعد', { appointmentId: docRef.id, patientName: newAppointmentData.patientName }, currentUser.uid);
    } catch (e) {
        console.error("Error adding document: ", e);
        toast({
            variant: "destructive",
            title: "حدث خطأ!",
            description: "لم نتمكن من حجز الموعد.",
        });
    }
  };
  
  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterDate(undefined);
    setFilterStatus("all");
    setFilterDoctor("all");
  };

  const handleStatusChange = async (appointmentId: string, newStatus: Appointment['status']) => {
    if (!currentUser) return;
    const appointmentRef = doc(db, "appointments", appointmentId);
    const appointment = appointments.find(a => a.id === appointmentId);
    
    if (!appointment) {
        toast({ variant: "destructive", title: "خطأ", description: "لم يتم العثور على الموعد." });
        return;
    }

    try {
        await updateDoc(appointmentRef, { status: newStatus });

        let toastDescription = `تم تحديث حالة الموعد إلى "${statusTranslations[newStatus]}".`;

        if (newStatus === 'Completed') {
            const doctor = doctors.find(d => d.id === appointment.doctorId);
            if (doctor && doctor.servicePrice) {
                const transactionRef = await addDoc(collection(db, "transactions"), {
                    patientId: appointment.patientId,
                    patientName: appointment.patientName,
                    date: serverTimestamp(),
                    amount: doctor.servicePrice,
                    status: 'Success',
                    service: `${doctor.specialty} Consultation`,
                });
                toastDescription += ` وتم إنشاء فاتورة بمبلغ ${doctor.servicePrice} ﷼ تلقائياً.`;
                await logAuditEvent('إنشاء فاتورة (تلقائي)', { transactionId: transactionRef.id, patientName: appointment.patientName, amount: doctor.servicePrice }, currentUser.uid);
            } else {
                 toastDescription += ` (لم يتم إنشاء فاتورة لعدم تحديد سعر خدمة للطبيب).`;
            }
        }
        
        toast({
            title: "تم تحديث الحالة بنجاح",
            description: toastDescription
        });
        await logAuditEvent('تحديث حالة موعد', { appointmentId, newStatus }, currentUser.uid);

    } catch (e) {
         console.error("Error updating document: ", e);
         toast({
            variant: "destructive",
            title: "حدث خطأ!",
            description: "لم نتمكن من تحديث حالة الموعد.",
        });
    }
  };


  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment =>
      (appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.doctorName.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterStatus === 'all' || appointment.status === filterStatus) &&
      (filterDoctor === 'all' || appointment.doctorId === filterDoctor) &&
      (!filterDate || isSameDay(new Date(appointment.dateTime), filterDate))
    );
  }, [appointments, searchTerm, filterStatus, filterDoctor, filterDate]);

  return (
    <Card>
       <CardHeader>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
                <CardTitle>المواعيد</CardTitle>
                <CardDescription>إدارة وعرض جميع مواعيد المرضى.</CardDescription>
            </div>
            <AppointmentScheduler onAppointmentCreated={handleAppointmentCreated} />
          </div>
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full sm:w-auto flex-grow">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input
                  type="search"
                  placeholder="ابحث عن مريض أو طبيب..."
                  className="w-full appearance-none bg-background pl-8 shadow-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full sm:w-[240px] justify-start text-left font-normal",
                      !filterDate && "text-muted-foreground"
                    )}
                  >
                     <CalendarIcon className="ml-2 h-4 w-4" />
                     {filterDate ? format(filterDate, "PPP", { locale: ar }) : <span>تصفية حسب التاريخ</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={setFilterDate}
                    initialFocus
                    locale={ar}
                  />
                </PopoverContent>
              </Popover>

               <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="تصفية حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  {appointmentStatuses.map(status => (
                    <SelectItem key={status} value={status}>{statusTranslations[status]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

               <Select value={filterDoctor} onValueChange={setFilterDoctor}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="تصفية حسب الطبيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأطباء</SelectItem>
                  {doctors.map(doctor => (
                    <SelectItem key={doctor.id} value={doctor.id}>د. {doctor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(searchTerm || filterDate || filterStatus !== 'all' || filterDoctor !== 'all') && (
                <Button variant="ghost" onClick={handleClearFilters}>
                  مسح الفلاتر
                  <X className="ml-2 h-4 w-4" />
                </Button>
              )}
          </div>
        </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المريض</TableHead>
                <TableHead>الطبيب</TableHead>
                <TableHead>التخصص</TableHead>
                <TableHead>التاريخ والوقت</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.length > 0 ? filteredAppointments.map((appointment) => (
                <TableRow key={appointment.id}>
                   <TableCell>{appointment.patientName}</TableCell>
                   <TableCell>{appointment.doctorName}</TableCell>
                  <TableCell>{appointment.doctorSpecialty}</TableCell>
                  <TableCell>
                    <LocalizedDateTime dateTime={appointment.dateTime} options={{ dateStyle: 'short', timeStyle: 'short' }} />
                  </TableCell>
                  <TableCell>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-28 justify-center">
                                 <Badge variant={statusBadgeVariants[appointment.status]} className="w-full justify-center">
                                  {statusTranslations[appointment.status]}
                                </Badge>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuLabel>تغيير حالة الموعد</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup 
                                value={appointment.status} 
                                onValueChange={(newStatus) => handleStatusChange(appointment.id, newStatus as Appointment['status'])}
                            >
                            {appointmentStatuses.map(status => (
                                <DropdownMenuRadioItem key={status} value={status}>
                                {statusTranslations[status]}
                                </DropdownMenuRadioItem>
                            ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    لا توجد مواعيد تطابق معايير البحث.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
