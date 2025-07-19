
// A script to seed the Firestore database with initial data.
// This is useful for development and testing purposes.
// It creates a set of users, doctors, patients, appointments, and transactions.
// To run this script, use `npm run db:seed`.

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc, 
  doc,
  writeBatch,
  query,
  getDocs
} from 'firebase/firestore';
import { getDatabase, ref, set } from "firebase/database";

import dotenv from 'dotenv';

// Load environment variables from .env file in the root directory
dotenv.config({ path: './.env' });


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

if (!firebaseConfig.projectId) {
    console.error("Firebase configuration is missing. Make sure your .env file is set up correctly in the root directory.");
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

const adminUser = {
  email: 'abdlelah2013@gmail.com',
  password: '123456',
  role: 'admin',
  name: 'عبدالإله القدسي'
};

const otherUsers = [
    { email: 'doctor.ahmed@example.com', password: 'password123', role: 'doctor', name: 'د. أحمد قايد سالم' },
    { email: 'reception.fatima@example.com', password: 'password123', role: 'receptionist', name: 'فاطمة علي' }
];

const doctors = [
  { name: 'أحمد قايد سالم', specialty: 'باطنية', image: `https://placehold.co/100x100.png?text=A`, isAvailableToday: true, nextAvailable: 'غداً، 10:00 ص', servicePrice: 5000, freeReturnDays: 14, availableDays: ['السبت', 'الاثنين', 'الأربعاء'], availability: [ { date: '2025-07-20', slots: ['10:00', '10:30', '11:00'] }, { date: '2025-07-21', slots: ['14:00', '14:30'] }] },
  { name: 'سارة المخلافي', specialty: 'أطفال', image: `https://placehold.co/100x100.png?text=S`, isAvailableToday: false, nextAvailable: 'بعد غد، 9:00 ص', servicePrice: 4500, freeReturnDays: 10, availableDays: ['الأحد', 'الثلاثاء'], availability: [ { date: '2025-07-22', slots: ['09:00', '09:30', '10:00'] }] },
  { name: 'خالد العمري', specialty: 'عظام', image: `https://placehold.co/100x100.png?text=K`, isAvailableToday: true, nextAvailable: 'اليوم، 4:00 م', servicePrice: 6000, freeReturnDays: 7, availableDays: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'], availability: [ { date: '2025-07-19', slots: ['16:00', '16:30', '17:00'] } ]},
];

const patients = [
  { name: 'علي محمد أحمد', dob: '1985-05-20', gender: 'ذكر', phone: '777123456', address: 'صنعاء، شارع حده', avatarUrl: `https://placehold.co/40x40.png?text=AM` },
  { name: 'فاطمة عبدالله', dob: '1992-11-15', gender: 'أنثى', phone: '777654321', address: 'صنعاء، شارع الزبيري', avatarUrl: `https://placehold.co/40x40.png?text=FA` },
  { name: 'صالح سريع', dob: '1978-01-30', gender: 'ذكر', phone: '777987654', address: 'صنعاء، الدائري', avatarUrl: `https://placehold.co/40x40.png?text=SS` },
];


async function seedDatabase() {
  console.log('Starting database seeding...');
  
  const batch = writeBatch(db);

  try {
    // 1. Create users in Auth and add to Firestore
    console.log('Creating users...');
    const allUsersToCreate = [adminUser, ...otherUsers];
    const userIds = {};

    for (const user of allUsersToCreate) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
            const uid = userCredential.user.uid;
            userIds[user.email] = uid;
            const userDocRef = doc(db, 'users', uid);
            batch.set(userDocRef, {
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: new Date(),
            });
            console.log(`Successfully created user: ${user.email}`);
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                console.log(`User ${user.email} already exists. Signing in to get UID.`);
                const userCredential = await signInWithEmailAndPassword(auth, user.email, user.password);
                userIds[user.email] = userCredential.user.uid;
            } else {
                throw error;
            }
        }
    }

    // 2. Add doctors
    console.log('Adding doctors...');
    const doctorRefs = [];
    for (const doctor of doctors) {
        const docRef = doc(collection(db, 'doctors'));
        batch.set(docRef, doctor);
        doctorRefs.push({ id: docRef.id, ...doctor });
    }

    // 3. Add patients
    console.log('Adding patients...');
    const patientRefs = [];
    for (const patient of patients) {
        const docRef = doc(collection(db, 'patients'));
        batch.set(docRef, { ...patient, createdAt: new Date() });
        patientRefs.push({ id: docRef.id, ...patient });
    }
    
    // 4. Add appointments
    console.log('Adding appointments...');
    const appointments = [
        { patient: patientRefs[0], doctor: doctorRefs[0], dateTime: new Date(2025, 6, 25, 10, 0), status: 'Scheduled' },
        { patient: patientRefs[1], doctor: doctorRefs[1], dateTime: new Date(2025, 6, 25, 9, 30), status: 'Waiting' },
        { patient: patientRefs[2], doctor: doctorRefs[0], dateTime: new Date(2025, 7, 1, 11, 0), status: 'Scheduled' },
    ];
    for (const appt of appointments) {
        const docRef = doc(collection(db, 'appointments'));
        batch.set(docRef, {
            patientId: appt.patient.id,
            patientName: appt.patient.name,
            doctorId: appt.doctor.id,
            doctorName: `د. ${appt.doctor.name}`,
            doctorSpecialty: appt.doctor.specialty,
            dateTime: appt.dateTime.toISOString(),
            status: appt.status,
        });
    }

    // 5. Add transactions
    console.log('Adding transactions...');
    const transactions = [
        { patient: patientRefs[0], amount: 5000, service: 'كشفية باطنية', date: new Date(2025, 6, 20), status: 'Success' },
        { patient: patientRefs[1], amount: 4500, service: 'كشفية أطفال', date: new Date(2025, 6, 21), status: 'Success' },
    ];
     for (const trans of transactions) {
        const docRef = doc(collection(db, 'transactions'));
        batch.set(docRef, {
            patientId: trans.patient.id,
            patientName: trans.patient.name,
            amount: trans.amount,
            service: trans.service,
            date: trans.date,
            status: trans.status,
        });
    }

    // Commit the batch
    await batch.commit();
    console.log('Database seeded successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    process.exit(0);
  }
}

async function clearCollection(collectionPath) {
    console.log(`Clearing collection: ${collectionPath}`);
    const q = query(collection(collectionPath));
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Collection ${collectionPath} cleared.`);
}


async function clearAllData() {
    // Note: This does not clear Auth users. That must be done manually.
    const collections = ['users', 'doctors', 'patients', 'appointments', 'transactions', 'auditLogs', 'conversations'];
    for (const col of collections) {
        await clearCollection(collection(db, col));
    }

     // Clear RTDB presence data
    console.log('Clearing Realtime Database...');
    const presenceRef = ref(rtdb, 'users');
    await set(presenceRef, null);
    console.log('Realtime Database cleared.');
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--clear')) {
    clearAllData().then(() => seedDatabase());
} else {
    seedDatabase();
}
