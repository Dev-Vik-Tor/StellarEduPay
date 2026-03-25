'use strict';

const Student = require('../models/studentModel');
const FeeStructure = require('../models/feeStructureModel');
const { get, set, del, KEYS, TTL } = require('../cache');

// POST /api/students
async function registerStudent(req, res, next) {
  try {
    const { schoolId } = req; // injected by resolveSchool middleware
    const { studentId, name, class: className, feeAmount } = req.body;
    let { studentId, name, class: className, feeAmount } = req.body;
    if (!studentId) {
      const { generateStudentId } = require('../utils/generateStudentId');
      studentId = await generateStudentId();
    }

    let assignedFee = feeAmount;
    if (assignedFee == null && className) {
      const feeStructure = await FeeStructure.findOne({ schoolId, className, isActive: true });
      if (feeStructure) assignedFee = feeStructure.feeAmount;
    }

    if (assignedFee == null) {
      const err = new Error(
        `No fee amount provided and no fee structure found for class "${className}" in this school. ` +
        `Please create a fee structure first or provide feeAmount.`
      );
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const student = await Student.create({ studentId, name, class: className, feeAmount: assignedFee });
    // Invalidate student list cache since a new student was added
    del(KEYS.studentsAll());
    const student = await Student.create({ schoolId, studentId, name, class: className, feeAmount: assignedFee });
    res.status(201).json(student);
  } catch (err) {
    if (err.code === 11000) {
      const e = new Error('Student ID already exists in this school');
      e.code = 'DUPLICATE_STUDENT';
      e.status = 409;
      return next(e);
    }
    next(err);
  }
}

// GET /api/students
async function getAllStudents(req, res, next) {
  try {
    const cacheKey = KEYS.studentsAll();
    const cached = get(cacheKey);
    if (cached !== undefined) return res.json(cached);

    const students = await Student.find().sort({ createdAt: -1 });
    set(cacheKey, students, TTL.STUDENTS);
    const students = await Student.find({ schoolId: req.schoolId }).sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    next(err);
  }
}

// GET /api/students/:studentId
async function getStudent(req, res, next) {
  try {
    const { studentId } = req.params;
    const cacheKey = KEYS.student(studentId);
    const cached = get(cacheKey);
    if (cached !== undefined) return res.json(cached);

    const student = await Student.findOne({ studentId });
    const student = await Student.findOne({ schoolId: req.schoolId, studentId: req.params.studentId });
    if (!student) {
      const err = new Error('Student not found');
      err.code = 'NOT_FOUND';
      return next(err);
    }
    set(cacheKey, student, TTL.STUDENT);
    res.json(student);
  } catch (err) {
    next(err);
  }
}

// GET /api/students/summary
async function getPaymentSummary(req, res, next) {
  try {
    const Payment = require('../models/paymentModel');

    const [students, payments] = await Promise.all([
      Student.find({ schoolId: req.schoolId }).lean(),
      Payment.aggregate([
        { $match: { schoolId: req.schoolId, status: 'SUCCESS', isSuspicious: { $ne: true } } },
        { $group: { _id: '$studentId', totalPaid: { $sum: '$amount' } } },
      ]),
    ]);

    const paidMap = Object.fromEntries(payments.map(p => [p._id, p.totalPaid]));

    const summary = students.map(s => {
      const totalPaid = parseFloat((paidMap[s.studentId] || 0).toFixed(7));
      const remaining = parseFloat(Math.max(0, s.feeAmount - totalPaid).toFixed(7));
      const status = totalPaid === 0 ? 'unpaid'
        : totalPaid < s.feeAmount  ? 'partial'
        : totalPaid > s.feeAmount  ? 'overpaid'
        : 'paid';

      return {
        studentId:   s.studentId,
        name:        s.name,
        class:       s.class,
        feeAmount:   s.feeAmount,
        totalPaid,
        remaining,
        status,
      };
    });

    const counts = summary.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {});

    res.json({ total: students.length, counts, students: summary });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerStudent, getAllStudents, getStudent, getPaymentSummary };
