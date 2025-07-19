
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
import { useToast } from "@/hooks/use-toast"
import type { User, UserRole } from "@/lib/types"
import { auth } from "@/lib/firebase"
import { sendPasswordResetEmail } from "firebase/auth"

interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdated: (user: User) => void;
}

export function EditUserDialog({ isOpen, onClose, user, onUserUpdated }: EditUserDialogProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<UserRole>(user.role);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
    }
  }, [user, isOpen]);

  const handleUpdateUser = () => {
    if (!name || !email || !role) {
      toast({
        variant: "destructive",
        title: "معلومات ناقصة",
        description: "يرجى تعبئة جميع الحقول المطلوبة.",
      });
      return;
    }

    const updatedUser: User = {
      ...user,
      name,
      email,
      role,
    };

    onUserUpdated(updatedUser);
  };
  
  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "تم إرسال الرابط بنجاح",
        description: `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email}.`,
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل إرسال بريد إعادة تعيين كلمة المرور. قد لا يكون المستخدم موجودًا في نظام المصادقة."
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          <DialogDescription>
            قم بتحديث بيانات المستخدم أدناه.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              الاسم
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              البريد الإلكتروني
            </Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              الدور
            </Label>
             <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="اختر دوراً" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">مدير</SelectItem>
                <SelectItem value="receptionist">موظف استقبال</SelectItem>
                <SelectItem value="doctor">طبيب</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                كلمة المرور
              </Label>
              <div className="col-span-3">
                 <Button variant="outline" onClick={handleResetPassword}>
                  إرسال رابط إعادة تعيين
                </Button>
              </div>
          </div>
        </div>
        <DialogFooter>
           <Button variant="secondary" onClick={onClose}>إلغاء</Button>
           <Button onClick={handleUpdateUser}>حفظ التغييرات</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

    