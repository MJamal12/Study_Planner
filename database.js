const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('study_planner.db');

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Wrapper functions to promisify sqlite3
const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

/**
 * Database query functions
 */

// User operations
const createUser = (username, email) => {
    return dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [username, email]);
};

const getUser = (userId) => {
    return dbGet('SELECT * FROM users WHERE id = ?', [userId]);
};

// Task operations
const createTask = (userId, taskData) => {
    const { title, description, type, priority, due_date, estimated_hours } = taskData;
    return dbRun(
        `INSERT INTO tasks (user_id, title, description, type, priority, due_date, estimated_hours) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, title, description, type, priority, due_date, estimated_hours]
    );
};

const getTasks = async (userId, filters = {}) => {
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

    return dbAll(query, params);
};

const updateTask = (taskId, updates) => {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    return dbRun(
        `UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, taskId]
    );
};

const deleteTask = (taskId) => {
    return dbRun('DELETE FROM tasks WHERE id = ?', [taskId]);
};

// Completion log operations
const createCompletionLog = (taskId, userId, hoursSpent, notes) => {
    return dbRun(
        'INSERT INTO completion_logs (task_id, user_id, hours_spent, notes) VALUES (?, ?, ?, ?)',
        [taskId, userId, hoursSpent, notes]
    );
};

const getCompletionLogs = (userId, days = 30) => {
    return dbAll(
        `SELECT cl.*, t.title as task_title 
         FROM completion_logs cl
         JOIN tasks t ON cl.task_id = t.id
         WHERE cl.user_id = ? AND cl.completed_at >= date('now', '-${days} days')
         ORDER BY cl.completed_at DESC`,
        [userId]
    );
};

// Study session operations
const createStudySession = (userId, taskId, durationMinutes, sessionDate, notes) => {
    return dbRun(
        'INSERT INTO study_sessions (user_id, task_id, duration_minutes, session_date, notes) VALUES (?, ?, ?, ?, ?)',
        [userId, taskId, durationMinutes, sessionDate, notes]
    );
};

const getStudySessions = (userId, days = 30) => {
    return dbAll(
        `SELECT ss.*, t.title as task_title 
         FROM study_sessions ss
         LEFT JOIN tasks t ON ss.task_id = t.id
         WHERE ss.user_id = ? AND ss.session_date >= date('now', '-${days} days')
         ORDER BY ss.session_date DESC`,
        [userId]
    );
};

// Analytics operations
const getProgressStats = async (userId) => {
    return dbGet(
        `SELECT 
            COUNT(*) as total_tasks,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks
         FROM tasks WHERE user_id = ?`,
        [userId]
    );
};

const getStreakData = async (userId) => {
    return dbAll(
        `SELECT DISTINCT date(session_date) as date 
         FROM study_sessions 
         WHERE user_id = ? 
         ORDER BY session_date DESC`,
        [userId]
    );
};

module.exports = {
    db,
    dbGet,
    dbAll,
    dbRun,
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
