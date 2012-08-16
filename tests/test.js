/*jslint node: true*/
var Session = require('../index').Session;
var assert = require('assert');
var http = require('http');


var srv = http.createServer(function (req, res) {
    var session = new Session(req, res);
    session.setData('foo', 'bar');
    assert.equal(session.getData('foo'), 'bar');
    session.setData('foofoo', {bar: 'baz'});
    assert.equal(typeof session.getData('foofoo'), 'object', 'foofoo not an object');
    assert.equal(Object.keys(session.getData('foofoo')).length, 1, 'foofoo keys length is not 1');
    assert.equal(session.getData('foofoo').bar, 'baz', 'foofoo.bar value is not baz');
    session.setData('foo', null);
    assert.equal(session.getData('foo'), null);
    session.delData('foo', null);
    assert.equal(typeof session.getData('foo'), 'undefined');
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('okai');
    srv.close();
    console.log('tests passed');
    process.exit(0);
});
srv.listen(1111, '127.0.0.1');
http.get({
    host: '127.0.0.1',
    port: 1111,
    path: '/'
});
