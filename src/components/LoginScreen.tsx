import React, { useState } from "react";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { UserProfile } from "../types";
import { Shield, Sparkles, User, Baby, LogIn, ClipboardList, AlertCircle, CheckCircle2, Lock, HelpCircle, Camera, Smartphone } from "lucide-react";
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

  // Screenshot Dialog after successful registration
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<UserProfile | null>(null);

  // Admin PIN states
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState("");

  // Recover Guardian Name states
  const [showForgotHelper, setShowForgotHelper] = useState(false);
  const [searchChildName, setSearchChildName] = useState("");
  const [searchPin, setSearchPin] = useState("");
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);

  // Participant Selector for duplicate parent names during login
  const [matchingUsersForLogin, setMatchingUsersForLogin] = useState<UserProfile[]>([]);
  const [showParticipantSelector, setShowParticipantSelector] = useState(false);

  const formatUserId = (pName: string, cName: string) => {
    const cleanParent = pName.trim().toLowerCase().replace(/\s+/g, "_");
    const cleanChild = cName.trim().toLowerCase().replace(/\s+/g, "_");
    return `${cleanParent}_${cleanChild}`;
  };

  // Input Validation Rules
  const isParentValid = parentName.trim().length >= 2 && !/\s/.test(parentName.trim());
  const childWords = childName.trim().split(/\s+/);
  const isChildValid = childWords.length === 2 && childWords[0].length >= 2 && childWords[1].length >= 2;
  const isPinValid = pin.length === 5 && /^\d{5}$/.test(pin);

  const handleSearchGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    setSearchResult(null);
    setSearching(true);

    if (!searchChildName.trim() || !searchPin.trim()) {
      setSearchError("يرجى إدخال اسم المشارك والرمز السري الخاص به.");
      setSearching(false);
      return;
    }

    try {
      const usersRef = collection(db, "users");
      // Search by 5-digit PIN
      const q = query(usersRef, where("pin", "==", searchPin.trim()));
      const querySnapshot = await getDocs(q);
      
      let foundUser: UserProfile | null = null;
      querySnapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        if (u.childName.trim().toLowerCase() === searchChildName.trim().toLowerCase()) {
          foundUser = u;
        }
      });

      if (foundUser) {
        const pName = (foundUser as UserProfile).parentName;
        setSearchResult(pName);
        // Auto-fill form values instantly for seamless UX
        setParentName(pName);
        setPin((foundUser as UserProfile).pin);
      } else {
        setSearchError("لم يتم العثور على تطابق. يرجى التأكد من اسم المشارك الثنائي والرمز السري بدقة.");
      }
    } catch (err) {
      console.error("Error searching guardian:", err);
      setSearchError("حدث خطأ أثناء البحث في قاعدة البيانات.");
    } finally {
      setSearching(false);
    }
  };

  const handleParentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip all spaces immediately so they cannot enter multiple names
    const raw = e.target.value;
    const cleaned = raw.replace(/\s+/g, "");
    setParentName(cleaned);
  };

  const handleChildNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Strip multiple consecutive spaces but keep single spaces
    const cleaned = raw.replace(/\s{2,}/g, " ");
    setChildName(cleaned);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!parentName.trim() || !childName.trim() || !pin.trim()) {
      setError("يرجى ملء جميع الحقول المطلوبة.");
      return;
    }

    if (!isParentValid) {
      setError("يجب أن يكون اسم الولي كلمة واحدة فقط بدون أي مسافات (مثال: أحمد).");
      return;
    }

    if (!isChildValid) {
      setError("يجب أن يكون اسم المشارك ثنائياً باللقب (كلمتان تفصل بينهما مسافة واحدة، مثال: سليم الكندي).");
      return;
    }

    if (!isPinValid) {
      setError("الرجاء إدخال رقم سري مكون من 5 أرقام بالضبط.");
      return;
    }

    setLoading(true);
    try {
      const id = formatUserId(parentName, childName);
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
        setError("هذا المشارك مسجل بالفعل تحت اسم الولي هذا! يرجى الانتقال إلى تبويب 'دخول سريع' لتسجيل الدخول.");
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
      
      setSuccess("تم تسجيل حسابك بنجاح! يرجى مراجعة وتصوير بيانات الحساب أدناه.");
      
      // Save session but do not auto-login until they dismiss the modal
      localStorage.setItem("camp_connect_user", JSON.stringify(newUser));
      
      setRegisteredUser(newUser);
      setShowSuccessModal(true);

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

    if (!isPinValid) {
      setError("الرجاء إدخال رقم سري مكون من 5 أرقام بالضبط.");
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      // Search by 5-digit PIN to find potential accounts
      const q = query(usersRef, where("pin", "==", pin.trim()));
      const querySnapshot = await getDocs(q);
      
      const matches: UserProfile[] = [];
      const enteredClean = parentName.trim().toLowerCase().replace(/[\s_]+/g, "");

      querySnapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        const storedClean = u.parentName.trim().toLowerCase().replace(/[\s_]+/g, "");
        if (storedClean === enteredClean) {
          matches.push({ id: docSnap.id, ...u });
        }
      });

      if (matches.length === 0) {
        setError("لم يتم العثور على هذا التسجيل. يرجى التحقق من صحة اسم الولي والرمز السري، أو التبديل لتبويب 'تسجيل ولي أمر جديد'.");
        setLoading(false);
        return;
      }

      if (matches.length === 1) {
        const userProfile = matches[0];
        setSuccess("تم تسجيل الدخول بنجاح!");
        
        // Save session
        localStorage.setItem("camp_connect_user", JSON.stringify(userProfile));

        setTimeout(() => {
          onLoginSuccess(userProfile);
        }, 1000);
      } else {
        // Show dialogue to let them choose which participant profile they want to access
        setMatchingUsersForLogin(matches);
        setShowParticipantSelector(true);
      }

    } catch (err: any) {
      console.error(err);
      setError("حدث خطأ أثناء تسجيل الدخول. يرجى التحقق من الاتصال بقاعدة البيانات.");
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
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700">اسم الولي</label>
              {parentName && activeTab === "register" && (
                <span className={`text-[10px] font-bold ${isParentValid ? "text-emerald-600" : "text-amber-600"}`}>
                  {isParentValid ? "✓ اسم صحيح" : "⚠ يجب أن يكون اسم واحد بدون مسافات"}
                </span>
              )}
              {parentName && activeTab === "login" && (
                <span className="text-[10px] font-bold text-slate-400">
                  (أدخل اسم الولي المستخدم عند التسجيل)
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={parentName}
                onChange={(e) => {
                  if (activeTab === "register") {
                    handleParentNameChange(e);
                  } else {
                    setParentName(e.target.value);
                  }
                }}
                placeholder={activeTab === "register" ? "أحمد" : "مثال: أبو أحمد الكندي"}
                className={`w-full pr-11 pl-4 py-3 text-sm bg-slate-50/50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all text-slate-800 font-extrabold ${
                  parentName ? (activeTab === "register" ? (isParentValid ? "border-emerald-500 bg-emerald-50/5" : "border-amber-400 bg-amber-50/5") : "border-slate-300 bg-slate-50/10") : "border-slate-200/80"
                }`}
              />
            </div>
            {activeTab === "register" ? (
              <p className="text-[10px] text-slate-400 mt-1 font-medium">اسم واحد فقط بدون أي مسافات أو ألقاب (مثال: <span className="font-bold text-slate-600">أحمد</span>)</p>
            ) : (
              <p className="text-[10px] text-slate-400 mt-1 font-medium">الاسم الذي استخدمته للتسجيل (يدعم الأسماء القديمة والجديدة بمسافات)</p>
            )}
          </div>

          {activeTab === "register" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-700">اسم المشارك (الطفل)</label>
                {childName && (
                  <span className={`text-[10px] font-bold ${isChildValid ? "text-emerald-600" : "text-amber-600"}`}>
                    {isChildValid ? "✓ صيغة صحيحة (اسم ثنائي باللقب)" : "⚠ اكتب الاسم الأول + اللقب فقط"}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                  <Baby className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required={activeTab === "register"}
                  value={childName}
                  onChange={handleChildNameChange}
                  placeholder="سليم أحمد"
                  className={`w-full pr-11 pl-4 py-3 text-sm bg-slate-50/50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all text-slate-800 font-bold ${
                    childName ? (isChildValid ? "border-emerald-500 bg-emerald-50/5" : "border-amber-400 bg-amber-50/5") : "border-slate-200/80"
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">الاسم ثنائي فقط مع اللقب (مثال: <span className="font-bold text-slate-600">سليم الكندي</span>)</p>
            </motion.div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700">رمز المرور السري</label>
              {pin && (
                <span className={`text-[10px] font-bold ${isPinValid ? "text-emerald-600" : "text-amber-600"}`}>
                  {isPinValid ? "✓ رمز مكتمل" : `⚠ يجب أن يكون 5 أرقام (${pin.length}/5)`}
                </span>
              )}
            </div>
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
                className={`w-full pr-11 pl-4 py-3 text-sm bg-slate-50/50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all text-slate-800 font-bold tracking-widest ${
                  pin ? (isPinValid ? "border-emerald-500 bg-emerald-50/5" : "border-amber-400 bg-amber-50/5") : "border-slate-200/80"
                }`}
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

        {/* Recover Guardian Name Tool */}
        {activeTab === "login" && (
          <div className="mt-5 border-t border-dashed border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowForgotHelper(!showForgotHelper);
                setSearchChildName("");
                setSearchPin("");
                setSearchResult(null);
                setSearchError("");
              }}
              className="w-full text-center text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer py-1 bg-amber-50/30 hover:bg-amber-50/70 rounded-xl"
            >
              <HelpCircle className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>نسيت اسم الولي؟ ابحث باسم طفلك واسترجعه فوراً</span>
            </button>

            <AnimatePresence>
              {showForgotHelper && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3"
                >
                  <div className="text-[11px] text-slate-600 font-bold leading-relaxed mb-1">
                    أدخل اسم المشارك الثنائي بالكامل والرمز السري الخاص به والمكون من 5 أرقام لاسترجاع اسم الولي وتعبئته تلقائياً:
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 mb-1">اسم المشارك (الثنائي باللقب)</label>
                      <input
                        type="text"
                        placeholder="مثال: سليم الكندي"
                        value={searchChildName}
                        onChange={(e) => setSearchChildName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 mb-1">الرمز السري الخاص بالمشارك (5 أرقام)</label>
                      <input
                        type="password"
                        maxLength={5}
                        inputMode="numeric"
                        pattern="\d{5}"
                        placeholder="مثال: 12345"
                        value={searchPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          if (val.length <= 5) setSearchPin(val);
                        }}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 font-bold text-slate-800 tracking-widest"
                      />
                    </div>

                    {searchError && (
                      <div className="text-[10px] text-rose-600 font-bold flex items-start gap-1.5 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{searchError}</span>
                      </div>
                    )}

                    {searchResult && (
                      <div className="text-[11px] text-emerald-800 font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-100 space-y-2">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>تم العثور على اسم الولي بنجاح!</span>
                        </div>
                        <div className="bg-white px-3 py-2 rounded-lg border border-emerald-200 inline-block text-emerald-900 font-black tracking-wide text-xs">
                          اسم الولي الخاص بك هو: <span className="text-amber-600">{searchResult}</span>
                        </div>
                        <div className="text-[9.5px] text-emerald-600 leading-normal font-medium">
                          لقد قمنا بتعبئة اسم الولي والرمز السري في الحقول أعلاه تلقائياً! اضغط على زر "دخول سريع للمنصة" الآن.
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={searching}
                      onClick={handleSearchGuardian}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {searching ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <span>استرجاع اسم الولي وتعبئة الحقول</span>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

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

      {/* Registration Success Screenshot Reminder Modal */}
      <AnimatePresence>
        {showSuccessModal && registeredUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-amber-100 relative"
            >
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white text-center relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-400 rounded-full opacity-30 animate-pulse"></div>
                <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-amber-700 rounded-full opacity-30"></div>
                
                <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-3 animate-bounce">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-lg font-black tracking-wide">الرجاء تصوير الشاشة الآن! 📸</h3>
                <p className="text-xs text-amber-50 mt-1 font-semibold">
                  يرجى أخذ لقطة شاشة (Screenshot) لحفظ بيانات دخولك
                </p>
              </div>

              <div className="p-6 space-y-5 text-right">
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-rose-800">تنبيه هام جداً للأولياء:</h4>
                    <p className="text-[11px] text-rose-700 font-bold leading-relaxed">
                      احرص على تصوير الشاشة وحفظ هذه البيانات في مكان آمن، فلن تتمكن من دخول المنصة بدونها!
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <span className="text-xs font-black text-slate-800 bg-amber-100/60 text-amber-800 px-3 py-1 rounded-lg font-mono tracking-widest text-sm">{registeredUser.parentName}</span>
                    <span className="text-xs font-extrabold text-slate-500">اسم الولي (اسم المستخدم):</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <span className="text-xs font-black text-slate-800 bg-emerald-100/60 text-emerald-800 px-3 py-1 rounded-lg font-mono tracking-widest text-sm">{registeredUser.pin}</span>
                    <span className="text-xs font-extrabold text-slate-500">الرمز السري المكون من 5 أرقام:</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700">{registeredUser.childName}</span>
                    <span className="text-xs font-extrabold text-slate-500">اسم المشارك الثنائي باللقب:</span>
                  </div>
                </div>

                <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100 text-center">
                  <p className="text-[10px] text-amber-800 font-bold leading-normal">
                    💡 يمكنك استرجاع اسم الولي في أي وقت لاحقاً بالبحث باسم طفلك الثنائي والرمز السري الخاص به عبر خيار "نسيت اسم الولي؟" في شاشة الدخول السريع.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    if (registeredUser) {
                      onLoginSuccess(registeredUser);
                    }
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all transform hover:-translate-y-0.5 cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  <span>لقد قمت بتصوير الشاشة، الدخول للمنصة الآن</span>
                  <LogIn className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Participant Selector Modal for Duplicate Guardian Names */}
      <AnimatePresence>
        {showParticipantSelector && matchingUsersForLogin.length > 0 && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-amber-100 relative text-right"
            >
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white text-center relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-400 rounded-full opacity-30 animate-pulse"></div>
                <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-amber-700 rounded-full opacity-30"></div>
                
                <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-3">
                  <Baby className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-lg font-black tracking-wide">اختر حساب المشارك للدخول 👦👧</h3>
                <p className="text-xs text-amber-50 mt-1 font-semibold">
                  تم العثور على أكثر من مشارك مسجل باسم الولي ({parentName})
                </p>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                  يرجى النقر على اسم المشارك (الطفل) للدخول إلى حسابه ولوحة المتابعة الخاصة به:
                </p>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {matchingUsersForLogin.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setShowParticipantSelector(false);
                        setSuccess("تم تسجيل الدخول بنجاح!");
                        localStorage.setItem("camp_connect_user", JSON.stringify(user));
                        setTimeout(() => {
                          onLoginSuccess(user);
                        }, 1000);
                      }}
                      className="w-full p-4 bg-slate-50 hover:bg-amber-50/50 border border-slate-200/80 hover:border-amber-400 rounded-2xl transition-all duration-200 flex items-center justify-between text-right cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        {user.status === "approved" && (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-md">مقبول</span>
                        )}
                        {user.status === "pending" && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded-md">قيد الانتظار</span>
                        )}
                        {user.status === "rejected" && (
                          <span className="bg-rose-100 text-rose-800 text-[9px] font-extrabold px-2 py-0.5 rounded-md">مرفوض</span>
                        )}
                        <LogIn className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                      </div>
                      
                      <div className="space-y-0.5">
                        <div className="text-sm font-black text-slate-800 group-hover:text-amber-600 transition-colors">
                          {user.childName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          تاريخ التسجيل: {new Date(user.registeredAt).toLocaleDateString("ar-EG")}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowParticipantSelector(false)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
