/*
Copyright (C) 2012-2013 Lajos Koszti ajnasz@ajnasz.hu

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

/*jslint node: true, es5: true */
var cookie = require('ajncookie');

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

function createSession(req, res, sessionCookieName, cookieProps) {
    var sessionId = cookie.getCookie(req, sessionCookieName);
    if (!sessionId) {
        sessionId = generateSession();
    } else {
        sessionId = updateSession(sessionId);
    }
    cookieProps = cookieProps || {};
    cookie.setCookie(
        res,
        sessionCookieName,
        sessionId,
        cookieProps.expiration,
        cookieProps.domain,
        cookieProps.secure,
        cookieProps.httpOnly,
        cookieProps.path
    );
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

function delData(sessionId, name) {
    if (sessions[sessionId]) {
        delete sessions[sessionId].data[name];
    }
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
    this.maxSize = conf.maxSize || Session.maxSize;
    this.sessionName = conf.sessionName || Session.sessionName;
    this.sessionId = createSession(req, res, this.sessionName, conf.cookieProps);
}
Session.prototype.checkDataSize = function (value) {
    var sess = getSession(this.sessionId),
        size = 0;
    Object.keys(sess.data).forEach(function (name) {
        if (sess.data[name]) {
            var data = sess.data[name];

            if (typeof data !== 'string') {
                data = JSON.stringify(sess.data[name]);
            }

            size += Buffer.byteLength(data);
        }
    });

    if (typeof value !== 'string') {
        value = JSON.stringify(value);
    }

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
Session.prototype.delData = function (name) {
    this.sessionId = updateSession(this.sessionId);
    delData(this.sessionId, name);
};
Session.prototype.invalidate = function () {
    invalidateSession(this.sessionId);
};

var setupSessionCleanup = (function () {
    var intervalId = null;
    return function setupSessionCleanup() {
        if (intervalId) {
            clearInterval(intervalId);
        }
        intervalId = setInterval(function () {
            var minLastAccess = Date.now() - Session.sessionLifeTime;
            Object.keys(sessions).forEach(function (sessionId) {
                if (sessions[sessionId].date < minLastAccess) {
                    invalidateSession(sessionId);
                }
            });
        }, Session.clearInterval);
    };
}());

(function () {
    var clearIntervalVal = 59000; // every minute
    Object.defineProperty(Session, 'clearInterval', {
        enumerable: true,
        configurable: true,
        get: function () {
            return clearIntervalVal;
        },
        set: function (val) {
            clearIntervalVal = val;
            setupSessionCleanup();
        }
    });
}());

Session.sessionLifeTime = 60000 * 30; // 60 min
// max size of data per session
Session.maxSize = 262144;
// session cookie name
Session.sessionName = 'nodesess';


setupSessionCleanup();
exports.Session = Session;
