//global variable, for html page, refer tpsvr @ npm.
var task_service = require("../../index.js");
var better_sqlite3 = require("better-sqlite3");
var fs = require("fs");
var express = require("express");
var http = require("http");

function getDb() {
  if (!fs.existsSync(__dirname + "/../db/")) fs.mkdirSync(__dirname + "/../db/");

  var db = new better_sqlite3(__dirname + "/../db/test.sqlite");
  return db;
}

var testTableName = "test_tasks";

var db = getDb();

// prepare table
//task_service["better-sqlite3-api"].prepareTable(db, testTableName);

// get api
var api = task_service["better-sqlite3-api"].getApi(db, {
  tableName: testTableName,
  prepare: true,
});
var service = task_service.loadService(express.Router(), api);

var app = express();
app.use("/test-tasks", service);

//swagger
var swaggerUi = require('swagger-ui-express');
var yamljs = require('yamljs');

var swaggerYaml = yamljs.load( __dirname + '/../../doc/swagger.yaml');
swaggerYaml.servers = [{ url: "http://127.0.0.1:9900/test-tasks" }];
//console.log(swaggerYaml);

app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerYaml));

//server
var svr = http.createServer(app);
svr.listen(9900, "127.0.0.1", () => {
  console.log("listen on http://127.0.0.1:9900");
  console.log("service on http://127.0.0.1:9900/test-tasks");
  console.log("swagger on http://127.0.0.1:9900/swagger");
});
