var geohash = require("ngeohash");
const config = require("./config");
const axios = require("axios");
const Influx = require("influx");

// TCP handles
const net = require('net');
const port = config.port;
const host = config.host;

const server = net.createServer();
server.listen(port, host, () => {
    console.log('TCP Server is running on port ' + port + '.');
});

// InfluxDB Initialization.
const influx = new Influx.InfluxDB({
    host: config.influx_host,
    username: config.influx_user,
    password: config.influx_pass,
    database: config.influx_db
});

let sockets = [];


server.on('connection', function(sock) {
    console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
    sockets.push(sock);

    sock.on('data', function(data) {
        //console.log(data);
        let message = JSON.parse("" + data)
	console.log("message: %s", message);
        // API Initialization.
        const instance = axios.create({
            baseURL: "http://ipinfo.io"
        });
        instance
            .get(`/${message.ip}?token=${config.ipinfo_token}`)
            .then(function(response) {
                const apiResponse = response.data;
		let geoLoc = apiResponse.loc;
		const geoLocArr = geoLoc.split(",");
                influx.writePoints(
                    [{
                        measurement: "geossh",
                        fields: {
                            value: 1
                        },
                        tags: {
                            geohash: geohash.encode(geoLocArr[0],geoLocArr[1]),
                            username: message.username,
                            port: message.port,
                            ip: message.ip,
			    city: apiResponse.city
                        }
                    }]
                );
                console.log("Intruder added")
            })
            .catch(function(error) {
                console.log(error);
            });
    });

    // Add a 'close' event handler to this instance of socket
    sock.on('close', function(data) {
        let index = sockets.findIndex(function(o) {
            return o.remoteAddress === sock.remoteAddress && o.remotePort === sock.remotePort;
        })
        if (index !== -1) sockets.splice(index, 1);
        console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
    });
});
