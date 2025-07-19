
"use client";

import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, rtdb } from '@/lib/firebase';
import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';

export function useUserPresence() {
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (user) {
      const myConnectionsRef = ref(rtdb, `users/${user.uid}/connections`);
      const lastOnlineRef = ref(rtdb, `users/${user.uid}/last_changed`);
      const userStatusRef = ref(rtdb, `users/${user.uid}/state`);

      const con = ref(rtdb, '.info/connected');

      onValue(con, (snap) => {
        if (snap.val() === true) {
          const conRef = ref(rtdb, `users/${user.uid}`);
          
          onDisconnect(userStatusRef).set("offline");
          onDisconnect(lastOnlineRef).set(serverTimestamp());

          set(userStatusRef, 'online');
        }
      });
    }
  }, [user]);
}
