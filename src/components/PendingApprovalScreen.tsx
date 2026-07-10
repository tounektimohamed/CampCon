import React from "react";
import { UserProfile } from "../types";
import { Clock, ShieldAlert, LogOut, MessageCircle, HelpCircle } from "lucide-react";
import { motion } from "motion/react";
// @ts-ignore
import campLogo from "../assets/images/camp_logo_1783717505873.jpg";

interface PendingApprovalScreenProps {
  user: UserProfile;
  onLogout: () => void;
}

export default function PendingApprovalScreen({ user, onLogout }: PendingApprovalScreenProps) {
  const isPending = user.status === "pending";

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 bg-gradient-to-b from-amber-50 via-orange-50 to-emerald-50 relative overflow-hidden">
      
      {/* Dynamic Background Circles */}
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] rounded-full bg-amber-200/20 blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-emerald-200/20 blur-3xl pointer-events-none"></div>

      {/* Spacer */}
      <div></div>

      {/* Main card */}
      <main className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-orange-100/60 p-8 text-center relative z-10 my-auto">
        {/* Camp Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 p-0.5 border border-slate-100 shadow-md hover:scale-105 transition-transform duration-300">
            <img
              id="app-logo-pending"
              src={campLogo}
              alt="لوجو المخيم"
              className="w-full h-full rounded-2xl object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {isPending ? (
          <div>
            {/* Animated Clock / Loading icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 text-amber-600 mb-6 relative">
              <span className="absolute inset-0 rounded-full bg-amber-200/40 animate-ping opacity-75"></span>
              <Clock className="w-10 h-10 relative z-10 animate-spin" style={{ animationDuration: '8s' }} />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-800 mb-3">قيد مراجعة الإدارة... ⏳</h2>
            <p className="text-sm font-semibold text-amber-700 mb-6">أهلاً بك، {user.parentName}</p>

            <div className="space-y-4 text-slate-600 text-sm leading-relaxed text-right bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <p className="font-semibold text-slate-700 text-center mb-1">تأمين خصوصية الأطفال أولويتنا</p>
              <p className="text-xs">
                لقد استلمنا طلب انضمام طفلك <span className="font-bold text-amber-600">({user.childName})</span> إلى المنصة بنجاح.
              </p>
              <p className="text-xs">
                يقوم مسؤولو المخيم بمراجعة كل طلب يدوياً للتأكد من هوية أولياء الأمور وحماية خصوصية وألبومات صور الأطفال داخل المخيم.
              </p>
              <p className="text-xs font-medium text-emerald-600 flex items-center gap-1.5 justify-center pt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                لا داعي لتحديث الصفحة، سيتم دخولك تلقائياً بمجرد الموافقة!
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Rejected Warning Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-100 text-rose-600 mb-6">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-extrabold text-rose-700 mb-3">عذراً، تعذر قبول الطلب ⚠️</h2>
            <p className="text-sm font-semibold text-slate-600 mb-6">أهلاً بك، {user.parentName}</p>

            <div className="space-y-3 text-slate-600 text-sm leading-relaxed text-right bg-rose-50/50 p-5 rounded-2xl border border-rose-100">
              <p className="text-xs text-rose-800">
                لم نتمكن من مطابقة معلومات طفلك <span className="font-bold">({user.childName})</span> مع قوائم الطلاب المسجلين رسمياً في المخيم الصيفي لهذا الموسم.
              </p>
              <p className="text-xs">
                يرجى التأكد من كتابة الاسم الثلاثي للطفل بشكل صحيح كما هو مسجل بالملفات الرسمية.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <a
                href="tel:000000"
                className="flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/10 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>الاتصال بإدارة المخيم للمساعدة</span>
              </a>
            </div>
          </div>
        )}

        {/* Sign Out Action */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-bold transition-all cursor-pointer border border-slate-200/30"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج والعودة للرئيسية</span>
          </button>
        </div>
      </main>

      {/* Decorative Brand Text */}
      <footer className="w-full text-center pb-8 pt-4 text-[11px] text-slate-400 font-medium">
        Camp Connect • منصة التواصل الآمن لأولياء الأمور
      </footer>
    </div>
  );
}
