const agent = require('@google-cloud/trace-agent').start();
const express = require('express');
const swig = require('swig');
const path = require('path');
const favicon = require('serve-favicon');
const nconf = require('nconf');
const PubNub = require('pubnub');
const multer  = require('multer');
const uuid = require('uuid');
const fs = require('fs');
const yes = require('yes-https');

const child_process = require('child_process');
const cloudSettings = {
    projectId: 'videobooth-next',
    keyFilename: __dirname + '/keyfile.json'
};
const vision = require('@google-cloud/vision')(cloudSettings);
const storage = require('@google-cloud/storage')(cloudSettings);
const debug = require('@google-cloud/debug-agent').start(cloudSettings);

// load secrets
nconf.argv().env().file({
    file: 'secrets.json'
});

const bucket = storage.bucket('videobooth-next');

// configure express
const app = express();
app.use(yes());
const upload = multer();
app.set('views', path.join(__dirname, 'views'));
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));

// pubnub setup
let pubnub = new PubNub({
    ssl: true,
    publishKey: nconf.get('pubnub_publish_key'),
    subscribeKey: nconf.get('pubnub_subscribe_key')
});

// set up main route
app.get('/', (req, res, next) => {        
    res.render('index');
});

// set up dashboard
app.get('/dashboard', (req, res, next) => {
    res.render('dashboard', { 
        results: r,
        subscribeKey: nconf.get('pubnub_subscribe_key')
    });
});

app.get('/next', (req, res, next) => {

  res.render('next', { 
    url: req.query.url
  });
});



const type = upload.single('video');
app.post('/sendpic', type, (req, res, next) => {
  let tmpFiles = [];
  let sourcePath = path.join(__dirname, 'tmp', uuid() + ".webm");
  let thumbPath = path.join(__dirname, 'tmp', uuid() + '.mp4');
  let templatePath = path.join(__dirname, 'images', 'twittercard.png');
  let cardPath = path.join(__dirname, 'tmp', uuid() + '.gif');
  console.log(`Source path: \t ${sourcePath}`);
  console.log(`Thumb path: \t ${thumbPath}`);
  console.log(`Template path: \t ${templatePath}`);
  console.log(`Card path: \t ${cardPath}`);
  tmpFiles.push(sourcePath, thumbPath, cardPath);

  fs.writeFile(sourcePath, req.file.buffer, err => {
    if (err) {
      console.error(err);
      return next(err);
    }
    
    // generate the thumbnail video
    let scaleCommand = `ffmpeg -i ${sourcePath} -vf "scale=(iw*sar)*max(370/(iw*sar)\\,370/ih):ih*max(370/(iw*sar)\\,370/ih), crop=370:370" ${thumbPath}`;
    console.log('running command:');
    console.log(scaleCommand);
    child_process.exec(scaleCommand, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        return next(err);
      }
      console.log(stdout);
      console.error(stderr);
      
      // generate the gif with the twittercard overlay
      let mergeCommand = `ffmpeg -i ${thumbPath} -i ${templatePath} -filter_complex "nullsrc=size=1024x580 [base]; [base][0:v] overlay=595:106[tmp1]; [tmp1][1:v] overlay=0:0" -pix_fmt rgb8 -y -t 00:00:05 ${cardPath}`;
      console.log(mergeCommand);
      child_process.exec(mergeCommand, (err, stdout, stderr) => {
        if (err) {
          console.error(err);
          return next(err);
        }

        console.log('merge complete');
        console.log(stdout);
        console.log(stderr);

        bucket.upload(cardPath, (err, file) => {
          if (err) {
            console.error(err);
            return next(err);
          }
          console.log('card created');
          file.makePublic((err, data) => {
            if (err) {
              console.error(err);
              return next(err);
            }
            console.log('card public');
            res.json({
              url: file.metadata.mediaLink
            });
          });
        });
      });
    });
  });
      // clean up the image
      // fs.unlink(filePath, (err) => {
      //   if (err) {
      //     console.error(`error cleaning up file ${filePath}`);
      //   }
      // });
    // });
  // });
});


const stashFile = (data, callback) => {
  let buffer = new Buffer(data, 'base64');
  let filePath = path.join(__dirname, 'tmp', uuid());
  console.log(`stashing file on disk at ${filePath}`);
  fs.writeFile(filePath, buffer, (err) => {
    callback(err, filePath);
  });
}

const server = app.listen(process.env.PORT || 8080, '0.0.0.0', () => {
    console.log('App listening at http://%s:%s', 
        server.address().address,
        server.address().port);
});

/*

brew install libvpx
brew install  ffmpeg --enable-libvpx
ffmpeg -i test.webm -vf "scale=(iw*sar)*max(370/(iw*sar)\,370/ih):ih*max(370/(iw*sar)\,370/ih), crop=370:370" cropped.mp4
ffmpeg -i cropped.mp4 -i twittercard.png -filter_complex "nullsrc=size=1024x580 [base]; [base][0:v] overlay=595:106[tmp1]; [tmp1][1:v] overlay=0:0" -pix_fmt yuv420p -t 00:00:05 output.gif
*/