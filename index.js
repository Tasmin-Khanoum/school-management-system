const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// ===== Configuration =====
const JWT_SECRET = "your-secret-key-change-in-production";
const SALT_ROUNDS = 10;

// ===== Middleware =====
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "frontend")));

// ===== MongoDB Connection (Fixed for Mongoose 9.x) =====
mongoose.connect(
  "mongodb+srv://tasminkhanoum62_db_user:Kk43OicObk2mfpAT@cluster0.p1w1e5c.mongodb.net/studentdb"
)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Error:", err));

// ===== Schemas & Models =====

// User Schema (for login)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin', 'teacher', 'student'], default: 'admin' },
  fullName: String,
  avatar: String,
  createdAt: { type: Date, default: Date.now }
});

// Student Schema
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  age: { type: Number, required: true },
  grade: { type: String, enum: ['A', 'B', 'C', 'D'], default: 'B' },
  course: { type: String, required: true },
  enrollDate: { type: Date, default: Date.now },
  parentName: String,
  parentContact: String,
  address: String,
  city: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  studentId: String,
  avatar: String
}, { timestamps: true });

// Teacher Schema
const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  subject: { type: String, required: true },
  qualification: String,
  experience: Number,
  salary: Number,
  joinDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  teacherId: String,
  avatar: String
}, { timestamps: true });

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  studentName: String,
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], required: true },
  remarks: String
}, { timestamps: true });

// Finance Schema
const financeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  studentName: String,
  amount: { type: Number, required: true },
  type: { type: String, enum: ['fee', 'fine', 'other'], default: 'fee' },
  status: { type: String, enum: ['paid', 'pending', 'overdue'], default: 'pending' },
  dueDate: Date,
  paidDate: Date,
  remarks: String
}, { timestamps: true });

// Create Models
const User = mongoose.model("User", userSchema);
const Student = mongoose.model("Student", studentSchema);
const Teacher = mongoose.model("Teacher", teacherSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);
const Finance = mongoose.model("Finance", financeSchema);

// ===== Middleware: Auth =====
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
};

// ===== Routes =====

// Serve main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "login.html"));
});

// ===== AUTH ROUTES =====

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, email, fullName, role } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }
    
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    const user = new User({
      username,
      password: hashedPassword,
      email,
      fullName,
      role: role || 'admin'
    });
    
    await user.save();
    res.status(201).json({ message: "User registered successfully", userId: user._id });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "Invalid username or password" });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid username or password" });
    }
    
    const token = jwt.sign(
      { _id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Get current user
app.get("/api/user", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ===== STUDENT ROUTES =====

app.get("/api/students", authenticateToken, async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

app.get("/api/students/:id", authenticateToken, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch student" });
  }
});

app.post("/api/students", authenticateToken, async (req, res) => {
  try {
    const student = new Student(req.body);
    
    await student.save();
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ error: "Failed to create student" });
  }
});

app.put("/api/students/:id", authenticateToken, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (error) {
    res.status(400).json({ error: "Failed to update student" });
  }
});

app.delete("/api/students/:id", authenticateToken, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete student" });
  }
});

// ===== TEACHER ROUTES =====

app.get("/api/teachers", authenticateToken, async (req, res) => {
  try {
    const teachers = await Teacher.find().sort({ createdAt: -1 });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
});

app.post("/api/teachers", authenticateToken, async (req, res) => {
  try {
    const teacherCount = await Teacher.countDocuments();
    const teacherId = `TCH${String(teacherCount + 1).padStart(4, '0')}`;
    
    const teacher = new Teacher({
      ...req.body,
      teacherId
    });
    
    await teacher.save();
    res.status(201).json(teacher);
  } catch (error) {
    res.status(400).json({ error: "Failed to create teacher" });
  }
});

app.put("/api/teachers/:id", authenticateToken, async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });
    res.json(teacher);
  } catch (error) {
    res.status(400).json({ error: "Failed to update teacher" });
  }
});

app.delete("/api/teachers/:id", authenticateToken, async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });
    res.json({ message: "Teacher deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete teacher" });
  }
});

// ===== ATTENDANCE & FINANCE ROUTES =====

app.get("/api/attendance", authenticateToken, async (req, res) => {
  try {
    const attendance = await Attendance.find().populate('studentId').sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

app.post("/api/attendance", authenticateToken, async (req, res) => {
  try {
    const attendance = new Attendance(req.body);
    await attendance.save();
    res.status(201).json(attendance);
  } catch (error) {
    res.status(400).json({ error: "Failed to mark attendance" });
  }
});

app.get("/api/finance", authenticateToken, async (req, res) => {
  try {
    const finance = await Finance.find().populate('studentId').sort({ createdAt: -1 });
    res.json(finance);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch finance records" });
  }
});

app.post("/api/finance", authenticateToken, async (req, res) => {
  try {
    const finance = new Finance(req.body);
    await finance.save();
    res.status(201).json(finance);
  } catch (error) {
    res.status(400).json({ error: "Failed to create finance record" });
  }
});

// ===== STATISTICS =====

app.get("/api/stats", authenticateToken, async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments({ status: 'active' });
    const totalTeachers = await Teacher.countDocuments({ status: 'active' });
    
    const paidFees = await Finance.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = paidFees[0]?.total || 0;
    
    res.json({
      totalStudents,
      totalTeachers,
      totalRevenue,
      attendanceRate: 0
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// ===== Initialize Admin =====
async function initializeDefaultAdmin() {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
      const admin = new User({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@school.com',
        fullName: 'System Administrator',
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Default admin created (username: admin, password: admin123)');
    }
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

// ===== Start Server =====
const PORT = 3000;
app.listen(PORT, async () => {
  setTimeout(() => initializeDefaultAdmin(), 2000);
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   🎓TASMIN School Management System                        ║
║   Server: http://localhost:${PORT}                      ║
║   Login: http://localhost:${PORT}                       ║
║   Username: admin  |  Password: admin123             ║
╚═══════════════════════════════════════════════════════╝
  `);
});