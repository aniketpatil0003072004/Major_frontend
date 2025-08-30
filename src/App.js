import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";

// ⚠️ Security Warning: API key is exposed in frontend code
// In production, use Firebase Functions or serverless backend
const GEMINI_API_KEY = "AIzaSyApWnqtylnOGz1DDU4DfCv2rnpRKTvmGxI";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

// Auth Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Data Storage Utilities
const StorageKeys = {
  USERS: 'examProctor_users',
  DEPARTMENTS: 'examProctor_departments',
  CLASSROOMS: 'examProctor_classrooms',
  PROFESSORS: 'examProctor_professors',
  EXAM_SLOTS: 'examProctor_examSlots',
  PROFESSOR_TIMETABLES: 'examProctor_professorTimetables',
  ALLOCATIONS: 'examProctor_allocations',
  EMERGENCY_POOL: 'examProctor_emergencyPool',
  EMAIL_LOG: 'examProctor_emailLog'
};

const getFromStorage = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return [];
  }
};

const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Mock Email Service
const sendEmail = (to, subject, body) => {
  const emailLog = getFromStorage(StorageKeys.EMAIL_LOG);
  const newEmail = {
    id: generateId(),
    to,
    subject,
    body,
    sent_at: new Date().toISOString(),
    status: 'sent'
  };
  emailLog.push(newEmail);
  saveToStorage(StorageKeys.EMAIL_LOG, emailLog);
  console.log(`📧 Email sent to ${to}: ${subject}`);
  return newEmail;
};

// Initialize default data
const initializeDefaultData = () => {
  // Admin user
  const users = getFromStorage(StorageKeys.USERS);
  if (users.length === 0) {
    saveToStorage(StorageKeys.USERS, [{
      id: 'admin_001',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      name: 'System Administrator'
    }]);
  }

  // Sample departments
  const departments = getFromStorage(StorageKeys.DEPARTMENTS);
  if (departments.length === 0) {
    saveToStorage(StorageKeys.DEPARTMENTS, [
      { id: 'dept_001', name: 'Computer Science', description: 'Department of Computer Science and Engineering', classrooms_count: 9, created_at: new Date().toISOString() },
      { id: 'dept_002', name: 'Mathematics', description: 'Department of Mathematics', classrooms_count: 6, created_at: new Date().toISOString() },
      { id: 'dept_003', name: 'Physics', description: 'Department of Physics', classrooms_count: 5, created_at: new Date().toISOString() },
      { id: 'dept_004', name: 'Chemistry', description: 'Department of Chemistry', classrooms_count: 7, created_at: new Date().toISOString() }
    ]);
  }

  // Sample classrooms with floor and room numbers
  const classrooms = getFromStorage(StorageKeys.CLASSROOMS);
  if (classrooms.length === 0) {
    const rooms = [
      // Computer Science - 9 classrooms
      { id: 'room_001', name: 'CS-101', department: 'Computer Science', floor: 1, room_number: '101', capacity: 60, facilities: ['Projector', 'AC', 'Computers'] },
      { id: 'room_002', name: 'CS-102', department: 'Computer Science', floor: 1, room_number: '102', capacity: 50, facilities: ['Projector', 'AC'] },
      { id: 'room_003', name: 'CS-201', department: 'Computer Science', floor: 2, room_number: '201', capacity: 45, facilities: ['Smart Board'] },
      { id: 'room_004', name: 'CS-202', department: 'Computer Science', floor: 2, room_number: '202', capacity: 40, facilities: ['Projector'] },
      { id: 'room_005', name: 'CS-203', department: 'Computer Science', floor: 2, room_number: '203', capacity: 55, facilities: ['Lab Equipment'] },
      { id: 'room_006', name: 'CS-301', department: 'Computer Science', floor: 3, room_number: '301', capacity: 35, facilities: ['AC'] },
      { id: 'room_007', name: 'CS-302', department: 'Computer Science', floor: 3, room_number: '302', capacity: 50, facilities: ['Projector', 'AC'] },
      { id: 'room_008', name: 'CS-303', department: 'Computer Science', floor: 3, room_number: '303', capacity: 42, facilities: ['Smart Board'] },
      { id: 'room_009', name: 'CS-Lab', department: 'Computer Science', floor: 1, room_number: '150', capacity: 30, facilities: ['Computers', 'Projector'] },
      
      // Mathematics - 6 classrooms
      { id: 'room_010', name: 'M-101', department: 'Mathematics', floor: 1, room_number: '101', capacity: 40, facilities: ['Whiteboard'] },
      { id: 'room_011', name: 'M-102', department: 'Mathematics', floor: 1, room_number: '102', capacity: 35, facilities: ['Projector'] },
      { id: 'room_012', name: 'M-201', department: 'Mathematics', floor: 2, room_number: '201', capacity: 50, facilities: ['Smart Board'] },
      { id: 'room_013', name: 'M-202', department: 'Mathematics', floor: 2, room_number: '202', capacity: 45, facilities: ['AC', 'Whiteboard'] },
      { id: 'room_014', name: 'M-301', department: 'Mathematics', floor: 3, room_number: '301', capacity: 38, facilities: ['Projector'] },
      { id: 'room_015', name: 'M-302', department: 'Mathematics', floor: 3, room_number: '302', capacity: 42, facilities: ['AC'] },
      
      // Physics - 5 classrooms
      { id: 'room_016', name: 'P-101', department: 'Physics', floor: 1, room_number: '101', capacity: 45, facilities: ['Lab Equipment'] },
      { id: 'room_017', name: 'P-201', department: 'Physics', floor: 2, room_number: '201', capacity: 40, facilities: ['Projector', 'Lab Setup'] },
      { id: 'room_018', name: 'P-202', department: 'Physics', floor: 2, room_number: '202', capacity: 35, facilities: ['AC'] },
      { id: 'room_019', name: 'P-301', department: 'Physics', floor: 3, room_number: '301', capacity: 50, facilities: ['Smart Board'] },
      { id: 'room_020', name: 'P-Lab', department: 'Physics', floor: 1, room_number: '150', capacity: 25, facilities: ['Lab Equipment', 'Fume Hood'] },
      
      // Chemistry - 7 classrooms
      { id: 'room_021', name: 'C-101', department: 'Chemistry', floor: 1, room_number: '101', capacity: 40, facilities: ['Fume Hood'] },
      { id: 'room_022', name: 'C-102', department: 'Chemistry', floor: 1, room_number: '102', capacity: 35, facilities: ['Lab Equipment'] },
      { id: 'room_023', name: 'C-201', department: 'Chemistry', floor: 2, room_number: '201', capacity: 45, facilities: ['Projector'] },
      { id: 'room_024', name: 'C-202', department: 'Chemistry', floor: 2, room_number: '202', capacity: 42, facilities: ['AC', 'Fume Hood'] },
      { id: 'room_025', name: 'C-301', department: 'Chemistry', floor: 3, room_number: '301', capacity: 38, facilities: ['Smart Board'] },
      { id: 'room_026', name: 'C-302', department: 'Chemistry', floor: 3, room_number: '302', capacity: 50, facilities: ['Lab Equipment'] },
      { id: 'room_027', name: 'C-Lab', department: 'Chemistry', floor: 1, room_number: '150', capacity: 28, facilities: ['Lab Equipment', 'Fume Hood', 'Safety Shower'] }
    ];
    
    rooms.forEach(room => {
      room.created_at = new Date().toISOString();
    });
    
    saveToStorage(StorageKeys.CLASSROOMS, rooms);
  }

  // Sample professors with email addresses
  const professors = getFromStorage(StorageKeys.PROFESSORS);
  if (professors.length === 0) {
    const profs = [
      { id: 'prof_001', name: 'Dr. John Smith', email: 'john.smith@university.edu', designation: 'Assistant Professor', department: 'Computer Science', phone: '123-456-7890', token: 'cs_token_001' },
      { id: 'prof_002', name: 'Dr. Sarah Johnson', email: 'sarah.johnson@university.edu', designation: 'Associate Professor', department: 'Computer Science', phone: '123-456-7891', token: 'cs_token_002' },
      { id: 'prof_003', name: 'Dr. Michael Brown', email: 'michael.brown@university.edu', designation: 'Professor', department: 'Mathematics', phone: '123-456-7892', token: 'math_token_001' },
      { id: 'prof_004', name: 'Dr. Emily Davis', email: 'emily.davis@university.edu', designation: 'Assistant Professor', department: 'Physics', phone: '123-456-7893', token: 'phy_token_001' },
      { id: 'prof_005', name: 'Dr. Robert Wilson', email: 'robert.wilson@university.edu', designation: 'Associate Professor', department: 'Chemistry', phone: '123-456-7894', token: 'chem_token_001' },
      { id: 'prof_006', name: 'Dr. Lisa Anderson', email: 'lisa.anderson@university.edu', designation: 'Assistant Professor', department: 'Computer Science', phone: '123-456-7895', token: 'cs_token_003' },
      { id: 'prof_007', name: 'Dr. David Martinez', email: 'david.martinez@university.edu', designation: 'Professor', department: 'Mathematics', phone: '123-456-7896', token: 'math_token_002' },
      { id: 'prof_008', name: 'Dr. Jennifer Taylor', email: 'jennifer.taylor@university.edu', designation: 'Assistant Professor', department: 'Physics', phone: '123-456-7897', token: 'phy_token_002' }
    ];
    
    profs.forEach(prof => {
      prof.created_at = new Date().toISOString();
      // Send login token email
      sendEmail(prof.email, 'Your Exam Proctor Login Token', 
        `Dear ${prof.name},\n\nYour login token for the Exam Proctor System is: ${prof.token}\n\nPlease use this token to access your dashboard.\n\nBest regards,\nExam Proctor System`);
    });
    
    saveToStorage(StorageKeys.PROFESSORS, profs);
  }

  // Sample exam slots - simplified (only day, date, subject)
  const examSlots = getFromStorage(StorageKeys.EXAM_SLOTS);
  if (examSlots.length === 0) {
    const today = new Date();
    const subjects = [
      'Data Structures', 'Database Management', 'Operating Systems', 'Computer Networks',
      'Calculus I', 'Linear Algebra', 'Statistics', 'Discrete Mathematics',
      'Quantum Physics', 'Thermodynamics', 'Mechanics', 'Electronics',
      'Organic Chemistry', 'Physical Chemistry', 'Analytical Chemistry', 'Biochemistry'
    ];
    
    const slots = [];
    for (let i = 1; i <= 20; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      slots.push({
        id: `slot_${i.toString().padStart(3, '0')}`,
        day: dayName,
        date: date.toISOString().split('T')[0],
        subject: subjects[Math.floor(Math.random() * subjects.length)],
        created_at: new Date().toISOString()
      });
    }
    saveToStorage(StorageKeys.EXAM_SLOTS, slots);
  }
};

// Gemini AI Integration
const callGeminiAPI = async (prompt) => {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeDefaultData();
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (credentials, type) => {
    setLoading(true);
    try {
      if (type === 'admin') {
        const users = getFromStorage(StorageKeys.USERS);
        const admin = users.find(u => u.username === credentials.username && u.password === credentials.password && u.role === 'admin');
        
        if (admin) {
          const userData = { id: admin.id, role: 'admin', name: admin.name, username: admin.username };
          setUser(userData);
          localStorage.setItem('currentUser', JSON.stringify(userData));
          return { success: true };
        } else {
          return { success: false, error: 'Invalid admin credentials' };
        }
      } else {
        const professors = getFromStorage(StorageKeys.PROFESSORS);
        const professor = professors.find(p => p.token === credentials.token);
        
        if (professor) {
          const userData = { 
            id: professor.id, 
            role: 'professor', 
            name: professor.name, 
            email: professor.email,
            department: professor.department,
            designation: professor.designation
          };
          setUser(userData);
          localStorage.setItem('currentUser', JSON.stringify(userData));
          return { success: true };
        } else {
          return { success: false, error: 'Invalid professor token' };
        }
      }
    } catch (error) {
      return { success: false, error: 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const Login = () => {
  const [loginType, setLoginType] = useState('admin');
  const [credentials, setCredentials] = useState({ username: '', password: '', token: '' });
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const loginData = loginType === 'admin' 
      ? { username: credentials.username, password: credentials.password }
      : { token: credentials.token };

    const result = await login(loginData, loginType);
    
    if (result.success) {
      navigate(loginType === 'admin' ? '/admin' : '/professor');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Exam Proctor System</h1>
          <p className="text-gray-600">Smart Instant Allocation</p>
          <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
            ⚠️ Frontend Demo • Instant AI allocation active
          </div>
        </div>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setLoginType('admin')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              loginType === 'admin'
                ? 'bg-indigo-500 text-white shadow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => setLoginType('professor')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              loginType === 'professor'
                ? 'bg-indigo-500 text-white shadow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Professor
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loginType === 'admin' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Login Token</label>
              <input
                type="text"
                value={credentials.token}
                onChange={(e) => setCredentials({...credentials, token: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter token from your email"
                required
              />
              <div className="mt-2 text-xs text-gray-500">
                Try: cs_token_001, cs_token_002, math_token_001, phy_token_001, etc.
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
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {loginType === 'admin' && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md text-xs text-gray-600">
            <p><strong>Demo Admin:</strong></p>
            <p>Username: admin</p>
            <p>Password: admin123</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [departments, setDepartments] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [examSlots, setExamSlots] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [emergencyPool, setEmergencyPool] = useState([]);
  const [emailLog, setEmailLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();

  const [forms, setForms] = useState({
    department: { name: '', description: '', classrooms_count: 1 },
    classroom: { name: '', department: '', floor: 1, room_number: '', capacity: 50, facilities: [] },
    professor: { name: '', email: '', designation: 'Assistant Professor', department: '', phone: '' },
    examSlot: { day: '', date: '', subject: '' }
  });

  const loadData = () => {
    setDepartments(getFromStorage(StorageKeys.DEPARTMENTS));
    setClassrooms(getFromStorage(StorageKeys.CLASSROOMS));
    setProfessors(getFromStorage(StorageKeys.PROFESSORS));
    setExamSlots(getFromStorage(StorageKeys.EXAM_SLOTS));
    setAllocations(getFromStorage(StorageKeys.ALLOCATIONS));
    setEmergencyPool(getFromStorage(StorageKeys.EMERGENCY_POOL));
    setEmailLog(getFromStorage(StorageKeys.EMAIL_LOG));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = (type, e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const newItem = {
        id: generateId(),
        ...forms[type],
        created_at: new Date().toISOString()
      };

      // Add token for professors and send email
      if (type === 'professor') {
        newItem.token = `${newItem.department.toLowerCase().replace(' ', '_')}_token_${Date.now().toString().slice(-4)}`;
        
        // Send token email
        sendEmail(newItem.email, 'Your Exam Proctor Login Token', 
          `Dear ${newItem.name},\n\nYour login token for the Exam Proctor System is: ${newItem.token}\n\nPlease use this token to access your dashboard.\n\nBest regards,\nExam Proctor System`);
      }

      // Add day name for exam slots
      if (type === 'examSlot') {
        const date = new Date(newItem.date);
        newItem.day = date.toLocaleDateString('en-US', { weekday: 'long' });
      }

      const storageKey = StorageKeys[type.toUpperCase() + 'S'] || StorageKeys[type.toUpperCase()];
      const currentData = getFromStorage(storageKey);
      
      // Check for duplicates
      if (type === 'department' && currentData.some(d => d.name === newItem.name)) {
        alert('Department already exists!');
        setLoading(false);
        return;
      }

      currentData.push(newItem);
      saveToStorage(storageKey, currentData);

      // Reset form
      setForms({
        ...forms,
        [type]: type === 'department' ? { name: '', description: '', classrooms_count: 1 } :
                type === 'classroom' ? { name: '', department: '', floor: 1, room_number: '', capacity: 50, facilities: [] } :
                type === 'professor' ? { name: '', email: '', designation: 'Assistant Professor', department: '', phone: '' } :
                { day: '', date: '', subject: '' }
      });

      loadData();
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`);
    } catch (error) {
      alert('Error adding item: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate classroom utilization
  const getClassroomUtilization = () => {
    const utilization = {};
    departments.forEach(dept => {
      const deptClassrooms = classrooms.filter(c => c.department === dept.name);
      const deptAllocations = allocations.filter(a => a.classroom_department === dept.name);
      utilization[dept.name] = {
        total: deptClassrooms.length,
        used: new Set(deptAllocations.map(a => a.classroom_id)).size,
        percentage: deptClassrooms.length > 0 ? Math.round((new Set(deptAllocations.map(a => a.classroom_id)).size / deptClassrooms.length) * 100) : 0
      };
    });
    return utilization;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'departments', label: 'Departments', icon: '🏢' },
    { id: 'classrooms', label: 'Classrooms', icon: '🏛️' },
    { id: 'professors', label: 'Professors', icon: '👨‍🏫' },
    { id: 'slots', label: 'Exam Slots', icon: '📅' },
    { id: 'results', label: 'Results', icon: '✅' },
    { id: 'emails', label: 'Email Log', icon: '📧' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <div className="text-xs text-orange-600">Simplified System • Instant AI Allocation</div>
            </div>
            <button
              onClick={logout}
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
                  ? 'bg-indigo-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Departments</h3>
                <p className="text-3xl font-bold text-indigo-500">{departments.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Classrooms</h3>
                <p className="text-3xl font-bold text-green-500">{classrooms.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Professors</h3>
                <p className="text-3xl font-bold text-purple-500">{professors.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Allocations</h3>
                <p className="text-3xl font-bold text-orange-500">{allocations.length}</p>
              </div>
            </div>
            
            {/* Classroom Utilization */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">Classroom Utilization by Department</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(getClassroomUtilization()).map(([dept, util]) => (
                  <div key={dept} className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">{dept}</h4>
                    <p className="text-sm text-gray-600">{util.used}/{util.total} classrooms used</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{ width: `${util.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{util.percentage}% utilization</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'slots' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Add Exam Slot</h2>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <strong>Simplified Slots:</strong> Only add Day, Date, and Subject. Professors select days for instant allocation.
              </div>
              <form onSubmit={(e) => handleSubmit('examSlot', e)}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={forms.examSlot.date}
                    onChange={(e) => setForms({...forms, examSlot: {...forms.examSlot, date: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={forms.examSlot.subject}
                    onChange={(e) => setForms({...forms, examSlot: {...forms.examSlot, subject: e.target.value}})}
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
              <h2 className="text-xl font-semibold mb-4">Exam Slots ({examSlots.length})</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {examSlots.map((slot) => (
                  <div key={slot.id} className="border border-gray-200 rounded-md p-3 bg-green-50">
                    <h3 className="font-medium text-green-900">{slot.subject}</h3>
                    <p className="text-sm text-green-700">{slot.day}, {slot.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'professors' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Add Professor</h2>
              <form onSubmit={(e) => handleSubmit('professor', e)}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={forms.professor.name}
                      onChange={(e) => setForms({...forms, professor: {...forms.professor, name: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={forms.professor.email}
                      onChange={(e) => setForms({...forms, professor: {...forms.professor, email: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                    <select
                      value={forms.professor.designation}
                      onChange={(e) => setForms({...forms, professor: {...forms.professor, designation: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Assistant Professor">Assistant Professor</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Professor">Professor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                      value={forms.professor.department}
                      onChange={(e) => setForms({...forms, professor: {...forms.professor, department: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
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
              <h2 className="text-xl font-semibold mb-4">Professors List ({professors.length})</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {professors.map((prof) => (
                  <div key={prof.id} className="border border-gray-200 rounded-md p-3 bg-gradient-to-r from-purple-50 to-pink-50">
                    <h3 className="font-medium text-purple-900">{prof.name}</h3>
                    <p className="text-sm text-purple-700">{prof.designation} - {prof.department}</p>
                    <p className="text-sm text-purple-600">{prof.email}</p>
                    <p className="text-xs text-purple-500 mt-1 font-mono">Token: {prof.token}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-6">
            {/* Allocation Results */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Instant Allocation Results ({allocations.length})</h2>
              <div className="mb-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                <strong>Note:</strong> Allocations happen instantly when professors select exam days using AI.
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Professor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day & Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classroom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allocations.map((allocation) => (
                      <tr key={allocation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{allocation.professor_name}</div>
                            <div className="text-sm text-gray-500">{allocation.professor_department}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {allocation.day}<br/>{allocation.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {allocation.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {allocation.classroom_name}<br/>
                          <span className="text-xs text-gray-500">Floor {allocation.floor}, Room {allocation.room_number}</span>
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
                <h2 className="text-xl font-semibold mb-4 text-orange-800">Emergency Pool ({emergencyPool.length})</h2>
                <div className="space-y-3">
                  {emergencyPool.map((prof, index) => (
                    <div key={index} className="bg-white p-3 rounded border border-orange-200">
                      <h3 className="font-medium text-orange-900">{prof.professor_name}</h3>
                      <p className="text-sm text-orange-700">{prof.department} Department</p>
                      <p className="text-xs text-orange-600">{prof.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'emails' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Email Activity Log ({emailLog.length})</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {emailLog.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No emails sent yet</p>
              ) : (
                emailLog.slice().reverse().map((email) => (
                  <div key={email.id} className="border border-gray-200 rounded-md p-4 bg-blue-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-blue-900">{email.subject}</h3>
                        <p className="text-sm text-blue-700">To: {email.to}</p>
                        <p className="text-xs text-blue-600 mt-2">{new Date(email.sent_at).toLocaleString()}</p>
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
        {activeTab === 'departments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Add Department</h2>
              <form onSubmit={(e) => handleSubmit('department', e)}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={forms.department.name}
                    onChange={(e) => setForms({...forms, department: {...forms.department, name: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={forms.department.description}
                    onChange={(e) => setForms({...forms, department: {...forms.department, description: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Classrooms</label>
                  <input
                    type="number"
                    min="1"
                    value={forms.department.classrooms_count}
                    onChange={(e) => setForms({...forms, department: {...forms.department, classrooms_count: parseInt(e.target.value)}})}
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
              <h2 className="text-xl font-semibold mb-4">Departments List ({departments.length})</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {departments.map((dept) => (
                  <div key={dept.id} className="border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50">
                    <h3 className="font-medium">{dept.name}</h3>
                    <p className="text-sm text-gray-600">{dept.description || 'No description'}</p>
                    <p className="text-sm text-indigo-600">{dept.classrooms_count} classrooms</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'classrooms' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Add Classroom</h2>
              <form onSubmit={(e) => handleSubmit('classroom', e)}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={forms.classroom.name}
                      onChange={(e) => setForms({...forms, classroom: {...forms.classroom, name: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., CS-101"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                    <input
                      type="text"
                      value={forms.classroom.room_number}
                      onChange={(e) => setForms({...forms, classroom: {...forms.classroom, room_number: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., 101"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                      value={forms.classroom.department}
                      onChange={(e) => setForms({...forms, classroom: {...forms.classroom, department: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                    <input
                      type="number"
                      min="1"
                      value={forms.classroom.floor}
                      onChange={(e) => setForms({...forms, classroom: {...forms.classroom, floor: parseInt(e.target.value)}})}
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
              <h2 className="text-xl font-semibold mb-4">Classrooms ({classrooms.length})</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {departments.map((dept) => {
                  const deptClassrooms = classrooms.filter(c => c.department === dept.name);
                  if (deptClassrooms.length === 0) return null;
                  
                  return (
                    <div key={dept.id} className="border border-gray-200 rounded-md p-3">
                      <h3 className="font-medium text-gray-900 mb-2">{dept.name} Department</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {deptClassrooms.map((room) => (
                          <div key={room.id} className="text-sm bg-gray-50 p-2 rounded">
                            <div className="font-medium">{room.name}</div>
                            <div className="text-xs text-gray-600">Floor {room.floor}, Room {room.room_number}</div>
                            <div className="text-xs text-gray-600">Capacity: {room.capacity}</div>
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
  const [loading, setLoading] = useState(false);
  const [conflictModal, setConflictModal] = useState({ show: false, day: '', conflicts: [] });
  const { logout, user } = useAuth();

  // Timetable form state
  const [timetableForm, setTimetableForm] = useState({
    day: '',
    subject: '',
    start_time: '',
    end_time: '',
    semester: ''
  });

  const loadData = () => {
    const allExamSlots = getFromStorage(StorageKeys.EXAM_SLOTS);
    const allAllocations = getFromStorage(StorageKeys.ALLOCATIONS);
    const allTimetables = getFromStorage(StorageKeys.PROFESSOR_TIMETABLES);

    setExamSlots(allExamSlots);
    setMyAllocations(allAllocations.filter(alloc => alloc.professor_id === user.id));
    setMyTimetable(allTimetables.filter(tt => tt.professor_id === user.id));
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const addToTimetable = (e) => {
    e.preventDefault();
    const newEntry = {
      id: generateId(),
      professor_id: user.id,
      ...timetableForm,
      created_at: new Date().toISOString()
    };

    const allTimetables = getFromStorage(StorageKeys.PROFESSOR_TIMETABLES);
    allTimetables.push(newEntry);
    saveToStorage(StorageKeys.PROFESSOR_TIMETABLES, allTimetables);

    setTimetableForm({ day: '', subject: '', start_time: '', end_time: '', semester: '' });
    loadData();
    alert('Timetable entry added successfully!');
  };

  const checkConflicts = (selectedDay) => {
    const conflicts = myTimetable.filter(entry => entry.day === selectedDay);
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
          conflicts: conflicts
        });
        setLoading(false);
        return;
      }

      // Proceed with immediate allocation
      await performInstantAllocation(selectedDay);
    } catch (error) {
      alert('Allocation failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const proceedWithAllocation = async () => {
    setConflictModal({ show: false, day: '', conflicts: [] });
    setLoading(true);
    await performInstantAllocation(conflictModal.day);
    setLoading(false);
  };

  const performInstantAllocation = async (selectedDay) => {
    try {
      // Get available exam slots for the selected day
      const daySlots = examSlots.filter(slot => slot.day === selectedDay);
      
      if (daySlots.length === 0) {
        alert('No exam slots available for this day');
        return;
      }

      // Randomly select one exam slot
      const randomSlot = daySlots[Math.floor(Math.random() * daySlots.length)];

      // Get all classrooms and allocations
      const allClassrooms = getFromStorage(StorageKeys.CLASSROOMS);
      const allAllocations = getFromStorage(StorageKeys.ALLOCATIONS);

      // Find classrooms used on this day for this slot
      const usedClassroomsThisSlot = allAllocations
        .filter(alloc => alloc.date === randomSlot.date && alloc.subject === randomSlot.subject)
        .map(alloc => alloc.classroom_id);

      // Prepare data for Gemini AI
      const prompt = `
You are an AI assistant for classroom allocation. A professor needs a classroom for exam proctoring.

PROFESSOR DETAILS:
- Name: ${user.name}
- Department: ${user.department}
- Designation: ${user.designation}

SELECTED EXAM SLOT:
- Day: ${selectedDay}
- Date: ${randomSlot.date}
- Subject: ${randomSlot.subject}

ALLOCATION RULES:
1. First preference: Assign classroom from professor's own department (${user.department})
2. If all department classrooms are used, assign from other departments
3. Do not use classrooms already allocated for this slot

USED CLASSROOMS FOR THIS SLOT: ${JSON.stringify(usedClassroomsThisSlot)}

AVAILABLE CLASSROOMS:
${JSON.stringify(allClassrooms)}

Please provide a JSON response with ONLY the classroom allocation:
{
  "allocated_classroom_id": "classroom_id",
  "success": true/false,
  "reason": "explanation if unsuccessful"
}
`;

      let selectedClassroom = null;

      try {
        const aiResponse = await callGeminiAPI(prompt);
        console.log('AI Response:', aiResponse);
        
        // Parse AI response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.success && result.allocated_classroom_id) {
            selectedClassroom = allClassrooms.find(c => c.id === result.allocated_classroom_id);
          }
        }
      } catch (error) {
        console.error('AI allocation failed, using fallback:', error);
      }

      // Fallback allocation if AI fails
      if (!selectedClassroom) {
        // Get professor's department classrooms first
        const deptClassrooms = allClassrooms.filter(c => c.department === user.department);
        const availableDeptClassrooms = deptClassrooms.filter(c => !usedClassroomsThisSlot.includes(c.id));
        
        if (availableDeptClassrooms.length > 0) {
          selectedClassroom = availableDeptClassrooms[0];
        } else {
          // Try other departments
          const otherClassrooms = allClassrooms.filter(c => c.department !== user.department);
          const availableOtherClassrooms = otherClassrooms.filter(c => !usedClassroomsThisSlot.includes(c.id));
          
          if (availableOtherClassrooms.length > 0) {
            selectedClassroom = availableOtherClassrooms[0];
          }
        }
      }

      if (!selectedClassroom) {
        // Add to emergency pool
        const emergencyPool = getFromStorage(StorageKeys.EMERGENCY_POOL);
        emergencyPool.push({
          professor_id: user.id,
          professor_name: user.name,
          department: user.department,
          requested_day: selectedDay,
          exam_subject: randomSlot.subject,
          reason: 'All classrooms are full for this exam slot'
        });
        saveToStorage(StorageKeys.EMERGENCY_POOL, emergencyPool);
        
        alert('All classrooms are full for this exam slot. You have been added to the emergency pool.');
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
        status: 'assigned',
        created_at: new Date().toISOString()
      };

      // Save allocation
      const currentAllocations = getFromStorage(StorageKeys.ALLOCATIONS);
      currentAllocations.push(newAllocation);
      saveToStorage(StorageKeys.ALLOCATIONS, currentAllocations);

      // Send confirmation email
      const professor = getFromStorage(StorageKeys.PROFESSORS).find(p => p.id === user.id);
      if (professor) {
        sendEmail(professor.email, 'Exam Proctoring Assignment Confirmation - INSTANT ALLOCATION', 
          `Dear ${user.name},\n\nYou have been instantly allocated for exam proctoring:\n\n📅 Date: ${randomSlot.date} (${selectedDay})\n📚 Subject: ${randomSlot.subject}\n🏛️ Department: ${selectedClassroom.department}\n🏫 Classroom: ${selectedClassroom.name}\n🏢 Floor: ${selectedClassroom.floor}\n🚪 Room Number: ${selectedClassroom.room_number}\n\n✅ Status: CONFIRMED\n\nPlease be present 15 minutes before the exam starts.\n\nThis allocation was processed instantly using AI.\n\nBest regards,\nExam Proctor System`);
      }

      loadData();
      alert(`🎉 Allocation successful!\n\nClassroom: ${selectedClassroom.name}\nSubject: ${randomSlot.subject}\nDate: ${randomSlot.date}\n\nConfirmation email sent!`);

    } catch (error) {
      console.error('Allocation error:', error);
      alert('Allocation failed: ' + error.message);
    }
  };

  // Get unique days from exam slots
  const getAvailableDays = () => {
    const days = [...new Set(examSlots.map(slot => slot.day))];
    return days.sort();
  };

  const requiredSlots = user.designation === 'Assistant Professor' ? 8 : 4;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Professor Dashboard</h1>
              <p className="text-gray-600">{user.name} - {user.designation}</p>
              <div className="text-xs text-orange-600">Instant AI Allocation • Timetable Conflict Detection</div>
            </div>
            <button
              onClick={logout}
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
            <h2 className="text-xl font-semibold mb-4">🚀 Instant Exam Day Selection</h2>
            
            {/* Required Slots Info */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium text-indigo-900 mb-2">Your Requirements</h3>
              <p className="text-sm text-indigo-700">
                As a {user.designation}, you need <span className="font-bold">{requiredSlots} slots</span>
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                Current allocations: {myAllocations.length}/{requiredSlots}
              </p>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <strong>How it works:</strong> Select a day and get instant AI-powered classroom allocation!
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-700 mb-2">Available Exam Days</h3>
              {getAvailableDays().map((day) => (
                <button
                  key={day}
                  onClick={() => handleDaySelection(day)}
                  disabled={loading}
                  className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition disabled:opacity-50"
                >
                  <div className="font-medium">{day}</div>
                  <div className="text-sm text-gray-600">
                    {examSlots.filter(s => s.day === day).length} exam(s) available
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* My Timetable */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📅 My Teaching Timetable</h2>
            
            {/* Add Timetable Entry */}
            <form onSubmit={addToTimetable} className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Add Class Schedule</h3>
              <div className="space-y-2">
                <select
                  value={timetableForm.day}
                  onChange={(e) => setTimetableForm({...timetableForm, day: e.target.value})}
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
                  onChange={(e) => setTimetableForm({...timetableForm, subject: e.target.value})}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={timetableForm.start_time}
                    onChange={(e) => setTimetableForm({...timetableForm, start_time: e.target.value})}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    required
                  />
                  <input
                    type="time"
                    value={timetableForm.end_time}
                    onChange={(e) => setTimetableForm({...timetableForm, end_time: e.target.value})}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Semester"
                  value={timetableForm.semester}
                  onChange={(e) => setTimetableForm({...timetableForm, semester: e.target.value})}
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
                <p className="text-gray-500 text-center py-4 text-sm">No timetable entries yet</p>
              ) : (
                myTimetable.map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-md p-2 text-sm">
                    <div className="font-medium">{entry.day} - {entry.subject}</div>
                    <div className="text-xs text-gray-600">{entry.start_time} - {entry.end_time}</div>
                    <div className="text-xs text-gray-500">{entry.semester} Semester</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* My Allocations */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">✅ My Exam Assignments</h2>
            <div className="space-y-3">
              {myAllocations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No assignments yet</p>
              ) : (
                myAllocations.map((allocation) => (
                  <div key={allocation.id} className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-500 p-3 rounded">
                    <h3 className="font-medium text-green-900">{allocation.subject}</h3>
                    <p className="text-sm text-green-700">{allocation.day}, {allocation.date}</p>
                    <p className="text-xs text-green-600">{allocation.classroom_name} ({allocation.classroom_department})</p>
                    <p className="text-xs text-green-600">Floor {allocation.floor}, Room {allocation.room_number}</p>
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
                  <span className="font-medium">{myAllocations.length}/{requiredSlots} slots</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${(myAllocations.length / requiredSlots) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Available Exam Slots Display */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">📚 Available Exam Slots</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examSlots.map((slot) => (
              <div key={slot.id} className="border border-gray-200 rounded-md p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="font-medium text-blue-900">{slot.subject}</h3>
                <p className="text-sm text-blue-700">{slot.day}</p>
                <p className="text-sm text-blue-600">{slot.date}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conflict Modal */}
      {conflictModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-red-800 mb-4">⚠️ Schedule Conflict Detected</h3>
            <p className="text-gray-700 mb-4">
              You have existing classes on <strong>{conflictModal.day}</strong>:
            </p>
            <div className="space-y-2 mb-4">
              {conflictModal.conflicts.map((conflict) => (
                <div key={conflict.id} className="bg-red-50 border border-red-200 p-2 rounded text-sm">
                  <div className="font-medium">{conflict.subject}</div>
                  <div className="text-red-600">{conflict.start_time} - {conflict.end_time}</div>
                  <div className="text-red-500 text-xs">{conflict.semester} Semester</div>
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Do you still want to continue with exam proctoring on this day, or select another day?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={proceedWithAllocation}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded transition"
              >
                Continue Anyway
              </button>
              <button
                onClick={() => setConflictModal({ show: false, day: '', conflicts: [] })}
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
            <p className="text-gray-700">🤖 AI is finding the best classroom for you...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/professor'} replace />;
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
    </div>
  );
}

export default App;