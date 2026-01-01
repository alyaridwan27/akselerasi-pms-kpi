import { db } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  setDoc, 
  serverTimestamp 
} from "firebase/firestore";

export const seedTeams = async () => {
  try {
    const usersRef = collection(db, "users");

    // 1. Fetch Manager UIDs based on your Auth list
    const qMagA = query(usersRef, where("email", "==", "managera@test.com"));
    const qMagB = query(usersRef, where("email", "==", "managerb@test.com"));
    
    const snapA = await getDocs(qMagA);
    const snapB = await getDocs(qMagB);

    if (snapA.empty || snapB.empty) {
      return alert("Error: Managers must have Firestore profiles first!");
    }

    const magA_Uid = snapA.docs[0].id;
    const magB_Uid = snapB.docs[0].id;

    // 2. Process All Users
    const allUsersSnap = await getDocs(usersRef);
    
    for (const userDoc of allUsersSnap.docs) {
      const data = userDoc.data();
      const uid = userDoc.id;
      const email = data.email?.toLowerCase() || "";

      // Skip non-employees
      if (["admin@test.com", "hr@test.com", "managera@test.com", "managerb@test.com"].includes(email)) continue;

      let targetManagerId = "";
      let jobType = "";
      const match = email.match(/emp(\d+)@/);
      if (!match) continue;
      const empNumber = parseInt(match[1]);

      if (empNumber >= 1 && empNumber <= 4) {
        targetManagerId = magA_Uid;
        jobType = "Business Analyst";
      } else if (empNumber >= 5 && empNumber <= 8) {
        targetManagerId = magB_Uid;
        jobType = "Software Engineer";
      }

      if (targetManagerId) {
        // Link Employee to Manager
        await updateDoc(doc(db, "users", uid), {
          managerId: targetManagerId,
          employeeType: jobType
        });

        // 3. Create KPIs with Rubrics and 2026 Year
        if (jobType === "Business Analyst") {
          await createKPI(uid, data.displayName, jobType, "Requirement Accuracy", "Scale 1-10: 0 errors is 10pts, 2 errors is 5pts.");
          await createKPI(uid, data.displayName, jobType, "Stakeholder Feedback", "Scale 1-10: Based on survey results.");
        } else {
          await createKPI(uid, data.displayName, jobType, "Sprint Velocity", "Scale 1-10: 15+ points is 10pts, 10 points is 7pts.");
          await createKPI(uid, data.displayName, jobType, "Code Quality", "Scale 1-10: 0 critical bugs is 10pts.");
        }
      }
    }
    alert("Seeding Complete for 2026 Q4!");
  } catch (error) {
    console.error("Seed Error:", error);
    alert("Seed failed. Check console.");
  }
};

const createKPI = async (ownerId: string, ownerName: string, type: string, title: string, rubric: string) => {
  // Use doc(collection(...)) to generate a random unique ID
  const newKpiRef = doc(collection(db, "kpis")); 
  
  await setDoc(newKpiRef, {
    ownerId,
    ownerName,
    employeeType: type,
    title,
    rubric, // Essential for Gemini AI
    weight: 50, // 50% each for 2 KPIs = 100% total
    targetValue: 10, 
    currentValue: 0, // Starts at 0 to test AI evidence audit
    unit: "pts",
    status: "Active",
    year: 2026, // Matches Admin Panel
    quarter: "Q1",
    createdAt: serverTimestamp()
  });
};