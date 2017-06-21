

var saml2 = require('saml2-js');
var Saml2js = require('saml2js') ;
var fs = require('fs');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var express = require('express');
var cfenv = require('cfenv');




// create a new express server
var  path = require('path');
var app = express();
var http = require('http');
app.set('port',process.env.PORT || 3000);
app.set('views',__dirname+'/views');
app.set('view engine','ejs');
app.engine('html',require('ejs').renderFile);


app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname,'public')));
app.use('/style',express.static(path.join(__dirname,'/views/style')));
app.use('/scripts',express.static(path.join(__dirname,'/views/scripts')));

var url = 'https://ibm-notable-test.mybluemix.net';

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
app.get("/metadata.xml", function(req, res) {
  res.type('application/xml');
  res.send(sp.create_metadata());
});

// Starting point for login
app.get("/login", function(req, res) {
  //console.log(idp);
  sp.create_login_request_url(idp, {}, function(err, login_url, request_id) {
    if (err != null)
      return res.send(500);
    console.log(login_url);
    res.redirect(login_url);
  });
});




// Assert endpoint for when login completes
app.post("/assert", function(req, res) {
  var options = {request_body: req };
  var response = new Buffer(req.body.SAMLResponse || req.body.SAMLRequest, 'base64');
  var parser = new Saml2js(response);
  
  // return res.json(parser.toObject());
  res.render('codeBakeryForm.html',{user: parser.toObject()});
 
});

app.get('/assert',function(req,res){
    res.render('codebakery.html');
})

//app.get('/codeBakeryForm',function(req,res){
//    res.render('codebakeryForm.html');
//})

app.get('/',function(req,res){
  res.render('codebakery.html');
})

app.get('/codeBakery',function(req,res){
  res.render('codebakery.html');
})


// start server on the specified port and binding host
http.createServer(app).listen(app.get('port'), '0.0.0.0', function() {
	// print a message when the server starts listening
  console.log("server starting on " + app.get('port'));
});
