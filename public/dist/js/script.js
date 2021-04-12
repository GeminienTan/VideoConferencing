const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
var username;
if(u_name !=undefined && u_name !=""){
  username = u_name;
}
else if(g_name !=undefined && g_name !=""){
  username = g_name;
}

myVideo.addEventListener("resize", ev => {
  let w = myVideo.videoWidth;
  let h = myVideo.videoHeight;

  if (w && h) {
    myVideo.style.width = "400px";
    myVideo.style.height = h;
    myVideo.style.border = "thick solid #852FF5";
    //myVideo.style.backgroundColor = "#852FF5";
  }
}, false);

myVideo.muted = true;

// while deploying change port to 443,
// on development make it 3030
var peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "443",
});
const peers = {}

var currentPeer;
var peerList = [];

let myVideoStream;
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    muteUnmute();
    checkCamera();
    addVideoStream(myVideo, stream);

    peer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });
    socket.on("user-connected", (userId) => {
      setTimeout(() => {
        // user joined
        connectToNewUser(userId, stream)
      }, 1000)
      //alert("someone enter" + userId);
    });
    let msg = $("#chat_message");
    $("html").keydown((e) => {
      if (e.which === 13 && msg.val().length !== 0) {
        //addChat(msg.val());
        socket.emit("message", msg.val(),username);
        msg.val("");
      }
    });

    socket.on("createMessage", (message, userId,userName) => {
      $(".messages").append(
        `<li class="message"><b>${username}</b><br/>${message}</li>`
      );
      scrollToBottom();
    });

  });

   
const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
};
peer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
});

socket.on('user-disconnected', userId => {
    if (peers[userId]) 
    peers[userId].close()
  }) 

const connectToNewUser = (userId, stream) => {
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
    peerList.push(call.peer);
    currentPeer = call.peerConnection
  });
  call.on('close', () => {
    video.remove()
  })

  peers[userId] = call
};

const scrollToBottom = () => {
  var d = $(".main__chat_window");
  d.scrollTop(d.prop("scrollHeight"));
};

const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  } else {
    setMuteButton();
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
};

const setMuteButton = () => {
  const html = `
      <i class="fas fa-microphone"></i>
      <span>Mute</span>
    `;
  document.querySelector(".main__mute_button").innerHTML = html;
};

const setUnmuteButton = () => {
  const html = `
      <i class="unmute fas fa-microphone-slash"></i>
      <span>Unmute</span>
    `;
  document.querySelector(".main__mute_button").innerHTML = html;
};

const playStop = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;

  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo();
  } else {
    setStopVideo();
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
};

const checkCamera = () => {
  
  if(cameraOn == true){
    setStopVideo();
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
  else if(cameraOn == false){
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo();
  }
}

const setStopVideo = () => {
  const html = `
      <i class="fas fa-video"></i>
      <span>Stop Video</span>
    `;
  document.querySelector(".main__video_button").innerHTML = html;
};

const setPlayVideo = () => {
  const html = `
    <i class="stop fas fa-video-slash"></i>
      <span>Play Video</span>
    `;
  document.querySelector(".main__video_button").innerHTML = html;
};

document.addEventListener("DOMContentLoaded", function () {
  function dragElement(element, direction) {
    var md; // remember mouse down info

    const first = document.getElementsByClassName("main__left")[0];
    const second = document.getElementsByClassName("main__right")[0];

    element.onmousedown = onMouseDown;

    function onMouseDown(e) {
      //console.log("mouse down: " + e.clientX);
      md = {
        e,
        offsetLeft: element.offsetLeft,
        offsetTop: element.offsetTop,
        firstWidth: first.offsetWidth,
        secondWidth: second.offsetWidth,
      };

      document.onmousemove = onMouseMove;
      document.onmouseup = () => {
        //console.log("mouse up");
        document.onmousemove = document.onmouseup = null;
      };
    }

    function onMouseMove(e) {
      //console.log("mouse move: " + e.clientX);
      var delta = { x: e.clientX - md.e.clientX, y: e.clientY - md.e.clientY };

      if (direction === "H") {
        // Horizontal
        // Prevent negative-sized elements
        delta.x = Math.min(Math.max(delta.x, -md.firstWidth), md.secondWidth);

        element.style.left = md.offsetLeft + delta.x + "px";
        first.style.width = md.firstWidth + delta.x + "px";
        second.style.width = md.secondWidth - delta.x + "px";
      }
    }
  }
  dragElement(document.getElementById("dragMe"), "H");
});

const addChat = (msg) => {
  /*alert(msg);
  alert(chat_type);
  alert(c_id);
  alert(cv_id);*/
}




