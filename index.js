/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
//const functions = require("firebase-functions");
//const {onRequest} = require("firebase-functions/v2/https");
//const logger = require("firebase-functions/logger");
// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

var express = require("express");  
var app = express();  

app.set("view engine","ejs");
app.set('views', __dirname + "/views");

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore} = require("firebase-admin/firestore");
var serviceAccount = require("./permission_key.json");

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const IS_EMULATOR = ((typeof process.env.FUNCTIONS_EMULATOR === 'boolean' && process.env.FUNCTIONS_EMULATOR) || process.env.FUNCTIONS_EMULATOR === 'true');

if(IS_EMULATOR){
    firestore.settings({
      host: "localhost",
      port: "3000",
      ssl: false
    })
}

const
    { FieldValue } = require("firebase-admin/firestore");

const appLocals = require("./app-locals.js");
app.locals = appLocals;

var dateTime = require("node-datetime");
let alert = require("alert");


app.get("/",function (req,res){
    res.render("Homepage",{});
});

app.get("/student-data",function (req,res){
    res.render("students_data",{});
});

app.get("/dataSubmit", function (req,res) {
    db.collection("students_data")
        .add({
        rollno : req.query.rolno,
        name : req.query.stuname,
        type : req.query.type,
        })
        .then(() =>
        {
        alert("data sent successfully");
        res.render("students_data",{});
        })
});

app.get('/fachodlog',function(req,res){
    res.render("FacultyLogin",{});
});

app.get('/regstudent',function(req,res){
    res.render("StudentRegister",{});
});

app.get('/fachodreg',function(req,res){
    res.render("FACHODREG",{});
});

app.get('/updateinformation',function(req,res){
    let fdet = {email : req.query.email,password:req.query.pwd,name:req.query.name};
    res.render("FacultyUpdateStudent",{data:fdet});
});

app.get('/addstudentdata',function(req,res){
    var flag = false;
    db.collection("faculty").where('email','==',req.query.email).where('password','==',req.query.pwd).get().then((docs)=>{
        let fac = {};
        docs.forEach(async (doc)=>{
            fac = {name : doc.data().firstName,email : doc.data().email,password : doc.data().password};
            for(let i = 0;i < doc.data().students.length;i++){
                if(doc.data().students[i] == req.query.rollno){
                    flag = true;
                    break;
                }
            }
            if(!flag){
                let s = "faculty/";
                s = s.concat(doc.id);
                db.collection('faculty').doc(doc.id).update({
                    students: FieldValue.arrayUnion(req.query.rollno),
                 }, { merge: true }).catch(e => {
                    console.error(e);
                 });
                 alert("Student added successfully");
                 res.render("FacultyDashboard",{data:fac});
            }
            else{
                alert("Student already present");
                res.render("FacultyDashboard",{data:fac});
            }
        });
    });
});

app.get('/updatestudentinfo',function(req,res){
    let fac = {password : req.query.pwd,email:req.query.email,name:req.query.name};
    db.collection("students_data").where('rollno','==',req.query.rollno).get().then((docs)=>{
        docs.forEach((doc)=>{
            db.collection("students_data").doc(doc.id).update({type : req.query.type});
        });
        alert("Updates made successfully");
        res.render("FacultyDashboard",{data:fac});
    });
});

app.get('/facultylog',function(req,res){
    let flag = false;
    db.collection('faculty').where('email', '==', req.query.email).where('password','==',req.query.pwd).get().then((docs)=>{
        let fac = {};
        docs.forEach(async (doc) => {
            flag = true;
            fac = {email:doc.data().email,name:doc.data().firstName,password:doc.data().password};
            db.collection('students_data').where('section','==',doc.data().section).get().then((docs2)=>{
                docs2.forEach((doc2)=>{
                    console.log(doc2);
                    var flag1 = false;
                    for(let i = 0;i < doc.data().students.length;i++){
                        if(doc.data().students[i] == doc2.data().rollno){
                            flag1 = true;
                            break;
                        }
                    }
                    if(!flag1){
                        if(doc2.data().rollno.slice(0,2) == doc.data().year){
                            let s = "faculty/";
                            s = s.concat(doc.id);
                            db.collection('faculty').doc(doc.id).update({
                                students: FieldValue.arrayUnion(doc2.data().rollno),
                            }, { merge: true }).catch(e => {
                                console.error(e);
                            });
                        }
                    }
                });
            });
            let dep = doc.data().DepID;
            dep = dep.concat("_requests");
            console.log(dep);
            db.collection(dep).where('status' ,'==', "Pending").get().then((docs1)=>{
                console.log(doc.data());
                let student_req = [];
                docs1.forEach((doc1)=>{
                    console.log(doc1);
                    if((doc.data().year == doc1.data().rollno.slice(0,2)) || ((doc1.data().rollno.slice(4,6) == '5A') && ((Number(doc1.data().rollno.slice(0,2)) - 1) == doc.data().year))){
                        for(var i = 0;i < doc.data().students.length;i++){
                            if(doc1.data().rollno == doc.data().students[i]){
                                var dt = dateTime.create();
                                var formatted = dt.format('Y-m-d H:M:S');
                                if(doc1.data().date == formatted.slice(0,10)){
                                    var sreq;
                                    sreq = {rno : doc1.data().rollno,reason : doc1.data().reason};
                                    student_req.push(sreq);
                                }
                            }
                        }
                    } 
                });
                if(student_req.length != 0){
                    res.render("FacultyRequests",{data:student_req,fac:fac});
                }
                else{
                    alert("No new request found");
                    res.render("FacultyLogin",{});
                }
            });
        });
        if(!flag){
            db.collection('HOD').where('email','==',req.query.email).where('password','==',req.query.pwd).get().then((docs2)=>{
                let fac = {};
                docs2.forEach((doc2) => {
                    flag = true;
                    fac = {name : doc2.data().firstName,email:doc2.data().email,password:doc2.data().password}
                    let dep = doc2.data().DepID;
                    dep = dep.concat("_requests");
                    db.collection(dep).where('status','==', "Pending").get().then((docs1)=>{
                        let student_req=[];
                        docs1.forEach((doc1) =>{
                            if(doc1.data().rollno.slice(6,8) == doc2.data().DepID){
                                var sreq;
                                var dt = dateTime.create();
                                var formatted = dt.format('Y-m-d H:M:S');
                                if(doc1.data().date == formatted.slice(0,10)){
                                    sreq = {rno : doc1.data().rollno,reason : doc1.data().reason};
                                    student_req.push(sreq);
                                }
                            }
                        });
                        if(student_req.length != 0){
                            res.render("FacultyRequests",{data:student_req,fac:fac});
                        }
                        else{
                            alert("No new requests found");
                            res.render("FacultyLogin",{});
                        }
                    });
                });
                if(!flag){
                    alert("Invalid Credentials");
                    res.render("FacultyLogin",{});
                }
            });
        }
    });
});

app.get('/response',function(req,res){
    let dep = req.query.RollNo.slice(6,8);
    dep = dep.concat("_requests");
    db.collection(dep).where('rollno', '==' , req.query.RollNo).get().then((docs)=>{
        docs.forEach((doc) => {
            db.collection(dep).doc(doc.id).update({status: req.query.status});
        })
        var msg = "Request "
        msg = msg.concat(req.query.status);
        alert(msg);
        let flag = false;
        db.collection('faculty').where('email', '==', req.query.email).where('password','==',req.query.pwd).get().then((docs2)=>{
            let fac = {};
            docs2.forEach((doc2) => {
                fac = {email:doc2.data().email,name:doc2.data().firstName,password:doc2.data().password};
                db.collection('students_data').where('section','==',doc2.data().section).get().then((docs3)=>{
                    docs3.forEach((doc3)=>{
                        console.log(doc3);
                        var flag1 = false;
                        for(let i = 0;i < doc2.data().students.length;i++){
                            if(doc2.data().students[i] == doc3.data().rollno){
                                flag1 = true;
                                break;
                            }
                        }
                        if(!flag1){
                            if(doc3.data().rollno.slice(0,2) == doc2.data().year){
                                let s = "faculty/";
                                s = s.concat(doc2.id);
                                db.collection('faculty').doc(doc2.id).update({
                                    students: FieldValue.arrayUnion(doc3.data().rollno),
                                }, { merge: true }).catch(e => {
                                    console.error(e);
                                });
                            }
                        }
                    });
                });
                let dep = doc2.data().DepID;
                dep = dep.concat("_requests");
                console.log(dep);
                db.collection(dep).where('status' ,'==', "Pending").get().then((docs1)=>{
                    console.log(doc2.data());
                    let student_req=[];
                    docs1.forEach((doc1)=>{
                        console.log(doc1.data());
                        if((doc2.data().year == doc1.data().rollno.slice(0,2)) || ((doc2.data().year == Number((doc1.data().rollno.slice(0,2)) - 1)) && (doc1.data().rollno.slice(4,6) == '5A'))){
                            for(var i = 0;i < doc2.data().students.length;i++){
                                if(doc1.data().rollno == doc2.data().students[i]){
                                    var dt = dateTime.create();
                                    var formatted = dt.format('Y-m-d H:M:S');
                                    if(doc1.data().date == formatted.slice(0,10)){
                                        var sreq;
                                        sreq = {rno : doc1.data().rollno,reason : doc1.data().reason};
                                        student_req.push(sreq);
                                    }
                                }
                            }
                        } 
                    });
                    if(student_req.length != 0){
                        res.render("FacultyRequests",{data:student_req,fac:fac});
                    }
                    else{
                        alert("No new requests found");
                        res.render("FacultyLogin",{})
                    }
                });
            });
            db.collection('HOD').where('email','==',req.query.email).where('password','==',req.query.pwd).get().then((docs2)=>{
                let fac = {};
                docs2.forEach((doc2) => {
                    fac = {name : doc2.data().firstName,email:doc2.data().email,password:doc2.data().password}
                    let dep = doc2.data().DepID;
                    dep = dep.concat("_requests");
                    db.collection(dep).where('status','==', "Pending").get().then((docs1)=>{
                        let student_req=[];
                        docs1.forEach((doc1) =>{
                            if(doc1.data().rollno.slice(6,8) == doc2.data().DepID){
                                var sreq;
                                flag = true;
                                sreq = {rno : doc1.data().rollno,reason : doc1.data().reason};
                                student_req.push(sreq);
                            }
                        });
                        if(flag){
                            res.render("FacultyRequests",{data:student_req,fac:fac});
                        }
                        else{
                            alert("No new requests found");
                            res.render("FacultyLogin",{});
                        }
                    });
                });
            });
        });
    });
});

app.get('/facultySubmit',function(req,res){
    db.collection("faculty").add({
        firstName:req.query.fname,
        lastName:req.query.lname,
        email:req.query.email,
        password:req.query.pwd,
        section:req.query.section,
        DepID:req.query.sel,
        year:req.query.year,
        students:[]
    })
    .then(() => {
        alert("Faculty registered Succcessfully");
        res.render("FacultyLogin",{});
    })
});

app.get('/hodSubmit',function(req,res){
    db.collection("HOD").where('DepID','==',req.query.sel).get().then(function(docs){
        docs.forEach((doc)=>{
            db.collection("HOD").doc(doc.id).update({
                firstName:req.query.fname,
                lastName:req.query.lname,
                email:req.query.email,
                password:req.query.pwd
            });
        });
        res.render("FacultyLogin",{});
    })
});

app.get('/StudentSubmit',function(req,res){
    var dt = dateTime.create();
    var formatted = dt.format('Y-m-d H:M:S');
    if(((Number(req.query.rolno.slice(0,2)) > Number(formatted.slice(2,4))) && (Number(req.query.rolno.slice(0,2)) < (Number(formatted.slice(2,4)) - 3))) || (req.query.rolno.slice(2,4) != "WH")){
        alert("Enter the details correctly");
        res.render("Studentregister",{});
    }
    else{
        db.collection("students_data")
            .add({
                rollno : req.query.rolno,
                name : req.query.stuname,
                type : req.query.type,
                section : req.query.section,
                password : req.query.pwd
            })
            .then(() =>
            {
                alert("data sent successfully");
                res.render("Login",{});
            })
    }
});

app.get('/login',function(req,res){
    res.render("Login",{});
})

app.get('/dashboard',function(req,res){
    let flag = false;
    db.collection('students_data').where('rollno', '==' , req.query.rollno).where('password','==',req.query.pwd).get().then((docs)=>{
        let student = {};
        docs.forEach((doc) => {
            flag = true;
            if(doc.data().type == 'Day Scholar'){
                student = {rno : doc.data().rollno,name : doc.data().name,pwd:doc.data().password}
                let dep = req.query.rollno.slice(6,8);
                dep = dep.concat("_requests");
                var dt = dateTime.create();
                var formatted = dt.format('Y-m-d H:M:S');
                db.collection(dep).where('rollno','==',req.query.rollno).get().then((docs1)=>{
                    docs1.forEach((doc1)=>{
                        if(doc1.data().date != formatted.slice(0,10)){
                            db.collection('students_requests').add({
                                rollno:doc1.data().rollno,
                                time : doc1.data().time,
                                date : doc1.data().date,
                                reason : doc1.data().reason,
                                status : doc1.data().status
                            }).then(()=>{
                                db.collection(dep).doc(doc1.id).delete();
                            });
                        }
                    });
                });
            }
            else{
                alert("Hostelers not allowed");
                res.render("Login",{});
            }
        });   
        if(flag){
            res.render("Student_dashboard",{data:student}); 
        }
        else{
            alert("Invalid Credentiasls");
            res.render("Login",{});
        }
    });
})

app.get('/loginstudent',function(req,res){
    db.collection('students_data').where('rollno', '==' , req.query.rolno).where('password','==',req.query.pwd).get().then((docs)=>{
        let student;
        docs.forEach((doc) => {
            if(doc.data().type == 'Day Scholar'){
                var dt = dateTime.create();
                var formatted = dt.format('Y-m-d H:M:S');
                student = {rno : doc.data().rollno,name : doc.data().name,time : formatted.slice(11,formatted.length),date : formatted.slice(0,10),pwd:doc.data().password};
                res.render('permission',{data:student});
            }
        });
    })
})

app.get('/requestSubmit',function(req,res){
    let dep = req.query.rollno.slice(6,8);
    dep = dep.concat("_requests");
    let flag = false;
    var student = {};
    console.log(req.query.rollno);
    db.collection(dep).where('rollno','==',req.query.rollno).get().then((docs1)=>{
        console.log("happy");
        docs1.forEach((doc1)=>{
            console.log(doc1);
            flag = true;
        });
        db.collection('students_data').where('rollno', '==', req.query.rollno).where('password','==',req.query.pwd).get().then((docs)=>{
            docs.forEach((doc) => {
                student = {name:doc.data().name,rno:doc.data().rollno,pwd:doc.data().password};
                console.log(req.query.rollno); 
            });
            console.log(student);
            if(!flag){
                db.collection(dep).add({
                    rollno : req.query.rollno,
                    time : req.query.time,
                    date : req.query.date,
                    attendance:req.query.attendance,
                    reason : req.query.Reason,
                    status : "Pending"
                }).then(()=>{
                    alert("Request sent successfully");
                    res.render("Student_dashboard",{data:student});
                });
            }
            else{
                alert('Permission for today already sent');
                res.render("Student_dashboard",{data:student});
            }
        });
    });
});

app.get('/status',function(req,res){
    let dep = req.query.rolno.slice(6,8);
    dep = dep.concat("_requests");
    db.collection(dep).where('rollno','==',req.query.rolno).get().then((docs)=>{
        let Req = {};
        let flag = false;
        docs.forEach((doc)=>{
            flag = true;
            Req = {rollno : doc.data().rollno,date : doc.data().date,status : doc.data().status,pwd:req.query.pwd};
        });
        if(!flag){
            alert("No permissions sent");
            let stu = {};
            let flag1 = false;
            db.collection('students_data').where('rollno','==',req.query.rolno).get().then((docs1)=>{
                docs1.forEach((doc1)=>{
                    flag1 = true;
                    console.log(doc1.data().rollno);
                    stu = {rno : doc1.data().rollno,name : doc1.data().name,pwd:req.query.pwd};
                });
                if(flag1){
                    res.render("Student_dashboard",{data:stu});
                }
            });
        }
        else{
            res.render("Student_status",{data:Req});
        }
    });
});

app.listen(3000, function () {  
console.log('Example app listening on port 3000!')  
})

//exports.app = functions.https.onRequest(app);
