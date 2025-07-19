

"use client"
import { Users, CalendarPlus, Stethoscope, Activity, Wifi, Circle, Database, CheckCircle, XCircle, UserPlus, FileText, X } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getPatientInitials } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useState, useMemo, useEffect } from "react"
import type { Appointment, User, Transaction, Patient, Doctor } from "@/lib/types"
import { LocalizedDateTime } from "../localized-date-time"
import { format, isToday, parseISO, startOfDay, endOfDay, isWithinInterval, formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { Button } from "../ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Calendar } from "../ui/calendar"
import type { DateRange } from "react-day-picker"
import { useToast } from "@/hooks/use-toast"
import { db, rtdb } from "@/lib/firebase"
import { collection, onSnapshot, query, doc, updateDoc, where, orderBy, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { ref, onValue } from "firebase/database"

function DollarSignIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

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

const appointmentStatuses = ['Scheduled', 'Waiting', 'Completed', 'Follow-up'];


export function Overview() {
  const [appointmentsState, setAppointmentsState] = useState<Appointment[]>([]);
  const [transactionsState, setTransactionsState] = useState<Transaction[]>([]);
  const [patientsState, setPatientsState] = useState<Patient[]>([]);
  const [doctorsState, setDoctorsState] = useState<Doctor[]>([]);
  const [usersState, setUsersState] = useState<User[]>([]);

  const [filterDoctor, setFilterDoctor] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    const unsubAppointments = onSnapshot(query(collection(db, "appointments")), snap => setAppointmentsState(snap.docs.map(d => ({id: d.id, ...d.data()}) as Appointment)));
    const unsubTransactions = onSnapshot(query(collection(db, "transactions")), snap => setTransactionsState(snap.docs.map(d => ({id: d.id, ...d.data()}) as Transaction)));
    const unsubPatients = onSnapshot(query(collection(db, "patients")), snap => setPatientsState(snap.docs.map(d => ({id: d.id, ...d.data()}) as Patient)));
    const unsubDoctors = onSnapshot(query(collection(db, "doctors")), snap => setDoctorsState(snap.docs.map(d => ({id: d.id, ...d.data()}) as Doctor)));
    
    // Combine Firestore user data with Realtime Database presence data
    const unsubUsers = onSnapshot(query(collection(db, "users")), (snap) => {
        const firestoreUsers = snap.docs.map(d => ({id: d.id, ...d.data()}) as User);

        const presenceRef = ref(rtdb, 'users');
        onValue(presenceRef, (snapshot) => {
            const presenceData = snapshot.val();
            const combinedUsers = firestoreUsers.map(user => ({
                ...user,
                presence: presenceData?.[user.id]
            }));
            setUsersState(combinedUsers);
        });
    });

    return () => {
      unsubAppointments();
      unsubTransactions();
      unsubPatients();
      unsubDoctors();
      unsubUsers();
    }
  }, []);

  const handleStatusChange = async (appointmentId: string, newStatus: Appointment['status']) => {
    const appointmentRef = doc(db, "appointments", appointmentId);
    const appointment = appointmentsState.find(a => a.id === appointmentId);
    
    if (!appointment) {
        toast({ variant: "destructive", title: "خطأ", description: "لم يتم العثور على الموعد." });
        return;
    }

    try {
        await updateDoc(appointmentRef, { status: newStatus });

        let toastDescription = `تم تحديث حالة الموعد إلى "${statusTranslations[newStatus]}".`;

        if (newStatus === 'Completed') {
            const doctor = doctorsState.find(d => d.id === appointment.doctorId);
            if (doctor && doctor.servicePrice) {
                await addDoc(collection(db, "transactions"), {
                    patientId: appointment.patientId,
                    patientName: appointment.patientName,
                    date: serverTimestamp(),
                    amount: doctor.servicePrice,
                    status: 'Success',
                    service: `${doctor.specialty} Consultation`,
                });
                toastDescription += ` وتم إنشاء فاتورة بمبلغ ${doctor.servicePrice} ﷼ تلقائياً.`;
            } else {
                 toastDescription += ` (لم يتم إنشاء فاتورة لعدم تحديد سعر خدمة للطبيب).`;
            }
        }
        
        toast({
            title: "تم تحديث الحالة بنجاح",
            description: toastDescription
        });

    } catch (e) {
         console.error("Error updating document or creating transaction: ", e);
         toast({
            variant: "destructive",
            title: "حدث خطأ!",
            description: "لم نتمكن من تحديث حالة الموعد أو إنشاء الفاتورة.",
        });
    }
  };

  const filteredData = useMemo(() => {
    const today = new Date();
    const interval = filterDateRange?.from && filterDateRange?.to
      ? { start: startOfDay(filterDateRange.from), end: endOfDay(filterDateRange.to) }
      : { start: startOfDay(today), end: endOfDay(today) };

    const appointments = appointmentsState.filter(appointment => {
      const appointmentDate = new Date(appointment.dateTime);
      const inDateRange = isWithinInterval(appointmentDate, interval);
      const matchesDoctor = filterDoctor === 'all' || appointment.doctorId === filterDoctor;
      return inDateRange && matchesDoctor;
    });

    const patientIdsFromFilteredAppointments = [...new Set(appointments.map(a => a.patientId))];

    const transactions = transactionsState.filter(transaction => {
      if (!transaction.date) return false;
      const transactionDate = typeof transaction.date.toDate === 'function' ? transaction.date.toDate() : new Date(transaction.date);
      const inDateRange = isWithinInterval(transactionDate, interval);
      
      const matchesDoctor = filterDoctor === 'all' ? true : patientIdsFromFilteredAppointments.includes(transaction.patientId);
      
      return inDateRange && matchesDoctor;
    });
    
    const newPatientsInPeriod = patientsState.filter(patient => {
        if (!patient.createdAt) return false;
        const creationDate = typeof patient.createdAt.toDate === 'function' ? patient.createdAt.toDate() : new Date(patient.createdAt);
        return isWithinInterval(creationDate, interval);
    });

    const activeDoctorsInPeriod = doctorsState.filter(doctor => {
        return appointments.some(a => a.doctorId === doctor.id);
    });

    const doctorAppointmentsCount = doctorsState.map(doctor => {
        const count = appointments.filter(a => a.doctorId === doctor.id).length;
        return { name: doctor.name, count };
    }).sort((a, b) => b.count - a.count).filter(d => d.count > 0);


    const totalRevenue = transactions
      .filter(t => t.status === 'Success')
      .reduce((sum, t) => sum + t.amount, 0);

    return { 
      appointments, 
      totalRevenue, 
      newPatientsCount: newPatientsInPeriod.length,
      activeDoctorsCount: activeDoctorsInPeriod.length,
      doctorAppointmentsCount
    };
  }, [filterDoctor, filterDateRange, appointmentsState, transactionsState, patientsState, doctorsState]);

  const appointmentsToday = useMemo(() => {
    return appointmentsState
        .filter(a => isToday(new Date(a.dateTime)))
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [appointmentsState]);
  
  const handleClearFilters = () => {
    setFilterDoctor("all");
    setFilterDateRange(undefined);
  }

  return (
    <div className="mt-4 space-y-6">
       <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
         <div className="flex-1">
            <h1 className="text-2xl font-bold">نظرة عامة</h1>
            <p className="text-muted-foreground">تابع أداء مركزك وإحصائياته الحيوية.</p>
         </div>
         <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
             <Select value={filterDoctor} onValueChange={setFilterDoctor}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="تصفية حسب الطبيب" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">كل الأطباء</SelectItem>
                    {doctorsState.map(doctor => (
                    <SelectItem key={doctor.id} value={doctor.id}>د. {doctor.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
             <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-[280px] justify-start text-right font-normal">
                     <CalendarPlus className="ml-2 h-4 w-4" />
                     {filterDateRange?.from ? (
                      filterDateRange.to ? (
                        <>
                          {format(filterDateRange.from, "PPP", { locale: ar })} -{" "}
                          {format(filterDateRange.to, "PPP", { locale: ar })}
                        </>
                      ) : (
                        format(filterDateRange.from, "PPP", { locale: ar })
                      )
                    ) : (
                      <span>اختر نطاق التاريخ (اليوم افتراضيًا)</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={filterDateRange?.from}
                        selected={filterDateRange}
                        onSelect={setFilterDateRange}
                        numberOfMonths={2}
                        locale={ar}
                    />
                </PopoverContent>
            </Popover>
            {(filterDoctor !== 'all' || filterDateRange) && (
              <Button variant="ghost" onClick={handleClearFilters}>
                  مسح الفلاتر
                  <X className="mr-2 h-4 w-4"/>
              </Button>
            )}
         </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              إجمالي الإيرادات
            </CardTitle>
             <span className="text-muted-foreground">﷼</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.totalRevenue.toLocaleString('ar-EG')} ﷼</div>
            <p className="text-xs text-muted-foreground">
              ضمن الفترة المحددة
            </p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المواعيد</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{filteredData.appointments.length}</div>
            <p className="text-xs text-muted-foreground">
              ضمن الفترة المحددة
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              المرضى الجدد
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{filteredData.newPatientsCount}</div>
            <p className="text-xs text-muted-foreground">
              مرضى جدد في الفترة المحددة
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              الأطباء النشطون
            </CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{filteredData.activeDoctorsCount > 0 ? filteredData.activeDoctorsCount : doctorsState.length}</div>
             <p className="text-xs text-muted-foreground">
               {filterDateRange || filterDoctor !== 'all' ? 'أطباء نشطون في الفترة المحددة' : 'إجمالي الأطباء في النظام'}
            </p>
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>مواعيد اليوم</CardTitle>
                <CardDescription>
                  قائمة بجميع المواعيد المجدولة لهذا اليوم.
                </CardDescription>
            </CardHeader>
             <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>المريض</TableHead>
                                <TableHead>الطبيب</TableHead>
                                <TableHead>الوقت</TableHead>
                                <TableHead>الحالة</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {appointmentsToday.length > 0 ? 
                             appointmentsToday.map((appointment) => (
                                <TableRow key={appointment.id}>
                                <TableCell>
                                    <div className="font-medium">{appointment.patientName}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">{appointment.doctorName}</div>
                                    <div className="text-xs text-muted-foreground">{appointment.doctorSpecialty}</div>
                                </TableCell>
                                <TableCell>
                                    <LocalizedDateTime dateTime={appointment.dateTime} options={{ timeStyle: 'short', hour12: true }} />
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
                                <TableCell colSpan={4} className="h-24 text-center">
                                    لا توجد مواعيد لهذا اليوم.
                                </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>أداء الأطباء</CardTitle>
                     <CardDescription>عدد المواعيد لكل طبيب في الفترة المحددة.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredData.doctorAppointmentsCount.map(doc => (
                            <div key={doc.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={`https://placehold.co/40x40.png?text=${getPatientInitials(`د. ${doc.name}`)}`} data-ai-hint="doctor portrait" />
                                        <AvatarFallback>{getPatientInitials(`د. ${doc.name}`)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">د. {doc.name}</p>
                                    </div>
                                </div>
                                <div className="font-semibold">{doc.count} موعد</div>
                            </div>
                        ))}
                         {filteredData.doctorAppointmentsCount.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات لعرضها حسب الفلاتر المحددة.</p>
                         )}
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>حالة المستخدمين</CardTitle>
                    <CardDescription>عرض المستخدمين وحالتهم في النظام.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    {usersState.map(user => (
                         <div key={user.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={`https://placehold.co/40x40.png?text=${getPatientInitials(user.name)}`} data-ai-hint="person avatar" />
                                    <AvatarFallback>{getPatientInitials(user.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.role}</p>
                                </div>
                            </div>
                            {user.presence?.state === 'online' ? (
                                <div className="flex items-center gap-2 text-green-600">
                                    <Circle className="h-3 w-3 fill-current" />
                                    <span>متصل</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Circle className="h-3 w-3 fill-current" />
                                    <span>
                                        {user.presence?.last_changed ? `آخر ظهور: ${formatDistanceToNow(new Date(user.presence.last_changed), { addSuffix: true, locale: ar })}` : 'غير متصل'}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                    {usersState.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">لا يوجد مستخدمون لعرضهم.</p>
                    )}
                </CardContent>
            </Card>
          </div>
       </div>
    </div>
  )
}
