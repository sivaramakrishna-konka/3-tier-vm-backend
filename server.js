// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const db = require('./db-config');
// const redis = require('./redis-client');

// const app = express();
// const PORT = process.env.PORT || 8080;
// const HOST = process.env.HOST || '0.0.0.0';


// // Middleware
// app.use(bodyParser.json());

// // CORS Configuration
// const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;

// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));
// console.log('CORS Allowed Origin:', ALLOWED_ORIGIN);

// // Preflight Request Handling
// app.options('/api/entries', cors());

// // Health Check Route
// app.get('/health', (req, res) => {
//   res.status(200).send(`
//     <html>
//       <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 20px;">
//         <h1 style="color: green;">Server is healthy</h1>
//       </body>
//     </html>
//   `);
// });

// // Fetch All Entries with Redis Caching
// app.get('/api/entries', async (req, res) => {
//   const cacheKey = 'all_entries';
  
//   try {
//     // Try to get from Redis cache
//     const cached = await redis.get(cacheKey);

//     if (cached) {
//       console.log('Serving from Redis cache');
//       return res.json(JSON.parse(cached));
//     }

//     // If not in cache, fetch from DB
//     db.query('SELECT * FROM entries', async (err, results) => {
//       if (err) {
//         console.error('DB error:', err);
//         return res.status(500).json({ error: 'Internal Server Error' });
//       }

//       // Save to Redis with 60 seconds expiration
//       await redis.set(cacheKey, JSON.stringify(results), 'EX', 60);
//       console.log('Serving from MySQL and caching the result');
//       res.json(results);
//     });

//   } catch (err) {
//     console.error('Redis error:', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });


// // Add New Entry
// app.post('/api/entries', (req, res) => {
//   const { amount, description } = req.body;

//   // Validate input
//   if (!amount || !description) {
//     return res.status(400).send({ error: 'Amount and description are required' });
//   }

//   const query = 'INSERT INTO entries (amount, description) VALUES (?, ?)';
//   db.query(query, [amount, description], (err, result) => {
//     if (err) {
//       console.error('Database Insert Error:', err);
//       return res.status(500).send({ error: 'Failed to insert entry' });
//     }
//     console.log('Inserted entry with ID:', result.insertId);
//     res.status(201).send({ id: result.insertId, amount, description });
//   });
// });

// // Delete Entry by ID
// app.delete('/api/entries/:id', (req, res) => {
//   const entryId = req.params.id;

//   const query = 'DELETE FROM entries WHERE id = ?';
//   db.query(query, [entryId], (err, result) => {
//     if (err) {
//       console.error('Database Delete Error:', err);
//       return res.status(500).send({ error: 'Failed to delete entry' });
//     }
//     if (result.affectedRows === 0) {
//       return res.status(404).send({ error: 'Entry not found' });
//     }
//     console.log('Deleted entry with ID:', entryId);
//     res.status(200).send({ message: 'Entry deleted successfully' });
//   });
// });


// // Start Server
// app.listen(PORT, HOST, () => {
//    console.log(`Server is running on http://${HOST}:${PORT}`);
// });
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db-config');
const redis = require('./redis-client');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(bodyParser.json());

// CORS Configuration
// const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
// app.use(cors({
//   origin: ALLOWED_ORIGIN,
//   methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));
// console.log('CORS Allowed Origin:', ALLOWED_ORIGIN);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN; // e.g., https://frontend.konkas.tech

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      // 🟢 No Origin header → NGINX proxy or same-origin request
      callback(null, true);
    } else if (origin === ALLOWED_ORIGIN) {
      // 🟢 Matches the exact allowed frontend
      callback(null, true);
    } else {
      // 🔴 All others denied
      callback(new Error(`CORS Error: ${origin} not allowed`));
    }
  },
  // credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

console.log('✅ CORS Configured for:', ALLOWED_ORIGIN);


// Preflight
app.options('/api/entries', cors());

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).send(`
    <html>
      <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 20px;">
        <h1 style="color: green;">Server is healthy</h1>
      </body>
    </html>
  `);
});

// Fetch All Entries with Redis Cache
app.get('/api/entries', async (req, res) => {
  try {
    const cacheKey = 'all_entries';
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      console.log('Serving from Redis cache');
      return res.json(JSON.parse(cachedData));
    }

    db.query('SELECT * FROM entries', async (err, results) => {
      if (err) {
        console.error('Database Fetch Error:', err);
        return res.status(500).send({ error: 'Internal Server Error' });
      }

      await redis.set(cacheKey, JSON.stringify(results), 'EX', 60); // Cache for 1 min
      console.log('Serving from Database and caching');
      res.json(results);
    });
  } catch (err) {
    console.error('Redis Fetch Error:', err);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Add New Entry
app.post('/api/entries', (req, res) => {
  const { amount, description } = req.body;

  if (!amount || !description) {
    return res.status(400).send({ error: 'Amount and description are required' });
  }

  const query = 'INSERT INTO entries (amount, description) VALUES (?, ?)';
  db.query(query, [amount, description], async (err, result) => {
    if (err) {
      console.error('Database Insert Error:', err);
      return res.status(500).send({ error: 'Failed to insert entry' });
    }
    console.log('Inserted entry with ID:', result.insertId);

    // Clear the cache because data changed
    await redis.del('all_entries');

    res.status(201).send({ id: result.insertId, amount, description });
  });
});

// Delete Entry by ID
app.delete('/api/entries/:id', (req, res) => {
  const entryId = req.params.id;

  const query = 'DELETE FROM entries WHERE id = ?';
  db.query(query, [entryId], async (err, result) => {
    if (err) {
      console.error('Database Delete Error:', err);
      return res.status(500).send({ error: 'Failed to delete entry' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).send({ error: 'Entry not found' });
    }

    console.log('Deleted entry with ID:', entryId);

    // Clear the cache because data changed
    await redis.del('all_entries');

    res.send({ message: 'Entry deleted successfully' });
  });
});

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
