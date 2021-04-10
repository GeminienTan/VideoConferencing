const express = require("express");
const mysql = require("mysql");
const app = express();
const session = require('express-session');
const server = require("http").Server(app);
const io = require("socket.io")(server);
const bodyParser = require('body-parser');
const CryptoJS = require("crypto-js");
const { ExpressPeerServer } = require("peer");


//A simple JavaScript alert manager
const JSAlert = require("js-alert");
//A JavaScript date library for parsing, validating, manipulating, and formatting dates
const moment = require('moment');

//A node.js middleware for handling multipart/form-data, which is primarily used for uploading files. 
const multer = require('multer');

const path = require('path');

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

app.set('trust proxy', 1) // trust first proxy

var sess = {
  secret: 'secret',
  resave: true,
  saveUninitialized: true,
  cookie: {}
}

if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess))


app.get("/", (req, res) => {
  //   res.redirect(`/${uuidV4()}`);
  res.render("index");
});

app.get("/Call", (req, res) => {
  //   res.redirect(`/${uuidV4()}`);
  res.render("call");
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
  let data = {u_name: u_name,u_gender: req.body.gender,u_dob: req.body.birthday,u_phone: req.body.phone,u_email: req.body.email,u_password: u_password.toString(),u_profilepic: "dist/img/avatars/avatar-default.jpg",u_point:0,u_status:'A'};
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
      req.session.u_id = u_id;
      
      var queries = [
        "SELECT user.u_id,u_name,u_profilepic,u_status,u_email FROM user INNER JOIN contact ON (contact.ct_email = user.u_email) WHERE contact.u_id =? AND contact.ct_status = 'A'",
        "SELECT room.r_id as r_id,c_title,c_desc,c_id FROM room LEFT JOIN room_record ON (room.r_id = room_record.r_id) INNER JOIN channel ON (channel.r_id = room.r_id) WHERE room_record.u_id=? OR room.r_owner_id =? AND room.r_status = 'A' AND channel.c_status ='A'",
        "SELECT room.r_id as r_id,r_title,r_desc FROM room LEFT JOIN room_record ON (room.r_id = room_record.r_id) WHERE room_record.u_id=? OR room.r_owner_id =? AND room.r_status = 'A'",
        "SELECT * FROM schedule WHERE s_status = 'A' AND u_id=?",
        "SELECT s_id,user.u_name as u_name FROM attendees INNER JOIN user ON (user.u_id = attendees.u_id)",
        "SELECT schedule.s_id as s_id, user.u_name as presenter, a_topic,a_time_allocated FROM agenda INNER JOIN schedule ON (schedule.s_id = agenda.s_id) INNER JOIN user ON (agenda.a_presenter = user.u_id)",
        "SELECT * FROM user WHERE u_id=?",
        "SELECT u1.u_name as sender_name, u2.u_name as receiver_name, u1.u_id as sender_id, u2.u_id as receiver_id,  u1.u_profilepic as sender_profilepic, u2.u_profilepic as receiver_profilepic, u1.u_status as sender_status, u2.u_status as receiver_status, cv_id FROM conversation INNER JOIN user u1 ON(u1.u_id = conversation.cv_sender) INNER JOIN user u2 ON(u2.u_id = conversation.cv_receiver) WHERE cv_sender = ? or cv_receiver = ?",
        "SELECT u1.u_name as sender_name, u2.u_name as receiver_name, u1.u_id as sender_id, u2.u_id as receiver_id, u1.u_profilepic as sender_profilepic, u2.u_profilepic as receiver_profilepic,cm_content,cm_datetime,cm_file,chat_message.cv_id as cv_id FROM chat_message INNER JOIN user u1 ON(u1.u_id = chat_message.cm_sender) INNER JOIN user u2 ON(u2.u_id = chat_message.cm_receiver) WHERE cm_sender=? OR cm_receiver=? ORDER BY cm_datetime ASC",
      ];
    
      mysqlConnection.query(queries.join(';'),[u_id,u_id,u_id,u_id,u_id,u_id,u_id,u_id,u_id,u_id,u_id],(err, results, fields) => {
    
        if (err) throw err;

        /*console.log(results[0]);
        console.log(results[1]);
        console.log(results[2]);
        console.log(results[3]);
        console.log(results[4]);
        console.log(results[5]);
        console.log(results[6]);
        console.log(results[7]);*/

        req.session.contact = results[0];
        req.session.channel = results[1];
        req.session.room = results[2];
        req.session.schedule = results[3];
        req.session.attendees = results[4];
        req.session.agenda = results[5];
        req.session.account =results[6];
        req.session.conversation = results[7];
        req.session.message = results[8];
        req.session.save();

        res.render('home', {
          u_id:u_id,
          moment: moment,
          contact: req.session.contact,
          channel: req.session.channel, 
          room: req.session.room,
          schedule: req.session.schedule,
          attendees: req.session.attendees,
          agenda: req.session.agenda,
          account:req.session.account,
          conversation:req.session.conversation,
          message:req.session.message,
        });
    
      });
      
    });
  });
});

app.get("/home", (req, res) => {
  //   res.redirect(`/${uuidV4()}`);
  if(!req.session.u_id) {
    res.redirect('/');
} else {
  res.render('home', {
    u_id:req.session.u_id,
    moment: moment,
    contact: req.session.contact,
    channel: req.session.channel, 
    room: req.session.room,
    schedule: req.session.schedule,
    attendees: req.session.attendees,
    agenda: req.session.agenda,
    account:req.session.account,
    conversation:req.session.conversation,
    message:req.session.message,
  });
}
});
//when user submit form to addRoom 
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
  });
});

//join as a guest
app.get("/join-guest", (req, res) => {
  //check if the ID valid
  //if yes, render to guest welcome page
  //if not alert 
  res.render("");
});

app.post('/addContact',(req, res) => {
  
  let data = {ct_email: req.body.ct_email, u_id:req.body.u_id ,ct_status:'A'};
    let sql = "INSERT INTO contact SET ?";
    let query = mysqlConnection.query(sql, data,(err, results) => {
      if(err) throw err;
      //res.redirect('/new');
    });
});

app.post('/addChat',(req, res) => {
  
  let current_time = moment().format("YYYY-MM-DD HH:mm:ss");
  var cv_sender = req.body.sender;
  var cv_id = parseInt(req.body.cv_id);
  if (isNaN(cv_id) == true){
      let sql1 = "SELECT u_id FROM user WHERE u_name =?";
      let query1 = mysqlConnection.query(sql1,req.body.receiver ,(err, rows) => {
        if(err) throw err;
        rows.forEach((row) => {
          var cv_receiver = row.u_id;

          let chatData = {cm_content: req.body.content,cm_file:'',cm_datetime:current_time,cm_receiver: cv_receiver,cm_sender: cv_sender,cm_status: 'A'};
          
          //create conversation
          let sql2 = "SELECT cv_id FROM conversation WHERE (cv_receiver=? AND cv_sender=?) OR (cv_sender=? AND cv_receiver=?)";
          let query2 = mysqlConnection.query(sql2,[cv_receiver,cv_sender,cv_receiver,cv_sender] ,(err, rows) => {
            if(err) throw err;
            if(rows==0){
              console.log("New conversation");
              let sql2 = "INSERT into conversation SET cv_receiver=?,cv_sender=?";
              let query2 = mysqlConnection.query(sql2,[cv_receiver,cv_sender] ,(err, results) => {
                if(err) throw err;
                console.log("Insert conversation successfully");
                
                let sql3 = "INSERT into chat_message SET ? , cv_id= (SELECT MAX(cv_id) as cv_id from conversation)";
                let query3 = mysqlConnection.query(sql3,chatData,(err, results) => {
                  if(err) throw err;
                  console.log("Insert message successfully with new conver");

                });
              });
            }
            rows.forEach((row) => {
              cv_id = row.cv_id;
              let sql4 = "INSERT into chat_message SET ? , cv_id= ?";
                let query4 = mysqlConnection.query(sql4,[chatData,cv_id],(err, results) => {
                  if(err) throw err;
                  console.log("Insert message successfully with old conver");

                });

            });
          });
        });
      });
  }
  else{
    let chatData = {cm_content: req.body.content,cm_file:'',cm_datetime:current_time,cm_receiver: parseInt(req.body.receiver),cm_sender: parseInt(req.body.sender),cv_id:cv_id,cm_status: 'A'};
    let sql5 = "INSERT into chat_message SET ?";
            let query4 = mysqlConnection.query(sql4,[chatData,cv_id],(err, results) => {
              if(err) throw err;
              console.log("Insert message successfully with old conver");

            });
    console.log(chatData);
  }

  
  

  


  /*let sql1 = "SELECT u_id FROM user WHERE u_name =?";
  let query1 = mysqlConnection.query(sql1,req.body.receiver ,(err, rows) => {
    if(err) throw err;
    rows.forEach((row) => {
      const receiver = row.u_id;
      let chatData = {cm_content: req.body.content,cm_file:'',cm_datetime:current_time,cm_receiver: receiver,cm_sender: parseInt(req.body.sender),cm_status: 'A'};
      let sql2 = "INSERT INTO chat_message SET ?";
      let query2 = mysqlConnection.query(sql2, chatData,(err2, results2) => {
        if(err2) throw err2;
        console.log("Insert Successfully!");
      });
    });

  });*/
});

//when user submit form to add Schedule 
app.post('/addSchedule',(req, res) => {
  let scheduleData = {s_title: req.body.s_title, s_objective: req.body.s_objective,s_status:'A',s_date: req.body.s_date,s_stime: req.body.s_stime,s_etime: req.body.s_etime,u_id:req.body.owner_id};
  let attendees = req.body.s_attendees;

  let sql1 = "INSERT INTO schedule SET ?";
  let query1 = mysqlConnection.query(sql1, scheduleData,(err, results) => {
    if(err) throw err;
    console.log("Insert Successfully");

    for($i=0;$i<attendees.length;$i++) {

      if(attendees[$i] != '')
      {
        let sql2 = "INSERT INTO attendees SET u_id=(SELECT u_id FROM user WHERE u_name = ? ),s_id=(SELECT max(s_id) FROM schedule)";
        let query2 = mysqlConnection.query(sql2,attendees[$i] ,(err2, results2) => {
          if(err2) throw err2;
          
        });
      }
    }
  });
  //res.redirect('/home');
  
});

app.post('/Agenda',(req, res) => {
  if(req.body.hasOwnProperty("addAgenda")){
    console.log("butt1 clicked");
  };
  let data = {a_topic: req.body.a_topic, a_presenter:req.body.a_presenter ,a_time_allocated:req.body.a_time_allocated};
  console.log(data); 
  /*let sql = "INSERT INTO agenda SET ?";
    let query = mysqlConnection.query(sql, data,(err, results) => {
      if(err) throw err;
      //res.redirect('/new');
    });*/
});

//when user submit form to addRoom 
app.post('/editProfile',(req, res) => {
  let u_id = req.body.u_id;
  let profileData = {u_name: req.body.u_name,u_gender: req.body.u_gender,u_dob: req.body.u_dob,u_phone: req.body.u_phone,u_email: req.body.u_email};
  console.log(profileData)

  let sql = "UPDATE user SET ? where U_id = ?";
    let query = mysqlConnection.query(sql,[profileData,u_id],(err, results) => {
      if(err) throw err;
    });
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


