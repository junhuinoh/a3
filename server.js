/********************************************************************************
* WEB322 – Assignment 03
*
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
*
* https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
*
* Name: Junhui Noh Student ID: 178243234 Date: 12/02/2025
*
********************************************************************************/
require("dotenv").config();
require('pg');
const express = require("express");
const clientSessions = require('client-sessions');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3000;

const connectMongo = require("./config/mongo");
const User = require("./models/user");

const Sequelize = require("sequelize");

app.use(express.urlencoded({extended: true}));
app.set("view engine", "ejs");

app.use(
  clientSessions({
    cookieName: 'session', 
    secret: 'o6LjQ5EVNC28ZgK64hDELM18ScpFQr', 
    duration: 30 * 60 * 1000, 
    activeDuration: 10 * 60 * 1000, 
  })
);

function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
}

connectMongo();

const sequelize = new Sequelize(process.env.POSTGRE_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true, 
      rejectUnauthorized: false, 
    },
  },
});

sequelize.authenticate()
  .then(() => console.log("PostgreSQL Connected"))
  .catch((err) => console.log("PostgreSQL Error:", err));

const Task = sequelize.define('Task', {
  title: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  description: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  dueDate: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  status : {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: "pending",
  },
  userId : {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

sequelize.sync()
  .then(() => console.log("Sequelize models synced"))
  .catch((err) => console.log("Sequelize sync error:", err));


app.get("/", (req,res) => {
  res.render("home");
});

app.get("/register", (req,res) => {
  res.render("register", {message: ""});
});

app.post("/register", async (req,res) => {
  const hashed = await bcrypt.hash(req.body.password, 10);

  const exists = await User.findOne({
    $or: [
      { username: req.body.username },
      { email: req.body.email }
    ]
  });

  if(exists) {
    return res.render("register", {message: "Username or email already exists."});
  }
  await User.create({
    username: req.body.username,
    email: req.body.email,
    password: hashed,
  });

  res.redirect("/login");
});

app.get("/login", (req,res) => {
  res.render("login", {message: ""});
});

app.post("/login", async (req,res) => {
  const user = await User.findOne({ username: req.body.username });

  if (!user) {
    return res.render("login", { message: "Invalid credentials" });
  }

  const match = await bcrypt.compare(req.body.password, user.password);

  if (!match) {
    return res.render("login", { message: "Invalid credentials" });
  }

  req.session.user ={
    id: user._id.toString(),
    username: user.username,
    email: user.email
  };

  res.redirect("/dashboard");
});

app.get("/logout", (req,res) => {
  req.session.reset();
  res.redirect("/login");
});

app.get("/dashboard", ensureLogin, (req,res) => {
  res.render("dashboard", {
    username: req.session.user.username,
    email: req.session.user.email,
  });
});

app.get("/tasks", ensureLogin, async (req,res) => {
  const tasks = await Task.findAll({
    where: { userId: req.session.user.id },
  });

  res.render("tasks", { tasks });  
});

app.get("/tasks/add", ensureLogin, (req, res) => {
  res.render("addTask");
});

app.post("/tasks/add", ensureLogin, async (req, res) => {
  await Task.create({
    title: req.body.title,
    description: req.body.description,
    dueDate: req.body.dueDate || null,
    userId: req.session.user.id,
  });

  res.redirect("/tasks");
});

app.get("/tasks/edit/:id", ensureLogin, async (req, res) => {
  const task = await Task.findOne({
    where: { id: req.params.id, userId: req.session.user.id },
  });

  if (!task){
    return res.redirect("/tasks");
  } 

  res.render("editTask", { task });
});

app.post("/tasks/edit/:id", ensureLogin, async (req, res) => {
  await Task.update(
    {
      title: req.body.title,
      description: req.body.description,
      dueDate: req.body.dueDate || null,
      status: req.body.status,
    },
    {
      where: { id: req.params.id, userId: req.session.user.id },
    }
  );

  res.redirect("/tasks");
});

app.post("/tasks/delete/:id", ensureLogin, async (req, res) => {
  await Task.destroy({
    where: { id: req.params.id, userId: req.session.user.id },
  });

  res.redirect("/tasks");
});

app.post("/tasks/status/:id", ensureLogin, async (req, res) => {
  await Task.update(
    { status: req.body.status },
    { where: { id: req.params.id, userId: req.session.user.id } }
  );

  res.redirect("/tasks");
});

app.listen(port, () => console.log(`Server running on ${port}!`));