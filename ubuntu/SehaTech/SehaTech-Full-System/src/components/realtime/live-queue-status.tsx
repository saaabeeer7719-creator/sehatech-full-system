"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Clock,
  Users,
  UserCheck,
  AlertCircle,
  Play,
  Pause,
  SkipForward,
  RefreshCw,
  Timer
} from "lucide-react"
import { realTimeService, QueueStatus } from "@/lib/services/realtime-service"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"

interface LiveQueueStatusProps {
  doctorId: string
  onPatientCall?: (patientId: string) => void
  onNextPatient?: () => void
  onPauseQueue?: () => void
  onResumeQueue?: () => void
}

interface QueuePatient {
  patientId: string
  patientName: string
  appointmentTime: string
  estimatedTime: string
  waitingTime: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'waiting' | 'called' | 'in-progress' | 'completed'
  avatarUrl?: string
}

export function LiveQueueStatus({
  doctorId,
  onPatientCall,
  onNextPatient,
  onPauseQueue,
  onResumeQueue
}: LiveQueueStatusProps) {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [queuePaused, setQueuePaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(true)

  // تحديث الوقت كل دقيقة
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // الاستماع لتحديثات الطابور
  useEffect(() => {
    const unsubscribe = realTimeService.subscribeToQueueStatus(doctorId, (status) => {
      setQueueStatus(status)
      setLoading(false)
    })

    return unsubscribe
  }, [doctorId])

  // بيانات تجريبية للطابور
  const mockQueuePatients: QueuePatient[] = [
    {
      patientId: "p1",
      patientName: "أحمد محمد علي",
      appointmentTime: "09:00",
      estimatedTime: "09:15",
      waitingTime: 15,
      priority: "high",
      status: "in-progress",
      avatarUrl: "/avatars/patient1.jpg"
    },
    {
      patientId: "p2", 
      patientName: "فاطمة أحمد حسن",
      appointmentTime: "09:30",
      estimatedTime: "09:45",
      waitingTime: 45,
      priority: "medium",
      status: "waiting"
    },
    {
      patientId: "p3",
      patientName: "محمد عبدالله",
      appointmentTime: "10:00",
      estimatedTime: "10:20",
      waitingTime: 80,
      priority: "urgent",
      status: "waiting"
    },
    {
      patientId: "p4",
      patientName: "سارة محمود",
      appointmentTime: "10:30",
      estimatedTime: "10:55",
      waitingTime: 115,
      priority: "low",
      status: "waiting"
    },
    {
      patientId: "p5",
      patientName: "عبدالرحمن خالد",
      appointmentTime: "11:00",
      estimatedTime: "11:30",
      waitingTime: 150,
      priority: "medium",
      status: "waiting"
    }
  ]

  const currentPatient = mockQueuePatients.find(p => p.status === 'in-progress')
  const waitingPatients = mockQueuePatients.filter(p => p.status === 'waiting')
  const totalWaitingTime = waitingPatients.reduce((sum, p) => sum + p.waitingTime, 0)
  const averageWaitTime = waitingPatients.length > 0 ? totalWaitingTime / waitingPatients.length : 0

  const priorityColors = {
    low: "bg-gray-100 text-gray-800 border-gray-200",
    medium: "bg-blue-100 text-blue-800 border-blue-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    urgent: "bg-red-100 text-red-800 border-red-200"
  }

  const priorityLabels = {
    low: "منخفضة",
    medium: "متوسطة", 
    high: "عالية",
    urgent: "عاجلة"
  }

  const handleCallPatient = (patientId: string) => {
    onPatientCall?.(patientId)
  }

  const handleNextPatient = () => {
    onNextPatient?.()
  }

  const handlePauseQueue = () => {
    setQueuePaused(true)
    onPauseQueue?.()
  }

  const handleResumeQueue = () => {
    setQueuePaused(false)
    onResumeQueue?.()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="mr-2">جاري تحميل حالة الطابور...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات الطابور */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">المريض الحالي</p>
                <p className="text-lg font-bold">
                  {currentPatient ? currentPatient.patientName : "لا يوجد"}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">في الانتظار</p>
                <p className="text-lg font-bold">{waitingPatients.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">متوسط الانتظار</p>
                <p className="text-lg font-bold">{Math.round(averageWaitTime)} دقيقة</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">حالة الطابور</p>
                <Badge variant={queuePaused ? "destructive" : "default"}>
                  {queuePaused ? "متوقف" : "نشط"}
                </Badge>
              </div>
              {queuePaused ? (
                <Pause className="h-8 w-8 text-red-500" />
              ) : (
                <Play className="h-8 w-8 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* المريض الحالي */}
      {currentPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-right">المريض الحالي</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPatient}
                  disabled={queuePaused}
                >
                  <SkipForward className="h-4 w-4 ml-2" />
                  المريض التالي
                </Button>
                {queuePaused ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleResumeQueue}
                  >
                    <Play className="h-4 w-4 ml-2" />
                    استئناف
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePauseQueue}
                  >
                    <Pause className="h-4 w-4 ml-2" />
                    إيقاف مؤقت
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <Avatar className="h-12 w-12">
                <AvatarImage src={currentPatient.avatarUrl} />
                <AvatarFallback>
                  {currentPatient.patientName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-right">
                <h3 className="font-semibold text-lg">{currentPatient.patientName}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>موعد: {currentPatient.appointmentTime}</span>
                  <span>•</span>
                  <span>مدة الانتظار: {currentPatient.waitingTime} دقيقة</span>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <Badge className={priorityColors[currentPatient.priority]}>
                  {priorityLabels[currentPatient.priority]}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <Timer className="h-4 w-4" />
                  <span>جاري الفحص</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* قائمة الانتظار */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-right">قائمة الانتظار</span>
            <Badge variant="outline">
              {waitingPatients.length} مريض
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {waitingPatients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا يوجد مرضى في قائمة الانتظار</p>
              </div>
            ) : (
              <div className="space-y-3">
                {waitingPatients.map((patient, index) => (
                  <div key={patient.patientId}>
                    <div className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                        {index + 1}
                      </div>
                      
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={patient.avatarUrl} />
                        <AvatarFallback>
                          {patient.patientName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 text-right">
                        <h4 className="font-medium">{patient.patientName}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>موعد: {patient.appointmentTime}</span>
                          <span>•</span>
                          <span>متوقع: {patient.estimatedTime}</span>
                          <span>•</span>
                          <span>انتظار: {patient.waitingTime} دقيقة</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2">
                        <Badge variant="outline" className={priorityColors[patient.priority]}>
                          {priorityLabels[patient.priority]}
                        </Badge>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCallPatient(patient.patientId)}
                          disabled={queuePaused}
                        >
                          استدعاء
                        </Button>
                      </div>
                      
                      {patient.waitingTime > 60 && (
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                    
                    {index < waitingPatients.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* شريط التقدم للوقت المتوقع */}
      {currentPatient && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>الوقت المتوقع للانتهاء</span>
                <span>{currentPatient.estimatedTime}</span>
              </div>
              <Progress value={65} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>بدأ في {currentPatient.appointmentTime}</span>
                <span>متبقي ~10 دقائق</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// مكون مصغر لحالة الطابور
export function QueueStatusWidget({ doctorId }: { doctorId: string }) {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)

  useEffect(() => {
    const unsubscribe = realTimeService.subscribeToQueueStatus(doctorId, setQueueStatus)
    return unsubscribe
  }, [doctorId])

  if (!queueStatus) {
    return (
      <Card className="w-64">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">جاري التحميل...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-64">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">حالة الطابور</h4>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-semibold">{queueStatus.queueLength}</div>
              <div className="text-xs text-muted-foreground">في الانتظار</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-semibold">{queueStatus.estimatedWaitTime}د</div>
              <div className="text-xs text-muted-foreground">وقت الانتظار</div>
            </div>
          </div>
          
          {queueStatus.currentPatient && (
            <div className="text-xs text-muted-foreground text-center">
              المريض الحالي: {queueStatus.currentPatient}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

