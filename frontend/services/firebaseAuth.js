// config/firebase.js
import { Platform } from "react-native";
import { initializeApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCTPLZb9RQNhLi5ZDWqJ7PUCDLVxW8KuD4",
  authDomain: "projectuee-ccb28.firebaseapp.com",
  projectId: "projectuee-ccb28",
  storageBucket: "projectuee-ccb28.appspot.com",   // ✅ fix domain
  messagingSenderId: "349588286177",
  appId: "1:349588286177:web:9e50b2fec7c3e12e07e5a0",
};

let app;
let authfirebase;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);

  if (Platform.OS === "web") {
    // ✅ Web fallback (don’t use AsyncStorage)
    authfirebase = getAuth(app);
  } else {
    // ✅ Native (Android/iOS) persistence
    authfirebase = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} else {
  authfirebase = getAuth();
}

export default authfirebase;
