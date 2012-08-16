var spawn = require('child_process').spawn;

desc('default', 'Run tests for ajn-session package');
task('default', function (t) {
    spawn('node', ['tests/test.js'], {
        stdio: 'inherit'
    });
});
