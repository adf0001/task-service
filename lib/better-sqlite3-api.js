
// Some tools

var regUtc = /^\d\d\d\d\-\d\d-\d\d\s\d\d\:\d\d:\d\d$/;

/*
Create the table if needed

prepareTable(betterSqlite3, tableName)
	betterSqlite3
		A better-sqlite3 connection, required.
	tableName
		The table name, default 'tasks'.
*/
var prepareTable = function (betterSqlite3, tableName) {
	tableName = tableName || "tasks";

	betterSqlite3.exec(
		`
CREATE TABLE IF NOT EXISTS ${tableName} (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	title TEXT NOT NULL,
	updated_at DATETIME NOT NULL,	-- UTC+0
	created_at DATETIME NOT NULL,	-- UTC+0
	expire_at DATETIME NOT NULL,	-- UTC+0
	done_at DATETIME		-- UTC+0
);`
	);
}

/*
Get api

getApi( betterSqlite3, options )
	betterSqlite3
		A better-sqlite3 connection.

	options
		.tableName
			The table name, default 'tasks'.

		.regTitle
			A regExp to check title text, default /^\S(.{0,998}\S)?$/.

Return the router if success.
*/
var getApi = function (betterSqlite3, options) {
	// arguments
	var { tableName, regTitle } = {
		tableName: 'tasks',
		regTitle: /^\S(.{0,998}\S)?$/,
		...options,
	};

	if (tableName.match(/[^\w\-]/)) throw 'table name contains abnormal character';

	// tools

	// return reason if fail
	function verifyTitleAndExpire(data) {
		if (!data?.title?.match(regTitle)) return "title";
		if (!data?.expire_at?.match(regUtc)) return "expire_at";
	}

	// members
	var api = {};

	// create one
	var stateInsert = betterSqlite3.prepare(
		`
INSERT INTO ${tableName}( title, expire_at,updated_at,created_at)
VALUES(@title,@expire_at,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`
	);

	var stateGetInsert = betterSqlite3.prepare(
		`SELECT * from ${tableName} WHERE rowid = @lastInsertRowid;`
	);

	api.create = (row, cb) => {
		var vr = verifyTitleAndExpire(row);
		if (vr) { cb?.("format fail, " + vr); return; }

		var info = stateInsert.run(row);
		if (!(info.changes > 0)) { cb?.("fail to create"); return; }

		var rows = stateGetInsert.all(info);
		//console.log(rows);
		cb?.(null, rows);
	};

	// update one
	var stateUpdate = betterSqlite3.prepare(
		`
UPDATE ${tableName}
SET title=@title, expire_at=@expire_at,updated_at=CURRENT_TIMESTAMP
WHERE id=@id
	AND (title!=@title OR expire_at!=@expire_at)`
	);
	var stateGetById = betterSqlite3.prepare(
		`SELECT * FROM ${tableName} WHERE id = @id;`
	);

	api.update = (row, cb) => {
		var vr = verifyTitleAndExpire(row);
		if (vr) { cb?.("format fail, " + vr); return; }

		if (!(row.id > 0)) { cb?.("id fail, " + id); return; }

		var info = stateUpdate.run(row);
		if (!(info.changes > 0)) { cb?.("nothing updated"); return; }

		var rows = stateGetById.all(row);
		cb?.(null, rows);
	};

	// updateDoneAt		//update `done_at` to current time

	var stateUpdateDone = betterSqlite3.prepare(
		`
UPDATE ${tableName}
SET done_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
WHERE id=@id`
	);

	api.updateDoneAt = (id, cb) => {
		if (!(id > 0)) { cb?.("id fail, " + id); return; }

		var args = { id };
		var info = stateUpdateDone.run(args);
		if (!(info.changes > 0)) { cb?.("nothing changed"); return; }

		var rows = stateGetById.all(args);
		cb?.(null, rows);
	};

	// delete one
	var stateDelete = betterSqlite3.prepare(
		`DELETE FROM ${tableName} WHERE id=@id;`
	);
	api.delete = (id, cb) => {
		if (!(id > 0)) { cb?.("id fail, " + id); return; }

		var args = { id };
		var rows = stateGetById.all(args);	//get firstly
		if (!(rows?.length > 0)) { cb?.("unfound, " + id); return; }

		var info = stateDelete.run(args);
		if (!(info.changes > 0)) { cb?.("nothing changed"); return; }

		cb?.(null, rows);
	};

	// read one
	api.read = (id, cb) => {
		if (!(id > 0)) { cb?.("id fail, " + id); return; }

		var args = { id };
		var rows = stateGetById.all(args);
		if (!(rows?.length > 0)) { cb?.("unfound " + id); return; }

		cb?.(null, rows);
	};

	// readAll		//read all
	var stateGetAll = betterSqlite3.prepare(
		`SELECT * from ${tableName};`
	);

	api.readAll = (cb) => {
		var rows = stateGetAll.all();
		cb?.(null, rows);
	};

	// readExpire

	var stateGetExpire = betterSqlite3.prepare(
		`SELECT * FROM ${tableName} WHERE done_at IS NULL AND expire_at <= @expire_at;`
	);

	api.readExpire = (expire_at, cb) => {
		if (!expire_at?.match(regUtc)) { cb?.("format fail, expire_at"); return; }

		var args = { expire_at };
		var rows = stateGetExpire.all(args);
		cb?.(null, rows);
	};

	return api;
};

//module exports
module.exports = {
	prepareTable,
	prepare: prepareTable,

	getApi,
	get: getApi,

};
