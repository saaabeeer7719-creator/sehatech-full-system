

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Sparkles, Loader2, Lightbulb, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { suggestOptimalAppointmentSlots, SuggestOptimalAppointmentSlotsInput, SuggestOptimalAppointmentSlotsOutput } from "@/ai/flows/suggest-optimal-appointment-slots"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Appointment, Patient, Doctor } from "@/lib/types"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where, getDocs, orderBy } from "firebase/firestore"

interface AppointmentSchedulerProps {
  doctorId?: string;
  selectedPatientId?: string;
  onAppointmentCreated?: (appointment: Omit<Appointment, 'id' | 'status'>) => void;
  onPatientCreated?: (patient: Omit<Patient, 'id'>) => void;
  context?: 'new-patient' | 'new-appointment';
  prefilledData?: { name?: string; phone?: string };
}


export function AppointmentScheduler({ 
  doctorId, 
  onAppointmentCreated, 
  onPatientCreated, 
  context = 'new-appointment',
  selectedPatientId: initialSelectedPatientId,
  prefilledData = {}
}: AppointmentSchedulerProps) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>(initialSelectedPatientId)
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctorId)
  const [isSuggestingSlots, setIsSuggestingSlots] = useState(false)
  const [suggestedSlots, setSuggestedSlots] = useState<SuggestOptimalAppointmentSlotsOutput['suggestedSlots']>([])
  const { toast } = useToast()
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [newPatientName, setNewPatientName] = useState("")
  const [newPatientDob, setNewPatientDob] = useState<Date | undefined>()
  const [newPatientPhone, setNewPatientPhone] = useState("")
  const [newPatientGender, setNewPatientGender] = useState<Patient['gender']>("ذكر")
  const [newPatientAddress, setNewPatientAddress] = useState("")
  
  useEffect(() => {
    if (!open) return;
    const patientsUnsub = onSnapshot(query(collection(db, "patients")), (snap) => {
        setPatients(snap.docs.map(doc => ({id: doc.id, ...doc.data()} as Patient)));
    });
    const doctorsUnsub = onSnapshot(query(collection(db, "doctors")), (snap) => {
        setDoctors(snap.docs.map(doc => ({id: doc.id, ...doc.data()} as Doctor)));
    });
    return () => {
        patientsUnsub();
        doctorsUnsub();
    }
  }, [open]);
  
  useEffect(() => {
    setSelectedDoctorId(doctorId);
  }, [doctorId]);
  
  useEffect(() => {
    setSelectedPatientId(initialSelectedPatientId);
  }, [initialSelectedPatientId]);

  useEffect(() => {
    if (context === 'new-patient' && open) {
      setNewPatientName(prefilledData.name || "");
      setNewPatientPhone(prefilledData.phone || "");
    }
  }, [prefilledData, context, open]);


  const handleSuggestSlots = async () => {
    if (!selectedPatientId || !selectedDoctorId) {
      toast({
        variant: "destructive",
        title: "معلومات ناقصة",
        description: "الرجاء اختيار المريض والطبيب أولاً.",
      });
      return;
    }
    
    setIsSuggestingSlots(true);
    setSuggestedSlots([]);
    
    try {
      const doctor = doctors.find(d => d.id === selectedDoctorId);
      if (!doctor) throw new Error("Doctor not found");

      const appointmentsQuery = query(collection(db, "appointments"), 
          where("patientId", "==", selectedPatientId), 
          where("doctorId", "==", selectedDoctorId)
      );
      const querySnapshot = await getDocs(appointmentsQuery);
      const appointmentHistory = querySnapshot.docs.map(doc => {
          const data = doc.data() as Appointment;
          return { date: format(new Date(data.dateTime), 'yyyy-MM-dd'), time: format(new Date(data.dateTime), 'HH:mm') }
      });

      const input: SuggestOptimalAppointmentSlotsInput = {
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        appointmentHistory,
        doctorAvailability: doctor.availability,
      };

      const result = await suggestOptimalAppointmentSlots(input);
      setSuggestedSlots(result.suggestedSlots);

    } catch (error) {
      console.error("Error suggesting slots:", error);
      toast({
        variant: "destructive",
        title: "خطأ في الاقتراح",
        description: "لم نتمكن من اقتراح مواعيد في الوقت الحالي.",
      });
    } finally {
      setIsSuggestingSlots(false);
    }
  };

  const applySuggestedSlot = (slot: { date: string, time: string }) => {
    const [hours, minutes] = slot.time.split(':');
    const newDate = new Date(slot.date);
    newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    setDate(newDate);
    setSuggestedSlots([]); // Clear suggestions after applying one
  };


  const handleConfirmAppointment = () => {
    if (!selectedPatientId || !selectedDoctorId || !date) {
      toast({
        variant: "destructive",
        title: "معلومات ناقصة",
        description: "الرجاء اختيار المريض، الطبيب، والتاريخ.",
      });
      return;
    }

    const patient = patients.find(p => p.id === selectedPatientId);
    const doctor = doctors.find(d => d.id === selectedDoctorId);

    if (patient && doctor && onAppointmentCreated) {
        onAppointmentCreated({
            patientId: patient.id,
            patientName: patient.name,
            doctorId: doctor.id,
            doctorName: `د. ${doctor.name}`,
            doctorSpecialty: doctor.specialty,
            dateTime: date.toISOString(),
        });
        resetAndClose();
    }
  }

  const handleCreatePatient = () => {
    if (!newPatientName || !newPatientPhone || !newPatientDob) {
       toast({
        variant: "destructive",
        title: "معلومات ناقصة",
        description: "يرجى تعبئة جميع الحقول المطلوبة (الاسم، الهاتف، تاريخ الميلاد).",
      });
      return;
    }

    if (onPatientCreated) {
        const newPatient: Omit<Patient, 'id'> = {
            name: newPatientName,
            dob: format(newPatientDob, "yyyy-MM-dd"),
            gender: newPatientGender,
            phone: newPatientPhone,
            address: newPatientAddress,
            avatarUrl: `https://placehold.co/40x40.png?text=${getPatientInitials(newPatientName)}`
        };
        onPatientCreated(newPatient);
        resetAndClose();
    }
  }
  
  const getPatientInitials = (name: string) => {
    if(!name) return "";
    const names = name.split(" ")
    return names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`
      : names[0]?.[0] || ""
  }

  const getButtonText = () => {
    if (context === 'new-patient') return 'إضافة مريض جديد';
    if (doctorId || initialSelectedPatientId) return 'حجز موعد';
    return 'موعد جديد';
  }
  
  const resetAndClose = () => {
    setNewPatientName("");
    setNewPatientDob(undefined);
    setNewPatientPhone("");
    setNewPatientAddress("");
    setNewPatientGender("ذكر");
    setSelectedPatientId(initialSelectedPatientId);
    setSelectedDoctorId(doctorId);
    setDate(new Date());
    setOpen(false);
    setSuggestedSlots([]);
    setIsSuggestingSlots(false);
  }


  const isNewPatientFlow = context === 'new-patient';
  
  const isDoctorSelectionDisabled = !!doctorId;


  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetAndClose(); else setOpen(true);}}>
      <DialogTrigger asChild>
        <Button>
            {isNewPatientFlow && <UserPlus className="ml-2 h-4 w-4" />}
            {getButtonText()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNewPatientFlow ? 'إنشاء ملف مريض جديد' : 'حجز موعد جديد'}</DialogTitle>
          <DialogDescription>
             {isNewPatientFlow
                ? "أدخل البيانات أدناه لإنشاء سجل مريض جديد."
                : "أدخل البيانات أدناه لحجز موعد جديد."}
          </DialogDescription>
        </DialogHeader>

        {isNewPatientFlow ? (
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">الاسم الكامل</Label>
              <Input id="name" placeholder="مثال: أحمد علي" className="col-span-3" value={newPatientName} onChange={(e) => setNewPatientName(e.target.value)} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">الهاتف</Label>
              <Input id="phone" type="tel" placeholder="777xxxxxx" className="col-span-3" value={newPatientPhone} onChange={(e) => setNewPatientPhone(e.target.value)} />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dob" className="text-right">تاريخ الميلاد</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !newPatientDob && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {newPatientDob ? format(newPatientDob, "PPP", { locale: ar }) : <span>اختر تاريخاً</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newPatientDob}
                      onSelect={setNewPatientDob}
                      initialFocus
                      locale={ar}
                      captionLayout="dropdown-buttons"
                      fromYear={1930}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gender" className="text-right">الجنس</Label>
              <Select value={newPatientGender} onValueChange={(value) => setNewPatientGender(value as Patient['gender'])}>
                <SelectTrigger id="gender" className="col-span-3">
                  <SelectValue placeholder="اختر الجنس" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ذكر">ذكر</SelectItem>
                  <SelectItem value="أنثى">أنثى</SelectItem>
                  <SelectItem value="آخر">آخر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">العنوان</Label>
              <Input id="address" placeholder="صنعاء، شارع تعز" className="col-span-3" value={newPatientAddress} onChange={(e) => setNewPatientAddress(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="patient" className="text-right">
                المريض
              </Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId} disabled={!!initialSelectedPatientId}>
                <SelectTrigger id="patient" className="col-span-3">
                  <SelectValue placeholder="اختر مريضاً" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doctor" className="text-right">
                الطبيب
              </Label>
              <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId} disabled={isDoctorSelectionDisabled}>
                <SelectTrigger id="doctor" className="col-span-3">
                  <SelectValue placeholder={isDoctorSelectionDisabled ? `د. ${doctors.find(d => d.id === doctorId)?.name}` : "اختر طبيباً"} />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(d => <SelectItem key={d.id} value={d.id}>د. {d.name} ({d.specialty})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end">
                <Button variant="outline" onClick={handleSuggestSlots} disabled={isSuggestingSlots || !selectedDoctorId || !selectedPatientId}>
                    {isSuggestingSlots ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    اقتراح موعد ذكي
                </Button>
            </div>
            
            {isSuggestingSlots && (
              <div className="text-center text-muted-foreground text-sm">
                جاري البحث عن أفضل المواعيد...
              </div>
            )}
            
            {suggestedSlots.length > 0 && (
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle>مواعيد مقترحة</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2 mt-2">
                    {suggestedSlots.map((slot, index) => (
                      <div key={index} className="flex items-center justify-between gap-2 p-2 rounded-md border">
                        <div>
                            <p className="font-semibold">{format(new Date(slot.date), 'PPPP', {locale: ar})} - {slot.time}</p>
                            <p className="text-xs text-muted-foreground">{slot.reason}</p>
                        </div>
                        <Button size="sm" onClick={() => applySuggestedSlot(slot)}>اختيار</Button>
                      </div>
                    ))}
                    </div>
                  </AlertDescription>
                </Alert>
            )}


            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                التاريخ والوقت
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                     <CalendarIcon className="ml-2 h-4 w-4" />
                    {date ? format(date, "PPPPp", { locale: ar }) : <span>اختر تاريخاً ووقتاً</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    locale={ar}
                  />
                  <div className="p-2 border-t">
                    <Input type="time" dir="ltr" className="text-center" defaultValue={format(date || new Date(), "HH:mm")} onChange={(e) => {
                       const newDate = new Date(date || new Date());
                       const [hours, minutes] = e.target.value.split(':');
                       newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                       setDate(newDate);
                    }}/>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="notes" className="text-right pt-2">
                ملاحظات
              </Label>
              <Textarea id="notes" placeholder="اكتب أي ملاحظات إضافية للطبيب..." className="col-span-3" />
            </div>
          </div>
        )}

        <DialogFooter>
           <Button variant="secondary" onClick={resetAndClose}>إلغاء</Button>
          <Button onClick={isNewPatientFlow ? handleCreatePatient : handleConfirmAppointment}>
            {isNewPatientFlow ? 'إنشاء المريض' : 'تأكيد الموعد'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
