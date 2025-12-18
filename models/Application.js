const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
    applicantName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    position: {
        type: String,
        required: true
    },
    cvUrl: {
        type: String, 
        default: '#' 
    },
    status: {
        type: String,
        enum: ['Pending', 'Reviewed', 'Interview', 'Rejected', 'Hired'],
        default: 'Pending'
    },
    dateApplied: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Application', ApplicationSchema);
