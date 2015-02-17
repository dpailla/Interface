
var fs = require('fs');
var express = require('express');
var http = require('http');
var https = require('https');

var privateKey = fs.readFileSync('fakekeys/privatekey.pem').toString();
var certificate = fs.readFileSync('fakekeys/certificate.pem').toString();

var app = express();

app.use(express.static(__dirname));

var server = https.createServer({key: privateKey, cert: certificate}, app).listen(8000);

var keypress = require('keypress');
var SerialPortArduino = require("serialport").SerialPort
var serialPortArduino = new SerialPortArduino("COM11", {baudrate: 115200}, false); // this is the openImmediately flag [default is true]

var SerialPortROBOTIS = require("serialport").SerialPort
var serialPortROBOTIS = new SerialPortROBOTIS("COM7", {baudrate: 1000000}, false); // this is the openImmediately flag [default is true]

//Buffer to send values through serialport
var bufferHeadSize = 4;
var bufferBaseSize = 3;
bufferHead = new Buffer(bufferHeadSize);
bufferBase = new Buffer(bufferBaseSize);


var idMotor;
var idOp; 
var pos;
var vel;

var STOP = 	0X00;
var VELO =	0X01;

var offset = 100;

// 128Kb Chunks
// var targetSize = 131072;


console.log('Corriendo en https://localhost:8000');

var io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket){

	function log(){
		var array = [">>> Mensaje desde el servidor: "];
	  for (var i = 0; i < arguments.length; i++) {
	  	array.push(arguments[i]);
	  }
	    socket.emit('log', array);
	}

	socket.on('message', function (message) {
		log('socket.on message: ', message);
    // For a real app, should be room only (not broadcast)
		socket.broadcast.emit('message', message);
        //io.sockets.in('robotRoom').emit('message', message);
	});

	socket.on('create or join', function (room) {
		var numClients = io.sockets.clients(room).length;

		log('Cuarto ' + room + ' tiene ' + numClients + ' cliente(s)');
		log('Requerimiento para crear o participar en el cuarto', room);

		if (numClients == 0){
			socket.join(room); // el primero que ingresa crea el cuarto 
			socket.emit('created', room);
		} else if (numClients == 1) {
			io.sockets.in(room).emit('join', room); //esta accediendo al grupo
			socket.join(room); 
			socket.emit('joined', room); // se ha unido al grupo
		} else { // max two clients
			socket.emit('full', room);
		}
		socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
		socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);

	});

	socket.on('ACTUAR', function (message) {
		//console.log('socket.on ACTUAR: ', message);
		
        console.log('ACTUAR...');
        /* Values that are received from the socket */
        var matrixValuesVel = message.split( ";" );
        
        /* Select each one of the values for the movement of the head */
        varOp = matrixValuesVel[ 0 ];
        varVelL = matrixValuesVel[ 1 ];
        varVelR = matrixValuesVel[ 2 ];
        
        console.log('Op: '+ varOp + '; velL: ' + varVelL + '; velR ' + varVelR)
        /* Send the information to the Arduino */
		baseCommand(varOp, varVelL , varVelR);
        });
		
	socket.on('HEADMO', function (message) {
        
        console.log('HEADMO...');
        /* Values that are received from the socket */
        var matrixValues = message.split( ";" );
        
        /* Select each one of the values for the movement of the head */
        varPitch = matrixValues[ 0 ];
        varYaw = matrixValues[ 1 ];
        varRoll = matrixValues[ 2 ];
        
        console.log('p: ' + varPitch + ' ' + varYaw + ' ' + varRoll )
        /* Send the information to the Robotis */
		headMovement(varPitch , varYaw , varRoll);
		});
});


var baseCommand = function(var1 , var2 , var3 ) {
    bufferBase[0] = var1;
    bufferBase[1] = var2;
    bufferBase[2] = var3;
    console.log('baseCommand = ',bufferBase);
    serialPortArduino.write(bufferBase);
}

var headMovement = function(varPitch , varYaw , varRoll ) {
    idOp = 0x02; //operation 0x02
    bufferHead[0] = idOp;
    bufferHead[1] = varPitch;
    bufferHead[2] = varYaw;
    bufferHead[3] = varRoll;
    console.log('headMovement = ',bufferHead);
    serialPortROBOTIS.write(bufferHead);
    
}

///////////////////////////////////////////
// KEYPRESS EVENTS
///////////////////////////////////////////
keypress(process.stdin);
var keys = {
    'w': function () {
        console.log('Forward!');
        baseCommand (VELO, 40 + offset , 40 + offset );

    },
    's': function () {
        console.log('Reverse!');
        baseCommand (VELO, -40 + offset, -40 + offset);

    },
    'a': function () {
        console.log('Turn left!');
        baseCommand (VELO, -40 + offset, 40 + offset);    
	},
    'd': function () {
        console.log('Turn right!');
        baseCommand (VELO, 40 + offset, -40 + offset);
	},
    'space': function () {
        console.log('STOP!');
        baseCommand (VELO, 0 + offset, 0 + offset);
    },
	///////////////////////////////////////
	// HEAD MOTION
	///////////////////////////////////////
  	// PITCH
    'u': function () {
        console.log('SERVER KEY PITCHUP');
        pitchUp();
    },
    'm': function () {
        console.log('SERVER KEY PITCHDOWN');
		pitchDown();
    },
	// YAW
    'h': function () {
        console.log('SERVER KEY YAWLEFT');
		yawLeft();
    },
    'k': function () {
        console.log('SERVER KEY YAWRIGHT');
		yawRight();
    },
	// ROLL
    'y': function () {
        console.log('SERVER KEY ROLLLEFT');
		rollLeft();
    },
    'i': function () {
        console.log('SERVER KEY ROLLRIGHT');
		rollRight();
    },
    'j': function () {
        console.log('HEADZERO');
		headZero();
    }
}

/////////////////////////////////////////////////////
// BASE COMMAND FUNCTIONS
/////////////////////////////////////////////////////
var ledOn = function () {
    console.log('ledOn');
    serialPortArduino.write("6");
}

var ledOff = function () {
    console.log('ledOff');
    serialPortArduino.write("7");
}


var ledBlink = function () {
    console.log('ledBlink');
    serialPortArduino.write("8");
}

var socialMotionTrue = function () {
    console.log('ledBlink');
    serialPortArduino.write("9");
}
var socialMotionFalse = function () {
    console.log('ledBlink');
    serialPortArduino.write("10");
}

/////////////////////////////////////////////////////
// HEAD MOTION FUNCTIONS
/////////////////////////////////////////////////////
var pitchUp = function (varPitch, varYaw, varRoll) {
    idOp = 0x02; //operation 0x02
	varPitch = 100;
	varYaw = 50;
	varRoll = 50;
    bufferHead[0] = idOp;
    bufferHead[1] = varPitch;
    bufferHead[2] = varYaw;
    bufferHead[3] = varRoll;
    console.log('PITCHUP = ',bufferHead);
    serialPortROBOTIS.write(bufferHead);
}
var pitchDown = function (varPitch, varYaw, varRoll) {
    idOp = 0x02; //operation 0x02
	varPitch = 0;
	varYaw = 50;
	varRoll = 50;
    bufferHead[0] = idOp;
    bufferHead[1] = varPitch;
    bufferHead[2] = varYaw;
    bufferHead[3] = varRoll;
    console.log('PITCHUP = ',bufferHead);
    serialPortROBOTIS.write(bufferHead);
}

var yawLeft = function (varPitch, varYaw, varRoll) {
    idOp = 0x02; //operation 0x02
	varPitch = 50;
	varYaw = 100;
	varRoll = 50;
    bufferHead[0] = idOp;
    bufferHead[1] = varPitch;
    bufferHead[2] = varYaw;
    bufferHead[3] = varRoll;
    console.log('PITCHUP = ',bufferHead);
    serialPortROBOTIS.write(bufferHead);
}
var yawRight = function (varPitch, varYaw, varRoll) {
    idOp = 0x02; //operation 0x02
	varPitch = 50;
	varYaw = 0;
	varRoll = 50;
    bufferHead[0] = idOp;
    bufferHead[1] = varPitch;
    bufferHead[2] = varYaw;
    bufferHead[3] = varRoll;
    console.log('PITCHUP = ',bufferHead);
    serialPortROBOTIS.write(bufferHead);
}

var rollLeft = function (varPitch, varYaw, varRoll) {
    idOp = 0x02; //operation 0x02
	varPitch = 50;
	varYaw = 50;
	varRoll = 100;
    bufferHead[0] = idOp;
    bufferHead[1] = varPitch;
    bufferHead[2] = varYaw;
    bufferHead[3] = varRoll;
    console.log('PITCHUP = ',bufferHead);
    serialPortROBOTIS.write(bufferHead);
}
var rollRight = function (varPitch, varYaw, varRoll) {
    idOp = 0x02; //operation 0x02
	varPitch = 50;
	varYaw = 50;
	varRoll = 0;
    bufferHead[0] = idOp;
    bufferHead[1] = varPitch;
    bufferHead[2] = varYaw;
    bufferHead[3] = varRoll;
    console.log('PITCHUP = ',bufferHead);
    serialPortROBOTIS.write(bufferHead);
}

var headZero = function (varPitch, varYaw, varRoll) {
	idOp = 0x01; //Zero operation
	varPitch = 50;
	varYaw = 50;
	varRoll = 50;
	bufferHead[0] = idOp;
	bufferHead[1] = varPitch;
	bufferHead[2] = varYaw;
	bufferHead[3] = varRoll;
	console.log('HEADZERO = ',bufferHead);
    serialPortROBOTIS.write(bufferHead);
}


console.log("Iniciando keypress...");
process.stdin.on('keypress', function (ch, key) {
	//console.log(key);
    if (key && keys[key.name]) { keys[key.name](); }
    if (key && key.ctrl && key.name == 'c') { quit(); }
});

process.stdin.setRawMode(true);
process.stdin.resume();

/////////////////////////////////
// OPENING SERIAL PORTS
/////////////////////////////////
serialPortArduino.open(function () {
    console.log('Server: serialport.open');
    serialPortArduino.on('data', function (data) {
        console.log('Server: dato recibido: ' + data);
    });
});
serialPortROBOTIS.open(function () {
    console.log('Server: serialportROTOBIS.open');
    serialPortROBOTIS.on('data', function (data) {
        console.log('Robotis msg: ' + data);
    });
});



var quit = function () {
    console.log('Server: Saliendo de keypress y serialport...');
    serialPortArduino.close();
    serialPortROBOTIS.close();
    process.stdin.pause();
    process.exit();
}
