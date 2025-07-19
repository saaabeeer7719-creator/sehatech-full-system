"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts"
import {
  Calendar,
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  UserCheck,
  AlertCircle,
  Download,
  Filter
} from "lucide-react"

interface AnalyticsData {
  appointments: {
    total: number
    completed: number
    cancelled: number
    pending: number
    growth: number
  }
  patients: {
    total: number
    new: number
    returning: number
    growth: number
  }
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
    growth: number
  }
  doctors: {
    total: number
    active: number
    performance: Array<{
      name: string
      appointments: number
      revenue: number
      rating: number
    }>
  }
}

interface ChartData {
  appointmentsByDay: Array<{
    date: string
    appointments: number
    completed: number
    cancelled: number
  }>
  appointmentsBySpecialty: Array<{
    specialty: string
    count: number
    revenue: number
  }>
  patientsByAge: Array<{
    ageGroup: string
    count: number
  }>
  revenueByMonth: Array<{
    month: string
    revenue: number
    appointments: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

// بيانات تجريبية
const mockAnalyticsData: AnalyticsData = {
  appointments: {
    total: 1247,
    completed: 1089,
    cancelled: 89,
    pending: 69,
    growth: 12.5
  },
  patients: {
    total: 856,
    new: 124,
    returning: 732,
    growth: 8.3
  },
  revenue: {
    total: 245600,
    thisMonth: 45600,
    lastMonth: 38900,
    growth: 17.2
  },
  doctors: {
    total: 12,
    active: 11,
    performance: [
      { name: "د. أحمد محمد", appointments: 156, revenue: 23400, rating: 4.8 },
      { name: "د. فاطمة علي", appointments: 142, revenue: 21300, rating: 4.9 },
      { name: "د. محمد حسن", appointments: 134, revenue: 20100, rating: 4.7 },
      { name: "د. سارة أحمد", appointments: 128, revenue: 19200, rating: 4.6 },
      { name: "د. عبدالله خالد", appointments: 119, revenue: 17850, rating: 4.5 }
    ]
  }
}

const mockChartData: ChartData = {
  appointmentsByDay: [
    { date: "الأحد", appointments: 45, completed: 38, cancelled: 7 },
    { date: "الاثنين", appointments: 52, completed: 47, cancelled: 5 },
    { date: "الثلاثاء", appointments: 48, completed: 43, cancelled: 5 },
    { date: "الأربعاء", appointments: 61, completed: 55, cancelled: 6 },
    { date: "الخميس", appointments: 55, completed: 49, cancelled: 6 },
    { date: "الجمعة", appointments: 38, completed: 34, cancelled: 4 },
    { date: "السبت", appointments: 42, completed: 37, cancelled: 5 }
  ],
  appointmentsBySpecialty: [
    { specialty: "الطب العام", count: 245, revenue: 36750 },
    { specialty: "طب الأطفال", count: 189, revenue: 28350 },
    { specialty: "النساء والولادة", count: 167, revenue: 25050 },
    { specialty: "الجلدية", count: 134, revenue: 20100 },
    { specialty: "العظام", count: 112, revenue: 16800 },
    { specialty: "القلب", count: 98, revenue: 14700 }
  ],
  patientsByAge: [
    { ageGroup: "0-18", count: 156 },
    { ageGroup: "19-35", count: 234 },
    { ageGroup: "36-50", count: 198 },
    { ageGroup: "51-65", count: 167 },
    { ageGroup: "65+", count: 101 }
  ],
  revenueByMonth: [
    { month: "يناير", revenue: 38500, appointments: 245 },
    { month: "فبراير", revenue: 42300, appointments: 267 },
    { month: "مارس", revenue: 39800, appointments: 251 },
    { month: "أبريل", revenue: 45600, appointments: 289 },
    { month: "مايو", revenue: 48200, appointments: 305 },
    { month: "يونيو", revenue: 44900, appointments: 278 }
  ]
}

export function AnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("thisMonth")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(mockAnalyticsData)
  const [chartData, setChartData] = useState<ChartData>(mockChartData)

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    description,
    trend = "up" 
  }: {
    title: string
    value: string | number
    change?: number
    icon: any
    description?: string
    trend?: "up" | "down"
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-right">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-right">{value}</div>
        {change !== undefined && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={trend === "up" ? "text-green-500" : "text-red-500"}>
              {change > 0 ? "+" : ""}{change}%
            </span>
            <span>من الشهر الماضي</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1 text-right">{description}</p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-right">التحليلات والتقارير</h2>
          <p className="text-muted-foreground text-right">
            نظرة شاملة على أداء العيادة والإحصائيات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">اليوم</SelectItem>
              <SelectItem value="thisWeek">هذا الأسبوع</SelectItem>
              <SelectItem value="thisMonth">هذا الشهر</SelectItem>
              <SelectItem value="lastMonth">الشهر الماضي</SelectItem>
              <SelectItem value="thisYear">هذا العام</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 ml-2" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي المواعيد"
          value={analyticsData.appointments.total.toLocaleString()}
          change={analyticsData.appointments.growth}
          icon={Calendar}
          description={`${analyticsData.appointments.completed} مكتمل، ${analyticsData.appointments.pending} في الانتظار`}
        />
        <StatCard
          title="إجمالي المرضى"
          value={analyticsData.patients.total.toLocaleString()}
          change={analyticsData.patients.growth}
          icon={Users}
          description={`${analyticsData.patients.new} مريض جديد هذا الشهر`}
        />
        <StatCard
          title="الإيرادات"
          value={`${analyticsData.revenue.total.toLocaleString()} ريال`}
          change={analyticsData.revenue.growth}
          icon={DollarSign}
          description={`${analyticsData.revenue.thisMonth.toLocaleString()} ريال هذا الشهر`}
        />
        <StatCard
          title="الأطباء النشطون"
          value={`${analyticsData.doctors.active}/${analyticsData.doctors.total}`}
          icon={UserCheck}
          description="أطباء متاحون حالياً"
        />
      </div>

      {/* Charts and Detailed Analytics */}
      <Tabs defaultValue="appointments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appointments">المواعيد</TabsTrigger>
          <TabsTrigger value="patients">المرضى</TabsTrigger>
          <TabsTrigger value="revenue">الإيرادات</TabsTrigger>
          <TabsTrigger value="doctors">الأطباء</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-right">المواعيد حسب اليوم</CardTitle>
                <CardDescription className="text-right">
                  توزيع المواعيد خلال أيام الأسبوع
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.appointmentsByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completed" fill="#22c55e" name="مكتمل" />
                    <Bar dataKey="cancelled" fill="#ef4444" name="ملغي" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-right">المواعيد حسب التخصص</CardTitle>
                <CardDescription className="text-right">
                  توزيع المواعيد على التخصصات المختلفة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.appointmentsBySpecialty}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ specialty, percent }) => `${specialty} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {chartData.appointmentsBySpecialty.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Appointment Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-right">حالة المواعيد</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">مكتملة</span>
                    <span className="text-sm text-muted-foreground">
                      {analyticsData.appointments.completed}
                    </span>
                  </div>
                  <Progress 
                    value={(analyticsData.appointments.completed / analyticsData.appointments.total) * 100} 
                    className="h-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">في الانتظار</span>
                    <span className="text-sm text-muted-foreground">
                      {analyticsData.appointments.pending}
                    </span>
                  </div>
                  <Progress 
                    value={(analyticsData.appointments.pending / analyticsData.appointments.total) * 100} 
                    className="h-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">ملغية</span>
                    <span className="text-sm text-muted-foreground">
                      {analyticsData.appointments.cancelled}
                    </span>
                  </div>
                  <Progress 
                    value={(analyticsData.appointments.cancelled / analyticsData.appointments.total) * 100} 
                    className="h-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">معدل الإكمال</span>
                    <span className="text-sm text-muted-foreground">
                      {((analyticsData.appointments.completed / analyticsData.appointments.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={(analyticsData.appointments.completed / analyticsData.appointments.total) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-right">المرضى حسب الفئة العمرية</CardTitle>
                <CardDescription className="text-right">
                  توزيع المرضى على الفئات العمرية المختلفة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.patientsByAge}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="ageGroup" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-right">نمو قاعدة المرضى</CardTitle>
                <CardDescription className="text-right">
                  تطور عدد المرضى الجدد والعائدين
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="text-right">
                      <div className="text-sm font-medium">مرضى جدد</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {analyticsData.patients.new}
                      </div>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="text-right">
                      <div className="text-sm font-medium">مرضى عائدون</div>
                      <div className="text-2xl font-bold text-green-600">
                        {analyticsData.patients.returning}
                      </div>
                    </div>
                    <UserCheck className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="text-right">
                      <div className="text-sm font-medium">معدل العودة</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {((analyticsData.patients.returning / analyticsData.patients.total) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">الإيرادات الشهرية</CardTitle>
              <CardDescription className="text-right">
                تطور الإيرادات والمواعيد على مدار الأشهر
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6}
                    name="الإيرادات"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-right">متوسط الإيرادات اليومية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right">
                  {(analyticsData.revenue.thisMonth / 30).toLocaleString('ar-SA', {
                    style: 'currency',
                    currency: 'SAR'
                  })}
                </div>
                <p className="text-xs text-muted-foreground text-right mt-1">
                  بناءً على إيرادات هذا الشهر
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-right">متوسط قيمة الموعد</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-right">
                  {(analyticsData.revenue.total / analyticsData.appointments.total).toLocaleString('ar-SA', {
                    style: 'currency',
                    currency: 'SAR'
                  })}
                </div>
                <p className="text-xs text-muted-foreground text-right mt-1">
                  متوسط قيمة الموعد الواحد
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-right">نمو الإيرادات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 text-right">
                  +{analyticsData.revenue.growth}%
                </div>
                <p className="text-xs text-muted-foreground text-right mt-1">
                  مقارنة بالشهر الماضي
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="doctors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">أداء الأطباء</CardTitle>
              <CardDescription className="text-right">
                إحصائيات الأطباء من حيث المواعيد والإيرادات والتقييمات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.doctors.performance.map((doctor, index) => (
                  <div key={doctor.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{doctor.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {doctor.appointments} موعد • {doctor.revenue.toLocaleString()} ريال
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        ⭐ {doctor.rating}
                      </Badge>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {doctor.revenue.toLocaleString()} ريال
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {doctor.appointments} موعد
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

