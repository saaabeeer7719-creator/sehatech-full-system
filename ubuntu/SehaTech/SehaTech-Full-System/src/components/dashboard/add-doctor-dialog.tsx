
"use client"

import { useState } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import type { Doctor } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface AddDoctorDialogProps {
  onDoctorCreated: (doctor: Omit<Doctor, 'id'>) => void;
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

export function AddDoctorDialog({ onDoctorCreated }: AddDoctorDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [price, setPrice] = useState("");
  const [returnDays, setReturnDays] = useState("");
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const { toast } = useToast();

  const handleDayChange = (dayId: string, checked: boolean) => {
    setAvailableDays(prev =>
      checked ? [...prev, dayId] : prev.filter(d => d !== dayId)
    );
  };

  const handleCreateDoctor = () => {
    if (!name || !specialty) {
      toast({
        variant: "destructive",
        title: "معلومات ناقصة",
        description: "الاسم والتخصص حقول مطلوبة.",
      });
      return;
    }

    const newDoctor: Omit<Doctor, 'id'> = {
      name,
      specialty,
      servicePrice: price ? parseFloat(price) : undefined,
      freeReturnDays: returnDays ? parseInt(returnDays, 10) : undefined,
      availableDays: availableDays.length > 0 ? availableDays.map(dayId => weekDays.find(d => d.id === dayId)!.label) : undefined,
      image: `https://placehold.co/100x100.png?text=${name.charAt(0)}`,
      // These are placeholders, a more robust system would calculate this
      nextAvailable: 'غداً، 10:00 ص',
      isAvailableToday: true, 
      availability: [], 
    };

    onDoctorCreated(newDoctor);
    
    // Reset form and close dialog
    setName("");
    setSpecialty("");
    setPrice("");
    setReturnDays("");
    setAvailableDays([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>إضافة طبيب جديد</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة طبيب جديد</DialogTitle>
          <DialogDescription>
            أدخل بيانات الطبيب الجديد. الحقول المعلمة بنجمة (*) مطلوبة.
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
                <div key={day.id} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id={day.id}
                    checked={availableDays.includes(day.id)}
                    onCheckedChange={(checked) => handleDayChange(day.id, !!checked)}
                  />
                  <label
                    htmlFor={day.id}
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
          <Button onClick={handleCreateDoctor}>إنشاء طبيب</Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
