/**
 * Module dependencies.
 */

var hostname = "http://localhost:3000";

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var fs = require('fs');

var saml2 = require('saml2-js');
var Saml2js = require('saml2js');
var cfenv = require('cfenv');
var cookieParser = require('cookie-parser');

var app = express();
var db;
var cloudant;
var fileToUpload;
var dbCredentials = {
    db1Name: 'my_sample_db',
    db2Name: 'my_user_db'
};
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var multipart = require('connect-multiparty')
var multipartMiddleware = multipart();
var session = require('express-session')
var request = require('request');

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use(cookieParser());
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'secret'
}));

var sess;

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
    sess = req.session;
    var options = {
        request_body: req
    };
    console.log("Options: " + options);
    var response = new Buffer(req.body.SAMLResponse || req.body.SAMLRequest, 'base64');
    console.log(response);
    var parser = new Saml2js(response);

    //return res.json(parser.toObject());
    sess.users = parser.toObject();
    console.log("Session" + sess);
    res.render('codebakeryuserpanel.html', {
        user: parser.toObject(),
        projects: null
    });

});

app.get('/codebakeryuser', function(req, res) {
    sess = req.session;

    var data = {
        url: hostname + "/api/user?w3id=rafamos@br.ibm.com&env=codebakery",
        headers: {
            Accept: 'text/json'
        }
    };

    request(data, function(error, response, body) {
        res.render('codebakeryuserpanel.html', {
            projects: JSON.parse(body),
            user: sess.users
        });
    });

})

app.get('/panel', function(req, res) {

  sess = req.session;
  env = req.query.env;

    sess.users = {
      "name": "Francisco Cardoso",
      "email": "cardoso@br.ibm.com"
    }

    var data = {
        url: hostname + "/api/user?w3id="+sess.users.email+"&env="+env,
        headers: {
            Accept: 'text/json'
        }
    };

    request(data, function(error, response, body) {
        var projects = JSON.parse(body);
        console.log(projects);
        console.log("Alo"+projects[0].id);
        var final = [];

        for(var i = 0; i < projects.length; i++){
          console.log("AQUI:"+projects[i].id);
          var data2 = {
              url: hostname + "/api/project?id="+projects[i].id+"&env="+env,
              headers: {
                  Accept: 'text/json'
              }
          };

          request(data2, function(error2, response2, body2) {

              final.push(JSON.parse(body2));

              if(final.length == projects.length){
                console.log("FINAL"+final);
                sess.projects = final;
                res.cookie('projects', final);
                res.cookie('teste', 'teste');
                res.render('onboardUserPanel.html', {
                    projects: final,
                    user: sess.users
                });
              }
          });
        }
    });


    /*
    res.render('onboarduserpanel.html', {
        projects: [{
                "title": "Camanchaca"
            }, {
                "title": "Farmoquímica"
            },
            {
                "title": "Comporte"
            }
        ],
    });
    */
})

app.get('/codebakeryuserinfo', function(req, res) {
    sess = req.session;

    var data = {
        url: hostname + '/api/project?env=' + req.query.env + '&id=' + req.query.id,
        headers: {
            Accept: 'text/json'
        }
    };

    request(data, function(error, response, body) {
        res.render('codebakeryprojectinfo.html', {
            project: JSON.parse(body),
            user: sess.users
        });
    });
})

app.get('/projectinfo', function(req, res) {
    var showID = req.query.id;
    sess = req.session;
    //console.log(req.session);
    //console.log(sess.projects);
    //console.log(sess.users);
    //console.log("Show ID: " + showID);
    object = {
      project: sess.projects,
      user: sess.user,
      showid: showID
    }

    console.log(object);
    res.render('onboardProjectInfo.html', object);
})

app.get('/assert', function(req, res) {
    res.render('codebakery.html');
})

app.get('/codebakeryform', function(req, res) {
    sess = req.session;

    res.render('codebakeryformfixedvalues.html', {
        user: sess.users
    });
})

app.get('/', function(req, res) {
    res.render('codebakery.html');
})

app.get('/codeBakery', function(req, res) {
    res.render('codebakery.html');
})

app.post('/codebakery/project/create', function(req, res) {
    sess = req.session;

    var project = {
        environment: "codebakery",
        id: req.body.id,
        w3id_owner: "rafamos@br.ibm.com",
        timestamp: Date.now(),
        date: Date().toString(),
        customer: req.body.customer,
        title: req.body.title,
        story: req.body.story,
        opportunity_nr: req.body.opportunity_number
    };

    var data = {
        url: hostname + '/api/project/create',
        method: "POST",
        body: project,
        json: true,
        headers: {
            Accept: 'text/json'
        }
    };

    request(data, function(error, response, body) {
        res.redirect('/codebakeryuser');
    });
});

//*** EDUARDO ***/

// development only
if ('development' == app.get('env')) {
    app.use(errorHandler());
}

function getDBCredentialsUrl(jsonData) {
    var vcapServices = JSON.parse(jsonData);

    // Pattern match to find the first instance of a Cloudant service in
    // VCAP_SERVICES. If you know your service key, you can access the
    // service credentials directly by using the vcapServices object.
    console.log(vcapServices.services.cloudantNoSQLDB[0].credentials.url);
    return vcapServices.services.cloudantNoSQLDB[0].credentials.url;

}

function initDBConnection() {
    //When running on Bluemix, this variable will be set to a json object
    //containing all the service credentials of all the bound services
    if (process.env.VCAP_SERVICES) {
        dbCredentials.url = getDBCredentialsUrl(process.env.VCAP_SERVICES);
    } else { //When running locally, the VCAP_SERVICES will not be set

        // When running this app locally you can get your Cloudant credentials
        // from Bluemix (VCAP_SERVICES in "cf env" output or the Environment
        // Variables section for an app in the Bluemix console dashboard).
        // Once you have the credentials, paste them into a file called vcap-local.json.
        // Alternately you could point to a local database here instead of a
        // Bluemix service.
        // url will be in this format: https://username:password@xxxxxxxxx-bluemix.cloudant.com
        dbCredentials.url = getDBCredentialsUrl(fs.readFileSync("vcap-local.json", "utf-8"));
    }

    cloudant = require('cloudant')(dbCredentials.url);

    // check if DB exists if not create
    cloudant.db.create(dbCredentials.db1Name, function(err, res) {
        if (err) {
            console.log('Could not create new db: ' + dbCredentials.db1Name + ', it might already exist.');
        }
    });

    cloudant.db.create(dbCredentials.db2Name, function(err, res) {
        if (err) {
            console.log('Could not create new db: ' + dbCredentials.db2Name + ', it might already exist.');
        }
    });

    db1 = cloudant.use(dbCredentials.db1Name);
    db2 = cloudant.use(dbCredentials.db2Name);


}

initDBConnection();

app.get('/', routes.index);

function createResponseData(id, name, value, attachments) {

    var responseData = {
        id: id,
        name: sanitizeInput(name),
        value: sanitizeInput(value),
        attachements: []
    };


    attachments.forEach(function(item, index) {
        var attachmentData = {
            content_type: item.type,
            key: item.key,
            url: '/api/favorites/attach?id=' + id + '&key=' + item.key
        };
        responseData.attachements.push(attachmentData);

    });
    return responseData;
}

function sanitizeInput(str) {
    return String(str).replace(/&(?!amp;|lt;|gt;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/*
var saveDocument = function(id, name, value, response) {

    if (id === undefined) {
        // Generated random id
        id = '';
    }

    db.insert({
        name: name,
        value: value
    }, id, function(err, doc) {
        if (err) {
            console.log(err);
            response.sendStatus(500);
        } else
            response.sendStatus(200);
        response.end();
    });

}
*/

var createEnvironment = function(id, name, w3id_owner, response) {

    if (id === undefined) {
        // Generated random id
        id = '';
    }
    console.log("creating...");
    db1.insert({
        name: name,
        w3id_owner: w3id_owner,
        projects: [],
        status: []
    }, id, function(err, doc) {
        if (err) {
            console.log(err);
            response.sendStatus(500);
        } else
            response.sendStatus(200);
        response.end();
    });

}

var createUserEnvironments = function(domain, w3id, response, completion) {
    if (w3id === undefined) {
        // Generated random id
        response.sendStatus(404);
    } else {
        id = w3id;
    }

    var environment = {
        id: domain,
        projects: []
    }

    console.log("updating user...");
    db2.get(id, {
        revs_info: true
    }, function(err, doc) {
        if (!err) {
            console.log(doc);
            doc.environments.push(environment);
            db2.insert(doc, doc.id, function(err, doc) {
                if (err) {
                    console.log(err);
                    response.sendStatus(500);
                } else
                    completion();
            });
        }
    });

}

var getUserProjects = function(w3id, environment, response, completion) {
    if (w3id === undefined) {
        // Generated random id
        return {
            status: 404,
            message: "w3id not found"
        }
        //response.sendStatus(404);
        //return;
    } else {
        var id = w3id;
    }

    console.log("getting user...");
    db2.get(id, {
        revs_info: true
    }, function(err, doc) {
        if (!err) {
            console.log(doc);
            console.log(doc.environments[0].id);
            var pos = -1;
            for (var i = 0; i < doc.environments.length; i++) {
                if (doc.environments[i].id == environment) {
                    var pos = i;
                    break;
                } else {
                    pos = -1;
                }
            }
            if (pos != -1) {
                console.log(doc.environments[pos].projects);
                console.log("terminei");
                completion(doc.environments[pos].projects);
                return;

                //response.status(200).json(doc.environments[pos].projects);
            } else {
                response.sendStatus(404);
            }
        } else {
            response.sendStatus(404);
        }
    });
}

var getEnvironmentInfo = function(environment, completion) {
    if (environment === undefined) {
        // Generated random id
        response.sendStatus(404);
        return;
        //return;
    } else {
        var id = environment;
    }

    console.log("getting environment...");
    db1.get(id, {
        revs_info: true
    }, function(err, doc) {
        if (!err) {
            console.log(doc);
            completion(doc);
            return;

            //response.status(200).json(doc.environments[pos].projects);
        }
    });
}

var getProjectInfo = function(environment, projectid, response, completion) {
    if (environment === undefined) {
        response.sendStatus(404);

    } else {
        var id = environment;
    }

    console.log("getting project...");
    db1.get(id, {
        revs_info: true
    }, function(err, doc) {
        if (!err) {
            console.log(doc);
            //console.log(doc.projects[0].id);
            var pos = -1;
            for (var i = 0; i < doc.projects.length; i++) {
                if (doc.projects[i].id == projectid) {
                    var pos = i;
                    break;
                } else {
                    pos = -1;
                }
            }
            if (pos != -1) {
                console.log(doc.projects[pos]);
                console.log("terminei");
                completion(doc.projects[pos]);
                return;

                //response.status(200).json(doc.environments[pos].projects);
            } else {
                response.sendStatus(404);
            }

        }
    });
}

var createUserProjects = function(domain, w3id, id, acess, response, completion) {

    var project = {
        id: id,
        type: acess

    }

    if (w3id === undefined) {
        // Generated random id
        response.sendStatus(404);
        return;
    } else {
        id = w3id;
    }

    console.log("updating user...");
    db2.get(id, {
        revs_info: true
    }, function(err, doc) {
        if (!err) {
            console.log(doc);
            console.log(domain);
            console.log(doc.environments[0].id);
            var pos = -1;
            for (var i = 0; i < doc.environments.length; i++) {
                if (doc.environments[i].id == domain) {
                    var pos = i;
                    break;
                } else {
                    pos = -1;
                }
            }
            if (pos != -1) {
                console.log(pos);
                doc.environments[pos].projects.push(project);
                db2.insert(doc, doc.id, function(err, doc) {
                    if (err) {
                        console.log(err);
                        response.sendStatus(500);
                    } else
                        completion();
                    //response.end();
                });
            } else {
                response.sendStatus(404);
            }
        }
    });

}

var deleteUserProjects = function(environment, w3id, projectid, response, completion) {


    if (w3id === undefined) {
        // Generated random id
        response.sendStatus(404);
        return;
    } else {
        id = w3id;
    }

    console.log("updating user...");
    db2.get(id, {
        revs_info: true
    }, function(err, doc) {
        if (!err) {
            console.log(doc);
            //console.log(domain);
            //console.log(doc.environments[0].id);
            var pos = -1;
            //posição do ambiente
            var pro = -1;
            //posição do projeto
            for (var i = 0; i < doc.environments.length; i++) {
                if (doc.environments[i].id == environment) {
                    pos = i;
                    break;
                } else {
                    pos = -1;
                }
            }
            if (pos != -1) {
                //console.log(doc.environments[0].projects[0].id+".");
                console.log(projectid + ".");
                console.log(pos + ".");
                for (var i = 0; i < doc.environments[pos].projects.length; i++) {
                    console.log(doc.environments[0].projects[i].id + "....");
                    if (doc.environments[pos].projects[i].id === projectid) {
                        pro = i;
                        console.log(i);
                        break;
                    } else {
                        pro = -1;
                    }
                }
                console.log("xx" + pro);
                if (pro != -1) {
                    doc.environments[pos].projects.splice(pro, pro + 1);
                    db2.insert(doc, doc.id, function(err, doc) {
                        if (err) {
                            console.log(err);
                            response.sendStatus(500);
                        } else
                            completion();
                        //response.end();
                    });
                } else {
                    response.sendStatus(401);
                }
            } else {
                response.sendStatus(404);
            }
        }
    });
}

var createEnvironmentProject = function(domain, project, users, response, completion) {
    project.users = users;
    if (domain === undefined) {
        // Generated random id
        console.log("ERRRRRROUUUUUU");
        response.sendStatus(404);
        return;

    } else {
        id = domain;
    }

    console.log("updating environment...");
    db1.get(id, {
        revs_info: true
    }, function(err, doc) {
        if (!err) {
            console.log(doc);
            doc.projects.push(project);
            db1.insert(doc, doc.id, function(err, doc) {
                if (err) {
                    console.log(err);
                    response.sendStatus(500);
                    return;
                } else
                    response.sendStatus(200);
                console.log("deu certo")
                //response.end();
            });
        }
    });

}

var updateProjectInfo = function(environment, project, response, completion) {

    if (environment === undefined) {
        // Generated random id
        console.log("ERRRRRROUUUUUU");
        response.sendStatus(404);
        return;

    } else {
        id = environment;
    }

    console.log("updating project...");
    db1.get(id, {
        revs_info: true
    }, function(err, doc) {
        if (!err) {
            console.log(doc);
            var pos = -1;
            for (var i = 0; i < doc.projects.length; i++) {
                if (doc.projects[i].id == project.id) {
                    var pos = i;
                    break;
                } else {
                    pos = -1;
                }
            }
            if (pos != -1) {
                console.log(pos);
                project.history = doc.projects[pos].history;
                console.log(project);
                var aux = doc.projects[pos];
                console.log(aux);
                delete aux.history;
                console.log(aux);
                project.history.push(aux);
                console.log(project);
                project.users = doc.projects[pos].users;
                console.log(project);
                doc.projects[pos] = project;

                db1.insert(doc, doc.id, function(err, doc) {
                    if (err) {
                        console.log(err);
                        response.sendStatus(500);
                    } else
                        completion();
                    //response.end();
                });
            } else {
                response.sendStatus(404);
            }
        }
    });

}

var deleteEnvironmentProject = function(domain, projectid, response, completion) {

    if (domain === undefined) {
        // Generated random id
        console.log("ERRRRRROUUUUUU");
        response.sendStatus(404);
        return;

    } else {
        id = domain;
    }

    console.log("updating environment...");
    db1.get(id, {
        revs_info: true
    }, function(err, doc) {
        if (!err) {
            console.log(doc);
            var pos = -1;
            for (var i = 0; i < doc.projects.length; i++) {
                if (doc.projects[i].id == projectid) {
                    pos = i;
                    break;
                }
            }
            console.log(doc.projects[pos].users);
            doc.projects[pos].users.splice(0, 1);
            var users = doc.projects[pos].users;
            doc.projects.splice(pos, pos + 1);
            db1.insert(doc, doc.id, function(err, doc) {
                if (err) {
                    console.log(err);
                    response.sendStatus(500);
                    return;
                } else
                    completion(users);
                console.log("deu certo")
                //response.end();
            });
        }
    });

}

var createUser = function(username, w3id, environment, response) {

    if (username === undefined || w3id === undefined || environment === undefined) {
        // Generated random id
        id = '';
        response.sendStatus(400);
    } else {
        id = w3id;
    }
    console.log("creating...");
    db2.insert({
        username: username,
        environments: [{
            id: environment,
            projects: []
        }]
    }, id, function(err, doc) {
        if (err) {
            console.log(err);
            response.sendStatus(500);
        } else
            response.sendStatus(200);
        //response.end();
    });

}
/*
app.get('/api/favorites/attach', function(request, response) {
    var doc = request.query.id;
    var key = request.query.key;

    db.attachment.get(doc, key, function(err, body) {
        if (err) {
            response.status(500);
            response.setHeader('Content-Type', 'text/plain');
            response.write('Error: ' + err);
            response.end();
            return;
        }

        response.status(200);
        response.setHeader("Content-Disposition", 'inline; filename="' + key + '"');
        response.write(body);
        response.end();
        return;
    });
});

app.post('/api/favorites/attach', multipartMiddleware, function(request, response) {

    console.log("Upload File Invoked..");
    console.log('Request: ' + JSON.stringify(request.headers));

    var id;

    db.get(request.query.id, function(err, existingdoc) {

        var isExistingDoc = false;
        if (!existingdoc) {
            id = '-1';
        } else {
            id = existingdoc.id;
            isExistingDoc = true;
        }

        var name = sanitizeInput(request.query.name);
        var value = sanitizeInput(request.query.value);

        var file = request.files.file;
        var newPath = './public/uploads/' + file.name;

        var insertAttachment = function(file, id, rev, name, value, response) {

            fs.readFile(file.path, function(err, data) {
                if (!err) {

                    if (file) {

                        db.attachment.insert(id, file.name, data, file.type, {
                            rev: rev
                        }, function(err, document) {
                            if (!err) {
                                console.log('Attachment saved successfully.. ');

                                db.get(document.id, function(err, doc) {
                                    console.log('Attachements from server --> ' + JSON.stringify(doc._attachments));

                                    var attachements = [];
                                    var attachData;
                                    for (var attachment in doc._attachments) {
                                        if (attachment == value) {
                                            attachData = {
                                                "key": attachment,
                                                "type": file.type
                                            };
                                        } else {
                                            attachData = {
                                                "key": attachment,
                                                "type": doc._attachments[attachment]['content_type']
                                            };
                                        }
                                        attachements.push(attachData);
                                    }
                                    var responseData = createResponseData(
                                        id,
                                        name,
                                        value,
                                        attachements);
                                    console.log('Response after attachment: \n' + JSON.stringify(responseData));
                                    response.write(JSON.stringify(responseData));
                                    response.end();
                                    return;
                                });
                            } else {
                                console.log(err);
                            }
                        });
                    }
                }
            });
        }

        if (!isExistingDoc) {
            existingdoc = {
                name: name,
                value: value,
                create_date: new Date()
            };

            // save doc
            db.insert({
                name: name,
                value: value
            }, '', function(err, doc) {
                if (err) {
                    console.log(err);
                } else {

                    existingdoc = doc;
                    console.log("New doc created ..");
                    console.log(existingdoc);
                    insertAttachment(file, existingdoc.id, existingdoc.rev, name, value, response);

                }
            });

        } else {
            console.log('Adding attachment to existing doc.');
            console.log(existingdoc);
            insertAttachment(file, existingdoc._id, existingdoc._rev, name, value, response);
        }

    });

});
*/
app.post('/api/favorites', function(request, response) {

    console.log("Create Invoked..");
    console.log("Name: " + request.body.name);
    console.log("Value: " + request.body.value);

    // var id = request.body.id;
    var name = sanitizeInput(request.body.name);
    var value = sanitizeInput(request.body.value);

    saveDocument(null, name, value, response);

});

app.post('/api/environment/create', function(request, response) {

    console.log("Creating Environment..");
    console.log("name: " + request.body.name);
    console.log("id: " + request.body.id);
    console.log("w3id_owner: " + request.body.w3id_owner);

    // var id = request.body.id;
    var name = sanitizeInput(request.body.name);
    var id = sanitizeInput(request.body.id);
    var w3id_owner = sanitizeInput(request.body.w3id_owner);

    //createEnvironment(id, name, w3id_owner, response);
    createUserEnvironments(id, w3id_owner, response, function() {
        createEnvironment(id, name, w3id_owner, response);
    });

});

app.post('/api/project/create', function(request, response) {

    console.log("Creating Environment..");
    console.log("environment: " + request.body.environment);
    console.log("id: " + request.body.id);
    console.log("w3id_owner: " + request.body.w3id_owner);

    var project = {
        id: request.body.id,
        status: 0,
        timestamp: request.body.timestamp,
        date: request.body.date,
        customer: request.body.customer,
        title: request.body.title,
        story: request.body.story,
        opportunity_nr: request.body.opportunity_nr,
        history: []
    }

    // var id = request.body.id;
    var environment = sanitizeInput(request.body.environment);
    var id = sanitizeInput(request.body.id);
    var w3id_owner = sanitizeInput(request.body.w3id_owner);
    //var acess = sanitizeInput(request.body.acess);
    getEnvironmentInfo(environment, function(info) {
        console.log(info.w3id_owner);
        var pos = -1;
        for (var i = 0; i < info.projects.length; i++) {
            if (info.projects[i].id == id) {
                pos = i;
                break;
            }
        }
        if (pos == -1) {
            if (info.w3id_owner == w3id_owner) {
                var users = [w3id_owner];
                createUserProjects(environment, w3id_owner, id, "admin", response, function() {
                    createEnvironmentProject(environment, project, users, response);
                });
            } else {
                var users = [info.w3id_owner, w3id_owner];
                createUserProjects(environment, info.w3id_owner, id, "admin", response, function() {
                    createUserProjects(environment, w3id_owner, id, "requester", response, function() {
                        createEnvironmentProject(environment, project, users, response);
                    });
                    //createEnvironmentProject(environment, project, response);
                });
            }
        } else {
            response.sendStatus(403);
        }


    });



});

app.post('/api/project/delete', function(request, response) {

    console.log("Creating Environment..");
    console.log("environment: " + request.body.environment);
    console.log("id: " + request.body.id);
    console.log("w3id: " + request.body.w3id);
    // var id = request.body.id;
    var environment = sanitizeInput(request.body.environment);
    var id = sanitizeInput(request.body.id);
    var w3id = sanitizeInput(request.body.w3id);
    //var acess = sanitizeInput(request.body.acess);
    getEnvironmentInfo(environment, function(info) {
        console.log(info.w3id_owner);
        if (info.w3id_owner == w3id) {
            deleteUserProjects(environment, w3id, id, response, function() {
                deleteEnvironmentProject(environment, id, response, function(info) {
                    console.log(info);
                    info.forEach(function(item, index) {
                        console.log(item);
                        deleteUserProjects(environment, item, id, response, function() {
                            console.log(item);
                        })

                    })
                    response.sendStatus(200);
                });
            });
        } else {
            reponse.sendStatus(401);
        }
    });


});

app.post('/api/user/create', function(request, response) {

    console.log("Creating User..");
    console.log("username: " + request.body.username);
    console.log("w3id: " + request.body.w3id);

    // var id = request.body.id;
    var username = sanitizeInput(request.body.username);
    var w3id = sanitizeInput(request.body.w3id);
    var environment = sanitizeInput(request.body.environment);

    createUser(username, w3id, environment, response);

});

app.delete('/api/environment', function(request, response) {

    console.log("Delete Invoked..");
    var id = request.query.id;
    // var rev = request.query.rev; // Rev can be fetched from request. if
    // needed, send the rev from client
    console.log("Removing document of ID: " + id);
    console.log('Request Query: ' + JSON.stringify(request.query));

    db1.get(id, {
        revs_info: true
    }, function(err, doc) {
        if (!err) {
            db1.destroy(doc._id, doc._rev, function(err, res) {
                // Handle response
                if (err) {
                    console.log(err);
                    response.sendStatus(500);
                } else {
                    response.sendStatus(200);
                }
            });
        }
    });

});

app.get('/api/user', function(request, response) {
    var w3id = request.query.w3id;
    var environment = request.query.env;

    getUserProjects(w3id, environment, response, function(info) {
        response.status(200).json(info);
    });
    console.log("mandei");
});

app.post('/api/project/edit', function(request, response) {
    var environment = request.body.environment;

    var project = {
        id: request.body.id,
        status: request.body.status,
        timestamp: request.body.timestamp,
        date: request.body.date,
        customer: request.body.customer,
        title: request.body.title,
        story: request.body.story,
        opportunity_nr: request.body.opportunity_nr
    }

    updateProjectInfo(environment, project, response, function() {
        response.sendStatus(200);
    });
    console.log("mandei");
});

app.get('/api/project', function(request, response) {
    console.log("get project");
    var id = request.query.id;
    var environment = request.query.env;
    getEnvironmentInfo(environment, function(env) {
        getProjectInfo(environment, id, response, function(info) {
            console.log(env.status);
            console.log(info.status);
            info.status = env.status[info.status];
            response.status(200).json(info);
        });
        console.log("mandei");
    });

});

app.get('/api/environment', function(request, response) {
    console.log("get environment");
    var environmentId = request.query.id;
    getEnvironmentInfo(environmentId, function(env) {
        delete env._revs_info;
        response.status(200).json(env);
    });

});

app.put('/api/favorites', function(request, response) {

    console.log("Update Invoked..");

    var id = request.body.id;
    var name = sanitizeInput(request.body.name);
    var value = sanitizeInput(request.body.value);

    console.log("ID: " + id);

    db.get(id, {
        revs_info: true
    }, function(err, doc) {
        if (!err) {
            console.log(doc);
            doc.name = name;
            doc.value = value;
            db.insert(doc, doc.id, function(err, doc) {
                if (err) {
                    console.log('Error inserting data\n' + err);
                    return 500;
                }
                return 200;
            });
        }
    });
});

app.get('/api/favorites', function(request, response) {

    console.log("Get method invoked.. ")

    db = cloudant.use(dbCredentials.dbName);
    var docList = [];
    var i = 0;
    db.list(function(err, body) {
        if (!err) {
            var len = body.rows.length;
            console.log('total # of docs -> ' + len);
            if (len == 0) {
                // push sample data
                // save doc
                var docName = 'sample_doc';
                var docDesc = 'A sample Document';
                db.insert({
                    name: docName,
                    value: 'A sample Document'
                }, '', function(err, doc) {
                    if (err) {
                        console.log(err);
                    } else {

                        console.log('Document : ' + JSON.stringify(doc));
                        var responseData = createResponseData(
                            doc.id,
                            docName,
                            docDesc, []);
                        docList.push(responseData);
                        response.write(JSON.stringify(docList));
                        console.log(JSON.stringify(docList));
                        console.log('ending response...');
                        response.end();
                    }
                });
            } else {

                body.rows.forEach(function(document) {

                    db.get(document.id, {
                        revs_info: true
                    }, function(err, doc) {
                        if (!err) {
                            if (doc['_attachments']) {

                                var attachments = [];
                                for (var attribute in doc['_attachments']) {

                                    if (doc['_attachments'][attribute] && doc['_attachments'][attribute]['content_type']) {
                                        attachments.push({
                                            "key": attribute,
                                            "type": doc['_attachments'][attribute]['content_type']
                                        });
                                    }
                                    console.log(attribute + ": " + JSON.stringify(doc['_attachments'][attribute]));
                                }
                                var responseData = createResponseData(
                                    doc._id,
                                    doc.name,
                                    doc.value,
                                    attachments);

                            } else {
                                var responseData = createResponseData(
                                    doc._id,
                                    doc.name,
                                    doc.value, []);
                            }

                            docList.push(responseData);
                            i++;
                            if (i >= len) {
                                response.write(JSON.stringify(docList));
                                console.log('ending response...');
                                response.end();
                            }
                        } else {
                            console.log(err);
                        }
                    });

                });
            }

        } else {
            console.log(err);
        }
    });

});


http.createServer(app).listen(app.get('port'), '0.0.0.0', function() {
    console.log('Express server listening on port ' + app.get('port'));
});
