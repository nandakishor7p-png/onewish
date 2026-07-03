// ============================================
// 🔧 STEP 1: Paste your Firebase config here.
// Get this from: Firebase Console → Project Settings → General → Your apps → Web app
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyBko3RVSuGnUvtINmKlN8LGdXitXXMMdCg",
  authDomain: "onewish-8d962.firebaseapp.com",
  projectId: "onewish-8d962",
  storageBucket: "onewish-8d962.firebasestorage.app",
  messagingSenderId: "262540539182",
  appId: "1:262540539182:web:ef3d01ea24d92bbf0576bf"
};

// ============================================
// 🔧 STEP 2: Paste your reCAPTCHA v3 site key here (from App Check setup)
// ============================================
const RECAPTCHA_SITE_KEY = "6Ld_jUItAAAAAP51FErCG2G12u2KknDu1eYTL0HV";

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Initialize App Check — this is what actually blocks bots
const appCheck = firebase.appCheck();
appCheck.activate(RECAPTCHA_SITE_KEY, true); // true = auto-refresh token

// ============================================
// AUTH: Google sign-in
// ============================================
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  return auth.signInWithPopup(provider);
}

// ============================================
// AUTH: Email link sign-in (passwordless, no forced Google)
// ============================================
function sendEmailLink(email) {
  const actionCodeSettings = {
    url: window.location.href, // comes back to this same page
    handleCodeInApp: true
  };
  return auth.sendSignInLinkToEmail(email, actionCodeSettings).then(() => {
    window.localStorage.setItem('emailForSignIn', email);
  });
}

function checkEmailLinkSignIn() {
  if (auth.isSignInWithEmailLink(window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('Confirm your email to finish signing in:');
    }
    return auth.signInWithEmailLink(email, window.location.href).then(() => {
      window.localStorage.removeItem('emailForSignIn');
      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    });
  }
  return Promise.resolve(null);
}

// ============================================
// FIRESTORE: Submit a wish
// ============================================
function generateOrderCode() {
  const rand = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OW-${rand()}-${rand()}`;
}

function submitWish({ category, wishText, quotedPrice, igHandle }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be signed in to submit a wish.");

  const orderCode = generateOrderCode();

  return db.collection('wishes').add({
    orderCode,
    userId: user.uid,
    userEmail: user.email,
    igHandle,
    category,
    wishText,
    quotedPrice,
    status: "pending_quote", // admin will move this forward manually for now
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => orderCode);
}

// ============================================
// FIRESTORE: Get a user's own wishes (for their "my wishes" view later)
// ============================================
function getMyWishes() {
  const user = auth.currentUser;
  if (!user) return Promise.resolve([]);
  return db.collection('wishes')
    .where('userId', '==', user.uid)
    .orderBy('createdAt', 'desc')
    .get()
    .then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));
}
