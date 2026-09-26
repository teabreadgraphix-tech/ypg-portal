import { db } from "./index";
import {
  regions, constituencies, categories, users, youthMps, appointees, proposals, projects, letters, actionPlans,
} from "./schema";
import { hashPassword } from "../lib/auth";

async function main() {
  console.log("Seeding — clearly fictional demo data only, no real people's information.\n");

  const [greaterAccra] = await db.insert(regions).values({ name: "Greater Accra" }).returning();
  const [ashanti] = await db.insert(regions).values({ name: "Ashanti" }).returning();

  const [ablekuma] = await db.insert(constituencies).values({ name: "Ablekuma North", regionId: greaterAccra.id }).returning();
  const [okaikwei] = await db.insert(constituencies).values({ name: "Okaikwei Central", regionId: greaterAccra.id }).returning();
  const [subin] = await db.insert(constituencies).values({ name: "Subin", regionId: ashanti.id }).returning();

  await db.insert(categories).values([
    { type: "appointment", name: "Constituency Coordinator" },
    { type: "appointment", name: "Youth Advisor" },
    { type: "project", name: "Education" },
    { type: "project", name: "Health" },
    { type: "letter", name: "Invitation" },
    { type: "letter", name: "Partnership" },
  ]);

  const adminPasswordHash = await hashPassword("ChangeMe123!");
  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@ypg.gov.gh",
      passwordHash: adminPasswordHash,
      fullName: "Ama Owusu (Demo Super Admin)",
      role: "super_admin",
    })
    .returning();

  const dpmPasswordHash = await hashPassword("ChangeMe123!");
  const [dpm] = await db
    .insert(users)
    .values({
      email: "dpm@ypg.gov.gh",
      passwordHash: dpmPasswordHash,
      fullName: "Kwesi Mensah (Demo Deputy Project Manager)",
      role: "deputy_project_manager",
    })
    .returning();

  const mp1PasswordHash = await hashPassword("ChangeMe123!");
  const [mp1User] = await db
    .insert(users)
    .values({ email: "mp1@ypg.gov.gh", passwordHash: mp1PasswordHash, fullName: "Efua Asante (Demo Youth MP)", role: "youth_mp" })
    .returning();

  const [mp1] = await db.insert(youthMps).values({
    userId: mp1User.id, fullName: "Efua Asante", gender: "Female",
    constituencyId: ablekuma.id, regionId: greaterAccra.id, phone: "0200000001",
  }).returning();
  const [mp2] = await db.insert(youthMps).values({
    fullName: "Kojo Boateng", gender: "Male",
    constituencyId: okaikwei.id, regionId: greaterAccra.id, phone: "0200000002",
  }).returning();
  const [mp3] = await db.insert(youthMps).values({
    fullName: "Abena Darko", gender: "Female",
    constituencyId: subin.id, regionId: ashanti.id, phone: "0200000003",
  }).returning();
  await db.insert(youthMps).values([
    { fullName: "Yaw Owusu", gender: "Male", constituencyId: ablekuma.id, regionId: greaterAccra.id, phone: "0200000004" },
    { fullName: "Adjoa Frimpong", gender: "Female", constituencyId: subin.id, regionId: ashanti.id, phone: "0200000005" },
  ]);

  for (let i = 1; i <= 15; i++) {
    const mp = [mp1, mp2, mp3][i % 3];
    await db.insert(appointees).values({
      reference: `YPG-APP-${new Date().getFullYear()}-DEMO${String(i).padStart(2, "0")}`,
      name: `Demo Appointee ${i}`,
      position: i % 2 === 0 ? "Constituency Youth Coordinator" : "Youth Advisor",
      constituencyId: mp.constituencyId,
      regionId: mp.regionId,
      appointingYouthMpId: mp.id,
      phone: `02010000${String(i).padStart(2, "0")}`,
      status: ["Pending", "Active", "Active", "Inactive"][i % 4] as "Pending" | "Active" | "Inactive",
      submittedById: mp1User.id,
    });
  }

  for (let i = 1; i <= 5; i++) {
    await db.insert(proposals).values({
      reference: `YPG-PRO-${new Date().getFullYear()}-DEMO0${i}`,
      title: `Demo Community Project Proposal ${i}`,
      youthMpId: [mp1, mp2, mp3][i % 3].id,
      constituencyId: [mp1, mp2, mp3][i % 3].constituencyId,
      regionId: [mp1, mp2, mp3][i % 3].regionId,
      status: ["Submitted", "Under Review", "Approved", "Revision Required", "Draft"][i - 1] as any,
      submittedById: mp1User.id,
      budget: "5000.00",
    });
  }

  for (let i = 1; i <= 3; i++) {
    await db.insert(projects).values({
      reference: `YPG-PRJ-${new Date().getFullYear()}-DEMO0${i}`,
      name: `Demo Youth Project ${i}`,
      youthMpId: [mp1, mp2, mp3][i % 3].id,
      constituencyId: [mp1, mp2, mp3][i % 3].constituencyId,
      regionId: [mp1, mp2, mp3][i % 3].regionId,
      status: ["Planned", "Ongoing", "Completed"][i - 1] as any,
      budget: "8000.00",
    });
  }

  const letterCategories = await db.select().from(categories);
  const letterCatId = letterCategories.find((c) => c.type === "letter")?.id ?? letterCategories[0].id;

  for (let i = 1; i <= 5; i++) {
    await db.insert(letters).values({
      reference: `YPG-COR-${new Date().getFullYear()}-DEMO0${i}`,
      categoryId: letterCatId,
      direction: i % 2 === 0 ? "Outgoing" : "Incoming",
      subject: `Demo Letter Subject ${i}`,
      sender: "Demo Organization",
      status: ["Received", "Under Review", "Action Required", "Responded", "Closed"][i - 1] as any,
      createdById: dpm.id,
    });
  }

  for (let i = 1; i <= 5; i++) {
    await db.insert(actionPlans).values({
      reference: `YPG-ACT-${new Date().getFullYear()}-DEMO0${i}`,
      actionItem: `Demo Action Item ${i}`,
      priority: ["Low", "Medium", "High", "Urgent", "Medium"][i - 1] as any,
      status: ["Pending", "In Progress", "Completed", "Delayed", "Pending"][i - 1] as any,
      progress: [0, 40, 100, 20, 0][i - 1],
      createdById: dpm.id,
    });
  }

  console.log("Done. Demo logins (change these passwords immediately):");
  console.log("  Super Admin:              admin@ypg.gov.gh / ChangeMe123!");
  console.log("  Deputy Project Manager:   dpm@ypg.gov.gh / ChangeMe123!");
  console.log("  Youth MP:                 mp1@ypg.gov.gh / ChangeMe123!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
