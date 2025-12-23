const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

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
        const taskId = await db.createTask(DEFAULT_USER_ID, req.body);
        res.status(201).json({ id: taskId, message: 'Task created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const changes = await db.updateTask(req.params.id, req.body);
        if (changes === 0) {
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
        const changes = await db.deleteTask(req.params.id);
        if (changes === 0) {
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
    console.log(`Study Planner server running on http://localhost:${PORT}`);
});
