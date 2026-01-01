import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

export const repairExistingKPIs = async () => {
  try {
    // Note: This matches your collection name "kpis"
    const kpiSnap = await getDocs(collection(db, "kpis"));
    
    const promises = kpiSnap.docs.map((kpiDoc) => {
      const data = kpiDoc.data();
      
      return updateDoc(doc(db, "kpis", kpiDoc.id), {
        // Add missing fields to old data
        rubric: data.rubric || "Standard evaluation based on evidence provided.",
        description: data.description || "No description provided.",
        evidenceUrl: data.evidenceUrl || "",
        evidenceName: data.evidenceName || "",
        lastUpdatedBy: data.ownerId // Default to owner
      });
    });

    await Promise.all(promises);
    alert("KPIs updated! Check your dashboard now.");
  } catch (error) {
    console.error("Repair failed:", error);
  }
};