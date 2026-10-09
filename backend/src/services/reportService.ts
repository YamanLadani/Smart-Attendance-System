import PDFDocument from 'pdfkit';
import { createObjectCsvStringifier } from 'csv-writer';
import { eq, and, or, gte, lte, desc } from 'drizzle-orm';
import { getDB } from '../config/db';
import { attendance, users, subjects } from '../db/schema';
import { logger } from '../utils/logger';
import type { Response } from 'express';

interface AttendanceReportRow {
  studentName: string;
  rollNumber: string;
  department: string;
  semester: number | string;
  subject: string;
  date: string;
  rawDate: Date;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  markedAt: string;
  markedType: string;
}

/**
 * Fetch attendance data for report generation with timezone-safe filters.
 */
async function fetchReportData(filters: {
  studentId?: string;
  teacherId?: string;
  subjectId?: string;
  department?: string;
  semester?: number;
  startDate?: string;
  endDate?: string;
}): Promise<{ data: AttendanceReportRow[]; contextUser?: { name: string; email: string; role: string; department?: string } }> {
  const db = getDB();
  const conditions = [];

  let contextUser: { name: string; email: string; role: string; department?: string } | undefined;

  if (filters.studentId) {
    conditions.push(eq(attendance.studentId, filters.studentId));
    const [st] = await db.select().from(users).where(eq(users.id, filters.studentId)).limit(1);
    if (st) {
      contextUser = {
        name: st.displayName,
        email: st.email,
        role: 'Student',
        department: st.department || undefined,
      };
    }
  }

  if (filters.teacherId) {
    const [tUser] = await db.select().from(users).where(eq(users.id, filters.teacherId)).limit(1);
    if (tUser) {
      contextUser = {
        name: tUser.displayName,
        email: tUser.email,
        role: 'Faculty',
        department: tUser.department || undefined,
      };

      if (!filters.subjectId && tUser.department) {
        conditions.push(
          or(
            eq(attendance.teacherId, filters.teacherId),
            eq(subjects.department, tUser.department)
          )!
        );
      } else if (!filters.subjectId) {
        conditions.push(eq(attendance.teacherId, filters.teacherId));
      }
    }
  }

  if (filters.subjectId) {
    conditions.push(eq(attendance.subjectId, filters.subjectId));
  }

  // Safe date range bounds (start of day to end of day)
  if (filters.startDate) {
    const start = new Date(filters.startDate);
    start.setHours(0, 0, 0, 0);
    conditions.push(gte(attendance.date, start));
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(attendance.date, end));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const records = await db
    .select({
      date: attendance.date,
      status: attendance.status,
      markedAt: attendance.markedAt,
      isManual: attendance.isManual,
      studentName: users.displayName,
      rollNumber: users.rollNumber,
      department: users.department,
      semester: users.semester,
      subjectName: subjects.name,
      subjectCode: subjects.code,
    })
    .from(attendance)
    .leftJoin(users, eq(attendance.studentId, users.id))
    .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
    .where(whereClause)
    .orderBy(desc(attendance.date), desc(attendance.markedAt))
    .limit(1000);

  const mapped: AttendanceReportRow[] = records.map((record) => {
    const st = (record.status || 'present').toUpperCase() as 'PRESENT' | 'ABSENT' | 'LATE';
    return {
      studentName: record.studentName || 'Student',
      rollNumber: record.rollNumber || '—',
      department: record.department || 'Computer Science',
      semester: record.semester || '—',
      subject: record.subjectName
        ? `${record.subjectName} (${record.subjectCode})`
        : 'General',
      date: new Date(record.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      rawDate: new Date(record.date),
      status: st === 'ABSENT' ? 'ABSENT' : st === 'LATE' ? 'LATE' : 'PRESENT',
      markedAt: new Date(record.markedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      markedType: record.isManual ? 'Manual Code' : 'QR Scan',
    };
  });

  return { data: mapped, contextUser };
}

/**
 * Generate a styled PDF report.
 */
export const generatePDFReport = async (
  res: Response,
  filters: {
    studentId?: string;
    teacherId?: string;
    subjectId?: string;
    department?: string;
    semester?: number;
    startDate?: string;
    endDate?: string;
    title?: string;
  }
): Promise<void> => {
  const { data, contextUser } = await fetchReportData(filters);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=attendance-report-${Date.now()}.pdf`
  );

  doc.pipe(res);

  // 1. Header Banner
  doc.rect(40, 40, 515, 65).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
    .text(filters.title || 'Smart Attendance System — Attendance Record', 55, 52);
  
  const subText = contextUser
    ? `${contextUser.role}: ${contextUser.name} | ${contextUser.department || 'Academic Department'} | Generated on ${new Date().toLocaleString('en-IN')}`
    : `Official Academic Report | Generated on ${new Date().toLocaleString('en-IN')}`;

  doc.fillColor('#94a3b8').fontSize(8.5).font('Helvetica')
    .text(subText, 55, 75);

  // Date Range sub-badge
  const dateRangeStr = filters.startDate && filters.endDate
    ? `Period: ${filters.startDate} to ${filters.endDate}`
    : `Period: All Available Records`;
  doc.fillColor('#cbd5e1').fontSize(8).font('Helvetica-Bold')
    .text(dateRangeStr, 55, 88);

  // 2. Summary Metrics Box
  const total = data.length;
  const present = data.filter((r) => r.status === 'PRESENT').length;
  const absent = data.filter((r) => r.status === 'ABSENT').length;
  const late = data.filter((r) => r.status === 'LATE').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  const startY = 120;
  doc.rect(40, startY, 515, 50).fill('#f8fafc');
  doc.rect(40, startY, 515, 50).stroke('#cbd5e1');

  // Metric 1: Total
  doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text('TOTAL LECTURES', 55, startY + 12);
  doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text(`${total}`, 55, startY + 24);

  // Metric 2: Present
  doc.fillColor('#16a34a').fontSize(7.5).font('Helvetica').text('PRESENT', 160, startY + 12);
  doc.fillColor('#16a34a').fontSize(13).font('Helvetica-Bold').text(`${present}`, 160, startY + 24);

  // Metric 3: Absent
  doc.fillColor('#dc2626').fontSize(7.5).font('Helvetica').text('ABSENT', 260, startY + 12);
  doc.fillColor('#dc2626').fontSize(13).font('Helvetica-Bold').text(`${absent}`, 260, startY + 24);

  // Metric 4: Late
  doc.fillColor('#d97706').fontSize(7.5).font('Helvetica').text('LATE', 360, startY + 12);
  doc.fillColor('#d97706').fontSize(13).font('Helvetica-Bold').text(`${late}`, 360, startY + 24);

  // Metric 5: Percentage
  doc.fillColor('#2563eb').fontSize(7.5).font('Helvetica').text('ATTENDANCE RATE', 440, startY + 12);
  doc.fillColor('#2563eb').fontSize(13).font('Helvetica-Bold').text(`${rate}%`, 440, startY + 24);

  // 3. Table Headers
  const tableTop = startY + 65;
  const colWidths = [120, 60, 155, 65, 60, 55];
  const headers = ['Student Name', 'Roll No', 'Course / Subject', 'Date', 'Status', 'Mode'];

  doc.rect(40, tableTop, 515, 22).fill('#e2e8f0');
  doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica-Bold');

  let x = 45;
  headers.forEach((h, i) => {
    doc.text(h, x, tableTop + 6, { width: colWidths[i], align: 'left' });
    x += colWidths[i]!;
  });

  // 4. Rows or Empty State
  if (data.length === 0) {
    const emptyY = tableTop + 30;
    doc.rect(40, emptyY, 515, 70).fill('#f8fafc');
    doc.rect(40, emptyY, 515, 70).stroke('#e2e8f0');

    doc.fillColor('#64748b').fontSize(11).font('Helvetica-Bold')
      .text('No Attendance Records Found', 40, emptyY + 20, { align: 'center', width: 515 });
    doc.fillColor('#94a3b8').fontSize(8.5).font('Helvetica')
      .text('There are no recorded present or absent attendances matching your selected date range or subject filter.', 40, emptyY + 38, { align: 'center', width: 515 });
  } else {
    let curY = tableTop + 24;
    doc.font('Helvetica').fontSize(8);

    for (let idx = 0; idx < data.length; idx++) {
      const row = data[idx];
      if (curY > 750) {
        doc.addPage();
        curY = 50;

        // Re-draw table header on next page
        doc.rect(40, curY, 515, 20).fill('#e2e8f0');
        doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica-Bold');
        let hx = 45;
        headers.forEach((h, i) => {
          doc.text(h, hx, curY + 5, { width: colWidths[i], align: 'left' });
          hx += colWidths[i]!;
        });
        curY += 24;
        doc.font('Helvetica').fontSize(8);
      }

      // Alternating row background
      if (idx % 2 === 0) {
        doc.rect(40, curY - 3, 515, 18).fill('#f8fafc');
      }

      x = 45;
      doc.fillColor('#0f172a');
      doc.text(row.studentName.substring(0, 22), x, curY, { width: colWidths[0] });
      x += colWidths[0]!;

      doc.text(row.rollNumber, x, curY, { width: colWidths[1] });
      x += colWidths[1]!;

      doc.text(row.subject.substring(0, 30), x, curY, { width: colWidths[2] });
      x += colWidths[2]!;

      doc.text(row.date, x, curY, { width: colWidths[3] });
      x += colWidths[3]!;

      // Highlight Status Badge
      const isPresent = row.status === 'PRESENT';
      const isAbsent = row.status === 'ABSENT';
      const statusColor = isPresent ? '#16a34a' : isAbsent ? '#dc2626' : '#d97706';

      doc.fillColor(statusColor).font('Helvetica-Bold')
        .text(row.status, x, curY, { width: colWidths[4] });
      doc.fillColor('#334155').font('Helvetica');
      x += colWidths[4]!;

      doc.text(row.markedType, x, curY, { width: colWidths[5] });

      curY += 18;
    }
  }

  doc.end();
  logger.info(`Generated PDF report with ${data.length} records`);
};

/**
 * Generate CSV Report with Excel-compatible UTF-8 BOM.
 */
export const generateCSVReport = async (
  res: Response,
  filters: {
    studentId?: string;
    teacherId?: string;
    subjectId?: string;
    department?: string;
    semester?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<void> => {
  const { data } = await fetchReportData(filters);

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'studentName', title: 'Student Name' },
      { id: 'rollNumber', title: 'Roll Number' },
      { id: 'department', title: 'Department' },
      { id: 'semester', title: 'Semester' },
      { id: 'subject', title: 'Subject' },
      { id: 'date', title: 'Date' },
      { id: 'status', title: 'Status' },
      { id: 'markedAt', title: 'Marked At' },
      { id: 'markedType', title: 'Method' },
    ],
  });

  const csvContent = '\uFEFF' + csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(data);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=attendance-report-${Date.now()}.csv`
  );
  res.send(csvContent);

  logger.info(`Generated CSV report with ${data.length} records`);
};
