const express = require("express");
const mysql = require("mysql");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const bodyParser = require('body-parser');
const CryptoJS = require("crypto-js");
const { ExpressPeerServer } = require("peer");
const JSAlert = require("js-alert");

const peerServer = ExpressPeerServer(server, {
  debug: true,
});
const { v4: uuidV4, validate: uuidV4Validate } = require("uuid");
//mysql

var mysqlConnection  = require('./public/lib/db');

app.set("view engine", "ejs");

app.use(express.static("public"));

app.use("/peerjs", peerServer);

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  //   res.redirect(`/${uuidV4()}`);
  res.render("index");
});

//when user click sign-up button
app.get("/sign-up", (req, res) => {
  res.render("sign-up");
});

//when user submit form to sign up 
app.post('/sign-up',(req, res) => {
  const u_fname = req.body.fname;
  const u_lname = req.body.lname;
  const u_name = u_fname +" "+ u_lname;
  const u_password = CryptoJS.MD5(req.body.password);
  let data = {u_name: u_name,u_gender: req.body.gender,u_dob: req.body.birthday,u_phone: req.body.phone,u_email: req.body.email,u_password: u_password.toString(),u_profilepic: "dist/img/avatars",u_point:0,u_status:'A'};
  console.log(data);
   let sql = "INSERT INTO user SET ?";
    let query = mysqlConnection.query(sql, data,(err, results) => {
    if(err) throw err;
    res.render('index', { message:"success" });
    });
});

//when user submit form to sign in 
app.post('/home',(req, res) => {
  
  const u_email = req.body.email;
  const u_password = CryptoJS.MD5(req.body.password);
  let sql1 = "SELECT * from user WHERE u_email= ? AND u_password=? ";
  
  let query1 = mysqlConnection.query(sql1,[u_email,u_password.toString()],(err, rows) => {
    if(err) throw err;
    if(rows==0){
      res.render('index', { message:"error" });
    }
    rows.forEach((row) => {
      const u_id = row.u_id;
      var contact_name = [];
      let sql2 = "SELECT * from user INNER JOIN contact ON (contact.ct_email = user.u_email) WHERE contact.u_id = ? ";
      let query2 = mysqlConnection.query(sql2,[u_id],(err, rows) => {
        if(err) throw err;
        
        rows.forEach((row) => {
           contact_name.push(row.u_name);
        });
        res.render('home', { u_id:u_id,contact_name:contact_name});
      });
      
    });
  });
});

//when user submit form to sign in 
app.post('/addRoom',(req, res) => {
  let roomData = {r_title: req.body.r_title, r_desc: req.body.r_desc,r_status:'A',r_owner_id: req.body.owner_id};
  let channelData = {c_title: req.body.c_title, c_desc: req.body.c_desc,c_status:'A'};
  console.log(channelData);
  let sql1 = "INSERT INTO room SET ?";
  let query1 = mysqlConnection.query(sql1, roomData,(err, results) => {
    if(err) throw err;
    //res.redirect('/new');
  });

  let sql2 = "INSERT INTO channel SET ?,r_id=(SELECT max(r_id) FROM room)";
  let query2 = mysqlConnection.query(sql2, channelData,(err2, results2) => {
    if(err2) throw err2;
    //res.redirect('/new');
  });
});

//join as a guest
app.get("/join-guest", (req, res) => {
  //check if the ID valid
  //if yes, render to guest welcome page
  //if not alert 
  res.render("");
});

app.get("/new", (req, res) => {
  //   res.redirect(`/${uuidV4()}`);
  res.render("new");
});

app.get('/users',(req, res) => {
  let sql = "SELECT * FROM user INNER JOIN contact ON (contact.ct_email = user.u_email) ";
  let query = mysqlConnection.query(sql, (err, rows) => {
      if(err) throw err;
      res.render('users', {
          users : rows
      });
  });
});

app.post('/addContact',(req, res) => {
  let data = {ct_email: req.body.ct_email, u_id: 1};
    let sql = "INSERT INTO contact SET ?";
    let query = mysqlConnection.query(sql, data,(err, results) => {
      if(err) throw err;
      res.redirect('/new');
    });
});

app.post('/addSchedule',(req, res) => {
  let s_attendees = req.body.s_attendees;
  console.log(s_attendees[1]);
  /*let data = {s_title: req.body.s_title,s_objective: req.body.s_objective,
    s_date: req.body.s_date,s_stime: req.body.s_stime,s_etime: req.body.s_etime,s_status:"A", u_id: req.body.owner_id};
    let sql = "INSERT INTO schedule SET ?";
    let query = mysqlConnection.query(sql, data,(err, results) => {
      if(err) throw err;
      res.redirect('/new');
    });*/
});

app.get("/create", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get("/validateName/:roomName", (req, res) => {
  console.log(req.params.roomName);
  res.status(200).json({ valid: uuidV4Validate(req.params.roomName) });
});

app.get("/:room", (req, res) => {
  if (uuidV4Validate(req.params.room)) {
    res.render("room", { roomId: req.params.room });
  } else {
    res.status(404).json({ error: true, msg: "Room Not found" });
  }
});


/*mysqlConnection.connect(function(err) {
  if (err) throw err;
  console.log("Database Connected!");
});*/

//Creating GET Router to fetch all the learner details from the MySQL Database
app.get("/user/hello" , (req, res) => {
  mysqlConnection.query('SELECT * FROM user', (err, rows, fields) => {
  if (!err)
  res.send(rows);
  else
  console.log(err);
  })
});

//Router to GET specific learner detail from the MySQL database
app.get('/learners/:id' , (req, res) => {
  mysqlConnection.query('SELECT * FROM user WHERE u_id = ?',[req.params.id], (err, rows, fields) => {
  if (!err)
  res.send(rows);
  else
  console.log(err);
  })
  } );

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);
    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userId);
    });

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  });
});


server.listen(process.env.PORT || 3030);


