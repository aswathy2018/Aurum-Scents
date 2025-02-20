// errorMiddleware.js
const createError = require('http-errors');

const errorHandler = (err, req, res, next) => {
    // Log error for debugging
    console.error('Error:', err);

    // Default error status and message
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    // Handle different types of errors
    switch (err.name) {
        case 'ValidationError':
            return res.status(400).render('adminLogin', {
                error: 'Invalid input data',
                username: req.body.username
            });

        case 'MongoError':
        case 'MongoServerError':
            if (err.code === 11000) {
                return res.status(409).render('adminLogin', {
                    error: 'Duplicate entry found',
                    username: req.body.username
                });
            }
            break;

        case 'AuthenticationError':
            return res.status(401).render('adminLogin', {
                error: 'Authentication failed',
                username: req.body.username
            });

        case 'SessionError':
            return res.redirect('/admin/login');
    }

    switch (status) {
        case 404:
            return res.status(404).render('404error');
        case 401:
            return res.redirect('/admin/login');
        case 403:
            return res.status(403).render('adminLogin', {
                error: 'Access denied',
                username: req.body.username
            });
        default:
            return res.status(status).render('adminLogin', {
                error: message,
                username: req.body.username
            });
    }
};

module.exports = errorHandler;