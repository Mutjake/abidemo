var sys = require("sys"),
    serialPort = require("serialport").SerialPort,
    WebSocketServer = require("websocket").server,
    http = require("http"),
    fs = require("fs");

var serial = new serialPort("/dev/ttyACM0" , { baudrate : 115200 });

var wsServerPort = 1337;

var htmlContents = "";

var conns = [];

var pre = "Ping: ",
    post = "cm";

var lenPre = pre.length;
var lenPost = post.length;

var buffer = "";
var distance = -1;
var lastVals = [-1,-1];

serial.on("data", function(chunk) {
    buffer += chunk;
    var preIndex = buffer.indexOf(pre);
    var postIndex = buffer.indexOf(post, preIndex);
    if(preIndex !== -1 && postIndex !== -1) {
        var parseSnippet = buffer.substring(preIndex+lenPre,postIndex);
        var parseResult = parseInt(parseSnippet);

        lastVals.push(parseResult);
        lastVals.shift();
//        for(var i = 1; i < lastVals.length; i++) {
//	    if(lastVals[i] !== lastVals[0]) {
//		return false;
//            }
//	}
        if(Math.abs(lastVals[1]-parseResult) < 75) {
           distance = parseResult;
        }

        if(distance < 3) {
            distance = 3;
	}

        var json = JSON.stringify( {type: "value", data: distance} );
        for(var i=0; i < conns.length; i++) {
            conns[i].sendUTF(json);
        }

	buffer = "";
    } else {
        buffer = "";
    }        
});

serial.on("error", function(msg) {
    sys.puts("error: " + msg);
});

fs.readFile("./index.html", function (err, html) {
    if (err) {
        throw err;
    }
    htmlContents = html;
});

var htmlServer = http.createServer(function(request, response) {
    response.writeHeader(200, {"Content-Type": "text/html"});
    response.write(htmlContents);
    response.end();
});

htmlServer.listen(8080, function() {
});

var server = http.createServer(function(request, response) {
});

server.listen(wsServerPort, function() {
});

wsServer = new WebSocketServer({
    httpServer: server
});

wsServer.on("request", function(request) {
    console.log((new Date()) + " Connection from " + request.origin + ".");

    var connection = request.accept(null, request.origin);
    var index = conns.push(connection) - 1;
   
    sys.puts((new Date()) + " Connection accepted.");

    connection.sendUTF(JSON.stringify( {type: "value", data: distance} ));

    connection.on("message", function(message) {
        sys.puts("WebSocket message: " + message);
    });

    connection.on("close", function(connection) {
        sys.puts((new Date()) + " Connection " + connection.remoteAddress + " disconnected.");
    
    	conns.splice(index, 1);
    });
});
