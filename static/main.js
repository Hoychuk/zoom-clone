const socket = io("/"); // підключаємо бібліотеку socket.io для відсилання подій клієнтської частини, які будуть отримані сервером socket.io
const main__chat__window = document.getElementById("main__chat_window"); // Отримуємо div, де будуть відображатися повідомлення
const videoGrids = document.getElementById("video-grids"); // Цей div буде містити різні div, в яких буде відображатися відео та ім'я
const myVideo = document.createElement("video"); // Цей елемент відео покаже нам власне відео
const chat = document.getElementById("chat"); // Отримуємо основний правий div
let OtherUsername = ""; // Тут буде зберігатися ім'я іншого користувача
chat.hidden = true; // Спочатку приховуємо вікно чату
myVideo.muted = true; // Встановлюємо аудіо відео на беззвучний режим

window.onload = () => { // Коли завантажується вікно
    $(document).ready(function() {
        $("#getCodeModal").modal("show"); // Показуємо наше модальне вікно
    });
};

const peer = new Peer(undefined, { // Тепер, коли наш сервер peer працює, давайте підключимо наш клієнтський peer до цього серверу
    path: "/peerjs",
    host: "/",
    port: "3030",
});

let myVideoStream;
const peers = {};
const getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;

sendmessage = (text) => {
    if (event.key === "Enter" && text.value !== "") { // Коли натискана клавіша Enter і поле введення тексту не пусте
        socket.emit("messagesend", myname + ' : ' + text.value); // Відправляємо подію messagesend та передаємо повідомлення чату з ім'ям користувача
        text.value = ""; // Очистити поле введення повідомлення
        main__chat_window.scrollTop = main__chat_window.scrollHeight; // Прокрутити вниз
    }
};

navigator.mediaDevices // WebRTC надає стандартний API для доступу до камер і мікрофонів, підключених до пристрою
    .getUserMedia({
        video: true,
        audio: true,
    }) // Це повертає обіцянку
    .then((stream) => { // Якщо дозвіл отримано, отримуємо відео- та аудіодоріжку
        myVideoStream = stream;
        addVideoStream(myVideo, stream, myname); // Ця функція додає div, який містить відео та ім'я. Практично, це додає наше відео на екран

        socket.on("user-connected", (id, username) => { // Коли сервер видає подію "user-connected" для всіх клієнтів у кімнаті
            connectToNewUser(id, stream, username); // Ми запускаємо цю функцію і передаємо id, stream та ім'я користувача (пояснення в функції)
            socket.emit("tellName", myname); // Відсилаємо подію tellName, щоб повідомити іншим клієнтам їхнє ім'я
        });

        socket.on("user-disconnected", (id) => {
            console.log(peers);
            if (peers[id]) peers[id].close();
        });
    });
peer.on("call", (call) => { // Коли ми отримуємо виклик
    getUserMedia({ video: true, audio: true }, // Отримуємо наш потік
        function(stream) {
            call.answer(stream); // Відповідь на виклик нашим потоком
            const video = document.createElement("video");  // Створюємо елемент відео
            call.on("stream", function(remoteStream) { // Отримуємо потік іншого користувача
                addVideoStream(video, remoteStream, OtherUsername); // Та додаємо потік іншого користувача до нашого вікна
            });
        },
        function(err) {
            console.log("Failed to get local stream", err);
        }
    );
});

peer.on("open", (id) => { // Коли кожен користувач приєднується, кожному користувачеві видається унікальний id, і важливо знати їхнє id при комунікації
    socket.emit("join-room", roomId, id, myname);
});

socket.on("createMessage", (message) => { // Ця функція додає повідомлення до області чату, коли ми або інший користувач відправляємо повідомлення
    const ul = document.getElementById("messageadd");
    const li = document.createElement("li");
    li.className = "message";
    li.appendChild(document.createTextNode(message));
    ul.appendChild(li);
});

socket.on("AddName", (username) => { // Повідомте іншому користувачу їхнє ім'я
    OtherUsername = username;
    console.log(username);
});

const RemoveUnusedDivs = () => { // Ця функція використовується для видалення невикористаних div, якщо вони є
    const alldivs = videoGrids.getElementsByTagName("div"); // Отримати всі div у нашій області відео
    for (let i = 0; i < alldivs.length; i++) { // Пройтися по всіх div
        const e = alldivs[i].getElementsByTagName("video").length; // Перевірити, чи є елемент відео в кожному з div
        if (e === 0) { // Якщо немає
            alldivs[i].remove(); // видалити
        }
    }
};

const connectToNewUser = (userId, streams, myname) => {
    const call = peer.call(userId, streams); // Це викличе інший id користувача з нашим власним потоком
    const video = document.createElement("video");
    call.on("stream", (userVideoStream) => { // Коли інший користувач відповідає на виклик, вони надсилають свій потік цьому користувачеві
        addVideoStream(video, userVideoStream, myname); // І цей потік
    });
    call.on("close", () => { // Коли виклик закривається
        video.remove();  // видалити відео
        RemoveUnusedDivs(); // Видалити всі невикористані div
    });
    peers[userId] = call;
};

const cancel = () => { // Приховати наше запрошення при натисканні кнопки "Відміна"
    $("#getCodeModal").modal("hide");
};

const copy = async() => { // Копіювати наше посилання на запрошення при натисканні кнопки "Копіювати"
    const roomid = document.getElementById("roomid").innerText;
    await navigator.clipboard.writeText("http://localhost:3030/join/" + roomid);
};

const invitebox = () => { // Показати наше модальне вікно при натисканні
    $("#getCodeModal").modal("show");
};

const muteUnmute = () => { // Заглушити аудіо
    const enabled = myVideoStream.getAudioTracks()[0].enabled; // Аудіотреки - це ті треки, чия властивість kind є audio. Перевірте, чи масив не є порожнім чи ні
    if (enabled) { // Якщо не Заглушити
        myVideoStream.getAudioTracks()[0].enabled = false; // Заглушити
        document.getElementById("mic").style.color = "red"; // Змінити колір
    } else {
        document.getElementById("mic").style.color = "white"; // Змінити колір
        myVideoStream.getAudioTracks()[0].enabled = true; // Відновити аудіо
    }
};

const VideomuteUnmute = () => { // Заглушити відео
    const enabled = myVideoStream.getVideoTracks()[0].enabled;
    if (enabled) { // Якщо відео включено
        myVideoStream.getVideoTracks()[0].enabled = false; // Вимкнути
        document.getElementById("video").style.color = "red"; // Змінити колір
    } else {
        document.getElementById("video").style.color = "white"; // Змінити колір
        myVideoStream.getVideoTracks()[0].enabled = true; // Увімкнути
    }
};

const showchat = () => { // Показати або приховати вікно чату
    chat.hidden = !chat.hidden;
};

const addVideoStream = (videoEl, stream, name) => {
    videoEl.srcObject = stream; // Встановити потік в елемент відео, який ми передали в аргументах
    videoEl.addEventListener("loadedmetadata", () => { // Коли вся метадана завантажена
        videoEl.play(); // Відтворити відео
    });
    const h1 = document.createElement("h1"); // Створити елемент h1 для відображення імені
    const h1name = document.createTextNode(name); // Створити текстовий вузол (текст). Зауважте: Щоб відобразити правильний елемент h1 з текстом, важливо створити як h1, так і текстовий вузол
    h1.appendChild(h1name); // додати текст в елемент h1
    const videoGrid = document.createElement("div"); // Створити div 'videoGrid' всередині div "videoGridS"
    videoGrid.classList.add("video-grid"); // додати клас до div videoGrid
    videoGrid.appendChild(h1); // додати h1 до div "videoGrid"
    videoGrids.appendChild(videoGrid);  // додати ім'я до div "videoGrid"
    videoGrid.append(videoEl); // додати елемент відео до div "videoGrid"
    RemoveUnusedDivs(); // Видалити всі невикористані div
    const totalUsers = document.getElementsByTagName("video").length; // Отримати всі елементи відео
    if (totalUsers > 1) { // Якщо користувачів більше 1
        for (let index = 0; index < totalUsers; index++) { // Пройтися по всіх відео
            document.getElementsByTagName("video")[index].style.width = // Встановити ширину кожного відео на
                150 / totalUsers + "%";
        }
    }
};
