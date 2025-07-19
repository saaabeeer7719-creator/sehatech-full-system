

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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import type { Doctor } from "@/lib/types"

interface EditDoctorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor;
  onDoctorUpdated: (doctor: Doctor) => void;
}

const weekDays = [
  { id: 'saturday', label: 'السبت' },
  { id: 'sunday', label: 'الأحد' },
  { id: 'monday', label: 'الاثنين' },
  { id: 'tuesday', label: 'الثلاثاء' },
  { id: 'wednesday', label: 'الأربعاء' },
  { id: 'thursday', label: 'الخميس' },
  { id: 'friday', label: 'الجمعة' },
];

export function EditDoctorDialog({ isOpen, onClose, doctor, onDoctorUpdated }: EditDoctorDialogProps) {
  const [name, setName] = useState(doctor.name);
  const [specialty, setSpecialty] = useState(doctor.specialty);
  const [price, setPrice] = useState(doctor.servicePrice?.toString() || "");
  const [returnDays, setReturnDays] = useState(doctor.freeReturnDays?.toString() || "");
  const [availableDays, setAvailableDays] = useState<string[]>(
     doctor.availableDays?.map(dayLabel => weekDays.find(d => d.label === dayLabel)?.id).filter(Boolean) as string[] || []
  );
  const { toast } = useToast();

  useEffect(() => {
    if (doctor) {
      setName(doctor.name);
      setSpecialty(doctor.specialty);
      setPrice(doctor.servicePrice?.toString() || "");
      setReturnDays(doctor.freeReturnDays?.toString() || "");
      setAvailableDays(doctor.availableDays?.map(dayLabel => weekDays.find(d => d.label === dayLabel)?.id).filter(Boolean) as string[] || []);
    }
  }, [doctor]);

  const handleDayChange = (dayId: string, checked: boolean) => {
    setAvailableDays(prev =>
      checked ? [...prev, dayId] : prev.filter(d => d !== dayId)
    );
  };

  const handleUpdateDoctor = () => {
    if (!name || !specialty) {
      toast({
        variant: "destructive",
        title: "معلومات ناقصة",
        description: "الاسم والتخصص حقول مطلوبة.",
      });
      return;
    }

    const updatedDoctor: Doctor = {
      ...doctor,
      name,
      specialty,
      servicePrice: price ? parseFloat(price) : undefined,
      freeReturnDays: returnDays ? parseInt(returnDays, 10) : undefined,
      availableDays: availableDays.length > 0 ? availableDays.map(dayId => weekDays.find(d => d.id === dayId)!.label) : undefined,
    };

    onDoctorUpdated(updatedDoctor);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الطبيب</DialogTitle>
          <DialogDescription>
            قم بتحديث بيانات الطبيب أدناه. الحقول المعلمة بنجمة (*) مطلوبة.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              الاسم <span className="text-destructive">*</span>
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="مثال: علي الأحمد" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="specialty" className="text-right">
              التخصص <span className="text-destructive">*</span>
            </Label>
            <Input id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="col-span-3" placeholder="مثال: أمراض القلب" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              سعر الكشفية (﷼)
            </Label>
            <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="col-span-3" placeholder="5000 (اختياري)" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="returnDays" className="text-right">
              إعادة مجانية (أيام)
            </Label>
            <Input id="returnDays" type="number" value={returnDays} onChange={(e) => setReturnDays(e.target.value)} className="col-span-3" placeholder="14 (اختياري)" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">
              أيام الدوام
            </Label>
            <div className="col-span-3 grid grid-cols-2 gap-2">
              {weekDays.map(day => (
                <div key={day.id} className="flex items-center space-x-reverse space-x-2">
                   <Checkbox
                    id={`edit-${day.id}`}
                    checked={availableDays.includes(day.id)}
                    onCheckedChange={(checked) => handleDayChange(day.id, !!checked)}
                  />
                  <label
                    htmlFor={`edit-${day.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {day.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
           <Button onClick={handleUpdateDoctor}>حفظ التغييرات</Button>
           <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
