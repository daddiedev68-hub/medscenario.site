
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch((error) => console.error('❌ MongoDB Error:', error.message));

// ============ USER SCHEMA ============
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    subscription: { type: String, default: 'free' },
    subscriptionExpiry: { type: Date, default: null },
    points: { type: Number, default: 0 },
    completedScenarios: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Scenario' }],
    isAdmin: { type: Boolean, default: false },
    pendingPayment: {
        transaction_id: String,
        phone_number: String,
        amount: Number,
        status: String,
        requestedAt: Date,
        approvedAt: Date
    },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// ============ DISEASE SCHEMA ============
const DiseaseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    year: { type: String, default: 'L5' },
    overview: { type: String, required: true },
    symptoms: [String],
    signs: [String],
    ddx: [String],
    ix: [String],
    treatment: String,
    complication: [String],
    prevention: String,
    epidemiology: String,
    createdAt: { type: Date, default: Date.now }
});

const Disease = mongoose.model('Disease', DiseaseSchema);

// ============ SCENARIO SCHEMA ============
const ScenarioSchema = new mongoose.Schema({
    title: { type: String, required: true },
    specialty: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Moderate', 'Hard'], default: 'Moderate' },
    level: { type: String, enum: ['L5', 'L6'], default: 'L5' },
    timeLimit: { type: Number, default: 10 },
    description: String,
    casePresentation: { type: String, required: true },
    options: [String],
    correctAnswer: { type: String, required: true },
    explanation: String,
    topicOverview: String,
    attempts: { type: Number, default: 0 },
    completions: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const Scenario = mongoose.model('Scenario', ScenarioSchema);

// ============ REGULAR COMPETITION SCHEMA ============
const CompetitionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, enum: ['weekly', 'sponsored', 'college', 'vsAI'], required: true },
    badge: String,
    prize: String,
    participants: { type: Number, default: 0 },
    spotsLeft: Number,
    deadline: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const Competition = mongoose.model('Competition', CompetitionSchema);

// ============ AUTOMATED COMPETITION SCHEMAS (NEW) ============

// Competition Question Schema
const CompetitionQuestionSchema = new mongoose.Schema({
    competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AutomatedCompetition' },
    questionNumber: Number,
    text: String,
    options: [String],
    correctAnswer: String,
    points: { type: Number, default: 200 }
});

const CompetitionQuestion = mongoose.model('CompetitionQuestion', CompetitionQuestionSchema);

// Automated Competition Schema
const AutomatedCompetitionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: String,
    entryFee: { type: Number, default: 500 },
    prizePool: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 20 },
    pointsPerQuestion: { type: Number, default: 200 },
    timePerQuestion: { type: Number, default: 60 },
    scheduledTime: { type: Date, required: true },
    status: { 
        type: String, 
        enum: ['upcoming', 'reminder_sent', 'active', 'ended', 'cancelled'], 
        default: 'upcoming' 
    },
    participants: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        phoneNumber: String,
        lives: { type: Number, default: 2 },
        score: { type: Number, default: 0 },
        currentQuestion: { type: Number, default: 0 },
        eliminated: { type: Boolean, default: false },
        joinedAt: Date,
        answers: [{
            questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompetitionQuestion' },
            selectedAnswer: String,
            isCorrect: Boolean,
            pointsEarned: { type: Number, default: 0 },
            answeredAt: Date
        }]
    }],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    winnerPrize: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reminderSent: { type: Boolean, default: false },
    startedAt: Date,
    endedAt: Date,
    createdAt: { type: Date, default: Date.now }
});

const AutomatedCompetition = mongoose.model('AutomatedCompetition', AutomatedCompetitionSchema);

// ============ TASKS SYSTEM SCHEMAS ============

// Task Schema (predefined tasks)
const TaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['daily', 'weekly'], required: true },
    target: { type: String, enum: ['scenarios', 'points', 'login', 'competition', 'correct_answers', 'streak'], required: true },
    requiredAmount: { type: Number, default: 1 },
    rewardPoints: { type: Number, default: 50 },
    rewardBadge: String,
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
});

const Task = mongoose.model('Task', TaskSchema);

// User Task Progress Schema
const UserTaskProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    rewarded: { type: Boolean, default: false },
    date: { type: String, required: true }
});

const UserTaskProgress = mongoose.model('UserTaskProgress', UserTaskProgressSchema);

// User Stats Schema (for tracking)
const UserStatsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
    totalScenariosCompleted: { type: Number, default: 0 },
    totalCorrectAnswers: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    currentLoginStreak: { type: Number, default: 0 },
    longestLoginStreak: { type: Number, default: 0 },
    lastLoginDate: { type: String, default: '' },
    badges: [String],
    level: { type: Number, default: 1 },
    rank: { type: String, default: 'Medical Student' }
});

const UserStats = mongoose.model('UserStats', UserStatsSchema);

// ============ NOTIFICATION SCHEMA ============
const NotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['achievement', 'task', 'competition', 'payment', 'system'], default: 'system' },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    data: { type: mongoose.Schema.Types.Mixed }
});

const Notification = mongoose.model('Notification', NotificationSchema);

// ============ HELPER FUNCTIONS ============
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

// Helper function to create notification
async function createNotification(userId, title, message, type, data = {}) {
    try {
        const notification = new Notification({
            userId,
            title,
            message,
            type,
            data
        });
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}

// ============ ADMIN MIDDLEWARE ============
const adminMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// ============ TASKS HELPER FUNCTIONS ============
function getCurrentDateKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function getCurrentWeekKey() {
    const now = new Date();
    const year = now.getFullYear();
    const start = new Date(year, 0, 1);
    const week = Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7);
    return `${year}-W${week}`;
}

// Initialize user stats
async function initUserStats(userId) {
    let stats = await UserStats.findOne({ userId });
    if (!stats) {
        stats = new UserStats({ userId });
        await stats.save();
    }
    return stats;
}

// Update user progress when completing a scenario
async function updateUserProgress(userId, scenarioId, isCorrect) {
    let stats = await UserStats.findOne({ userId });
    if (!stats) {
        stats = new UserStats({ userId });
        await stats.save();
    }
    
    stats.totalScenariosCompleted += 1;
    if (isCorrect) stats.totalCorrectAnswers += 1;
    
    const user = await User.findById(userId);
    stats.totalPoints = user.points;
    
    await stats.save();
    
    const todayKey = getCurrentDateKey();
    const weekKey = getCurrentWeekKey();
    
    const dailyTasks = await Task.find({ type: 'daily', isActive: true });
    for (const task of dailyTasks) {
        let progress = await UserTaskProgress.findOne({
            userId, taskId: task._id, date: todayKey
        });
        
        if (!progress && !progress?.completed) {
            progress = new UserTaskProgress({
                userId, taskId: task._id, progress: 0, date: todayKey
            });
        }
        
        if (!progress.completed) {
            if (task.target === 'scenarios') {
                progress.progress += 1;
            } else if (task.target === 'correct_answers' && isCorrect) {
                progress.progress += 1;
            }
            
            if (progress.progress >= task.requiredAmount && !progress.completed) {
                progress.completed = true;
                progress.completedAt = new Date();
                await createNotification(userId, '🎉 Task Completed!', `You completed "${task.title}"! Claim your reward of ${task.rewardPoints} points.`, 'task', { taskId: task._id, rewardPoints: task.rewardPoints });
            }
            await progress.save();
        }
    }
    
    const weeklyTasks = await Task.find({ type: 'weekly', isActive: true });
    for (const task of weeklyTasks) {
        let progress = await UserTaskProgress.findOne({
            userId, taskId: task._id, date: weekKey
        });
        
        if (!progress && !progress?.completed) {
            progress = new UserTaskProgress({
                userId, taskId: task._id, progress: 0, date: weekKey
            });
        }
        
        if (!progress.completed) {
            if (task.target === 'scenarios') {
                progress.progress += 1;
            } else if (task.target === 'correct_answers' && isCorrect) {
                progress.progress += 1;
            }
            
            if (progress.progress >= task.requiredAmount && !progress.completed) {
                progress.completed = true;
                progress.completedAt = new Date();
                await createNotification(userId, '🎉 Weekly Task Completed!', `You completed "${task.title}"! Claim your reward of ${task.rewardPoints} points.`, 'task', { taskId: task._id, rewardPoints: task.rewardPoints });
            }
            await progress.save();
        }
    }
}

// Update login streak
async function updateLoginStreak(userId) {
    let stats = await UserStats.findOne({ userId });
    if (!stats) {
        stats = new UserStats({ userId });
    }
    
    const todayKey = getCurrentDateKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
    
    if (stats.lastLoginDate === yesterdayKey) {
        stats.currentLoginStreak += 1;
    } else if (stats.lastLoginDate !== todayKey) {
        stats.currentLoginStreak = 1;
    }
    
    if (stats.currentLoginStreak > stats.longestLoginStreak) {
        stats.longestLoginStreak = stats.currentLoginStreak;
    }
    
    stats.lastLoginDate = todayKey;
    await stats.save();
    
    const todayKeyForTask = getCurrentDateKey();
    const loginTasks = await Task.find({ target: 'streak', isActive: true });
    for (const task of loginTasks) {
        if (stats.currentLoginStreak >= task.requiredAmount) {
            let progress = await UserTaskProgress.findOne({
                userId, taskId: task._id, date: todayKeyForTask
            });
            if (!progress) {
                progress = new UserTaskProgress({
                    userId, taskId: task._id, progress: stats.currentLoginStreak, completed: true,
                    completedAt: new Date(), date: todayKeyForTask
                });
                await progress.save();
                await createNotification(userId, '🔥 Streak Milestone!', `You've logged in for ${stats.currentLoginStreak} days in a row!`, 'achievement', { streak: stats.currentLoginStreak });
            }
        }
    }
}

// ============ API ROUTES ============

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'MedScenario API is running!' });
});

// ============ USER AUTH ROUTES ============

// REGISTER API
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        console.log('Register attempt:', { name, email });
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        const hashedPassword = await hashPassword(password);
        
        const user = new User({
            name: name,
            email: email,
            password: hashedPassword
        });
        
        await user.save();
        
        await initUserStats(user._id);
        
        console.log('User created:', user._id);
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE
        });
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                subscription: user.subscription,
                points: user.points,
                completedScenarios: user.completedScenarios || [],
                isAdmin: user.isAdmin || false
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: error.message });
    }
});

// LOGIN API
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Login attempt:', email);
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        await updateLoginStreak(user._id);
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE
        });
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                subscription: user.subscription,
                points: user.points,
                completedScenarios: user.completedScenarios || [],
                isAdmin: user.isAdmin || false
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a user
app.delete('/api/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ USER PROFILE API ROUTES ============

// GET user profile (protected)
app.get('/api/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        const stats = await UserStats.findOne({ userId: user._id });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({ 
            success: true, 
            user: {
                ...user.toObject(),
                stats: stats || {}
            }
        });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

// UPDATE user profile
app.put('/api/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { name } = req.body;
        
        const user = await User.findByIdAndUpdate(
            decoded.id,
            { name },
            { new: true }
        ).select('-password');
        
        res.json({ success: true, user });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

// ADD POINTS to user (when completing a scenario) - WITH ACHIEVEMENTS & NOTIFICATIONS
app.post('/api/profile/add-points', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { points, scenarioId } = req.body;
        
        const user = await User.findById(decoded.id);
        const previousPoints = user.points;
        user.points += points;
        
        let bonusPoints = 0;
        let achievementMessage = null;
        let milestone = null;
        
        if (scenarioId && !user.completedScenarios?.includes(scenarioId)) {
            if (!user.completedScenarios) user.completedScenarios = [];
            user.completedScenarios.push(scenarioId);
            const completedCount = user.completedScenarios.length;
            
            // Check for achievement milestones (5, 10, 25, 50, 100)
            const milestones = [5, 10, 25, 50, 100];
            if (milestones.includes(completedCount)) {
                bonusPoints = completedCount * 10;
                user.points += bonusPoints;
                milestone = completedCount;
                achievementMessage = `🎉 ACHIEVEMENT UNLOCKED! You've completed ${completedCount} scenarios! Bonus: +${bonusPoints} points!`;
                
                // Create notification
                await createNotification(
                    user._id,
                    '🏆 Achievement Unlocked!',
                    `You've completed ${completedCount} scenarios! Awarded ${bonusPoints} bonus points!`,
                    'achievement',
                    { milestone: completedCount, bonusPoints: bonusPoints }
                );
            }
            
            // Update task progress
            await updateUserProgress(decoded.id, scenarioId, true);
        }
        
        await user.save();
        
        let stats = await UserStats.findOne({ userId: user._id });
        if (stats) {
            stats.totalPoints = user.points;
            await stats.save();
        }
        
        res.json({ 
            success: true, 
            points: user.points,
            bonusPoints: bonusPoints,
            achievementMessage: achievementMessage,
            milestone: milestone
        });
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
});

// ============ NOTIFICATION API ROUTES ============

// Get user's notifications
app.get('/api/notifications', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const notifications = await Notification.find({ userId: decoded.id })
            .sort({ createdAt: -1 })
            .limit(50);
        
        res.json({ success: true, notifications });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: decoded.id },
            { isRead: true },
            { new: true }
        );
        
        res.json({ success: true, notification });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await Notification.updateMany(
            { userId: decoded.id, isRead: false },
            { isRead: true }
        );
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ TASKS API ROUTES ============

// Get predefined tasks
app.get('/api/tasks', async (req, res) => {
    try {
        let tasks = await Task.find({ isActive: true }).sort({ order: 1 });
        
        if (tasks.length === 0) {
            const defaultTasks = [
                { title: "Daily Learner", description: "Complete 1 scenario", type: "daily", target: "scenarios", requiredAmount: 1, rewardPoints: 50, order: 1 },
                { title: "Daily Scholar", description: "Complete 3 scenarios", type: "daily", target: "scenarios", requiredAmount: 3, rewardPoints: 150, order: 2 },
                { title: "Perfect Score", description: "Get 5 correct answers", type: "daily", target: "correct_answers", requiredAmount: 5, rewardPoints: 100, order: 3 },
                { title: "Weekly Champion", description: "Complete 10 scenarios this week", type: "weekly", target: "scenarios", requiredAmount: 10, rewardPoints: 500, order: 1 },
                { title: "Weekly Expert", description: "Get 20 correct answers this week", type: "weekly", target: "correct_answers", requiredAmount: 20, rewardPoints: 400, order: 2 },
                { title: "Login Streak", description: "Login for 7 days in a row", type: "weekly", target: "streak", requiredAmount: 7, rewardPoints: 300, order: 3 }
            ];
            tasks = await Task.insertMany(defaultTasks);
        }
        
        res.json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's tasks with progress
app.get('/api/tasks/my-tasks', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        
        const tasks = await Task.find({ isActive: true }).sort({ order: 1 });
        const todayKey = getCurrentDateKey();
        const weekKey = getCurrentWeekKey();
        
        const tasksWithProgress = await Promise.all(tasks.map(async (task) => {
            const dateKey = task.type === 'daily' ? todayKey : weekKey;
            let progress = await UserTaskProgress.findOne({
                userId, taskId: task._id, date: dateKey
            });
            
            return {
                _id: task._id,
                title: task.title,
                description: task.description,
                type: task.type,
                target: task.target,
                requiredAmount: task.requiredAmount,
                rewardPoints: task.rewardPoints,
                progress: progress ? progress.progress : 0,
                completed: progress ? progress.completed : false,
                rewarded: progress ? progress.rewarded : false
            };
        }));
        
        res.json({ success: true, tasks: tasksWithProgress });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Claim task reward
app.post('/api/tasks/claim', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { taskId } = req.body;
        
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        const dateKey = task.type === 'daily' ? getCurrentDateKey() : getCurrentWeekKey();
        const progress = await UserTaskProgress.findOne({
            userId: decoded.id, taskId, date: dateKey
        });
        
        if (!progress || !progress.completed || progress.rewarded) {
            return res.status(400).json({ message: 'Reward not available' });
        }
        
        const user = await User.findById(decoded.id);
        user.points += task.rewardPoints;
        await user.save();
        
        progress.rewarded = true;
        await progress.save();
        
        await createNotification(decoded.id, '💰 Reward Claimed!', `You claimed ${task.rewardPoints} points for completing "${task.title}"!`, 'task', { taskId, rewardPoints: task.rewardPoints });
        
        res.json({
            success: true,
            message: `Claimed ${task.rewardPoints} points!`,
            points: user.points,
            rewardPoints: task.rewardPoints
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user stats (level, rank, streak)
app.get('/api/user-stats', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let stats = await UserStats.findOne({ userId: decoded.id });
        
        if (!stats) {
            stats = await initUserStats(decoded.id);
        }
        
        const user = await User.findById(decoded.id);
        const points = user.points;
        
        let level = 1;
        let rank = 'Medical Student';
        
        if (points >= 12001) { level = 6; rank = 'Consultant'; }
        else if (points >= 7001) { level = 5; rank = 'Specialist'; }
        else if (points >= 3501) { level = 4; rank = 'Senior Resident'; }
        else if (points >= 1501) { level = 3; rank = 'Resident'; }
        else if (points >= 501) { level = 2; rank = 'Intern'; }
        
        res.json({
            success: true,
            stats: {
                ...stats.toObject(),
                currentPoints: points,
                level,
                rank,
                nextLevelPoints: level === 6 ? null : level === 1 ? 501 : level === 2 ? 1501 : level === 3 ? 3501 : level === 4 ? 7001 : 12001
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ DISEASE API ROUTES ============

// GET all diseases
app.get('/api/diseases', async (req, res) => {
    try {
        const diseases = await Disease.find().sort({ createdAt: -1 });
        res.json({ success: true, diseases });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET single disease by ID
app.get('/api/diseases/:id', async (req, res) => {
    try {
        const disease = await Disease.findById(req.params.id);
        if (!disease) return res.status(404).json({ message: 'Disease not found' });
        res.json({ success: true, disease });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST - Add new disease (Admin only)
app.post('/api/diseases', adminMiddleware, async (req, res) => {
    try {
        const disease = new Disease(req.body);
        await disease.save();
        res.status(201).json({ success: true, disease });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE - Remove disease (Admin only)
app.delete('/api/diseases/:id', adminMiddleware, async (req, res) => {
    try {
        await Disease.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Disease deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ SCENARIO API ROUTES ============

// GET all scenarios
app.get('/api/scenarios', async (req, res) => {
    try {
        const scenarios = await Scenario.find().sort({ createdAt: -1 });
        res.json({ success: true, scenarios });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET single scenario by ID
app.get('/api/scenarios/:id', async (req, res) => {
    try {
        const scenario = await Scenario.findById(req.params.id);
        if (!scenario) return res.status(404).json({ message: 'Scenario not found' });
        res.json({ success: true, scenario });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST - Add new scenario (Admin only)
app.post('/api/scenarios', adminMiddleware, async (req, res) => {
    try {
        const scenario = new Scenario(req.body);
        await scenario.save();
        res.status(201).json({ success: true, scenario });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE - Remove scenario (Admin only)
app.delete('/api/scenarios/:id', adminMiddleware, async (req, res) => {
    try {
        await Scenario.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Scenario deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ REGULAR COMPETITION API ROUTES ============

// GET all competitions
app.get('/api/competitions', async (req, res) => {
    try {
        const competitions = await Competition.find().sort({ createdAt: -1 });
        res.json({ success: true, competitions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET competitions by category
app.get('/api/competitions/category/:category', async (req, res) => {
    try {
        const competitions = await Competition.find({ category: req.params.category });
        res.json({ success: true, competitions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST - Add new competition (Admin only)
app.post('/api/competitions', adminMiddleware, async (req, res) => {
    try {
        const competition = new Competition(req.body);
        await competition.save();
        res.status(201).json({ success: true, competition });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT - Update competition (join)
app.put('/api/competitions/join/:id', async (req, res) => {
    try {
        const competition = await Competition.findById(req.params.id);
        if (!competition) return res.status(404).json({ message: 'Competition not found' });
        
        competition.participants += 1;
        competition.spotsLeft -= 1;
        await competition.save();
        
        res.json({ success: true, message: 'Joined competition!', competition });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE - Remove competition (Admin only)
app.delete('/api/competitions/:id', adminMiddleware, async (req, res) => {
    try {
        await Competition.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Competition deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ LEADERBOARD API ============

app.get('/api/leaderboard', async (req, res) => {
    try {
        const leaderboard = await User.find()
            .select('name points')
            .sort({ points: -1 })
            .limit(10);
        res.json({ success: true, leaderboard });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ ADMIN CHECK API ============

app.get('/api/admin/check', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.json({ isAdmin: false });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        res.json({ isAdmin: user?.isAdmin || false });
    } catch (error) {
        res.json({ isAdmin: false });
    }
});

// ============ ADMIN API ROUTES ============

app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalDiseases = await Disease.countDocuments();
        const totalScenarios = await Scenario.countDocuments();
        const totalCompetitions = await Competition.countDocuments();
        
        res.json({
            success: true,
            stats: { totalUsers, totalDiseases, totalScenarios, totalCompetitions }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/recent-users', adminMiddleware, async (req, res) => {
    try {
        const users = await User.find()
            .select('name email points createdAt')
            .sort({ createdAt: -1 })
            .limit(5);
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/users', adminMiddleware, async (req, res) => {
    try {
        const users = await User.find()
            .select('name email points subscription createdAt completedScenarios')
            .sort({ points: -1 });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ SUBSCRIPTION API ROUTES ============

app.get('/api/subscription/plans', (req, res) => {
    res.json({
        success: true,
        plans: [
            {
                id: 'free',
                name: 'Free Plan',
                price: 0,
                priceTZS: 'Free',
                features: ['Access to free scenarios', 'Basic disease library', 'View leaderboard']
            },
            {
                id: 'premium_monthly',
                name: 'Premium Monthly',
                price: 3000,
                priceTZS: 'TZS 3,000',
                features: ['✅ Unlimited scenarios', '✅ Full disease library', '✅ All competitions', '✅ Priority support']
            }
        ]
    });
});

app.get('/api/subscription/status', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.json({ isPremium: false, subscription: 'free' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        const isPremium = user.subscription === 'premium';
        const isExpired = user.subscriptionExpiry && new Date() > user.subscriptionExpiry;
        
        res.json({
            isPremium: isPremium && !isExpired,
            subscription: user.subscription,
            expiry: user.subscriptionExpiry,
            points: user.points
        });
    } catch (error) {
        res.json({ isPremium: false, subscription: 'free' });
    }
});

// ============ MANUAL PAYMENT SYSTEM ============

// User submits payment request
app.post('/api/payment/request-upgrade', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { transactionId, phoneNumber } = req.body;
        
        if (!transactionId) {
            return res.status(400).json({ message: 'Transaction ID required' });
        }
        
        const user = await User.findById(decoded.id);
        
        if (user.subscription === 'premium') {
            return res.status(400).json({ message: 'Already a premium member!' });
        }
        
        user.pendingPayment = {
            transaction_id: transactionId,
            phone_number: phoneNumber,
            amount: 3000,
            status: 'pending',
            requestedAt: new Date()
        };
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Payment request submitted! Admin will verify within 24 hours.'
        });
    } catch (error) {
        console.error('Payment request error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Admin: Get all pending payment requests
app.get('/api/admin/pending-payments', adminMiddleware, async (req, res) => {
    try {
        const users = await User.find({ 'pendingPayment.status': 'pending' })
            .select('name email pendingPayment createdAt');
        res.json({ success: true, payments: users });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin: Approve payment and upgrade user
app.post('/api/admin/approve-payment', adminMiddleware, async (req, res) => {
    try {
        const { userId } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        
        user.subscription = 'premium';
        user.subscriptionExpiry = expiryDate;
        user.pendingPayment.status = 'approved';
        user.pendingPayment.approvedAt = new Date();
        
        await user.save();
        
        await createNotification(userId, '✨ Premium Activated!', 'Your premium subscription has been activated. Enjoy unlimited access!', 'payment', {});
        
        res.json({
            success: true,
            message: `${user.name} upgraded to premium!`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin: Reject payment request
app.post('/api/admin/reject-payment', adminMiddleware, async (req, res) => {
    try {
        const { userId } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        user.pendingPayment.status = 'rejected';
        await user.save();
        
        await createNotification(userId, '❌ Payment Request Rejected', 'Your payment request was rejected. Please submit a valid transaction ID.', 'payment', {});
        
        res.json({
            success: true,
            message: `Payment request rejected`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ PAYMENT HISTORY API ============

// Admin: Get all payment history (approved and rejected)
app.get('/api/admin/payment-history', adminMiddleware, async (req, res) => {
    try {
        const users = await User.find({ 
            'pendingPayment.status': { $in: ['approved', 'rejected'] }
        }).select('name email pendingPayment');
        
        const paymentHistory = users.map(user => ({
            name: user.name,
            email: user.email,
            transaction_id: user.pendingPayment?.transaction_id,
            phone_number: user.pendingPayment?.phone_number,
            amount: user.pendingPayment?.amount || 3000,
            status: user.pendingPayment?.status,
            date: user.pendingPayment?.approvedAt || user.pendingPayment?.requestedAt
        }));
        
        res.json({ success: true, payments: paymentHistory });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ AUTOMATED COMPETITION API ROUTES (NEW) ============

// Get all upcoming competitions for users
app.get('/api/competitions/upcoming', async (req, res) => {
    try {
        const competitions = await AutomatedCompetition.find({ 
            status: 'upcoming',
            scheduledTime: { $gt: new Date() }
        }).sort({ scheduledTime: 1 });
        res.json({ success: true, competitions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Join a competition
app.post('/api/competitions/join/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        const competition = await AutomatedCompetition.findById(req.params.id);
        
        if (!competition) return res.status(404).json({ message: 'Competition not found' });
        if (competition.status !== 'upcoming') return res.status(400).json({ message: 'Competition already started or ended' });
        
        const alreadyJoined = competition.participants.some(p => p.userId.toString() === user._id.toString());
        if (alreadyJoined) return res.status(400).json({ message: 'Already joined' });
        
        if (user.points < competition.entryFee) {
            return res.status(400).json({ 
                message: `Insufficient points. Need ${competition.entryFee} points to join.`
            });
        }
        
        user.points -= competition.entryFee;
        await user.save();
        
        competition.participants.push({
            userId: user._id,
            phoneNumber: req.body.phoneNumber || user.phone,
            lives: 2,
            score: 0,
            currentQuestion: 0,
            eliminated: false,
            joinedAt: new Date()
        });
        
        competition.prizePool += competition.entryFee;
        await competition.save();
        
        res.json({
            success: true,
            message: `Joined competition! Entry fee: ${competition.entryFee} points deducted.`,
            remainingPoints: user.points
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get competition status
app.get('/api/competitions/status/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const competition = await AutomatedCompetition.findById(req.params.id);
        
        if (!competition) return res.status(404).json({ message: 'Competition not found' });
        
        const participant = competition.participants.find(p => p.userId.toString() === decoded.id);
        
        res.json({
            success: true,
            status: competition.status,
            scheduledTime: competition.scheduledTime,
            isParticipant: !!participant,
            participantData: participant ? {
                lives: participant.lives,
                score: participant.score,
                eliminated: participant.eliminated
            } : null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get live question
app.get('/api/competitions/question/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const competition = await AutomatedCompetition.findById(req.params.id);
        
        if (!competition) return res.status(404).json({ message: 'Competition not found' });
        if (competition.status !== 'active') return res.status(400).json({ message: 'Competition not active' });
        
        const participant = competition.participants.find(p => p.userId.toString() === decoded.id);
        if (!participant || participant.eliminated) {
            return res.json({ eliminated: true, finalScore: participant?.score || 0 });
        }
        
        const currentQNumber = participant.currentQuestion + 1;
        
        if (currentQNumber > competition.totalQuestions) {
            return res.json({ completed: true, finalScore: participant.score });
        }
        
        const question = await CompetitionQuestion.findOne({
            competitionId: competition._id,
            questionNumber: currentQNumber
        });
        
        res.json({
            success: true,
            question: {
                number: question.questionNumber,
                text: question.text,
                options: question.options,
                points: competition.pointsPerQuestion,
                timeLimit: competition.timePerQuestion
            },
            lives: participant.lives,
            currentScore: participant.score,
            totalQuestions: competition.totalQuestions,
            currentQuestionNumber: currentQNumber
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Submit answer
app.post('/api/competitions/submit/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { questionNumber, selectedAnswer } = req.body;
        const competition = await AutomatedCompetition.findById(req.params.id);
        
        if (!competition || competition.status !== 'active') {
            return res.status(400).json({ message: 'Competition not active' });
        }
        
        const participant = competition.participants.find(p => p.userId.toString() === decoded.id);
        if (!participant || participant.eliminated) {
            return res.status(400).json({ message: 'Not eligible' });
        }
        
        const question = await CompetitionQuestion.findOne({
            competitionId: competition._id,
            questionNumber: questionNumber
        });
        
        const isCorrect = question.correctAnswer === selectedAnswer;
        const pointsEarned = isCorrect ? competition.pointsPerQuestion : 0;
        
        participant.answers.push({
            questionId: question._id,
            selectedAnswer,
            isCorrect,
            pointsEarned,
            answeredAt: new Date()
        });
        
        if (isCorrect) {
            participant.score += pointsEarned;
            const user = await User.findById(decoded.id);
            user.points += pointsEarned;
            await user.save();
        } else {
            participant.lives -= 1;
            if (participant.lives <= 0) {
                participant.eliminated = true;
            }
        }
        
        participant.currentQuestion = questionNumber;
        await competition.save();
        
        // Check for winner
        const activeParticipants = competition.participants.filter(p => !p.eliminated);
        
        if (activeParticipants.length === 1 && participant.currentQuestion >= competition.totalQuestions) {
            competition.status = 'ended';
            competition.winner = activeParticipants[0].userId;
            competition.winnerPrize = competition.prizePool;
            competition.endedAt = new Date();
            await competition.save();
            
            const winner = await User.findById(competition.winner);
            winner.points += competition.prizePool;
            await winner.save();
        }
        
        res.json({
            success: true,
            isCorrect,
            correctAnswer: isCorrect ? null : question.correctAnswer,
            pointsEarned,
            livesLeft: participant.lives,
            eliminated: participant.eliminated,
            score: participant.score,
            nextQuestion: participant.currentQuestion + 1,
            competitionEnded: competition.status === 'ended',
            isWinner: competition.winner?.toString() === decoded.id,
            winnerPrize: competition.winnerPrize
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Auto-start competitions (runs every minute)
setInterval(async () => {
    const now = new Date();
    const competitions = await AutomatedCompetition.find({
        status: 'upcoming',
        scheduledTime: { $lte: now }
    });
    
    for (const comp of competitions) {
        comp.status = 'active';
        comp.startedAt = now;
        await comp.save();
        console.log(`🎮 Competition started: ${comp.name}`);
    }
}, 60000);

// UPDATE disease (PUT)
app.put('/api/diseases/:id', adminMiddleware, async (req, res) => {
    try {
        const disease = await Disease.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!disease) return res.status(404).json({ message: 'Disease not found' });
        res.json({ success: true, disease });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// UPDATE scenario (PUT)
app.put('/api/scenarios/:id', adminMiddleware, async (req, res) => {
    try {
        const scenario = await Scenario.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!scenario) return res.status(404).json({ message: 'Scenario not found' });
        res.json({ success: true, scenario });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ AUTOMATED COMPETITION SYSTEM ============

// CREATE automated competition (admin)
app.post('/api/auto-competitions', adminMiddleware, async (req, res) => {
    try {
        const { name, category, description, totalQuestions, timePerQuestion, 
                scheduledTime, entryFee, pointsPerQuestion, lives } = req.body;
        
        const competition = new AutomatedCompetition({
            name,
            category: category || 'weekly',
            description,
            totalQuestions: totalQuestions || 20,
            timePerQuestion: timePerQuestion || 60,
            scheduledTime: new Date(scheduledTime),
            entryFee: entryFee || 500,
            pointsPerQuestion: pointsPerQuestion || 200,
            lives: lives || 2,
            prizePool: 0,
            status: 'upcoming',
            createdBy: req.user._id
        });
        
        await competition.save();
        res.json({ success: true, competition });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET all auto competitions (admin)
app.get('/api/auto-competitions', adminMiddleware, async (req, res) => {
    try {
        const competitions = await AutomatedCompetition.find().sort({ scheduledTime: -1 });
        res.json({ success: true, competitions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET upcoming auto competitions for users
app.get('/api/auto-competitions/upcoming', async (req, res) => {
    try {
        const competitions = await AutomatedCompetition.find({ 
            status: 'upcoming',
            scheduledTime: { $gt: new Date() }
        }).sort({ scheduledTime: 1 });
        res.json({ success: true, competitions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ADD questions to auto competition
app.post('/api/auto-competitions/:id/questions', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { questions } = req.body;
        
        const competition = await AutomatedCompetition.findById(id);
        if (!competition) {
            return res.status(404).json({ message: 'Competition not found' });
        }
        
        // Delete existing questions
        await CompetitionQuestion.deleteMany({ competitionId: id });
        
        // Add new questions
        const questionDocs = questions.map((q, index) => ({
            competitionId: id,
            questionNumber: index + 1,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: competition.pointsPerQuestion || 200
        }));
        
        await CompetitionQuestion.insertMany(questionDocs);
        
        res.json({ success: true, message: `${questions.length} questions added` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET competition questions
app.get('/api/auto-competitions/:id/questions', async (req, res) => {
    try {
        const { id } = req.params;
        const questions = await CompetitionQuestion.find({ competitionId: id }).sort({ questionNumber: 1 });
        res.json({ success: true, questions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// JOIN auto competition
app.post('/api/auto-competitions/:id/join', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        const competition = await AutomatedCompetition.findById(req.params.id);
        
        if (!competition) return res.status(404).json({ message: 'Competition not found' });
        if (competition.status !== 'upcoming') {
            return res.status(400).json({ message: 'Competition already started or ended' });
        }
        
        const alreadyJoined = competition.participants.some(p => p.userId.toString() === user._id.toString());
        if (alreadyJoined) return res.status(400).json({ message: 'Already joined' });
        
        if (user.points < competition.entryFee) {
            return res.status(400).json({ message: `Insufficient points! Need ${competition.entryFee} points.` });
        }
        
        // Deduct entry fee
        user.points -= competition.entryFee;
        await user.save();
        
        // Add participant
        competition.participants.push({
            userId: user._id,
            phoneNumber: req.body.phoneNumber || '',
            lives: competition.lives || 2,
            score: 0,
            currentQuestion: 0,
            eliminated: false,
            joinedAt: new Date()
        });
        
        competition.prizePool += competition.entryFee;
        await competition.save();
        
        res.json({ 
            success: true, 
            message: `Joined! Entry fee: ${competition.entryFee} points deducted.`,
            remainingPoints: user.points
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET competition status
app.get('/api/auto-competitions/:id/status', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const competition = await AutomatedCompetition.findById(req.params.id);
        
        if (!competition) return res.status(404).json({ message: 'Competition not found' });
        
        const participant = competition.participants.find(p => p.userId.toString() === decoded.id);
        
        res.json({
            success: true,
            status: competition.status,
            scheduledTime: competition.scheduledTime,
            isParticipant: !!participant,
            participantData: participant ? {
                lives: participant.lives,
                score: participant.score,
                eliminated: participant.eliminated,
                currentQuestion: participant.currentQuestion
            } : null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET current question for playing
app.get('/api/auto-competitions/:id/play', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const competition = await AutomatedCompetition.findById(req.params.id);
        
        if (!competition) return res.status(404).json({ message: 'Competition not found' });
        if (competition.status !== 'active') {
            return res.status(400).json({ message: 'Competition not active yet' });
        }
        
        const participant = competition.participants.find(p => p.userId.toString() === decoded.id);
        if (!participant) return res.status(403).json({ message: 'Not registered' });
        if (participant.eliminated) {
            return res.json({ eliminated: true, finalScore: participant.score });
        }
        
        const nextQuestionNum = participant.currentQuestion + 1;
        
        if (nextQuestionNum > competition.totalQuestions) {
            return res.json({ completed: true, finalScore: participant.score });
        }
        
        const question = await CompetitionQuestion.findOne({
            competitionId: competition._id,
            questionNumber: nextQuestionNum
        });
        
        res.json({
            success: true,
            question: {
                number: question.questionNumber,
                text: question.text,
                options: question.options,
                points: competition.pointsPerQuestion,
                timeLimit: competition.timePerQuestion
            },
            lives: participant.lives,
            currentScore: participant.score,
            totalQuestions: competition.totalQuestions,
            currentQuestionNumber: nextQuestionNum
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// SUBMIT answer
app.post('/api/auto-competitions/:id/submit', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { questionNumber, selectedAnswer, timeSpent } = req.body;
        const competition = await AutomatedCompetition.findById(req.params.id);
        
        if (!competition || competition.status !== 'active') {
            return res.status(400).json({ message: 'Competition not active' });
        }
        
        const participant = competition.participants.find(p => p.userId.toString() === decoded.id);
        if (!participant || participant.eliminated) {
            return res.status(400).json({ message: 'Not eligible' });
        }
        
        const question = await CompetitionQuestion.findOne({
            competitionId: competition._id,
            questionNumber: questionNumber
        });
        
        const isCorrect = question.correctAnswer === selectedAnswer;
        const pointsEarned = isCorrect ? competition.pointsPerQuestion : 0;
        
        participant.answers.push({
            questionId: question._id,
            selectedAnswer,
            isCorrect,
            pointsEarned,
            timeSpent: timeSpent || 0,
            answeredAt: new Date()
        });
        
        if (isCorrect) {
            participant.score += pointsEarned;
            const user = await User.findById(decoded.id);
            user.points += pointsEarned;
            await user.save();
        } else {
            participant.lives -= 1;
            if (participant.lives <= 0) {
                participant.eliminated = true;
            }
        }
        
        participant.currentQuestion = questionNumber;
        await competition.save();
        
        // Check for winner
        if (participant.currentQuestion >= competition.totalQuestions && !participant.eliminated) {
            const remainingParticipants = competition.participants.filter(p => !p.eliminated);
            
            if (remainingParticipants.length === 1 && remainingParticipants[0].userId.toString() === decoded.id) {
                competition.status = 'ended';
                competition.winner = decoded.id;
                competition.winnerPrize = competition.prizePool;
                competition.endedAt = new Date();
                await competition.save();
                
                const winner = await User.findById(decoded.id);
                winner.points += competition.prizePool;
                await winner.save();
                
                return res.json({
                    success: true,
                    isCorrect,
                    pointsEarned,
                    livesLeft: participant.lives,
                    eliminated: participant.eliminated,
                    score: participant.score,
                    competitionEnded: true,
                    isWinner: true,
                    winnerPrize: competition.prizePool
                });
            }
        }
        
        res.json({
            success: true,
            isCorrect,
            correctAnswer: isCorrect ? null : question.correctAnswer,
            pointsEarned,
            livesLeft: participant.lives,
            eliminated: participant.eliminated,
            score: participant.score,
            nextQuestion: participant.currentQuestion + 1
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// UPDATE user (admin) - EDIT USER
app.put('/api/admin/users/:id', adminMiddleware, async (req, res) => {
    try {
        const { points, subscription, name, email, isAdmin } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        if (points !== undefined) user.points = points;
        if (subscription !== undefined) user.subscription = subscription;
        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (isAdmin !== undefined) user.isAdmin = isAdmin;
        
        await user.save();
        
        let stats = await UserStats.findOne({ userId: user._id });
        if (stats) {
            stats.totalPoints = user.points;
            await stats.save();
        }
        
        res.json({ success: true, message: 'User updated', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE user (admin)
app.delete('/api/admin/users/:id', adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        await UserStats.findOneAndDelete({ userId: user._id });
        await User.findByIdAndDelete(req.params.id);
        
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Auto-start competitions (runs every minute)
const startInterval = setInterval(async () => {
    const now = new Date();
    const competitions = await AutomatedCompetition.find({
        status: 'upcoming',
        scheduledTime: { $lte: now }
    });
    
    for (const comp of competitions) {
        comp.status = 'active';
        comp.startedAt = now;
        await comp.save();
        console.log(`🎮 Competition started: ${comp.name}`);
    }
}, 60000);
// ============ AUTO COMPETITION ADMIN CRUD ROUTES (ADD THESE) ============

// DELETE - Delete auto competition (Admin only)
app.delete('/api/auto-competitions/:id', adminMiddleware, async (req, res) => {
    try {
        const competition = await AutomatedCompetition.findById(req.params.id);
        if (!competition) {
            return res.status(404).json({ success: false, message: 'Competition not found' });
        }
        
        // Delete all questions for this competition
        await CompetitionQuestion.deleteMany({ competitionId: req.params.id });
        // Delete the competition
        await AutomatedCompetition.findByIdAndDelete(req.params.id);
        
        console.log(`🗑️ Admin deleted competition: ${competition.name}`);
        res.json({ success: true, message: 'Competition deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT - Update auto competition (Admin only)
app.put('/api/auto-competitions/:id', adminMiddleware, async (req, res) => {
    try {
        const { name, category, description, entryFee, prizePool, totalQuestions, 
                pointsPerQuestion, timePerQuestion, lives, scheduledTime } = req.body;
        
        const competition = await AutomatedCompetition.findById(req.params.id);
        if (!competition) {
            return res.status(404).json({ success: false, message: 'Competition not found' });
        }
        
        // Only allow editing of upcoming competitions
        if (competition.status !== 'upcoming') {
            return res.status(400).json({ success: false, message: 'Cannot edit competition that has already started or ended' });
        }
        
        // Update fields
        competition.name = name;
        competition.category = category;
        competition.description = description;
        competition.entryFee = entryFee;
        competition.prizePool = prizePool;
        competition.totalQuestions = totalQuestions;
        competition.pointsPerQuestion = pointsPerQuestion;
        competition.timePerQuestion = timePerQuestion;
        competition.lives = lives || 2;
        competition.scheduledTime = new Date(scheduledTime);
        
        await competition.save();
        
        console.log(`✏️ Admin updated competition: ${competition.name}`);
        res.json({ success: true, message: 'Competition updated successfully', competition });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ============ AUTO COMPETITION EDIT ROUTE (ADD THIS) ============

// PUT - Update auto competition (Admin only)
app.put('/api/auto-competitions/:id', adminMiddleware, async (req, res) => {
    try {
        const { name, category, description, entryFee, prizePool, totalQuestions, 
                pointsPerQuestion, timePerQuestion, lives, scheduledTime } = req.body;
        
        console.log('📝 Updating competition:', req.params.id);
        console.log('Received data:', { name, category, entryFee, totalQuestions, scheduledTime });
        
        const competition = await AutomatedCompetition.findById(req.params.id);
        if (!competition) {
            return res.status(404).json({ success: false, message: 'Competition not found' });
        }
        
        // Only allow editing of upcoming competitions
        if (competition.status !== 'upcoming') {
            return res.status(400).json({ success: false, message: 'Cannot edit competition that has already started or ended' });
        }
        
        // Update fields
        competition.name = name || competition.name;
        competition.category = category || competition.category;
        competition.description = description || competition.description;
        competition.entryFee = entryFee !== undefined ? entryFee : competition.entryFee;
        competition.prizePool = prizePool !== undefined ? prizePool : competition.prizePool;
        competition.totalQuestions = totalQuestions !== undefined ? totalQuestions : competition.totalQuestions;
        competition.pointsPerQuestion = pointsPerQuestion !== undefined ? pointsPerQuestion : competition.pointsPerQuestion;
        competition.timePerQuestion = timePerQuestion !== undefined ? timePerQuestion : competition.timePerQuestion;
        competition.lives = lives !== undefined ? lives : competition.lives;
        if (scheduledTime) {
            competition.scheduledTime = new Date(scheduledTime);
        }
        
        await competition.save();
        
        console.log(`✅ Competition updated: ${competition.name}`);
        res.json({ success: true, message: 'Competition updated successfully', competition });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// PUT - Update auto competition (Admin only)
app.put('/api/auto-competitions/:id', adminMiddleware, async (req, res) => {
    try {
        const { name, category, description, entryFee, prizePool, totalQuestions, 
                pointsPerQuestion, timePerQuestion, lives, scheduledTime } = req.body;
        
        const competition = await AutomatedCompetition.findById(req.params.id);
        if (!competition) {
            return res.status(404).json({ success: false, message: 'Competition not found' });
        }
        
        if (competition.status !== 'upcoming') {
            return res.status(400).json({ success: false, message: 'Cannot edit competition that has already started or ended' });
        }
        
        competition.name = name;
        competition.category = category;
        competition.description = description;
        competition.entryFee = entryFee;
        competition.prizePool = prizePool;
        competition.totalQuestions = totalQuestions;
        competition.pointsPerQuestion = pointsPerQuestion;
        competition.timePerQuestion = timePerQuestion;
        competition.lives = lives || 2;
        competition.scheduledTime = new Date(scheduledTime);
        
        await competition.save();
        
        console.log(`✏️ Admin updated competition: ${competition.name}`);
        res.json({ success: true, message: 'Competition updated successfully', competition });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// GET upcoming AND active competitions for users (that they joined)
app.get('/api/auto-competitions/upcoming', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        let userId = null;
        
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id;
            } catch(e) {}
        }
        
        // Get upcoming competitions
        const upcoming = await AutomatedCompetition.find({ 
            status: 'upcoming',
            scheduledTime: { $gt: new Date() }
        }).sort({ scheduledTime: 1 });
        
        // Get active competitions that the user has joined
        let activeJoined = [];
        if (userId) {
            activeJoined = await AutomatedCompetition.find({ 
                status: 'active',
                'participants.userId': userId
            }).sort({ scheduledTime: 1 });
        }
        
        // Combine and remove duplicates
        const allCompetitions = [...upcoming, ...activeJoined];
        const uniqueComps = [];
        const compIds = new Set();
        for (const comp of allCompetitions) {
            if (!compIds.has(comp._id.toString())) {
                compIds.add(comp._id.toString());
                uniqueComps.push(comp);
            }
        }
        
        res.json({ success: true, competitions: uniqueComps });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// GET - All competitions the user has joined (including active ones)
app.get('/api/user/joined-competitions', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find all competitions where this user is a participant
        const joinedCompetitions = await AutomatedCompetition.find({
            'participants.userId': decoded.id,
            status: { $in: ['upcoming', 'active'] } // Include both upcoming and active
        }).sort({ scheduledTime: 1 });
        
        res.json({ success: true, competitions: joinedCompetitions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============ START SERVER ============
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});