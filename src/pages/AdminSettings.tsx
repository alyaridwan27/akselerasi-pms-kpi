import React, { useEffect, useState } from "react";
import { 
  doc, getDoc, setDoc, collection, getDocs, query, where, orderBy, deleteDoc 
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase";
import { 
  FiSettings, FiSave, FiLock, FiPlus, FiBriefcase, 
  FiUserPlus, FiUsers, FiShield, FiTrash2, FiDatabase 
} from "react-icons/fi";
import toast from "react-hot-toast";
import "./AdminSettings.css";

// Components & Utils
import AddTemplateModal from "../components/AddTemplateModal";
import { seedTeams } from "../utils/seedData";

const AdminSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // 1. System Config State
  const [settings, setSettings] = useState({
    activeYear: 2026,
    activeQuarter: "Q4",
    kpiWeight: 70,
    feedbackWeight: 30,
    allowManagerEdits: true,
    systemLocked: false,
  });

  // 2. Template Management State
  const [templates, setTemplates] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // 3. User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "Employee",
    jobTitle: "",
    department: "",
    managerId: ""
  });

  const loadData = async () => {
    try {
      // Load System Config
      const docRef = doc(db, "system", "config");
      const snap = await getDoc(docRef);
      if (snap.exists()) setSettings(snap.data() as any);

      // Load Templates
      const tSnap = await getDocs(collection(db, "kpiTemplates"));
      setTemplates(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Load Users
      const userSnap = await getDocs(query(collection(db, "users"), orderBy("role")));
      const userList = userSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setUsers(userList);
      setManagers(userList.filter(u => u.role === "Manager").map(m => ({ id: m.id, name: m.displayName })));
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading admin data:", error);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- Handlers ---
  const handleSaveConfig = async () => {
    try {
      await setDoc(doc(db, "system", "config"), settings);
      toast.success("System configuration updated!");
    } catch (error) {
      toast.error("Error updating settings.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        jobTitle: formData.jobTitle,
        department: formData.department,
        managerId: formData.role === "Employee" ? formData.managerId : "",
        createdAt: new Date(),
        needsDevelopment: false
      });

      toast.success(`User ${formData.displayName} registered!`);
      setFormData({ email: "", password: "", displayName: "", role: "Employee", jobTitle: "", department: "", managerId: "" });
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Remove this user profile?")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      toast.success("User profile deleted.");
      loadData();
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  if (loading) return <div className="admin-loading">Initializing Admin Control Panel...</div>;

  return (
    <div className="admin-settings-page">
      <div className="page-header">
        <h1><FiSettings /> Admin Control Panel</h1>
        <div className="header-actions">
           <button className="seed-btn" onClick={seedTeams}><FiDatabase /> Seed 2026 Q4 Data</button>
           <button className="save-settings-btn" onClick={handleSaveConfig}><FiSave /> Save Config</button>
        </div>
      </div>

      <div className="admin-main-grid">
        {/* COLUMN 1: System & Templates */}
        <div className="admin-col">
          <section className="settings-card">
            <h3><FiLock /> System Governance</h3>
            <div className="setting-group">
              <label>Evaluation Year</label>
              <input type="number" value={settings.activeYear} onChange={e => setSettings({...settings, activeYear: Number(e.target.value)})} />
            </div>
            <div className="setting-group">
              <label>Current Quarter</label>
              <select value={settings.activeQuarter} onChange={e => setSettings({...settings, activeQuarter: e.target.value})}>
                <option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option>
              </select>
            </div>
            <div className="setting-toggle danger">
               <label>System Lock (Freeze Data)</label>
               <input type="checkbox" checked={settings.systemLocked} onChange={e => setSettings({...settings, systemLocked: e.target.checked})} />
            </div>
          </section>

          <section className="settings-card">
            <h3><FiBriefcase /> KPI Role Standards</h3>
            <div className="template-list-admin">
              {templates.map(t => (
                <div key={t.id} className="template-item-mini">
                  <strong>{t.categoryName}</strong>
                  <span>{t.goals?.length || 0} Standards</span>
                </div>
              ))}
            </div>
            <button className="add-template-btn" onClick={() => setShowAddModal(true)}>
              <FiPlus /> Define New Standard
            </button>
          </section>
        </div>

        {/* COLUMN 2: User Registration */}
        <div className="admin-col">
          <section className="settings-card">
            <h3><FiUserPlus /> Register New User</h3>
            <form onSubmit={handleCreateUser} className="admin-form">
              <input placeholder="Full Name" required value={formData.displayName} onChange={(e) => setFormData({...formData, displayName: e.target.value})} />
              <input placeholder="Email" type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              <input placeholder="Initial Password" type="password" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
              
              <div className="form-row">
                <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="HR">HR</option>
                  <option value="Admin">Admin</option>
                </select>
                <input placeholder="Dept" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} />
              </div>

              {formData.role === "Employee" && (
                <select value={formData.managerId} onChange={(e) => setFormData({...formData, managerId: e.target.value})}>
                  <option value="">Select Manager</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}

              <button type="submit" className="primary-btn" disabled={submitting}>
                {submitting ? "Processing..." : "Create User Account"}
              </button>
            </form>
          </section>
        </div>
      </div>

      {/* BOTTOM SECTION: User Directory */}
      <section className="settings-card user-directory">
        <h3><FiUsers /> Organization Directory</h3>
        <div className="table-responsive">
          <table className="user-table">
            <thead>
              <tr><th>Name</th><th>Role</th><th>Dept</th><th>Action</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <span className="u-name">{u.displayName}</span>
                      <span className="u-email">{u.email}</span>
                    </div>
                  </td>
                  <td><span className={`role-pill ${u.role.toLowerCase()}`}>{u.role}</span></td>
                  <td>{u.department}</td>
                  <td>
                    <button className="delete-btn" onClick={() => handleDeleteUser(u.id)}><FiTrash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showAddModal && (
        <AddTemplateModal onClose={() => setShowAddModal(false)} onCreated={loadData} />
      )}
    </div>
  );
};

export default AdminSettings;