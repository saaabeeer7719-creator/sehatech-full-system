

"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CalendarIcon, Download, BarChart2, User, FileText, Loader2 } from "lucide-react"
import { format, startOfDay, endOfDay } from "date-fns"
import { ar } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import type { Transaction } from "@/lib/types"
import { LocalizedDateTime } from "../localized-date-time"

const reportTypes = [
  { value: "financial_summary", label: "ملخص مالي", icon: FileText },
  { value: "doctor_activity", label: "تقرير نشاط الأطباء", icon: User },
  { value: "appointment_summary", label: "ملخص المواعيد", icon: BarChart2 },
]

interface ReportData {
  totalRevenue: number;
  transactionCount: number;
  transactions: Transaction[];
}

export function ReportsTab() {
  const { toast } = useToast()
  const [selectedReportType, setSelectedReportType] = useState("financial_summary")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  })
  const [isLoading, setIsLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)

  const handleGenerateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        variant: "destructive",
        title: "نطاق تاريخ غير صالح",
        description: "الرجاء تحديد تاريخ بداية ونهاية للتقرير.",
      })
      return
    }

    setIsLoading(true)
    setReportData(null)

    try {
      if (selectedReportType === "financial_summary") {
        const start = Timestamp.fromDate(startOfDay(dateRange.from))
        const end = Timestamp.fromDate(endOfDay(dateRange.to))
        
        const q = query(
          collection(db, "transactions"),
          where("date", ">=", start),
          where("date", "<=", end)
        )
        
        const querySnapshot = await getDocs(q)
        const transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
        
        const totalRevenue = transactions.reduce((sum, t) => t.status === 'Success' ? sum + t.amount : sum, 0)
        
        setReportData({
          totalRevenue,
          transactionCount: transactions.length,
          transactions,
        })
      } else {
         toast({
          title: "تقرير غير مدعوم حاليًا",
          description: `إنشاء تقرير "${reportTypes.find(r=>r.value === selectedReportType)?.label}" قيد التطوير.`,
        })
      }
    } catch (error) {
      console.error("Error generating report:", error)
      toast({
        variant: "destructive",
        title: "خطأ في إنشاء التقرير",
        description: "حدث خطأ غير متوقع أثناء جلب بيانات التقرير.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = () => {
    if (!reportData) {
      toast({
        variant: "destructive",
        title: "لا توجد بيانات للتصدير",
        description: "الرجاء إنشاء تقرير أولاً قبل محاولة التصدير.",
      })
      return
    }
    // This is a placeholder for the actual export functionality.
    toast({
      title: "جاري تصدير التقرير...",
      description: `سيتم تجهيز تقريرك للتحميل. (ميزة قيد التطوير)`,
    })
  }
  
  const selectedReport = reportTypes.find(r => r.value === selectedReportType);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إنشاء التقارير</CardTitle>
          <CardDescription>
            اختر نوع التقرير والفترة الزمنية المطلوبة ثم قم بإنشاء تقريرك.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">نوع التقرير</label>
            <Select value={selectedReportType} onValueChange={setSelectedReportType}>
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع التقرير" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((report) => (
                  <SelectItem key={report.value} value={report.value}>
                    <div className="flex items-center gap-2">
                      <report.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{report.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">نطاق التاريخ</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-right font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                   {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "PPP", { locale: ar })} -{" "}
                          {format(dateRange.to, "PPP", { locale: ar })}
                        </>
                      ) : (
                        format(dateRange.from, "PPP", { locale: ar })
                      )
                    ) : (
                      <span>اختر نطاقًا</span>
                    )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={ar}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col space-y-2 justify-end">
            <Button onClick={handleGenerateReport} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <BarChart2 className="ml-2 h-4 w-4" />
              )}
              إنشاء التقرير
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
         <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mr-4 text-muted-foreground">جاري إنشاء التقرير...</p>
        </div>
      )}

      {reportData && selectedReportType === 'financial_summary' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>تقرير الملخص المالي</CardTitle>
              <CardDescription>
                الفترة من {format(dateRange!.from!, "PPP", { locale: ar })} إلى {format(dateRange!.to!, "PPP", { locale: ar })}
              </CardDescription>
            </div>
             <Button onClick={handleExport} variant="outline">
              <Download className="ml-2 h-4 w-4" />
              تصدير
            </Button>
          </CardHeader>
          <CardContent>
             <div className="grid gap-4 md:grid-cols-2 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                   <span className="text-muted-foreground">﷼</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalRevenue.toLocaleString('ar-EG')} ﷼</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">عدد الفواتير</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.transactionCount}</div>
                </CardContent>
              </Card>
            </div>

            <h4 className="text-lg font-semibold mb-2">تفاصيل الفواتير</h4>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>رقم الفاتورة</TableHead>
                            <TableHead>المريض</TableHead>
                            <TableHead>الخدمة</TableHead>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>المبلغ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.transactions.length > 0 ? reportData.transactions.map((t) => (
                            <TableRow key={t.id}>
                                <TableCell className="font-mono text-xs" dir="ltr">{t.id}</TableCell>
                                <TableCell>{t.patientName}</TableCell>
                                <TableCell>{t.service}</TableCell>
                                <TableCell><LocalizedDateTime dateTime={t.date} options={{ dateStyle: 'short' }} /></TableCell>
                                <TableCell>{t.amount.toLocaleString('ar-EG')} ﷼</TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">لا توجد فواتير في الفترة المحددة.</TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

    