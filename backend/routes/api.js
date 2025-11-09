const express = require('express');
const router = express.Router();
const pool = require('../database/sqlConnections.js')
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6*1024*1024 } });
const bcrypt = require('bcrypt');
const joi = require('joi');
const { ok } = require('assert');
const saltRounds = 10;

//Database Queries imports
const {createUser} = require('../database/dbQueries/userQueries.js');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post('/signup', async(req, res)=>{
    try{
        const {first_name, last_name, email, password} = req.body;

        if(!first_name || !last_name || !email || !password){
            return res.status(400).json({message: "All fields are required"});
        }

        const schema = joi.object({
            first_name: joi.string().max(50).required(),
            last_name: joi.string().max(50).required(),
            email: joi.string().email().max(100).required(),
            password: joi.string().min(10).max(100).pattern(
				new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=[\\]{};:"\\\\|,.<>/?]).+$')
			).required()			.messages({
				'string.pattern.base':
				'Password must include uppercase, lowercase, number, and special character.',
			}),
        });

        const {error} = schema.validate({first_name, last_name, email, password});
        if(error){
            return res.status(400).json({message: error.details[0].message});   
        }

        const existingUser = await getUserByEmail(pool, email);
		if (existingUser) {
			return res.status(409).json({ ok: false, message: 'Email already taken.' });
		}

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await createUser(pool, first_name, last_name, email, hashedPassword);
        res.json({ok: true, message: "User created successfully"});
    } catch(err){
        console.error(err);
        res.status(500).json({ok: false, message: err.message});
    }
})

router.post('/login', async(req,res)=>{
    try{
        const {email, password} = req.body;

        if(!email || !password){
            return res.status(400).json({message: "Email and Password are required"});
        }
        const user = await getUserByEmail(pool, email);
        if(!user){
            return res.status(401).json({message: "Invalid email"});
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if(!passwordMatch){
            return res.status(401).json({message: "Invalid password"});
        }

        req.session.user ={
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email
        };
        res.json({ok: true, message: "User logged in successfully"});
    } catch(err){
        console.error(err);
        res.status(500).json({ok: false, message: err.message});

    } 
})