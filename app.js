const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const userModel = require('./models/user');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());


app.use((req, res, next) => {
    const token = req.cookies.kicktoken;
    if (token) {
        jwt.verify(token, "shhhhh", (err, decoded) => {
            if (err) {
                console.log("Token verification failed:", err);
                return next();
            }
           
            req.user = decoded;
            next();
        });
    } else {
        next();
    }
});


const events = {};


function getCalendarData() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return { year, month, firstDay, daysInMonth };
}


app.get("/login", (req, res) => {
    res.render('login');
});


app.post("/login", async (req, res) => {
    let { email, password } = req.body;
    let user = await userModel.findOne({ email: email });
    if (!user) return res.status(500).send("Something went wrong");

    bcrypt.compare(password, user.password, function(err, result) {
        if (result) {
            let token = jwt.sign({ email: email, username: user.username, userid: user._id }, "shhhhh");
            res.cookie("kicktoken", token);
            res.status(200).redirect("/");
        } else {
            res.redirect('/login');
        }
    });
});


app.get("/register", (req, res) => {
    res.render('register');
});


app.post("/register", async (req, res) => {
    let { email, username, password, name, age } = req.body;
    let user = await userModel.findOne({ email: email });
    if (user) return res.status(500).send("User already registered");

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                username,
                email,
                password: hash,
            });
            let token = jwt.sign({ email: email, username: username, userid: user._id }, "shhhhh");
            res.cookie("kicktoken", token);
            res.redirect("/login");
        });
    });
});


app.get("/main", (req, res) => {
    res.render("main", { title: "Main Page", calendarData: getCalendarData(), user: req.user });
});


app.get('/', (req, res) => {
    const calendarData = getCalendarData();
    res.render('index', { calendarData, events, user: req.user });
});


app.get('/events', (req, res) => {
    const allEvents = Object.entries(events).map(([dateKey, eventList]) => ({
        dateKey,
        events: eventList,
    }));
    res.render('list', { allEvents, user: req.user });
});


app.get('/day/:day', (req, res) => {
    const { day } = req.params;
    const { year, month } = getCalendarData();
    const dateKey = `${year}-${month + 1}-${day}`;
    res.render('day', { dateKey, events: events[dateKey] || [], user: req.user });
});


app.get('/event/new/:day', (req, res) => {
    const { day } = req.params;
    const { year, month } = getCalendarData();
    const dateKey = `${year}-${month + 1}-${day}`;
    res.render('event_form', { dateKey, event: null, user: req.user });
});


app.post('/event/new/:day', (req, res) => {
    const { day } = req.params;
    const { year, month } = getCalendarData();
    const dateKey = `${year}-${month + 1}-${day}`;
    const { title, description } = req.body;

    if (!events[dateKey]) events[dateKey] = [];
    events[dateKey].push({ title, description });

    res.redirect(`/day/${day}`);
});


app.get('/event/edit/:day/:index', (req, res) => {
    const { day, index } = req.params;
    const { year, month } = getCalendarData();
    const dateKey = `${year}-${month + 1}-${day}`;
    const event = events[dateKey][index];
    res.render('event_form', { dateKey, event, index, user: req.user });
});


app.post('/event/edit/:day/:index', (req, res) => {
    const { day, index } = req.params;
    const { year, month } = getCalendarData();
    const dateKey = `${year}-${month + 1}-${day}`;
    const { title, description } = req.body;

    events[dateKey][index] = { title, description };
    res.redirect(`/day/${day}`);
});


app.post('/event/delete/:day/:index', (req, res) => {
    const { day, index } = req.params;
    const { year, month } = getCalendarData();
    const dateKey = `${year}-${month + 1}-${day}`;

    events[dateKey].splice(index, 1);
    if (events[dateKey].length === 0) delete events[dateKey];
    res.redirect(`/day/${day}`);
});


const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
