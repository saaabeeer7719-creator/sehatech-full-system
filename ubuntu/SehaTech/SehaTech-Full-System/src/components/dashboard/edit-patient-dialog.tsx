
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import type { Patient } from "@/lib/types"

interface EditPatientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onPatientUpdated: (patient: Patient) => void;
}

export function EditPatientDialog({ isOpen, onClose, patient, onPatientUpdated }: EditPatientDialogProps) {
  const [name, setName] = useState(patient.name);
  const [dob, setDob] = useState<Date | undefined>(patient.dob ? new Date(patient.dob) : undefined);
  const [phone, setPhone] = useState(patient.phone);
  const [address, setAddress] = useState(patient.address);
  const [gender, setGender] = useState<Patient['gender']>(patient.gender);
  const { toast } = useToast();

  useEffect(() => {
    if (patient) {
      setName(patient.name);
      setDob(patient.dob ? new Date(patient.dob) : undefined);
      setPhone(patient.phone);
      setAddress(patient.address);
      setGender(patient.gender);
    }
  }, [patient]);

  const handleUpdatePatient = () => {
    if (!name || !phone || !dob || !gender) {
      toast({
        variant: "destructive",
        title: "معلومات ناقصة",
        description: "يرجى تعبئة جميع الحقول المطلوبة.",
      });
      return;
    }

    const updatedPatient: Patient = {
      ...patient,
      name,
      dob: format(dob, "yyyy-MM-dd"),
      phone,
      address,
      gender,
    };

    onPatientUpdated(updatedPatient);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل بيانات المريض</DialogTitle>
          <DialogDescription>
            قم بتحديث بيانات المريض أدناه.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">الاسم الكامل</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">الهاتف</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dob" className="text-right">تاريخ الميلاد</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !dob && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {dob ? format(dob, "PPP", { locale: ar }) : <span>اختر تاريخاً</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dob}
                  onSelect={setDob}
                  initialFocus
                  captionLayout="dropdown-buttons"
                  fromYear={1930}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gender" className="text-right">الجنس</Label>
            <Select value={gender} onValueChange={(value) => setGender(value as Patient['gender'])}>
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
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
           <Button variant="secondary" onClick={onClose}>إلغاء</Button>
           <Button onClick={handleUpdatePatient}>حفظ التغييرات</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
