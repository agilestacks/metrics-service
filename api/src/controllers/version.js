const fs = require('fs');
const path = require('path');
const {version} = require('../../package.json');

let rev;
try {
    const revPath = path.join(__dirname, '../rev.txt');
    rev = fs.readFileSync(revPath, 'utf8').trim();
} catch (err) {
    rev = 'HEAD';
}

const started = new Date();

module.exports = {
    get(ctx) {
        ctx.body = {version, rev, started};
    }
};
