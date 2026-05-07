importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCrXIaNF3B_HAJmFFW4CF-8O_jKBry7i1I",
  authDomain: "kgwsw01.firebaseapp.com",
  projectId: "kgwsw01",
  storageBucket: "kgwsw01.firebasestorage.app",
  messagingSenderId: "625437682471",
  appId: "1:625437682471:web:d27d07043a506cd68ed702"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    tag: 'dorm-reminder'
  });
});
