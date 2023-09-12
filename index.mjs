import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
import database from './database.mjs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import cors from 'cors';

const app = express();
const port = 3000;

//SECRETKEY
const SECRET_KEY = "asdfjsaklfhasf";  // use dotenv thingy in future

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const unprotectedRouter = express.Router();
const protectedRouter = express.Router();


const validateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];  // Assuming "Bearer <token>" format

    if (!token) {
        return res.status(401).json({
            res: 'error',
            message: 'Access denied. No token provided.'
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY); 
        req.user = decoded; 
        next(); 
    } catch (error) {
        res.status(400).json({
            res: 'error',
            message: 'Invalid token.'
        });
    }
};
protectedRouter.use(validateToken);


unprotectedRouter.post('/register', async (req, res) => {
    const { mail, username, password } = req.body;
    const hashed = bcrypt.hashSync(password, 10);

    try {
        const [users] = await database.pool.query('SELECT * FROM users WHERE mail = ?', [mail]);
        if (users.length) {
            return res.json({
                res: "error",
                message: "User already exists"
            });
        }
        await database.pool.query('INSERT INTO users (mail, username, password) VALUES (?, ?, ?)', [mail, username, hashed]);
        let id = await database.pool.query('SELECT id FROM users WHERE mail = ?', [mail]);
        const payload = {
            userid: id,

            
        }

        const generatedtoken = jwt.sign(payload, SECRET_KEY, { expiresIn: '1d' });

        res.status(201).json({
            res: "success",
            token: generatedtoken
        });
    }
    
    catch (error) {
        res.status(500).json({
            res: "error",
            message: "Database error during registration"
        });
        console.error(error);
    }
    finally {
        if (connection) connection.release();
    }
    
});

unprotectedRouter.post('/login', async (req, res) => {
    try {
        const [users] = await database.pool.query('SELECT * FROM users WHERE mail = ?', [mail]);
        if (!users.length) {
            return res.status(400).json({
                res: "error",
                message: "User not found"
            });
        }

        const match = await bcrypt.compare(password, users[0].password);
        if (match) {
            const payload = {
                userid: users[0].id
            };
    
            const generatedtoken = jwt.sign(payload, SECRET_KEY, { expiresIn: '1d' });
            res.status(200).json({ 
                res: "success",
                token: generatedtoken
            });
        } else {
            res.status(400).json({
                res: "error",
                message: "Wrong password"
            });
        }
    } catch (error) {
        res.status(500).json({
            res: "error",
            message: "Database error during login"
        });
        console.error(error);
    }
    finally {
        if (connection) connection.release();
    }   
});


protectedRouter.get('/employees', async (req, res) => {
    try {
        const connection = await database.getDBConnection();
        const [rows, fields] = await connection.query('SELECT * FROM employees');
        connection.release();
        
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
        console.error(error);
    }
    finally {
        if (connection) connection.release();
    }
})
protectedRouter.post('/employees', async (req, res) => {
    try {
        const connection = await database.getDBConnection();
        const [rows, fields] = await connection.query('INSERT INTO employees SET ?', req.body);
        connection.release();
        
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
        console.error(error);
    }
    finally {
        if (connection) connection.release();
    }
})

protectedRouter.delete('/employees/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await database.getDBConnection();
        await connection.query('DELETE FROM employees WHERE id = ?', [id]);
        connection.release();
        
        res.status(200).json({ message: 'Employee deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
        console.error(error);
    }
    finally {
        if (connection) connection.release();
    }
});


app.use('/api', unprotectedRouter);
app.use('/api/protected', protectedRouter);


app.listen(port,()=>{
    console.log(`Server running on port ${port}`);
});