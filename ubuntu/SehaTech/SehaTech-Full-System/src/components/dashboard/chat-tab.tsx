
"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getPatientInitials } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { User, Conversation, Message } from "@/lib/types"
import { Send, Search, MessageSquare } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp, doc } from "firebase/firestore"
import { auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"

export function ChatTab() {
  const [currentUser] = useAuthState(auth);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [message, setMessage] = useState("")
  const [conversations, setConversations] = useState<{[key: string]: Conversation}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as User);
        setAllUsers(users);
    });
    return unsubscribe;
  }, []);

  const filteredUsers = useMemo(() => {
    if (!currentUser) return [];
    return allUsers.filter(user =>
      user.id !== currentUser.uid &&
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [allUsers, currentUser, searchTerm]);
  
  const selectedConversation = useMemo(() => {
      if (!selectedUser) return null;
      return conversations[selectedUser.id];
  }, [selectedUser, conversations]);


  const handleSendMessage = async () => {
    if (!message.trim() || !selectedUser || !currentUser) return;

    const conversationId = [currentUser.uid, selectedUser.id].sort().join('_');
    const messagesCol = collection(db, "conversations", conversationId, "messages");
    
    await addDoc(messagesCol, {
        senderId: currentUser.uid,
        text: message,
        timestamp: serverTimestamp(),
    });

    setMessage("");
  }
  
  useEffect(() => {
      if (!selectedUser || !currentUser) return;
      const conversationId = [currentUser.uid, selectedUser.id].sort().join('_');
      const q = query(collection(db, "conversations", conversationId, "messages"), orderBy("timestamp", "asc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
          const messages = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Message);
          setConversations(prev => ({
              ...prev,
              [selectedUser.id]: {
                  userId: selectedUser.id,
                  messages,
              }
          }))
      });

      return unsubscribe;
  }, [selectedUser, currentUser]);

  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedConversation?.messages]);

  return (
    <Card className="h-[calc(100vh-12rem)]">
      <div className="grid grid-cols-1 md:grid-cols-4 h-full">
        {/* Chat Window */}
        <div className="col-span-1 md:col-span-3 border-l h-full flex flex-col">
          {selectedUser && currentUser ? (
            <>
              <div className="flex items-center p-4 border-b">
                <Avatar className="ml-4">
                  <AvatarImage src={`https://placehold.co/40x40.png?text=${getPatientInitials(selectedUser.name)}`} data-ai-hint="person avatar" />
                  <AvatarFallback>{getPatientInitials(selectedUser.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow text-right">
                  <p className="font-semibold">{selectedUser.name}</p>
                </div>
              </div>
              <ScrollArea className="flex-grow p-4">
                 <div className="space-y-4">
                    {selectedConversation?.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex items-end gap-2",
                          msg.senderId === currentUser.uid ? "justify-end" : "justify-start"
                        )}
                      >
                         {msg.senderId !== currentUser.uid && (
                           <Avatar className="h-8 w-8">
                              <AvatarImage src={`https://placehold.co/40x40.png?text=${getPatientInitials(selectedUser.name)}`} />
                              <AvatarFallback>{getPatientInitials(selectedUser.name)}</AvatarFallback>
                           </Avatar>
                         )}
                        <div
                          className={cn(
                            "max-w-xs md:max-w-md rounded-lg px-4 py-2",
                            msg.senderId === currentUser.uid
                              ? "bg-primary text-primary-foreground rounded-br-none"
                              : "bg-muted rounded-bl-none"
                          )}
                        >
                          <p className="text-sm">{msg.text}</p>
                           <p className={cn("text-xs mt-1",  msg.senderId === currentUser.uid ? "text-primary-foreground/70 text-left" : "text-muted-foreground text-right")}>
                             {msg.timestamp ? new Date(msg.timestamp?.seconds * 1000).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '...'}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="p-4 border-t">
                <div className="relative">
                  <Input
                    placeholder="اكتب رسالتك هنا..."
                    className="pr-12"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={handleSendMessage}
                  >
                    <Send className="h-4 w-4" />
                    <span className="sr-only">إرسال</span>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4" />
              <p>اختر مستخدمًا لبدء المحادثة</p>
            </div>
          )}
        </div>
        
        {/* User List */}
        <div className="col-span-1 border-r h-full flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">المحادثات</h2>
             <div className="relative mt-2">
                 <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input
                  placeholder="بحث عن مستخدم..."
                  className="w-full pr-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
          </div>
          <ScrollArea className="flex-grow">
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className={cn(
                  "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50",
                  selectedUser?.id === user.id && "bg-muted"
                )}
                onClick={() => setSelectedUser(user)}
              >
                <Avatar className="relative">
                  <AvatarImage src={`https://placehold.co/40x40.png?text=${getPatientInitials(user.name)}`} data-ai-hint="person avatar" />
                  <AvatarFallback>{getPatientInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversations[user.id]?.messages.slice(-1)[0]?.text || `ابدأ محادثة مع ${user.name}`}
                  </p>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
      </div>
    </Card>
  )
}
