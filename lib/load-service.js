var bodyParser = require("body-parser");

/*
Load service

loadService( router, api, options )
	router
		A router, like an express app or router, into which the service is loaded.

	api
		A api object.

	options
		.jsonOption
			Refer to body-parser.json().

Return the router if success.
*/
var loadService = function (router, api, options) {
  //arguments
  var jsonParser = bodyParser.json(options?.jsonOption);
  //var jsonParser = bodyParser.json({ extended: false, limit: '500kb', parameterLimit: 100000 });

  var resRows = (res, err, rows) => {
    if (err) res.status(400).json({ error: err }).end();
    else res.status(200).json({ msg: "OK", rows: rows }).end();
  };

  //* create one, POST	/
  router.post("/", jsonParser, (req, res) => {
    api.create(req.body, (...arg) => resRows(res, ...arg));
  });

  //* update one,	PUT	/
  router.put("/", jsonParser, (req, res) => {
    api.update(req.body, (...arg) => resRows(res, ...arg));
  });

  //* update one, done,	PUT	/{id}/done		//update `done_at` to current time
  router.put("/:id/done", (req, res) => {
    api.updateDoneAt(req.params.id, (...arg) => resRows(res, ...arg));
  });

  //* delete one,	DELETE	/{id}
  router.delete("/:id", (req, res) => {
    api.delete(req.params.id, (...arg) => resRows(res, ...arg));
  });

  //* read one,	GET		/{id}
  router.get("/:id", (req, res) => {
    api.read(req.params.id, (...arg) => resRows(res, ...arg));
  });

  //* read all,	GET		/
  router.get("/", (req, res) => {
    api.readAll((...arg) => resRows(res, ...arg));
  });

  //* read all, expire,	GET		/expire/YYYY-MM-dd hh:mm:ss
  router.get("/expire/:expire_at", (req, res) => {
    api.readExpire(req.params.expire_at, (...arg) => resRows(res, ...arg));
  });

  return router;
};

//module exports
module.exports = loadService;
