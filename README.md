# task-service
a task service

# Install
```
npm install task-service
```

# Usage example
```javascript
var better_sqlite3 = require("better-sqlite3");
var express = require("express");
var task_service = require("task-service");

var db = new better_sqlite3(...);

// prepare table
//task_service["better-sqlite3-api"].prepareTable(db, "test_tasks");  //can be set to be called at .getApi()

// get api
var api = task_service["better-sqlite3-api"].getApi(db, { tableName: "test_tasks", prepare: true });
var service = task_service.loadService(express.Router(), api);

var app = express();
app.use("/test-tasks", service);

var svr = http.createServer(app);
svr.listen(9900, "127.0.0.1", () => {
  //create task
  var req = http.request(
    { host: "127.0.0.1", port: 9900, path: "/test-tasks/", method: "POST" },
    ...
  );

  req.setHeader("CONTENT-TYPE", "application/json");
  req.write(JSON.stringify({ title: "title", expire_at: "2022-12-31 00:00:00" }));
  req.end();
});

```

# Table Convention
```sql
CREATE TABLE IF NOT EXISTS ${tableName} (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	title TEXT NOT NULL,
	updated_at DATETIME NOT NULL,	-- UTC+0
	created_at DATETIME NOT NULL,	-- UTC+0
	expire_at DATETIME NOT NULL,	-- UTC+0
	done_at DATETIME		-- UTC+0
);
```

# Api Convention
```text

*  create one
  .create(row, cb)
    row
      {
        title: "title",
        expire_at: "YYYY-MM-dd hh:mm:ss",		//UTC+0
      }
    cb
      (err,rows)=>{...}
        rows: [ row1, row2, ... ]

* update one
  .update(row, cb)

* update one, done_at, update `done_at` to current time
  .updateDoneAt(id, cb)

* delete one
  .delete(id, cb)
    * return the deleted row in cb

* read one
  .read(id, cb)

* read all
  .readAll(cb)

* read all expire
  .readExpire(expire_at, cb)

```

# Url Convention
```text

* response
  {
    msg: "OK",
    rows: ...
  }
 
  or

  {
    error: "error"
  }

* create one, POST	/
  * data: row

* update one,	PUT	/
  * data: row

* update one, done_at,	PUT	/{id}/done		//update `done_at` to current time

* delete one,	DELETE	/{id}

* read one,	GET		/{id}

* read all,	GET		/

* read all, expire,	GET		/expire/YYYY-MM-dd hh:mm:ss

```
