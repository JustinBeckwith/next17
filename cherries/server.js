const express = require('express');
const swig = require('swig');
const path = require('path');
const favicon = require('serve-favicon');
const redis = require('redis');
const nconf = require('nconf');
const Promise = require('bluebird');
const PubNub = require('pubnub');

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

// load secrets
nconf.argv().env().file({
    file: 'secrets.json'
});

// configure express
const app = express();
app.set('views', path.join(__dirname, 'views'));
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));

// get the current fruit and cc for this app
let config = require('./config.json');
let fruit = process.env.image || 'durian';
let cc = "";
for (let i=0; i<config.fruits.length; i++) {
    if (fruit === config.fruits[i].key) {
        cc = config.fruits[i].cc;
    }
}

// pubnub setup
let pubnub = new PubNub({
    ssl: true,
    publishKey: nconf.get('pubnub_publish_key'),
    subscribeKey: nconf.get('pubnub_subscribe_key')
});

// set up redis
const redisClient = redis.createClient(
    nconf.get('redis_port') || '6379',
    nconf.get('redis_host') || '127.0.0.1', 
    {
        'auth_pass': nconf.get('redis_password'),
        'return_buffers': true
    }
).on('error', function(err) {
    console.error('ERR:REDIS: ' + err);
});

// read all data from redis
function getResults() {
    return Promise.all(config.fruits.map(fruit => {
        return redisClient.getAsync(fruit.key);
    })).then(results => {
        let r = [];
        for (let i=0; i<results.length; i++) {
            r.push({
                key: config.fruits[i].key,
                count: results[i]*1
            });
        }
       return r;
    });
}

// set up main route
app.get('/', (req, res, next) => {
    redisClient.incr(fruit, (err, reply) => {
        if (err) return next(err);
        
        res.render('index', {
            fruit: fruit,
            cc: cc
        });

        getResults().then(r => {
            pubnub.publish({
                channel: 'click',
                message: r,
                callback: function(r) {
                    res.sendStatus(202);
                },
                error: function(err) {
                    return next(err);
                }
            });
        });

    });
});

// set up dashboard
app.get('/dashboard', (req, res, next) => {
    getResults().then(r => {
        res.render('dashboard', { 
            results: r,
            subscribeKey: nconf.get('pubnub_subscribe_key')
        });
    }).catch(err => {
        console.error(err);
        next(err);
    });
});

// reset the counter in redis to 0
app.get('/reset', function(req, res, next) {
    for (let fruit of config.fruits) {
        console.log(fruit.key);
        redisClient.set(fruit.key, 0, (err, data) => {
           if (err) { console.error(err); }
        });
    }
    res.sendStatus(202);
});

const server = app.listen(process.env.PORT || 8080, '0.0.0.0', () => {
    console.log('App listening at http://%s:%s', 
        server.address().address,
        server.address().port);
});