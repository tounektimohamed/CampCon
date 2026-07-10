import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  collection, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { CampSettings, AlbumPost, CampNotification } from "./types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const firebaseConfig = {
  projectId: "zoom-3c767",
  appId: "1:481214437178:web:11ee29d7bce73f65412203",
  apiKey: "AIzaSyDo8Qb_svD9e3lQUo1FL_MabzLrcDabdc8",
  authDomain: "zoom-3c767.firebaseapp.com",
  storageBucket: "zoom-3c767.appspot.com",
  messagingSenderId: "481214437178"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the named database ID
const db = getFirestore(app, "ai-studio-e5a36237-62c8-4d39-8f94-51d1c56f1089");

// Helper to seed default data if config doesn't exist
export async function seedDefaultDataIfNeeded() {
  try {
    const configDocRef = doc(db, "config", "camp_settings");
    let docSnap;
    try {
      docSnap = await getDoc(configDocRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "config/camp_settings");
      return;
    }
    
    if (!docSnap.exists()) {
      // Seed default settings
      const defaultSettings: CampSettings = {
        photoAlbumUrl: "https://photos.google.com",
        dailyProgram: `📅 **البرنامج اليومي المعتاد:**\n\n• **08:30 - 09:00** | الاستقبال والتحضير والنشاط الصباحي المبتكر ☀️\n• **09:00 - 10:30** | ورشة عمل العلوم والبرمجة والذكاء الاصطناعي 💻\n• **10:30 - 11:00** | استراحة وتناول وجبة خفيفة وصحية 🍎\n• **11:00 - 12:30** | الأنشطة الرياضية والألعاب الحركية المشوقة ⚽\n• **12:30 - 01:30** | ورشة الفنون اليدوية والرسم الإبداعي والخط العربي 🎨\n• **01:30 - 02:00** | وجبة الغداء والأنشطة الختامية ومغادرة الطلاب 🚌`,
        dietaryMenu: `🍏 **البرنامج الغذائي المتكامل لهذا الأسبوع:**\n\n• **الأحد:** معكرونة بصلصة الطماطم الغنية والجبن الموزاريلا + شرائح تفاح طازجة + عصير طبيعي 🍝\n• **الإثنين:** شطائر الدجاج المشوي الصحية بالمايونيز الخفيف + شرائح الخيار المقرمش + كوب حليب دافئ 🥪\n• **الثلاثاء:** أرز بسمتي بالخضار الملونة وصدر الدجاج المطهو على البخار + موزة + ماء نقي 🍛\n• **الأربعاء:** فطائر مخبوزة بالجبن الأبيض والعسل الطبيعي + طماطم كرزية + عصير برتقال طازج 🥞\n• **الخميس:** بيتزا منزلية الصنع غنية بالخضار الطازجة وزيتون أسود + فواكه مشكلة + كوب حليب 🍕`,
        activities: `🚀 **أهم الأنشطة والفعاليات الكبرى المقررة:**\n\n1. **الرحلة الاستكشافية الكبرى (يوم الثلاثاء):** زيارة متحف العلوم والتكنولوجيا والتجارب التفاعلية الرائعة 🏛️\n2. **يوم التحديات والمغامرات الرياضية (يوم الإثنين):** مسابقات الجري، الحبل التفاعلي، وألعاب بناء الروح القيادية 🏆\n3. **مسابقة الرماية والفروسية المصغرة:** تدريبات آمنة وتثقيفية وتوزيع أوسمة الشجاعة والالتزام 🏹\n4. **المعرض الفني الختامي (يوم الخميس):** فرصة للأهالي لمشاهدة واقتناء الأعمال اليدوية التي أنتجها الأطفال خلال الأسبوع 🎨\n5. **الحفل الموسيقي والمشاهد التمسرحية:** عروض أداء جماعية من أطفال المخيم تبرز مواهبهم الكامنة 🌟`
      };
      
      try {
        await setDoc(configDocRef, defaultSettings);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "config/camp_settings");
      }
      
      // Seed default admin secret
      const adminSecretRef = doc(db, "config", "admin_secret");
      try {
        await setDoc(adminSecretRef, { secret: "sahbirahma" });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "config/admin_secret");
      }
      
      // Seed an initial notification
      const initialNotificationRef = doc(db, "notifications", "init_notif");
      const initNotif: CampNotification = {
        id: "init_notif",
        title: "مرحباً بكم في مخيم Camp Connect الصيفي! 🎉",
        body: "نحن سعداء جداً بانضمام أطفالكم إلينا. تم إطلاق هذه المنصة لتبقوا على اطلاع دائم بجميع الأنشطة، والوجبات الغذائية، والبرامج اليومية، إضافة إلى ألبومات الصور والتعليقات المباشرة مع إدارة المخيم. نتمنى لأطفالنا أسبوعاً حافلاً بالمعرفة والمرح!",
        createdAt: Date.now()
      };
      try {
        await setDoc(initialNotificationRef, initNotif);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "notifications/init_notif");
      }

      // Seed an initial photo album
      const initialAlbumRef = doc(db, "album_posts", "init_album");
      const initAlbum: AlbumPost = {
        id: "init_album",
        albumName: "ألبوم صور الأسبوع الأول - ورش العمل الفنية والتقنية 🎨💻",
        albumUrl: "https://photos.google.com",
        createdAt: Date.now() - 3600000, // 1 hour ago
        comments: [
          {
            id: "comment_1",
            parentName: "إدارة المخيم",
            childName: "",
            text: "سعدنا جداً بتفاعل الطلاب المبدع في ورشة العمل الأولى اليوم!",
            isPrivate: false,
            createdAt: Date.now() - 3000000
          },
          {
            id: "comment_2",
            parentName: "محمد الأحمد",
            childName: "أحمد محمد الأحمد",
            text: "شكراً جزيلاً لجهودكم الرائعة، ابني متحمس جداً للمخيم يومياً!",
            isPrivate: false,
            createdAt: Date.now() - 2000000
          },
          {
            id: "comment_3",
            parentName: "سحر الوديع",
            childName: "سارة سحر الوديع",
            text: "هل يمكنني الاستفسار عن تفاصيل رحلة يوم الثلاثاء بشكل خاص؟",
            isPrivate: true,
            createdAt: Date.now() - 1000000
          }
        ]
      };
      try {
        await setDoc(initialAlbumRef, initAlbum);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "album_posts/init_album");
      }
    }
  } catch (error) {
    console.error("Error seeding default data:", error);
  }
}

export { db };
