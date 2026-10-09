import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

interface SubjectSeed {
  code: string;
  name: string;
  department: string;
  semester: number;
  year: number;
  credits: number;
  teachingHours: number;
  type: 'core' | 'elective' | 'university_elective' | 'audit_course' | 'project' | 'internship' | 'skill_augmentation';
}

const subjectsList: SubjectSeed[] = [
  // ─── SEMESTER 1 (First Year) ──────────────────────────────────────
  { code: 'MSUD101', name: 'Engineering Mathematics-I', department: 'CSE', semester: 1, year: 1, credits: 4, teachingHours: 4, type: 'core' },
  { code: 'CEUC101', name: 'Computer Concepts & Programming', department: 'CSE', semester: 1, year: 1, credits: 5, teachingHours: 7, type: 'core' },
  { code: 'EEUD101', name: 'Basics of Electronics & Electrical Engineering', department: 'CSE', semester: 1, year: 1, credits: 4, teachingHours: 5, type: 'core' },
  { code: 'ITUS101', name: 'ICT Workshop', department: 'IT', semester: 1, year: 1, credits: 2, teachingHours: 2, type: 'core' },
  { code: 'PSUD101', name: 'Engineering Physics - I', department: 'CSE', semester: 1, year: 1, credits: 2, teachingHours: 2, type: 'core' },
  { code: 'FTUC001', name: 'Foundation Course on Mathematics and Physics', department: 'CSE', semester: 1, year: 1, credits: 0, teachingHours: 2, type: 'audit_course' },
  { code: 'HSUA101', name: 'Communicative English', department: 'CSE', semester: 1, year: 1, credits: 2, teachingHours: 2, type: 'core' },
  { code: 'CHUV101', name: 'Community Engagement and Sustainable Development (CESD) / NCC / Sports', department: 'CSE', semester: 1, year: 1, credits: 2, teachingHours: 2, type: 'core' },
  { code: 'FTXXXX', name: 'Skill Augmentation', department: 'CSE', semester: 1, year: 1, credits: 2, teachingHours: 2, type: 'skill_augmentation' },

  // ─── SEMESTER 2 (First Year) ──────────────────────────────────────
  { code: 'MSUD102', name: 'Engineering Mathematics-II', department: 'CSE', semester: 2, year: 1, credits: 4, teachingHours: 4, type: 'core' },
  { code: 'CEUC102', name: 'Object Oriented Programming with C++', department: 'CSE', semester: 2, year: 1, credits: 5, teachingHours: 7, type: 'core' },
  { code: 'MEUD101', name: 'Elements of Engineering', department: 'CSE', semester: 2, year: 1, credits: 4, teachingHours: 5, type: 'core' },
  { code: 'CLUV101', name: 'Environmental Sciences', department: 'CSE', semester: 2, year: 1, credits: 2, teachingHours: 2, type: 'core' },
  { code: 'PSUD102', name: 'Engineering Physics - II', department: 'CSE', semester: 2, year: 1, credits: 2, teachingHours: 2, type: 'core' },
  { code: 'CEUC103', name: 'Digital Electronics', department: 'CSE', semester: 2, year: 1, credits: 3, teachingHours: 4, type: 'core' },
  { code: 'HSUS101', name: 'A Course on Liberal Arts (HS Electives I)', department: 'CSE', semester: 2, year: 1, credits: 2, teachingHours: 2, type: 'elective' },
  { code: 'CHUV102', name: 'Community Engagement and Sustainable Development (CESD) / NCC / Sports - II', department: 'CSE', semester: 2, year: 1, credits: 2, teachingHours: 2, type: 'core' },
  { code: 'FTXXXX2', name: 'Skill Augmentation - II', department: 'CSE', semester: 2, year: 1, credits: 2, teachingHours: 2, type: 'skill_augmentation' },

  // ─── SEMESTER 3 (Second Year) ─────────────────────────────────────
  { code: 'ITUC201', name: 'Fundamentals of Computer Networks', department: 'IT', semester: 3, year: 2, credits: 5, teachingHours: 5, type: 'core' },
  { code: 'CSUC201', name: 'Fundamentals of Data Structure and Algorithms', department: 'CSE', semester: 3, year: 2, credits: 4, teachingHours: 4, type: 'core' },
  { code: 'MSUD203', name: 'Discrete Mathematics', department: 'CSE', semester: 3, year: 2, credits: 3, teachingHours: 3, type: 'core' },
  { code: 'ITUE203', name: 'Web Development Frameworks', department: 'IT', semester: 3, year: 2, credits: 5, teachingHours: 5, type: 'core' },
  { code: 'CEUE203', name: 'Object Oriented Programming', department: 'CSE', semester: 3, year: 2, credits: 3, teachingHours: 3, type: 'core' },
  { code: 'HSUV201', name: 'Creativity, Problem Solving and Innovation', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'core' },

  // Sem 3 University Electives
  { code: 'MEUE201', name: 'Engineering Graphics and Design', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'MEUE202', name: 'Nature And Properties of Materials', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'CSUE203', name: 'Foundation Of Data Science and Analytics', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'EEUE201', name: 'Fundamentals Of Electrical Engineering', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'EEUE202', name: 'Solar Energy Engineering and Technology', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'CSUE204', name: 'Foundation Of Embedded System', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'CLUE201', name: 'Environment And Development', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'CLUE202', name: 'Ecology And Environment', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'CEUE204', name: 'Introduction To Computer Graphics', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'ECUE201', name: 'Scientific Computing Using MATLAB', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'ECUE202', name: 'Introduction To Internet of Things', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'ITUE205', name: 'Fundamentals Of Information Security', department: 'IT', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'CEUE201', name: 'The Joy Of Computing Using Python', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'CEUE202', name: 'Software Conceptual Design', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'ITUE201', name: 'Introduction To Quantum Computing', department: 'IT', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'ITUE202', name: 'Ethical Hacking', department: 'IT', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'CSUE201', name: 'Python For Data Science', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'CSUE202', name: 'Google Cloud Computing Foundations', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'AIUE201', name: 'An Introduction to Artificial Intelligence', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'AIUE202', name: 'Social Network Analysis', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'BMUD201', name: 'Money And Banking', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'BMUD251', name: 'Economics Of Health And Health Care', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'CAUD203', name: 'Human Computer Interactions', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'CAUD204', name: 'Modern Application Development', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'PTUD191', name: 'Basics Of Health Promotion and Education Intervention', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'PTUD192', name: 'Ergonomics Workplace Analysis', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'NRMD251', name: 'First Aid Masterclass - A Complete Guide to First Aid', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },
  { code: 'NRMD261', name: 'Mindfulness And Well-Being: Living With Balance And Ease', department: 'CSE', semester: 3, year: 2, credits: 2, teachingHours: 2, type: 'university_elective' },

  // ─── SEMESTER 4 (Second Year) ─────────────────────────────────────
  { code: 'ITUC202', name: 'Fundamentals of Database Management Systems', department: 'IT', semester: 4, year: 2, credits: 5, teachingHours: 5, type: 'core' },
  { code: 'CEUC201', name: 'Fundamentals of Software Engineering', department: 'CSE', semester: 4, year: 2, credits: 4, teachingHours: 4, type: 'core' },
  { code: 'CEUC202', name: 'Computer Organization and Architecture', department: 'CSE', semester: 4, year: 2, credits: 3, teachingHours: 3, type: 'core' },
  { code: 'ITUE204', name: 'Design and Analysis of Algorithms', department: 'IT', semester: 4, year: 2, credits: 5, teachingHours: 5, type: 'core' },
  { code: 'ITUP201', name: 'Software Group Project', department: 'IT', semester: 4, year: 2, credits: 2, teachingHours: 2, type: 'project' },
  { code: 'HSUV202', name: 'Human Values and Ethics / Life Lessons from Epics', department: 'CSE', semester: 4, year: 2, credits: 2, teachingHours: 2, type: 'core' },

  // ─── SEMESTER 5 (Third Year) ──────────────────────────────────────
  { code: 'CEUC301', name: 'Fundamentals of Operating System Design', department: 'CSE', semester: 5, year: 3, credits: 5, teachingHours: 4, type: 'core' },
  { code: 'CSUC301', name: 'Machine Learning', department: 'CSE', semester: 5, year: 3, credits: 5, teachingHours: 4, type: 'core' },
  { code: 'ITUE301', name: 'Advanced Web Development Frameworks', department: 'IT', semester: 5, year: 3, credits: 2, teachingHours: 2, type: 'core' },
  { code: 'CEUC302', name: 'Theory of Computation', department: 'CSE', semester: 5, year: 3, credits: 3, teachingHours: 3, type: 'core' },
  { code: 'CEUI301', name: 'Summer Internship', department: 'CSE', semester: 5, year: 3, credits: 6, teachingHours: 3, type: 'internship' },
  { code: 'CEUP301', name: 'Project - I', department: 'CSE', semester: 5, year: 3, credits: 2, teachingHours: 2, type: 'project' },
  { code: 'HSUA301', name: 'Communication and Soft Skills', department: 'CSE', semester: 5, year: 3, credits: 2, teachingHours: 2, type: 'core' },

  // Sem 5 Elective 1
  { code: 'CSUA301', name: 'Introduction to Research Methodology', department: 'CSE', semester: 5, year: 3, credits: 2, teachingHours: 2, type: 'elective' },
  { code: 'CEUA301', name: 'Competitive Programming Essentials', department: 'CSE', semester: 5, year: 3, credits: 2, teachingHours: 2, type: 'elective' },
  { code: 'ITUA301', name: 'Entrepreneurship Skills', department: 'IT', semester: 5, year: 3, credits: 2, teachingHours: 2, type: 'elective' },

  // Sem 5 Elective 2
  { code: 'CSUE301', name: 'Big Data Analytics', department: 'CSE', semester: 5, year: 3, credits: 4, teachingHours: 3, type: 'elective' },
  { code: 'CSUE302', name: 'Internet of Things', department: 'CSE', semester: 5, year: 3, credits: 4, teachingHours: 3, type: 'elective' },
  { code: 'CEUE301', name: 'Digital Image Processing', department: 'CSE', semester: 5, year: 3, credits: 4, teachingHours: 3, type: 'elective' },
  { code: 'CEUE302', name: 'Fundamentals of Game Development', department: 'CSE', semester: 5, year: 3, credits: 4, teachingHours: 3, type: 'elective' },
  { code: 'ITUE302', name: 'Ethical Hacking Essentials', department: 'IT', semester: 5, year: 3, credits: 4, teachingHours: 3, type: 'elective' },
  { code: 'ITUE303', name: 'Network Defence Essentials', department: 'IT', semester: 5, year: 3, credits: 4, teachingHours: 3, type: 'elective' },
];

async function seedSubjects() {
  const sql = neon(DATABASE_URL!);
  console.log(`🌱 Seeding ${subjectsList.length} subjects (Semesters 1-5 only)...`);

  let added = 0;
  let updated = 0;

  for (const s of subjectsList) {
    try {
      const result = await sql`
        INSERT INTO "subjects" (
          "name", "code", "department", "semester", "year", "credits", "teaching_hours", "type", "is_active"
        ) VALUES (
          ${s.name}, ${s.code}, ${s.department}, ${s.semester}, ${s.year}, ${s.credits}, ${s.teachingHours}, ${s.type}, true
        )
        ON CONFLICT ("code") DO UPDATE SET
          "name" = EXCLUDED."name",
          "department" = EXCLUDED."department",
          "semester" = EXCLUDED."semester",
          "year" = EXCLUDED."year",
          "credits" = EXCLUDED."credits",
          "teaching_hours" = EXCLUDED."teaching_hours",
          "type" = EXCLUDED."type",
          "updated_at" = now()
        RETURNING "id"
      `;
      if (result.length > 0) added++;
    } catch (e: any) {
      console.error(`⚠️ Error with subject ${s.code}:`, e.message);
    }
  }

  console.log(`✅ Finished seeding! Processed ${added} subjects for Semesters 1 to 5.`);
}

seedSubjects().catch(console.error);
