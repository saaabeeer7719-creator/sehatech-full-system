

"use client"

import { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Search, UserPlus, CalendarPlus, User } from "lucide-react";
import type { Patient } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { AppointmentScheduler } from '../appointment-scheduler';
import { useDebounce } from '@/hooks/use-debounce';
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from '@/hooks/use-toast';

interface GlobalSearchProps {
  onViewProfile: (patient: Patient) => void;
  onNewAppointment: (patient: Patient) => void;
}

export function GlobalSearch({ onViewProfile, onNewAppointment }: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!debouncedSearchTerm) {
        setSearchResults([]);
        return;
    }
    
    // As Firestore doesn't support native text search on parts of a string efficiently on the client-side
    // without a third-party service like Algolia, we'll fetch all patients and filter locally.
    // This is not ideal for very large datasets.
    const q = query(collection(db, "patients"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const patients = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Patient);
        const filtered = patients.filter(patient => 
            patient.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            (patient.phone && patient.phone.includes(debouncedSearchTerm))
        ).slice(0, 5);
        setSearchResults(filtered);
    });

    return unsubscribe;
  }, [debouncedSearchTerm]);


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchWrapperRef]);

  const showResults = isFocused && searchTerm;
  
  const getPrefilledData = () => {
     const isPhone = /^\d+$/.test(searchTerm);
     return isPhone ? { phone: searchTerm } : { name: searchTerm };
  }

  const handlePatientCreated = async (newPatientData: Omit<Patient, 'id'>) => {
    try {
        const docRef = await addDoc(collection(db, "patients"), {
            ...newPatientData,
            createdAt: serverTimestamp(),
        });
        toast({
            title: "تم إنشاء ملف المريض بنجاح!",
        });
        setIsNewPatientModalOpen(false);
        setSearchTerm('');
    } catch (e) {
        console.error("Error adding document: ", e);
        toast({
            variant: "destructive",
            title: "حدث خطأ!",
            description: "لم نتمكن من إضافة المريض.",
        });
    }
  };

  return (
    <div className="relative w-full max-w-md" ref={searchWrapperRef}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="ابحث عن مريض بالاسم أو رقم الهاتف..."
          className="w-full bg-background pr-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
        />
      </div>

      {showResults && (
        <div className="absolute z-50 mt-2 w-full rounded-md border bg-card text-card-foreground shadow-lg">
          <div className="p-2">
            {searchResults.length > 0 ? (
              <ul>
                {searchResults.map((patient) => (
                  <li key={patient.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                    <div>
                      <p className="font-semibold">{patient.name}</p>
                      <p className="text-sm text-muted-foreground">{patient.phone}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => { onNewAppointment(patient); setIsFocused(false); setSearchTerm(''); }}>
                        <CalendarPlus className="h-4 w-4 ml-1" />
                        موعد
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { onViewProfile(patient); setIsFocused(false); setSearchTerm(''); }}>
                         <User className="h-4 w-4 ml-1" />
                         ملف
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
                <div 
                    className="flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-muted"
                    onClick={() => setIsNewPatientModalOpen(true)}
                >
                    <div className="flex items-center gap-3">
                        <UserPlus className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-semibold">إضافة مريض جديد</p>
                            <p className="text-sm text-muted-foreground">"لم يتم العثور على "{searchTerm}</p>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>
      )}
      
      {isNewPatientModalOpen && (
          <AppointmentScheduler 
            context="new-patient" 
            onPatientCreated={handlePatientCreated}
            prefilledData={getPrefilledData()}
            
         />
      )}
    </div>
  );
}
