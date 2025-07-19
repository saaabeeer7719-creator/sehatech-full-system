
"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Patient, Appointment, Transaction } from "@/lib/types"
import { getPatientInitials } from "@/lib/utils"
import { Cake, VenetianMask, Phone, Home, Sparkles } from "lucide-react"
import { Button } from "./ui/button"
import { summarizePatientHistory, SummarizePatientHistoryInput } from "@/ai/flows/summarize-patient-history"
import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { Skeleton } from "./ui/skeleton"
import { LocalizedDateTime } from "./localized-date-time"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore"

interface PatientDetailsProps {
  patient: Patient
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

const statusTranslations: { [key: string]: string } = {
  'Scheduled': 'مجدول',
  'Waiting': 'في الانتظار',
  'Completed': 'مكتمل',
  'Follow-up': 'إعادة'
};

function calculateAge(dob: string | undefined): number {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function PatientDetails({ patient, isOpen, onOpenChange }: PatientDetailsProps) {
  const [summary, setSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [patientTransactions, setPatientTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
      if (!patient || !isOpen) return;

      const appointmentsQuery = query(collection(db, "appointments"), where("patientId", "==", patient.id));
      const appointmentsUnsubscribe = onSnapshot(appointmentsQuery, (snapshot) => {
          const appts = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Appointment);
          // Sort appointments locally
          appts.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
          setPatientAppointments(appts);
      });

      const transactionsQuery = query(collection(db, "transactions"), where("patientId", "==", patient.id));
      const transactionsUnsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
          const trans = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Transaction);
           // Sort transactions locally
          trans.sort((a, b) => {
              const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
              const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
              return dateB.getTime() - dateA.getTime();
          });
          setPatientTransactions(trans);
      });

      return () => {
          appointmentsUnsubscribe();
          transactionsUnsubscribe();
      };

  }, [patient, isOpen]);


  useEffect(() => {
    const generateSummary = async () => {
      if (!isOpen || !patient) return;
      setIsLoadingSummary(true);
      setSummary('');
      try {
        const input: SummarizePatientHistoryInput = {
          patient: {
            name: patient.name,
            age: calculateAge(patient.dob),
            gender: patient.gender,
          },
          appointments: patientAppointments.map(a => ({
            doctorName: a.doctorName,
            doctorSpecialty: a.doctorSpecialty,
            dateTime: new Date(a.dateTime).toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' }),
            status: statusTranslations[a.status] || a.status,
          })),
        };
        const result = await summarizePatientHistory(input);
        setSummary(result.summary);
      } catch (error) {
        console.error("Error generating patient summary:", error);
        setSummary("عذراً، لم نتمكن من إنشاء الملخص في الوقت الحالي.");
      } finally {
        setIsLoadingSummary(false);
      }
    };

    if (isOpen && patientAppointments.length > 0) {
      generateSummary();
    }
  }, [patient, isOpen, patientAppointments]);

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <div className="flex items-center gap-4">
             <Avatar className="h-20 w-20">
              <AvatarImage src={patient.avatarUrl} data-ai-hint="person avatar" />
              <AvatarFallback className="text-2xl">{getPatientInitials(patient.name)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl">{patient.name}</DialogTitle>
              <DialogDescription>{patient.phone}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-6 max-h-[70vh] overflow-y-auto pr-2">
            <div className="md:col-span-3 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">سجل المواعيد</h3>
                    <div className="max-h-48 overflow-y-auto border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>الحالة</TableHead>
                            <TableHead>التاريخ والوقت</TableHead>
                            <TableHead>الطبيب</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {patientAppointments.length > 0 ? (
                            patientAppointments.map((appointment: Appointment) => (
                            <TableRow key={appointment.id}>
                              <TableCell>
                                <Badge variant={
                                  appointment.status === 'Completed' ? 'success' :
                                  appointment.status === 'Scheduled' ? 'secondary' :
                                  appointment.status === 'Waiting' ? 'waiting' :
                                  'followup'
                                }>
                                  {statusTranslations[appointment.status]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <LocalizedDateTime dateTime={appointment.dateTime} options={{ dateStyle: 'short', timeStyle: 'short', hour12: true }}/>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{appointment.doctorName}</div>
                                <div className="text-xs text-muted-foreground">{appointment.doctorSpecialty}</div>
                              </TableCell>
                            </TableRow>
                          ))) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">لا توجد مواعيد.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2">سجل الفواتير</h3>
                    <div className="max-h-48 overflow-y-auto border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>الحالة</TableHead>
                            <TableHead>المبلغ</TableHead>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>الخدمة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                           {patientTransactions.length > 0 ? (
                            patientTransactions.map((transaction: Transaction) => (
                            <TableRow key={transaction.id}>
                               <TableCell>
                                 <Badge variant={
                                   transaction.status === 'Success' ? 'success' : 'destructive'
                                 }>
                                  {transaction.status === 'Success' ? 'ناجحة' : 'فاشلة'}
                                </Badge>
                               </TableCell>
                               <TableCell>{transaction.amount.toLocaleString('ar-EG')} ﷼</TableCell>
                               <TableCell>
                                 <LocalizedDateTime dateTime={transaction.date} />
                                </TableCell>
                               <TableCell>{transaction.service}</TableCell>
                            </TableRow>
                           ))) : (
                             <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">لا توجد فواتير.</TableCell>
                            </TableRow>
                           )}
                        </TableBody>
                      </Table>
                    </div>
                </div>
            </div>
            <div className="md:col-span-2 space-y-6">
                 <div>
                    <h3 className="text-lg font-semibold mb-3">معلومات المريض</h3>
                    <div className="space-y-3 text-sm">
                       <div className="flex items-center gap-3">
                            <Cake className="h-4 w-4 text-muted-foreground" />
                            <span>العمر: {calculateAge(patient.dob) || "غير محدد"} سنة</span>
                       </div>
                       <div className="flex items-center gap-3">
                            <VenetianMask className="h-4 w-4 text-muted-foreground" />
                            <span>{patient.gender}</span>
                       </div>
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{patient.phone}</span>
                       </div>
                       <div className="flex items-center gap-3">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            <span>{patient.address}</span>
                       </div>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold mb-3">ملخص ذكي</h3>
                    <Alert>
                      <Sparkles className="h-4 w-4" />
                      <AlertTitle>ملخص السجل الطبي</AlertTitle>
                      <AlertDescription>
                        {isLoadingSummary ? (
                          <div className="space-y-2 mt-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        ) : (
                           summary || "لم يتم إنشاء ملخص بعد."
                        )}
                      </AlertDescription>
                    </Alert>
                </div>
            </div>
        </div>
         <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

    