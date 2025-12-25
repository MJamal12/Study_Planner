// API Base URL
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// Global state
let currentView = 'dashboard';
let currentFilter = 'all';
let allTasks = [];
let allSessions = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupNavigationEventListeners();
    setupFilterEventListeners();
    setupFormEventListeners();
    loadDashboard();
    setTodayDate();
});

// Navigation
function setupNavigationEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });
}

function switchView(view) {
    currentView = view;
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Update views
    document.querySelectorAll('.view').forEach(v => {
        v.classList.toggle('active', v.id === `${view}-view`);
    });
    
    // Load view data
    switch(view) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'sessions':
            loadSessions();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// Filter Tasks
function setupFilterEventListeners() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            displayTasks();
        });
    });
}

// Dashboard
async function loadDashboard() {
    try {
        await Promise.all([
            loadStats(),
            loadUpcomingTasks()
        ]);
    } catch (err) {
        showToast('Error loading dashboard', 'error');
    }
}

async function loadStats() {
    try {
        const [progressStats, streakData, sessions] = await Promise.all([
            fetch(`${API_URL}/stats/progress`).then(r => r.json()),
            fetch(`${API_URL}/stats/streak`).then(r => r.json()),
            fetch(`${API_URL}/study-sessions`).then(r => r.json())
        ]);
        
        document.getElementById('total-tasks').textContent = progressStats.total_tasks || 0;
        document.getElementById('completed-tasks').textContent = progressStats.completed_tasks || 0;
        document.getElementById('current-streak').textContent = streakData.current_streak || 0;
        
        const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
        const totalHours = (totalMinutes / 60).toFixed(1);
        document.getElementById('study-hours').textContent = totalHours;
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

async function loadUpcomingTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks?status=pending`);
        const tasks = await response.json();
        
        const upcomingTasks = tasks
            .filter(t => t.due_date)
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
            .slice(0, 5);
        
        const container = document.getElementById('upcoming-tasks');
        
        if (upcomingTasks.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">No upcoming assignments</div></div>';
            return;
        }
        
        container.innerHTML = upcomingTasks.map(task => createTaskHTML(task)).join('');
    } catch (err) {
        console.error('Error loading upcoming tasks:', err);
    }
}

// Tasks
async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allTasks = await response.json();
        console.log('Tasks loaded:', allTasks);
        displayTasks();
        populateTaskDropdown();
    } catch (err) {
        console.error('Error loading tasks:', err);
        showToast('Error loading tasks: ' + err.message, 'error');
    }
}

function displayTasks() {
    const container = document.getElementById('tasks-container');
    
    let filteredTasks = allTasks;
    if (currentFilter !== 'all') {
        filteredTasks = allTasks.filter(t => t.type === currentFilter);
    }
    
    if (filteredTasks.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✨</div><div class="empty-state-text">No tasks yet. Create your first one!</div></div>';
        return;
    }
    
    container.innerHTML = filteredTasks.map(task => createTaskHTML(task)).join('');
}

function createTaskHTML(task) {
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
    
    return `
        <div class="task-item ${task.priority}-priority ${task.status === 'completed' ? 'completed' : ''}">
            <div class="task-header">
                <div class="task-title">${task.title}</div>
                <div class="task-type ${task.type}">${formatType(task.type)}</div>
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-meta">
                <span>📅 ${dueDate} ${isOverdue ? '⚠️' : ''}</span>
                ${task.estimated_hours ? `<span>⏱️ ${task.estimated_hours}h</span>` : ''}
                <span>🎯 ${task.priority}</span>
                <span>📊 ${formatStatus(task.status)}</span>
            </div>
            <div class="task-actions">
                ${task.status !== 'completed' ? `
                    <button class="btn btn-success btn-sm" onclick="completeTask(${task.id})">Complete</button>
                    <button class="btn btn-secondary btn-sm" onclick="editTask(${task.id})">Edit</button>
                ` : ''}
                <button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})">Delete</button>
            </div>
        </div>
    `;
}

function formatType(type) {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatStatus(status) {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Study Sessions
async function loadSessions() {
    try {
        const response = await fetch(`${API_URL}/study-sessions`);
        allSessions = await response.json();
        displaySessions();
    } catch (err) {
        showToast('Error loading sessions', 'error');
    }
}

function displaySessions() {
    const container = document.getElementById('sessions-container');
    
    if (allSessions.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-text">No study sessions logged yet</div></div>';
        return;
    }
    
    container.innerHTML = allSessions.map(session => `
        <div class="session-card">
            <div class="session-header">
                <div class="session-duration">${session.duration_minutes} min</div>
                <div class="session-date">${new Date(session.session_date).toLocaleDateString()}</div>
            </div>
            <div class="session-task">${session.task_title || 'General Study'}</div>
            ${session.notes ? `<div class="session-notes">${session.notes}</div>` : ''}
        </div>
    `).join('');
}

// Analytics
async function loadAnalytics() {
    try {
        await Promise.all([
            loadProgressChart(),
            loadStudyTimeChart(),
            loadStreakInfo()
        ]);
    } catch (err) {
        console.error('Analytics error:', err);
        showToast('Error loading analytics: ' + err.message, 'error');
    }
}

async function loadProgressChart() {
    const response = await fetch(`${API_URL}/stats/progress`);
    if (!response.ok) {
        throw new Error(`Progress stats failed: ${response.statusText}`);
    }
    const stats = await response.json();
    
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    // Destroy existing chart if any
    if (window.progressChart && typeof window.progressChart.destroy === 'function') {
        window.progressChart.destroy();
    }
    
    // Check if there's any data
    const hasData = (stats.completed_tasks || 0) + (stats.in_progress_tasks || 0) + (stats.pending_tasks || 0) > 0;
    
    window.progressChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: hasData ? ['Completed', 'In Progress', 'Pending'] : ['No Data'],
            datasets: [{
                data: hasData ? [
                    stats.completed_tasks || 0,
                    stats.in_progress_tasks || 0,
                    stats.pending_tasks || 0
                ] : [1],
                backgroundColor: hasData ? ['#10b981', '#f59e0b', '#6366f1'] : ['#475569'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#f1f5f9'
                    }
                }
            }
        }
    });
}

async function loadStudyTimeChart() {
    const response = await fetch(`${API_URL}/study-sessions?days=7`);
    if (!response.ok) {
        throw new Error(`Study sessions failed: ${response.statusText}`);
    }
    const sessions = await response.json();
    
    // Group by date
    const last7Days = [...Array(7)].map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
    }).reverse();
    
    const timeByDate = {};
    last7Days.forEach(date => timeByDate[date] = 0);
    
    if (Array.isArray(sessions)) {
        sessions.forEach(session => {
            const date = session.session_date.split('T')[0];
            if (timeByDate[date] !== undefined) {
                timeByDate[date] += session.duration_minutes;
            }
        });
    }
    
    const ctx = document.getElementById('studyTimeChart').getContext('2d');
    
    // Destroy existing chart if any
    if (window.studyTimeChart && typeof window.studyTimeChart.destroy === 'function') {
        window.studyTimeChart.destroy();
    }
    
    window.studyTimeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7Days.map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })),
            datasets: [{
                label: 'Minutes Studied',
                data: last7Days.map(d => timeByDate[d]),
                backgroundColor: '#8b5cf6',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        stepSize: 30
                    },
                    grid: {
                        color: '#475569'
                    }
                },
                x: {
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#f1f5f9'
                    }
                }
            }
        }
    });
}

async function loadStreakInfo() {
    const response = await fetch(`${API_URL}/stats/streak`);
    if (!response.ok) {
        throw new Error(`Streak stats failed: ${response.statusText}`);
    }
    const data = await response.json();
    
    document.getElementById('streak-current').textContent = data.current_streak || 0;
    document.getElementById('streak-longest').textContent = data.longest_streak || 0;
    document.getElementById('streak-total').textContent = data.total_study_days || 0;
}

// Form Handling
function setupFormEventListeners() {
    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);
    document.getElementById('session-form').addEventListener('submit', handleSessionSubmit);
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('task-id').value;
    const taskData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        type: document.getElementById('task-type').value,
        priority: document.getElementById('task-priority').value,
        due_date: document.getElementById('task-due-date').value || null,
        estimated_hours: parseFloat(document.getElementById('task-hours').value) || null
    };
    
    try {
        let response;
        if (taskId) {
            response = await fetch(`${API_URL}/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update task');
            }
            showToast('Task updated successfully');
        } else {
            response = await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create task');
            }
            showToast('Task created successfully');
        }
        
        closeModal('task-modal');
        if (currentView === 'tasks') loadTasks();
        if (currentView === 'dashboard') loadDashboard();
    } catch (err) {
        console.error('Error saving task:', err);
        showToast(err.message || 'Error saving task', 'error');
    }
}

async function handleSessionSubmit(e) {
    e.preventDefault();
    
    const sessionData = {
        task_id: document.getElementById('session-task').value || null,
        duration_minutes: parseInt(document.getElementById('session-duration').value),
        session_date: document.getElementById('session-date').value,
        notes: document.getElementById('session-notes').value
    };
    
    try {
        await fetch(`${API_URL}/study-sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionData)
        });
        
        showToast('Study session logged successfully');
        closeModal('session-modal');
        if (currentView === 'sessions') loadSessions();
        if (currentView === 'dashboard') loadDashboard();
    } catch (err) {
        showToast('Error logging session', 'error');
    }
}

// Task Actions
async function completeTask(taskId) {
    if (!confirm('Mark this task as completed?')) return;
    
    try {
        await fetch(`${API_URL}/tasks/${taskId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hours_spent: 0, notes: '' })
        });
        
        showToast('Task completed!');
        if (currentView === 'tasks') loadTasks();
        if (currentView === 'dashboard') loadDashboard();
    } catch (err) {
        showToast('Error completing task', 'error');
    }
}

async function editTask(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-type').value = task.type;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-due-date').value = task.due_date || '';
    document.getElementById('task-hours').value = task.estimated_hours || '';
    
    document.getElementById('modal-title').textContent = 'Edit Task';
    showModal('task-modal');
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
        showToast('Task deleted');
        if (currentView === 'tasks') loadTasks();
        if (currentView === 'dashboard') loadDashboard();
    } catch (err) {
        showToast('Error deleting task', 'error');
    }
}

// Modal Controls
function showAddTaskModal() {
    document.getElementById('task-form').reset();
    document.getElementById('task-id').value = '';
    document.getElementById('modal-title').textContent = 'Add Task';
    showModal('task-modal');
}

function showAddSessionModal() {
    document.getElementById('session-form').reset();
    setTodayDate();
    populateTaskDropdown();
    showModal('session-modal');
}

function showAddGoalModal() {
    document.getElementById('task-form').reset();
    document.getElementById('task-id').value = '';
    document.getElementById('task-type').value = 'goal';
    document.getElementById('modal-title').textContent = 'Set Weekly Goal';
    showModal('task-modal');
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Utility Functions
function setTodayDate() {
    const dateInput = document.getElementById('session-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

async function populateTaskDropdown() {
    try {
        const response = await fetch(`${API_URL}/tasks?status=pending`);
        const tasks = await response.json();
        
        const select = document.getElementById('session-task');
        select.innerHTML = '<option value="">General Study</option>';
        
        tasks.forEach(task => {
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.title;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Error populating task dropdown:', err);
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});
