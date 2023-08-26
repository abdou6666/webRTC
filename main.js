let APP_ID = '6aa3eed28cb64bf1b17878e179785524'
let token = null;

let localStream;
let remoteStream;
let peerConnection;
let uid = Math.random(Math.random() * 10_000).toString();

let client;
let channel;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room');
if (!roomId) {
    window.location = "lobby.html";
}


const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

const handleUserJoined = async (MemberId) => {
    console.log('new user joined : ', MemberId);
    createOffer(MemberId);

}
const handleUserLeft = async (memberId) => {
    document.getElementById('user-2').style.display = 'none'
}
const handleMessageFromPeer = async (message, memberId) => {
    const messageParsed = JSON.parse(message.text)
    if (messageParsed.type === 'offer') {
        console.log('offer ');
        createAnswer(memberId, messageParsed.offer);
    }
    if (messageParsed.type === 'offer') {
        createAnswer(memberId, message.offer)
    }

    if (messageParsed.type === 'answer') {
        addAnswer(messageParsed.answer)
    }

    if (messageParsed.type === 'candidate') {
        if (peerConnection) {
            peerConnection.addIceCandidate(messageParsed.candidate)
        }
    }
}

const init = async () => {
    client = await AgoraRTM.createInstance(APP_ID);
    await client.login({ uid, token });

    channel = client.createChannel(roomId);

    await channel.join();

    channel.on('MemberJoined', handleUserJoined)
    channel.on('MemberLeft', handleUserLeft)

    client.on('MessageFromPeer', handleMessageFromPeer)

    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    // localStream = await navigator.mediaDevices.getUserMedia({ video: true });
    document.getElementById('user-1').srcObject = localStream;

}

const createPeerConnection = async (MemberId) => {
    peerConnection = new RTCPeerConnection(servers)

    remoteStream = new MediaStream();
    document.getElementById('user-2').srcObject = remoteStream;
    document.getElementById('user-2').style.display = "block";

    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        document.getElementById('user-1').srcObject = localStream;
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (e) => {
        e.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = async (e) => {
        if (e.candidate) {
            client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'candidate', 'candidate': e.candidate }) }, MemberId)

        }
    }
}

const createOffer = async (MemberId) => {
    await createPeerConnection(MemberId);

    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'offer', 'offer': offer }) }, MemberId)

}


const createAnswer = async (memberId, offer) => {
    await createPeerConnection(memberId);


    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);
    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'answer', 'answer': answer }) }, memberId)

}

const addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer);
    }
}

const leaveChannel = async () => {
    await channel.leave();
    await client.logout();
}
const toggleCamera = async () => {
    const videoTrack = localStream.getTracks().find(track => track.kind === 'video')
    if (videoTrack.enabled) {
        videoTrack.enabled = false;
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255,80,80)';
    } else {
        videoTrack.enabled = true;
        document.getElementById('camera-btn').style.backgroundColor = 'rgba(179,102,249,0.9)';
    }
}
const toggleMic = async () => {
    const audioTrack = localStream.getTracks().find(track => track.kind === 'audio')
    console.log(audioTrack);
    if (audioTrack.enabled) {
        audioTrack.enabled = false;
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255,80,80)';
    } else {
        audioTrack.enabled = true;
        document.getElementById('mic-btn').style.backgroundColor = 'rgba(179,102,249,0.9)';
    }
}

document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)


window.addEventListener('beforeunload', leaveChannel)

init();
