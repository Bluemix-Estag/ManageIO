var routes = require('routes');
var saml2 = require('saml2-js');
var Saml2js = require('saml2js');
var fs = require('fs');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var express = require('express');
var cfenv = require('cfenv');

// load local VCAP configuration
var vcapLocal = null;
var appEnv = null;
var appEnvOpts = {};


// create a new express server
var path = require('path');
var app = express();
var http = require('http');
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);


app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/style', express.static(path.join(__dirname, '/views/style')));
app.use('/scripts', express.static(path.join(__dirname, '/views/scripts')));

// Create service provider 
var sp_options = {
    entity_id: "https://projecit.mybluemix.net:443/metadata.xml",
    private_key: fs.readFileSync("cert/key.pem").toString(),
    certificate: fs.readFileSync("cert/cert.pem").toString(),
    assert_endpoint: "https://projecit.mybluemix.net/assert"
};
var sp = new saml2.ServiceProvider(sp_options);

//

var idp_options = {
    sso_login_url: " https://w3id.alpha.sso.ibm.com/auth/sps/samlidp/saml20/logininitial?RequestBinding=HTTPPost&PartnerId=https://projecit.mybluemix.net:443/metadata.xml&NameIdFormat=email&Target=http://projecit.mybluemix.net",


    certificates: fs.readFileSync("cert/w3id.sso.ibm.com").toString()
};
var idp = new saml2.IdentityProvider(idp_options);

// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});


fs.stat('./vcap-local.json', function (err, stat) {
    if (err && err.code === 'ENOENT') {
        // file does not exist
        console.log('No vcap-local.json');
        initializeAppEnv();
    } else if (err) {
        console.log('Error retrieving local vcap: ', err.code);
    } else {
        vcapLocal = require("./vcap-local.json");
        console.log("Loaded local VCAP", vcapLocal);
        appEnvOpts = {
            vcap: vcapLocal
        };
        initializeAppEnv();
    }
});

// get the app environment from Cloud Foundry, defaulting to local VCAP
function initializeAppEnv() {
    appEnv = cfenv.getAppEnv(appEnvOpts);
    if (appEnv.isLocal) {
        require('dotenv').load();
    }
    if (appEnv.services.cloudantNoSQLDB) {
        initCloudant();
    } else {
        console.error("No Cloudant service exists.");
    }
}

// =====================================
// CLOUDANT SETUP ======================
// =====================================
var dbname = "manageio";
var database;

function initCloudant() {
    var cloudantURL = appEnv.services.cloudantNoSQLDB[0].credentials.url || appEnv.getServiceCreds("whatsound-playlist-cloudantNoSQLDB").url;
    var Cloudant = require('cloudant')({
        url: cloudantURL,
        plugin: 'retry',
        retryAttempts: 10,
        retryTimeout: 500
    });
    // Create the accounts Logs if it doesn't exist
    Cloudant.db.create(dbname, function (err, body) {
        if (err && err.statusCode == 412) {
            console.log("Database already exists: ", dbname);
        } else if (!err) {
            console.log("New database created: ", dbname);
        } else {
            console.log('Cannot create database!');
        }
    });
    database = Cloudant.db.use(dbname);
    //INSERT INTO PROJECTS
    app.post('/codebakery/project/insert', function (req, res) {
        var order = req.body;
        console.log("Received " + JSON.stringify(track));
        database.get('codebakery', {
            revs_info: true
        }, function (err, doc) {
            if (err) {
                console.error(err);
            } else {

                // Para fazer: Essa linha de codigo vai verificar se o projeto com o opp_nr ja existe, se nao existir ele insere no db.
                //                var orders = doc.projects;
                //                  var existingProject = false;
                //                for (var or in orders) {
                //                    if (order.opportunity_nr == orders[or].uri) {
                //                        console.log("Uri igual");
                //                        existingTrack = true;
                //                        foundTrack = tr;
                //                        for (var vt in tracks[tr].voters) {
                //                            if (tracks[tr].voters[vt].nameUser.localeCompare(track.voter.nameUser) == 0) {
                //                                existingVoter = true;
                //                                res.setHeader('Content-Type', 'application/json');
                //                                res.status(403).json({
                //                                    message: "Forbidden, already voted.",
                //                                    status: false
                //                                });
                //                            }
                //                        }
                //                    }
                //                }
                //if (!existingProject) {
                //Insert a new track
                project = {

                    "customer": order.customer,
                    "title": order.title,
                    "story": order.story,
                    "opportunity_number": order.opportunity_number
                }

                createUserProjects(environment, w3id_owner, id, "requester", response, function () {
                    //    createEnvironmentProject(environment,project,response);

                })
            }
            console.log(projects)

            // Change for the database that we are using
            if (!existingProject) {
                doc.tracks = tracks;
                database.insert(doc, 'codebakery', function (err, doc) {
                    if (err) {
                        res.setHeader('Content-Type', 'application/json');
                        res.status(400).json({
                            message: "Could not handle the request",
                            status: false
                        });
                    } else {
                        res.setHeader('Content-Type', 'application/json');
                        res.status(200).json({
                            message: "Vote computed correctly",
                            status: true
                        });
                    }
                });
            }
        })
    })
}

// ------ Define express endpoints ------ 
// Endpoint to retrieve metadata 
app.get("/metadata.xml", function (req, res) {
    res.type('application/xml');
    res.send(sp.create_metadata());
});

// Starting point for login
app.get("/login", function (req, res) {
    //console.log(idp);
    sp.create_login_request_url(idp, {}, function (err, login_url, request_id) {
        if (err != null)
            return res.send(500);
        console.log(login_url);
        res.redirect(login_url);
    });
});

app.get("/codeBakeryFormFixed", function (req, res) {
    res.render('codebakeryFormFixedValues.html');
})


// Assert endpoint for when login completes
app.post("/assert", function (req, res) {
    var options = {
        request_body: req
    };
    console.log("Options: " + options);
    var response = new Buffer(req.body.SAMLResponse || req.body.SAMLRequest, 'base64');
    console.log(response);
    var parser = new Saml2js(response);

    //return res.json(parser.toObject());
    res.render('codeBakeryUserPanel.html', {
        user: parser.toObject()
    });

});

app.get('/codebakeryuser', function (req, res) {
    res.render('codebakeryUserPanel.html', {
        projects: null
    });
})
app.get('/codebakeryuserP', function (req, res) {
    res.render('codebakeryUserPanel.html', {
        projects: [{
                "title": "Nome do Projeto 1"
            },
            {
                "title": "Nome do projeto 2"
            }]
    });
})

app.get('/codebakeryuserPInfo', function (req, res) {
    res.render('codebakeryProjectInfo.html', {
        project: {
            "id": "manageio",
            status: { 
                "name": "Em Análise",
                "color": "red"
            },
            "timestamp": 1497968993,
            "date": "Tue Jun 20 2017 14:29:53 GMT-0300 (-03)",
            "customer": "IBM",
            "title": "Manage IO",
            "story": "Consiste de uma plataforma destinada a facilitar o gerenciamento de projetos e tarefas de desenvolvimento.",
            "opportunity_nr": "112394sdf"
        }
    });
})

app.get('/assert', function (req, res) {
    res.render('codebakery.html');
})

//app.get('/codeBakeryForm',function(req,res){
//    res.render('codebakeryForm.html');
//})

app.get('/', function (req, res) {
    res.render('codebakery.html');
})

app.get('/codeBakery', function (req, res) {
    res.render('codebakery.html');
})


// start server on the specified port and binding host
http.createServer(app).listen(app.get('port'), '0.0.0.0', function () {
    // print a message when the server starts listening
    console.log("server starting on " + app.get('port'));
});
