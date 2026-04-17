# SkillSwap Backend

A Node.js/Express backend API for the SkillSwap platform - a community-driven skill exchange application where users can offer and request skills from one another.

## Features

- 🔄 **Create Swaps** - Users can post skill offers and requests
- 📋 **List Swaps** - Browse all available skill exchanges
- ✏️ **Edit Swaps** - Update existing skill swap postings
- 🗑️ **Delete Swaps** - Remove swaps
- 💾 **MongoDB Integration** - Persistent data storage
- 🔒 **CORS Enabled** - Secure cross-origin requests
- 📝 **Environment Configuration** - Secure environment variable management

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Environment**: dotenv
- **Middleware**: CORS, Express JSON parser

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB Atlas account (or local MongoDB instance)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/JstMeJosh/skillswap-backend.git
cd skillswap-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create `.env` file**
Create a `.env` file in the root directory:
```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
```

4. **Start the server**
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## API Endpoints

### Get All Swaps
```
GET /api/swaps
```
Returns a list of all skill swaps.

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Learn React",
    "skillOffered": "JavaScript",
    "skillWanted": "Python",
    "description": "I can teach JavaScript basics..."
  }
]
```

### Create a New Swap
```
POST /api/swaps
Content-Type: application/json

{
  "title": "Learn Web Design",
  "skillOffered": "Web Development",
  "skillWanted": "Graphic Design",
  "description": "I can teach HTML, CSS, and JavaScript"
}
```

### Update a Swap
```
PUT /api/swaps/:id
Content-Type: application/json

{
  "title": "Learn React",
  "skillOffered": "JavaScript",
  "skillWanted": "Python",
  "description": "Updated description"
}
```

### Delete a Swap
```
DELETE /api/swaps/:id
```

## Database Schema

### Swap Model

```javascript
{
  title: String (required),
  skillOffered: String (required),
  skillWanted: String (required),
  description: String (optional),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:password@cluster.mongodb.net/skillswap` |
| `PORT` | Server port (optional, defaults to 5000) | `5000` |

## Scripts

- `npm run dev` - Start the server with nodemon (auto-reload on file changes)
- `npm start` - Start the production server

## Project Structure

```
backend/
├── models/
│   └── Swap.js          # MongoDB Swap model
├── server.js            # Main Express application
├── package.json         # Dependencies and scripts
├── .env                 # Environment variables (not tracked)
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Development

The backend uses **nodemon** for automatic server reloading during development. Changes to any file will automatically restart the server.

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request / Server Error
- `404` - Not Found

## CORS Configuration

The API is configured to accept requests from any origin. In production, update the CORS configuration in `server.js` to restrict to your frontend domain:

```javascript
app.use(cors({
  origin: 'https://yourdomain.com'
}));
```

## Future Enhancements

- User authentication and authorization
- User profiles with ratings and reviews
- Skill categories and tags
- Search and filter functionality
- Messaging system between users
- Transaction history

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Contact

For questions or support, please reach out to the project maintainer.

---

**Happy Skill Swapping! 🚀**
