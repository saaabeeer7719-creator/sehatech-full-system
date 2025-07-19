
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
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
import type { Transaction, Patient, Appointment } from "@/lib/types";
import { Button } from "../ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { suggestBillingService, SuggestBillingServiceInput } from "@/ai/flows/suggest-billing-service";
import { Sparkles, Loader2, Search } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy, where, getDocs } from "firebase/firestore"
import { LocalizedDateTime } from "../localized-date-time";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { logAuditEvent } from "@/lib/audit-log-service";

export function BillingTab({ }: {}) {
  const [currentUser] = useAuthState(auth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>();
  const [amount, setAmount] = useState("");
  const [service, setService] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const trans = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(trans);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "patients"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const pats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      setPatients(pats);
    });
    return () => unsubscribe();
  }, []);

  const handleRecordTransaction = async () => {
    if (!selectedPatientId || !amount || !service || !currentUser) {
      toast({
        variant: "destructive",
        title: "معلومات ناقصة",
        description: "يرجى تعبئة جميع الحقول.",
      });
      return;
    }

    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;

    try {
        const docRef = await addDoc(collection(db, "transactions"), {
            patientId: selectedPatientId,
            patientName: patient.name,
            date: serverTimestamp(),
            amount: parseFloat(amount),
            status: 'Success',
            service,
        });
        toast({
          title: "تم تسجيل الفاتورة",
          description: `تم تسجيل فاتورة بمبلغ ${amount} لـ ${patient.name}.`,
        });
        await logAuditEvent('إنشاء فاتورة (يدوي)', { transactionId: docRef.id, patientName: patient.name, amount }, currentUser.uid);
        setIsDialogOpen(false);
    } catch(e) {
        console.error("Error adding transaction:", e);
        toast({ variant: "destructive", title: "خطأ", description: "فشل تسجيل الفاتورة." });
    }
  };

  const handleSuggestService = async () => {
    if (!selectedPatientId) {
      toast({
        variant: "destructive",
        title: "لم يتم اختيار المريض",
        description: "الرجاء اختيار المريض أولاً لاقتراح خدمة.",
      });
      return;
    }

    setIsSuggesting(true);
    try {
      const appointmentsQuery = query(collection(db, "appointments"), where("patientId", "==", selectedPatientId), orderBy("dateTime", "desc"));
      const querySnapshot = await getDocs(appointmentsQuery);

      const recentAppointments = querySnapshot.docs.map(doc => {
          const data = doc.data() as Appointment;
          return {
            doctorSpecialty: data.doctorSpecialty,
            dateTime: data.dateTime,
            status: data.status,
          }
      });
      
      const input: SuggestBillingServiceInput = {
        patientId: selectedPatientId,
        recentAppointments: recentAppointments,
      };

      const result = await suggestBillingService(input);
      setService(result.service);

    } catch (error) {
      console.error("Error suggesting billing service:", error);
      toast({
        variant: "destructive",
        title: "خطأ في الاقتراح",
        description: "لم نتمكن من اقتراح خدمة في الوقت الحالي.",
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return transactions;
    return transactions.filter(transaction =>
      transaction.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);
  
  const resetDialog = useCallback(() => {
    setSelectedPatientId(undefined);
    setAmount("");
    setService("");
  }, []);

  useEffect(() => {
    if (!isDialogOpen) {
      resetDialog();
    }
  }, [isDialogOpen, resetDialog]);


  return (
    <Card>
       <CardHeader>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>الفواتير</CardTitle>
            <CardDescription>عرض وإدارة جميع المعاملات المالية.</CardDescription>
          </div>
           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>تسجيل فاتورة</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>تسجيل فاتورة جديدة</DialogTitle>
                <DialogDescription>
                  أدخل تفاصيل الفاتورة الجديدة.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="patient" className="text-right">
                    المريض
                  </Label>
                   <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                    <SelectTrigger id="patient" className="col-span-3">
                      <SelectValue placeholder="اختر مريضاً" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="service" className="text-right">الخدمة</Label>
                  <div className="col-span-3 flex items-center gap-2">
                     <Input id="service" placeholder="مثال: فحص عام" className="flex-grow" value={service} onChange={(e) => setService(e.target.value)} />
                      <Button variant="outline" size="icon" onClick={handleSuggestService} disabled={isSuggesting || !selectedPatientId}>
                        {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        <span className="sr-only">اقتراح خدمة</span>
                      </Button>
                  </div>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">المبلغ (﷼)</Label>
                  <Input id="amount" type="number" placeholder="5000" className="col-span-3" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                 <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                 <Button onClick={handleRecordTransaction}>حفظ الفاتورة</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
         <div className="mt-4 relative w-full sm:max-w-xs">
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="ابحث باسم المريض أو رقم الفاتورة..."
              className="w-full appearance-none bg-background pr-8 shadow-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px] text-right">رقم الفاتورة</TableHead>
                <TableHead className="text-right">المريض</TableHead>
                <TableHead className="text-right">الخدمة</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono text-xs" dir="ltr">{transaction.id}</TableCell>
                  <TableCell>{transaction.patientName}</TableCell>
                  <TableCell>{transaction.service}</TableCell>
                  <TableCell><LocalizedDateTime dateTime={transaction.date} /></TableCell>
                  <TableCell>{transaction.amount.toLocaleString('ar-EG')} ﷼</TableCell>
                  <TableCell>
                     <Badge variant={
                       transaction.status === 'Success' ? 'success' : 'destructive'
                     }>
                      {transaction.status === 'Success' ? 'ناجحة' : 'فاشلة'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
               {filteredTransactions.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                          لا توجد فواتير تطابق معايير البحث.
                      </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
