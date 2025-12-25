# Study Planner Web Application

A comprehensive web-based study planner that helps students track assignments, study sessions, and weekly goals with beautiful visualizations and streak tracking.

## Features

### 📋 Task Management
- Create, read, update, and delete tasks
- Three task types: Assignments, Study Sessions, and Goals
- Priority levels (Low, Medium, High)
- Due date tracking with overdue warnings
- Status tracking (Pending, In Progress, Completed)

### 📚 Study Session Tracking
- Log study sessions with duration tracking
- Link sessions to specific tasks or general study
- View complete study history
- Add notes for each session

### 📊 Progress Visualization
- Interactive dashboard with key statistics
- Task progress chart (completed vs in progress vs pending)
- 7-day study time bar chart
- Real-time progress updates

### 🔥 Streak Tracking
- Current study streak counter
- Longest streak achieved
- Total study days tracked
- Motivational streak display

### 💾 SQL Database
- SQLite database with proper relationships
- Tables for users, tasks, completion logs, and study sessions
- Full CRUD operations with foreign key constraints
- Transaction safety and data integrity

## Technology Stack

### Backend
- **Node.js** with Express.js
- **SQLite3** for database
- RESTful API architecture
- CORS enabled for development

### Frontend
- **HTML5** with semantic structure
- **CSS3** with modern dark theme
- **Vanilla JavaScript** (ES6+)
- **Chart.js** for data visualizations
- Responsive design for all devices

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Setup Steps

1. **Navigate to project directory**
   ```bash
   cd C:\Projects\Study_Planner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   The database will be automatically initialized on first run with a demo user.

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## Deployment

This app is production-ready and can be deployed to platforms like Render, Heroku, or Railway.

**Live Demo:** https://study-planner-mjamal.onrender.com

The database initializes automatically on startup, and the demo user is created if it doesn't exist.

## Project Structure

```
Study_Planner/
├── server.js              # Express server and API routes
├── database.js            # Database wrapper and query functions
├── package.json          # Dependencies and scripts
├── study_planner.db      # SQLite database (auto-created on startup)
└── public/
    ├── index.html        # Main HTML structure
    ├── styles.css        # Modern CSS styling
    └── app.js            # Frontend JavaScript logic
```

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks with optional filters
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task
- `POST /api/tasks/:id/complete` - Mark task as completed

### Study Sessions
- `GET /api/study-sessions` - Get all study sessions
- `POST /api/study-sessions` - Log a new study session

### Analytics
- `GET /api/stats/progress` - Get task progress statistics
- `GET /api/stats/streak` - Get study streak data
- `GET /api/completion-logs` - Get completion history

## Database Schema

### Users Table
```sql
- id (PRIMARY KEY)
- username (UNIQUE)
- email (UNIQUE)
- created_at
```

### Tasks Table
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- title
- description
- type (assignment, study_session, goal)
- priority (low, medium, high)
- status (pending, in_progress, completed)
- due_date
- estimated_hours
- created_at
- updated_at
```

### Study Sessions Table
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- task_id (FOREIGN KEY, optional)
- duration_minutes
- session_date
- notes
- created_at
```

### Completion Logs Table
```sql
- id (PRIMARY KEY)
- task_id (FOREIGN KEY)
- user_id (FOREIGN KEY)
- completed_at
- hours_spent
- notes
```

## Usage Guide

### Dashboard
- View key statistics at a glance
- Quick access to create tasks and log sessions
- See upcoming assignments

### Tasks Page
- Filter tasks by type (All, Assignments, Study Sessions, Goals)
- Edit or delete existing tasks
- Mark tasks as completed
- View task details including due dates and priorities

### Study Sessions Page
- View all logged study sessions
- See duration and dates
- Review session notes

### Analytics Page
- Visual progress tracking with charts
- Study time trends over the last week
- Streak information and motivation

## Features in Detail

### CRUD Operations
All task and session operations are implemented with full Create, Read, Update, and Delete functionality:
- **Create**: Add new tasks and sessions through intuitive forms
- **Read**: View all data with filtering and sorting options
- **Update**: Edit existing tasks in-place
- **Delete**: Remove tasks with confirmation prompts

### Responsive Design
- Mobile-first approach
- Adapts to all screen sizes
- Touch-friendly interface
- Optimized for tablets and desktops

### User Experience
- Clean, modern dark theme
- Smooth animations and transitions
- Toast notifications for actions
- Modal forms for data entry
- Real-time updates

## Development

### Run in Development Mode
```bash
npm start
```

### Reset Database
To reset the database, delete `study_planner.db` and restart the server. The database will be automatically recreated.

## Customization

### Change Port
Edit `server.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

### Add More Task Types
Edit the database schema in `database.js` to add new task types:
```sql
type TEXT NOT NULL CHECK(type IN ('assignment', 'study_session', 'goal', 'your_new_type'))
```

### Modify Theme Colors
Edit CSS variables in `public/styles.css`:
```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #8b5cf6;
    --accent-color: #ec4899;
    /* Add your custom colors */
}
```

## Performance

- Optimized SQL queries with proper indexing
- Minimal API calls with smart caching
- Efficient Chart.js rendering
- Lightweight (~500KB total assets)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- [ ] User authentication and multi-user support
- [ ] Calendar view for assignments
- [ ] Export data to CSV/PDF
- [ ] Pomodoro timer integration
- [ ] Email reminders for due dates
- [ ] Dark/light theme toggle
- [ ] Collaborative study groups
- [ ] Mobile app version

## Troubleshooting

### Database Errors
If you encounter database errors, delete `study_planner.db` and restart the server. The database will be automatically recreated.

### Port Already in Use
Change the port in `server.js` or kill the process using port 3000.

### Charts Not Displaying
Ensure Chart.js is loaded from CDN. Check browser console for errors.

### Tasks Not Loading on Render
The app automatically detects whether it's running locally or on a hosted platform and adjusts the API URL accordingly.

## License

MIT License - Feel free to use this project for learning and personal use.

## Credits

- **Chart.js** - Data visualization library
- **Express.js** - Web framework
- **SQLite** - Database engine

---

**Built with ❤️ for productive studying!**
