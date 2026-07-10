import React, { useState, useEffect } from "react";
import { UserProfile, CampNotification, AlbumPost, Comment, CampSettings } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
// @ts-ignore
import campLogo from "../assets/images/camp_logo_1783717505873.jpg";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion 
} from "firebase/firestore";
import { 
  Home, 
  CalendarRange, 
  Images, 
  Send, 
  ExternalLink, 
  Lock, 
  LogOut, 
  Clock, 
  Coffee, 
  Sparkles, 
  User, 
  Baby, 
  BookOpen, 
  Utensils, 
  Heart, 
  AlertCircle,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ParentsDashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

export default function ParentsDashboard({ user, onLogout }: ParentsDashboardProps) {
  const [activeTab, setActiveTab] = useState<"home" | "schedule" | "gallery">("home");
  const [subTab, setSubTab] = useState<"program" | "menu" | "activities">("program");
  
  // Real-time Firestore state
  const [notifications, setNotifications] = useState<CampNotification[]>([]);
  const [albumPosts, setAlbumPosts] = useState<AlbumPost[]>([]);
  const [campSettings, setCampSettings] = useState<CampSettings | null>(null);
  
  // Local state for comments
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [commentPrivate, setCommentPrivate] = useState<{ [postId: string]: boolean }>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<{ [postId: string]: boolean }>({});

  // Subscribe to collections
  useEffect(() => {
    // 1. Subscribe to camp settings
    const settingsRef = doc(db, "config", "camp_settings");
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setCampSettings(docSnap.data() as CampSettings);
      }
    });

    // 2. Subscribe to notifications ordered by createdAt desc
    const notificationsQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsubNotifications = onSnapshot(notificationsQuery, (snap) => {
      const list: CampNotification[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as CampNotification);
      });
      setNotifications(list);
    });

    // 3. Subscribe to album posts ordered by createdAt desc
    const albumsQuery = query(collection(db, "album_posts"), orderBy("createdAt", "desc"));
    const unsubAlbums = onSnapshot(albumsQuery, (snap) => {
      const list: AlbumPost[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as AlbumPost);
      });
      setAlbumPosts(list);
    });

    return () => {
      unsubSettings();
      unsubNotifications();
      unsubAlbums();
    };
  }, []);

  // Submit comment
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId] || "";
    if (!text.trim()) return;

    setIsSubmittingComment(prev => ({ ...prev, [postId]: true }));
    try {
      const newComment: Comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        parentName: user.parentName,
        childName: user.childName,
        text: text.trim(),
        isPrivate: !!commentPrivate[postId],
        createdAt: Date.now()
      };

      const postRef = doc(db, "album_posts", postId);
      try {
        await updateDoc(postRef, {
          comments: arrayUnion(newComment)
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `album_posts/${postId}`);
        return;
      }

      // Clear input
      setCommentInputs(prev => ({ ...prev, [postId]: "" }));
      setCommentPrivate(prev => ({ ...prev, [postId]: false }));
    } catch (error) {
      console.error("Error writing comment to Firestore:", error);
      alert("حدث خطأ أثناء إضافة التعليق. يرجى المحاولة مجدداً.");
    } finally {
      setIsSubmittingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Helper to format timestamps to nice Arabic text
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  // Formats multiline rich texts into beautiful items with icons
  const renderFormattedList = (text: string | undefined, iconType: "time" | "food" | "star") => {
    if (!text) {
      return (
        <div className="text-center py-8 text-slate-400 text-sm">
          جاري تحميل البرامج المحدثة من الإدارة... ⏳
        </div>
      );
    }

    const lines = text.split("\n").filter(line => line.trim().length > 0);
    return (
      <div className="space-y-4">
        {lines.map((line, idx) => {
          let lineContent = line;
          // Strip Markdown symbols for a cleaner custom view
          lineContent = lineContent.replace(/\*\*/g, "").replace(/^[•\-\*\d+\.\s]+/g, "");

          let icon = <Sparkles className="w-4 h-4 text-amber-500" />;
          let bgClass = "bg-amber-50/50 border-amber-100/50";
          
          if (iconType === "time") {
            icon = <Clock className="w-4 h-4 text-amber-600" />;
            bgClass = "bg-orange-50/40 border-orange-100/40";
          } else if (iconType === "food") {
            icon = <Coffee className="w-4 h-4 text-emerald-600" />;
            bgClass = "bg-emerald-50/40 border-emerald-100/40";
          }

          // Special style if it looks like a header (has : or starts with bold indicator in the source text)
          const isHeader = line.includes("**") && (line.trim().startsWith("📅") || line.trim().startsWith("🍏") || line.trim().startsWith("🚀"));

          if (isHeader) {
            return (
              <h4 key={idx} className="text-base font-extrabold text-slate-800 border-r-4 border-amber-500 pr-3 py-1 my-6">
                {lineContent}
              </h4>
            );
          }

          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={idx}
              className={`p-4 rounded-2xl border ${bgClass} flex items-start gap-3 shadow-sm hover:scale-[1.01] transition-transform`}
            >
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                {icon}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed font-medium">{lineContent}</p>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col pb-24 md:pb-6 md:flex-row font-sans">
      
      {/* Sidebar for Medium+ Screens */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-white border-l border-slate-100 p-6 shrink-0 h-screen sticky top-0">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-slate-100 p-0.5 shadow-md shadow-amber-500/10 shrink-0">
              <img
                id="app-logo-sidebar"
                src={campLogo}
                alt="لوجو المخيم"
                className="w-full h-full rounded-lg object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800">Camp Connect</h2>
              <span className="text-[10px] font-bold text-amber-600">بوابة أولياء الأمور</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={() => setActiveTab("home")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "home"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Home className="w-4 h-4" />
              <span>الرئيسية والإشعارات</span>
            </button>

            <button
              onClick={() => setActiveTab("schedule")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "schedule"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <CalendarRange className="w-4 h-4" />
              <span>البرامج والوجبات</span>
            </button>

            <button
              onClick={() => setActiveTab("gallery")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "gallery"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Images className="w-4 h-4" />
              <span>ألبومات الصور التفاعلية</span>
            </button>
          </div>
        </div>

        {/* User Info & Logout inside sidebar */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100/30 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
              {user.parentName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{user.parentName}</p>
              <p className="text-[10px] text-amber-700 truncate">طفلكم: {user.childName}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 text-xs font-semibold transition-all cursor-pointer border border-slate-200/50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 pt-6 md:px-8">
        
        {/* Top welcome bar for mobile, or simple header */}
        <header className="flex items-center justify-between bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 p-0.5 shrink-0 border border-slate-100">
              <img
                id="app-logo-welcome"
                src={campLogo}
                alt="لوجو المخيم"
                className="w-full h-full rounded-2xl object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">أهلاً بك أبو {user.childName} 🌟</h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">يسعدنا متابعتك اليومية لأولادك في المخيم الصيفي</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="md:hidden p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Main tabs view content */}
        <main>
          {activeTab === "home" && (
            <div className="space-y-6">
              
              {/* Quick statistics/welcome visual */}
              <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-3xl p-6 text-white shadow-lg shadow-amber-500/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <h4 className="text-lg font-black flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  مستعدون ليوم مفعم بالحيوية؟
                </h4>
                <p className="text-xs text-white/90 mt-1 max-w-md leading-relaxed">
                  نحن ملتزمون بتوفير بيئة تعليمية، ترفيهية، وآمنة تماماً لأطفالنا الأعزاء. تابع التفاصيل اليومية بالأسفل أولاً بأول!
                </p>
              </div>

              {/* General Notifications Section */}
              <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">📢 الإشعارات العاجلة والتعليمات</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">آخر المستجدات والتعليمات الرسمية الصادرة عن الإدارة</p>
                  </div>
                  <span className="text-xs bg-amber-50 text-amber-700 font-bold px-2.5 py-1 rounded-lg">
                    {notifications.length} إشعار
                  </span>
                </div>

                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    لا يوجد إشعارات عاجلة حالياً. سنقوم بإبلاغكم بأي مستجدات هنا فوراً! 🔔
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {notifications.map((notif, index) => {
                      const isNew = Date.now() - notif.createdAt < 24 * 3600000;
                      return (
                        <div
                          key={notif.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 relative ${
                            isNew 
                              ? "bg-amber-50/35 border-amber-200 shadow-sm" 
                              : "bg-white border-slate-100"
                          }`}
                        >
                          {isNew && (
                            <span className="absolute top-3 left-3 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                          )}
                          <div className="flex justify-between items-start gap-4">
                            <h4 className="text-sm font-extrabold text-slate-800">{notif.title}</h4>
                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{notif.body}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "schedule" && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
              
              {/* Inner Sub-tabs for schedules */}
              <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
                <button
                  onClick={() => setSubTab("program")}
                  className={`flex-1 py-3 text-center text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    subTab === "program" 
                      ? "bg-amber-500 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>البرنامج اليومي</span>
                </button>

                <button
                  onClick={() => setSubTab("menu")}
                  className={`flex-1 py-3 text-center text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    subTab === "menu" 
                      ? "bg-amber-500 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>البرنامج الغذائي</span>
                </button>

                <button
                  onClick={() => setSubTab("activities")}
                  className={`flex-1 py-3 text-center text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    subTab === "activities" 
                      ? "bg-amber-500 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>الأنشطة والرحلات</span>
                </button>
              </div>

              {/* Dynamic Sub-tab content rendering */}
              <div className="pt-2">
                {subTab === "program" && renderFormattedList(campSettings?.dailyProgram, "time")}
                {subTab === "menu" && renderFormattedList(campSettings?.dietaryMenu, "food")}
                {subTab === "activities" && renderFormattedList(campSettings?.activities, "star")}
              </div>
            </div>
          )}

          {activeTab === "gallery" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">📸 ألبومات الصور والفعاليات</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">شاهد صور أطفالك المباشرة وشارك تعليقاتك وتفاعلك</p>
                </div>
                {campSettings?.photoAlbumUrl && (
                  <a
                    href={campSettings.photoAlbumUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>ألبوم قوقل الرئيسي</span>
                  </a>
                )}
              </div>

              {albumPosts.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center text-slate-400 text-sm border border-slate-100">
                  لا توجد ألبومات صور منشورة بعد. يرجى الانتظار لحين بدء الأنشطة اليومية! 🏕️
                </div>
              ) : (
                <div className="space-y-6">
                  {albumPosts.map((post) => {
                    // Filter comments according to rules:
                    // 1. Non-private comments are shown to everyone.
                    // 2. Private comments are shown ONLY to the user who wrote them OR if the user is Admin (though this is the ParentsDashboard, so they are not admin here).
                    const visibleComments = (post.comments || []).filter((comment) => {
                      if (!comment.isPrivate) return true;
                      // Private comments are shown if the author matches the logged in user
                      return comment.parentName === user.parentName && comment.childName === user.childName;
                    });

                    return (
                      <div key={post.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        
                        {/* Post Header */}
                        <div className="p-5 border-b border-slate-50 flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-800">{post.albumName}</h4>
                            <span className="text-[10px] text-slate-400 font-medium block mt-1">
                              نشر {formatTimeAgo(post.createdAt)}
                            </span>
                          </div>
                          
                          <a
                            href={post.albumUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>تصفح الصور</span>
                          </a>
                        </div>

                        {/* Fun Creative Placeholder Image Card */}
                        <div className="bg-gradient-to-br from-amber-100/40 via-orange-50/30 to-emerald-100/40 h-44 flex flex-col items-center justify-center p-6 text-center border-b border-slate-50">
                          <Images className="w-12 h-12 text-amber-500/80 mb-2 animate-pulse" />
                          <p className="text-xs font-bold text-slate-700">لقطات حية من داخل الأنشطة 🌟</p>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                            انقر على زر "تصفح الصور" بالأعلى لفتح ألبوم قوقل الآمن المليء باللحظات الرائعة بجودتها الكاملة.
                          </p>
                        </div>

                        {/* Comments Section */}
                        <div className="p-5 bg-slate-50/40">
                          <h5 className="text-xs font-extrabold text-slate-700 mb-4 flex items-center gap-1.5">
                            <span>التعليقات والمناقشات</span>
                            <span className="bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md text-[10px]">
                              {visibleComments.length}
                            </span>
                          </h5>

                          {/* Comment List */}
                          {visibleComments.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic text-center py-4">لا توجد تعليقات بعد. كن أول من يعلق!</p>
                          ) : (
                            <div className="space-y-3 mb-5 max-h-60 overflow-y-auto pr-1">
                              {visibleComments.map((comment) => (
                                <div
                                  key={comment.id}
                                  className={`p-3 rounded-2xl text-xs flex flex-col gap-1 shadow-2xs border ${
                                    comment.isPrivate
                                      ? "bg-amber-50/60 border-amber-200/50"
                                      : comment.childName === ""
                                      ? "bg-emerald-50/50 border-emerald-100/40" // Admin responses
                                      : "bg-white border-slate-100"
                                  }`}
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-extrabold text-slate-800">
                                        {comment.parentName}
                                      </span>
                                      {comment.childName && (
                                        <span className="text-[9px] text-slate-400 font-bold">
                                          (ولي أمر {comment.childName})
                                        </span>
                                      )}
                                      {comment.childName === "" && (
                                        <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[8px]">
                                          إدارة المخيم
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                                      {comment.isPrivate && (
                                        <span className="flex items-center gap-0.5 text-amber-700 font-bold bg-amber-100/40 px-1.5 py-0.5 rounded">
                                          <Lock className="w-2.5 h-2.5" />
                                          تعليق خاص
                                        </span>
                                      )}
                                      <span>{formatTimeAgo(comment.createdAt)}</span>
                                    </div>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed font-medium mt-0.5">{comment.text}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Comment Form */}
                          <div className="border-t border-slate-100 pt-4 mt-3">
                            <div className="flex items-center justify-between mb-3 bg-white p-2.5 rounded-xl border border-slate-100">
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 select-none">
                                <input
                                  type="checkbox"
                                  checked={!!commentPrivate[post.id]}
                                  onChange={(e) => setCommentPrivate(prev => ({ ...prev, [post.id]: e.target.checked }))}
                                  className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 border-slate-200"
                                />
                                <span className="flex items-center gap-1">
                                  <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                                  تعليق خاص (يظهر للإدارة فقط)
                                </span>
                              </label>
                              <p className="text-[10px] text-slate-400">
                                {commentPrivate[post.id] ? "🔒 خصوصية تامة" : "🌐 يظهر للجميع"}
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={commentInputs[post.id] || ""}
                                onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAddComment(post.id);
                                }}
                                placeholder="اكتب تعليقك هنا أو استفسارك..."
                                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 font-medium"
                              />
                              <button
                                onClick={() => handleAddComment(post.id)}
                                disabled={isSubmittingComment[post.id]}
                                className="p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl flex items-center justify-center transition-all shadow-md shadow-amber-500/10 hover:shadow-lg cursor-pointer"
                              >
                                {isSubmittingComment[post.id] ? (
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Bottom Nav Bar for Mobile Screens */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around py-3 px-4 md:hidden z-40 shadow-lg">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center gap-1.5 transition-all relative ${
            activeTab === "home" ? "text-amber-500 font-boldScale" : "text-slate-400"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold">الرئيسية</span>
          {activeTab === "home" && <span className="absolute bottom-[-10px] w-5 h-1 bg-amber-500 rounded-full"></span>}
        </button>

        <button
          onClick={() => setActiveTab("schedule")}
          className={`flex flex-col items-center gap-1.5 transition-all relative ${
            activeTab === "schedule" ? "text-amber-500 font-boldScale" : "text-slate-400"
          }`}
        >
          <CalendarRange className="w-5 h-5" />
          <span className="text-[10px] font-bold">البرامج</span>
          {activeTab === "schedule" && <span className="absolute bottom-[-10px] w-5 h-1 bg-amber-500 rounded-full"></span>}
        </button>

        <button
          onClick={() => setActiveTab("gallery")}
          className={`flex flex-col items-center gap-1.5 transition-all relative ${
            activeTab === "gallery" ? "text-amber-500 font-boldScale" : "text-slate-400"
          }`}
        >
          <Images className="w-5 h-5" />
          <span className="text-[10px] font-bold">الصور</span>
          {activeTab === "gallery" && <span className="absolute bottom-[-10px] w-5 h-1 bg-amber-500 rounded-full"></span>}
        </button>
      </nav>

    </div>
  );
}
