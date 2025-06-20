const app = require('./app');

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EACCES') {
        console.error(`Permission denied: Cannot bind to port ${PORT}`);
        console.error('Try running with a different port or as administrator');
        process.exit(1);
    } else if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        console.error('Try using a different port by setting the PORT environment variable');
        process.exit(1);
    } else {
        console.error('Server error:', err);
        process.exit(1);
    }
});
