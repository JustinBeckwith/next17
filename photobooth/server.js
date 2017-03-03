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
const gm = require('gm');
const child_process = require('child_process');
const cloudSettings = {
    projectId: 'photobooth-next',
    keyFilename: __dirname + '/keyfile.json'
};
const vision = require('@google-cloud/vision')(cloudSettings);
const storage = require('@google-cloud/storage')(cloudSettings);

// load secrets
nconf.argv().env().file({
    file: 'secrets.json'
});

const bucket = storage.bucket('photobooth-next');

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


// find objects in the picture with the cloud vision API
app.post('/sendpic', upload.array(), (req, res, next) => {
  // grab the base64 encoded image from the request and save to disk
  let pic = req.body.pic;
  pic = pic.split("data:image/png;base64,")[1]

  // store the file on disk 
  stashFile(pic, (err, filePath) => {

    if (err) {
      res.status(500).send('Error acquiring image.');
      return next(err);
    }

    let thumbPath = path.join(__dirname, 'tmp', uuid() + '.png');
    let templatePath = path.join(__dirname, 'images', 'twittercard.png');
    let cardPath = path.join(__dirname, 'tmp', uuid() + '.png');
    gm(filePath)
      .resize(370, 370, '^')
      .gravity("Center")
      .crop(370, 370)
      .write(thumbPath, err => {
        console.error(err);
        let cmd = `gm convert -size 1024x580 xc:transparent -page +595+106 ${thumbPath} -page +0+0 ${templatePath} -flatten ${cardPath}`;
        child_process.exec(cmd, (err, stdout, stderr) => {
          if (err) {
            console.error(err);
            return next(err);
          }
          console.log(stderr);
          console.log(stdout);

          bucket.upload(cardPath, (err, file) => {
            if (err) {
              console.error(err);
              return next(err);
            }
            file.makePublic((err, data) => {
              if (err) {
                console.error(err);
                return next(err);
              }
              res.json({
                url: file.metadata.mediaLink
              });
          });
        });
      });
    });

    console.log(`Thumb path: ${thumbPath}`);
    console.log(`Card path: ${cardPath}`);

    // // use the cloud vision API to find stuff
    // console.log('analyzing the image...');
    // vision.detectFaces(filePath, (err, faces) => {

    //   if (err) {
    //     res.status(500).send('Error analyzing image.');
    //     return next(err);
    //   }

    //   console.log('Image analysis complete!');
    //   console.log(faces);

    //   // return the results to the browser
    //   res.json(faces);

      // clean up the image
      // fs.unlink(filePath, (err) => {
      //   if (err) {
      //     console.error(`error cleaning up file ${filePath}`);
      //   }
      // });
    // });
  });
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

// gm convert meinahat.jpg -resize 368x368^ -gravity Center -crop 368x368+0+0 +repage thumb.png 
// gm convert -size 1024x580 xc:transparent -page +595+106 thumb.png -page +0+0 twittercard.png -flatten result.png
