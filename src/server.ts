import express from 'express';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const app = express();
const upload = multer({ dest: 'uploads/' });

// Database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

// Log entry validation schema
const LogEntrySchema = z.object({
  timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/),
  service: z.string(),
  level: z.enum(['INFO', 'WARNING', 'ERROR', 'DEBUG', 'CRITICAL']),
  message: z.string()
});

app.use(express.static(path.join(__dirname, '../app/build')));
app.use(express.json({limit: '50mb'}));

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ token, error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};


// Login route
const loginUser = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ username, error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = password === user.password;
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username }, 
      process.env.JWT_SECRET || 'test', 
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', stack: error.stack });
  }
};

app.post('/login', loginUser);

// Protect routes with authMiddleware
app.post('/logs', authMiddleware, async (req, res) => {
  const page = parseInt(req.body.page as string) || 1;
  const limit = parseInt(req.body.limit as string) || 100;
  const offset = (page - 1) * limit;

  const countQuery = 'SELECT COUNT(*) FROM logs';
  const query = `
    SELECT * FROM logs 
    ORDER BY timestamp DESC 
    LIMIT $1 OFFSET $2
  `;

  try {
    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0].count);
    
    const result = await pool.query(query, [limit, offset]);
    
    res.json({
      logs: result.rows,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

app.post('/upload', authMiddleware, upload.single('logfile'), async (req, res) => {
  try {
    const results: Array<z.infer<typeof LogEntrySchema>> = [];
    const invalidEntries: any[] = [];
    let error;
    let stack;

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        try {
          const validatedEntry = LogEntrySchema.parse(data);
          results.push(validatedEntry);
        } catch (err){
          error = err;
          stack = err.stack;
          invalidEntries.push(data);
        }
      })
      .on('end', async () => {
        // Batch insert valid entries
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const insertQuery = `
            INSERT INTO logs (timestamp, service, level, message) 
            VALUES ($1, $2, $3, $4)
          `;
          
          for (const entry of results) {
            await client.query(insertQuery, [
              entry.timestamp, 
              entry.service, 
              entry.level, 
              entry.message
            ]);
          }
          
          await client.query('COMMIT');
          
          res.json({
            totalEntries: results.length,
            invalidEntries: invalidEntries.length,
            error,
            stack
          });
        } catch (err) {
          await client.query('ROLLBACK');
          error = err;
          stack = err.stack;
          res.status(500).json({
            error,
            stack
          });
        } finally {
          client.release();
        }
      });
  } catch (error) {
    res.status(500).json({ error: 'File processing failed' });
  }
});

app.post('/logs/aggregate', authMiddleware, async (req, res) => {
  const groupBy = req.body.groupBy as string || 'service';
  const query = `
    SELECT ${groupBy}, 
           COUNT(*) as count, 
           COUNT(CASE WHEN level IN ('ERROR', 'CRITICAL') THEN 1 END) as error_count
    FROM logs
    GROUP BY ${groupBy}
    ORDER BY count DESC
  `;

  try {
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Aggregation failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});