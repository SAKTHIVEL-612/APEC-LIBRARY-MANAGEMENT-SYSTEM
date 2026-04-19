import express from "express";
import { createServer as createHttpServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import cron from "node-cron";
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

// Import the Firebase configuration
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase SDK for backend tasks
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const PORT = 3000;

  // Ensure uploads directory exists
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  // Multer configuration
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({ storage: storage });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join-room", (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room: ${room}`);
    });

    socket.on("new-request", (data) => {
      io.to("admin").emit("notification", {
        type: "request",
        message: `New book request from ${data.userName}`,
        data: data,
      });
    });

    socket.on("request-status-update", (data) => {
      io.to(data.userUid).emit("notification", {
        type: "status_update",
        message: `Your request for "${data.bookTitle}" has been ${data.status}`,
        data: data,
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // File upload endpoint
  app.post("/api/upload", upload.single('cover'), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const filePath = `/uploads/${req.file.filename}`;
    res.json({ url: filePath });
  });

  // Serve static files from uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Automated Due Date Reminders (Daily at 00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily due date reminder task...');
    try {
      const transactionsSnap = await getDocs(query(collection(db, 'transactions'), where('status', '==', 'issued')));
      const today = new Date();
      const reminderDays = 3; // Configurable reminder threshold

      for (const transDoc of transactionsSnap.docs) {
        const trans = transDoc.data();
        const dueDate = trans.dueDate.toDate();
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= reminderDays && diffDays >= 0) {
          // Send notification to user
          await addDoc(collection(db, 'notifications'), {
            userUid: trans.userUid,
            message: `Reminder: Your book "${trans.bookTitle}" is due in ${diffDays} days (${dueDate.toLocaleDateString()}).`,
            type: 'reminder',
            isRead: false,
            createdAt: new Date(),
          });

          // Send notification to admin
          await addDoc(collection(db, 'notifications'), {
            userUid: 'admin',
            message: `Overdue Alert: "${trans.bookTitle}" borrowed by ${trans.userName} is due soon.`,
            type: 'reminder',
            isRead: false,
            createdAt: new Date(),
          });

          // Emit real-time notification if user/admin is connected
          io.to(trans.userUid).emit("notification", {
            type: "reminder",
            message: `Your book "${trans.bookTitle}" is due soon.`,
          });
          io.to("admin").emit("notification", {
            type: "reminder",
            message: `Book "${trans.bookTitle}" borrowed by ${trans.userName} is due soon.`,
          });
        }
      }
    } catch (error) {
      console.error('Error in cron task:', error);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
