
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
import type { AuditLog, User, UserRole } from "@/lib/types"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Search, X } from "lucide-react"
import { LocalizedDateTime } from "../localized-date-time"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"
import { roleTranslations } from "@/lib/permissions"

export function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<{ [id: string]: User }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  
  useEffect(() => {
    const usersUnsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = {};
      snapshot.forEach(doc => {
        usersData[doc.id] = { id: doc.id, ...doc.data() } as User;
      });
      setUsers(usersData);
    });

    const logsQuery = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"));
    const logsUnsub = onSnapshot(logsQuery, (snapshot) => {
        setLogs(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as AuditLog));
    });
    
    return () => {
      usersUnsub();
      logsUnsub();
    };
  }, []);

  const sections = useMemo(() => {
    const uniqueSections = new Set(logs.map(log => log.section));
    return ['كل الأقسام', ...Array.from(uniqueSections)];
  }, [logs]);

  const roles = useMemo(() => {
    const uniqueRoles = new Set(Object.values(users).map(u => u.role));
    return ['all', ...Array.from(uniqueRoles)];
  }, [users]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const user = users[log.userId];
      const matchesSearch = user && (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       log.action.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = filterRole === 'all' || (user && user.role === filterRole);
      const matchesSection = filterSection === 'كل الأقسام' || log.section === filterSection;
      return matchesSearch && matchesRole && matchesSection;
    });
  }, [logs, users, searchTerm, filterRole, filterSection]);
  
  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterRole("all");
    setFilterSection("كل الأقسام");
  };

  const showClearButton = searchTerm || filterRole !== 'all' || filterSection !== 'كل الأقسام';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>سجل التغييرات</CardTitle>
            <CardDescription>مراقبة جميع الأنشطة والإجراءات التي تتم في النظام.</CardDescription>
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
          <div className="relative w-full sm:w-auto flex-grow">
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="ابحث عن مستخدم أو إجراء..."
              className="w-full appearance-none bg-background pr-8 shadow-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={filterRole} onValueChange={setFilterRole} disabled={roles.length <= 1}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="تصفية حسب الدور" />
            </SelectTrigger>
            <SelectContent>
              {roles.map(role => (
                <SelectItem key={role} value={role}>{role === 'all' ? 'كل الأدوار' : roleTranslations[role]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterSection} onValueChange={setFilterSection} disabled={sections.length <= 1}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="تصفية حسب القسم" />
            </SelectTrigger>
            <SelectContent>
              {sections.map(section => (
                <SelectItem key={section} value={section}>{section}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {showClearButton && (
            <Button variant="ghost" onClick={handleClearFilters}>
              مسح الفلاتر
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المستخدم</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>الإجراء</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>الوقت والتاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length > 0 ? filteredLogs.map((log) => {
                const user = users[log.userId];
                return (
                  <TableRow key={log.id}>
                    <TableCell>{user?.name || 'مستخدم محذوف'}</TableCell>
                    <TableCell>
                      {user ? (
                         <Badge variant={
                          user.role === 'admin' ? 'destructive' :
                          user.role === 'doctor' ? 'secondary' : 'default'
                        }>
                          {roleTranslations[user.role]}
                        </Badge>
                      ) : <Badge variant="outline">غير معروف</Badge>}
                    </TableCell>
                    <TableCell>
                        <div className="font-medium">{log.action}</div>
                        <div className="text-xs text-muted-foreground">{JSON.stringify(log.details)}</div>
                    </TableCell>
                    <TableCell>{log.section}</TableCell>
                    <TableCell>
                      <LocalizedDateTime dateTime={log.timestamp} options={{ dateStyle: 'medium', timeStyle: 'short' }} />
                    </TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    لا توجد سجلات لعرضها.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
