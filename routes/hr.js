const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Payroll = require('../models/Payroll');
const Application = require('../models/Application');
const User = require('../models/User');

// Middleware to check if user is HR or SuperAdmin
const isHR = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role === 'superadmin' || user.designation.toLowerCase().includes('hr')) {
            next();
        } else {
            res.status(403).json({ msg: 'Access Denied: HR Only' });
        }
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

// @route   POST api/hr/payroll
// @desc    Generate a payslip (HR Only)
router.post('/payroll', auth, isHR, async (req, res) => {
    try {
        const { employeeId, month, year, amount } = req.body;
        
        const newPayroll = new Payroll({
            employee: employeeId,
            month,
            year,
            amount,
            generatedBy: req.user.id
        });

        await newPayroll.save();
        res.json(newPayroll);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/hr/payroll
// @desc    Get CURRENT user's payslips
router.get('/payroll', auth, async (req, res) => {
    try {
        const payslips = await Payroll.find({ employee: req.user.id }).sort({ dateGenerated: -1 });
        res.json(payslips);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/hr/applications
// @desc    Get all job applications (HR Only)
router.get('/applications', auth, isHR, async (req, res) => {
    try {
        const apps = await Application.find().sort({ dateApplied: -1 });
        res.json(apps);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/hr/seed-applicants
// @desc    Seed dummy applicants for testing
router.post('/seed-applicants', auth, isHR, async (req, res) => {
    try {
        await Application.deleteMany({});
        const dummyApps = [
            { applicantName: 'John Doe', email: 'john@gmail.com', position: 'Volunteer', status: 'Pending' },
            { applicantName: 'Jane Smith', email: 'jane@yahoo.com', position: 'Intern', status: 'Reviewed' }
        ];
        await Application.insertMany(dummyApps);
        res.json({ msg: 'Dummy applicants added' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
