import React, { useState, useEffect } from "react";
import { UserProfile } from "./types";
import { db, seedDefaultDataIfNeeded } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";
import LoginScreen from "./components/LoginScreen";
import PendingApprovalScreen from "./components/PendingApprovalScreen";
import ParentsDashboard from "./components/ParentsDashboard";
import AdminPanel from "./components/AdminPanel";
import PwaInstallButton from "./components/PwaInstallButton";
import { Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | { role: "admin" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(true);

  // 1. Run Seeding on Boot & Check session
  useEffect(() => {
    async function initApp() {
      // Seed default values in Firestore if it's the first run
      await seedDefaultDataIfNeeded();
      setIsSeeding(false);

      // Check localStorage for saved session
      const saved = localStorage.getItem("camp_connect_user");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCurrentUser(parsed);
        } catch (e) {
          console.error("Error reading saved user session:", e);
          localStorage.removeItem("camp_connect_user");
        }
      }
      setLoading(false);
    }
    initApp();
  }, []);

  // 2. Real-time observer for parent profile status updates
  useEffect(() => {
    if (!currentUser || "role" in currentUser) return; // Skip if no user or if admin

    const userRef = doc(db, "users", currentUser.id);
    const unsub = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const updatedProfile = docSnap.data() as UserProfile;
          
          // Only update if something changed (e.g. status)
          if (updatedProfile.status !== currentUser.status) {
            setCurrentUser(updatedProfile);
            localStorage.setItem("camp_connect_user", JSON.stringify(updatedProfile));
          }
        } else {
          // If the admin deleted this user, log them out
          handleLogout();
        }
      },
      (error) => {
        console.error("Error watching user profile status:", error);
      }
    );

    return () => unsub();
  }, [currentUser]);

  const handleLoginSuccess = (user: UserProfile | { role: "admin" }) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem("camp_connect_user");
    setCurrentUser(null);
  };

  if (loading || isSeeding) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50/60 p-6 font-sans">
        <div className="text-center space-y-4">
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-500 text-white shadow-lg mb-2">
            <span className="absolute inset-0 rounded-3xl bg-amber-400 animate-ping opacity-25"></span>
            <Sparkles className="w-8 h-8 animate-bounce" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800">Camp Connect</h2>
          <p className="text-xs text-amber-700 font-bold">جاري تهيئة منصة التواصل للمخيم الصيفي... ✨</p>
          <div className="w-24 h-1.5 bg-amber-100 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full animate-progress" style={{ width: '40%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/35 selection:bg-amber-100 selection:text-amber-900">
      <AnimatePresence mode="wait">
        {!currentUser ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoginScreen onLoginSuccess={handleLoginSuccess} />
          </motion.div>
        ) : "role" in currentUser && currentUser.role === "admin" ? (
          <motion.div
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AdminPanel onLogout={handleLogout} />
          </motion.div>
        ) : (
          <motion.div
            key="parents"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {currentUser.status === "approved" ? (
              <ParentsDashboard user={currentUser as UserProfile} onLogout={handleLogout} />
            ) : (
              <PendingApprovalScreen user={currentUser as UserProfile} onLogout={handleLogout} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <PwaInstallButton />
    </div>
  );
}
