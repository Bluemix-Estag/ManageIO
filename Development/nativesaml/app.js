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

app.get('/onboarduserP', function (req, res) {
    res.render('onboardUserPanel.html', {
        projects: [{
                "title": "Camanchaca"
            }, {
                "title": "Farmoquímica"
            },
            {
                "title": "Comporte"
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

app.get('/onboardProjectInfo', function (req, res) {
    var showID = req.query.id;
    console.log("Show ID: " + showID);
    res.render('onboardProjectInfo.html', {
        project: [{
                "id": "Camanchaca",
                status: {
                    "name": "Good",
                    "color": "green"
                },
                "timestamp": 1497968993,
                "date": "Tue Jun 16 2017 20:29:53 GMT-0300 (-03)",
                "customer": "Camanchaca",
                "title": "C4SAP",
                "story": "Wave  #1 completed  with success;\nSchedule: Wave  #2 for  SEP./2017 and  DR  to be reviewed",
                "opportunity_nr": "112394sdf"
        },
            {
                "id": "Farmoquimica",
                status: {
                    "name": "Neutral",
                    "color": "yellow"
                },
                "timestamp": 1497968993,
                "date": "Tue Jun 16 2017 20:29:53 GMT-0300 (-03)",
                "customer": "Farmoquimica",
                "title": "C4SAP \n CMS",
                "story": "- G2G  daily calls in place;\n- Migration  to HANA  scheduled  for  18/JUN./2017\n- Maintenance  windows  on CMS  may impact migration  activities\n- Farmoquimica hired  additional  resources  from  SAP to anticipate cutover  activities, in order to mitigate the risk posed  by the maintenance  window\n- As of  16/JUN./2017 10:30h  SAP hab been  able  to compress the cutover,  reducing around  24 hours.\n- There  were  issues with servers  already  delivered: \n     - Server  without NPS properly  configured; \n      - DNS  instabilities ",
                "opportunity_nr": "112394sdf"
            }, {
                "id": "Comporte",
                status: {
                    "name": "Bad",
                    "color": "red"
                },
                "timestamp": 1497968993,
                "date": "Tue Jun 16 2017 20:29:53 GMT-0300 (-03)",
                "customer": "Comporte",
                "title": "C4SAP",
                "story": "Data  migration  has started; there  are issues and CMS-NW  has been  engaged ",
                "opportunity_nr": "112394sdf"
            },
            ],
        showid: showID
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
