const firebase = require('firebase/app');
require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDlmeAqQ8CQ_i_-wTwSLpsK4FMwVT2x930",
    authDomain: "letrassantuario.firebaseapp.com",
    projectId: "letrassantuario",
    storageBucket: "letrassantuario.firebasestorage.app",
    messagingSenderId: "204414230548",
    appId: "1:204414230548:web:3a79751c65b77619444701"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

db.collection('letras_app').doc('workspace').get()
    .then(doc => {
        console.log("Success! Document exists:", doc.exists);
        process.exit(0);
    })
    .catch(err => {
        console.error("Firestore Error:", err.message);
        process.exit(1);
    });
