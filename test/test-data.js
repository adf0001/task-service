
//global variable, for html page, refer tpsvr @ npm.
var task_service = require("../index.js");
var better_sqlite3 = require("better-sqlite3");
var fs = require("fs");
var express = require('express');
var http = require('http');
var util = require('util');

function getDb() {
	if (!fs.existsSync(__dirname + "/db/"))
		fs.mkdirSync(__dirname + "/db/");

	var db = new better_sqlite3(__dirname + "/db/test.sqlite");
	return db;
}

var testTableName = "test_tasks";

module.exports = {
	"better-sqlite3-api": function (done) {
		if (typeof window !== "undefined") throw "disable for browser";

		var db = getDb();

		// prepare table
		task_service["better-sqlite3-api"].prepareTable(db, testTableName);

		// get api
		var api = task_service["better-sqlite3-api"].getApi(db, { tableName: testTableName });

		var newId;

		// create
		util.promisify(api.create)(
			{ title: "title", expire_at: "2022-12-31 00:00:00" }
		)
			.then((rows) => {
				console.log("create", rows);
				if (!rows?.[0]?.id > 0) throw "add fail";
				newId = rows[0].id;
				// update
				rows[0].expire_at = '2022-12-31 01:02:03';
				return util.promisify(api.update)(rows[0]);
			})
			.then((rows) => {
				console.log("update", rows);
				if (rows?.[0]?.expire_at !== '2022-12-31 01:02:03') throw "update fail";
				// updateDoneAt
				return util.promisify(api.updateDoneAt)(rows[0].id);
			})
			.then((rows) => {
				console.log("updateDoneAt", rows);
				if (!rows?.[0]?.done_at) throw "updateDoneAt fail";
				// read one
				return util.promisify(api.read)(rows[0].id);
			})
			.then((rows) => {
				console.log("read", rows);
				if (rows?.[0]?.id !== newId) throw "read fail";
				// read all
				return util.promisify(api.readAll)();
			})
			.then((rows) => {
				console.log("readAll", rows);
				if (rows?.[rows.length - 1]?.id !== newId) throw "readAll fail";
				// readExpire
				return util.promisify(api.readExpire)('2022-12-31 01:02:03');
			})
			.then((rows) => {
				console.log("readExpire", rows);
				if (rows?.[rows.length - 1]?.done_at) throw "readExpire fail";
				// delete one
				return util.promisify(api.delete)(newId);
			})
			.then((rows) => {
				console.log("delete", rows);
				if (rows?.[0]?.id !== newId) throw "delete one fail";
				// read one deleted
				return util.promisify(api.read)(newId);
			})
			.then((rows) => {
				console.log("check delete", rows);
				if (rows?.length > 0) throw "check delete fail";
				return "pass delete";
			}, (err) => {
				console.log("check delete error", err);
				return "pass delete by error";
			})

			.then((rows) => {
				console.log("final", rows);
				done(false);
			})
			.catch((err) => {
				console.log("catch", err);
				done(true);
			})
			.finally(() => {
			})
			;
	},

	"task_service/better-sqlite3": function (done) {
		if (typeof window !== "undefined") throw "disable for browser";

		var db = getDb();

		// prepare table
		task_service["better-sqlite3-api"].prepareTable(db, testTableName);

		// get api
		var api = task_service["better-sqlite3-api"].getApi(db, { tableName: testTableName });
		var service = task_service.loadService(express.Router(), api);

		var app = express();
		app.use("/test-tasks", service);

		var newId;

		const requestPromise = util.promisify(function (options, data, cb) {
			options = { host: "127.0.0.1", port: 9900, ...options };
			var req = http.request(options, function (res) {
				let ret = '';
				res.on('data', buffer => { ret += buffer.toString() });
				res.on('end', () => {
					console.log('response data:[', ret, ']');
					cb(null, JSON.parse(ret));
				});
				res.on('error', (err) => cb(err))
			});
			console.log('request data:[', data, '], ' + options.method + ", " + options.path);
			if (data) {
				req.setHeader("CONTENT-TYPE", "application/json");
				req.write(JSON.stringify(data));
			}
			req.end();
		});

		//console.log(requestPromise);

		var svr = http.createServer(app);
		svr.listen(9900, "127.0.0.1", () => {

			//create
			requestPromise(
				{ path: "/test-tasks/", method: "POST", },
				{ title: "title", expire_at: "2022-12-31 00:00:00" }
			)
				.then((ret) => {
					if (!ret?.rows?.[0]?.id > 0) throw "create fail";
					console.log("create ok");
					newId = ret.rows[0].id;

					//update
					ret.rows[0].expire_at = '2022-12-31 01:02:03';
					return requestPromise({ path: "/test-tasks/", method: "PUT", }, ret.rows[0]);
				})
				.then((ret) => {
					if (ret?.rows?.[0]?.expire_at !== '2022-12-31 01:02:03') throw "update fail";
					console.log("update ok");

					//updateDoneAt
					return requestPromise({ path: `/test-tasks/${ret.rows[0].id}/done`, method: "PUT", }, null);
				})
				.then((ret) => {
					if (!ret?.rows?.[0]?.done_at) throw "updateDoneAt fail";
					console.log("updateDoneAt ok");

					//read one
					return requestPromise({ path: `/test-tasks/${ret.rows[0].id}`, method: "GET", }, null);
				})
				.then((ret) => {
					if (ret?.rows?.[0]?.id !== newId) throw "read one fail";
					console.log("read one ok");

					//read one-bad
					return requestPromise({ path: `/test-tasks/a`, method: "GET", }, null);
				})
				.then((ret) => {
					if (!ret?.error || ret.rows) throw "read one-bad fail";
					console.log("read one-bad ok");

					//read all
					return requestPromise({ path: `/test-tasks/`, method: "GET", }, null);
				})
				.then((ret) => {
					if (ret?.rows?.[ret?.rows.length - 1]?.id !== newId) throw "read all fail";
					console.log("read all ok");

					//readExpire
					return requestPromise({ path: `/test-tasks/expire/` + encodeURIComponent(`2022-12-31 01:02:03`), method: "GET", }, null);
				})
				.then((ret) => {
					if (ret?.rows?.[ret?.rows.length - 1]?.done_at) throw "readExpire fail";
					console.log("readExpire ok");

					//readExpire bad format
					return requestPromise({ path: `/test-tasks/expire/` + encodeURIComponent(`2022-12-31 01-02:03`), method: "GET", }, null);
				})
				.then((ret) => {
					if (!ret?.error || ret.rows) throw "readExpire-bad fail";
					console.log("readExpire-bad ok");

					//delete
					return requestPromise({ path: `/test-tasks/${newId}`, method: "DELETE", }, null);
				})
				.then((ret) => {
					if (ret?.rows?.[0]?.id !== newId) throw "delete fail";
					console.log("delete ok");

					//read one deleted
					return requestPromise({ path: `/test-tasks/${newId}`, method: "GET", }, null);
				})
				.then((ret) => {
					if (!ret?.error || ret.rows) throw "read one deleted fail";
					console.log("read one deleted ok");

					return "pass read one deleted";
				})

				.then((data) => {
					console.log("final", data);
					done(false);
				})
				.catch((err) => {
					console.log("catch", err);
					done(true);
				})
				.finally(() => {
					console.log("finally");
					svr.close();
				})
				;

		});
	},

	"check exports": function (done) {
		var m = task_service;
		for (var i in m) {
			if (typeof m[i] === "undefined") { done("undefined: " + i); return; }
		}
		done(false);

		console.log(m);
		var list = "export list: " + Object.keys(m).join(", ");
		console.log(list);
		return list;
	},

};

// for html page
//if (typeof setHtmlPage === "function") setHtmlPage("title", "10em", 1);	//page setting
if (typeof showResult !== "function") showResult = function (text) { console.log(text); }

//for mocha
if (typeof describe === "function") describe('task_service', function () { for (var i in module.exports) { it(i, module.exports[i]).timeout(5000); } });

