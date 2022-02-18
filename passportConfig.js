const localStrategy = require('passport-local').Strategy;
const { pool } = require('./dbConfig');
const bcrypt = require('bcrypt');
const { authenticate } = require('passport');

function initialize(passport) {

    authenticateUser = (epost, passord, done) => {
        pool.query(
            //epost sjekk
            `SELECT * FROM brukere WHERE epost =$1`, [epost], (err, results) => {
                if (err) {
                    throw err;
                }
                console.log(results.rows);
                if (results.rows.length > 0) {
                    const bruker = results.rows[0];
                    //passord sjekk
                    bcrypt.compare(passord, bruker.passord, (err, isMatch) => {
                        if (err) {
                            throw err;
                        }
                        if (isMatch) {
                            return done(null, bruker);
                        } else {
                            return done(null, false, { message: "Passordet stemmer ikke" });
                        }
                    })
                } else {
                    return done(null, false, { message: "Eposten er ikke registrert" });
                }
            }
        )
    }
    passport.use(new localStrategy({
        usernameField: 'epost',
        passwordField: 'pass'
    },
        authenticateUser
    ))
    //lagrer bruker id i session cookie
    passport.serializeUser((bruker, done)=> done(null, bruker.id));
    //Bruker if til å hente bruker info fra databasen
    passport.deserializeUser((id, done)=> {
        pool.query(
            `SELECT * FROM brukere WHERE id = $1`, [id], (err, results)=>{
                if (err) {
                    throw done(err);
                }
                return done(null, results.rows[0]);

            }
        )
    })
};

module.exports = initialize;