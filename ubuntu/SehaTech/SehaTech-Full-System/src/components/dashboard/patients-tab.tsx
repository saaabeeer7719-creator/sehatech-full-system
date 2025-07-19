
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
import { Button } from "@/components/ui/button"
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
import {
  Card,
  CardContent,
  CardDescription,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AppointmentScheduler } from "../appointment-scheduler"
import { getPatientInitials } from "@/lib/utils"
import { PatientDetails } from "../patient-details"
import type { Patient } from "@/lib/types"
import { EditPatientDialog } from "../edit-patient-dialog"
import { UserPlus, Search, Edit, Trash2, X } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { logAuditEvent } from "@/lib/audit-log-service"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"

function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function PatientsTab() {
  const [currentUser] = useAuthState(auth);
  const [searchTerm, setSearchTerm] = useState("")
  const [filterGender, setFilterGender] = useState("all")
  const [selectedPatientForProfile, setSelectedPatientForProfile] = useState<Patient | null>(null)
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState<Patient | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [appointmentsCount, setAppointmentsCount] = useState<{ [key: string]: number }>({})
  const { toast } = useToast();
  
  useEffect(() => {
    const q = query(collection(db, "patients"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const pats = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }) as Patient);
      setPatients(pats);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "appointments"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const counts: { [key: string]: number } = {};
        querySnapshot.forEach(doc => {
            const patientId = doc.data().patientId;
            counts[patientId] = (counts[patientId] || 0) + 1;
        });
        setAppointmentsCount(counts);
    });
    return () => unsubscribe();
  }, []);
  
  const handlePatientCreated = async (newPatientData: Omit<Patient, 'id'>) => {
    if (!currentUser) return;
    try {
        const docRef = await addDoc(collection(db, "patients"), {
            ...newPatientData,
            createdAt: serverTimestamp(),
        });
        toast({
            title: "تم إنشاء ملف المريض بنجاح!",
        });
        const createdPatient = { id: docRef.id, ...newPatientData };
        setSelectedPatientForProfile(createdPatient as Patient);
        await logAuditEvent('إضافة مريض', { patientId: docRef.id, patientName: newPatientData.name }, currentUser.uid);
    } catch (e) {
        console.error("Error adding document: ", e);
        toast({
            variant: "destructive",
            title: "حدث خطأ!",
            description: "لم نتمكن من إضافة المريض.",
        });
    }
  };

  const handlePatientUpdated = async (updatedPatient: Patient) => {
    if (!currentUser) return;
    const { id, ...patientData } = updatedPatient;
    if (!id) return;
    const patientRef = doc(db, "patients", id);
    try {
      await updateDoc(patientRef, patientData);
      toast({
        title: "تم تحديث البيانات بنجاح",
        description: `تم تحديث ملف المريض ${updatedPatient.name}.`,
      });
      setSelectedPatientForEdit(null);
      await logAuditEvent('تعديل مريض', { patientId: id, patientName: updatedPatient.name }, currentUser.uid);
    } catch (e) {
      console.error("Error updating document: ", e);
      toast({ variant: "destructive", title: "خطأ", description: "لم نتمكن من تحديث بيانات المريض." });
    }
  };

  const handlePatientDeleted = async (patient: Patient) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "patients", patient.id));
      toast({ title: "تم الحذف بنجاح", description: "تم حذف ملف المريض من النظام." });
      await logAuditEvent('حذف مريض', { patientId: patient.id, patientName: patient.name }, currentUser.uid);
    } catch (e) {
      console.error("Error deleting document: ", e);
      toast({ variant: "destructive", title: "خطأ!", description: "لم نتمكن من حذف المريض." });
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("")
    setFilterGender("all")
  }

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) =>
      (patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.phone && patient.phone.includes(searchTerm))) &&
      (filterGender === "all" || patient.gender === filterGender)
    )
  }, [patients, searchTerm, filterGender]);

  const getPatientAppointmentCount = (patientId: string) => {
    return appointmentsCount[patientId] || 0;
  }

  const showClearButton = searchTerm || filterGender !== "all";

  return (
    <>
      <Card>
        <CardHeader>
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
             <div>
                <CardTitle>سجلات المرضى</CardTitle>
                <CardDescription>
                  عرض، إضافة، وتعديل سجلات المرضى في النظام.
                </CardDescription>
              </div>
              <AppointmentScheduler
                context="new-patient"
                onPatientCreated={handlePatientCreated}
              />
           </div>
           <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full sm:w-auto flex-grow">
                 <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  className="w-full sm:w-[300px] pr-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="تصفية حسب الجنس" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="ذكر">ذكر</SelectItem>
                  <SelectItem value="أنثى">أنثى</SelectItem>
                  <SelectItem value="آخر">آخر</SelectItem>
                </SelectContent>
              </Select>
              {showClearButton && (
                <Button variant="ghost" onClick={handleClearFilters}>
                  مسح الفلاتر
                  <X className="mr-2 h-4 w-4" />
                </Button>
              )}
           </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المريض</TableHead>
                  <TableHead className="text-right">العمر</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">الجنس</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">إجمالي المواعيد</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length > 0 ? filteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <Avatar>
                           <AvatarImage src={patient.avatarUrl} data-ai-hint="person avatar" />
                          <AvatarFallback>{getPatientInitials(patient.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{patient.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{patient.dob ? calculateAge(patient.dob) : 'N/A'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{patient.gender}</TableCell>
                    <TableCell className="hidden sm:table-cell">{getPatientAppointmentCount(patient.id)}</TableCell>
                    <TableCell className="text-center">
                       <div className="flex items-center justify-center gap-1">
                         <Button variant="outline" size="sm" onClick={() => setSelectedPatientForProfile(patient)}>عرض الملف</Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPatientForEdit(patient)}>
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
                                  هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف ملف المريض بشكل دائم وجميع بياناته المرتبطة به.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handlePatientDeleted(patient)} className="bg-destructive hover:bg-destructive/90">
                                  نعم، قم بالحذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                       </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                          {searchTerm ? "لا يوجد مرضى يطابقون معايير البحث." : "لا توجد سجلات مرضى لعرضها."}
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedPatientForProfile && (
         <PatientDetails
          patient={selectedPatientForProfile}
          isOpen={!!selectedPatientForProfile}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedPatientForProfile(null);
            }
          }}
        />
      )}

      {selectedPatientForEdit && (
        <EditPatientDialog
          isOpen={!!selectedPatientForEdit}
          onClose={() => setSelectedPatientForEdit(null)}
          patient={selectedPatientForEdit}
          onPatientUpdated={handlePatientUpdated}
        />
      )}
    </>
  )
}
