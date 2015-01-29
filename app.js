/*jshint node:true*/

// app.js
// This file contains the server side JavaScript code for your application.
// This sample application uses express as web application framework (http://expressjs.com/),
// and jade as template engine (http://jade-lang.com/).

var express = require('express');
var request = require('request');

// setup middleware
var app = express();
app.use(app.router);
app.use(express.errorHandler());
app.use(express.static(__dirname + '/public')); //setup static public directory
app.set('view engine', 'jade');
app.set('views', __dirname + '/views'); //optional since express defaults to CWD/views

// render index page
app.get('/', function(req, res){
	res.render('index');
});

// There are many useful environment variables available in process.env.
// VCAP_APPLICATION contains useful information about a deployed application.
var appInfo = JSON.parse(process.env.VCAP_APPLICATION || "{}");
// TODO: Get application information and use it in your app.

// VCAP_SERVICES contains all the credentials of services bound to
// this application. For details of its content, please refer to
// the document or sample of each service.
var services = JSON.parse(process.env.VCAP_SERVICES || "{}");
// TODO: Get service credentials and communicate with bluemix services.

var cache = {};
var auth = null;

var set_app_vars = function() {
	var credentials = services['objectstorage'][0]['credentials'];
	auth = {"auth_uri": credentials['auth_uri'],
			"userid" : credentials['username'],
			"password" : credentials['password'],
	};
	auth["secret"] = "Basic " + 
		Buffer(auth.userid + ":" + auth.password).toString("base64");
};

app.get('/gettoken/:userid', function(req, res){
	if (!auth) { set_app_vars(); }
	var res_handler = function(error, response, res_body) {
		var body = {};
		if (!error && response.statusCode == 200) {
			body = {"userid": req.params.userid,
					"token": response.headers['x-auth-token'],
					"url": response.headers['x-storage-url']};
			cache[req.params.userid] = body;
		}
		else {
			body = {"token": error, "url": ""};
		};
		res.render('results', {"body": body});
	};
	var req_options = {
			url: auth.auth_uri + '/' + req.params.userid,
			headers: {'accept': 'application/json',
				      'Authorization': auth.secret},
			timeout: 100000,
			method: 'GET'
	};
	request(req_options, res_handler);
});


app.get('/listfolders/:userid', function(req, res){
	var user_info = cache[req.params.userid];
	var res_handler = function(error, response, body) {
		res.render('results', {'body': JSON.parse(body) });
	};
	var req_options = {
			url: user_info['url'] + "/",
			headers: {'accept': 'application/json',
					  'X-Auth-Token': user_info['token']},
			timeout: 100000,
			method: 'GET'
		};
	request(req_options, res_handler);
});


app.get('/createfolder/:userid/:foldername', function(req, res){
	var user_info = cache[req.params.userid];
	var res_handler = function(error, response, body) {
		if (!error && (response.statusCode == 201 ||
				       response.statusCode == 204)) {
			res.render('results', {'body': {result: 'Succeeded!'}});
		}
		else {
			res.render('results', {'body': {result: 'Failed!'}});
		}
	};
	var req_options = {
			url: user_info['url'] + "/" + req.params.foldername,
			headers: {'accept': 'application/json',
					  'X-Auth-Token': user_info['token']},
			timeout: 100000,
			method: 'PUT'
		};
	request(req_options, res_handler);
});


app.get('/listdocs/:userid/:foldername', function(req, res){
	var user_info = cache[req.params.userid];
	var res_handler = function(error, response, body) {
		if (!error && response.statusCode == 200) {
			res.render('results', {body: JSON.parse(body)});
		}
		else {
			res.render('results', {'body': {result: 'Failed!'}});
		}
	};
	var req_options = {
			url: user_info['url'] + "/" + req.params.foldername,
			headers: {'accept': 'application/json',
					  'X-Auth-Token': user_info['token']},
			timeout: 100000,
			method: 'GET'
		};
	request(req_options, res_handler);
});


app.get('/createdoc/:userid/:foldername/:docname', function(req, res){
	var user_info = cache[req.params.userid];
	var res_handler = function(error, response, body) {
		if (!error && response.statusCode == 201) {
			res.render('results', {'body': {result: 'Succeeded!'}});
		}
		else {
			res.render('results', {'body': {result: 'Failed!'}});
		}
	};
	var req_options = {
			url: user_info['url'] + "/" + req.params.foldername + "/" +
				req.params.docname,
			headers: {'accept': 'application/json',
					  'X-Auth-Token': user_info['token']},
			timeout: 100000,
			body: "Some random data",
			method: 'PUT'
		};
	request(req_options, res_handler);
});


app.get('/getdoc/:userid/:foldername/:docname', function(req, res){
	var user_info = cache[req.params.userid];
	var req_options = {
		url: user_info['url'] + "/" + req.params.foldername + "/" +
			req.params.docname,
		headers: {'accept': 'application/json',
				  'X-Auth-Token': user_info['token']},
		timeout: 100000,
		method: 'GET'
	};
	req.pipe(request(req_options)).pipe(res);
});


app.get('/deldoc/:userid/:foldername/:docname', function(req, res){
	var user_info = cache[req.params.userid];
	var res_handler = function(error, response, body) {
		if (!error && response.statusCode == 204) {
			res.render('results', {'body': {result: 'Succeeded!'}});
		}
		else {
			res.render('results', {'body': {result: 'Failed!'}});
		}
	};
	var req_options = {
		url: user_info['url'] + "/" + req.params.foldername + "/" +
			req.params.docname,
		headers: {'accept': 'application/json',
				  'X-Auth-Token': user_info['token']},
		timeout: 100000,
		method: 'DELETE'
	};
	request(req_options, res_handler);
});


// The IP address of the Cloud Foundry DEA (Droplet Execution Agent) that hosts this application:
var host = (process.env.VCAP_APP_HOST || 'localhost');
// The port on the DEA for communication with the application:
var port = (process.env.VCAP_APP_PORT || 3000);
// Start server
app.listen(port, host);
console.log('App started on port ' + port);

