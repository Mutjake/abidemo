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
    post = " cm";

var lenPre = pre.length;
var lenPost = post.length;

var buffer = "";
var lastVal = -1;

serial.on("data", function(chunk) {
    buffer += chunk;
    var preIndex = buffer.indexOf(pre);
    var postIndex = buffer.indexOf(post);
    if(preIndex !== -1 && postIndex !== -1) {
        var lastValCandidate = parseInt(buffer.substring(preIndex+lenPre,postIndex));
        if(Math.abs(lastValCandidate-lastVal) < 200 || lastVal === -1) {
            lastVal = lastValCandidate;  
        }
        //sys.puts(lastVal);

        var json = JSON.stringify( {type: "value", data: lastVal} );
        for(var i=0; i < conns.length; i++) {
            sys.puts("Sending new data (" + lastVal + ")");
            conns[i].sendUTF(json);
        }

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

    connection.sendUTF(JSON.stringify( {type: "value", data: lastVal} ));

    connection.on("message", function(message) {
        sys.puts("WebSocket message: " + message);
    });

    connection.on("close", function(connection) {
        sys.puts((new Date()) + " Connection " + connection.remoteAddress + " disconnected.");
    
    	conns.splice(index, 1);
    });
});
