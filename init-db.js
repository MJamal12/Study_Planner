const { initializeDatabase, createUser } = require('./database');

async function init() {
    try {
        console.log('Initializing database...');
        await initializeDatabase();
        console.log('✓ Database schema created successfully');

        // Create a default user
        try {
            const userId = await createUser('demo_user', 'demo@studyplanner.com');
            console.log(`✓ Demo user created with ID: ${userId}`);
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                console.log('✓ Demo user already exists');
            } else {
                throw err;
            }
        }

        console.log('\nDatabase initialization complete!');
        console.log('Run "npm start" to start the server');
        process.exit(0);
    } catch (err) {
        console.error('Error initializing database:', err);
        process.exit(1);
    }
}

init();
