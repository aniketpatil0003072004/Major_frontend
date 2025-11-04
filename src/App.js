import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { FaRegEye as EyeOpen } from "react-icons/fa";
import { FaRegEyeSlash as EyeClose } from "react-icons/fa";

const FIREBASE_URL = "https://exam-proctor-42c7f-default-rtdb.firebaseio.com/";

const GEMINI_API_KEY = "AIzaSyDiOkS6DK8PrYGKU_pYxQwGlIuyD9mGX-Q";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

const AuthContext = createContext();

const FirebaseAPI = {
  get: async (endpoint) => {
    try {
      const response = await fetch(`${FIREBASE_URL}${endpoint}.json`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data || {};
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      return {};
    }
  },

  post: async (endpoint, data) => {
    try {
      const response = await fetch(`${FIREBASE_URL}${endpoint}.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error posting to ${endpoint}:`, error);
      throw error;
    }
  },

  // Generic PUT request (for updates)
  put: async (endpoint, data) => {
    try {
      const response = await fetch(`${FIREBASE_URL}${endpoint}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error updating ${endpoint}:`, error);
      throw error;
    }
  },

  // Generic PATCH request (for partial updates)
  patch: async (endpoint, data) => {
    try {
      const response = await fetch(`${FIREBASE_URL}${endpoint}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error patching ${endpoint}:`, error);
      throw error;
    }
  },

  // Generic DELETE request
  delete: async (endpoint) => {
    try {
      const response = await fetch(`${FIREBASE_URL}${endpoint}.json`, {
        method: "DELETE",
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error deleting ${endpoint}:`, error);
      throw error;
    }
  },
};

// Database service functions
const DatabaseService = {
  // Users
  getUsers: () => FirebaseAPI.get("users"),
  addUser: (user) => FirebaseAPI.post("users", user),
  updateUser: (id, user) => FirebaseAPI.patch(`users/${id}`, user),

  // Departments
  getDepartments: () => FirebaseAPI.get("departments"),
  addDepartment: (department) => FirebaseAPI.post("departments", department),
  updateDepartment: (id, department) =>
    FirebaseAPI.patch(`departments/${id}`, department),

  // Classrooms
  getClassrooms: () => FirebaseAPI.get("classrooms"),
  addClassroom: (classroom) => FirebaseAPI.post("classrooms", classroom),
  updateClassroom: (id, classroom) =>
    FirebaseAPI.patch(`classrooms/${id}`, classroom),

  // Professors
  getProfessors: () => FirebaseAPI.get("professors"),
  addProfessor: (professor) => FirebaseAPI.post("professors", professor),
  updateProfessor: (id, professor) =>
    FirebaseAPI.patch(`professors/${id}`, professor),

  // Exam Slots
  getExamSlots: () => FirebaseAPI.get("examSlots"),
  addExamSlot: (slot) => FirebaseAPI.post("examSlots", slot),
  updateExamSlot: (id, slot) => FirebaseAPI.patch(`examSlots/${id}`, slot),

  // Professor Timetables
  getTimetables: () => FirebaseAPI.get("professorTimetables"),
  addTimetable: (timetable) =>
    FirebaseAPI.post("professorTimetables", timetable),
  updateTimetable: (id, timetable) =>
    FirebaseAPI.patch(`professorTimetables/${id}`, timetable),

  // Allocations
  getAllocations: () => FirebaseAPI.get("allocations"),
  addAllocation: (allocation) => FirebaseAPI.post("allocations", allocation),
  updateAllocation: (id, allocation) =>
    FirebaseAPI.patch(`allocations/${id}`, allocation),

  // Emergency Pool
  getEmergencyPool: () => FirebaseAPI.get("emergencyPool"),
  addToEmergencyPool: (entry) => FirebaseAPI.post("emergencyPool", entry),

  // Email Log
  getEmailLog: () => FirebaseAPI.get("emailLog"),
  addEmailLog: (email) => FirebaseAPI.post("emailLog", email),
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Mock Email Service with Firebase logging
const sendEmail = async (to, subject, body) => {
  const newEmail = {
    id: generateId(),
    to,
    subject,
    body,
    sent_at: new Date().toISOString(),
    status: "sent",
  };

  try {
    await DatabaseService.addEmailLog(newEmail);
    console.log(`📧 Email sent to ${to}: ${subject}`);
    return newEmail;
  } catch (error) {
    console.error("Error logging email:", error);
    return newEmail;
  }
};

// Convert Firebase object to array
const firebaseToArray = (firebaseData) => {
  if (!firebaseData) return [];
  return Object.keys(firebaseData).map((key) => ({
    firebaseId: key,
    ...firebaseData[key],
  }));
};

// Gemini AI Integration
const callGeminiAPI = async (prompt) => {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// Auth Provider
// Auth Provider - Fixed version
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true); // Add this state

  const logout = () => {
    setUser(null);
    localStorage.removeItem("currentUser");
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setInitializing(false); // Set initializing to false after checking localStorage
  }, []);

  const login = async (credentials, type) => {
    setLoading(true);
    try {
      if (type === "admin") {
        const users = await DatabaseService.getUsers();
        const userArray = firebaseToArray(users);
        const admin = userArray.find(
          (u) =>
            u.username === credentials.username &&
            u.password === credentials.password &&
            u.role === "admin"
        );

        if (admin) {
          const userData = {
            id: admin.id,
            role: "admin",
            name: admin.name,
            username: admin.username,
          };
          setUser(userData);
          localStorage.setItem("currentUser", JSON.stringify(userData));
          return { success: true };
        } else {
          return { success: false, error: "Invalid admin credentials" };
        }
      } else {
        const professors = await DatabaseService.getProfessors();
        const professorArray = firebaseToArray(professors);
        const professor = professorArray.find(
          (p) => p.token === credentials.token
        );

        if (professor) {
          const userData = {
            id: professor.id,
            role: "professor",
            name: professor.name,
            email: professor.email,
            department: professor.department,
            designation: professor.designation,
          };
          setUser(userData);
          localStorage.setItem("currentUser", JSON.stringify(userData));
          return { success: true };
        } else {
          return { success: false, error: "Invalid professor token" };
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Login failed" };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, initializing }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const Login = () => {
  const [loginType, setLoginType] = useState("admin");
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
    token: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, loading } = useContext(AuthContext);
  const [showPassword, SetShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const loginData =
      loginType === "admin"
        ? { username: credentials.username, password: credentials.password }
        : { token: credentials.token };

    const result = await login(loginData, loginType);

    if (result.success) {
      navigate(loginType === "admin" ? "/admin" : "/professor");
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Exam Proctor System
          </h1>
          <p className="text-gray-600">Smart Instant Allocation</p>
        </div>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setLoginType("admin")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              loginType === "admin"
                ? "bg-indigo-500 text-white shadow"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => setLoginType("professor")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              loginType === "professor"
                ? "bg-indigo-500 text-white shadow"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Professor
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loginType === "admin" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) =>
                    setCredentials({ ...credentials, username: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative ">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={credentials.password}
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        password: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <div className="absolute top-[50%] translate-y-[-50%] right-3">
                    {showPassword === false ? (
                      <EyeClose
                        className="cursor-pointer"
                        onClick={() => SetShowPassword(true)}
                      />
                    ) : (
                      <EyeOpen
                        className="cursor-pointer"
                        onClick={() => SetShowPassword(false)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Login Token
              </label>
              <input
                type="text"
                value={credentials.token}
                onChange={(e) =>
                  setCredentials({ ...credentials, token: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter token from your email"
                required
              />
              <div className="mt-2 text-xs text-gray-500">
                Try: cs_token_001, cs_token_002, math_token_001, phy_token_001,
                etc.
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-md transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* {loginType === 'admin' && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md text-xs text-gray-600">
            <p><strong>Demo Admin:</strong></p>
            <p>Username: admin</p>
            <p>Password: admin123</p>
          </div>
        )} */}
      </div>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [departments, setDepartments] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [examSlots, setExamSlots] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [emergencyPool, setEmergencyPool] = useState([]);
  const [emailLog, setEmailLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [forms, setForms] = useState({
    department: { name: "", description: "", classrooms_count: 1 },
    classroom: {
      name: "",
      department: "",
      floor: 1,
      room_number: "",
      capacity: 50,
      facilities: [],
    },
    professor: {
      name: "",
      email: "",
      designation: "Assistant Professor",
      department: "",
      phone: "",
    },
    examSlot: { day: "", date: "", subject: "" },
  });

  const loadData = async () => {
    try {
      const [
        deptData,
        classData,
        profData,
        slotData,
        allocData,
        poolData,
        emailData,
      ] = await Promise.all([
        DatabaseService.getDepartments(),
        DatabaseService.getClassrooms(),
        DatabaseService.getProfessors(),
        DatabaseService.getExamSlots(),
        DatabaseService.getAllocations(),
        DatabaseService.getEmergencyPool(),
        DatabaseService.getEmailLog(),
      ]);

      setDepartments(firebaseToArray(deptData));
      setClassrooms(firebaseToArray(classData));
      setProfessors(firebaseToArray(profData));
      setExamSlots(firebaseToArray(slotData));
      setAllocations(firebaseToArray(allocData));
      setEmergencyPool(firebaseToArray(poolData));
      setEmailLog(firebaseToArray(emailData));
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error loading data");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (type, e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newItem = {
        id: generateId(),
        ...forms[type],
        created_at: new Date().toISOString(),
      };

      // Add token for professors and send email
      if (type === "professor") {
        newItem.token = `${newItem.department
          .toLowerCase()
          .replace(" ", "_")}_token_${Date.now().toString().slice(-4)}`;

        // Send token email via backend server
        try {
          const res = await axios.post(
            "http://65.2.168.5:8080/send-mail",
            {
              message: `Dear ${newItem.name}, Your login token for the Exam Proctor System is: ${newItem.token} Please use this token to access your dashboard. Best regards...`,
              to: newItem.email,
            },
            {
              headers: {
                "Content-type": "application/json",
              },
            }
          );
          console.log(res.data);
        } catch (error) {
          console.error("Error sending email via backend:", error);
        }

        // Also log to Firebase
        await sendEmail(
          newItem.email,
          "Your Exam Proctor Login Token",
          `Dear ${newItem.name},\n\nYour login token for the Exam Proctor System is: ${newItem.token}\n\nPlease use this token to access your dashboard.\n\nBest regards,\nExam Proctor System`
        );
      }

      // Add day name for exam slots
      if (type === "examSlot") {
        const date = new Date(newItem.date);
        newItem.day = date.toLocaleDateString("en-US", { weekday: "long" });
      }

      // Check for duplicates
      if (
        type === "department" &&
        departments.some((d) => d.name === newItem.name)
      ) {
        toast.error("Department already exists!");
        setLoading(false);
        return;
      }

      // Save to Firebase
      let result;
      switch (type) {
        case "department":
          result = await DatabaseService.addDepartment(newItem);
          break;
        case "classroom":
          result = await DatabaseService.addClassroom(newItem);
          break;
        case "professor":
          result = await DatabaseService.addProfessor(newItem);
          break;
        case "examSlot":
          result = await DatabaseService.addExamSlot(newItem);
          break;
        default:
          throw new Error("Unknown type");
      }

      // Reset form
      setForms({
        ...forms,
        [type]:
          type === "department"
            ? { name: "", description: "", classrooms_count: 1 }
            : type === "classroom"
            ? {
                name: "",
                department: "",
                floor: 1,
                room_number: "",
                capacity: 50,
                facilities: [],
              }
            : type === "professor"
            ? {
                name: "",
                email: "",
                designation: "Assistant Professor",
                department: "",
                phone: "",
              }
            : { day: "", date: "", subject: "" },
      });

      await loadData();
      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`
      );
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Error adding item: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate classroom utilization
  const getClassroomUtilization = () => {
    const utilization = {};
    departments.forEach((dept) => {
      const deptClassrooms = classrooms.filter(
        (c) => c.department === dept.name
      );
      const deptAllocations = allocations.filter(
        (a) => a.classroom_department === dept.name
      );
      utilization[dept.name] = {
        total: deptClassrooms.length,
        used: new Set(deptAllocations.map((a) => a.classroom_id)).size,
        percentage:
          deptClassrooms.length > 0
            ? Math.round(
                (new Set(deptAllocations.map((a) => a.classroom_id)).size /
                  deptClassrooms.length) *
                  100
              )
            : 0,
      };
    });
    return utilization;
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "departments", label: "Departments", icon: "🏢" },
    { id: "classrooms", label: "Classrooms", icon: "🏛️" },
    { id: "professors", label: "Professors", icon: "👨‍🏫" },
    { id: "slots", label: "Exam Slots", icon: "📅" },
    { id: "results", label: "Results", icon: "✅" },
    { id: "emails", label: "Email Log", icon: "📧" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <div className="text-xs text-green-600">
                Firebase Backend • Real-time Instant AI Allocation
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 mb-8 bg-white rounded-lg p-1 shadow">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md font-medium transition text-sm ${
                activeTab === tab.id
                  ? "bg-indigo-500 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Departments
                </h3>
                <p className="text-3xl font-bold text-indigo-500">
                  {departments.length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Classrooms
                </h3>
                <p className="text-3xl font-bold text-green-500">
                  {classrooms.length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Professors
                </h3>
                <p className="text-3xl font-bold text-purple-500">
                  {professors.length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Allocations
                </h3>
                <p className="text-3xl font-bold text-orange-500">
                  {allocations.length}
                </p>
              </div>
            </div>

            {/* Classroom Utilization */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">
                Classroom Utilization by Department
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(getClassroomUtilization()).map(
                  ([dept, util]) => (
                    <div key={dept} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900">{dept}</h4>
                      <p className="text-sm text-gray-600">
                        {util.used}/{util.total} classrooms used
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${util.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {util.percentage}% utilization
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "slots" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Add Exam Slot</h2>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <strong>Simplified Slots:</strong> Only add Day, Date, and
                Subject. Professors select days for instant allocation.
              </div>
              <form onSubmit={(e) => handleSubmit("examSlot", e)}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={forms.examSlot.date}
                    onChange={(e) =>
                      setForms({
                        ...forms,
                        examSlot: { ...forms.examSlot, date: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={forms.examSlot.start_time}
                    onChange={(e) =>
                      setForms({
                        ...forms,
                        examSlot: {
                          ...forms.examSlot,
                          start_time: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={forms.examSlot.end_time}
                    onChange={(e) =>
                      setForms({
                        ...forms,
                        examSlot: {
                          ...forms.examSlot,
                          end_time: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={forms.examSlot.subject}
                    onChange={(e) =>
                      setForms({
                        ...forms,
                        examSlot: {
                          ...forms.examSlot,
                          subject: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Data Structures"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-md transition"
                >
                  Add Exam Slot
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">
                Exam Slots ({examSlots.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {examSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="border border-gray-200 rounded-md p-3 bg-green-50"
                  >
                    <h3 className="font-medium text-green-900">
                      {slot.subject}
                    </h3>
                    <p className="text-sm text-green-700">
                      {slot.day}, {slot.date}
                    </p>
                    <p className="text-sm text-green-700">
                      Start Time: {slot.start_time}, End Time: {slot.end_time}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "professors" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Add Professor</h2>
              <form onSubmit={(e) => handleSubmit("professor", e)}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={forms.professor.name}
                      onChange={(e) =>
                        setForms({
                          ...forms,
                          professor: {
                            ...forms.professor,
                            name: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={forms.professor.email}
                      onChange={(e) =>
                        setForms({
                          ...forms,
                          professor: {
                            ...forms.professor,
                            email: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Designation
                    </label>
                    <select
                      value={forms.professor.designation}
                      onChange={(e) =>
                        setForms({
                          ...forms,
                          professor: {
                            ...forms.professor,
                            designation: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Assistant Professor">
                        Assistant Professor
                      </option>
                      <option value="Associate Professor">
                        Associate Professor
                      </option>
                      <option value="Professor">Professor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={forms.professor.department}
                      onChange={(e) =>
                        setForms({
                          ...forms,
                          professor: {
                            ...forms.professor,
                            department: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-md transition"
                >
                  Add Professor (Auto-send token email)
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">
                Professors List ({professors.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {professors.map((prof) => (
                  <div
                    key={prof.id}
                    className="border border-gray-200 rounded-md p-3 bg-gradient-to-r from-purple-50 to-pink-50"
                  >
                    <h3 className="font-medium text-purple-900">{prof.name}</h3>
                    <p className="text-sm text-purple-700">
                      {prof.designation} - {prof.department}
                    </p>
                    <p className="text-sm text-purple-600">{prof.email}</p>
                    <p className="text-xs text-purple-500 mt-1 font-mono">
                      Token: {prof.token}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "results" && (
          <div className="space-y-6">
            {/* Allocation Results */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">
                Instant Allocation Results ({allocations.length})
              </h2>
              <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                <strong>Note:</strong> Allocations happen instantly when
                professors select exam days using AI.
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Professor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Day & Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Classroom
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allocations.map((allocation) => (
                      <tr key={allocation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {allocation.professor_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {allocation.professor_department}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {allocation.day}
                          <br />
                          {allocation.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {allocation.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {allocation.classroom_name}
                          <br />
                          <span className="text-xs text-gray-500">
                            Floor {allocation.floor}, Room{" "}
                            {allocation.room_number}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            {allocation.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Emergency Pool */}
            {emergencyPool.length > 0 && (
              <div className="bg-orange-50 p-6 rounded-lg shadow border border-orange-200">
                <h2 className="text-xl font-semibold mb-4 text-orange-800">
                  Emergency Pool ({emergencyPool.length})
                </h2>
                <div className="space-y-3">
                  {emergencyPool.map((prof, index) => (
                    <div
                      key={index}
                      className="bg-white p-3 rounded border border-orange-200"
                    >
                      <h3 className="font-medium text-orange-900">
                        {prof.professor_name}
                      </h3>
                      <p className="text-sm text-orange-700">
                        {prof.department} Department
                      </p>
                      <p className="text-xs text-orange-600">{prof.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "emails" && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              Email Activity Log ({emailLog.length})
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {emailLog.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No emails sent yet
                </p>
              ) : (
                emailLog
                  .slice()
                  .reverse()
                  .map((email) => (
                    <div
                      key={email.id}
                      className="border border-gray-200 rounded-md p-4 bg-blue-50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-blue-900">
                            {email.subject}
                          </h3>
                          <p className="text-sm text-blue-700">
                            To: {email.to}
                          </p>
                          <p className="text-xs text-blue-600 mt-2">
                            {new Date(email.sent_at).toLocaleString()}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          {email.status}
                        </span>
                      </div>
                      <div className="mt-2 p-2 bg-white rounded text-xs text-gray-600 font-mono">
                        {email.body.substring(0, 150)}...
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* Department and Classroom tabs similar to previous implementation */}
        {activeTab === "departments" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Add Department</h2>
              <form onSubmit={(e) => handleSubmit("department", e)}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={forms.department.name}
                    onChange={(e) =>
                      setForms({
                        ...forms,
                        department: {
                          ...forms.department,
                          name: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={forms.department.description}
                    onChange={(e) =>
                      setForms({
                        ...forms,
                        department: {
                          ...forms.department,
                          description: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Classrooms
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={forms.department.classrooms_count}
                    onChange={(e) =>
                      setForms({
                        ...forms,
                        department: {
                          ...forms.department,
                          classrooms_count: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-md transition"
                >
                  Add Department
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">
                Departments List ({departments.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50"
                  >
                    <h3 className="font-medium">{dept.name}</h3>
                    <p className="text-sm text-gray-600">
                      {dept.description || "No description"}
                    </p>
                    <p className="text-sm text-indigo-600">
                      {dept.classrooms_count} classrooms
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "classrooms" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Add Classroom</h2>
              <form onSubmit={(e) => handleSubmit("classroom", e)}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={forms.classroom.name}
                      onChange={(e) =>
                        setForms({
                          ...forms,
                          classroom: {
                            ...forms.classroom,
                            name: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., CS-101"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Room Number
                    </label>
                    <input
                      type="text"
                      value={forms.classroom.room_number}
                      onChange={(e) =>
                        setForms({
                          ...forms,
                          classroom: {
                            ...forms.classroom,
                            room_number: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., 101"
                      required
                    />
                  </div>
                  <div className="w-full">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      Capacity
                    </label>
                    <input
                      type="text"
                      value={forms.classroom.capacity}
                      onChange={(e) =>
                        setForms({
                          ...forms,
                          classroom: {
                            ...forms.classroom,
                            capacity: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., 50"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={forms.classroom.department}
                      onChange={(e) =>
                        setForms({
                          ...forms,
                          classroom: {
                            ...forms.classroom,
                            department: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Floor
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={forms.classroom.floor}
                      onChange={(e) =>
                        setForms({
                          ...forms,
                          classroom: {
                            ...forms.classroom,
                            floor: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-md transition"
                >
                  Add Classroom
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">
                Classrooms ({classrooms.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {departments.map((dept) => {
                  const deptClassrooms = classrooms.filter(
                    (c) => c.department === dept.name
                  );
                  if (deptClassrooms.length === 0) return null;

                  return (
                    <div
                      key={dept.id}
                      className="border border-gray-200 rounded-md p-3"
                    >
                      <h3 className="font-medium text-gray-900 mb-2">
                        {dept.name} Department
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {deptClassrooms.map((room) => (
                          <div
                            key={room.id}
                            className="text-sm bg-gray-50 p-2 rounded"
                          >
                            <div className="font-medium">{room.name}</div>
                            <div className="text-xs text-gray-600">
                              Floor {room.floor}, Room {room.room_number}
                            </div>
                            <div className="text-xs text-gray-600">
                              Capacity: {room.capacity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Professor Dashboard
const ProfessorDashboard = () => {
  const [examSlots, setExamSlots] = useState([]);
  const [myAllocations, setMyAllocations] = useState([]);
  const [myTimetable, setMyTimetable] = useState([]);
  const [emergencyPool, setEmergencyPool] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conflictModal, setConflictModal] = useState({
    show: false,
    day: "",
    conflicts: [],
  });
  const { logout, user } = useContext(AuthContext);

  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Timetable form state
  const [timetableForm, setTimetableForm] = useState({
    day: "",
    subject: "",
    start_time: "",
    end_time: "",
    semester: "",
  });

  const loadData = async () => {
    try {
      const [slotsData, allocationsData, timetablesData, poolData] =
        await Promise.all([
          DatabaseService.getExamSlots(),
          DatabaseService.getAllocations(),
          DatabaseService.getTimetables(),
          DatabaseService.getEmergencyPool(),
        ]);

      setExamSlots(firebaseToArray(slotsData));
      setEmergencyPool(firebaseToArray(poolData));

      const allAllocations = firebaseToArray(allocationsData);
      setMyAllocations(
        allAllocations.filter((alloc) => alloc.professor_id === user.id)
      );

      const allTimetables = firebaseToArray(timetablesData);
      setMyTimetable(allTimetables.filter((tt) => tt.professor_id === user.id));
    } catch (error) {
      console.error("Error loading professor data:", error);
      toast.error("Error loading data");
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const addToTimetable = async (e) => {
    e.preventDefault();
    try {
      const newEntry = {
        id: generateId(),
        professor_id: user.id,
        ...timetableForm,
        created_at: new Date().toISOString(),
      };

      await DatabaseService.addTimetable(newEntry);
      setTimetableForm({
        day: "",
        subject: "",
        start_time: "",
        end_time: "",
        semester: "",
      });
      await loadData();

      toast.success("Timetable entry added successfully!");
    } catch (error) {
      console.error("Error adding timetable entry:", error);
      toast.error("Error adding timetable entry");
    }
  };

  const checkConflicts = (selectedDay) => {
    const conflicts = myTimetable.filter((entry) => entry.day === selectedDay);
    return conflicts;
  };

  const handleDaySelection = async (selectedDay) => {
    setLoading(true);

    try {
      // Check for timetable conflicts
      const conflicts = checkConflicts(selectedDay);

      if (conflicts.length > 0) {
        setConflictModal({
          show: true,
          day: selectedDay,
          conflicts: conflicts,
        });
        setLoading(false);
        return;
      }

      // Proceed with immediate allocation
      await performInstantAllocation(selectedDay);
    } catch (error) {
      toast.error("Allocation failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const proceedWithAllocation = async () => {
    setConflictModal({ show: false, day: "", conflicts: [] });
    setLoading(true);
    await performInstantAllocation(conflictModal.day);
    setLoading(false);
  };

  //   const performInstantAllocation = async (selectedDay) => {
  //     try {
  //       // Get available exam slots for the selected day
  //       const daySlots = examSlots.filter((slot) => slot.day === selectedDay);

  //       if (daySlots.length === 0) {
  //         toast.error("No exam slots available for this day");
  //         return;
  //       }

  //       // Randomly select one exam slot
  //       const randomSlot = daySlots[Math.floor(Math.random() * daySlots.length)];

  //       // Get all classrooms and allocations from Firebase
  //       const [classroomsData, allocationsData] = await Promise.all([
  //         DatabaseService.getClassrooms(),
  //         DatabaseService.getAllocations(),
  //       ]);

  //       const allClassrooms = firebaseToArray(classroomsData);
  //       const allAllocations = firebaseToArray(allocationsData);

  //       // Find classrooms used on this day for this slot
  //       const usedClassroomsThisSlot = allAllocations
  //         .filter(
  //           (alloc) =>
  //             alloc.date === randomSlot.date &&
  //             alloc.subject === randomSlot.subject
  //         )
  //         .map((alloc) => alloc.classroom_id);

  //       // Prepare data for Gemini AI
  //       const prompt = `
  // You are an AI assistant for classroom allocation. A professor needs a classroom for exam proctoring.

  // PROFESSOR DETAILS:
  // - Name: ${user.name}
  // - Department: ${user.department}
  // - Designation: ${user.designation}

  // SELECTED EXAM SLOT:
  // - Day: ${selectedDay}
  // - Date: ${randomSlot.date}
  // - Subject: ${randomSlot.subject}

  // ALLOCATION RULES:
  // 1. First preference: Assign classroom from professor's own department (${
  //         user.department
  //       })
  // 2. If all department classrooms are used, assign from other departments
  // 3. Do not use classrooms already allocated for this slot

  // USED CLASSROOMS FOR THIS SLOT: ${JSON.stringify(usedClassroomsThisSlot)}

  // AVAILABLE CLASSROOMS:
  // ${JSON.stringify(allClassrooms)}

  // Please provide a JSON response with ONLY the classroom allocation:
  // {
  //   "allocated_classroom_id": "classroom_id",
  //   "success": true/false,
  //   "reason": "explanation if unsuccessful"
  // }
  // `;

  //       let selectedClassroom = null;

  //       try {
  //         const aiResponse = await callGeminiAPI(prompt);
  //         console.log("AI Response:", aiResponse);

  //         // Parse AI response
  //         const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  //         if (jsonMatch) {
  //           const result = JSON.parse(jsonMatch[0]);
  //           if (result.success && result.allocated_classroom_id) {
  //             selectedClassroom = allClassrooms.find(
  //               (c) => c.id === result.allocated_classroom_id
  //             );
  //           }
  //         }
  //       } catch (error) {
  //         console.error("AI allocation failed, using fallback:", error);
  //       }

  //       // Fallback allocation if AI fails
  //       if (!selectedClassroom) {
  //         // Get professor's department classrooms first
  //         const deptClassrooms = allClassrooms.filter(
  //           (c) => c.department === user.department
  //         );
  //         const availableDeptClassrooms = deptClassrooms.filter(
  //           (c) => !usedClassroomsThisSlot.includes(c.id)
  //         );

  //         if (availableDeptClassrooms.length > 0) {
  //           selectedClassroom = availableDeptClassrooms[0];
  //         } else {
  //           // Try other departments
  //           const otherClassrooms = allClassrooms.filter(
  //             (c) => c.department !== user.department
  //           );
  //           const availableOtherClassrooms = otherClassrooms.filter(
  //             (c) => !usedClassroomsThisSlot.includes(c.id)
  //           );

  //           if (availableOtherClassrooms.length > 0) {
  //             selectedClassroom = availableOtherClassrooms[0];
  //           }
  //         }
  //       }

  //       if (!selectedClassroom) {
  //         // Add to emergency pool in Firebase
  //         const emergencyEntry = {
  //           professor_id: user.id,
  //           professor_name: user.name,
  //           department: user.department,
  //           requested_day: selectedDay,
  //           exam_subject: randomSlot.subject,
  //           reason: "All classrooms are full for this exam slot",
  //           created_at: new Date().toISOString(),
  //         };

  //         await DatabaseService.addToEmergencyPool(emergencyEntry);
  //         toast.error(
  //           "All classrooms are full for this exam slot. You have been added to the emergency pool."
  //         );
  //         return;
  //       }

  //       // Create allocation
  //       const newAllocation = {
  //         id: generateId(),
  //         professor_id: user.id,
  //         professor_name: user.name,
  //         professor_department: user.department,
  //         slot_id: randomSlot.id,
  //         classroom_id: selectedClassroom.id,
  //         day: selectedDay,
  //         date: randomSlot.date,
  //         subject: randomSlot.subject,
  //         classroom_name: selectedClassroom.name,
  //         classroom_department: selectedClassroom.department,
  //         floor: selectedClassroom.floor,
  //         room_number: selectedClassroom.room_number,
  //         status: "assigned",
  //         created_at: new Date().toISOString(),
  //       };

  //       // Save allocation to Firebase
  //       await DatabaseService.addAllocation(newAllocation);

  //       // Send confirmation email
  //       const professorsData = await DatabaseService.getProfessors();
  //       const professorArray = firebaseToArray(professorsData);
  //       const professor = professorArray.find((p) => p.id === user.id);

  //       if (professor) {
  //         await sendEmail(
  //           professor.email,
  //           "Exam Proctoring Assignment Confirmation - INSTANT ALLOCATION",
  //           `Dear ${user.name},\n\nYou have been instantly allocated for exam proctoring:\n\n📅 Date: ${randomSlot.date} (${selectedDay})\n📚 Subject: ${randomSlot.subject}\n🏛️ Department: ${selectedClassroom.department}\n🏫 Classroom: ${selectedClassroom.name}\n🏢 Floor: ${selectedClassroom.floor}\n🚪 Room Number: ${selectedClassroom.room_number}\n\n✅ Status: CONFIRMED\n\nPlease be present 15 minutes before the exam starts.\n\nThis allocation was processed instantly using AI.\n\nBest regards,\nExam Proctor System`
  //         );
  //       }

  //       await loadData();
  //       toast.success(
  //         `🎉 Allocation successful!\n\nClassroom: ${selectedClassroom.name}\nSubject: ${randomSlot.subject}\nDate: ${randomSlot.date}\n\nConfirmation email sent!`
  //       );
  //     } catch (error) {
  //       console.error("Allocation error:", error);
  //       toast.error("Allocation failed: " + error.message);
  //     }
  //   };

  const performInstantAllocation = async (selectedDay) => {
    try {
      // CHECK IF PROFESSOR ALREADY HAS AN ALLOCATION ON THIS DAY
      const existingAllocationOnDay = myAllocations.find(
        (alloc) => alloc.day === selectedDay
      );

      if (existingAllocationOnDay) {
        toast.error(
          `You already have an allocation on ${selectedDay}!\n\nClassroom: ${existingAllocationOnDay.classroom_name}\nSubject: ${existingAllocationOnDay.subject}\nDate: ${existingAllocationOnDay.date}\n\nYou cannot select another classroom on the same day.`,
          {
            duration: 5000,
          }
        );
        return;
      }

      // Get available exam slots for the selected day
      const daySlots = examSlots.filter((slot) => slot.day === selectedDay);

      if (daySlots.length === 0) {
        toast.error("No exam slots available for this day");
        return;
      }

      // Randomly select one exam slot
      const randomSlot = daySlots[Math.floor(Math.random() * daySlots.length)];

      // Get all classrooms and allocations from Firebase
      const [
        classroomsData,
        allocationsData,
        emergencyPoolData,
        professorsData,
      ] = await Promise.all([
        DatabaseService.getClassrooms(),
        DatabaseService.getAllocations(),
        DatabaseService.getEmergencyPool(),
        DatabaseService.getProfessors(),
      ]);

      const allClassrooms = firebaseToArray(classroomsData);
      const allAllocations = firebaseToArray(allocationsData);
      const allEmergencyPool = firebaseToArray(emergencyPoolData);
      const allProfessors = firebaseToArray(professorsData);

      // Get current professor's phone number
      const currentProfessor = allProfessors.find((p) => p.id === user.id);
      const professorPhone = currentProfessor?.phone || "N/A";

      // CHECK: Find ALL classrooms used on this ENTIRE DAY (not just this slot)
      const usedClassroomsOnThisDay = allAllocations
        .filter((alloc) => alloc.day === selectedDay)
        .map((alloc) => alloc.classroom_id);

      // Get available classrooms for the entire day
      const availableClassroomsForDay = allClassrooms.filter(
        (c) => !usedClassroomsOnThisDay.includes(c.id)
      );

      // If NO classrooms available for the entire day, add to emergency pool
      if (availableClassroomsForDay.length === 0) {
        // CHECK IF PROFESSOR IS ALREADY IN EMERGENCY POOL
        const alreadyInPool = allEmergencyPool.find(
          (entry) =>
            entry.professor_id === user.id && entry.status === "waiting"
        );

        if (alreadyInPool) {
          toast.error(
            `⚠️ Already in Emergency Pool!\n\nYou are already in the emergency pool for:\n📅 ${alreadyInPool.requested_day}\n📚 ${alreadyInPool.exam_subject}\n\nPlease wait for admin to contact you. You cannot request multiple emergency allocations.`,
            {
              duration: 6000,
            }
          );
          return;
        }

        const emergencyEntry = {
          id: generateId(),
          professor_id: user.id,
          professor_name: user.name,
          department: user.department,
          designation: user.designation,
          email: user.email,
          phone: professorPhone,
          requested_day: selectedDay,
          requested_date: randomSlot.date,
          exam_subject: randomSlot.subject,
          slot_id: randomSlot.id,
          reason: `All classrooms are occupied by other professors on ${selectedDay}. No vacant rooms available.`,
          status: "waiting",
          created_at: new Date().toISOString(),
        };

        await DatabaseService.addToEmergencyPool(emergencyEntry);
        await loadData();

        toast.error(
          `⚠️ All Classrooms Occupied!\n\nAll classrooms are already allocated to other professors on ${selectedDay}.\n\nYou have been added to the emergency pool. Admin will contact you soon at ${professorPhone}.`,
          {
            duration: 6000,
          }
        );
        return;
      }

      // Now check for the specific exam slot
      const usedClassroomsThisSlot = allAllocations
        .filter(
          (alloc) =>
            alloc.date === randomSlot.date &&
            alloc.subject === randomSlot.subject
        )
        .map((alloc) => alloc.classroom_id);

      let selectedClassroom = null;

      // First try: Professor's own department classrooms
      const deptClassrooms = allClassrooms.filter(
        (c) => c.department === user.department
      );
      const availableDeptClassrooms = deptClassrooms.filter(
        (c) =>
          !usedClassroomsThisSlot.includes(c.id) &&
          !usedClassroomsOnThisDay.includes(c.id)
      );

      if (availableDeptClassrooms.length > 0) {
        selectedClassroom = availableDeptClassrooms[0];
      } else {
        // Second try: Other departments' classrooms
        const otherClassrooms = allClassrooms.filter(
          (c) => c.department !== user.department
        );
        const availableOtherClassrooms = otherClassrooms.filter(
          (c) =>
            !usedClassroomsThisSlot.includes(c.id) &&
            !usedClassroomsOnThisDay.includes(c.id)
        );

        if (availableOtherClassrooms.length > 0) {
          selectedClassroom = availableOtherClassrooms[0];
        }
      }

      if (!selectedClassroom) {
        // CHECK IF PROFESSOR IS ALREADY IN EMERGENCY POOL
        const alreadyInPool = allEmergencyPool.find(
          (entry) =>
            entry.professor_id === user.id && entry.status === "waiting"
        );

        if (alreadyInPool) {
          toast.error(
            `⚠️ Already in Emergency Pool!\n\nYou are already in the emergency pool for:\n📅 ${alreadyInPool.requested_day}\n📚 ${alreadyInPool.exam_subject}\n\nPlease wait for admin to contact you. You cannot request multiple emergency allocations.`,
            {
              duration: 6000,
            }
          );
          return;
        }

        // Add to emergency pool - classroom conflict for this specific slot
        const emergencyEntry = {
          id: generateId(),
          professor_id: user.id,
          professor_name: user.name,
          department: user.department,
          designation: user.designation,
          email: user.email,
          phone: professorPhone,
          requested_day: selectedDay,
          requested_date: randomSlot.date,
          exam_subject: randomSlot.subject,
          slot_id: randomSlot.id,
          reason: `All classrooms are full for the exam slot: ${randomSlot.subject} on ${randomSlot.date}`,
          status: "waiting",
          created_at: new Date().toISOString(),
        };

        await DatabaseService.addToEmergencyPool(emergencyEntry);
        await loadData();

        toast.error(
          `⚠️ Exam Slot Full!\n\nAll classrooms are occupied for ${randomSlot.subject} exam on ${randomSlot.date}.\n\nYou have been added to the emergency pool. Admin will contact you at ${professorPhone}.`,
          {
            duration: 5000,
          }
        );
        return;
      }

      // Create allocation
      const newAllocation = {
        id: generateId(),
        professor_id: user.id,
        professor_name: user.name,
        professor_department: user.department,
        slot_id: randomSlot.id,
        classroom_id: selectedClassroom.id,
        day: selectedDay,
        date: randomSlot.date,
        subject: randomSlot.subject,
        classroom_name: selectedClassroom.name,
        classroom_department: selectedClassroom.department,
        floor: selectedClassroom.floor,
        room_number: selectedClassroom.room_number,
        status: "assigned",
        created_at: new Date().toISOString(),
      };

      // Save allocation to Firebase
      await DatabaseService.addAllocation(newAllocation);

      // Send confirmation email
      const professor = allProfessors.find((p) => p.id === user.id);

      if (professor) {
        await sendEmail(
          professor.email,
          "Exam Proctoring Assignment Confirmation - INSTANT ALLOCATION",
          `Dear ${user.name},\n\nYou have been instantly allocated for exam proctoring:\n\n📅 Date: ${randomSlot.date} (${selectedDay})\n📚 Subject: ${randomSlot.subject}\n🏛️ Department: ${selectedClassroom.department}\n🏫 Classroom: ${selectedClassroom.name}\n🏢 Floor: ${selectedClassroom.floor}\n🚪 Room Number: ${selectedClassroom.room_number}\n\n✅ Status: CONFIRMED\n\nPlease be present 15 minutes before the exam starts.\n\nBest regards,\nExam Proctor System`
        );
      }

      await loadData();
      toast.success(
        `🎉 Allocation successful!\n\nClassroom: ${selectedClassroom.name}\nSubject: ${randomSlot.subject}\nDate: ${randomSlot.date}\n\nConfirmation email sent!`
      );
    } catch (error) {
      console.error("Allocation error:", error);
      toast.error("Allocation failed: " + error.message);
    }
  };

  //  // Get unique days from exam slots
  const getAvailableDays = () => {
    const days = [...new Set(examSlots.map((slot) => slot.day))];
    return days.sort();
  };

  const requiredSlots = user.designation === "Assistant Professor" ? 8 : 4;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Professor Dashboard
              </h1>
              <p className="text-gray-600">
                {user.name} - {user.designation}
              </p>
              <div className="text-xs text-green-600">
                Firebase Backend • Real-time AI Allocation • Timetable Conflict
                Detection
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Instant Day Selection */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              🚀 Instant Exam Day Selection
            </h2>

            {/* Required Slots Info */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium text-indigo-900 mb-2">
                Your Requirements
              </h3>
              <p className="text-sm text-indigo-700">
                As a {user.designation}, you need{" "}
                <span className="font-bold">{requiredSlots} slots</span>
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                Current allocations: {myAllocations.length}/{requiredSlots}
              </p>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <strong>How it works:</strong> Select a day and get instant
              AI-powered classroom allocation with Firebase backend!
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 mb-2">
                Available Exam Days
              </h3>
              {getAvailableDays().map((day) => {
                const hasAllocation = myAllocations.some(
                  (alloc) => alloc.day === day
                );

                return (
                  <button
                    key={day}
                    onClick={() => handleDaySelection(day)}
                    disabled={loading || hasAllocation}
                    className={`w-full text-left p-3 border rounded-md transition ${
                      hasAllocation
                        ? "bg-green-100 border-green-300 cursor-not-allowed opacity-60"
                        : "border-gray-200 hover:bg-blue-50 hover:border-blue-300"
                    } disabled:opacity-50`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{day}</div>
                        <div className="text-sm text-gray-600">
                          {examSlots.filter((s) => s.day === day).length}{" "}
                          exam(s) available
                        </div>
                      </div>
                      {hasAllocation && (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                          ✓ Allocated
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* My Timetable */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              📅 My Teaching Timetable
            </h2>

            {/* Add Timetable Entry */}
            <form
              onSubmit={addToTimetable}
              className="mb-4 p-3 bg-gray-50 rounded-lg"
            >
              <h3 className="font-medium text-gray-700 mb-2">
                Add Class Schedule
              </h3>
              <div className="space-y-2">
                <select
                  value={timetableForm.day}
                  onChange={(e) =>
                    setTimetableForm({ ...timetableForm, day: e.target.value })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  required
                >
                  <option value="">Select Day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                </select>
                <input
                  type="text"
                  placeholder="Subject"
                  value={timetableForm.subject}
                  onChange={(e) =>
                    setTimetableForm({
                      ...timetableForm,
                      subject: e.target.value,
                    })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={timetableForm.start_time}
                    onChange={(e) =>
                      setTimetableForm({
                        ...timetableForm,
                        start_time: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    required
                  />
                  <input
                    type="time"
                    value={timetableForm.end_time}
                    onChange={(e) =>
                      setTimetableForm({
                        ...timetableForm,
                        end_time: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Semester"
                  value={timetableForm.semester}
                  onChange={(e) =>
                    setTimetableForm({
                      ...timetableForm,
                      semester: e.target.value,
                    })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded text-sm transition"
                >
                  Add to Timetable
                </button>
              </div>
            </form>

            {/* Timetable Display */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {myTimetable.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm">
                  No timetable entries yet
                </p>
              ) : (
                myTimetable.map((entry) => (
                  <div
                    key={entry.id}
                    className="border border-gray-200 rounded-md p-2 text-sm"
                  >
                    <div className="font-medium">
                      {entry.day} - {entry.subject}
                    </div>
                    <div className="text-xs text-gray-600">
                      {entry.start_time} - {entry.end_time}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.semester} Semester
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* My Allocations */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              ✅ My Exam Assignments
            </h2>
            <div className="space-y-3">
              {myAllocations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No assignments yet
                </p>
              ) : (
                myAllocations.map((allocation) => (
                  <div
                    key={allocation.id}
                    className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-500 p-3 rounded"
                  >
                    <h3 className="font-medium text-green-900">
                      {allocation.subject}
                    </h3>
                    <p className="text-sm text-green-700">
                      {allocation.day}, {allocation.date}
                    </p>
                    <p className="text-xs text-green-600">
                      {allocation.classroom_name} (
                      {allocation.classroom_department})
                    </p>
                    <p className="text-xs text-green-600">
                      Floor {allocation.floor}, Room {allocation.room_number}
                    </p>
                    <div className="mt-1">
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        {allocation.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {myAllocations.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium">
                    {myAllocations.length}/{requiredSlots} slots
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${(myAllocations.length / requiredSlots) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}

            {emergencyPool.length > 0 && (
              <div className="bg-orange-50 p-6 rounded-lg shadow border border-orange-200">
                <h2 className="text-xl font-semibold mb-4 text-orange-800">
                  Emergency Pool ({emergencyPool.length})
                </h2>
                <div className="space-y-3">
                  {emergencyPool.map((prof, index) => (
                    <div
                      key={index}
                      className="bg-white p-3 rounded border border-orange-200"
                    >
                      <h3 className="font-medium text-orange-900">
                        {prof.professor_name}
                      </h3>
                      <p className="text-sm text-orange-700">
                        {prof.department} Department
                      </p>
                      <p className="text-xs text-orange-600">{prof.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Available Exam Slots Display */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            📚 Available Exam Slots
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examSlots.map((slot) => (
              <div
                key={slot.id}
                className="border border-gray-200 rounded-md p-4 bg-gradient-to-r from-blue-50 to-indigo-50"
              >
                <h3 className="font-medium text-blue-900">{slot.subject}</h3>
                <p className="text-sm text-blue-700">{slot.day}</p>
                <p className="text-sm text-blue-600">{slot.date}</p>
                <p className="text-sm text-blue-600">
                  Start Time: {slot.start_time} End Time: {slot.end_time}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conflict Modal */}
      {conflictModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-red-800 mb-4">
              ⚠️ Schedule Conflict Detected
            </h3>
            <p className="text-gray-700 mb-4">
              You have existing classes on <strong>{conflictModal.day}</strong>:
            </p>
            <div className="space-y-2 mb-4">
              {conflictModal.conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="bg-red-50 border border-red-200 p-2 rounded text-sm"
                >
                  <div className="font-medium">{conflict.subject}</div>
                  <div className="text-red-600">
                    {conflict.start_time} - {conflict.end_time}
                  </div>
                  <div className="text-red-500 text-xs">
                    {conflict.semester} Semester
                  </div>
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Do you still want to continue with exam proctoring on this day, or
              select another day?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={proceedWithAllocation}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded transition"
              >
                Continue Anyway
              </button>
              <button
                onClick={() =>
                  setConflictModal({ show: false, day: "", conflicts: [] })
                }
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition"
              >
                Select Another Day
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-gray-700">
              🤖 AI is finding the best classroom for you...
            </p>
            {/* <p className="text-xs text-gray-500 mt-2">Firebase Backend Processing</p> */}
          </div>
        </div>
      )}
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, initializing } = useContext(AuthContext);

  // Show loading spinner while initializing (checking localStorage)
  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <Navigate to={user.role === "admin" ? "/admin" : "/professor"} replace />
    );
  }

  return children;
};
// Main App Component
function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/professor"
              element={
                <ProtectedRoute requiredRole="professor">
                  <ProfessorDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <Toaster />
    </div>
  );
}

export default App;
