const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server);
const { ExpressPeerServer } = require("peer");
const url = require("url");
const peerServer = ExpressPeerServer(server, { // Тут ми визначаємо наш сервер Peer, який ми хочемо розмістити
    debug: true,
});
const path = require("path");

app.set("view engine", "ejs");
app.use("/public", express.static(path.join(__dirname, "static")));
app.use("/peerjs", peerServer); // Тепер нам просто потрібно сказати нашому додатку обслуговувати наш сервер за адресою "/peerjs". Тепер наш сервер працює і готовий

app.get("/", (req, res) => { // На маршруті '/'
    res.sendFile(path.join(__dirname, "static", "index.html")); // Надіслати наш файл із сторінкою інтро (index.js), який знаходиться в папці static.
});

app.get("/join", (req, res) => { // Наша інтро-сторінка перенаправляє нас на маршрут /join із нашими рядками запитань (ми потрапляємо сюди, коли ми проводимо зустріч)
    res.redirect( // Коли ми потрапляємо на маршрут /join, ми перенаправляємо користувача на новий унікальний маршрут, який формується за допомогою Uuid
        url.format({ // Модуль url надає утиліти для розв'язання та аналізу URL.
            pathname: `/join/${uuidv4()}`, // Ось він повертає рядок, який має маршрут та рядки запитань.
            query: req.query, // Наприклад: /join/A_unique_Number?Param=Params. Таким чином, ми фактично перенаправляємося на наш старий URL /join/id?params
        })
    );
});

app.get("/joinold", (req, res) => { // Наша інтро-сторінка перенаправляє нас на маршрут /joinold із нашими рядками запитань (ми потрапляємо сюди, коли ми приєднуємося до зустрічі)
    res.redirect(
        url.format({
            pathname: req.query.meeting_id,
            query: req.query,
        })
    );
});

app.get("/join/:rooms", (req, res) => { // Коли ми потрапляємо сюди після того, як нас перенаправило на /join/join/A_unique_Number?params
    res.render("room", { roomid: req.params.rooms, Myname: req.query.name }); // ми відображаємо наш файл ejs і передаємо дані, які нам потрібні в ньому
}); // тобто нам потрібен roomid та ім'я користувача

io.on("connection", (socket) => { // Коли користувач підключається до нашого серверу
    socket.on("join-room", (roomId, id, myname) => { // Коли сокет отримує подію 'join room'
        socket.join(roomId); // Приєднатися до кімнати з roomid
        socket.broadcast.to(roomId).emit("user-connected", id, myname); // вислати подію 'user-connected', щоб повідомити всіх інших користувачів
        // в цій кімнаті, що приєднався новий користувач

        socket.on("messagesend", (message) => {
            console.log(message);
            io.to(roomId).emit("createMessage", message);
        });

        socket.on("tellName", (myname) => {
            console.log(myname);
            socket.broadcast.to(roomId).emit("AddName", myname);
        });

        socket.on("disconnect", () => { // Коли користувач відключається або залишає кімнату
            socket.broadcast.to(roomId).emit("user-disconnected", id);
        });
    });
});

server.listen(process.env.PORT || 3030); // Прослуховувати порт 3030.
// process.env.PORT || 3030 означає використовувати порт 3000, якщо не існує попередньо налаштованого порту
