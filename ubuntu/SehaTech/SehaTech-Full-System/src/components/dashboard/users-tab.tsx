
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
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import type { User, UserRole } from "@/lib/types"
import { Badge } from "../ui/badge"
import { EditUserDialog } from "./edit-user-dialog"
import { Edit, Trash2, Search } from "lucide-react"
import { db, auth } from "@/lib/firebase"
import { collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore"
import { usePermissions } from "@/hooks/use-permissions"
import { useAuthState } from "react-firebase-hooks/auth"

const roleTranslations: { [key in UserRole]: string } = {
  admin: 'مدير',
  receptionist: 'موظف استقبال',
  doctor: 'طبيب',
};

export function UsersTab() {
  const [authUser] = useAuthState(auth);
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("receptionist")
  const { toast } = useToast()

  const permissions = usePermissions(users.find(u => u.id === authUser?.uid)?.role || 'receptionist');

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(userList);
    });
    return () => unsubscribe();
  }, []);

  const handleAddUser = async () => {
    if (!name || !email || !role || !password) {
      toast({
        variant: "destructive",
        title: "معلومات ناقصة",
        description: "يرجى تعبئة جميع الحقول.",
      });
      return;
    }
    
    // In a real application, you would ideally use a Cloud Function to create the user in Auth
    // and then add them to Firestore. This approach requires the user to be created in Auth console first.
    try {
      // This is a simulation. For a real app, create the user in Firebase Auth console
      // or use a backend function. The line below would create a user but also sign
      // the admin out, which is not desired.
      // await createUserWithEmailAndPassword(auth, email, password);

      await addDoc(collection(db, "users"), { name, email, role, createdAt: serverTimestamp() });
      
      toast({
        title: "تمت إضافة المستخدم بنجاح (محاكاة)",
        description: `تمت إضافة ${name} إلى قاعدة البيانات. تأكد من إنشائه في نظام المصادقة بكلمة المرور المحددة.`,
      });
      resetAddDialog();
    } catch(e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشلت إضافة المستخدم."});
    }
  };
  
  const resetAddDialog = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("receptionist");
    setIsAddDialogOpen(false);
  }

  const handleUserUpdated = async (updatedUser: User) => {
    const { id, ...userData } = updatedUser;
    const userRef = doc(db, "users", id);
    try {
        await updateDoc(userRef, userData);
        toast({
          title: "تم تحديث البيانات بنجاح",
          description: `تم تحديث ملف المستخدم ${updatedUser.name}.`,
        });
        setUserToEdit(null);
    } catch(e) {
        console.error(e);
        toast({ variant: "destructive", title: "خطأ", description: "فشل تحديث المستخدم."});
    }
  };
  
  const handleUserDeleted = async (userId: string) => {
     try {
       await deleteDoc(doc(db, "users", userId));
       toast({
          title: "تم الحذف بنجاح",
          description: "تم حذف المستخدم من النظام.",
       });
     } catch(e) {
        console.error(e);
        toast({ variant: "destructive", title: "خطأ", description: "فشل حذف المستخدم."});
     }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  if (!permissions?.manageUsers) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>غير مصرح به</CardTitle>
            </CardHeader>
            <CardContent>
                <p>ليس لديك الصلاحية لعرض هذه الصفحة.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>المستخدمون والصلاحيات</CardTitle>
              <CardDescription>إدارة حسابات المستخدمين وأدوارهم في النظام.</CardDescription>
            </div>
            {permissions.addUser && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>إضافة مستخدم جديد</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>إضافة مستخدم جديد</DialogTitle>
                     <DialogDescription>
                      أدخل بيانات المستخدم.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">الاسم</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="مثال: أحمد علي" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">البريد الإلكتروني</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" placeholder="user@example.com" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="password" className="text-right">كلمة المرور</Label>
                       <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="col-span-3" placeholder="••••••••" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role" className="text-right">الدور (الصلاحية)</Label>
                      <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="اختر دوراً" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">مدير</SelectItem>
                          <SelectItem value="receptionist">موظف استقبال</SelectItem>
                          <SelectItem value="doctor">طبيب</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                     <Button variant="outline" onClick={resetAddDialog}>إلغاء</Button>
                     <Button onClick={handleAddUser}>إضافة المستخدم</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="mt-4 relative w-full sm:max-w-xs">
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="ابحث بالاسم أو البريد الإلكتروني..."
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
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">البريد الإلكتروني</TableHead>
                  <TableHead className="text-right">الدور</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={
                        user.role === 'admin' ? 'destructive' :
                        user.role === 'doctor' ? 'secondary' : 'default'
                      }>
                        {roleTranslations[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                       <div className="flex items-center justify-center gap-1">
                          {permissions.editUser && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setUserToEdit(user)}>
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">تعديل</span>
                            </Button>
                          )}
                           {permissions.deleteUser && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                     <Trash2 className="h-4 w-4" />
                                     <span className="sr-only">حذف</span>
                                   </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف المستخدم بشكل دائم.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleUserDeleted(user.id)} className="bg-destructive hover:bg-destructive/90">
                                      نعم، قم بالحذف
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                           )}
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                   <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                            لا يوجد مستخدمون يطابقون معايير البحث.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {userToEdit && (
        <EditUserDialog
          isOpen={!!userToEdit}
          onClose={() => setUserToEdit(null)}
          user={userToEdit}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </>
  )
}
