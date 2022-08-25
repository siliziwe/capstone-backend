// Importing modules
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('./config/db.js');
const {compare, hash} = require('bcrypt');
// Error handling
const createError = require('./middleware/errorHandling.js');
// Express app
const app = express();
// Express router
const router = express.Router();
// Configuration
const port = parseInt(process.env.PORT) || 3000;

app.use(cors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
    credentials: true
}));
// Set header
// app.use((req, res, next)=>{
//     res.setHeader("Access-Control-Allow-Origin", "*");
//     res.setHeader("Access-Control-Allow-Credentials", "true");
//     res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
//     res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
//     next();
// });
app.use(router, express.json(),
    express.urlencoded({
    extended: true})
);
//
app.listen(port, ()=> {
    console.log(`Server is running on port ${port}`);
});
// home
router.get('/', (req, res)=> {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});
// Get users
router.get('/users', (req, res)=> {
    let strQry =
    `SELECT id, firstName, lastName, email, password, mobile
    FROM users`;
    db.query(strQry, (err, results)=> {
        if(err) throw err;
        res.status(200).json({
            results: results
        })
    });
});
// User registration
router.post('/register',bodyParser.json(),
    (req, res)=> {
    // Retrieving data that was sent by the user
    // id, firstname, lastname, email, userpassword, usertype
    const bd = req.body;
    // If the userRole is null or empty, set it to "user".
    if((user_role === null) || (user_role === undefined) || (user_role.length === 0)) {
        user_role = "user";
    }
    // Check if a user already exists
    let strQry =
    `SELECT firstName, lastName, email, password, mobile
    FROM users
    WHERE LOWER(email) = LOWER('${email}')`;
    db.query(strQry,
        async (err, results)=> {
        if(err){
            throw err;
        }else {
            if(results.length) {
                res.status(409).json({msg: 'User already exist'});
            }else {
                // Encrypting a password
                // Default value of salt is 10.
                password = await hash(password, 10);
                // Query
                strQry =
                `
                INSERT INTO users(firstName, lastName, email, password, mobile)
                VALUES(?, ?, ?, ?, ?);
                `;
                db.query(strQry,
                    [bd.firstName, bd.lastName, bd.email, bd.password, bd.mobile],
                    (err, results)=> {
                        if(err) throw err;
                        res.status(200).json({msg: `number of affected row is: ${results.affectedRows}`});
                    })
            }
        }
    });
});

// Login
router.post('/login', bodyParser.json(),
    (req, res)=> {
    // Get email and password
    const { email, password } = req.body;
    // console.log(password);
    const strQry =
    `
    SELECT *
    FROM users
    WHERE email = '${email}';
    `;
    db.query(strQry, async (err, results)=> {
        // In case there is an error
        if(err) throw err;
        // When user provide a wrong email
        if(!results.length) {
            res.status(401).json(
                {msg: 'You provided the wrong email.'}
            );
        }
        // Authenticating a user
        await compare(password,
            results[0].password,
            (cmpErr, cmpResults)=> {
            if(cmpErr) {
                res.status(401).json(
                    {
                        msg: 'You provided the wrong password'
                    }
                )
            }
            // Apply a token and it will expire within 1 hr.
            if(cmpResults) {
                const token =
                jwt.sign(
                    {
                        id: results[0].id,
                        firstName: results[0].firstName,
                        lastName: results[0].lastName,
                        email: results[0].email
                    },
                    process.env.TOKEN_KEY,
                    {
                        expiresIn: '1h'
                    }, (err, token) => {
                        if(err) throw err
                        // Login
                        res.status(200).json({
                            msg: 'Logged in',
                            token,
                            results: results[0]
                        })
                    }
                );
            }
        });
    })
})

// Get all products
router.get('/products', (req, res)=> {

    const strQry =
    `
    SELECT product_id, productName, category, productDescription, image, price, createdBy
    FROM products;
    `;
    db.query(strQry, (err, results)=> {
        if(err) throw err;
        res.status(200).json({
            results: results
        })
    })
});

// Create new products
router.post('/products', bodyParser.json(),
    (req, res)=> {
    const bd = req.body;
    // Query
    const strQry =
    `
    INSERT INTO products(productName, category, productDescription, image, price, createdBy)
    VALUES(?, ?, ?, ?, ?, ?);
    `;

    db.query(strQry,
        [bd.productName, bd.category, bd.productDescription, bd.image, bd.price, bd.createdBy],
        (err, results)=> {
            if(err) throw err;
            res.status(200).send(`number of affected row/s: ${results.affectedRows}`);
        })
});
// Get one product
router.get('/products/:id', (req, res)=> {
    // Query
    const strQry =
    `
    SELECT product_id, productName, category, productDescription, image, price, createdBy
    FROM products
    WHERE product_id = ?;
    `;
    db.query(strQry, [req.params.id], (err, results)=> {
        if(err) throw err;
        res.json({
            status: 200,
            results: (results.length <= 0) ? "Sorry, no product was found." : results
        })
    })
});

// Update product
router.put('/products', (req, res)=> {
    const bd = req.body;
    // Query
    const strQry =
    `UPDATE products
    SET ?
    WHERE product_id = ?`;

    db.query(strQry,[bd, bd.product_id], (err, data)=> {
        if(err) throw err;
        res.send(`number of affected record/s: ${data.affectedRows}`);
    })
});

// Delete product
router.delete('/products/:id', (req, res)=> {

    const strQry =
    `
    DELETE FROM products
    WHERE product_id = ?;
    `;
    db.query(strQry,[req.params.id], (err, data, fields)=> {
        if(err) throw err;
        res.send(`${data.affectedRows} row was affected`);
    })
});
app.use(createError);
