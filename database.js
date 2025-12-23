const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'study_planner.db');
const db = new sqlite3.Database(dbPath);

/**
 * Initialize database with required tables
 */
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Tasks table
            db.run(`
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
            db.run(`
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
            db.run(`
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
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

/**
 * Database query functions
 */

// User operations
const createUser = (username, email) => {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO users (username, email) VALUES (?, ?)', [username, email], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
};

const getUser = (userId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Task operations
const createTask = (userId, taskData) => {
    const { title, description, type, priority, due_date, estimated_hours } = taskData;
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO tasks (user_id, title, description, type, priority, due_date, estimated_hours) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, title, description, type, priority, due_date, estimated_hours],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
};

const getTasks = (userId, filters = {}) => {
    return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM tasks WHERE user_id = ?';
        const params = [userId];

        if (filters.type) {
            query += ' AND type = ?';
            params.push(filters.type);
        }
        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        query += ' ORDER BY due_date ASC, priority DESC';

        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const updateTask = (taskId, updates) => {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [...values, taskId],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
};

const deleteTask = (taskId) => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM tasks WHERE id = ?', [taskId], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
};

// Completion log operations
const createCompletionLog = (taskId, userId, hoursSpent, notes) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO completion_logs (task_id, user_id, hours_spent, notes) VALUES (?, ?, ?, ?)',
            [taskId, userId, hoursSpent, notes],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
};

const getCompletionLogs = (userId, days = 30) => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT cl.*, t.title as task_title 
             FROM completion_logs cl
             JOIN tasks t ON cl.task_id = t.id
             WHERE cl.user_id = ? AND cl.completed_at >= date('now', '-${days} days')
             ORDER BY cl.completed_at DESC`,
            [userId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
};

// Study session operations
const createStudySession = (userId, taskId, durationMinutes, sessionDate, notes) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO study_sessions (user_id, task_id, duration_minutes, session_date, notes) VALUES (?, ?, ?, ?, ?)',
            [userId, taskId, durationMinutes, sessionDate, notes],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
};

const getStudySessions = (userId, days = 30) => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT ss.*, t.title as task_title 
             FROM study_sessions ss
             LEFT JOIN tasks t ON ss.task_id = t.id
             WHERE ss.user_id = ? AND ss.session_date >= date('now', '-${days} days')
             ORDER BY ss.session_date DESC`,
            [userId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
};

// Analytics operations
const getProgressStats = (userId) => {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks
             FROM tasks WHERE user_id = ?`,
            [userId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
};

const getStreakData = (userId) => {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT DISTINCT date(session_date) as date 
             FROM study_sessions 
             WHERE user_id = ? 
             ORDER BY session_date DESC`,
            [userId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
};

module.exports = {
    db,
    initializeDatabase,
    createUser,
    getUser,
    createTask,
    getTasks,
    updateTask,
    deleteTask,
    createCompletionLog,
    getCompletionLogs,
    createStudySession,
    getStudySessions,
    getProgressStats,
    getStreakData
};
