var mediaSource, mediaRecorder, recordedBlobs, sourceBuffer, banner;

mediaSource = new MediaSource();
gumVideo = document.getElementById('video');
recordButton = document.getElementById('startbutton');
banner = document.getElementById('message');

mediaSource.addEventListener('sourceopen', handleSourceOpen, false);
recordButton.onclick = startRecording;

var constraints = {
  audio: false,
  video: true
};

navigator.mediaDevices.getUserMedia(constraints).
    then(handleSuccess).catch(handleError);

function handleSuccess(stream) {
  console.log('getUserMedia() got stream: ', stream);
  window.stream = stream;
  if (window.URL) {
    gumVideo.src = window.URL.createObjectURL(stream);
  } else {
    gumVideo.src = stream;
  }
}

function handleError(error) {
  console.log('navigator.getUserMedia error: ', error);
}

function handleSourceOpen(event) {
  console.log('MediaSource opened');
  sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
  console.log('Source buffer: ', sourceBuffer);
}

function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

function handleStop(event) {
  console.log('Recorder stopped: ', event);
}

function startRecording() {
  recordedBlobs = [];
  var options = {mimeType: 'video/webm;codecs=vp9'};
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    console.log(options.mimeType + ' is not Supported');
    options = {mimeType: 'video/webm;codecs=vp8'};
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.log(options.mimeType + ' is not Supported');
      options = {mimeType: 'video/webm'};
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.log(options.mimeType + ' is not Supported');
        options = {mimeType: ''};
      }
    }
  }
  try {
    mediaRecorder = new MediaRecorder(window.stream, options);
  } catch (e) {
    console.error('Exception while creating MediaRecorder: ' + e);
    alert('Exception while creating MediaRecorder: '
      + e + '. mimeType: ' + options.mimeType);
    return;
  }
  console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
  mediaRecorder.onstop = handleStop;
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start(10);
  console.log('MediaRecorder started', mediaRecorder);
  banner.style.display = 'inline-block';
  setTimeout(stopRecording, 6000);
}

function stopRecording() {
  mediaRecorder.stop();
  console.log('Recorded Blobs: ', recordedBlobs);
  banner.innerText = "processing"
  banner.style.color = 'green';
  postVideoToServer();
}

function postVideoToServer() {

  var blob = new Blob(recordedBlobs, {type: 'video/webm'});
  var form = new FormData()
  form.append('video', blob, 'filemon.webm');

  fetch("/sendpic", {
    method: "POST",
    body: form
  }).then((response) => {
    return response.json();
  }).then((result) => {
    console.log(result);
    window.location.href = '/next?url=' + encodeURIComponent(result.url);
  }).catch((err) => {
    console.error('There was a problem :(');
    console.error(err);
  });
}