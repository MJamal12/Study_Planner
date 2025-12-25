const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { dbGet, dbRun } = require('./database');
const db = require('./database');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database tables on startup
const initDB = () => {
    const database = new sqlite3.Database('study_planner.db');
    
    database.serialize(() => {
        // Users table
        database.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tasks table
        database.run(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL CHECK(type IN ('assignment', 'study_session', 'goal')),
                priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
                due_date DATE,
                estimated_hours REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Completion logs table
        database.run(`
            CREATE TABLE IF NOT EXISTS completion_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                hours_spent REAL,
                notes TEXT,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Study sessions table
        database.run(`
            CREATE TABLE IF NOT EXISTS study_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                task_id INTEGER,
                duration_minutes INTEGER NOT NULL,
                session_date DATE NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
            )
        `);

        // Create demo user if it doesn't exist
        database.get('SELECT * FROM users WHERE id = ?', [1], (err, user) => {
            if (!user) {
                database.run('INSERT INTO users (username, email) VALUES (?, ?)',
                    ['demo', 'demo@example.com'], function(err) {
                        if (err) {
                            console.error('Error creating demo user:', err);
                        } else {
                            console.log('Demo user created');
                        }
                    });
            } else {
                console.log('Demo user already exists');
            }
        });
    });
};

// Initialize database
initDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Default user ID for demo (in production, use authentication)
const DEFAULT_USER_ID = 1;

// Routes

// Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const { type, status } = req.query;
        const filters = {};
        if (type) filters.type = type;
        if (status) filters.status = status;
        
        const tasks = await db.getTasks(DEFAULT_USER_ID, filters);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create task
app.post('/api/tasks', async (req, res) => {
    try {
        const result = await db.createTask(DEFAULT_USER_ID, req.body);
        res.status(201).json({ id: result.lastID, message: 'Task created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const result = await db.updateTask(req.params.id, req.body);
        if (result.changes === 0) {
            res.status(404).json({ error: 'Task not found' });
        } else {
            res.json({ message: 'Task updated successfully' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const result = await db.deleteTask(req.params.id);
        if (result.changes === 0) {
            res.status(404).json({ error: 'Task not found' });
        } else {
            res.json({ message: 'Task deleted successfully' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Complete task
app.post('/api/tasks/:id/complete', async (req, res) => {
    try {
        const { hours_spent, notes } = req.body;
        await db.updateTask(req.params.id, { status: 'completed' });
        await db.createCompletionLog(req.params.id, DEFAULT_USER_ID, hours_spent, notes);
        res.json({ message: 'Task completed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get completion logs
app.get('/api/completion-logs', async (req, res) => {
    try {
        const days = req.query.days || 30;
        const logs = await db.getCompletionLogs(DEFAULT_USER_ID, days);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create study session
app.post('/api/study-sessions', async (req, res) => {
    try {
        const { task_id, duration_minutes, session_date, notes } = req.body;
        const sessionId = await db.createStudySession(
            DEFAULT_USER_ID,
            task_id || null,
            duration_minutes,
            session_date,
            notes
        );
        res.status(201).json({ id: sessionId, message: 'Study session logged successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get study sessions
app.get('/api/study-sessions', async (req, res) => {
    try {
        const days = req.query.days || 30;
        const sessions = await db.getStudySessions(DEFAULT_USER_ID, days);
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get progress statistics
app.get('/api/stats/progress', async (req, res) => {
    try {
        const stats = await db.getProgressStats(DEFAULT_USER_ID);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get streak data
app.get('/api/stats/streak', async (req, res) => {
    try {
        const streakData = await db.getStreakData(DEFAULT_USER_ID);
        
        // Calculate current streak
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        
        if (streakData.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            for (let i = 0; i < streakData.length; i++) {
                const date = new Date(streakData[i].date);
                const expectedDate = new Date(today);
                expectedDate.setDate(today.getDate() - i);
                
                if (date.toDateString() === expectedDate.toDateString()) {
                    tempStreak++;
                } else {
                    break;
                }
            }
            currentStreak = tempStreak;
            
            // Calculate longest streak
            tempStreak = 1;
            for (let i = 1; i < streakData.length; i++) {
                const prevDate = new Date(streakData[i - 1].date);
                const currDate = new Date(streakData[i].date);
                const diffDays = Math.round((prevDate - currDate) / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    tempStreak++;
                    longestStreak = Math.max(longestStreak, tempStreak);
                } else {
                    tempStreak = 1;
                }
            }
            longestStreak = Math.max(longestStreak, tempStreak);
        }
        
        res.json({
            current_streak: currentStreak,
            longest_streak: longestStreak,
            total_study_days: streakData.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Study Planner server running on port ${PORT}`);
});
