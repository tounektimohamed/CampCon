import React, { useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { UserProfile } from "../types";
import { Shield, Sparkles, User, Baby, LogIn, ClipboardList, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
// @ts-ignore
import campLogo from "../assets/images/camp_logo_1783717505873.jpg";

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile | { role: "admin" }) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<"register" | "login">("register");
  const [parentName, setParentName] = useState("");
  const [childName, setChildName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Admin PIN states
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState("");

  const formatUserId = (pName: string) => {
    return pName.trim().toLowerCase().replace(/\s+/g, "_");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!parentName.trim() || !childName.trim() || !pin.trim()) {
      setError("يرجى ملء جميع الحقول المطلوبة.");
      return;
    }

    if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
      setError("الرجاء إدخال رقم سري مكون من 5 أرقام بالضبط.");
      return;
    }

    setLoading(true);
    try {
      const id = formatUserId(parentName);
      const userRef = doc(db, "users", id);
      
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${id}`);
        setError("فشل التحقق من وجود الحساب في قاعدة البيانات.");
        setLoading(false);
        return;
      }

      if (userSnap.exists()) {
        setError("اسم الولي هذا مسجل لدينا بالفعل! يرجى الانتقال إلى تبويب 'دخول سريع' لتسجيل الدخول.");
        setLoading(false);
        return;
      }

      const newUser: UserProfile = {
        id,
        parentName: parentName.trim(),
        childName: childName.trim(),
        pin: pin.trim(),
        status: "pending",
        registeredAt: Date.now()
      };

      try {
        await setDoc(userRef, newUser);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${id}`);
        setError("فشل حفظ الحساب في قاعدة البيانات.");
        setLoading(false);
        return;
      }
      
      setSuccess("تم تسجيل حسابك بنجاح! جاري توجيهك لشاشة مراجعة الطلب...");
      
      // Save session
      localStorage.setItem("camp_connect_user", JSON.stringify(newUser));
      
      setTimeout(() => {
        onLoginSuccess(newUser);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError("حدث خطأ أثناء التسجيل. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!parentName.trim() || !pin.trim()) {
      setError("يرجى ملء جميع الحقول المطلوبة.");
      return;
    }

    if (pin.length !== 5 || !/^\d{5}$/.test(pin)) {
      setError("الرجاء إدخال رقم سري مكون من 5 أرقام بالضبط.");
      return;
    }

    setLoading(true);
    try {
      const id = formatUserId(parentName);
      const userRef = doc(db, "users", id);
      
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${id}`);
        setError("فشل التحقق من الحساب في قاعدة البيانات.");
        setLoading(false);
        return;
      }

      if (!userSnap.exists()) {
        setError("لم يتم العثور على هذا التسجيل. يرجى التحقق من صحة اسم الولي، أو التبديل لتبويب 'تسجيل ولي أمر جديد'.");
        setLoading(false);
        return;
      }

      const userProfile = userSnap.data() as UserProfile;
      
      if (userProfile.pin !== pin.trim()) {
        setError("الرقم السري غير صحيح! يرجى المحاولة مجدداً.");
        setLoading(false);
        return;
      }

      setSuccess("تم تسجيل الدخول بنجاح!");
      
      // Save session
      localStorage.setItem("camp_connect_user", JSON.stringify(userProfile));

      setTimeout(() => {
        onLoginSuccess(userProfile);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError("حدث خطأ أثناء تسجيل الدخول. يرجى التحقق من الاتصال.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");

    try {
      const secretRef = doc(db, "config", "admin_secret");
      let secretSnap;
      try {
        secretSnap = await getDoc(secretRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "config/admin_secret");
        setAdminError("تعذر الاتصال بقاعدة البيانات للتحقق من رمز المرور.");
        return;
      }

      let correctSecret = "sahbirahma";
      if (secretSnap.exists()) {
        correctSecret = secretSnap.data().secret || "sahbirahma";
      } else {
        try {
          await setDoc(secretRef, { secret: "sahbirahma" });
        } catch (err) {
          console.error("Error setting default admin secret:", err);
        }
      }

      if (adminPin === correctSecret) {
        const adminSession = { role: "admin" as const };
        localStorage.setItem("camp_connect_user", JSON.stringify(adminSession));
        setShowAdminModal(false);
        onLoginSuccess(adminSession);
      } else {
        setAdminError("رمز المرور خاطئ! يرجى المحاولة مجدداً.");
      }
    } catch (err: any) {
      console.error(err);
      setAdminError("حدث خطأ أثناء التحقق من الرمز السري.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 relative overflow-hidden bg-gradient-to-b from-amber-50 via-orange-50 to-emerald-50">
      
      {/* Visual background camp-like vector details */}
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] rounded-full bg-amber-200/20 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-emerald-200/20 blur-3xl pointer-events-none"></div>

      {/* Main Header / Logo */}
      <header className="w-full max-w-md mx-auto text-center pt-8 pb-4 relative z-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white p-0.5 shadow-lg shadow-amber-500/15 mb-3 hover:scale-105 transition-transform duration-300">
          <img
            id="app-logo-login"
            src={campLogo}
            alt="المخيم الصيفي"
            className="w-full h-full rounded-3xl object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Camp Connect</h1>
        <p className="text-sm font-semibold text-amber-700 mt-1">المخيم الصيفي • فوج الطيب المهيري للكشافة التونسية</p>
      </header>

      {/* Auth Card Container */}
      <main className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-orange-100/60 p-6 md:p-8 relative z-10 my-auto">
        
        {/* Toggle Switch Tabs */}
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl mb-8 relative">
          <button
            onClick={() => {
              setActiveTab("register");
              setError("");
              setSuccess("");
            }}
            className={`flex-1 py-3 text-center text-sm font-semibold rounded-xl transition-all duration-300 relative z-10 ${
              activeTab === "register" ? "text-amber-800" : "text-slate-500"
            }`}
          >
            تسجيل ولي أمر جديد
          </button>
          <button
            onClick={() => {
              setActiveTab("login");
              setError("");
              setSuccess("");
            }}
            className={`flex-1 py-3 text-center text-sm font-semibold rounded-xl transition-all duration-300 relative z-10 ${
              activeTab === "login" ? "text-amber-800" : "text-slate-500"
            }`}
          >
            دخول سريع
          </button>
          
          {/* Active indicator background block */}
          <div
            className={`absolute top-1.5 bottom-1.5 left-1.5 right-1.5 bg-white rounded-xl shadow-sm transition-all duration-300 ease-out`}
            style={{
              width: "calc(50% - 6px)",
              transform: activeTab === "register" ? "translateX(0%)" : "translateX(-100%)",
            }}
          ></div>
        </div>

        {/* Display Status Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-start gap-2.5 leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs flex items-start gap-2.5 leading-relaxed"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Body */}
        <form onSubmit={activeTab === "register" ? handleRegister : handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">اسم الولي</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="أحمد الكندي"
                className="w-full pr-11 pl-4 py-3 text-sm bg-slate-50/50 border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all text-slate-800 font-medium"
              />
            </div>
          </div>

          {activeTab === "register" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <label className="block text-xs font-bold text-slate-700 mb-2">اسم المشارك</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                  <Baby className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required={activeTab === "register"}
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="سليم أحمد الكندي"
                  className="w-full pr-11 pl-4 py-3 text-sm bg-slate-50/50 border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all text-slate-800 font-medium"
                />
              </div>
            </motion.div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">رقم سري من خمسة أرقام</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                maxLength={5}
                inputMode="numeric"
                pattern="\d{5}"
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 5) setPin(val);
                }}
                placeholder="أدخل 5 أرقام (مثال: 12345)"
                className="w-full pr-11 pl-4 py-3 text-sm bg-slate-50/50 border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all text-slate-800 font-medium tracking-widest"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm transition-all shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/20 flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : activeTab === "register" ? (
              <>
                <ClipboardList className="w-4 h-4" />
                <span>تسجيل وإرسال للمراجعة</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>دخول سريع للمنصة</span>
              </>
            )}
          </button>
        </form>

        {/* Small Notice */}
        <p className="text-[11px] text-center text-slate-400 mt-6 leading-relaxed">
          نحن نهتم بخصوصية وأمان أطفالكم. يتم مراجعة الحسابات الجديدة يدوياً من قبل إدارة المخيم لضمان تواصل آمن وموثوق.
        </p>

      </main>

      {/* Footer / Admin Button */}
      <footer className="w-full max-w-md mx-auto text-center pb-8 pt-4 relative z-10">
        <button
          onClick={() => {
            setAdminPin("");
            setAdminError("");
            setShowAdminModal(true);
          }}
          className="inline-flex items-center gap-2 py-2 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all cursor-pointer border border-slate-200/40"
        >
          <Shield className="w-3.5 h-3.5 text-amber-600" />
          <span>بوابة إدارة المخيم (Admin)</span>
        </button>
      </footer>

      {/* Admin PIN Popup Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                    <span>بوابة المسؤولين</span>
                  </h3>
                  <button
                    onClick={() => setShowAdminModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
                
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  يرجى إدخال رمز المرور السري (PIN) الخاص بإدارة المخيم للدخول للوحة التحكم والمتابعة.
                </p>

                {adminError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{adminError}</span>
                  </div>
                )}

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <input
                      type="password"
                      maxLength={32}
                      required
                      autoFocus
                      placeholder="أدخل كلمة المرور السرية للمسؤول"
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      className="w-full text-center py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-slate-800"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/10 cursor-pointer"
                    >
                      تأكيد الدخول
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAdminModal(false)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
