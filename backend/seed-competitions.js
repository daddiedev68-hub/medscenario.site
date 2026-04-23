
// seed-competitions.js - COMPLETE WORKING VERSION
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// ============ SCHEMA DEFINITIONS (Matching your server.js EXACTLY) ============

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
            timeSpent: Number,
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

const CompetitionQuestionSchema = new mongoose.Schema({
    competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AutomatedCompetition' },
    questionNumber: Number,
    text: String,
    options: [String],
    correctAnswer: String,
    points: { type: Number, default: 200 }
});

const CompetitionQuestion = mongoose.model('CompetitionQuestion', CompetitionQuestionSchema);

// ============ FALLBACK QUESTIONS ============
const fallbackQuestions = [
    {
        text: "A 45-year-old male presents with crushing chest pain radiating to left arm. He is diaphoretic and anxious. What is the most likely diagnosis?",
        options: ["Acute Coronary Syndrome", "Pulmonary Embolism", "Aortic Dissection", "Pericarditis"],
        correctAnswer: "Acute Coronary Syndrome"
    },
    {
        text: "A 4-year-old child has fever for 3 days, mild cough, and is playing normally. What is the most appropriate management?",
        options: ["Start antibiotics", "Supportive care at home", "Admit to hospital", "Chest X-ray"],
        correctAnswer: "Supportive care at home"
    },
    {
        text: "A 32-year-old G3P2 at 34 weeks presents with sudden, painless vaginal bleeding. What is the most likely diagnosis?",
        options: ["Placenta Previa", "Placental Abruption", "Uterine Rupture", "Vasa Previa"],
        correctAnswer: "Placenta Previa"
    },
    {
        text: "A 22-year-old male has periumbilical pain that migrated to right lower quadrant with nausea. What is the most likely diagnosis?",
        options: ["Acute Appendicitis", "Gastroenteritis", "Renal Colic", "Meckel's Diverticulitis"],
        correctAnswer: "Acute Appendicitis"
    },
    {
        text: "A 65-year-old diabetic with hypertension presents with sudden severe headache. BP 210/120. What is the most likely diagnosis?",
        options: ["Hypertensive Emergency", "Migraine", "Subarachnoid Hemorrhage", "Tension Headache"],
        correctAnswer: "Hypertensive Emergency"
    }
];

// ============ COMPETITIONS WITH ALL REQUIRED FIELDS ============
const competitions = [
    // BRONZE TIER (Entry: 0-500)
    {
        name: "🔥 Daily Rapid Fire",
        category: "daily",
        description: "Quick 5-question challenge to start your day! Free entry, win 2000 points.",
        entryFee: 0,
        prizePool: 2000,
        totalQuestions: 5,
        pointsPerQuestion: 50,
        timePerQuestion: 20,
        lives: 2,
        scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: "upcoming"
    },
    {
        name: "⚡ Morning Diagnosis",
        category: "daily",
        description: "Test your morning diagnostic skills! Low entry, high rewards.",
        entryFee: 100,
        prizePool: 3000,
        totalQuestions: 8,
        pointsPerQuestion: 60,
        timePerQuestion: 25,
        lives: 2,
        scheduledTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
        status: "upcoming"
    },
    {
        name: "🌟 Bronze League: General Medicine",
        category: "weekly",
        description: "Perfect for beginners! Build your confidence with basic cases.",
        entryFee: 500,
        prizePool: 5000,
        totalQuestions: 10,
        pointsPerQuestion: 75,
        timePerQuestion: 30,
        lives: 3,
        scheduledTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: "upcoming"
    },

    // SILVER TIER (1500 points entry - MAIN ENGAGEMENT)
    {
        name: "🏆 Weekly Clinical Championship",
        category: "weekly",
        description: "The main event! 20 questions, 3 lives, 1500 entry fee. Top doctors compete for glory!",
        entryFee: 1500,
        prizePool: 15000,
        totalQuestions: 20,
        pointsPerQuestion: 100,
        timePerQuestion: 30,
        lives: 3,
        scheduledTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: "upcoming"
    },
    {
        name: "🫀 Cardiology Masters",
        category: "specialty",
        description: "Test your cardiology knowledge against the best! ECG interpretation, heart failure, and more.",
        entryFee: 1500,
        prizePool: 12000,
        totalQuestions: 15,
        pointsPerQuestion: 100,
        timePerQuestion: 25,
        lives: 3,
        scheduledTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: "upcoming"
    },
    {
        name: "👶 Pediatrics Challenge",
        category: "specialty",
        description: "Pediatric cases that will test your clinical judgment. From neonates to adolescents.",
        entryFee: 1500,
        prizePool: 12000,
        totalQuestions: 15,
        pointsPerQuestion: 100,
        timePerQuestion: 25,
        lives: 3,
        scheduledTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "upcoming"
    },
    {
        name: "🔪 Surgical Skills Test",
        category: "specialty",
        description: "Surgical scenarios for the aspiring surgeon. Pre-op, intra-op, and post-op cases.",
        entryFee: 1500,
        prizePool: 12000,
        totalQuestions: 15,
        pointsPerQuestion: 100,
        timePerQuestion: 25,
        lives: 3,
        scheduledTime: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        status: "upcoming"
    },
    {
        name: "🤰 OBGYN Proving Ground",
        category: "specialty",
        description: "OBGYN emergencies and routine cases. From prenatal care to delivery complications.",
        entryFee: 1500,
        prizePool: 12000,
        totalQuestions: 15,
        pointsPerQuestion: 100,
        timePerQuestion: 25,
        lives: 3,
        scheduledTime: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
        status: "upcoming"
    },
    {
        name: "🧠 Neurology Elite",
        category: "specialty",
        description: "Complex neurology cases for specialists. Stroke, seizures, and neurodegenerative disorders.",
        entryFee: 1500,
        prizePool: 12000,
        totalQuestions: 15,
        pointsPerQuestion: 100,
        timePerQuestion: 25,
        lives: 3,
        scheduledTime: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
        status: "upcoming"
    },

    // GOLD TIER (5000 points entry)
    {
        name: "👑 Grandmaster Tournament",
        category: "weekly",
        description: "Elite competition for top doctors. 30 questions, 2 lives, 5000 entry. Only the best survive!",
        entryFee: 5000,
        prizePool: 50000,
        totalQuestions: 30,
        pointsPerQuestion: 150,
        timePerQuestion: 20,
        lives: 2,
        scheduledTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: "upcoming"
    },
    {
        name: "🏥 Critical Care Challenge",
        category: "specialty",
        description: "ICU and emergency medicine scenarios. Rapid decision making under pressure.",
        entryFee: 5000,
        prizePool: 40000,
        totalQuestions: 25,
        pointsPerQuestion: 150,
        timePerQuestion: 20,
        lives: 2,
        scheduledTime: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
        status: "upcoming"
    },

    // PLATINUM TIER (15000 points entry)
    {
        name: "🏆 World Championship",
        category: "weekly",
        description: "The ultimate test. Only the best doctors survive! 40 questions, 1 life, 15000 entry.",
        entryFee: 15000,
        prizePool: 150000,
        totalQuestions: 40,
        pointsPerQuestion: 200,
        timePerQuestion: 15,
        lives: 1,
        scheduledTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "upcoming"
    },
    {
        name: "⚡ Speed Diagnosis Grand Prix",
        category: "weekly",
        description: "Fastest diagnosis wins! 10 seconds per question. Premium speed competition.",
        entryFee: 15000,
        prizePool: 100000,
        totalQuestions: 25,
        pointsPerQuestion: 200,
        timePerQuestion: 10,
        lives: 2,
        scheduledTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        status: "upcoming"
    },
    {
        name: "👑 Platinum Elite Invitational",
        category: "specialty",
        description: "Invitation-only level competition for the world's best clinicians.",
        entryFee: 15000,
        prizePool: 120000,
        totalQuestions: 35,
        pointsPerQuestion: 200,
        timePerQuestion: 15,
        lives: 2,
        scheduledTime: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        status: "upcoming"
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Clear existing data
        await AutomatedCompetition.deleteMany({});
        await CompetitionQuestion.deleteMany({});
        console.log('🗑️ Cleared existing auto competitions');
        
        for (let compData of competitions) {
            const competition = new AutomatedCompetition(compData);
            await competition.save();
            console.log(`✅ Created: ${competition.name} (Entry: ${competition.entryFee} pts | Lives: ${competition.lives})`);
            
            // Add questions for this competition
            const questions = [];
            for (let i = 0; i < compData.totalQuestions; i++) {
                const fb = fallbackQuestions[i % fallbackQuestions.length];
                questions.push({
                    competitionId: competition._id,
                    questionNumber: i + 1,
                    text: fb.text,
                    options: fb.options,
                    correctAnswer: fb.correctAnswer,
                    points: compData.pointsPerQuestion
                });
            }
            
            if (questions.length > 0) {
                await CompetitionQuestion.insertMany(questions);
                console.log(`   📝 Added ${questions.length} questions`);
            }
        }
        
        const count = await AutomatedCompetition.countDocuments();
        console.log(`\n✅ SUCCESS! ${count} Auto Competitions added to database!`);
        console.log('\n📊 Go to Admin Panel → Click "Auto Comps" tab to see them!');
        console.log('\n📋 Competition Summary:');
        console.log('   - Bronze Tier (0-500 pts): 3 competitions');
        console.log('   - Silver Tier (1500 pts): 6 competitions ⭐ MAIN ENGAGEMENT');
        console.log('   - Gold Tier (5000 pts): 2 competitions');
        console.log('   - Platinum Tier (15000 pts): 3 competitions');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding:', error);
        process.exit(1);
    }
}

seed();