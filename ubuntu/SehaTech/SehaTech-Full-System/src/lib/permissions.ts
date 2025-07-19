
import type { UserRole } from './types';

export interface Permissions {
  viewDashboard: boolean;
  viewAppointments: boolean;
  addAppointment: boolean;
  editAppointment: boolean;
  cancelAppointment: boolean;
  viewPatients: boolean;
  addPatient: boolean;
  editPatient: boolean;
  deletePatient: boolean;
  viewDoctors: boolean;
  addDoctor: boolean;
  editDoctor: boolean;
  deleteDoctor: boolean;
  viewBilling: boolean;
  addTransaction: boolean;
  viewReports: boolean;
  generateReport: boolean;
  viewAnalytics: boolean;
  manageUsers: boolean;
  addUser: boolean;
  editUser: boolean;
  deleteUser: boolean;
  manageSettings: boolean;
  useChat: boolean;
  viewAuditLog: boolean;
}

export type PermissionKey = keyof Permissions;

export const roleTranslations: { [key in UserRole]: string } = {
  admin: 'مدير',
  receptionist: 'موظف استقبال',
  doctor: 'طبيب',
};

export type PermissionCategory = 
  | 'Dashboard' 
  | 'Appointments' 
  | 'Patients' 
  | 'Doctors' 
  | 'Billing' 
  | 'Reports' 
  | 'Analytics' 
  | 'Users' 
  | 'Settings' 
  | 'Chat' 
  | 'AuditLog';

export const permissionDetails: Record<PermissionKey, { label: string; description: string; category: PermissionCategory }> = {
  viewDashboard: { label: 'عرض لوحة التحكم الرئيسية', description: 'الوصول إلى صفحة النظرة العامة والإحصائيات الحيوية.', category: 'Dashboard' },
  viewAppointments: { label: 'عرض المواعيد', description: 'الاطلاع على قائمة جميع المواعيد.', category: 'Appointments' },
  addAppointment: { label: 'إضافة موعد جديد', description: 'السماح بحجز مواعيد جديدة للمرضى.', category: 'Appointments' },
  editAppointment: { label: 'تعديل المواعيد', description: 'تغيير تفاصيل المواعيد القائمة أو حالتها.', category: 'Appointments' },
  cancelAppointment: { label: 'إلغاء المواعيد', description: 'السماح بإلغاء المواعيد المحجوزة.', category: 'Appointments' },
  viewPatients: { label: 'عرض المرضى', description: 'الوصول إلى قائمة سجلات جميع المرضى.', category: 'Patients' },
  addPatient: { label: 'إضافة مريض جديد', description: 'إنشاء ملفات جديدة للمرضى.', category: 'Patients' },
  editPatient: { label: 'تعديل بيانات مريض', description: 'تحديث المعلومات الشخصية للمرضى.', category: 'Patients' },
  deletePatient: { label: 'حذف مريض', description: 'حذف ملفات المرضى من النظام بشكل دائم.', category: 'Patients' },
  viewDoctors: { label: 'عرض الأطباء', description: 'الوصول إلى قائمة الأطباء وتفاصيلهم.', category: 'Doctors' },
  addDoctor: { label: 'إضافة طبيب جديد', description: 'إضافة أطباء جدد إلى النظام.', category: 'Doctors' },
  editDoctor: { label: 'تعديل بيانات طبيب', description: 'تحديث ملفات الأطباء.', category: 'Doctors' },
  deleteDoctor: { label: 'حذف طبيب', description: 'حذف الأطباء من النظام.', category: 'Doctors' },
  viewBilling: { label: 'عرض الفواتير', description: 'الوصول إلى السجل المالي والفواتير.', category: 'Billing' },
  addTransaction: { label: 'إضافة فاتورة', description: 'تسجيل المعاملات المالية والفواتير الجديدة.', category: 'Billing' },
  viewReports: { label: 'عرض التقارير', description: 'الوصول إلى صفحة التقارير.', category: 'Reports' },
  generateReport: { label: 'إنشاء تقرير', description: 'السماح بإنشاء وتصدير التقارير المالية والإدارية.', category: 'Reports' },
  viewAnalytics: { label: 'عرض التحليلات', description: 'الوصول إلى صفحة التحليلات والرسوم البيانية.', category: 'Analytics' },
  manageUsers: { label: 'عرض المستخدمين', description: 'الوصول إلى قائمة المستخدمين في الإعدادات.', category: 'Users' },
  addUser: { label: 'إضافة مستخدم', description: 'إنشاء حسابات مستخدمين جدد في النظام.', category: 'Users' },
  editUser: { label: 'تعديل مستخدم', description: 'تحديث بيانات المستخدمين وأدوارهم.', category: 'Users' },
  deleteUser: { label: 'حذف مستخدم', description: 'حذف حسابات المستخدمين من النظام.', category: 'Users' },
  manageSettings: { label: 'إدارة الإعدادات', description: 'الوصول إلى صفحة الإعدادات وتعديلها.', category: 'Settings' },
  useChat: { label: 'استخدام الدردشة', description: 'الوصول إلى نظام الدردشة الداخلية.', category: 'Chat' },
  viewAuditLog: { label: 'عرض سجل التغييرات', description: 'مراقبة جميع الإجراءات التي تتم في النظام.', category: 'AuditLog' },
};


const adminPermissions: Permissions = {
  viewDashboard: true,
  viewAppointments: true,
  addAppointment: true,
  editAppointment: true,
  cancelAppointment: true,
  viewPatients: true,
  addPatient: true,
  editPatient: true,
  deletePatient: true,
  viewDoctors: true,
  addDoctor: true,
  editDoctor: true,
  deleteDoctor: true,
  viewBilling: true,
  addTransaction: true,
  viewReports: true,
  generateReport: true,
  viewAnalytics: true,
  manageUsers: true,
  addUser: true,
  editUser: true,
  deleteUser: true,
  manageSettings: true,
  useChat: true,
  viewAuditLog: true,
};

const receptionistPermissions: Permissions = {
  viewDashboard: true,
  viewAppointments: true,
  addAppointment: true,
  editAppointment: true,
  cancelAppointment: true,
  viewPatients: true,
  addPatient: true,
  editPatient: true,
  deletePatient: false,
  viewDoctors: true,
  addDoctor: false,
  editDoctor: false,
  deleteDoctor: false,
  viewBilling: true,
  addTransaction: true,
  viewReports: false,
  generateReport: false,
  viewAnalytics: false,
  manageUsers: true, 
  addUser: true,
  editUser: true,
  deleteUser: false,
  manageSettings: true,
  useChat: true,
  viewAuditLog: false,
};

const doctorPermissions: Permissions = {
  viewDashboard: true,
  viewAppointments: true,
  addAppointment: false,
  editAppointment: true,
  cancelAppointment: false,
  viewPatients: true,
  addPatient: false,
  editPatient: false,
  deletePatient: false,
  viewDoctors: false,
  addDoctor: false,
  editDoctor: false,
  deleteDoctor: false,
  viewBilling: false,
  addTransaction: false,
  viewReports: false,
  generateReport: false,
  viewAnalytics: false,
  manageUsers: false,
  addUser: false,
  editUser: false,
  deleteUser: false,
  manageSettings: false,
  useChat: true,
  viewAuditLog: false,
};

export const permissions: Record<UserRole, Permissions> = {
  admin: adminPermissions,
  receptionist: receptionistPermissions,
  doctor: doctorPermissions,
};
