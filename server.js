const { response } = require("express");
const express = require("express");
const req = require("express/lib/request");
const res = require("express/lib/response");
const app = express();
const { pool } = require('./dbConfig');
const bcrypt = require('bcrypt');
const { redirect } = require("express/lib/response");
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport')
const initializePassport = require('./passportConfig');
const { rows } = require("pg/lib/defaults");


initializePassport(passport);


const PORT = process.env.PORT || 4000;

app.set('view engine', "ejs");
//sends info from frontend to server
app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: 'kode',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


app.use(flash())

//public folder
app.use(express.static("public"));



//get requests and responses
app.get('/', (req, res) => {
    res.render("login");
});

app.get("/registrer", checkAuthenticated, (req, res) => {
    res.render("registrer");
});

app.get("/login", checkAuthenticated, (req, res) => {
     res.render("login");
 });

app.get("/dashboard", checkNotAuthenticated,(req, res) => {
    let listeNavn = [];
    
    pool.query(`SELECT * FROM listeavlister WHERE id=$1 `,[req.user.id], (err, results) => {
        if (err) {
            throw err;
        }
        if (results.rows.length > 0) {
            results.rows.forEach(row =>{
                listeNavn.push(row.liste_navn)
            })
            res.render('dashboard', { brukernavn: req.user.brukernavn, listeNavn });
        }
    })});




app.get("/logut", (req,res)=>{
    req.logOut();
    req.flash('reg_msg', "Du er nå logget ut!");
    res.redirect('/login')
});


//form validation and query for registration
app.post("/registrer", async (req, res) => {
    let { brukernavn, epost, pass, repeatPass } = req.body;


    let errors = [];

    //form validation    
    if (pass != repeatPass) {
        errors.push({ message: "Passordene er ikke identiske" });
    }

    if (errors.length > 0) {
        res.render('registrer', { errors });
    } else {

        let cryptPass = await bcrypt.hash(pass, 10);
        //checks for existing email
        pool.query(
            `SELECT * FROM brukere
            WHERE epost =$1`, [epost], (err, results) => {
            if (err) {
                throw err;
            }

            if (results.rows.length > 0) {
                errors.push({ message: 'Epost er allerede registrert' })
                res.render('registrer', { errors });
            } else {
                pool.query(
                    `INSERT INTO brukere (brukernavn, epost, passord)
                       VALUES ($1, $2, $3)`, [brukernavn, epost, cryptPass],
                    (err, results) => {
                        if (err) {
                            throw err;
                        }
                        req.flash("reg_msg", "Du er nå registrert, vennligst logg inn.");
                        res.redirect('/login');
                    }

                )
            }
        }
        )

    }
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}));

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect("/dashboard");
    }
    next();
  }

function checkNotAuthenticated(req, res, next) {
   if (req.isAuthenticated()) {
     return next();
   }
   res.redirect("/login");
 }

 app.post('/dashboard', function newList(req, res){
        pool.query(
            `INSERT INTO listeavlister (id, liste_navn)
            VALUES ($1, $2)`, [req.user.id, req.body.ListeNavn]
        )
        res.redirect("dashboard")
    }
)




app.listen(PORT, () => {
    console.log(`Serveren kjører på port ${PORT}`);
});