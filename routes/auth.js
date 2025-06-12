const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Get JWT Secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET;

// Register User