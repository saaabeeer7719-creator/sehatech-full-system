"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Bell,
  CircleUser,
  Home,
  LineChart,
  Stethoscope,
  CalendarDays,
  Users,
  CreditCard,
  Menu,
  MessageSquare,
  History,
  SlidersHorizontal,
  FileText,
} from "lucide-react"
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";


import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import Link from "next/link"
import { Overview } from "@/components/dashboard/overview"
import { AppointmentsTab } from "@/components/dashboard/appointments-tab"
import { DoctorsTab } from "@/components/dashboard/doctors-tab"
import { PatientsTab } from "@/components/dashboard/patients-tab"
import { AnalyticsTab } from "@/components/dashboard/analytics-tab"
import { BillingTab } from "@/components/dashboard/billing-tab"
import { ChatTab } from "@/components/dashboard/chat-tab"
import { AuditLogTab } from "@/components/dashboard/audit-log-tab"
import { SettingsTab } from "@/components/dashboard/settings-tab"
import { ReportsTab } from "@/components/dashboard/reports-tab"
import { cn } from "@/lib/utils"
import { useSearchParams } from 'next/navigation'
import { GlobalSearch } from "@/components/dashboard/global-search"
import type { Patient, UserRole } from "@/lib/types"
import { PatientDetails } from "@/components/patient-details"
import { AppointmentScheduler } from "@/components/appointment-scheduler"
import { usePermissions } from "@/hooks/use-permissions"
import { NotificationCenter } from "@/components/realtime/notification-center"


type TabValue = "dashboard" | "appointments" | "doctors" | "patients" | "billing" | "chat" | "analytics" | "reports" | "settings" | "audit-log";


export default function DashboardContent() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') as TabValue || 'dashboard';

  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('receptionist'); 
  const permissions = usePermissions(currentUserRole);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        const userDocRef = doc(db, "users", authUser.uid);
        const unsubUser = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setCurrentUserRole(doc.data().role);
          }
        });
        return () => unsubUser();
      } else {
        // router.push('/'); // Removed to prevent build issues
      }
    });

    return () => unsubscribe();
  }, [router]);


  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedPatientForProfile, setSelectedPatientForProfile] = useState<Patient | null>(null);
  const [selectedPatientForAppointment, setSelectedPatientForAppointment] = useState<Patient | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  const navLinks = [
    { id: "dashboard", label: "الرئيسية", icon: Home, href: "/dashboard?tab=dashboard", permission: "viewDashboard" },
    { id: "appointments", label: "المواعيد", icon: CalendarDays, badge: "6", href: "/dashboard?tab=appointments", permission: "viewAppointments" },
    { id: "doctors", label: "الأطباء", icon: Stethoscope, href: "/dashboard?tab=doctors", permission: "viewDoctors" },
    { id: "patients", label: "المرضى", icon: Users, href: "/dashboard?tab=patients", permission: "viewPatients" },
    { id: "billing", label: "الفواتير", icon: CreditCard, href: "/dashboard?tab=billing", permission: "viewBilling" },
    { id: "chat", label: "الدردشة", icon: MessageSquare, href: "/dashboard?tab=chat", permission: "useChat" },
    { id: "analytics", label: "التحليلات", icon: LineChart, href: "/dashboard?tab=analytics", permission: "viewAnalytics" },
    { id: "reports", label: "التقارير", icon: FileText, href: "/dashboard?tab=reports", permission: "viewReports" },
    { id: "settings", label: "الإعدادات", icon: SlidersHorizontal, href: "/dashboard?tab=settings", permission: "manageSettings" },
    { id: "audit-log", label: "سجل التغييرات", icon: History, href: "/dashboard?tab=audit-log", permission: "viewAuditLog" },
  ];
  
  const accessibleLinks = useMemo(() => {
    if (!permissions) return [];
    return navLinks.filter(link => permissions[link.permission as keyof typeof permissions]);
  }, [permissions]);
  
  useEffect(() => {
    const tab = searchParams.get("tab") as TabValue;
    if (tab && accessibleLinks.some(l => l.id === tab)) {
      setActiveTab(tab);
    } else if (accessibleLinks.length > 0) {
      setActiveTab(accessibleLinks[0].id as TabValue);
    }
  }, [searchParams, accessibleLinks]);
  
  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
    window.history.pushState({}, '', `/dashboard?tab=${value}`);
    setIsSheetOpen(false); // Close sheet on tab change
  }

  const renderNavLinks = (isMobile: boolean = false) => (
    <nav className={cn(
      "grid items-start px-2 text-sm font-medium lg:px-4",
      isMobile ? "grid gap-2 text-lg font-medium" : "grid items-start text-sm font-medium"
    )}>
      {isMobile && (
        <Link
          href="#"
          className="flex items-center gap-2 text-lg font-semibold mb-4"
          onClick={() => setIsSheetOpen(false)}
        >
          <Stethoscope className="h-6 w-6 text-primary" />
          <span className="">صحة تك</span>
        </Link>
      )}
      {accessibleLinks.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          onClick={(e) => {
            e.preventDefault(); // Prevent full page reload
            handleTabChange(link.id)
          }}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
             activeTab === link.id ? "bg-muted text-primary" : "text-muted-foreground",
             isMobile && "mx-[-0.65rem] gap-4 rounded-xl",
          )}
        >
          <link.icon className={cn("h-4 w-4", isMobile && "h-5 w-5")} />
          {link.label}
          {link.badge && (
             <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
              {link.badge}
            </Badge>
          )}
        </Link>
      ))}
    </nav>
  );

  const handlePatientCreated = (newPatient: Patient) => {
    setIsAppointmentModalOpen(false);
  }

  if (!user || !permissions) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>جار التحميل...</p>
        </div>
    )
  }

  return (
    <>
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-l bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Stethoscope className="h-6 w-6 text-primary" />
              <span className="">صحة تك</span>
            </Link>
            <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
              <Bell className="h-4 w-4" />
              <span className="sr-only">فتح الإشعارات</span>
            </Button>
          </div>
          <div className="flex-1 overflow-auto py-2">
             {renderNavLinks()}
          </div>
        </div>
      </div>
       <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">فتح قائمة التنقل</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col">
               <SheetHeader>
                <SheetTitle className="sr-only">قائمة التنقل</SheetTitle>
              </SheetHeader>
               {renderNavLinks(true)}
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
             <GlobalSearch 
                onViewProfile={setSelectedPatientForProfile}
                onNewAppointment={(patient) => {
                  setSelectedPatientForAppointment(patient);
                  setIsAppointmentModalOpen(true);
                }}
             />
          </div>
          {user && <NotificationCenter userId={user.uid} />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <CircleUser className="h-5 w-5" />
                <span className="sr-only">فتح قائمة المستخدم</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleTabChange("settings")}>الإعدادات</DropdownMenuItem>
              <DropdownMenuItem>الدعم</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>تسجيل الخروج</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">
              {navLinks.find(l => l.id === activeTab)?.label}
            </h1>
          </div>
          <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v)} className="w-full">
            <TabsContent value="dashboard">
              {permissions?.viewDashboard && <Overview />}
            </TabsContent>
            <TabsContent value="appointments">
              {permissions?.viewAppointments && <AppointmentsTab />}
            </TabsContent>
            <TabsContent value="doctors">
              {permissions?.viewDoctors && <DoctorsTab />}
            </TabsContent>
            <TabsContent value="patients">
              {permissions?.viewPatients && <PatientsTab />}
            </TabsContent>
            <TabsContent value="billing">
              {permissions?.viewBilling && <BillingTab />}
            </TabsContent>
             <TabsContent value="chat">
              {permissions?.useChat && <ChatTab />}
            </TabsContent>
            <TabsContent value="analytics">
              {permissions?.viewAnalytics && <AnalyticsTab />}
            </TabsContent>
            <TabsContent value="reports">
              {permissions?.viewReports && <ReportsTab />}
            </TabsContent>
            <TabsContent value="settings">
              {permissions?.manageSettings && <SettingsTab />}
            </TabsContent>
            <TabsContent value="audit-log">
              {permissions?.viewAuditLog && <AuditLogTab />}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
    {selectedPatientForProfile && (
      <PatientDetails
        patient={selectedPatientForProfile}
        isOpen={!!selectedPatientForProfile}
        onOpenChange={(isOpen) => !isOpen && setSelectedPatientForProfile(null)}
      />
    )}
     {isAppointmentModalOpen && selectedPatientForAppointment && (
        <AppointmentScheduler
            onAppointmentCreated={() => setIsAppointmentModalOpen(false)}
            onPatientCreated={handlePatientCreated}
            selectedPatientId={selectedPatientForAppointment.id}
            context="new-appointment"
        />
     )}
    </>
  )
}


