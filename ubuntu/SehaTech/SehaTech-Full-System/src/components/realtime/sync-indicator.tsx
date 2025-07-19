"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  Database,
  Zap
} from "lucide-react"
import { realTimeService } from "@/lib/services/realtime-service"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"

export interface SyncStatus {
  isOnline: boolean
  isConnected: boolean
  lastSync: Date | null
  pendingChanges: number
  syncInProgress: boolean
  error: string | null
}

export interface ConnectionStats {
  connectedUsers: number
  totalUsers: number
  dataTransferred: number
  uptime: number
  latency: number
}

interface SyncIndicatorProps {
  userId: string
  showDetails?: boolean
  compact?: boolean
}

export function SyncIndicator({ userId, showDetails = false, compact = false }: SyncIndicatorProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isConnected: false,
    lastSync: null,
    pendingChanges: 0,
    syncInProgress: false,
    error: null
  })

  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    connectedUsers: 0,
    totalUsers: 0,
    dataTransferred: 0,
    uptime: 0,
    latency: 0
  })

  const [showPopover, setShowPopover] = useState(false)

  // مراقبة حالة الاتصال
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true, error: null }))
      // إعادة الاتصال عند العودة للإنترنت
      reconnect()
    }

    const handleOffline = () => {
      setSyncStatus(prev => ({ 
        ...prev, 
        isOnline: false, 
        isConnected: false,
        error: "لا يوجد اتصال بالإنترنت"
      }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // تهيئة الاتصال
  useEffect(() => {
    initializeConnection()
  }, [userId])

  // محاكاة تحديث الإحصائيات
  useEffect(() => {
    const interval = setInterval(() => {
      if (syncStatus.isConnected) {
        setConnectionStats(prev => ({
          ...prev,
          connectedUsers: Math.floor(Math.random() * 50) + 10,
          totalUsers: 75,
          dataTransferred: prev.dataTransferred + Math.floor(Math.random() * 100),
          uptime: prev.uptime + 1,
          latency: Math.floor(Math.random() * 50) + 20
        }))
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [syncStatus.isConnected])

  const initializeConnection = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, syncInProgress: true }))
      
      // تعيين حضور المستخدم
      await realTimeService.setUserPresence(userId, true, {
        type: getDeviceType(),
        browser: getBrowserInfo(),
        os: getOSInfo()
      })

      setSyncStatus(prev => ({
        ...prev,
        isConnected: true,
        lastSync: new Date(),
        syncInProgress: false,
        error: null
      }))

      // بدء مراقبة التحديثات
      startMonitoring()
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isConnected: false,
        syncInProgress: false,
        error: error instanceof Error ? error.message : 'فشل في الاتصال'
      }))
    }
  }

  const reconnect = async () => {
    if (!syncStatus.isOnline) return
    
    try {
      setSyncStatus(prev => ({ ...prev, syncInProgress: true, error: null }))
      await initializeConnection()
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        syncInProgress: false,
        error: 'فشل في إعادة الاتصال'
      }))
    }
  }

  const startMonitoring = () => {
    // مراقبة التحديثات الفورية
    realTimeService.subscribeToLiveUpdates((updates) => {
      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        pendingChanges: Math.max(0, prev.pendingChanges - updates.length)
      }))
    })

    // مراقبة حضور المستخدمين
    realTimeService.subscribeToUserPresence((presence) => {
      const onlineUsers = Object.values(presence).filter(p => p.state === 'online').length
      setConnectionStats(prev => ({
        ...prev,
        connectedUsers: onlineUsers
      }))
    })
  }

  const handleManualSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, syncInProgress: true }))
      
      // محاكاة مزامنة البيانات
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        syncInProgress: false,
        pendingChanges: 0
      }))
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        syncInProgress: false,
        error: 'فشل في المزامنة'
      }))
    }
  }

  const getStatusIcon = () => {
    if (syncStatus.syncInProgress) {
      return <RefreshCw className="h-4 w-4 animate-spin" />
    }
    
    if (!syncStatus.isOnline) {
      return <WifiOff className="h-4 w-4" />
    }
    
    if (!syncStatus.isConnected) {
      return <AlertCircle className="h-4 w-4" />
    }
    
    if (syncStatus.error) {
      return <AlertCircle className="h-4 w-4" />
    }
    
    return <CheckCircle className="h-4 w-4" />
  }

  const getStatusColor = () => {
    if (syncStatus.syncInProgress) return "text-blue-500"
    if (!syncStatus.isOnline || !syncStatus.isConnected || syncStatus.error) return "text-red-500"
    return "text-green-500"
  }

  const getStatusText = () => {
    if (syncStatus.syncInProgress) return "جاري المزامنة..."
    if (!syncStatus.isOnline) return "غير متصل"
    if (!syncStatus.isConnected) return "منقطع"
    if (syncStatus.error) return "خطأ في الاتصال"
    return "متصل"
  }

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (syncStatus.syncInProgress) return "secondary"
    if (!syncStatus.isOnline || !syncStatus.isConnected || syncStatus.error) return "destructive"
    return "default"
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1", getStatusColor())}>
              {getStatusIcon()}
              {syncStatus.pendingChanges > 0 && (
                <Badge variant="secondary" className="h-5 w-5 p-0 text-xs">
                  {syncStatus.pendingChanges}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div>{getStatusText()}</div>
              {syncStatus.lastSync && (
                <div className="text-xs text-muted-foreground">
                  آخر مزامنة: {formatDistanceToNow(syncStatus.lastSync, { addSuffix: true, locale: ar })}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Popover open={showPopover} onOpenChange={setShowPopover}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <div className={getStatusColor()}>
            {getStatusIcon()}
          </div>
          <Badge variant={getStatusVariant()}>
            {getStatusText()}
          </Badge>
          {syncStatus.pendingChanges > 0 && (
            <Badge variant="secondary">
              {syncStatus.pendingChanges}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* حالة الاتصال */}
          <div>
            <h4 className="font-medium text-sm mb-2 text-right">حالة الاتصال</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">الإنترنت</span>
                <div className="flex items-center gap-1">
                  {syncStatus.isOnline ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    {syncStatus.isOnline ? "متصل" : "منقطع"}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">الخادم</span>
                <div className="flex items-center gap-1">
                  {syncStatus.isConnected ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    {syncStatus.isConnected ? "متصل" : "منقطع"}
                  </span>
                </div>
              </div>
              
              {syncStatus.lastSync && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">آخر مزامنة</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(syncStatus.lastSync, { addSuffix: true, locale: ar })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* إحصائيات الاتصال */}
          {showDetails && syncStatus.isConnected && (
            <div>
              <h4 className="font-medium text-sm mb-2 text-right">إحصائيات الاتصال</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span>{connectionStats.connectedUsers} متصل</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-green-500" />
                  <span>{connectionStats.dataTransferred} KB</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span>{connectionStats.latency}ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-500" />
                  <span>{Math.floor(connectionStats.uptime / 60)}د</span>
                </div>
              </div>
            </div>
          )}

          {/* رسائل الخطأ */}
          {syncStatus.error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 text-right">
              {syncStatus.error}
            </div>
          )}

          {/* التغييرات المعلقة */}
          {syncStatus.pendingChanges > 0 && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700 text-right">
              لديك {syncStatus.pendingChanges} تغيير في انتظار المزامنة
            </div>
          )}

          {/* أزرار التحكم */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={syncStatus.syncInProgress || !syncStatus.isOnline}
              className="flex-1"
            >
              {syncStatus.syncInProgress ? (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <RefreshCw className="h-4 w-4 ml-2" />
              )}
              مزامنة يدوية
            </Button>
            
            {!syncStatus.isConnected && syncStatus.isOnline && (
              <Button
                variant="default"
                size="sm"
                onClick={reconnect}
                disabled={syncStatus.syncInProgress}
                className="flex-1"
              >
                إعادة الاتصال
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// دوال مساعدة
function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  const userAgent = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    return 'tablet'
  }
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
    return 'mobile'
  }
  return 'desktop'
}

function getBrowserInfo(): string {
  const userAgent = navigator.userAgent
  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  return 'Unknown'
}

function getOSInfo(): string {
  const userAgent = navigator.userAgent
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac')) return 'macOS'
  if (userAgent.includes('Linux')) return 'Linux'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iOS')) return 'iOS'
  return 'Unknown'
}

// مكون مؤشر الحالة البسيط
export function SimpleSyncIndicator({ userId }: { userId: string }) {
  return <SyncIndicator userId={userId} compact={true} />
}

// مكون مؤشر الحالة المفصل
export function DetailedSyncIndicator({ userId }: { userId: string }) {
  return <SyncIndicator userId={userId} showDetails={true} />
}

