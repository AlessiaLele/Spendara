const jwt = require('jsonwebtoken');

const PURPOSE = 'tink-connect';

function createTinkState(userId) {
    return jwt.sign(
        { userId, purpose: PURPOSE },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
    );
}

function verifyTinkState(state) {
    return jwt.verify(state, process.env.JWT_SECRET);
}

module.exports = {
    PURPOSE,
    createTinkState,
    verifyTinkState
};