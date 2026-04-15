// Your frontend registration form has:
// fullname
// email
// password
// confirm password
// role (student/admin)
// When someone clicks "Register":
// Frontend sends this to backend
// Now backend must:
// Validate data
// Remove confirmPassword (not stored)
// Hash password
// Save user in database

//User.js file defines how the user will be stored in MongoDB.


const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true, trim: true },
    username:{type:String,default:"",unique: true},
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, },
    bio:{type:String, default:""},
    skills:{type:[String],default:[]},
    role: { type: String, enum: ["student", "admin"], default: "student" },
    password: { type: String, required: function () { return !this.googleId; }, minlength: 8 },  // Only required for manual signup
    googleId: { type: String, unique: true, sparse: true },
    //enum is used so that only two values are used ...suppose someone tries to access the db and changes the role to hacker the db will reject it ..basic form of protection ...backend security
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    streak: {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        lastActiveDate: { type: Date }
    },
    activityDates: [
        {
            date: { type: Date },
            count: { type: Number, default: 1 }
        }
    ],
}, { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
// Model Constructor Function. is mongoose.model()
// Creates a model named "User"
// Automatically creates a collection named "users" (lowercase + plural)
// Connects schema to that collection