
"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Image from "next/image"
import { AppointmentScheduler } from "../appointment-scheduler"
import { X, Calendar, Edit, Trash2, Repeat, Search } from "lucide-react"
import { AddDoctorDialog } from "./add-doctor-dialog"
import { EditDoctorDialog } from "./edit-doctor-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import type { Doctor } from "@/lib/types"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { logAuditEvent } from "@/lib/audit-log-service"

export function DoctorsTab() {
  const [currentUser] = useAuthState(auth);
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSpecialty, setSelectedSpecialty] = useState("all")
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorToEdit, setDoctorToEdit] = useState<Doctor | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "doctors"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
      setDoctors(docs);
    });
    return () => unsubscribe();
  }, []);

  const specialties = useMemo(() => [...new Set(doctors.map((d) => d.specialty))], [doctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const matchesSearch = doctor.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      const matchesSpecialty = selectedSpecialty !== "all"
        ? doctor.specialty === selectedSpecialty
        : true
      return matchesSearch && matchesSpecialty
    })
  }, [doctors, searchTerm, selectedSpecialty]);

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedSpecialty("all")
  }
  
  const handleDoctorCreated = async (newDoctor: Omit<Doctor, 'id'>) => {
    if (!currentUser) return;
    try {
      const docRef = await addDoc(collection(db, "doctors"), newDoctor);
      toast({
        title: "تمت إضافة الطبيب بنجاح",
        description: `تم إضافة د. ${newDoctor.name} إلى النظام.`,
      });
      await logAuditEvent('إضافة طبيب', { doctorId: docRef.id, doctorName: newDoctor.name }, currentUser.uid);
    } catch (e) {
      console.error("Error adding document: ", e);
      toast({
        variant: "destructive",
        title: "حدث خطأ!",
        description: "لم نتمكن من إضافة الطبيب.",
      });
    }
  };

  const handleDoctorUpdated = async (updatedDoctor: Doctor) => {
    if (!currentUser) return;
    const { id, ...doctorData } = updatedDoctor;
    const doctorRef = doc(db, "doctors", id);
    try {
      await updateDoc(doctorRef, doctorData);
      toast({
        title: "تم تحديث البيانات بنجاح",
        description: `تم تحديث ملف د. ${updatedDoctor.name}.`,
      });
      setDoctorToEdit(null);
      await logAuditEvent('تعديل طبيب', { doctorId: id, doctorName: updatedDoctor.name }, currentUser.uid);
    } catch (e) {
      console.error("Error updating document: ", e);
       toast({
        variant: "destructive",
        title: "حدث خطأ!",
        description: "لم نتمكن من تحديث بيانات الطبيب.",
      });
    }
  };
  
  const handleDoctorDeleted = async (doctor: Doctor) => {
    if (!currentUser) return;
     try {
       await deleteDoc(doc(db, "doctors", doctor.id));
       toast({
          title: "تم الحذف بنجاح",
          description: "تم حذف ملف الطبيب من النظام.",
       });
       await logAuditEvent('حذف طبيب', { doctorId: doctor.id, doctorName: doctor.name }, currentUser.uid);
     } catch(e) {
        console.error("Error deleting document: ", e);
        toast({
            variant: "destructive",
            title: "حدث خطأ!",
            description: "لم نتمكن من حذف الطبيب.",
        });
     }
  };

  const showClearButton = searchTerm || selectedSpecialty !== "all"

  return (
    <div className="mt-4">
       <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
             <div>
                <CardTitle>الأطباء</CardTitle>
                <CardDescription>إدارة وعرض جميع الأطباء في المركز.</CardDescription>
              </div>
            <AddDoctorDialog onDoctorCreated={handleDoctorCreated} />
          </div>
           <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:w-auto flex-grow">
               <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <Input
                placeholder="بحث عن طبيب..."
                className="w-full pr-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="تصفية حسب التخصص" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التخصصات</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showClearButton && (
              <Button variant="ghost" onClick={handleClearFilters}>
                مسح
                <X className="mr-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredDoctors.map((doctor) => (
              <Card key={doctor.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                       <div className="flex items-center gap-4">
                        <Image
                          src={doctor.image}
                          alt={`د. ${doctor.name}`}
                          width={60}
                          height={60}
                          className="rounded-full"
                          data-ai-hint="doctor portrait"
                        />
                        <div>
                          <CardTitle>د. {doctor.name}</CardTitle>
                          <CardDescription>{doctor.specialty}</CardDescription>
                        </div>
                      </div>
                       <div className="flex gap-1 ml-auto">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDoctorToEdit(doctor)}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">تعديل</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                 <Trash2 className="h-4 w-4" />
                                 <span className="sr-only">حذف</span>
                               </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف ملف الطبيب بشكل دائم من خوادمنا.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDoctorDeleted(doctor)} className="bg-destructive hover:bg-destructive/90">
                                  نعم، قم بالحذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-2 text-sm text-muted-foreground">
                   <div className="flex items-center gap-2">
                     <span className="font-bold text-lg">﷼</span>
                     <span>سعر الكشفية: {doctor.servicePrice?.toLocaleString('ar-EG') ?? 'غير محدد'}</span>
                   </div>
                    <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4" />
                     <span>إعادة مجانية: {doctor.freeReturnDays ?? 'غير محدد'} أيام</span>
                   </div>
                   <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 mt-1" />
                      <div>
                        <span>أيام الدوام:</span>
                        <p className="text-xs">{doctor.availableDays?.join('، ') ?? 'غير محدد'}</p>
                      </div>
                   </div>
                </CardContent>
                <CardFooter>
                  <AppointmentScheduler doctorId={doctor.id} />
                </CardFooter>
              </Card>
            ))}
            {filteredDoctors.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-10">
                    لا يوجد أطباء يطابقون معايير البحث.
                </div>
            )}
          </div>
        </CardContent>
      </Card>
      

       {doctorToEdit && (
        <EditDoctorDialog
          isOpen={!!doctorToEdit}
          onClose={() => setDoctorToEdit(null)}
          doctor={doctorToEdit}
          onDoctorUpdated={handleDoctorUpdated}
        />
      )}
    </div>
  )
}
