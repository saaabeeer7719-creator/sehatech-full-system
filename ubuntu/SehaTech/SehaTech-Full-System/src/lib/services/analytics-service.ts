import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  startAfter,
  Timestamp,
  aggregateField,
  getAggregateFromServer,
  count,
  sum,
  average
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface DateRange {
  start: string
  end: string
}

export interface AppointmentStats {
  total: number
  completed: number
  cancelled: number
  pending: number
  noShow: number
  completionRate: number
  cancellationRate: number
  averageDuration: number
  peakHours: Array<{
    hour: number
    count: number
  }>
  dailyDistribution: Array<{
    date: string
    count: number
    completed: number
    cancelled: number
  }>
}

export interface DoctorStats {
  doctorId: string
  doctorName: string
  specialty: string
  totalAppointments: number
  completedAppointments: number
  totalRevenue: number
  averageRating: number
  patientSatisfaction: number
  averageConsultationTime: number
  busyHours: Array<{
    hour: number
    count: number
  }>
  monthlyPerformance: Array<{
    month: string
    appointments: number
    revenue: number
    rating: number
  }>
}

export interface PatientStats {
  totalPatients: number
  newPatients: number
  returningPatients: number
  averageAge: number
  genderDistribution: {
    male: number
    female: number
    other: number
  }
  ageGroups: Array<{
    ageGroup: string
    count: number
    percentage: number
  }>
  visitFrequency: Array<{
    frequency: string
    count: number
  }>
  geographicDistribution: Array<{
    city: string
    count: number
  }>
}

export interface RevenueReport {
  totalRevenue: number
  monthlyRevenue: number
  dailyAverage: number
  growth: {
    monthly: number
    yearly: number
  }
  revenueBySpecialty: Array<{
    specialty: string
    revenue: number
    percentage: number
  }>
  revenueByDoctor: Array<{
    doctorId: string
    doctorName: string
    revenue: number
    appointments: number
    averagePerAppointment: number
  }>
  paymentMethods: Array<{
    method: string
    amount: number
    percentage: number
  }>
  monthlyTrend: Array<{
    month: string
    revenue: number
    appointments: number
    averagePerAppointment: number
  }>
}

export interface SatisfactionReport {
  overallRating: number
  totalReviews: number
  ratingDistribution: Array<{
    rating: number
    count: number
    percentage: number
  }>
  doctorRatings: Array<{
    doctorId: string
    doctorName: string
    rating: number
    reviewCount: number
  }>
  commonComplaints: Array<{
    complaint: string
    count: number
  }>
  improvementAreas: Array<{
    area: string
    score: number
    suggestions: string[]
  }>
}

export interface CustomReportCriteria {
  dateRange: DateRange
  doctorIds?: string[]
  specialties?: string[]
  patientAgeGroups?: string[]
  appointmentTypes?: string[]
  metrics: string[]
  groupBy?: 'day' | 'week' | 'month' | 'doctor' | 'specialty'
}

export interface CustomReport {
  criteria: CustomReportCriteria
  data: Array<Record<string, any>>
  summary: Record<string, any>
  charts: Array<{
    type: 'bar' | 'line' | 'pie' | 'area'
    title: string
    data: Array<Record<string, any>>
  }>
}

class AnalyticsService {
  private appointmentsCollection = collection(db, 'appointments')
  private patientsCollection = collection(db, 'patients')
  private doctorsCollection = collection(db, 'doctors')
  private reviewsCollection = collection(db, 'reviews')
  private transactionsCollection = collection(db, 'transactions')

  // إحصائيات المواعيد
  async getAppointmentStats(period: DateRange): Promise<AppointmentStats> {
    try {
      const q = query(
        this.appointmentsCollection,
        where('date', '>=', period.start),
        where('date', '<=', period.end)
      )

      const snapshot = await getDocs(q)
      const appointments = snapshot.docs.map(doc => doc.data())

      // حساب الإحصائيات الأساسية
      const total = appointments.length
      const completed = appointments.filter(a => a.status.current === 'completed').length
      const cancelled = appointments.filter(a => a.status.current === 'cancelled').length
      const pending = appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status.current)).length
      const noShow = appointments.filter(a => a.status.current === 'no-show').length

      // حساب المعدلات
      const completionRate = total > 0 ? (completed / total) * 100 : 0
      const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0

      // حساب متوسط المدة
      const completedAppointments = appointments.filter(a => 
        a.status.current === 'completed' && a.actualStartTime && a.actualEndTime
      )
      const averageDuration = this.calculateAverageDuration(completedAppointments)

      // توزيع الساعات الذروة
      const peakHours = this.calculatePeakHours(appointments)

      // التوزيع اليومي
      const dailyDistribution = this.calculateDailyDistribution(appointments, period)

      return {
        total,
        completed,
        cancelled,
        pending,
        noShow,
        completionRate,
        cancellationRate,
        averageDuration,
        peakHours,
        dailyDistribution
      }
    } catch (error) {
      console.error('Error getting appointment stats:', error)
      throw error
    }
  }

  // إحصائيات الأطباء
  async getDoctorPerformance(doctorId: string, period: DateRange): Promise<DoctorStats> {
    try {
      // الحصول على بيانات الطبيب
      const doctorQuery = query(
        this.doctorsCollection,
        where('id', '==', doctorId)
      )
      const doctorSnapshot = await getDocs(doctorQuery)
      const doctor = doctorSnapshot.docs[0]?.data()

      if (!doctor) {
        throw new Error('الطبيب غير موجود')
      }

      // الحصول على مواعيد الطبيب
      const appointmentsQuery = query(
        this.appointmentsCollection,
        where('doctorId', '==', doctorId),
        where('date', '>=', period.start),
        where('date', '<=', period.end)
      )
      const appointmentsSnapshot = await getDocs(appointmentsQuery)
      const appointments = appointmentsSnapshot.docs.map(doc => doc.data())

      // حساب الإحصائيات
      const totalAppointments = appointments.length
      const completedAppointments = appointments.filter(a => a.status.current === 'completed').length
      const totalRevenue = appointments
        .filter(a => a.financial.paid)
        .reduce((sum, a) => sum + a.financial.fee, 0)

      // الحصول على التقييمات
      const reviewsQuery = query(
        this.reviewsCollection,
        where('doctorId', '==', doctorId)
      )
      const reviewsSnapshot = await getDocs(reviewsQuery)
      const reviews = reviewsSnapshot.docs.map(doc => doc.data())
      
      const averageRating = reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0

      // حساب متوسط وقت الاستشارة
      const averageConsultationTime = this.calculateAverageDuration(
        appointments.filter(a => a.status.current === 'completed')
      )

      // الساعات المزدحمة
      const busyHours = this.calculatePeakHours(appointments)

      // الأداء الشهري
      const monthlyPerformance = this.calculateMonthlyPerformance(appointments, reviews)

      return {
        doctorId,
        doctorName: doctor.personalInfo.name,
        specialty: doctor.personalInfo.specialty,
        totalAppointments,
        completedAppointments,
        totalRevenue,
        averageRating,
        patientSatisfaction: averageRating * 20, // تحويل إلى نسبة مئوية
        averageConsultationTime,
        busyHours,
        monthlyPerformance
      }
    } catch (error) {
      console.error('Error getting doctor performance:', error)
      throw error
    }
  }

  // إحصائيات المرضى
  async getPatientStats(period: DateRange): Promise<PatientStats> {
    try {
      // الحصول على جميع المرضى
      const patientsSnapshot = await getDocs(this.patientsCollection)
      const patients = patientsSnapshot.docs.map(doc => doc.data())

      // المرضى الجدد في الفترة المحددة
      const newPatientsQuery = query(
        this.patientsCollection,
        where('metadata.createdAt', '>=', Timestamp.fromDate(new Date(period.start))),
        where('metadata.createdAt', '<=', Timestamp.fromDate(new Date(period.end)))
      )
      const newPatientsSnapshot = await getDocs(newPatientsQuery)
      const newPatients = newPatientsSnapshot.docs.length

      // حساب الإحصائيات
      const totalPatients = patients.length
      const returningPatients = totalPatients - newPatients

      // توزيع الجنس
      const genderDistribution = {
        male: patients.filter(p => p.personalInfo.gender === 'ذكر').length,
        female: patients.filter(p => p.personalInfo.gender === 'أنثى').length,
        other: patients.filter(p => p.personalInfo.gender === 'آخر').length
      }

      // متوسط العمر
      const ages = patients
        .filter(p => p.personalInfo.dob)
        .map(p => this.calculateAge(p.personalInfo.dob))
      const averageAge = ages.length > 0 
        ? ages.reduce((sum, age) => sum + age, 0) / ages.length 
        : 0

      // الفئات العمرية
      const ageGroups = this.calculateAgeGroups(ages)

      // تكرار الزيارات
      const visitFrequency = await this.calculateVisitFrequency(patients, period)

      // التوزيع الجغرافي
      const geographicDistribution = this.calculateGeographicDistribution(patients)

      return {
        totalPatients,
        newPatients,
        returningPatients,
        averageAge,
        genderDistribution,
        ageGroups,
        visitFrequency,
        geographicDistribution
      }
    } catch (error) {
      console.error('Error getting patient stats:', error)
      throw error
    }
  }

  // تقرير الإيرادات
  async getRevenueReport(period: DateRange): Promise<RevenueReport> {
    try {
      // الحصول على المعاملات المالية
      const transactionsQuery = query(
        this.transactionsCollection,
        where('date', '>=', Timestamp.fromDate(new Date(period.start))),
        where('date', '<=', Timestamp.fromDate(new Date(period.end))),
        where('status', '==', 'Success')
      )
      const transactionsSnapshot = await getDocs(transactionsQuery)
      const transactions = transactionsSnapshot.docs.map(doc => doc.data())

      // حساب الإيرادات الإجمالية
      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0)

      // الإيرادات الشهرية (الشهر الحالي)
      const currentMonth = new Date().getMonth()
      const monthlyRevenue = transactions
        .filter(t => new Date(t.date.toDate()).getMonth() === currentMonth)
        .reduce((sum, t) => sum + t.amount, 0)

      // المتوسط اليومي
      const days = this.calculateDaysBetween(period.start, period.end)
      const dailyAverage = days > 0 ? totalRevenue / days : 0

      // حساب النمو
      const growth = await this.calculateRevenueGrowth(period)

      // الإيرادات حسب التخصص
      const revenueBySpecialty = await this.calculateRevenueBySpecialty(transactions)

      // الإيرادات حسب الطبيب
      const revenueByDoctor = await this.calculateRevenueByDoctor(transactions)

      // طرق الدفع
      const paymentMethods = this.calculatePaymentMethods(transactions)

      // الاتجاه الشهري
      const monthlyTrend = this.calculateMonthlyRevenueTrend(transactions)

      return {
        totalRevenue,
        monthlyRevenue,
        dailyAverage,
        growth,
        revenueBySpecialty,
        revenueByDoctor,
        paymentMethods,
        monthlyTrend
      }
    } catch (error) {
      console.error('Error getting revenue report:', error)
      throw error
    }
  }

  // تقرير رضا المرضى
  async getPatientSatisfaction(): Promise<SatisfactionReport> {
    try {
      const reviewsSnapshot = await getDocs(this.reviewsCollection)
      const reviews = reviewsSnapshot.docs.map(doc => doc.data())

      if (reviews.length === 0) {
        return {
          overallRating: 0,
          totalReviews: 0,
          ratingDistribution: [],
          doctorRatings: [],
          commonComplaints: [],
          improvementAreas: []
        }
      }

      // التقييم الإجمالي
      const overallRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      const totalReviews = reviews.length

      // توزيع التقييمات
      const ratingDistribution = this.calculateRatingDistribution(reviews)

      // تقييمات الأطباء
      const doctorRatings = await this.calculateDoctorRatings(reviews)

      // الشكاوى الشائعة
      const commonComplaints = this.extractCommonComplaints(reviews)

      // مجالات التحسين
      const improvementAreas = this.identifyImprovementAreas(reviews)

      return {
        overallRating,
        totalReviews,
        ratingDistribution,
        doctorRatings,
        commonComplaints,
        improvementAreas
      }
    } catch (error) {
      console.error('Error getting patient satisfaction:', error)
      throw error
    }
  }

  // تقرير مخصص
  async generateCustomReport(criteria: CustomReportCriteria): Promise<CustomReport> {
    try {
      // بناء الاستعلام بناءً على المعايير
      let q = query(this.appointmentsCollection)

      // تطبيق فلاتر التاريخ
      q = query(q, 
        where('date', '>=', criteria.dateRange.start),
        where('date', '<=', criteria.dateRange.end)
      )

      // تطبيق فلاتر إضافية
      if (criteria.doctorIds && criteria.doctorIds.length > 0) {
        q = query(q, where('doctorId', 'in', criteria.doctorIds))
      }

      if (criteria.appointmentTypes && criteria.appointmentTypes.length > 0) {
        q = query(q, where('type', 'in', criteria.appointmentTypes))
      }

      const snapshot = await getDocs(q)
      const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      // معالجة البيانات حسب المعايير
      const processedData = await this.processCustomReportData(appointments, criteria)

      // إنشاء الملخص
      const summary = this.generateReportSummary(processedData, criteria.metrics)

      // إنشاء الرسوم البيانية
      const charts = this.generateReportCharts(processedData, criteria)

      return {
        criteria,
        data: processedData,
        summary,
        charts
      }
    } catch (error) {
      console.error('Error generating custom report:', error)
      throw error
    }
  }

  // تصدير التقرير
  async exportReport(reportData: any, format: 'csv' | 'excel' | 'pdf'): Promise<Blob> {
    try {
      switch (format) {
        case 'csv':
          return this.exportToCSV(reportData)
        case 'excel':
          return this.exportToExcel(reportData)
        case 'pdf':
          return this.exportToPDF(reportData)
        default:
          throw new Error('تنسيق غير مدعوم')
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      throw error
    }
  }

  // دوال مساعدة خاصة
  private calculateAverageDuration(appointments: any[]): number {
    const durationsInMinutes = appointments
      .filter(a => a.actualStartTime && a.actualEndTime)
      .map(a => {
        const start = new Date(`2000-01-01T${a.actualStartTime}`)
        const end = new Date(`2000-01-01T${a.actualEndTime}`)
        return (end.getTime() - start.getTime()) / (1000 * 60) // بالدقائق
      })

    return durationsInMinutes.length > 0
      ? durationsInMinutes.reduce((sum, d) => sum + d, 0) / durationsInMinutes.length
      : 0
  }

  private calculatePeakHours(appointments: any[]): Array<{ hour: number; count: number }> {
    const hourCounts: Record<number, number> = {}
    
    appointments.forEach(appointment => {
      const hour = parseInt(appointment.time.split(':')[0])
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
  }

  private calculateDailyDistribution(appointments: any[], period: DateRange): Array<{
    date: string;
    count: number;
    completed: number;
    cancelled: number;
  }> {
    const dailyData: Record<string, { count: number; completed: number; cancelled: number }> = {}

    appointments.forEach(appointment => {
      const date = appointment.date
      if (!dailyData[date]) {
        dailyData[date] = { count: 0, completed: 0, cancelled: 0 }
      }
      
      dailyData[date].count++
      if (appointment.status.current === 'completed') {
        dailyData[date].completed++
      } else if (appointment.status.current === 'cancelled') {
        dailyData[date].cancelled++
      }
    })

    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  private calculateAge(dob: string): number {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  private calculateAgeGroups(ages: number[]): Array<{ ageGroup: string; count: number; percentage: number }> {
    const groups = {
      '0-18': 0,
      '19-35': 0,
      '36-50': 0,
      '51-65': 0,
      '65+': 0
    }

    ages.forEach(age => {
      if (age <= 18) groups['0-18']++
      else if (age <= 35) groups['19-35']++
      else if (age <= 50) groups['36-50']++
      else if (age <= 65) groups['51-65']++
      else groups['65+']++
    })

    const total = ages.length
    return Object.entries(groups).map(([ageGroup, count]) => ({
      ageGroup,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }))
  }

  private async calculateVisitFrequency(patients: any[], period: DateRange): Promise<Array<{ frequency: string; count: number }>> {
    // حساب تكرار زيارات المرضى
    const frequencies = {
      'زيارة واحدة': 0,
      '2-3 زيارات': 0,
      '4-6 زيارات': 0,
      '7+ زيارات': 0
    }

    // هذا يتطلب استعلام إضافي للمواعيد لكل مريض
    // يمكن تحسينه لاحقاً

    return Object.entries(frequencies).map(([frequency, count]) => ({
      frequency,
      count
    }))
  }

  private calculateGeographicDistribution(patients: any[]): Array<{ city: string; count: number }> {
    const cityCount: Record<string, number> = {}
    
    patients.forEach(patient => {
      const city = patient.personalInfo.address.city || 'غير محدد'
      cityCount[city] = (cityCount[city] || 0) + 1
    })

    return Object.entries(cityCount)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
  }

  private calculateDaysBetween(start: string, end: string): number {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  private async calculateRevenueGrowth(period: DateRange): Promise<{ monthly: number; yearly: number }> {
    // حساب نمو الإيرادات مقارنة بالفترات السابقة
    // يتطلب استعلامات إضافية للفترات السابقة
    return { monthly: 0, yearly: 0 }
  }

  private async calculateRevenueBySpecialty(transactions: any[]): Promise<Array<{
    specialty: string;
    revenue: number;
    percentage: number;
  }>> {
    // تجميع الإيرادات حسب التخصص
    // يتطلب ربط المعاملات بالأطباء والتخصصات
    return []
  }

  private async calculateRevenueByDoctor(transactions: any[]): Promise<Array<{
    doctorId: string;
    doctorName: string;
    revenue: number;
    appointments: number;
    averagePerAppointment: number;
  }>> {
    // تجميع الإيرادات حسب الطبيب
    return []
  }

  private calculatePaymentMethods(transactions: any[]): Array<{ method: string; amount: number; percentage: number }> {
    const methodTotals: Record<string, number> = {}
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)

    transactions.forEach(transaction => {
      const method = transaction.paymentMethod || 'نقدي'
      methodTotals[method] = (methodTotals[method] || 0) + transaction.amount
    })

    return Object.entries(methodTotals).map(([method, amount]) => ({
      method,
      amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
    }))
  }

  private calculateMonthlyRevenueTrend(transactions: any[]): Array<{
    month: string;
    revenue: number;
    appointments: number;
    averagePerAppointment: number;
  }> {
    // حساب اتجاه الإيرادات الشهرية
    return []
  }

  private calculateMonthlyPerformance(appointments: any[], reviews: any[]): Array<{
    month: string;
    appointments: number;
    revenue: number;
    rating: number;
  }> {
    // حساب الأداء الشهري للطبيب
    return []
  }

  private calculateRatingDistribution(reviews: any[]): Array<{ rating: number; count: number; percentage: number }> {
    const ratingCounts: Record<number, number> = {}
    const totalReviews = reviews.length

    reviews.forEach(review => {
      const rating = Math.floor(review.rating)
      ratingCounts[rating] = (ratingCounts[rating] || 0) + 1
    })

    return [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: ratingCounts[rating] || 0,
      percentage: totalReviews > 0 ? ((ratingCounts[rating] || 0) / totalReviews) * 100 : 0
    }))
  }

  private async calculateDoctorRatings(reviews: any[]): Promise<Array<{
    doctorId: string;
    doctorName: string;
    rating: number;
    reviewCount: number;
  }>> {
    // حساب تقييمات الأطباء
    return []
  }

  private extractCommonComplaints(reviews: any[]): Array<{ complaint: string; count: number }> {
    // استخراج الشكاوى الشائعة من التعليقات
    return []
  }

  private identifyImprovementAreas(reviews: any[]): Array<{
    area: string;
    score: number;
    suggestions: string[];
  }> {
    // تحديد مجالات التحسين
    return []
  }

  private async processCustomReportData(appointments: any[], criteria: CustomReportCriteria): Promise<Array<Record<string, any>>> {
    // معالجة البيانات للتقرير المخصص
    return appointments
  }

  private generateReportSummary(data: any[], metrics: string[]): Record<string, any> {
    // إنشاء ملخص التقرير
    return {}
  }

  private generateReportCharts(data: any[], criteria: CustomReportCriteria): Array<{
    type: 'bar' | 'line' | 'pie' | 'area';
    title: string;
    data: Array<Record<string, any>>;
  }> {
    // إنشاء الرسوم البيانية
    return []
  }

  private exportToCSV(data: any): Blob {
    // تصدير إلى CSV
    const csv = 'CSV data here'
    return new Blob([csv], { type: 'text/csv' })
  }

  private exportToExcel(data: any): Blob {
    // تصدير إلى Excel
    return new Blob([], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }

  private exportToPDF(data: any): Blob {
    // تصدير إلى PDF
    return new Blob([], { type: 'application/pdf' })
  }
}

export const analyticsService = new AnalyticsService()

