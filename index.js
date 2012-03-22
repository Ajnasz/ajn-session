/*jslint node: true, es5: true */
var cookie = require('ajncookie');
var sessionLifeTime = 60000 * 30; // 60 min

var sessions = {};

function generateSession() {
    var sessionId = new Date().getTime(),
        id = '',
        max = 10,
        min = 1,
        chars;
    chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
          'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    chars = chars.concat(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                         'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U',
                         'V', 'W', 'X', 'Y', 'Z']);
    chars = chars.concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    while (max--) {
        id += chars[Math.floor(Math.random() * (chars.length - 1 - 1 + 1)) + min];
    }
    sessionId += id;
    sessions[sessionId] = {
        date: Date.now(),
        data: {}
    };
    return sessionId;
}

function getSession(sessionId) {
    return sessions[sessionId];
}

function updateSession(sessionId) {
    if (sessions[sessionId]) {
        sessions[sessionId].date = Date.now();
    } else {
        sessionId = generateSession();
    }
    return sessionId;
}

function createSession(req, res, sessionCookieName) {
    var sessionId = cookie.getCookie(req, sessionCookieName);
    if (!sessionId) {

        sessionId = generateSession();
    } else {
        sessionId = updateSession(sessionId);
    }
    cookie.setCookie(res, sessionCookieName, sessionId);
    return sessionId;
}

function invalidateSession(sessionId) {
    if (sessions[sessionId]) {
        sessions[sessionId] = null;
        delete sessions[sessionId];
        return true;
    }
    return false;
}

function setData(sessionId, name, value) {
    if (sessions[sessionId]) {
        sessions[sessionId].data[name] = value;
    }
}

function getData(sessionId, name) {
    if (sessions[sessionId]) {
        return sessions[sessionId].data[name];
    }
}


function Session(req, res, conf) {
    conf = conf || {};
    this.maxSize = conf.maxSize || 262144;
    this.sessionName = conf.sessionName || 'nodesess';
    this.sessionId = createSession(req, res, this.sessionName);
}
Session.prototype.checkDataSize = function (value) {
    var sess = getSession(this.sessionId),
        size = 0;
    Object.keys(sess.data).forEach(function (name) {
        if (sess.data[name]) {
            size += Buffer.byteLength(sess.data[name]);
        }
    });
    return (size + Buffer.byteLength(value)) <= this.maxSize;
};
Session.prototype.setData = function (name, value) {
    this.sessionId = updateSession(this.sessionId);
    if (value === null) {
        setData(this.sessionId, name, value);
    } else if (this.checkDataSize(value)) {
        setData(this.sessionId, name, value);
    } else {
        throw new RangeError('Can\'t set data, limit exceeded. ');
    }
};
Session.prototype.getData = function (name) {
    this.sessionId = updateSession(this.sessionId);
    return getData(this.sessionId, name);
};
Session.prototype.invalidate = function () {
    invalidateSession(this.sessionId);
};

setInterval(function () {
    var minLastAccess = Date.now() - sessionLifeTime;
    Object.keys(sessions).forEach(function (sessionId) {
        if (sessions[sessionId].date < minLastAccess) {
            invalidateSession(sessionId);
        }
    });
}, 59000);

exports.Session = Session;
