# Deployment Guide for Kanban API

## Render Deployment Instructions

### 1. Environment Variables Required

Set these environment variables in your Render dashboard:

```
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_jwt_secret_key
NODE_ENV=production
```

### 2. MongoDB Atlas Setup

1. Create a free MongoDB Atlas account at https://www.mongodb.com/atlas
2. Create a new cluster
3. Add your IP address to the whitelist (or use 0.0.0.0/0 for all IPs)
4. Create a database user
5. Get your connection string and set it as MONGO_URI

Example connection string:
```
mongodb+srv://username:password@cluster.mongodb.net/kanban-db?retryWrites=true&w=majority
```

### 3. Render Deployment

1. Connect your GitHub repository to Render
2. Choose "Web Service"
3. Set the following:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node
4. Add the environment variables listed above
5. Deploy

### 4. API Endpoints

Once deployed, your API will be available at:
- Health check: `https://your-app.onrender.com/api/health`
- Authentication: `https://your-app.onrender.com/api/auth`
- Boards: `https://your-app.onrender.com/api/boards`
- Columns: `https://your-app.onrender.com/api/columns`
- Cards: `https://your-app.onrender.com/api/cards`
- Users: `https://your-app.onrender.com/api/users`

### 5. CORS Configuration

The API is configured to accept requests from any origin. If you need to restrict this for security, update the CORS settings in `app.js`.

### 6. Important Notes

- Render will automatically set the PORT environment variable
- The server is now configured to bind to all interfaces (not just localhost)
- Make sure your MongoDB Atlas cluster allows connections from anywhere (0.0.0.0/0) or add Render's IP ranges
- Generate a strong JWT_SECRET (at least 32 characters, random string) 