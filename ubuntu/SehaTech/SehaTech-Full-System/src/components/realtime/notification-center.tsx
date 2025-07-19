"use client"

import { useState, useEffect } from "react"
import { Bell, X, Check, Clock, AlertCircle, Info, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, Notification } from "@/lib/services/notification-service"

interface NotificationCenterProps {
  userId: string
  onNotificationClick?: (notification: Notification) => void
}

const notificationIcons = {
  appointment_reminder: Clock,
  appointment_update: AlertCircle,
  system_alert: Info,
  patient_update: CheckCircle,
  payment_received: CheckCircle
}

const notificationColors = {
  low: "text-gray-500",
  medium: "text-blue-500", 
  high: "text-orange-500",
  urgent: "text-red-500"
}

const priorityLabels = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية", 
  urgent: "عاجلة"
}

export function NotificationCenter({
  userId,
  onNotificationClick,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (userId) {
      const unsubscribe = getNotifications(userId, (fetchedNotifications) => {
        setNotifications(fetchedNotifications)
      })
      return () => unsubscribe()
    }
  }, [userId])

  // حساب عدد الإشعارات غير المقروءة
  const unreadCount = notifications.filter(n => !n.read).length

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read && notification.id) {
      await markNotificationAsRead(notification.id)
    }
    onNotificationClick?.(notification)
  }

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(userId)
  }

  const handleDeleteNotification = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    // لا يوجد حذف فعلي، فقط إخفاء من الواجهة بعد القراءة
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  const NotificationItem = ({ notification }: { notification: Notification }) => {
    const Icon = notificationIcons[notification.type as keyof typeof notificationIcons]
    
    return (
      <div
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
          !notification.read && "bg-blue-50 border-l-4 border-l-blue-500"
        )}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className={cn("mt-1", notificationColors[notification.priority as keyof typeof notificationColors])}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-right">{notification.title}</p>
            <div className="flex items-center gap-2">
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => handleDeleteNotification(notification.id || 
                Date.now().toString(), e)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground text-right">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {priorityLabels[notification.priority as keyof typeof priorityLabels]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(notification.timestamp.toDate(), { 
                addSuffix: true, 
                locale: ar 
              })}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* إصدار سطح المكتب - Popover */}
      <div className="hidden md:block">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-right">الإشعارات</h4>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs"
                  >
                    تحديد الكل كمقروء
                  </Button>
                )}
              </div>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground text-right">
                  لديك {unreadCount} إشعار غير مقروء
                </p>
              )}
            </div>
            
            <ScrollArea className="h-96">
              <div className="p-2 space-y-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">لا توجد إشعارات</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification} 
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* إصدار الهاتف المحمول - Sheet */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          
          <SheetContent side="right" className="w-full sm:w-80">
            <SheetHeader>
              <SheetTitle className="text-right">الإشعارات</SheetTitle>
              <SheetDescription className="text-right">
                {unreadCount > 0 
                  ? `لديك ${unreadCount} إشعار غير مقروء`
                  : "جميع الإشعارات مقروءة"
                }
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6">
              {unreadCount > 0 && (
                <div className="mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="w-full"
                  >
                    <Check className="h-4 w-4 ml-2" />
                    تحديد الكل كمقروء
                  </Button>
                </div>
              )}
              
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">لا توجد إشعارات</p>
                    </div>
                  ) : (
                    notifications.map((notification, index) => (
                      <div key={notification.id}>
                        <NotificationItem notification={notification} />
                        {index < notifications.length - 1 && <Separator className="my-2" />}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

// Hook لاستخدام الإشعارات
export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (userId) {
      const unsubscribe = getNotifications(userId, (fetchedNotifications) => {
        setNotifications(fetchedNotifications)
        setUnreadCount(fetchedNotifications.filter(n => !n.read).length)
      })
      return () => unsubscribe()
    }
  }, [userId])

  const markAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId)
  }

  const markAllAsRead = async () => {
    await markAllNotificationsAsRead(userId)
  }

  const addNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    // يتم إضافة الإشعار مباشرة إلى Firebase، وستقوم getNotifications بتحديث الحالة محليًا
    // لا حاجة لتحديث الحالة المحلية هنا مباشرة
    // await addNotificationToFirebase(notification);
  }

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification
  }
}


