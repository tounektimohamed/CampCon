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
  getDoc,
  setDoc,
  addDoc,
  updateDoc, 
  deleteDoc,
  arrayUnion
} from "firebase/firestore";
import { 
  Users, 
  Settings, 
  Megaphone, 
  Image, 
  MessageSquare, 
  LogOut, 
  Check, 
  X, 
  Trash2, 
  Pencil,
  Save, 
  Plus, 
  Lock, 
  Send, 
  ShieldAlert, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"users" | "settings" | "broadcast" | "albums" | "comments">("users");

  // Real-time Database States
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [campSettings, setCampSettings] = useState<CampSettings | null>(null);
  const [notifications, setNotifications] = useState<CampNotification[]>([]);
  const [albumPosts, setAlbumPosts] = useState<AlbumPost[]>([]);

  // Content Manager fields
  const [photoAlbumUrl, setPhotoAlbumUrl] = useState("");
  const [dailyProgram, setDailyProgram] = useState("");
  const [dietaryMenu, setDietaryMenu] = useState("");
  const [activities, setActivities] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState("");

  // Broadcast Center fields
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // Album Creator fields
  const [albumName, setAlbumName] = useState("");
  const [albumUrl, setAlbumUrl] = useState("");
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);

  // Comment Reply fields
  const [replyInputs, setReplyInputs] = useState<{ [postId: string]: string }>({});
  const [isReplying, setIsReplying] = useState<{ [postId: string]: boolean }>({});

  // Editing states
  const [editingNotifId, setEditingNotifId] = useState<string | null>(null);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [editingCommentPostId, setEditingCommentPostId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>("");

  // Custom Delete Target State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "user" | "notification" | "album" | "comment" | null;
    id: string;
    secondaryId?: string;
    title: string;
    message: string;
  }>({
    type: null,
    id: "",
    title: "",
    message: ""
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExecuteDelete = async () => {
    if (!deleteTarget.type) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "user") {
        const userRef = doc(db, "users", deleteTarget.id);
        try {
          await deleteDoc(userRef);
          showToast("تم حذف المستخدم نهائياً بنجاح! 🗑️", "success");
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${deleteTarget.id}`);
          showToast("حدث خطأ في قاعدة البيانات.", "error");
        }
      } else if (deleteTarget.type === "notification") {
        try {
          await deleteDoc(doc(db, "notifications", deleteTarget.id));
          showToast("تم حذف الإشعار بنجاح! 🗑️", "success");
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `notifications/${deleteTarget.id}`);
          showToast("حدث خطأ في قاعدة البيانات.", "error");
        }
      } else if (deleteTarget.type === "album") {
        try {
          await deleteDoc(doc(db, "album_posts", deleteTarget.id));
          showToast("تم حذف منشور الألبوم بنجاح! 🗑️", "success");
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `album_posts/${deleteTarget.id}`);
          showToast("حدث خطأ في قاعدة البيانات.", "error");
        }
      } else if (deleteTarget.type === "comment") {
        const postId = deleteTarget.secondaryId;
        const commentId = deleteTarget.id;
        if (postId) {
          const postRef = doc(db, "album_posts", postId);
          let postSnap;
          try {
            postSnap = await getDoc(postRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `album_posts/${postId}`);
            showToast("فشل جلب الألبوم من قاعدة البيانات.", "error");
            setIsDeleting(false);
            setDeleteTarget({ type: null, id: "", title: "", message: "" });
            return;
          }
          if (postSnap.exists()) {
            const post = postSnap.data() as AlbumPost;
            const updatedComments = (post.comments || []).filter(c => c.id !== commentId);
            try {
              await updateDoc(postRef, { comments: updatedComments });
              showToast("تم حذف التعليق بنجاح! 🗑️", "success");
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `album_posts/${postId}`);
              showToast("فشل تحديث التعليقات في قاعدة البيانات.", "error");
            }
          }
        }
      }
    } catch (error) {
      console.error("Error executing delete:", error);
      showToast("حدث خطأ أثناء عملية الحذف.", "error");
    } finally {
      setIsDeleting(false);
      setDeleteTarget({ type: null, id: "", title: "", message: "" });
    }
  };

  // Custom Toast State
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success"
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Fetch / Subscribe to all data
  useEffect(() => {
    // 1. Subscribe to Users
    const usersQuery = query(collection(db, "users"), orderBy("registeredAt", "desc"));
    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as UserProfile);
      });
      setAllUsers(list);
    });

    // 2. Subscribe to Settings
    const settingsRef = doc(db, "config", "camp_settings");
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as CampSettings;
        setCampSettings(data);
        setPhotoAlbumUrl(data.photoAlbumUrl || "");
        setDailyProgram(data.dailyProgram || "");
        setDietaryMenu(data.dietaryMenu || "");
        setActivities(data.activities || "");
      }
    });

    // 3. Subscribe to Notifications
    const notificationsQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsubNotifications = onSnapshot(notificationsQuery, (snap) => {
      const list: CampNotification[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as CampNotification);
      });
      setNotifications(list);
    });

    // 4. Subscribe to Album Posts
    const albumsQuery = query(collection(db, "album_posts"), orderBy("createdAt", "desc"));
    const unsubAlbums = onSnapshot(albumsQuery, (snap) => {
      const list: AlbumPost[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as AlbumPost);
      });
      setAlbumPosts(list);
    });

    return () => {
      unsubUsers();
      unsubSettings();
      unsubNotifications();
      unsubAlbums();
    };
  }, []);

  // Action: Approve/Reject/Delete user
  const handleUpdateUserStatus = async (userId: string, newStatus: "approved" | "rejected") => {
    try {
      const userRef = doc(db, "users", userId);
      try {
        await updateDoc(userRef, { status: newStatus });
        showToast("تم تحديث حالة العضو بنجاح! 🎉", "success");
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
        showToast("حدث خطأ في تحديث قاعدة البيانات.", "error");
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      showToast("تعذر تحديث حالة المستخدم. يرجى المحاولة لاحقاً.", "error");
    }
  };

  const handleDeleteUser = (userId: string) => {
    setDeleteTarget({
      type: "user",
      id: userId,
      title: "حذف المستخدم نهائياً",
      message: "هل أنت متأكد من حذف هذا المستخدم نهائياً من قاعدة البيانات؟"
    });
  };

  // Action: Save Camp Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccess("");

    try {
      const settingsRef = doc(db, "config", "camp_settings");
      try {
        await setDoc(settingsRef, {
          photoAlbumUrl: photoAlbumUrl.trim(),
          dailyProgram: dailyProgram.trim(),
          dietaryMenu: dietaryMenu.trim(),
          activities: activities.trim()
        });
        setSettingsSuccess("تم حفظ وتحديث الإعدادات بنجاح، وستنعكس فوراً لدى جميع الأهالي!");
        setTimeout(() => setSettingsSuccess(""), 4000);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "config/camp_settings");
        showToast("حدث خطأ أثناء حفظ الإعدادات.", "error");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      showToast("تعذر حفظ التغييرات.", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Action: Add/Edit Notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifBody.trim()) return;

    setIsSendingNotif(true);
    try {
      if (editingNotifId) {
        const notifRef = doc(db, "notifications", editingNotifId);
        try {
          await updateDoc(notifRef, {
            title: notifTitle.trim(),
            body: notifBody.trim()
          });
          showToast("تم تحديث وتعديل الإشعار بنجاح! 🔔", "success");
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `notifications/${editingNotifId}`);
          showToast("فشل تحديث الإشعار في قاعدة البيانات.", "error");
        }
        setEditingNotifId(null);
        setNotifTitle("");
        setNotifBody("");
      } else {
        const id = `notif_${Date.now()}`;
        const notifRef = doc(db, "notifications", id);
        try {
          await setDoc(notifRef, {
            id,
            title: notifTitle.trim(),
            body: notifBody.trim(),
            createdAt: Date.now()
          });
          showToast("تم إرسال ونشر الإشعار العاجل لجميع الأهالي بنجاح! 🔔", "success");
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `notifications/${id}`);
          showToast("فشل إرسال الإشعار في قاعدة البيانات.", "error");
        }
        setNotifTitle("");
        setNotifBody("");
      }
    } catch (error) {
      console.error("Error saving/sending notification:", error);
      showToast("حدث خطأ أثناء حفظ أو إرسال الإشعار.", "error");
    } finally {
      setIsSendingNotif(false);
    }
  };

  const handleStartEditNotification = (notif: CampNotification) => {
    setEditingNotifId(notif.id);
    setNotifTitle(notif.title);
    setNotifBody(notif.body);
  };

  const handleCancelEditNotification = () => {
    setEditingNotifId(null);
    setNotifTitle("");
    setNotifBody("");
  };

  const handleDeleteNotification = (notifId: string) => {
    setDeleteTarget({
      type: "notification",
      id: notifId,
      title: "حذف الإشعار",
      message: "هل تريد حذف هذا الإشعار؟"
    });
  };

  // Action: Create/Edit Album Post
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumName.trim() || !albumUrl.trim()) return;

    setIsCreatingAlbum(true);
    try {
      if (editingAlbumId) {
        const albumRef = doc(db, "album_posts", editingAlbumId);
        try {
          await updateDoc(albumRef, {
            albumName: albumName.trim(),
            albumUrl: albumUrl.trim()
          });
          showToast("تم تحديث وتعديل منشور الألبوم بنجاح! 📸", "success");
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `album_posts/${editingAlbumId}`);
          showToast("حدث خطأ في قاعدة البيانات.", "error");
        }
        setEditingAlbumId(null);
        setAlbumName("");
        setAlbumUrl("");
      } else {
        const id = `album_${Date.now()}`;
        const albumRef = doc(db, "album_posts", id);
        const newAlbum: AlbumPost = {
          id,
          albumName: albumName.trim(),
          albumUrl: albumUrl.trim(),
          createdAt: Date.now(),
          comments: []
        };
        try {
          await setDoc(albumRef, newAlbum);
          showToast("تم إنشاء المنشور وإضافته للتغذية التفاعلية بنجاح! 📸", "success");
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `album_posts/${id}`);
          showToast("حدث خطأ في قاعدة البيانات.", "error");
        }
        setAlbumName("");
        setAlbumUrl("");
      }
    } catch (error) {
      console.error("Error creating/saving album post:", error);
      showToast("حدث خطأ أثناء حفظ أو إنشاء منشور الألبوم.", "error");
    } finally {
      setIsCreatingAlbum(false);
    }
  };

  const handleStartEditAlbum = (post: AlbumPost) => {
    setEditingAlbumId(post.id);
    setAlbumName(post.albumName);
    setAlbumUrl(post.albumUrl);
  };

  const handleCancelEditAlbum = () => {
    setEditingAlbumId(null);
    setAlbumName("");
    setAlbumUrl("");
  };

  const handleDeleteAlbum = (albumId: string) => {
    setDeleteTarget({
      type: "album",
      id: albumId,
      title: "إزالة الألبوم",
      message: "هل تريد إزالة هذا الألبوم وحذف جميع تعليقاته نهائياً؟"
    });
  };

  // Action: Admin Comment / Reply on Album Posts
  const handleAdminComment = async (postId: string) => {
    const text = replyInputs[postId] || "";
    if (!text.trim()) return;

    setIsReplying(prev => ({ ...prev, [postId]: true }));
    try {
      const newComment: Comment = {
        id: `comment_${Date.now()}_admin`,
        parentName: "إدارة المخيم",
        childName: "",
        text: text.trim(),
        isPrivate: false,
        createdAt: Date.now()
      };

      const postRef = doc(db, "album_posts", postId);
      try {
        await updateDoc(postRef, {
          comments: arrayUnion(newComment)
        });
        showToast("تم إضافة تعليق الإدارة بنجاح! 💬", "success");
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `album_posts/${postId}`);
        showToast("فشل تحديث التعليق في قاعدة البيانات.", "error");
      }

      setReplyInputs(prev => ({ ...prev, [postId]: "" }));
    } catch (error) {
      console.error("Error sending admin comment:", error);
      showToast("حدث خطأ أثناء الإرسال.", "error");
    } finally {
      setIsReplying(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    setDeleteTarget({
      type: "comment",
      id: commentId,
      secondaryId: postId,
      title: "حذف تعليق",
      message: "هل أنت متأكد من رغبتك في حذف تعليق هذا العضو؟"
    });
  };

  const handleStartEditComment = (postId: string, comment: Comment) => {
    setEditingCommentPostId(postId);
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const handleSaveCommentEdit = async (postId: string, commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      const postRef = doc(db, "album_posts", postId);
      let postSnap;
      try {
        postSnap = await getDoc(postRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `album_posts/${postId}`);
        showToast("فشل جلب الألبوم من قاعدة البيانات.", "error");
        return;
      }
      if (postSnap.exists()) {
        const post = postSnap.data() as AlbumPost;
        const updatedComments = (post.comments || []).map(c => {
          if (c.id === commentId) {
            return { ...c, text: editingCommentText.trim() };
          }
          return c;
        });
        try {
          await updateDoc(postRef, { comments: updatedComments });
          showToast("تم تعديل التعليق بنجاح! ✏️", "success");
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `album_posts/${postId}`);
          showToast("فشل حفظ التعديل في قاعدة البيانات.", "error");
        }
        setEditingCommentPostId(null);
        setEditingCommentId(null);
        setEditingCommentText("");
      }
    } catch (error) {
      console.error("Error editing comment:", error);
      showToast("حدث خطأ أثناء تعديل التعليق.", "error");
    }
  };

  const handleCancelEditComment = () => {
    setEditingCommentPostId(null);
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  // Helper: counts pending users
  const pendingCount = allUsers.filter(u => u.status === "pending").length;

  return (
    <div className="min-h-screen bg-slate-100/50 flex flex-col font-sans text-slate-800">
      
      {/* Admin Top Banner / Navbar */}
      <header className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 p-0.5 shadow-lg shadow-amber-500/10 shrink-0 border border-slate-700/60">
            <img
              id="app-logo-admin"
              src={campLogo}
              alt="لوجو المخيم"
              className="w-full h-full rounded-lg object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-base font-black flex items-center gap-2">
              لوحة تحكم المشرفين
              <span className="bg-amber-500/20 text-amber-400 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30">إدارة المخيم</span>
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5">التحكم في العضويات والألبومات والبرامج في الوقت الفعلي</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 py-2 px-4 bg-slate-800 hover:bg-rose-900 hover:text-white text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700/60"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج المسؤول</span>
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* Navigation Sidebar/Header */}
        <nav className="bg-white border-b lg:border-b-0 lg:border-l border-slate-200/60 p-4 lg:w-64 shrink-0 flex flex-row lg:flex-col overflow-x-auto gap-2 lg:gap-1.5 scrollbar-thin">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 lg:w-full ${
              activeTab === "users"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>طلبات الانتساب</span>
            {pendingCount > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse mr-auto">
                {pendingCount} جديد
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 lg:w-full ${
              activeTab === "settings"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>إدارة المحتوى والبرامج</span>
          </button>

          <button
            onClick={() => setActiveTab("broadcast")}
            className={`flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 lg:w-full ${
              activeTab === "broadcast"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>مركز الإرسال والتعليمات</span>
          </button>

          <button
            onClick={() => setActiveTab("albums")}
            className={`flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 lg:w-full ${
              activeTab === "albums"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Image className="w-4 h-4" />
            <span>ألبومات الصور والمنشورات</span>
          </button>

          <button
            onClick={() => setActiveTab("comments")}
            className={`flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 lg:w-full ${
              activeTab === "comments"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>التعليقات والمتابعة الخاصة</span>
          </button>
        </nav>

        {/* Dynamic Screen Contents */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: USER APPROVALS */}
            {activeTab === "users" && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="space-y-6"
              >
                <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs">
                  <h3 className="text-base font-black text-slate-800">📋 طلبات الانتساب والعضويات</h3>
                  <p className="text-xs text-slate-400 mt-0.5">وافق على أولياء الأمور الجدد لتمكينهم من تصفح صور وبيانات المخيم.</p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200/50 overflow-hidden shadow-xs">
                  {allUsers.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm">لا يوجد مسجلين حتى الآن.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                          <tr>
                            <th className="px-6 py-4">ولي الأمر</th>
                            <th className="px-6 py-4">اسم الطالب</th>
                            <th className="px-6 py-4">الحالة</th>
                            <th className="px-6 py-4 text-center">التحكم والعمليات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                          {allUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-extrabold text-slate-800">{user.parentName}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{user.id}</div>
                              </td>
                              <td className="px-6 py-4 text-slate-800 font-semibold">{user.childName}</td>
                              <td className="px-6 py-4">
                                {user.status === "pending" && (
                                  <span className="bg-amber-100 text-amber-800 font-extrabold px-2.5 py-1 rounded-lg text-[10px]">قيد الانتظار</span>
                                )}
                                {user.status === "approved" && (
                                  <span className="bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-lg text-[10px]">تم القبول</span>
                                )}
                                {user.status === "rejected" && (
                                  <span className="bg-rose-100 text-rose-800 font-extrabold px-2.5 py-1 rounded-lg text-[10px]">مرفوض</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  {user.status !== "approved" && (
                                    <button
                                      onClick={() => handleUpdateUserStatus(user.id, "approved")}
                                      className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all cursor-pointer"
                                      title="موافقة وقبول الحساب"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                  )}
                                  {user.status !== "rejected" && (
                                    <button
                                      onClick={() => handleUpdateUserStatus(user.id, "rejected")}
                                      className="p-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-all cursor-pointer"
                                      title="رفض الطلب"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                                    title="حذف نهائي"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 2: CONTENT & PROGRAM MANAGER */}
            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="space-y-6"
              >
                <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs">
                  <h3 className="text-base font-black text-slate-800">⚙️ إدارة المحتوى والبرامج</h3>
                  <p className="text-xs text-slate-400 mt-0.5">حدث جداول الوجبات والأنشطة والرحلات بشكل فوري لجميع الأهالي دون الحاجة لتحديث الصفحة.</p>
                </div>

                {settingsSuccess && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold">
                    {settingsSuccess}
                  </div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-6">
                  
                  {/* Google Photos Main Album */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs space-y-2">
                    <label className="block text-xs font-black text-slate-700">رابط ألبوم صور جوجل الرئيسي (Google Photos)</label>
                    <input
                      type="url"
                      required
                      placeholder="https://photos.app.goo.gl/..."
                      value={photoAlbumUrl}
                      onChange={(e) => setPhotoAlbumUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                    />
                    <p className="text-[10px] text-slate-400">الرابط المستخدم في زر "ألبوم قوقل الرئيسي" بتبويب المعرض لدى الأولياء.</p>
                  </div>

                  {/* Daily Program Text Area */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-black text-slate-700">البرنامج اليومي الافتراضي للمخيم</label>
                      <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md">يدعم التنسيق الأسطري</span>
                    </div>
                    <textarea
                      rows={6}
                      required
                      placeholder="اكتب تفاصيل البرنامج وساعاته..."
                      value={dailyProgram}
                      onChange={(e) => setDailyProgram(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium leading-relaxed"
                    />
                    <p className="text-[10px] text-slate-400">ابدأ بـ 📅 **عنوان** في السطر الأول، واكتب الأسطر الأخرى منسقة لتتحول تلقائياً لبطاقات ملونة مريحة.</p>
                  </div>

                  {/* Dietary Weekly Menu */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs space-y-2">
                    <label className="block text-xs font-black text-slate-700">البرنامج الغذائي الأسبوعي (وجبات الطعام)</label>
                    <textarea
                      rows={6}
                      required
                      placeholder="اكتب قائمة الوجبات لكل يوم..."
                      value={dietaryMenu}
                      onChange={(e) => setDietaryMenu(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium leading-relaxed"
                    />
                    <p className="text-[10px] text-slate-400">يفضل البدء بـ 🍏 **البرنامج الغذائي**، ثم سرد أيام الأسبوع بالتفصيل.</p>
                  </div>

                  {/* Key Activities */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs space-y-2">
                    <label className="block text-xs font-black text-slate-700">أهم الأنشطة والرحلات المقررة</label>
                    <textarea
                      rows={6}
                      required
                      placeholder="اكتب فعاليات الأسبوع الكبرى والمفاجآت..."
                      value={activities}
                      onChange={(e) => setActivities(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSavingSettings ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Save className="w-4.5 h-4.5" />
                        <span>حفظ ونشر التعديلات الفورية</span>
                      </>
                    )}
                  </button>

                </form>
              </motion.div>
            )}

            {/* TAB 3: BROADCAST NOTIFICATIONS */}
            {activeTab === "broadcast" && (
              <motion.div
                key="broadcast"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="space-y-6"
              >
                <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs">
                  <h3 className="text-base font-black text-slate-800">📢 مركز البث والإشعارات العاجلة</h3>
                  <p className="text-xs text-slate-400 mt-0.5">أرسل تنبيهات فورية تظهر مباشرة في شاشات أولياء الأمور لتنبيههم بالقرارات الهامة.</p>
                </div>

                {/* Form to create notification */}
                <form onSubmit={handleSendNotification} className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-700 mb-2">
                    {editingNotifId ? "✍️ تعديل الإشعار المحدد" : "إنشاء وإرسال إشعار جديد"}
                  </h4>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500">عنوان الإشعار</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: تعليمات رحلة يوم غد وتغيير الحقائب 🎒"
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500">نص الإشعار التفصيلي</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="اكتب التوجيهات بالتفصيل هنا..."
                      value={notifBody}
                      onChange={(e) => setNotifBody(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium leading-relaxed"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isSendingNotif}
                      className="flex-1 py-3 px-6 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSendingNotif ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          {editingNotifId ? <Save className="w-4.5 h-4.5" /> : <Send className="w-4 h-4" />}
                          <span>{editingNotifId ? "حفظ التعديلات الحالية" : "بث الإشعار الآن"}</span>
                        </>
                      )}
                    </button>
                    {editingNotifId && (
                      <button
                        type="button"
                        onClick={handleCancelEditNotification}
                        className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>إلغاء التعديل</span>
                      </button>
                    )}
                  </div>
                </form>

                {/* History of broadcasts */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-800">سجل الإشعارات المرسلة السابقة</h4>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">لا توجد إشعارات مرسلة في السجل.</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {notifications.map((notif) => (
                        <div key={notif.id} className="p-4 rounded-2xl border border-slate-100 flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h5 className="text-xs font-extrabold text-slate-800">{notif.title}</h5>
                            <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">{notif.body}</p>
                            <span className="text-[9px] text-slate-400 font-mono block mt-1">
                              {new Date(notif.createdAt).toLocaleString("ar-EG")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditNotification(notif)}
                              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer"
                              title="تعديل الإشعار"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNotification(notif.id)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all shrink-0 cursor-pointer"
                              title="حذف الإشعار"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 4: GALLERY ALBUMS */}
            {activeTab === "albums" && (
              <motion.div
                key="albums"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="space-y-6"
              >
                <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs">
                  <h3 className="text-base font-black text-slate-800">📸 نشر وإدارة ألبومات الفعاليات</h3>
                  <p className="text-xs text-slate-400 mt-0.5">انشر ألبومات الصور وشارك الروابط الخارجية مثل صور Google ليتابعها الأهالي.</p>
                </div>

                {/* Create album form */}
                <form onSubmit={handleCreateAlbum} className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-700">
                    {editingAlbumId ? "✍️ تعديل منشور الألبوم المحدد" : "إضافة منشور ألبوم جديد"}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500">عنوان المنشور أو المناسبة</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: ورشة الروبوتات والعلوم الممتعة 🤖"
                        value={albumName}
                        onChange={(e) => setAlbumName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500">رابط الألبوم الخارجي (جوجل فوتو)</label>
                      <input
                        type="url"
                        required
                        placeholder="https://photos.app.goo.gl/..."
                        value={albumUrl}
                        onChange={(e) => setAlbumUrl(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isCreatingAlbum}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCreatingAlbum ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          {editingAlbumId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          <span>{editingAlbumId ? "حفظ التعديلات الحالية" : "نشر منشور الألبوم الجديد"}</span>
                        </>
                      )}
                    </button>
                    {editingAlbumId && (
                      <button
                        type="button"
                        onClick={handleCancelEditAlbum}
                        className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>إلغاء التعديل</span>
                      </button>
                    )}
                  </div>
                </form>

                {/* Published albums manager */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-800">الألبومات المنشورة الحالية</h4>
                  {albumPosts.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">لا توجد ألبومات معروضة.</p>
                  ) : (
                    <div className="space-y-3">
                      {albumPosts.map((post) => (
                        <div key={post.id} className="p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                          <div>
                            <h5 className="text-xs font-extrabold text-slate-800">{post.albumName}</h5>
                            <a
                              href={post.albumUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-amber-600 font-medium flex items-center gap-1 mt-1 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>رابط الألبوم المرفق</span>
                            </a>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleStartEditAlbum(post)}
                              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer"
                              title="تعديل الألبوم"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAlbum(post.id)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all cursor-pointer"
                              title="حذف نهائي"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 5: COMMENTS FEED & PRIVATE REPLIES */}
            {activeTab === "comments" && (
              <motion.div
                key="comments"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="space-y-6"
              >
                <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs">
                  <h3 className="text-base font-black text-slate-800">💬 مركز التعليقات والرسائل الخاصة الآمنة</h3>
                  <p className="text-xs text-slate-400 mt-0.5">استعرض كافة تعليقات الأهالي (بما فيها التعليقات الخاصة المغلقة) وقم بالرد عليها مباشرة لتوفير حلقة تواصل آمنة.</p>
                </div>

                {albumPosts.map((post) => {
                  const comments = post.comments || [];
                  if (comments.length === 0) return null;

                  return (
                    <div key={post.id} className="bg-white rounded-3xl border border-slate-200/50 shadow-xs p-5 space-y-4">
                      <div className="border-b border-slate-50 pb-3">
                        <h4 className="text-xs font-black text-slate-500">ألبوم الصور:</h4>
                        <h3 className="text-sm font-black text-slate-800 mt-0.5">{post.albumName}</h3>
                      </div>

                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {comments.map((comment) => (
                          <div
                            key={comment.id}
                            className={`p-3 rounded-2xl border text-xs flex flex-col gap-1.5 ${
                              comment.isPrivate
                                ? "bg-amber-50/60 border-amber-200/40"
                                : "bg-slate-50/50 border-slate-100"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-800">{comment.parentName}</span>
                                {comment.childName && (
                                  <span className="text-[9px] text-slate-400 font-extrabold">(ولي أمر {comment.childName})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {comment.isPrivate && (
                                  <span className="flex items-center gap-0.5 bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[8px]">
                                    <Lock className="w-2.5 h-2.5" />
                                    تعليق خاص بالإدارة
                                  </span>
                                )}
                                <span className="text-[9px] text-slate-400">
                                  {new Date(comment.createdAt).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditComment(post.id, comment)}
                                  className="text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                                  title="تعديل التعليق"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="حذف التعليق"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {editingCommentId === comment.id ? (
                              <div className="flex flex-col gap-2 mt-1">
                                <textarea
                                  value={editingCommentText}
                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-800 text-right"
                                  rows={2}
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveCommentEdit(post.id, comment.id)}
                                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Save className="w-3 h-3" />
                                    <span>حفظ</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditComment}
                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>إلغاء</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-slate-700 font-medium">{comment.text}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Admin response input */}
                      <div className="border-t border-slate-100 pt-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyInputs[post.id] || ""}
                            onChange={(e) => setReplyInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAdminComment(post.id);
                            }}
                            placeholder="اكتب رداً أو تعقيباً رسمياً للإدارة..."
                            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-800"
                          />
                          <button
                            onClick={() => handleAdminComment(post.id)}
                            disabled={isReplying[post.id]}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer text-xs font-bold shrink-0"
                          >
                            {isReplying[post.id] ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <span>إرسال تعليق</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {albumPosts.every(post => (post.comments || []).length === 0) && (
                  <div className="bg-white rounded-3xl p-12 text-center text-slate-400 text-sm border border-slate-200/50 shadow-xs">
                    لا توجد تعليقات أو رسائل مضافة من أولياء الأمور حالياً للمتابعة. 😊
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget.type && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDeleting) setDeleteTarget({ type: null, id: "", title: "", message: "" });
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            {/* Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 shadow-xl max-w-md w-full relative z-10 border border-slate-100 flex flex-col gap-4 text-right"
              dir="rtl"
            >
              <div className="flex items-center gap-3 text-amber-600 border-b border-slate-50 pb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-base font-black text-slate-800">{deleteTarget.title}</h3>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {deleteTarget.message}
              </p>
              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget({ type: null, id: "", title: "", message: "" })}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleExecuteDelete}
                  className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>تأكيد الحذف</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Toast Alerts */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-2xl shadow-lg border text-xs font-bold flex items-center gap-2.5 min-w-[300px] justify-between ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
            dir="rtl"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {toast.type === "success" ? "✨" : "⚠️"}
              </span>
              <p>{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="p-1 hover:bg-slate-200/50 rounded-lg transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
